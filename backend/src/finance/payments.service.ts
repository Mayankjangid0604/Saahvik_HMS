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
      const appliedToDues = dto.type === "rent" ? Math.min(dto.amountPaisa, resident.duesPaisa) : 0;
      const advanceApplied = dto.type === "rent" ? dto.amountPaisa - appliedToDues : 0;

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
            // resident.duesPaisa - appliedToDues == Math.max(0, dues - amount):
            // same clamp-at-zero behavior, but the excess is now recorded below.
            duesPaisa: resident.duesPaisa - appliedToDues,
            advanceBalancePaisa: resident.advanceBalancePaisa + advanceApplied,
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
