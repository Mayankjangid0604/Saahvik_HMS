import { HttpStatus, Inject, Injectable } from "@nestjs/common";
import { Prisma, PurchaseRecord, Vendor, VendorCategory } from "@prisma/client";
import { AuditService } from "../audit/audit.service";
import { ApiError } from "../common/api-error";
import type { AuthUser } from "../common/auth-user";
import { pageArgs, paginated, type Paginated } from "../common/pagination";
import { PrismaService } from "../prisma/prisma.service";
import type {
  CreatePurchaseDto,
  CreateVendorDto,
  PurchaseListParamsDto,
  UpdateVendorDto,
  VendorListParamsDto,
} from "./dto";

type VendorWithCount = Vendor & { _count: { purchases: number } };

const VENDOR_INCLUDE = {
  _count: { select: { purchases: true } },
} satisfies Prisma.VendorInclude;

export function toVendorDto(v: VendorWithCount) {
  return {
    id: v.id,
    name: v.name,
    contactPerson: v.contactPerson ?? undefined,
    phone: v.phone ?? undefined,
    email: v.email ?? undefined,
    address: v.address ?? undefined,
    category: v.category,
    active: v.active,
    notes: v.notes ?? undefined,
    purchaseCount: v._count.purchases,
    createdAt: v.createdAt.toISOString(),
    updatedAt: v.updatedAt.toISOString(),
  };
}

type PurchaseWithVendor = PurchaseRecord & { vendor: { name: string } };

