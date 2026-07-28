import { HttpStatus, Inject, Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { AuditService } from "../audit/audit.service";
import { ApiError } from "../common/api-error";
import type { AuthUser } from "../common/auth-user";
import { pageArgs, paginated, type Paginated } from "../common/pagination";
import type { ListParamsDto } from "../common/pagination";
import { PrismaService } from "../prisma/prisma.service";
import type { AssignFeeDto, CreateFeeStructureDto } from "./dto";

@Injectable()
export class FeesService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

  async listStructures(user: AuthUser) {
    const fees = await this.prisma.feeStructure.findMany({
      where: { orgId: user.orgId },
      include: { _count: { select: { assignments: true } } },
      orderBy: { createdAt: "asc" },
    });
    return fees.map((f) => ({
      id: f.id,
      name: f.name,
      amountPaisa: f.amountPaisa,
      cycle: f.cycle,
      description: f.description ?? undefined,
      assignedCount: f._count.assignments,
      createdAt: f.createdAt.toISOString(),
    }));
  }

  async createStructure(user: AuthUser, dto: CreateFeeStructureDto) {
    const fee = await this.prisma.feeStructure.create({
      data: {
        orgId: user.orgId,
        name: dto.name,
        amountPaisa: dto.amountPaisa,
        cycle: dto.cycle,
        description: dto.description,
      },
    });
    await this.audit.log(user, {
      action: "created_fee_structure",
      entityType: "fee_structure",
      entityId: fee.id,
      entityLabel: fee.name,
      details: { amountPaisa: fee.amountPaisa, cycle: fee.cycle },
    });
    return {
      id: fee.id,
      name: fee.name,
      amountPaisa: fee.amountPaisa,
      cycle: fee.cycle,
      description: fee.description ?? undefined,
      assignedCount: 0,
      createdAt: fee.createdAt.toISOString(),
    };
  }

  async deleteStructure(user: AuthUser, id: string) {
    const fee = await this.prisma.feeStructure.findFirst({
      where: { id, orgId: user.orgId },
      include: { _count: { select: { assignments: true } } },
    });
    if (!fee) throw ApiError.notFound("Fee structure");
    if (fee._count.assignments > 0) {
      throw new ApiError(
        HttpStatus.CONFLICT,
        "FEE_STRUCTURE_IN_USE",
        "Cannot delete a fee that is assigned to residents",
      );
    }
    await this.prisma.feeStructure.delete({ where: { id: fee.id } });
    await this.audit.log(user, {
      action: "deleted_fee_structure",
      entityType: "fee_structure",
      entityId: fee.id,
      entityLabel: fee.name,
    });
    return { ok: true };
  }

  async listAssignments(user: AuthUser, params: ListParamsDto): Promise<Paginated<unknown>> {
    const where: Prisma.FeeAssignmentWhereInput = { orgId: user.orgId };
    if (params.search) {
      where.OR = [{ feeStructure: { is: { name: { contains: params.search, mode: "insensitive" } } } }];
    }
    const { page, pageSize, skip, take } = pageArgs(params, 10);
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.feeAssignment.findMany({
        where,
        include: { feeStructure: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
        skip,
        take,
      }),
      this.prisma.feeAssignment.count({ where }),
    ]);

    // Resident names/rooms resolved in one query (FeeAssignment has no FK to Resident).
    const residents = await this.prisma.resident.findMany({
      where: { id: { in: rows.map((r) => r.residentId) } },
      select: { id: true, name: true, room: { select: { number: true } } },
    });
    const byId = new Map(residents.map((r) => [r.id, r]));

    return paginated(
      rows.map((a) => ({
        id: a.id,
        feeStructureId: a.feeStructureId,
        feeName: a.feeStructure.name,
        residentId: a.residentId,
        residentName: byId.get(a.residentId)?.name ?? "(removed)",
        roomNumber: byId.get(a.residentId)?.room?.number,
        startDate: a.startDate.toISOString(),
        amountPaisa: a.amountPaisa,
      })),
      total,
      page,
      pageSize,
    );
  }

  async assign(user: AuthUser, dto: AssignFeeDto) {
    const fee = await this.prisma.feeStructure.findFirst({
      where: { id: dto.feeStructureId, orgId: user.orgId },
    });
    if (!fee) throw ApiError.notFound("Fee structure");

    let assigned = 0;
    for (const residentId of dto.residentIds) {
      const resident = await this.prisma.resident.findFirst({
        where: { id: residentId, orgId: user.orgId },
        include: { room: true },
      });
      if (!resident) continue;

      // Business rule 3 — a fee assignment for a bed in a fixed-fee room must
      // match the room's fixed amount exactly.
      if (
        resident.room?.feeMode === "fixed" &&
        resident.room.fixedFeeAmountPaisa != null &&
        fee.amountPaisa !== resident.room.fixedFeeAmountPaisa
      ) {
        throw new ApiError(
          HttpStatus.UNPROCESSABLE_ENTITY,
          "FEE_LOCKED_BY_ROOM",
          `${resident.name}'s room has a fixed fee of ${resident.room.fixedFeeAmountPaisa} paisa`,
          { expectedPaisa: resident.room.fixedFeeAmountPaisa, residentId },
        );
      }

      const exists = await this.prisma.feeAssignment.findUnique({
        where: {
          feeStructureId_residentId: { feeStructureId: fee.id, residentId },
        },
      });
      if (exists) continue;

      await this.prisma.feeAssignment.create({
        data: {
          orgId: user.orgId,
          feeStructureId: fee.id,
          residentId,
          startDate: new Date(dto.startDate),
          amountPaisa: fee.amountPaisa,
        },
      });
      assigned++;
    }

    await this.audit.log(user, {
      action: "assigned_fee",
      entityType: "fee_structure",
      entityId: fee.id,
      entityLabel: fee.name,
      details: { assigned, requested: dto.residentIds.length },
    });
    return { assigned };
  }

  async removeAssignment(user: AuthUser, id: string) {
    const a = await this.prisma.feeAssignment.findFirst({
      where: { id, orgId: user.orgId },
      include: { feeStructure: { select: { name: true } } },
    });
    if (!a) throw ApiError.notFound("Assignment");
    await this.prisma.feeAssignment.delete({ where: { id: a.id } });
    await this.audit.log(user, {
      action: "removed_fee_assignment",
      entityType: "fee_structure",
      entityId: a.feeStructureId,
      entityLabel: a.feeStructure.name,
      details: { residentId: a.residentId },
    });
    return { ok: true };
  }
}
