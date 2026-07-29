import { HttpStatus, Inject, Injectable } from "@nestjs/common";
import { Prisma, RoomType } from "@prisma/client";
import { AuditService } from "../audit/audit.service";
import { ApiError } from "../common/api-error";
import type { AuthUser } from "../common/auth-user";
import { pageArgs, paginated, type Paginated } from "../common/pagination";
import { PrismaService } from "../prisma/prisma.service";
import type {
  BulkAddRoomsDto,
  CreateRoomDto,
  RoomListParamsDto,
  RoomTransferDto,
  UpdateRoomFeeDto,
} from "./dto";

type RoomWithBeds = Prisma.RoomGetPayload<{
  include: { beds: { include: { resident: { select: { name: true } } } } };
}>;

const ROOM_INCLUDE = {
  beds: {
    include: { resident: { select: { name: true } } },
    orderBy: { label: "asc" as const },
  },
} satisfies Prisma.RoomInclude;

/** Frontend `Room` shape, beds inline with occupant names. */
export function toRoomDto(room: RoomWithBeds) {
  const beds = room.beds.map((b) => ({
    id: b.id,
    roomId: b.roomId,
    label: b.label,
    status: b.status,
    residentId: b.residentId ?? undefined,
    residentName: b.resident?.name,
  }));
  return {
    id: room.id,
    number: room.number,
    floor: room.floor,
    type: room.type,
    capacity: room.capacity,
    monthlyRentPaisa: room.monthlyRentPaisa,
    feeMode: room.feeMode,
    fixedFeeAmountPaisa: room.fixedFeeAmountPaisa,
    beds,
    occupiedCount: beds.filter((b) => b.status === "occupied").length,
    notes: room.notes ?? undefined,
  };
}