export function toPurchaseDto(p: PurchaseWithVendor) {
  return {
    id: p.id,
    vendorId: p.vendorId,
    vendorName: p.vendor.name,
    label: p.label,
    amountPaisa: p.amountPaisa,
    category: p.category,
    purchasedAt: p.purchasedAt.toISOString(),
    invoiceRef: p.invoiceRef ?? undefined,
    expenseId: p.expenseId ?? undefined,
    notes: p.notes ?? undefined,
    attachmentUrl: p.attachmentKey ? `/api/v1/files/${p.attachmentKey}` : undefined,
    recordedByName: p.recordedByName,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

/**
 * Vendor directory + purchase records. One service handles both. Vendors are
 * soft-deactivated (never hard-deleted) once they have purchases so history
 * stays intact. Purchases may optionally reference an existing Expense via a
 * unique 1:1 link (we never create the Expense here — only validate the id).
 */
@Injectable()
export class VendorsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

  // ---------- vendors ----------

  async listVendors(user: AuthUser, params: VendorListParamsDto): Promise<Paginated<unknown>> {
    const where: Prisma.VendorWhereInput = { orgId: user.orgId };
    if (params.category && params.category !== "all") {
      where.category = params.category as VendorCategory;
    }
    if (params.active !== undefined) where.active = params.active;
    if (params.search) {
      where.OR = [
        { name: { contains: params.search, mode: "insensitive" } },
        { contactPerson: { contains: params.search, mode: "insensitive" } },
        { phone: { contains: params.search, mode: "insensitive" } },
        { email: { contains: params.search, mode: "insensitive" } },
      ];
    }

    const { page, pageSize, skip, take } = pageArgs(params, 20);
    const orderBy: Prisma.VendorOrderByWithRelationInput =
      params.sortBy === "createdAt"
        ? { createdAt: params.sortDir ?? "desc" }
        : { name: params.sortDir ?? "asc" };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.vendor.findMany({ where, include: VENDOR_INCLUDE, orderBy, skip, take }),
      this.prisma.vendor.count({ where }),
    ]);
    return paginated(rows.map(toVendorDto), total, page, pageSize);
  }

  async getVendor(user: AuthUser, id: string) {
    const vendor = await this.prisma.vendor.findFirst({
      where: { id, orgId: user.orgId },
      include: VENDOR_INCLUDE,
    });
    if (!vendor) throw ApiError.notFound("Vendor");
    return toVendorDto(vendor);
  }

  async createVendor(user: AuthUser, dto: CreateVendorDto) {
    const dupe = await this.prisma.vendor.findFirst({
      where: { orgId: user.orgId, name: { equals: dto.name, mode: "insensitive" } },
    });
    if (dupe) {
      throw new ApiError(
        HttpStatus.CONFLICT,
        "VENDOR_EXISTS",
        `A vendor named "${dto.name}" already exists`,
      );
    }

    const vendor = await this.prisma.vendor.create({
      data: {
        orgId: user.orgId,
        name: dto.name,
        contactPerson: dto.contactPerson,
        phone: dto.phone,
        email: dto.email,
        address: dto.address,
        category: dto.category ?? "other",
        notes: dto.notes,
      },
      include: VENDOR_INCLUDE,
    });
    await this.audit.log(user, {
      action: "created_vendor",
      entityType: "vendor",
      entityId: vendor.id,
      entityLabel: vendor.name,
      details: { category: vendor.category },
    });
    return toVendorDto(vendor);
  }

  async updateVendor(user: AuthUser, id: string, dto: UpdateVendorDto) {
    const existing = await this.prisma.vendor.findFirst({
      where: { id, orgId: user.orgId },
    });
    if (!existing) throw ApiError.notFound("Vendor");

    if (dto.name && dto.name.toLowerCase() !== existing.name.toLowerCase()) {
      const dupe = await this.prisma.vendor.findFirst({
        where: {
          orgId: user.orgId,
          name: { equals: dto.name, mode: "insensitive" },
          id: { not: existing.id },
        },
      });
      if (dupe) {
        throw new ApiError(
          HttpStatus.CONFLICT,
          "VENDOR_EXISTS",
          `A vendor named "${dto.name}" already exists`,
        );
      }
    }

    const data: Prisma.VendorUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.contactPerson !== undefined) data.contactPerson = dto.contactPerson || null;
    if (dto.phone !== undefined) data.phone = dto.phone || null;
    if (dto.email !== undefined) data.email = dto.email || null;
    if (dto.address !== undefined) data.address = dto.address || null;
    if (dto.category !== undefined) data.category = dto.category;
    if (dto.active !== undefined) data.active = dto.active;
    if (dto.notes !== undefined) data.notes = dto.notes || null;

    const vendor = await this.prisma.vendor.update({
      where: { id: existing.id },
      data,
      include: VENDOR_INCLUDE,
    });
    await this.audit.log(user, {
      action: "updated_vendor",
      entityType: "vendor",
      entityId: vendor.id,
      entityLabel: vendor.name,
      details: { changes: dto },
    });
    return toVendorDto(vendor);
  }

  /** Soft-delete: deactivate rather than hard-delete when purchases exist. */
  async deactivateVendor(user: AuthUser, id: string) {
    const existing = await this.prisma.vendor.findFirst({
      where: { id, orgId: user.orgId },
      include: VENDOR_INCLUDE,
    });
    if (!existing) throw ApiError.notFound("Vendor");

    if (existing._count.purchases === 0) {
      await this.prisma.vendor.delete({ where: { id: existing.id } });
      await this.audit.log(user, {
        action: "deleted_vendor",
        entityType: "vendor",
        entityId: existing.id,
        entityLabel: existing.name,
      });
      return { ok: true, deleted: true };
    }

    const vendor = await this.prisma.vendor.update({
      where: { id: existing.id },
      data: { active: false },
      include: VENDOR_INCLUDE,
    });
    await this.audit.log(user, {
      action: "deactivated_vendor",
      entityType: "vendor",
      entityId: vendor.id,
      entityLabel: vendor.name,
      details: { purchaseCount: existing._count.purchases },
    });
    return toVendorDto(vendor);
  }

  // ---------- purchases ----------

  private purchaseWhere(user: AuthUser, params: PurchaseListParamsDto): Prisma.PurchaseRecordWhereInput {
    const where: Prisma.PurchaseRecordWhereInput = { orgId: user.orgId };
    if (params.vendorId) where.vendorId = params.vendorId;
    if (params.category && params.category !== "all") {
      where.category = params.category as VendorCategory;
    }
    if (params.from || params.to) {
      where.purchasedAt = {};
      if (params.from) where.purchasedAt.gte = new Date(params.from);
      if (params.to) where.purchasedAt.lte = new Date(`${params.to}T23:59:59.999Z`);
    }
    if (params.search) {
      where.OR = [
        { label: { contains: params.search, mode: "insensitive" } },
        { invoiceRef: { contains: params.search, mode: "insensitive" } },
        { notes: { contains: params.search, mode: "insensitive" } },
        { vendor: { is: { name: { contains: params.search, mode: "insensitive" } } } },
      ];
    }
    return where;
  }

  async listPurchases(user: AuthUser, params: PurchaseListParamsDto): Promise<Paginated<unknown>> {
    const where = this.purchaseWhere(user, params);
    const { page, pageSize, skip, take } = pageArgs(params, 20);
    const orderBy: Prisma.PurchaseRecordOrderByWithRelationInput =
      params.sortBy === "amountPaisa"
        ? { amountPaisa: params.sortDir ?? "desc" }
        : { purchasedAt: params.sortDir ?? "desc" };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.purchaseRecord.findMany({
        where,
        include: { vendor: { select: { name: true } } },
        orderBy,
        skip,
        take,
      }),
      this.prisma.purchaseRecord.count({ where }),
    ]);
    return paginated(rows.map(toPurchaseDto), total, page, pageSize);
  }

  /** Aggregate total (paisa) + count for the same filters as listPurchases. */
  async purchaseSummary(user: AuthUser, params: PurchaseListParamsDto) {
    const where = this.purchaseWhere(user, params);
    const agg = await this.prisma.purchaseRecord.aggregate({
      where,
      _sum: { amountPaisa: true },
      _count: true,
    });
    return { totalPaisa: agg._sum.amountPaisa ?? 0, count: agg._count };
  }

  async createPurchase(user: AuthUser, dto: CreatePurchaseDto) {
    const vendor = await this.prisma.vendor.findFirst({
      where: { id: dto.vendorId, orgId: user.orgId },
    });
    if (!vendor) throw ApiError.badRequest("Unknown vendor");

    if (dto.expenseId) {
      const expense = await this.prisma.expense.findFirst({
        where: { id: dto.expenseId, orgId: user.orgId },
      });
      if (!expense) throw ApiError.badRequest("Linked expense does not belong to this organization");
      const linked = await this.prisma.purchaseRecord.findUnique({
        where: { expenseId: dto.expenseId },
      });
      if (linked) {
        throw new ApiError(
          HttpStatus.CONFLICT,
          "PURCHASE_EXPENSE_LINKED",
          "That expense is already linked to another purchase",
        );
      }
    }

    const purchase = await this.prisma.$transaction(async (tx) => {
      const created = await tx.purchaseRecord.create({
        data: {
          orgId: user.orgId,
          vendorId: vendor.id,
          label: dto.label,
          amountPaisa: dto.amountPaisa,
          category: dto.category ?? vendor.category,
          purchasedAt: new Date(dto.purchasedAt),
          invoiceRef: dto.invoiceRef,
          expenseId: dto.expenseId,
          notes: dto.notes,
          attachmentKey: dto.attachmentKey,
          recordedByName: user.name,
        },
        include: { vendor: { select: { name: true } } },
      });
      await this.audit.log(
        user,
        {
          action: "recorded_purchase",
          entityType: "purchase",
          entityId: created.id,
          entityLabel: created.label,
          details: {
            vendor: vendor.name,
            amountPaisa: dto.amountPaisa,
            category: created.category,
            expenseId: dto.expenseId ?? null,
          },
        },
        tx,
      );
      return created;
    });
    return toPurchaseDto(purchase);
  }
}
