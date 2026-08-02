import { HttpStatus, Inject, Injectable } from "@nestjs/common";
import { Prisma, ReservationStatus } from "@prisma/client";
import { AuditService } from "../audit/audit.service";
import { ApiError } from "../common/api-error";
import type { AuthUser } from "../common/auth-user";
import { pageArgs, paginated, type Paginated } from "../common/pagination";
import { PrismaService } from "../prisma/prisma.service";
import type {
  ConvertReservationDto,
  CreateReservationDto,
  ReservationListParamsDto,
  UpdateReservationDto,
} from "./dto";

/** status values that mean a reservation still holds intent on a bed/room. */
const ACTIVE_STATUSES: ReservationStatus[] = ["held", "confirmed"];

type ReservationWithRoom = Prisma.ReservationGetPayload<{
  include: { room: { select: { number: true } } };
}>;

const RESERVATION_INCLUDE = {
  room: { select: { number: true } },
} satisfies Prisma.ReservationInclude;

export function toReservationDto(r: ReservationWithRoom) {
  return {
    id: r.id,
    roomId: r.roomId,
    roomNumber: r.room?.number,
    bedId: r.bedId ?? undefined,
    residentName: r.residentName,
    residentPhone: r.residentPhone,
    residentId: r.residentId ?? undefined,
    status: r.status,
    expectedCheckIn: r.expectedCheckIn.toISOString(),
    holdUntil: r.holdUntil?.toISOString(),
    monthlyFeePaisa: r.monthlyFeePaisa,
    depositPaisa: r.depositPaisa,
    notes: r.notes ?? undefined,
    createdByName: r.createdByName,
    createdAt: r.createdAt.toISOString(),
  };
}