@Injectable()
export class RoomsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

  async list(user: AuthUser, params: RoomListParamsDto): Promise<Paginated<unknown>> {
    const where: Prisma.RoomWhereInput = { orgId: user.orgId };
    if (params.floor != null) where.floor = params.floor;
    if (params.type && params.type !== "all") where.type = params.type as RoomType;
    if (params.search) {
      where.OR = [
        { number: { contains: params.search, mode: "insensitive" } },
        {
          beds: {
            some: {
              resident: { is: { name: { contains: params.search, mode: "insensitive" } } },
            },
          },
        },
      ];
    }

    const { page, pageSize, skip, take } = pageArgs(params, 20);
    const orderBy: Prisma.RoomOrderByWithRelationInput =
      params.sortBy === "floor"
        ? { floor: params.sortDir ?? "asc" }
        : { number: params.sortDir ?? "asc" };

    const [rooms, total] = await this.prisma.$transaction([
      this.prisma.room.findMany({ where, include: ROOM_INCLUDE, orderBy, skip, take }),
      this.prisma.room.count({ where }),
    ]);
    return paginated(rooms.map(toRoomDto), total, page, pageSize);
  }

  async listAll(user: AuthUser) {
    const rooms = await this.prisma.room.findMany({
      where: { orgId: user.orgId },
      include: ROOM_INCLUDE,
      orderBy: { number: "asc" },
    });
    return rooms.map(toRoomDto);
  }

  async create(user: AuthUser, dto: CreateRoomDto) {
    const hostel = await this.prisma.hostel.findFirst({ where: { orgId: user.orgId } });
    if (!hostel) throw ApiError.badRequest("Organization has no hostel configured");

    const dupe = await this.prisma.room.findFirst({
      where: { orgId: user.orgId, number: { equals: dto.number, mode: "insensitive" } },
    });
    if (dupe) {
      throw new ApiError(HttpStatus.CONFLICT, "ROOM_EXISTS", `${dto.number} already exists`);
    }

    const fixedFee = dto.feeMode === "fixed" ? (dto.fixedFeeAmountPaisa ?? 0) : null;
    const room = await this.prisma.room.create({
      data: {
        orgId: user.orgId,
        hostelId: hostel.id,
        number: dto.number,
        floor: dto.floor,
        type: dto.type,
        capacity: dto.capacity,
        feeMode: dto.feeMode,
        fixedFeeAmountPaisa: fixedFee,
        monthlyRentPaisa: fixedFee ?? 0,
        notes: dto.notes,
        beds: {
          create: Array.from({ length: dto.capacity }, (_, i) => ({
            orgId: user.orgId,
            label: String.fromCharCode(65 + i),
          })),
        },
      },
      include: ROOM_INCLUDE,
    });

    await this.audit.log(user, {
      action: "created_room",
      entityType: "room",
      entityId: room.id,
      entityLabel: room.number,
      details: { floor: dto.floor, type: dto.type, capacity: dto.capacity, feeMode: dto.feeMode },
    });
    return toRoomDto(room);
  }

  async bulkAdd(user: AuthUser, dto: BulkAddRoomsDto) {
    const hostel = await this.prisma.hostel.findFirst({ where: { orgId: user.orgId } });
    if (!hostel) throw ApiError.badRequest("Organization has no hostel configured");

    const fixedFee = dto.feeMode === "fixed" ? (dto.fixedFeeAmountPaisa ?? 0) : null;
    let created = 0;
    for (let i = 0; i < dto.count; i++) {
      const number = `Room ${dto.startNumber + i}`;
      const exists = await this.prisma.room.findFirst({
        where: { orgId: user.orgId, number },
      });
      if (exists) continue;
      await this.prisma.room.create({
        data: {
          orgId: user.orgId,
          hostelId: hostel.id,
          number,
          floor: dto.floor,
          type: dto.type,
          capacity: dto.capacity,
          feeMode: dto.feeMode,
          fixedFeeAmountPaisa: fixedFee,
          monthlyRentPaisa: fixedFee ?? 0,
          beds: {
            create: Array.from({ length: dto.capacity }, (_, b) => ({
              orgId: user.orgId,
              label: String.fromCharCode(65 + b),
            })),
          },
        },
      });
      created++;
    }

    await this.audit.log(user, {
      action: "bulk_added_rooms",
      entityType: "room",
      entityId: "bulk",
      entityLabel: `Floor ${dto.floor}: ${created} rooms`,
      details: { ...dto, created },
    });
    return { created };
  }

  /**
   * PUT /rooms/:id/fee-settings — owner only. Switching to fixed moves every
   * current occupant of the room onto the fixed fee (pilot behavior).
   */
  async updateFeeSettings(user: AuthUser, roomId: string, dto: UpdateRoomFeeDto) {
    const room = await this.prisma.room.findFirst({
      where: { id: roomId, orgId: user.orgId },
    });
    if (!room) throw ApiError.notFound("Room");

    const fixedFee = dto.feeMode === "fixed" ? (dto.fixedFeeAmountPaisa ?? 0) : null;
    const updated = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.room.update({
        where: { id: room.id },
        data: {
          feeMode: dto.feeMode,
          fixedFeeAmountPaisa: fixedFee,
          ...(fixedFee != null ? { monthlyRentPaisa: fixedFee } : {}),
        },
        include: ROOM_INCLUDE,
      });
      if (fixedFee != null) {
        await tx.resident.updateMany({
          where: { roomId: room.id, orgId: user.orgId },
          data: { monthlyFeePaisa: fixedFee },
        });
      }
      await this.audit.log(
        user,
        {
          action: "updated_room_fee_settings",
          entityType: "room",
          entityId: room.id,
          entityLabel: room.number,
          details: {
            from: { feeMode: room.feeMode, fixedFeeAmountPaisa: room.fixedFeeAmountPaisa },
            to: { feeMode: dto.feeMode, fixedFeeAmountPaisa: fixedFee },
          },
        },
        tx,
      );
      return updated;
    });
    return toRoomDto(updated);
  }

  async transfer(user: AuthUser, dto: RoomTransferDto) {
    await this.prisma.$transaction(async (tx) => {
      const resident = await tx.resident.findFirst({
        where: { id: dto.residentId, orgId: user.orgId },
        include: { bed: true, room: true },
      });
      if (!resident) throw ApiError.notFound("Resident");

      const toBed = await tx.bed.findFirst({
        where: { id: dto.toBedId, roomId: dto.toRoomId, orgId: user.orgId },
        include: { room: true },
      });
      if (!toBed) throw ApiError.notFound("Target bed");
      if (toBed.status === "occupied") {
        throw new ApiError(
          HttpStatus.CONFLICT,
          "BED_OCCUPIED",
          `Bed ${toBed.label} is already occupied`,
        );
      }

      if (resident.bed) {
        await tx.bed.update({
          where: { id: resident.bed.id },
          data: { status: "vacant", residentId: null },
        });
      }
      await tx.bed.update({
        where: { id: toBed.id },
        data: { status: "occupied", residentId: resident.id },
      });

      // Fixed-fee rooms lock the resident's fee to the room amount.
      const toRoom = toBed.room;
      const newFee =
        toRoom.feeMode === "fixed" && toRoom.fixedFeeAmountPaisa != null
          ? toRoom.fixedFeeAmountPaisa
          : toRoom.monthlyRentPaisa > 0
            ? toRoom.monthlyRentPaisa
            : resident.monthlyFeePaisa;
      await tx.resident.update({
        where: { id: resident.id },
        data: { roomId: toRoom.id, monthlyFeePaisa: newFee },
      });

      await this.audit.log(
        user,
        {
          action: "transferred_resident",
          entityType: "resident",
          entityId: resident.id,
          entityLabel: resident.name,
          details: {
            fromRoom: resident.room?.number ?? null,
            toRoom: toRoom.number,
            toBed: toBed.label,
            effectiveDate: dto.effectiveDate,
            reason: dto.reason ?? null,
          },
        },
        tx,
      );
    });
    return { ok: true };
  }

  async remove(user: AuthUser, roomId: string) {
    const room = await this.prisma.room.findFirst({
      where: { id: roomId, orgId: user.orgId },
      include: { beds: true },
    });
    if (!room) throw ApiError.notFound("Room");
    if (room.beds.some((b) => b.status === "occupied")) {
      throw new ApiError(
        HttpStatus.CONFLICT,
        "ROOM_OCCUPIED",
        "Move residents out before deleting this room",
      );
    }
    await this.prisma.room.delete({ where: { id: room.id } });
    await this.audit.log(user, {
      action: "deleted_room",
      entityType: "room",
      entityId: room.id,
      entityLabel: room.number,
    });
    return { ok: true };
  }
}
