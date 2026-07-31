import { Inject, Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { AuditService } from "../audit/audit.service";
import { PrismaService } from "../prisma/prisma.service";

/**
 * Monthly rent accrual: on the 1st of each month (Asia/Kolkata) every active
 * resident's monthlyFeePaisa is added to duesPaisa.
 *
 * Idempotency: each resident row is stamped with the "YYYY-MM" period it was
 * last accrued for (Resident.lastDuesAccrualPeriod), and the UPDATE only
 * matches rows not yet stamped for the current period — a restart on the 1st
 * re-runs the cron but matches zero already-accrued rows. The accrual is a
 * single SQL UPDATE (read-modify-write happens inside the statement under row
 * locks), so it also serializes cleanly against the SELECT ... FOR UPDATE
 * discipline payments/refunds use on the same rows.
 *
 * Residents joining mid-month get their first full accrual on the next 1st —
 * no proration, matching how monthlyFeePaisa is charged elsewhere.
 */
@Injectable()
export class DuesAccrualService {
  private readonly logger = new Logger(DuesAccrualService.name);

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

  /** Current "YYYY-MM" in Asia/Kolkata — the business timezone, regardless of server TZ. */
  static periodFor(now: Date): string {
    // en-CA formats as YYYY-MM-DD; keep YYYY-MM.
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
    }).format(now);
  }

  // 00:30 IST on the 1st — clear of any midnight boundary ambiguity.
  @Cron("30 0 1 * *", { name: "monthly-dues-accrual", timeZone: "Asia/Kolkata" })
  async handleMonthlyAccrual(): Promise<void> {
    const period = DuesAccrualService.periodFor(new Date());
    const result = await this.accrue(period);
    this.logger.log(
      `Dues accrual for ${period}: ${result.residentsAccrued} resident(s), ` +
        `${result.totalAccruedPaisa} paisa across ${result.orgs} org(s).`,
    );
  }

  /**
   * Accrue rent for `period` for every active resident not already accrued for
   * that period. Returns totals; writes one audit entry per affected org,
   * atomic with the accrual itself.
   */
  async accrue(period: string): Promise<{ residentsAccrued: number; totalAccruedPaisa: number; orgs: number }> {
    return this.prisma.$transaction(async (tx) => {
      // Cross-tenant by design: this is a system job, not a user request path —
      // the per-org audit entries below keep each org's trail scoped.
      const rows = await tx.$queryRaw<Array<{ orgId: string; monthlyFeePaisa: number }>>`
        UPDATE "Resident"
        SET "duesPaisa" = "duesPaisa" + "monthlyFeePaisa",
            "lastDuesAccrualPeriod" = ${period}
        WHERE "status" = 'active'::"ResidentStatus"
          AND ("lastDuesAccrualPeriod" IS NULL OR "lastDuesAccrualPeriod" <> ${period})
        RETURNING "orgId", "monthlyFeePaisa"`;

      const byOrg = new Map<string, { count: number; totalPaisa: number }>();
      for (const r of rows) {
        const agg = byOrg.get(r.orgId) ?? { count: 0, totalPaisa: 0 };
        agg.count += 1;
        agg.totalPaisa += r.monthlyFeePaisa;
        byOrg.set(r.orgId, agg);
      }

      for (const [orgId, agg] of byOrg) {
        await this.audit.logSystem(
          orgId,
          {
            action: "accrued_monthly_dues",
            entityType: "organization",
            entityId: orgId,
            entityLabel: `Monthly dues accrual ${period}`,
            details: { period, residentsAccrued: agg.count, totalAccruedPaisa: agg.totalPaisa },
          },
          tx,
        );
      }

      return {
        residentsAccrued: rows.length,
        totalAccruedPaisa: rows.reduce((s, r) => s + r.monthlyFeePaisa, 0),
        orgs: byOrg.size,
      };
    });
  }
}
