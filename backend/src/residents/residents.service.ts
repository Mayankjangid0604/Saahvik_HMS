import { HttpStatus, Inject, Injectable } from "@nestjs/common";
import { Prisma, ResidentStatus } from "@prisma/client";
import { AuditService } from "../audit/audit.service";
import { ApiError } from "../common/api-error";
import type { AuthUser } from "../common/auth-user";
import { effectiveDues } from "../common/dues";
import { pageArgs, paginated, type Paginated } from "../common/pagination";
import { fileUrl } from "../files/files.service";
import { NotificationsService } from "../notifications/notifications.service";
import { PrismaService } from "../prisma/prisma.service";
import { SequenceService } from "../common/sequence.service";
import { validateAdmissionData } from "./admission-validation";
import type {
  BulkImportDto,
  CheckoutDto,
  CreateResidentDto,
  ResidentListParamsDto,
  UpdateResidentDto,
} from "./dto";

// Business rule 2 — resident caps (soft block with 5-day grace).
export const ACTIVE_RESIDENT_CAP = 150;
export const LIFETIME_RESIDENT_CAP = 500;
const GRACE_DAYS = 5;

type ResidentWithRefs = Prisma.ResidentGetPayload<{
  include: { room: { select: { number: true } }; bed: { select: { id: true; label: true } } };
}>;

const RESIDENT_INCLUDE = {
  room: { select: { number: true } },
  bed: { select: { id: true, label: true } },
} satisfies Prisma.ResidentInclude;

export function toResidentDto(r: ResidentWithRefs) {
  return {
    id: r.id,
    name: r.name,
    phone: r.phone,
    email: r.email ?? undefined,
    photoUrl: r.photoKey ? fileUrl(r.photoKey) : undefined,
    idDocUrl: r.idDocKey ? fileUrl(r.idDocKey) : undefined,
    status: r.status,
    roomId: r.roomId ?? undefined,
    roomNumber: r.room?.number,
    bedId: r.bed?.id,
    bedLabel: r.bed?.label,
    joinDate: r.joinDate.toISOString(),
    exitDate: r.exitDate?.toISOString(),
    guardianName: r.guardianName,
    guardianPhone: r.guardianPhone,
    permanentAddress: r.permanentAddress,
    idType: r.idType,
    idNumber: r.idNumber,
    occupation: r.occupation,
    institutionOrCompany: r.institutionOrCompany ?? undefined,
    monthlyFeePaisa: r.monthlyFeePaisa,
    depositPaisa: r.depositPaisa,
    // Dues shown net of advance; advance surfaced separately so an owner sees
    // "why dues aren't rising" (a positive advance balance covering rent).
    duesPaisa: effectiveDues(r.duesPaisa, r.advanceBalancePaisa),
    advanceBalancePaisa: r.advanceBalancePaisa,
    notes: r.notes ?? undefined,
    admissionData: (r.admissionData ?? undefined) as Record<string, string> | undefined,
  };
}

