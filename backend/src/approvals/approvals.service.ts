import { HttpStatus, Inject, Injectable } from "@nestjs/common";
import { ApprovalStatus, ApprovalType, Prisma } from "@prisma/client";
import { AuditService } from "../audit/audit.service";
import { ApiError } from "../common/api-error";
import type { AuthUser } from "../common/auth-user";
import { pageArgs, paginated, type Paginated } from "../common/pagination";
import { PrismaService } from "../prisma/prisma.service";
import type { ApprovalListParamsDto, CreateApprovalDto, DecideApprovalDto } from "./dto";

type ApprovalRow = Prisma.ApprovalRequestGetPayload<Record<string, never>>;

/**
 * Feature 18 — basic, single-step owner sign-off. Intentionally NOT a generic
 * workflow engine.
 *
 * IMPORTANT boundary: approving/rejecting only records the decision and flips
 * status. This module does NOT execute the underlying action described by the
 * request — `payload` is an opaque snapshot and running it is the concern of
 * whichever caller feature raised the request.
 */
@Injectable()
export class ApprovalsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

  toApprovalDto(a: ApprovalRow) {
    return {
      id: a.id,
      type: a.type,
      status: a.status,
      requestedByUserId: a.requestedByUserId,
      requestedByName: a.requestedByName,
      entityType: a.entityType,
      entityId: a.entityId ?? undefined,
      summary: a.summary,
      payload: a.payload ?? undefined,
      decidedByUserId: a.decidedByUserId ?? undefined,
      decidedByName: a.decidedByName ?? undefined,
      decisionNote: a.decisionNote ?? undefined,
      decidedAt: a.decidedAt ? a.decidedAt.toISOString() : undefined,
      createdAt: a.createdAt.toISOString(),
      updatedAt: a.updatedAt.toISOString(),
    };
  }

  async list(user: AuthUser, params: ApprovalListParamsDto): Promise<Paginated<unknown>> {
    const where: Prisma.ApprovalRequestWhereInput = { orgId: user.orgId };
    if (params.status && params.status !== "all") {
      where.status = params.status as ApprovalStatus;
    }
    if (params.type) where.type = params.type as ApprovalType;

    const { page, pageSize, skip, take } = pageArgs(params, 20);
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.approvalRequest.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take,
      }),
      this.prisma.approvalRequest.count({ where }),
    ]);
    return paginated(rows.map((r) => this.toApprovalDto(r)), total, page, pageSize);
  }

  async get(user: AuthUser, id: string) {
    const request = await this.prisma.approvalRequest.findFirst({
      where: { id, orgId: user.orgId },
    });
    if (!request) throw ApiError.notFound("Approval request");
    return this.toApprovalDto(request);
  }

  async create(user: AuthUser, dto: CreateApprovalDto) {
    const request = await this.prisma.approvalRequest.create({
      data: {
        orgId: user.orgId,
        type: dto.type,
        status: "pending",
        requestedByUserId: user.userId,
        requestedByName: user.name,
        entityType: dto.entityType,
        entityId: dto.entityId,
        summary: dto.summary,
        payload: (dto.payload ?? undefined) as Prisma.InputJsonValue | undefined,
      },
    });

    await this.audit.log(user, {
      action: "raised_approval_request",
      entityType: "approval_request",
      entityId: request.id,
      entityLabel: request.summary,
      details: { type: request.type, entityType: request.entityType },
    });
    return this.toApprovalDto(request);
  }

  /**
   * Owner-only decision. The route is guarded by @Roles("owner"), but we also
   * assert defensively here so the service can never record a non-owner
   * decision regardless of how it's called.
   */
  async decide(user: AuthUser, id: string, approve: boolean, dto: DecideApprovalDto) {
    if (user.role !== "owner") {
      throw new ApiError(HttpStatus.FORBIDDEN, "FORBIDDEN", "Only an owner can decide approvals");
    }

    const request = await this.prisma.approvalRequest.findFirst({
      where: { id, orgId: user.orgId },
    });
    if (!request) throw ApiError.notFound("Approval request");
    if (request.status !== "pending") {
      throw new ApiError(
        HttpStatus.CONFLICT,
        "ALREADY_DECIDED",
        "This request has already been decided",
      );
    }

    const status: ApprovalStatus = approve ? "approved" : "rejected";
    const updated = await this.prisma.approvalRequest.update({
      where: { id: request.id },
      data: {
        status,
        decidedByUserId: user.userId,
        decidedByName: user.name,
        decisionNote: dto.decisionNote,
        decidedAt: new Date(),
      },
    });

    await this.audit.log(user, {
      action: approve ? "approved_request" : "rejected_request",
      entityType: "approval_request",
      entityId: updated.id,
      entityLabel: updated.summary,
      details: { type: updated.type, decisionNote: dto.decisionNote ?? null },
    });
    return this.toApprovalDto(updated);
  }
}
