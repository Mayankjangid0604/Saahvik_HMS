import { ConflictException, Inject, Injectable } from "@nestjs/common";
import type { Prisma, Wing } from "@prisma/client";
import { AuditService } from "../audit/audit.service";
import { ApiError } from "../common/api-error";
import type { AuthUser } from "../common/auth-user";
import { PrismaService } from "../prisma/prisma.service";
import type { CreateWingDto, UpdateWingDto } from "./dto";

type WingWithCount = Wing & { _count: { rooms: number } };

/** Frontend `Wing` shape. */
export function toWingDto(w: WingWithCount) {
  return {
    id: w.id,
    hostelId: w.hostelId,
    name: w.name,
    notes: w.notes ?? undefined,
    roomCount: w._count.rooms,
    createdAt: w.createdAt.toISOString(),
  };
}

@Injectable()
export class WingsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

  async list(user: AuthUser) {
    const wings = await this.prisma.wing.findMany({
      where: { orgId: user.orgId },
      include: { _count: { select: { rooms: true } } },
      orderBy: { name: "asc" },
    });
    return wings.map(toWingDto);
  }

  async create(user: AuthUser, dto: CreateWingDto) {
    const hostel = dto.hostelId
      ? await this.prisma.hostel.findFirst({ where: { id: dto.hostelId, orgId: user.orgId } })
      : await this.prisma.hostel.findFirst({ where: { orgId: user.orgId } });
    if (!hostel) throw ApiError.badRequest("Organization has no hostel configured");

    const dupe = await this.prisma.wing.findFirst({
      where: { hostelId: hostel.id, name: { equals: dto.name, mode: "insensitive" } },
    });
    if (dupe) throw new ConflictException(`A wing named "${dto.name}" already exists`);

    const wing = await this.prisma.wing.create({
      data: { orgId: user.orgId, hostelId: hostel.id, name: dto.name, notes: dto.notes },
      include: { _count: { select: { rooms: true } } },
    });
    await this.audit.log(user, {
      action: "created_wing",
      entityType: "wing",
      entityId: wing.id,
      entityLabel: wing.name,
    });
    return toWingDto(wing);
  }

  async update(user: AuthUser, id: string, dto: UpdateWingDto) {
    const existing = await this.prisma.wing.findFirst({ where: { id, orgId: user.orgId } });
    if (!existing) throw ApiError.notFound("Wing");

    if (dto.name && dto.name.toLowerCase() !== existing.name.toLowerCase()) {
      const dupe = await this.prisma.wing.findFirst({
        where: {
          hostelId: existing.hostelId,
          name: { equals: dto.name, mode: "insensitive" },
          id: { not: existing.id },
        },
      });
      if (dupe) throw new ConflictException(`A wing named "${dto.name}" already exists`);
    }

    const data: Prisma.WingUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.notes !== undefined) data.notes = dto.notes;
    const wing = await this.prisma.wing.update({
      where: { id: existing.id },
      data,
      include: { _count: { select: { rooms: true } } },
    });
    await this.audit.log(user, {
      action: "updated_wing",
      entityType: "wing",
      entityId: wing.id,
      entityLabel: wing.name,
      details: { changes: dto },
    });
    return toWingDto(wing);
  }

  /** Deleting a wing detaches its rooms (FK is ON DELETE SET NULL) — rooms survive. */
  async remove(user: AuthUser, id: string) {
    const existing = await this.prisma.wing.findFirst({ where: { id, orgId: user.orgId } });
    if (!existing) throw ApiError.notFound("Wing");
    await this.prisma.wing.delete({ where: { id: existing.id } });
    await this.audit.log(user, {
      action: "deleted_wing",
      entityType: "wing",
      entityId: existing.id,
      entityLabel: existing.name,
    });
    return { ok: true };
  }
}