@Injectable()
export class ResidentsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly audit: AuditService,
    @Inject(NotificationsService) private readonly notifications: NotificationsService,
    @Inject(SequenceService) private readonly sequence: SequenceService,
  ) {}

  async list(user: AuthUser, params: ResidentListParamsDto): Promise<Paginated<unknown>> {
    const where: Prisma.ResidentWhereInput = { orgId: user.orgId };
    if (params.status && params.status !== "all") {
      where.status = params.status as ResidentStatus;
    } else if (!params.status) {
      // Default view excludes alumni (mock parity); "all" includes everyone.
      where.status = { not: "alumni" };
    }
    if (params.roomId) where.roomId = params.roomId;
    if (params.search) {
      where.OR = [
        { name: { contains: params.search, mode: "insensitive" } },
        { phone: { contains: params.search } },
        { room: { is: { number: { contains: params.search, mode: "insensitive" } } } },
      ];
    }

    const { page, pageSize, skip, take } = pageArgs(params, 10);
    const sortField = params.sortBy ?? "name";
    const dir = params.sortDir ?? "asc";

    // "duesPaisa" is the netted effectiveDues(dues, advance) value shown to the
    // user, not the raw column — a resident whose advance fully covers dues shows
    // ₹0 yet would rank high in a raw-column sort. Prisma can't ORDER BY a
    // computed expression, so for this field we fetch all matching rows, sort the
    // mapped (netted) DTOs in JS, then slice for pagination. Resident counts are
    // capped small per org (≤500), so fetch-all-then-slice is cheap — the same
    // pattern PaymentsService.buildDues/listDues already uses.
    if (sortField === "duesPaisa") {
      const rows = await this.prisma.resident.findMany({ where, include: RESIDENT_INCLUDE });
      const mapped = rows.map(toResidentDto);
      mapped.sort((a, b) => (dir === "asc" ? a.duesPaisa - b.duesPaisa : b.duesPaisa - a.duesPaisa));
      return paginated(mapped.slice(skip, skip + take), mapped.length, page, pageSize);
    }

    const orderBy: Prisma.ResidentOrderByWithRelationInput =
      sortField === "joinDate"
        ? { joinDate: dir }
        : sortField === "monthlyFeePaisa"
          ? { monthlyFeePaisa: dir }
          : { name: dir };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.resident.findMany({ where, include: RESIDENT_INCLUDE, orderBy, skip, take }),
      this.prisma.resident.count({ where }),
    ]);
    return paginated(rows.map(toResidentDto), total, page, pageSize);
  }

  async listAllActive(user: AuthUser) {
    const rows = await this.prisma.resident.findMany({
      where: { orgId: user.orgId, status: "active" },
      include: RESIDENT_INCLUDE,
      orderBy: { name: "asc" },
    });
    return rows.map(toResidentDto);
  }

  async get(user: AuthUser, id: string) {
    const r = await this.prisma.resident.findFirst({
      where: { id, orgId: user.orgId },
      include: RESIDENT_INCLUDE,
    });
    if (!r) throw ApiError.notFound("Resident");
    return toResidentDto(r);
  }

  async create(user: AuthUser, dto: CreateResidentDto) {
    await this.enforceResidentCaps(user.orgId);
    await this.validateAdmission(user.orgId, dto.admissionData);

    const resident = await this.prisma.$transaction(async (tx) => {
      // #12 — Prevent duplicate residents within the same org
      const dupeByPhone = await tx.resident.findFirst({
        where: { orgId: user.orgId, phone: dto.phone, status: { not: "alumni" } },
      });
      if (dupeByPhone) {
        throw new ApiError(
          HttpStatus.CONFLICT,
          "DUPLICATE_PHONE",
          `A resident with phone ${dto.phone} already exists (${dupeByPhone.name})`,
        );
      }
      if (dto.idNumber) {
        const dupeByAadhaar = await tx.resident.findFirst({
          where: { orgId: user.orgId, idNumber: dto.idNumber, status: { not: "alumni" } },
        });
        if (dupeByAadhaar) {
          throw new ApiError(
            HttpStatus.CONFLICT,
            "DUPLICATE_ID",
            `A resident with this ID number already exists (${dupeByAadhaar.name})`,
          );
        }
      }

      let monthlyFeePaisa = dto.monthlyFeePaisa ?? 0;
      let bedToOccupy: string | null = null;

      if (dto.roomId) {
        const room = await tx.room.findFirst({
          where: { id: dto.roomId, orgId: user.orgId },
          include: { beds: true },
        });
        if (!room) throw ApiError.notFound("Room");

        // #13 — Explicit capacity check (defense-in-depth)
        const occupiedCount = room.beds.filter((b) => b.status === "occupied").length;
        if (occupiedCount >= room.capacity) {
          throw new ApiError(
            HttpStatus.CONFLICT,
            "ROOM_FULL",
            `${room.number} is at full capacity (${room.capacity} beds occupied)`,
          );
        }

        const bed = room.beds.find((b) => b.id === dto.bedId);
        if (!bed) throw ApiError.notFound("Selected bed");
        if (bed.status === "occupied") {
          throw new ApiError(
            HttpStatus.CONFLICT,
            "BED_OCCUPIED",
            `Bed ${bed.label} is already occupied`,
          );
        }
        // Business rule 3 — fixed-fee rooms lock the fee to the room amount.
        if (room.feeMode === "fixed" && room.fixedFeeAmountPaisa != null) {
          if (dto.monthlyFeePaisa != null && dto.monthlyFeePaisa !== room.fixedFeeAmountPaisa) {
            throw new ApiError(
              HttpStatus.UNPROCESSABLE_ENTITY,
              "FEE_LOCKED_BY_ROOM",
              `This room's fee is fixed at ${room.fixedFeeAmountPaisa} paisa`,
              { expectedPaisa: room.fixedFeeAmountPaisa },
            );
          }
          monthlyFeePaisa = room.fixedFeeAmountPaisa;
        }
        bedToOccupy = bed.id;
      }

      // Generate sequential form number: HOSTEL_YEAR_SEQ
      const hostel = await tx.hostel.findFirst({ where: { orgId: user.orgId } });
      const year = new Date().getFullYear();
      const seq = await this.sequence.next(tx, user.orgId, "form", year);
      const formNo = this.sequence.formatFormNo(hostel?.id ?? user.orgId, year, seq);

      const admissionData = { ...(dto.admissionData ?? {}), formNo } as Record<string, string>;

      const resident = await tx.resident.create({
        data: {
          orgId: user.orgId,
          name: dto.name,
          phone: dto.phone,
          email: dto.email,
          status: dto.status ?? "active",
          roomId: dto.roomId,
          joinDate: new Date(dto.joinDate),
          guardianName: dto.guardianName ?? "",
          guardianPhone: dto.guardianPhone ?? "",
          permanentAddress: dto.permanentAddress ?? "",
          idType: dto.idType ?? "aadhaar",
          idNumber: dto.idNumber ?? "",
          occupation: dto.occupation ?? "student",
          institutionOrCompany: dto.institutionOrCompany,
          monthlyFeePaisa,
          depositPaisa: dto.depositPaisa ?? 0,
          notes: dto.notes,
          admissionData: admissionData as Prisma.InputJsonValue,
        },
        include: RESIDENT_INCLUDE,
      });

      if (bedToOccupy) {
        await tx.bed.update({
          where: { id: bedToOccupy },
          data: { status: "occupied", residentId: resident.id },
        });
      }

      // Security deposit collected at admission → tracked Deposit record.
      if ((dto.depositPaisa ?? 0) > 0) {
        await tx.deposit.create({
          data: {
            orgId: user.orgId,
            residentId: resident.id,
            amountPaisa: dto.depositPaisa!,
            history: [
              {
                action: "collected",
                amountPaisa: dto.depositPaisa,
                actorId: user.userId,
                ts: new Date().toISOString(),
              },
            ] as Prisma.InputJsonValue,
          },
        });
      }

      await this.audit.log(
        user,
        {
          action: "added_resident",
          entityType: "resident",
          entityId: resident.id,
          entityLabel: resident.name,
          details: { roomId: dto.roomId ?? null, monthlyFeePaisa, depositPaisa: dto.depositPaisa ?? 0 },
        },
        tx,
      );
      return resident;
    });

    await this.notifications.notifyOrg(user.orgId, {
      kind: "system",
      title: "New resident",
      body: `${resident.name} was checked in by ${user.name}`,
      link: `/residents/${resident.id}`,
      excludeUserId: user.userId,
    });

    // Re-fetch with the bed now linked.
    return this.get(user, resident.id);
  }

  async update(user: AuthUser, id: string, dto: UpdateResidentDto) {
    const existing = await this.prisma.resident.findFirst({
      where: { id, orgId: user.orgId },
      include: { room: true },
    });
    if (!existing) throw ApiError.notFound("Resident");
    await this.validateAdmission(user.orgId, dto.admissionData, { partial: true });

    // Fee lock also applies when editing a resident already in a fixed room.
    if (
      dto.monthlyFeePaisa != null &&
      existing.room?.feeMode === "fixed" &&
      existing.room.fixedFeeAmountPaisa != null &&
      dto.monthlyFeePaisa !== existing.room.fixedFeeAmountPaisa
    ) {
      throw new ApiError(
        HttpStatus.UNPROCESSABLE_ENTITY,
        "FEE_LOCKED_BY_ROOM",
        `This room's fee is fixed at ${existing.room.fixedFeeAmountPaisa} paisa`,
        { expectedPaisa: existing.room.fixedFeeAmountPaisa },
      );
    }

    const mergedAdmission =
      dto.admissionData != null
        ? { ...((existing.admissionData as Record<string, unknown>) ?? {}), ...dto.admissionData }
        : undefined;

    const updated = await this.prisma.resident.update({
      where: { id: existing.id },
      data: {
        name: dto.name,
        phone: dto.phone,
        email: dto.email,
        guardianName: dto.guardianName,
        guardianPhone: dto.guardianPhone,
        permanentAddress: dto.permanentAddress,
        idType: dto.idType,
        idNumber: dto.idNumber,
        occupation: dto.occupation,
        institutionOrCompany: dto.institutionOrCompany,
        monthlyFeePaisa: dto.monthlyFeePaisa,
        depositPaisa: dto.depositPaisa,
        notes: dto.notes,
        status: dto.status,
        admissionData: mergedAdmission as Prisma.InputJsonValue | undefined,
      },
      include: RESIDENT_INCLUDE,
    });

    await this.audit.log(user, {
      action: "updated_resident",
      entityType: "resident",
      entityId: updated.id,
      entityLabel: updated.name,
      details: { changes: Object.fromEntries(Object.entries(dto).filter(([, v]) => v !== undefined)) },
    });
    return toResidentDto(updated);
  }

  async checkout(user: AuthUser, id: string, dto: CheckoutDto) {
    const resident = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.resident.findFirst({
        where: { id, orgId: user.orgId },
        include: { bed: true },
      });
      if (!existing) throw ApiError.notFound("Resident");

      if (existing.bed) {
        await tx.bed.update({
          where: { id: existing.bed.id },
          data: { status: "vacant", residentId: null },
        });
      }
      const updated = await tx.resident.update({
        where: { id: existing.id },
        data: { status: "alumni", exitDate: new Date(dto.exitDate), roomId: null },
        include: RESIDENT_INCLUDE,
      });
      await this.audit.log(
        user,
        {
          action: "checked_out_resident",
          entityType: "resident",
          entityId: updated.id,
          entityLabel: updated.name,
          details: { exitDate: dto.exitDate },
        },
        tx,
      );
      return updated;
    });

    await this.resetGraceIfUnderCap(user.orgId);
    return toResidentDto(resident);
  }

  /** Owner only (enforced at the controller with @Roles). */
  async remove(user: AuthUser, id: string) {
    const existing = await this.prisma.resident.findFirst({
      where: { id, orgId: user.orgId },
      include: { bed: true },
    });
    if (!existing) throw ApiError.notFound("Resident");

    try {
      await this.prisma.$transaction(async (tx) => {
        if (existing.bed) {
          await tx.bed.update({
            where: { id: existing.bed.id },
            data: { status: "vacant", residentId: null },
          });
        }
        await tx.resident.delete({ where: { id: existing.id } });
        await this.audit.log(
          user,
          {
            action: "deleted_resident",
            entityType: "resident",
            entityId: existing.id,
            entityLabel: existing.name,
          },
          tx,
        );
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2003") {
        throw new ApiError(
          HttpStatus.CONFLICT,
          "RESIDENT_HAS_RECORDS",
          "This resident has payment or billing history. Check them out instead of deleting.",
        );
      }
      throw err;
    }
    await this.resetGraceIfUnderCap(user.orgId);
    return { ok: true };
  }

  async bulkImport(user: AuthUser, dto: BulkImportDto) {
    const errors: { row: number; message: string }[] = [];
    let imported = 0;
    let skipped = 0;

    for (let i = 0; i < dto.rows.length; i++) {
      const row = dto.rows[i];
      if (!row.name || !row.phone) {
        errors.push({ row: i + 1, message: "Name and phone are required" });
        continue;
      }
      const dupe = await this.prisma.resident.findFirst({
        where: { orgId: user.orgId, phone: row.phone },
      });
      if (dupe) {
        skipped++;
        continue;
      }

      try {
        await this.enforceResidentCaps(user.orgId);
      } catch (err) {
        errors.push({ row: i + 1, message: "Resident cap exceeded — remaining rows not imported" });
        break;
      }

      let roomId: string | undefined;
      let bedId: string | undefined;
      let feePaisa = Math.round(row.monthlyFeeRupees * 100);
      if (row.roomNumber) {
        const room = await this.prisma.room.findFirst({
          where: { orgId: user.orgId, number: { equals: row.roomNumber, mode: "insensitive" } },
          include: { beds: true },
        });
        if (!room) {
          errors.push({ row: i + 1, message: `Room "${row.roomNumber}" not found` });
          continue;
        }
        const bed = room.beds.find((b) => b.label === row.bedLabel && b.status === "vacant");
        if (!bed) {
          errors.push({
            row: i + 1,
            message: `Bed ${row.bedLabel ?? "?"} in ${row.roomNumber} is not vacant`,
          });
          continue;
        }
        roomId = room.id;
        bedId = bed.id;
        // Imports take the room's fixed fee instead of failing the whole file.
        if (room.feeMode === "fixed" && room.fixedFeeAmountPaisa != null) {
          feePaisa = room.fixedFeeAmountPaisa;
        }
      }

      await this.prisma.$transaction(async (tx) => {
        const resident = await tx.resident.create({
          data: {
            orgId: user.orgId,
            name: row.name,
            phone: row.phone,
            roomId,
            joinDate: row.joinDate ? new Date(row.joinDate) : new Date(),
            monthlyFeePaisa: feePaisa,
            admissionData: row.admissionData as Prisma.InputJsonValue ?? Prisma.JsonNull,
          },
        });
        if (bedId) {
          await tx.bed.update({
            where: { id: bedId },
            data: { status: "occupied", residentId: resident.id },
          });
        }
      });
      imported++;
    }

    await this.audit.log(user, {
      action: "imported_residents",
      entityType: "resident",
      entityId: "bulk",
      entityLabel: `${imported} imported`,
      details: { imported, skipped, errorCount: errors.length },
    });
    return { imported, skipped, errors };
  }

  async setPhoto(user: AuthUser, id: string, key: string) {
    const existing = await this.prisma.resident.findFirst({ where: { id, orgId: user.orgId } });
    if (!existing) throw ApiError.notFound("Resident");
    await this.prisma.resident.update({ where: { id }, data: { photoKey: key } });
    return this.get(user, id);
  }

  async setIdDoc(user: AuthUser, id: string, key: string) {
    const existing = await this.prisma.resident.findFirst({ where: { id, orgId: user.orgId } });
    if (!existing) throw ApiError.notFound("Resident");
    await this.prisma.resident.update({ where: { id }, data: { idDocKey: key } });
    return this.get(user, id);
  }

  // ---------- caps & validation ----------

  private async validateAdmission(
    orgId: string,
    data: Record<string, unknown> | undefined,
    opts: { partial?: boolean } = {},
  ): Promise<void> {
    if (!data) return;
    const fields = await this.prisma.admissionFieldDefinition.findMany({ where: { orgId } });
    validateAdmissionData(fields, data, opts);
  }

  /**
   * Business rule 2. Over a cap: the first check-in starts the 5-day grace
   * window and is allowed; once the window is older than 5 days, block with
   * RESIDENT_CAP_EXCEEDED.
   */
  private async enforceResidentCaps(orgId: string): Promise<void> {
    const org = await this.prisma.organization.findUniqueOrThrow({ where: { id: orgId } });
    const [activeCount, lifetimeCount] = await this.prisma.$transaction([
      this.prisma.resident.count({ where: { orgId, status: { not: "alumni" } } }),
      this.prisma.resident.count({ where: { orgId } }),
    ]);

    await this.checkCap(orgId, "active", activeCount, ACTIVE_RESIDENT_CAP, org.graceActiveStartedAt, "graceActiveStartedAt");
    await this.checkCap(orgId, "lifetime", lifetimeCount, LIFETIME_RESIDENT_CAP, org.graceLifetimeStartedAt, "graceLifetimeStartedAt");
  }

  private async checkCap(
    orgId: string,
    type: "active" | "lifetime",
    count: number,
    cap: number,
    graceStartedAt: Date | null,
    graceField: "graceActiveStartedAt" | "graceLifetimeStartedAt",
  ): Promise<void> {
    if (count < cap) return;
    if (!graceStartedAt) {
      await this.prisma.organization.update({
        where: { id: orgId },
        data: { [graceField]: new Date() },
      });
      return; // grace window just started — allow this check-in
    }
    const ageMs = Date.now() - graceStartedAt.getTime();
    if (ageMs > GRACE_DAYS * 24 * 60 * 60 * 1000) {
      throw new ApiError(
        HttpStatus.UNPROCESSABLE_ENTITY,
        "RESIDENT_CAP_EXCEEDED",
        type === "active"
          ? `Your Basic plan supports up to ${cap} active residents.`
          : `Your Basic plan supports up to ${cap} residents in total.`,
        { type, limit: cap },
      );
    }
  }

  private async resetGraceIfUnderCap(orgId: string): Promise<void> {
    const [activeCount, lifetimeCount] = await this.prisma.$transaction([
      this.prisma.resident.count({ where: { orgId, status: { not: "alumni" } } }),
      this.prisma.resident.count({ where: { orgId } }),
    ]);
    const data: Prisma.OrganizationUpdateInput = {};
    if (activeCount < ACTIVE_RESIDENT_CAP) data.graceActiveStartedAt = null;
    if (lifetimeCount < LIFETIME_RESIDENT_CAP) data.graceLifetimeStartedAt = null;
    if (Object.keys(data).length > 0) {
      await this.prisma.organization.update({ where: { id: orgId }, data });
    }
  }
}
