import { Inject, Injectable } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { AuditService } from "../audit/audit.service";
import { ApiError } from "../common/api-error";
import type { AuthUser } from "../common/auth-user";
import { PrismaService } from "../prisma/prisma.service";
import type { ApplyDiscountDto, CreateDiscountDto } from "./dto";

type DiscountWithCount = Prisma.DiscountGetPayload<{
  include: { _count: { select: { applications: true } } };
}>;

function toDiscountDto(d: DiscountWithCount) {
  return {
    id: d.id,
    name: d.name,
    kind: d.kind,
    value: d.value,
    appliedCount: d._count.applications,
    active: d.active,
    validTill: d.validTill?.toISOString(),
    createdAt: d.createdAt.toISOString(),
  };
}

const DISCOUNT_INCLUDE = { _count: { select: { applications: true } } } as const;

@Injectable()
export class DiscountsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

  async list(user: AuthUser) {
    const rows = await this.prisma.discount.findMany({
      where: { orgId: user.orgId },
      include: DISCOUNT_INCLUDE,
      orderBy: { createdAt: "asc" },
    });
    return rows.map(toDiscountDto);
  }

  async create(user: AuthUser, dto: CreateDiscountDto) {
    const d = await this.prisma.discount.create({
      data: {
        orgId: user.orgId,
        name: dto.name,
        kind: dto.kind,
        value: dto.value,
        validTill: dto.validTill ? new Date(dto.validTill) : undefined,
      },
      include: DISCOUNT_INCLUDE,
    });
    await this.audit.log(user, {
      action: "created_discount",
      entityType: "discount",
      entityId: d.id,
      entityLabel: d.name,
      details: { kind: d.kind, value: d.value },
    });
    return toDiscountDto(d);
  }

  async toggle(user: AuthUser, id: string) {
    const existing = await this.prisma.discount.findFirst({ where: { id, orgId: user.orgId } });
    if (!existing) throw ApiError.notFound("Discount");
    const d = await this.prisma.discount.update({
      where: { id: existing.id },
      data: { active: !existing.active },
      include: DISCOUNT_INCLUDE,
    });
    await this.audit.log(user, {
      action: d.active ? "activated_discount" : "deactivated_discount",
      entityType: "discount",
      entityId: d.id,
      entityLabel: d.name,
    });
    return toDiscountDto(d);
  }

  async apply(user: AuthUser, id: string, dto: ApplyDiscountDto) {
    const discount = await this.prisma.discount.findFirst({ where: { id, orgId: user.orgId } });
    if (!discount) throw ApiError.notFound("Discount");
    if (!discount.active) throw ApiError.badRequest("This discount is inactive");

    let applied = 0;
    for (const residentId of dto.residentIds) {
      const resident = await this.prisma.resident.findFirst({
        where: { id: residentId, orgId: user.orgId },
      });
      if (!resident) continue;
      const exists = await this.prisma.discountApplication.findUnique({
        where: { discountId_residentId: { discountId: discount.id, residentId } },
      });
      if (exists) continue;
      await this.prisma.discountApplication.create({
        data: {
          orgId: user.orgId,
          discountId: discount.id,
          residentId,
          appliedByUserId: user.userId,
        },
      });
      applied++;
    }

    await this.audit.log(user, {
      action: "applied_discount",
      entityType: "discount",
      entityId: discount.id,
      entityLabel: discount.name,
      details: { applied, requested: dto.residentIds.length },
    });
    return { applied };
  }
}
