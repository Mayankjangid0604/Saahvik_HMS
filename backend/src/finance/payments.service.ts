import { HttpStatus, Inject, Injectable } from "@nestjs/common";
import { PaymentMethod, PaymentType, Prisma } from "@prisma/client";
import { AuditService } from "../audit/audit.service";
import { ApiError } from "../common/api-error";
import type { AuthUser } from "../common/auth-user";
import { effectiveDues } from "../common/dues";
import { pageArgs, paginated, type Paginated } from "../common/pagination";
import { SequenceService } from "../common/sequence.service";
import { NotificationsService } from "../notifications/notifications.service";
import { PdfService, pdfMoney } from "../pdf/pdf.service";
import { PrismaService } from "../prisma/prisma.service";
import type { PaymentListParamsDto, RecordPaymentDto, RefundPaymentDto } from "./dto";

type PaymentFull = Prisma.PaymentGetPayload<{
  include: { resident: { select: { name: true; room: { select: { number: true } } } } };
}>;

const PAYMENT_INCLUDE = {
  resident: { select: { name: true, room: { select: { number: true } } } },
} satisfies Prisma.PaymentInclude;

export function toPaymentDto(p: PaymentFull) {
  return {
    id: p.id,
    receiptNo: p.receiptNo,
    residentId: p.residentId,
    residentName: p.resident.name,
    roomNumber: p.resident.room?.number,
    amountPaisa: p.amountPaisa,
    method: p.method,
    type: p.type,
    status: p.status,
    paidAt: p.paidAt.toISOString(),
    periodMonth: p.periodMonth ?? undefined,
    refundedPaisa: p.refundedPaisa,
    notes: p.notes ?? undefined,
    recordedByName: p.recordedByName,
  };
}

