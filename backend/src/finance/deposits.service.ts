import { HttpStatus, Inject, Injectable } from "@nestjs/common";
import { DepositStatus, Prisma } from "@prisma/client";
import { AuditService } from "../audit/audit.service";
import { ApiError } from "../common/api-error";
import type { AuthUser } from "../common/auth-user";
import { pageArgs, paginated, type Paginated } from "../common/pagination";
import { PrismaService } from "../prisma/prisma.service";
import type { CreateDepositDto, DepositListParamsDto, ForfeitDepositDto, RefundDepositDto } from "./dto";

type DepositFull = Prisma.DepositGetPayload<{
  include: { resident: { select: { name: true; room: { select: { number: true } } } } };
}>;

const DEPOSIT_INCLUDE = {
  resident: { select: { name: true, room: { select: { number: true } } } },
} satisfies Prisma.DepositInclude;

function toDepositDto(d: DepositFull) {
  return {
    id: d.id,
    residentId: d.residentId,
    residentName: d.resident.name,
    roomNumber: d.resident.room?.number,
    amountPaisa: d.amountPaisa,
    refundedPaisa: d.refundedPaisa,
    status: d.status,
    collectedOn: d.collectedOn.toISOString(),
    updatedOn: d.updatedAt.toISOString(),
    notes: d.notes ?? undefined,
    history: d.history as unknown[],
  };
}

@Injectable()
export class DepositsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

  async list(user: AuthUser, params: DepositListParamsDto): Promise<Paginated<unknown>> {
    const where: Prisma.DepositWhereInput = { orgId: user.orgId };
    if (params.status && params.status !== "all") where.status = params.status as DepositStatus;
    if (params.search) {
      where.OR = [
        { resident: { is: { name: { contains: params.search, mode: "insensitive" } } } },
        { resident: { is: { room: { is: { number: { contains: params.search, mode: "insensitive" } } } } } },
      ];
    }
    const { page, pageSize, skip, take } = pageArgs(params, 10);
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.deposit.findMany({
        where,
        include: DEPOSIT_INCLUDE,
        orderBy: { collectedOn: params.sortDir ?? "desc" },
        skip,
        take,
      }),
      this.prisma.deposit.count({ where }),
    ]);
    return paginated(rows.map(toDepositDto), total, page, pageSize);
  }

  async create(user: AuthUser, dto: CreateDepositDto) {
    const resident = await this.prisma.resident.findFirst({
      where: { id: dto.residentId, orgId: user.orgId },
    });
    if (!resident) throw ApiError.notFound("Resident");

    const deposit = await this.prisma.$transaction(async (tx) => {
      const deposit = await tx.deposit.create({
        data: {
          orgId: user.orgId,
          residentId: resident.id,
          amountPaisa: dto.amountPaisa,
          notes: dto.notes,
          history: [
            historyEntry("collected", dto.amountPaisa, user.userId),
          ] as unknown as Prisma.InputJsonValue,
        },
        include: DEPOSIT_INCLUDE,
      });
      await tx.resident.update({
        where: { id: resident.id },
        data: { depositPaisa: { increment: dto.amountPaisa } },
      });
      await this.audit.log(
        user,
        {
          action: "collected_deposit",
          entityType: "deposit",
          entityId: deposit.id,
          entityLabel: resident.name,
          details: { amountPaisa: dto.amountPaisa },
        },
        tx,
      );
      return deposit;
    });
    return toDepositDto(deposit);
  }

  /** Partial refund when amountPaisa < remaining; full refund otherwise. */
  async refund(user: AuthUser, id: string, dto: RefundDepositDto) {
    const d = await this.mustGetOpen(user, id);
    const remaining = d.amountPaisa - d.refundedPaisa;
    const amount = dto.amountPaisa ?? remaining;
    if (amount <= 0 || amount > remaining) {
      throw new ApiError(
        HttpStatus.UNPROCESSABLE_ENTITY,
        "REFUND_EXCEEDS_REMAINING",
        "Invalid refund amount",
        { remainingPaisa: remaining },
      );
    }

    const refundedPaisa = d.refundedPaisa + amount;
    const updated = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.deposit.update({
        where: { id: d.id },
        data: {
          refundedPaisa,
          status: refundedPaisa >= d.amountPaisa ? "refunded" : "partially_refunded",
          notes: dto.reason ?? d.notes,
          history: appendHistory(d, historyEntry(
            refundedPaisa >= d.amountPaisa ? "full_refund" : "partial_refund",
            amount,
            user.userId,
            dto.reason,
          )),
        },
        include: DEPOSIT_INCLUDE,
      });
      await this.audit.log(
        user,
        {
          action: "refunded_deposit",
          entityType: "deposit",
          entityId: d.id,
          entityLabel: d.resident.name,
          details: { amountPaisa: amount, reason: dto.reason ?? null },
        },
        tx,
      );
      return updated;
    });
    return toDepositDto(updated);
  }

  async forfeit(user: AuthUser, id: string, dto: ForfeitDepositDto) {
    const d = await this.mustGetOpen(user, id);
    const updated = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.deposit.update({
        where: { id: d.id },
        data: {
          status: "forfeited",
          notes: dto.reason ?? d.notes,
          history: appendHistory(
            d,
            historyEntry("forfeited", d.amountPaisa - d.refundedPaisa, user.userId, dto.reason),
          ),
        },
        include: DEPOSIT_INCLUDE,
      });
      await this.audit.log(
        user,
        {
          action: "forfeited_deposit",
          entityType: "deposit",
          entityId: d.id,
          entityLabel: d.resident.name,
          details: { reason: dto.reason ?? null },
        },
        tx,
      );
      return updated;
    });
    return toDepositDto(updated);
  }

  private async mustGetOpen(user: AuthUser, id: string): Promise<DepositFull> {
    const d = await this.prisma.deposit.findFirst({
      where: { id, orgId: user.orgId },
      include: DEPOSIT_INCLUDE,
    });
    if (!d) throw ApiError.notFound("Deposit");
    if (d.status === "refunded" || d.status === "forfeited") {
      throw new ApiError(
        HttpStatus.CONFLICT,
        "DEPOSIT_SETTLED",
        "This deposit is already settled",
      );
    }
    return d;
  }
}

function historyEntry(action: string, amountPaisa: number, actorId: string, reason?: string) {
  return { action, amountPaisa, actorId, reason: reason ?? null, ts: new Date().toISOString() };
}

/** History is append-only — existing entries are never modified or removed. */
function appendHistory(d: DepositFull, entry: ReturnType<typeof historyEntry>): Prisma.InputJsonValue {
  const history = Array.isArray(d.history) ? (d.history as unknown[]) : [];
  return [...history, entry] as unknown as Prisma.InputJsonValue;
}