@Injectable()
export class ReservationsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

  async list(user: AuthUser, params: ReservationListParamsDto): Promise<Paginated<unknown>> {
    const where: Prisma.ReservationWhereInput = { orgId: user.orgId };
    if (params.status && params.status !== "all") {
      where.status = params.status as ReservationStatus;
    }
    if (params.roomId) where.roomId = params.roomId;
    if (params.search) {
      where.OR = [
        { residentName: { contains: params.search, mode: "insensitive" } },
        { residentPhone: { contains: params.search } },
        { room: { is: { number: { contains: params.search, mode: "insensitive" } } } },
      ];
    }

    const { page, pageSize, skip, take } = pageArgs(params, 20);
    const orderBy: Prisma.ReservationOrderByWithRelationInput =
      params.sortBy === "expectedCheckIn"
        ? { expectedCheckIn: params.sortDir ?? "asc" }
        : { createdAt: params.sortDir ?? "desc" };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.reservation.findMany({ where, include: RESERVATION_INCLUDE, orderBy, skip, take }),
      this.prisma.reservation.count({ where }),
    ]);
    return paginated(rows.map(toReservationDto), total, page, pageSize);
  }

  async get(user: AuthUser, id: string) {
    const r = await this.prisma.reservation.findFirst({
      where: { id, orgId: user.orgId },
      include: RESERVATION_INCLUDE,
    });
    if (!r) throw ApiError.notFound("Reservation");
    return toReservationDto(r);
  }

  async create(user: AuthUser, dto: CreateReservationDto) {
    const room = await this.prisma.room.findFirst({
      where: { id: dto.roomId, orgId: user.orgId },
      include: { beds: true },
    });
    if (!room) throw ApiError.notFound("Room");
    if (room.blocked) {
      throw new ApiError(HttpStatus.CONFLICT, "ROOM_BLOCKED", "Room is under maintenance hold");
    }

    if (dto.bedId) {
      const bed = room.beds.find((b) => b.id === dto.bedId);
      if (!bed) throw ApiError.notFound("Selected bed");
      if (bed.status === "occupied") {
        throw new ApiError(
          HttpStatus.CONFLICT,
          "BED_OCCUPIED",
          `Bed ${bed.label} is already occupied`,
        );
      }
      // An active reservation already targeting this exact bed collides.
      const existing = await this.prisma.reservation.findFirst({
        where: { orgId: user.orgId, bedId: dto.bedId, status: { in: ACTIVE_STATUSES } },
      });
      if (existing) {
        throw new ApiError(
          HttpStatus.CONFLICT,
          "BED_RESERVED",
          `Bed ${bed.label} already has an active reservation`,
        );
      }
    }

    const reservation = await this.prisma.reservation.create({
      data: {
        orgId: user.orgId,
        roomId: dto.roomId,
        bedId: dto.bedId ?? null,
        residentName: dto.residentName,
        residentPhone: dto.residentPhone,
        expectedCheckIn: new Date(dto.expectedCheckIn),
        holdUntil: dto.holdUntil ? new Date(dto.holdUntil) : null,
        monthlyFeePaisa: dto.monthlyFeePaisa ?? 0,
        depositPaisa: dto.depositPaisa ?? 0,
        notes: dto.notes,
        createdByName: user.name,
      },
      include: RESERVATION_INCLUDE,
    });

    await this.audit.log(user, {
      action: "created_reservation",
      entityType: "reservation",
      entityId: reservation.id,
      entityLabel: reservation.residentName,
      details: { roomId: dto.roomId, bedId: dto.bedId ?? null, expectedCheckIn: dto.expectedCheckIn },
    });
    return toReservationDto(reservation);
  }

  async update(user: AuthUser, id: string, dto: UpdateReservationDto) {
    const existing = await this.prisma.reservation.findFirst({
      where: { id, orgId: user.orgId },
    });
    if (!existing) throw ApiError.notFound("Reservation");
    if (!ACTIVE_STATUSES.includes(existing.status)) {
      throw ApiError.badRequest("Only held or confirmed reservations can be edited");
    }

    // Resolve the effective room + bed after applying the requested changes so
    // we can re-validate the bed the same way create() does.
    const targetRoomId = dto.roomId ?? existing.roomId;
    const targetBedId = dto.bedId !== undefined ? dto.bedId : existing.bedId;

    const room = await this.prisma.room.findFirst({
      where: { id: targetRoomId, orgId: user.orgId },
      include: { beds: true },
    });
    if (!room) throw ApiError.notFound("Room");
    if (room.blocked) {
      throw new ApiError(HttpStatus.CONFLICT, "ROOM_BLOCKED", "Room is under maintenance hold");
    }

    if (targetBedId) {
      const bed = room.beds.find((b) => b.id === targetBedId);
      if (!bed) throw ApiError.notFound("Selected bed");
      if (bed.status === "occupied") {
        throw new ApiError(
          HttpStatus.CONFLICT,
          "BED_OCCUPIED",
          `Bed ${bed.label} is already occupied`,
        );
      }
      const collision = await this.prisma.reservation.findFirst({
        where: {
          orgId: user.orgId,
          bedId: targetBedId,
          status: { in: ACTIVE_STATUSES },
          id: { not: existing.id },
        },
      });
      if (collision) {
        throw new ApiError(
          HttpStatus.CONFLICT,
          "BED_RESERVED",
          `Bed ${bed.label} already has an active reservation`,
        );
      }
    }

    const updated = await this.prisma.reservation.update({
      where: { id: existing.id },
      data: {
        ...(dto.roomId !== undefined ? { roomId: dto.roomId } : {}),
        ...(dto.bedId !== undefined ? { bedId: dto.bedId } : {}),
        ...(dto.residentName !== undefined ? { residentName: dto.residentName } : {}),
        ...(dto.residentPhone !== undefined ? { residentPhone: dto.residentPhone } : {}),
        ...(dto.expectedCheckIn !== undefined
          ? { expectedCheckIn: new Date(dto.expectedCheckIn) }
          : {}),
        ...(dto.holdUntil !== undefined
          ? { holdUntil: dto.holdUntil ? new Date(dto.holdUntil) : null }
          : {}),
        ...(dto.monthlyFeePaisa !== undefined ? { monthlyFeePaisa: dto.monthlyFeePaisa } : {}),
        ...(dto.depositPaisa !== undefined ? { depositPaisa: dto.depositPaisa } : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes || null } : {}),
      },
      include: RESERVATION_INCLUDE,
    });

    await this.audit.log(user, {
      action: "updated_reservation",
      entityType: "reservation",
      entityId: updated.id,
      entityLabel: updated.residentName,
    });
    return toReservationDto(updated);
  }

  async cancel(user: AuthUser, id: string) {
    const existing = await this.prisma.reservation.findFirst({
      where: { id, orgId: user.orgId },
    });
    if (!existing) throw ApiError.notFound("Reservation");
    if (existing.status === "converted") {
      throw ApiError.badRequest("A converted reservation cannot be cancelled");
    }

    const updated = await this.prisma.reservation.update({
      where: { id: existing.id },
      data: { status: "cancelled" },
      include: RESERVATION_INCLUDE,
    });

    await this.audit.log(user, {
      action: "cancelled_reservation",
      entityType: "reservation",
      entityId: updated.id,
      entityLabel: updated.residentName,
    });
    return toReservationDto(updated);
  }

  /**
   * THE ONLY place a reservation turns into an occupied bed. Creates the real
   * Resident, occupies the target bed, and links the reservation.
   *
   * NOTE: full admission-form handling (form-number sequencing, deposit-record
   * creation, resident caps) is intentionally deferred to a follow-up. Richer
   * conversion should call into ResidentsService, but we create the Resident row
   * directly here to avoid a circular dependency between the two modules.
   */
  async convert(user: AuthUser, id: string, dto: ConvertReservationDto) {
    const result = await this.prisma.$transaction(async (tx) => {
      const reservation = await tx.reservation.findFirst({
        where: { id, orgId: user.orgId },
      });
      if (!reservation) throw ApiError.notFound("Reservation");
      if (!ACTIVE_STATUSES.includes(reservation.status)) {
        throw ApiError.badRequest("Only held or confirmed reservations can be converted");
      }

      const bed = await tx.bed.findFirst({
        where: { id: dto.bedId, roomId: reservation.roomId, orgId: user.orgId },
      });
      if (!bed) throw ApiError.notFound("Selected bed");
      if (bed.status === "occupied") {
        throw new ApiError(
          HttpStatus.CONFLICT,
          "BED_OCCUPIED",
          `Bed ${bed.label} is already occupied`,
        );
      }

      // Guard the Resident @@unique([orgId, phone]) — a live resident already
      // holds this phone number.
      const dupeByPhone = await tx.resident.findFirst({
        where: { orgId: user.orgId, phone: reservation.residentPhone, status: { not: "alumni" } },
      });
      if (dupeByPhone) {
        throw new ApiError(
          HttpStatus.CONFLICT,
          "DUPLICATE_PHONE",
          `A resident with phone ${reservation.residentPhone} already exists (${dupeByPhone.name})`,
        );
      }

      const monthlyFeePaisa = dto.monthlyFeePaisa ?? reservation.monthlyFeePaisa;
      const depositPaisa = dto.depositPaisa ?? reservation.depositPaisa;

      const resident = await tx.resident.create({
        data: {
          orgId: user.orgId,
          name: reservation.residentName,
          phone: reservation.residentPhone,
          roomId: reservation.roomId,
          joinDate: new Date(dto.joinDate),
          monthlyFeePaisa,
          depositPaisa,
        },
      });

      await tx.bed.update({
        where: { id: bed.id },
        data: { status: "occupied", residentId: resident.id },
      });

      const updated = await tx.reservation.update({
        where: { id: reservation.id },
        data: { status: "converted", residentId: resident.id, bedId: bed.id },
        include: RESERVATION_INCLUDE,
      });

      await this.audit.log(
        user,
        {
          action: "converted_reservation",
          entityType: "reservation",
          entityId: updated.id,
          entityLabel: updated.residentName,
          details: { residentId: resident.id, bedId: bed.id, joinDate: dto.joinDate },
        },
        tx,
      );

      return { reservation: updated, residentId: resident.id };
    });

    return { ...toReservationDto(result.reservation), residentId: result.residentId };
  }

  /**
   * Optional housekeeping: flip held/confirmed reservations whose holdUntil has
   * passed to `expired`. Not wired to a cron here; safe to call ad hoc.
   */
  async expireOverdue(user: AuthUser) {
    const now = new Date();
    const { count } = await this.prisma.reservation.updateMany({
      where: {
        orgId: user.orgId,
        status: { in: ACTIVE_STATUSES },
        holdUntil: { not: null, lt: now },
      },
      data: { status: "expired" },
    });
    return { expired: count };
  }
}
