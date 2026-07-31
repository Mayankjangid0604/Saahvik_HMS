import { Inject, Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { AuditService } from "../audit/audit.service";
import { ApiError } from "../common/api-error";
import type { AuthUser } from "../common/auth-user";
import { computeGst } from "../common/gst";
import { pageArgs, paginated, type Paginated } from "../common/pagination";
import { SequenceService } from "../common/sequence.service";
import { PrismaService } from "../prisma/prisma.service";
import type { CreateInvoiceDto, InvoiceListParamsDto } from "./dto";

type InvoiceFull = Prisma.InvoiceGetPayload<{
  include: { resident: { select: { name: true; room: { select: { number: true } } } } };
}>;

const INVOICE_INCLUDE = {
  resident: { select: { name: true, room: { select: { number: true } } } },
} satisfies Prisma.InvoiceInclude;

/**
 * Wire status: "overdue" is derived (unpaid + past due date), never stored —
 * DB keeps unpaid/partially_paid/paid/cancelled.
 */
function toInvoiceDto(inv: InvoiceFull) {
  const overdue =
    inv.status === "unpaid" && inv.dueAt != null && inv.dueAt.getTime() < Date.now();
  return {
    id: inv.id,
    number: inv.invoiceNumber,
    residentId: inv.residentId,
    residentName: inv.resident.name,
    roomNumber: inv.resident.room?.number,
    items: inv.lineItems as { description: string; amountPaisa: number }[],
    totalPaisa: inv.amountPaisa,
    paidPaisa: inv.paidPaisa,
    status: overdue ? ("overdue" as const) : inv.status,
    issueDate: (inv.issuedAt ?? inv.createdAt).toISOString(),
    dueDate: inv.dueAt?.toISOString() ?? "",
  };
}

@Injectable()
export class InvoicesService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly audit: AuditService,
    @Inject(SequenceService) private readonly sequence: SequenceService,
  ) {}

  async list(user: AuthUser, params: InvoiceListParamsDto): Promise<Paginated<unknown>> {
    const where: Prisma.InvoiceWhereInput = { orgId: user.orgId };
    const now = new Date();
    switch (params.status) {
      case undefined:
      case "all":
        break;
      case "overdue":
        where.status = "unpaid";
        where.dueAt = { lt: now };
        break;
      case "unpaid":
        where.status = "unpaid";
        where.OR = [{ dueAt: null }, { dueAt: { gte: now } }];
        break;
      default:
        where.status = params.status as Prisma.EnumInvoiceStatusFilter["equals"];
    }
    if (params.search) {
      where.AND = [
        {
          OR: [
            { invoiceNumber: { contains: params.search, mode: "insensitive" } },
            { resident: { is: { name: { contains: params.search, mode: "insensitive" } } } },
          ],
        },
      ];
    }

    const { page, pageSize, skip, take } = pageArgs(params, 10);
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.invoice.findMany({
        where,
        include: INVOICE_INCLUDE,
        orderBy: { issuedAt: params.sortDir ?? "desc" },
        skip,
        take,
      }),
      this.prisma.invoice.count({ where }),
    ]);
    return paginated(rows.map(toInvoiceDto), total, page, pageSize);
  }

  async get(user: AuthUser, id: string) {
    const inv = await this.prisma.invoice.findFirst({
      where: { id, orgId: user.orgId },
      include: INVOICE_INCLUDE,
    });
    if (!inv) throw ApiError.notFound("Invoice");
    // GST breakdown (feature 8) on the invoice total — same computeGst helper
    // the receipt PDF uses, so the two never diverge. Present on the detail
    // view; null when the org hasn't enabled GST.
    const org = await this.prisma.organization.findUniqueOrThrow({ where: { id: user.orgId } });
    const gst = computeGst(inv.amountPaisa, {
      gstEnabled: org.gstEnabled,
      gstRatePercent: org.gstRatePercent,
      gstInclusive: org.gstInclusive,
      gstin: org.gstin,
    });
    return { ...toInvoiceDto(inv), gst: gst.enabled ? gst : undefined };
  }

  /**
   * Business rule 7: INV-YYYY-#### is sequential per org per calendar year,
   * allocated under a SELECT ... FOR UPDATE row lock in the SAME transaction
   * as the insert — concurrent creates serialize instead of duplicating.
   */
  async create(user: AuthUser, dto: CreateInvoiceDto) {
    const resident = await this.prisma.resident.findFirst({
      where: { id: dto.residentId, orgId: user.orgId },
    });
    if (!resident) throw ApiError.notFound("Resident");
    if (dto.items.length === 0) throw ApiError.badRequest("An invoice needs at least one line item");

    const total = dto.items.reduce((s, it) => s + it.amountPaisa, 0);
    const now = new Date();
    const year = now.getFullYear();

    const invoice = await this.prisma.$transaction(async (tx) => {
      const seq = await this.sequence.next(tx, user.orgId, "invoice", year);
      const invoice = await tx.invoice.create({
        data: {
          orgId: user.orgId,
          residentId: resident.id,
          invoiceNumber: this.sequence.formatInvoiceNo(year, seq),
          amountPaisa: total,
          lineItems: dto.items as unknown as Prisma.InputJsonValue,
          issuedAt: now,
          dueAt: new Date(dto.dueDate),
        },
        include: INVOICE_INCLUDE,
      });
      await this.audit.log(
        user,
        {
          action: "created_invoice",
          entityType: "invoice",
          entityId: invoice.id,
          entityLabel: invoice.invoiceNumber,
          details: { residentName: resident.name, totalPaisa: total, items: dto.items.length },
        },
        tx,
      );
      return invoice;
    });
    return toInvoiceDto(invoice);
  }
}