@Injectable()
export class PaymentsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly audit: AuditService,
    @Inject(SequenceService) private readonly sequence: SequenceService,
    @Inject(NotificationsService) private readonly notifications: NotificationsService,
    @Inject(PdfService) private readonly pdf: PdfService,
  ) {}

  async list(user: AuthUser, params: PaymentListParamsDto): Promise<Paginated<unknown>> {
    const where: Prisma.PaymentWhereInput = { orgId: user.orgId };
    if (params.method && params.method !== "all") where.method = params.method as PaymentMethod;
    if (params.type && params.type !== "all") where.type = params.type as PaymentType;
    if (params.from || params.to) {
      where.paidAt = {};
      if (params.from) where.paidAt.gte = new Date(params.from);
      if (params.to) where.paidAt.lte = new Date(`${params.to}T23:59:59.999Z`);
    }
    if (params.search) {
      where.OR = [
        { receiptNo: { contains: params.search, mode: "insensitive" } },
        { resident: { is: { name: { contains: params.search, mode: "insensitive" } } } },
        { resident: { is: { room: { is: { number: { contains: params.search, mode: "insensitive" } } } } } },
      ];
    }

    const { page, pageSize, skip, take } = pageArgs(params, 10);
    const orderBy: Prisma.PaymentOrderByWithRelationInput =
      params.sortBy === "amountPaisa"
        ? { amountPaisa: params.sortDir ?? "desc" }
        : { paidAt: params.sortDir ?? "desc" };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.payment.findMany({ where, include: PAYMENT_INCLUDE, orderBy, skip, take }),
      this.prisma.payment.count({ where }),
    ]);
    return paginated(rows.map(toPaymentDto), total, page, pageSize);
  }

  async get(user: AuthUser, id: string) {
    const p = await this.prisma.payment.findFirst({
      where: { id, orgId: user.orgId },
      include: PAYMENT_INCLUDE,
    });
    if (!p) throw ApiError.notFound("Payment");
    return toPaymentDto(p);
  }

  async record(user: AuthUser, dto: RecordPaymentDto) {
    const resident = await this.prisma.resident.findFirst({
      where: { id: dto.residentId, orgId: user.orgId },
    });
    if (!resident) throw ApiError.notFound("Resident");

    const paidAt = new Date(dto.paidAt);
    const payment = await this.prisma.$transaction(async (tx) => {
      const year = paidAt.getFullYear();
      const seq = await this.sequence.next(tx, user.orgId, "receipt", year);

      // Rent payments net against current dues; any overpayment becomes prepaid
      // advance balance instead of silently vanishing when dues clamp to 0.
      let appliedToDues = 0;
      let advanceApplied = 0;
      let lockedDues = 0;
      let lockedAdvance = 0;
      if (dto.type === "rent") {
        // Read dues/advance INSIDE the transaction and lock the resident row with
        // SELECT ... FOR UPDATE — the identical pattern SequenceService.next()
        // uses. Two rent payments for the same resident recorded concurrently
        // otherwise both compute their Math.min(amount, dues) split from the same
        // stale pre-transaction snapshot and the second absolute write clobbers
        // the first (lost update). Serializing on the row lock makes the second
        // payment block until the first commits, then read the fresh value.
        // increment/decrement alone would NOT fix this: the split calculation
        // itself needs a consistent, locked duesPaisa to read.
        const [locked] = await tx.$queryRaw<
          Array<{ duesPaisa: number; advanceBalancePaisa: number }>
        >`
          SELECT "duesPaisa", "advanceBalancePaisa" FROM "Resident"
          WHERE "id" = ${resident.id} AND "orgId" = ${user.orgId}
          FOR UPDATE`;
        lockedDues = locked.duesPaisa;
        lockedAdvance = locked.advanceBalancePaisa;
        appliedToDues = Math.min(dto.amountPaisa, lockedDues);
        advanceApplied = dto.amountPaisa - appliedToDues;
      }

      const payment = await tx.payment.create({
        data: {
          orgId: user.orgId,
          receiptNo: this.sequence.formatReceiptNo(year, seq),
          residentId: resident.id,
          amountPaisa: dto.amountPaisa,
          method: dto.method,
          type: dto.type,
          paidAt,
          periodMonth: dto.periodMonth,
          notes: dto.notes,
          recordedByName: user.name,
          advanceAppliedPaisa: advanceApplied,
        },
        include: PAYMENT_INCLUDE,
      });

      if (dto.type === "rent") {
        await tx.resident.update({
          where: { id: resident.id },
          data: {
            // lockedDues - appliedToDues == Math.max(0, dues - amount): same
            // clamp-at-zero behavior, but the excess is now recorded below.
            // Sourced from the locked read (not the stale outer `resident`) so
            // the absolute write is safe under concurrency — see the FOR UPDATE
            // above.
            duesPaisa: lockedDues - appliedToDues,
            advanceBalancePaisa: lockedAdvance + advanceApplied,
          },
        });
      }

      await this.audit.log(
        user,
        {
          action: "recorded_payment",
          entityType: "payment",
          entityId: payment.id,
          entityLabel: payment.receiptNo,
          details: {
            residentName: resident.name,
            amountPaisa: dto.amountPaisa,
            method: dto.method,
            type: dto.type,
          },
        },
        tx,
      );
      return payment;
    });

    await this.notifications.notifyOrg(user.orgId, {
      kind: "payment",
      prefKey: "paymentReceived",
      title: "Payment received",
      body: `${pdfMoney(payment.amountPaisa)} from ${resident.name} (${payment.receiptNo})`,
      link: `/payments/${payment.id}`,
      excludeUserId: user.userId,
    });
    return toPaymentDto(payment);
  }

  async refund(user: AuthUser, dto: RefundPaymentDto) {
    const p = await this.prisma.payment.findFirst({
      where: { id: dto.paymentId, orgId: user.orgId },
      include: PAYMENT_INCLUDE,
    });
    if (!p) throw ApiError.notFound("Payment");
    const remaining = p.amountPaisa - p.refundedPaisa;
    if (dto.amountPaisa <= 0 || dto.amountPaisa > remaining) {
      throw new ApiError(
        HttpStatus.UNPROCESSABLE_ENTITY,
        "REFUND_EXCEEDS_REMAINING",
        "Refund exceeds the remaining amount on this payment",
        { remainingPaisa: remaining },
      );
    }

    const refundedPaisa = p.refundedPaisa + dto.amountPaisa;
    const updated = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.payment.update({
        where: { id: p.id },
        data: {
          refundedPaisa,
          status: refundedPaisa >= p.amountPaisa ? "refunded" : "partially_refunded",
          notes: [p.notes, `Refund: ${dto.reason}`].filter(Boolean).join(" | "),
        },
        include: PAYMENT_INCLUDE,
      });

      // Reverse this payment's effect on the resident's dues/advance. Only rent
      // payments ever touched those fields in record(), so only rent refunds
      // unwind them — deposit/fine/other refunds behave exactly as before.
      if (p.type === "rent") {
        // Lock the resident row (same SELECT ... FOR UPDATE pattern as record()
        // and SequenceService) so this read-then-absolute-write can't race a
        // concurrent payment or refund on the same resident.
        const [locked] = await tx.$queryRaw<
          Array<{ duesPaisa: number; advanceBalancePaisa: number }>
        >`
          SELECT "duesPaisa", "advanceBalancePaisa" FROM "Resident"
          WHERE "id" = ${p.residentId} AND "orgId" = ${user.orgId}
          FOR UPDATE`;

        // Advance-first reversal. When this payment was recorded it split into
        // `advanceAppliedPaisa` (the overpayment that became advance) and
        // `amountPaisa - advanceAppliedPaisa` (what paid down dues). A refund is
        // the "extra" money going back, so we unwind the advance portion before
        // the dues portion — this matches the canonical case (a pure overpayment
        // refunded in full drops advance to 0 and leaves dues untouched).
        //
        // Computed cumulatively over the running refunded total so repeated
        // partial refunds stay consistent regardless of how they're chunked:
        // advance is reversed across the first `A` paisa refunded, dues across
        // the remaining `D`. reverseAdvance + reverseDues === dto.amountPaisa.
        const advancePortion = p.advanceAppliedPaisa; // A
        const reverseAdvance =
          Math.min(refundedPaisa, advancePortion) -
          Math.min(p.refundedPaisa, advancePortion);
        const reverseDues = dto.amountPaisa - reverseAdvance;

        // No clamp needed at either end, and none is added (avoiding dead code):
        //  - advanceBalancePaisa can't go negative — nothing draws advance down
        //    today (dues accrual on increase has no call site; advance is only
        //    ever added by overpayment and read-netted), so the advance this
        //    payment created is still fully present to reverse.
        //  - duesPaisa restoration is bounded by this payment's original dues
        //    portion (a full refund restores exactly amountPaisa -
        //    advanceAppliedPaisa, never more) — the sensible cap.
        if (reverseAdvance !== 0 || reverseDues !== 0) {
          await tx.resident.update({
            where: { id: p.residentId },
            data: {
              duesPaisa: locked.duesPaisa + reverseDues,
              advanceBalancePaisa: locked.advanceBalancePaisa - reverseAdvance,
            },
          });
        }
      }

      await this.audit.log(
        user,
        {
          action: "refunded_payment",
          entityType: "payment",
          entityId: p.id,
          entityLabel: p.receiptNo,
          details: { amountPaisa: dto.amountPaisa, reason: dto.reason },
        },
        tx,
      );
      return updated;
    });
    return toPaymentDto(updated);
  }

  /** GET /payments/:id/receipt.pdf — server-rendered, Noto Sans, ₹ glyph. */
  async receiptPdf(user: AuthUser, id: string): Promise<Buffer> {
    const p = await this.prisma.payment.findFirst({
      where: { id, orgId: user.orgId },
      include: PAYMENT_INCLUDE,
    });
    if (!p) throw ApiError.notFound("Payment");
    const org = await this.prisma.organization.findUniqueOrThrow({ where: { id: user.orgId } });

    const rows: [string, string][] = [
      ["Received from", p.resident.name],
      ["Room", p.resident.room?.number ?? "-"],
      ["Payment for", p.type.toUpperCase() + (p.periodMonth ? ` (${p.periodMonth})` : "")],
      ["Payment mode", p.method.replace("_", " ").toUpperCase()],
      ["Recorded by", p.recordedByName],
    ];
    if (p.notes) rows.push(["Notes", p.notes]);

    return this.pdf.receipt({
      org: {
        hostelName: org.hostelName ?? org.name,
        addressLine: org.addressLine ?? undefined,
        city: org.city ?? undefined,
        state: org.state ?? undefined,
        pincode: org.pincode ?? undefined,
        phone: org.phone ?? undefined,
      },
      receiptNo: p.receiptNo,
      paidAt: p.paidAt.toLocaleString("en-IN"),
      rows,
      amountPaisa: p.amountPaisa,
      refundedPaisa: p.refundedPaisa,
    });
  }

  // ---------- dues ----------

  async buildDues(orgId: string) {
    const residents = await this.prisma.resident.findMany({
      where: { orgId, status: "active", duesPaisa: { gt: 0 } },
      include: { room: { select: { number: true } } },
    });
    return residents
      .map((r) => {
        // Net dues against any prepaid advance — a resident fully covered by
        // advance drops out of the list entirely (filtered below).
        const netDues = effectiveDues(r.duesPaisa, r.advanceBalancePaisa);
        const months = Math.max(
          1,
          Math.round(netDues / Math.max(1, r.monthlyFeePaisa)),
        );
        const oldest = new Date();
        oldest.setMonth(oldest.getMonth() - months);
        oldest.setDate(10);
        return {
          residentId: r.id,
          residentName: r.name,
          phone: r.phone,
          roomNumber: r.room?.number,
          duesPaisa: netDues,
          oldestDueDate: oldest.toISOString(),
          monthsOverdue: months,
          severity: months >= 3 ? ("high" as const) : months >= 2 ? ("medium" as const) : ("low" as const),
        };
      })
      .filter((d) => d.duesPaisa > 0)
      .sort((a, b) => b.duesPaisa - a.duesPaisa);
  }

  async listDues(user: AuthUser, params: { page?: number; pageSize?: number; search?: string }) {
    let list = await this.buildDues(user.orgId);
    if (params.search) {
      const q = params.search.toLowerCase();
      list = list.filter(
        (d) =>
          d.residentName.toLowerCase().includes(q) ||
          (d.roomNumber ?? "").toLowerCase().includes(q),
      );
    }
    const { page, pageSize } = pageArgs(params, 10);
    return paginated(list.slice((page - 1) * pageSize, page * pageSize), list.length, page, pageSize);
  }

  async duesSummary(user: AuthUser) {
    const dues = await this.buildDues(user.orgId);
    return {
      totalDuesPaisa: dues.reduce((s, d) => s + d.duesPaisa, 0),
      residentsWithDues: dues.length,
      highSeverityCount: dues.filter((d) => d.severity === "high").length,
    };
  }
}
