/**
 * Deliverable check (2f): monthly dues accrual must add monthlyFeePaisa to
 * duesPaisa for every ACTIVE resident, exactly once per period — a second run
 * for the same period (server restart on the 1st) must be a no-op. Also
 * verifies per-org audit entries and that notice/alumni residents are skipped.
 *
 * Run: npm run test:dues-accrual   (needs DATABASE_URL up + migrated)
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { AuditService } from "../src/audit/audit.service";
import { DuesAccrualService } from "../src/finance/dues-accrual.service";
import type { PrismaService } from "../src/prisma/prisma.service";

async function main(): Promise<void> {
  const prisma = new PrismaClient();
  const ps = prisma as unknown as PrismaService;
  const svc = new DuesAccrualService(ps, new AuditService(ps));
  let failures = 0;

  // Two isolated scratch orgs so the per-org audit split is exercised.
  const orgA = await prisma.organization.create({ data: { name: `accrual-A-${Date.now()}` } });
  const orgB = await prisma.organization.create({ data: { name: `accrual-B-${Date.now()}` } });

  const mk = (orgId: string, name: string, fee: number, dues: number, status: "active" | "notice" | "alumni") =>
    prisma.resident.create({
      data: { orgId, name, phone: "9999999999", joinDate: new Date(), status, duesPaisa: dues, monthlyFeePaisa: fee },
    });

  const a1 = await mk(orgA.id, "A1 active", 500_000, 0, "active");
  const a2 = await mk(orgA.id, "A2 active w/ dues", 300_000, 100_000, "active");
  const a3 = await mk(orgA.id, "A3 notice", 400_000, 0, "notice");
  const b1 = await mk(orgB.id, "B1 active", 700_000, 0, "active");
  const b2 = await mk(orgB.id, "B2 alumni", 700_000, 0, "alumni");

  const period = DuesAccrualService.periodFor(new Date());

  const expectDues = async (label: string, id: string, dues: number, stamped: boolean) => {
    const r = await prisma.resident.findUniqueOrThrow({ where: { id } });
    const ok = r.duesPaisa === dues && (r.lastDuesAccrualPeriod === period) === stamped;
    console.log(
      `${ok ? "PASS" : "FAIL"}  ${label}: dues=${r.duesPaisa} (expect ${dues}), ` +
        `period=${r.lastDuesAccrualPeriod ?? "null"} (expect ${stamped ? period : "null"})`,
    );
    if (!ok) failures++;
  };

  // ---- first run accrues every active resident once ----
  const run1 = await svc.accrue(period);
  console.log(`run1: residentsAccrued=${run1.residentsAccrued}, totalPaisa=${run1.totalAccruedPaisa}, orgs=${run1.orgs}`);
  // Scratch orgs contribute 3 active residents; other data in the DB may add
  // more, so assert per-resident outcomes rather than global totals.
  await expectDues("A1 accrued", a1.id, 500_000, true);
  await expectDues("A2 accrued on top of existing dues", a2.id, 400_000, true);
  await expectDues("A3 notice skipped", a3.id, 0, false);
  await expectDues("B1 accrued", b1.id, 700_000, true);
  await expectDues("B2 alumni skipped", b2.id, 0, false);

  // ---- second run for the same period is a no-op (restart on the 1st) ----
  const run2 = await svc.accrue(period);
  const idempotent = run2.residentsAccrued === 0 && run2.totalAccruedPaisa === 0;
  console.log(`${idempotent ? "PASS" : "FAIL"}  rerun same period: residentsAccrued=${run2.residentsAccrued} (expect 0)`);
  if (!idempotent) failures++;
  await expectDues("A1 unchanged after rerun", a1.id, 500_000, true);
  await expectDues("B1 unchanged after rerun", b1.id, 700_000, true);

  // ---- audit: one system entry per org, correct totals ----
  for (const [org, count, total] of [
    [orgA, 2, 800_000],
    [orgB, 1, 700_000],
  ] as const) {
    const entries = await prisma.auditLogEntry.findMany({
      where: { orgId: org.id, action: "accrued_monthly_dues" },
    });
    const d = entries[0]?.details as { residentsAccrued?: number; totalAccruedPaisa?: number } | undefined;
    const ok = entries.length === 1 && d?.residentsAccrued === count && d?.totalAccruedPaisa === total;
    console.log(
      `${ok ? "PASS" : "FAIL"}  audit ${org.name}: entries=${entries.length} (expect 1), ` +
        `residents=${d?.residentsAccrued} (expect ${count}), totalPaisa=${d?.totalAccruedPaisa} (expect ${total})`,
    );
    if (!ok) failures++;
  }

  if (failures === 0) console.log("PASS: accrual is correct, idempotent, and audited per org.");
  else process.exitCode = 1;

  for (const org of [orgA, orgB]) {
    await prisma.auditLogEntry.deleteMany({ where: { orgId: org.id } });
    await prisma.resident.deleteMany({ where: { orgId: org.id } });
    await prisma.organization.delete({ where: { id: org.id } });
  }
  await prisma.$disconnect();
}

void main();
