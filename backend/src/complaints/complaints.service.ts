import { Inject, Injectable } from "@nestjs/common";
import { ComplaintCategory, ComplaintStatus, Prisma } from "@prisma/client";
import { AuditService } from "../audit/audit.service";
import { ApiError } from "../common/api-error";
import type { AuthUser } from "../common/auth-user";
import { pageArgs, paginated, type Paginated } from "../common/pagination";
import { SequenceService } from "../common/sequence.service";
import { fileUrl } from "../files/files.service";
import { NotificationsService } from "../notifications/notifications.service";
import { PrismaService } from "../prisma/prisma.service";
import type { ComplaintListParamsDto, CreateComplaintDto, UpdateComplaintDto } from "./dto";

type ComplaintFull = Prisma.ComplaintGetPayload<{
  include: {
    resident: { select: { name: true; room: { select: { number: true } } } };
    timeline: true;
    attachments: true;
  };
}>;

const COMPLAINT_INCLUDE = {
  resident: { select: { name: true, room: { select: { number: true } } } },
  timeline: { orderBy: { at: "asc" as const } },
  attachments: true,
} satisfies Prisma.ComplaintInclude;

function toComplaintDto(c: ComplaintFull) {
  return {
    id: c.id,
    ticketNo: c.ticketNo,
    title: c.title,
    description: c.description,
    category: c.category,
    priority: c.priority,
    status: c.status,
    residentId: c.residentId ?? undefined,
    residentName: c.resident?.name,
    roomNumber: c.resident?.room?.number,
    assignedToStaffId: c.assignedToStaffId ?? undefined,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
    timeline: c.timeline.map((e) => ({
      id: e.id,
      status: e.status,
      note: e.note ?? undefined,
      byName: e.byName,
      at: e.at.toISOString(),
    })),
    attachments: c.attachments.map((a) => ({
      id: a.id,
      fileName: a.fileName,
      fileType: a.fileType,
      url: a.fileKey ? fileUrl(a.fileKey) : "",
    })),
  };
}

@Injectable()
export class ComplaintsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly audit: AuditService,
    @Inject(SequenceService) private readonly sequence: SequenceService,
    @Inject(NotificationsService) private readonly notifications: NotificationsService,
  ) {}

  async list(user: AuthUser, params: ComplaintListParamsDto): Promise<Paginated<unknown>> {
    const where: Prisma.ComplaintWhereInput = { orgId: user.orgId };
    if (params.status && params.status !== "all") where.status = params.status as ComplaintStatus;
    if (params.category && params.category !== "all") {
      where.category = params.category as ComplaintCategory;
    }
    if (params.search) {
      where.OR = [
        { title: { contains: params.search, mode: "insensitive" } },
        { ticketNo: { contains: params.search, mode: "insensitive" } },
        { resident: { is: { name: { contains: params.search, mode: "insensitive" } } } },
      ];
    }

    const { page, pageSize, skip, take } = pageArgs(params, 10);
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.complaint.findMany({
        where,
        include: COMPLAINT_INCLUDE,
        orderBy: { createdAt: params.sortDir ?? "desc" },
        skip,
        take,
      }),
      this.prisma.complaint.count({ where }),
    ]);
    return paginated(rows.map(toComplaintDto), total, page, pageSize);
  }

  async get(user: AuthUser, id: string) {
    const c = await this.prisma.complaint.findFirst({
      where: { id, orgId: user.orgId },
      include: COMPLAINT_INCLUDE,
    });
    if (!c) throw ApiError.notFound("Complaint");
    return toComplaintDto(c);
  }

  async create(user: AuthUser, dto: CreateComplaintDto) {
    const hostel = await this.prisma.hostel.findFirst({ where: { orgId: user.orgId } });
    if (!hostel) throw ApiError.badRequest("Organization has no hostel configured");

    if (dto.residentId) {
      const resident = await this.prisma.resident.findFirst({
        where: { id: dto.residentId, orgId: user.orgId },
      });
      if (!resident) throw ApiError.notFound("Resident");
    }

    const complaint = await this.prisma.$transaction(async (tx) => {
      const seq = await this.sequence.next(tx, user.orgId, "complaint", 0);
      const complaint = await tx.complaint.create({
        data: {
          orgId: user.orgId,
          hostelId: hostel.id,
          ticketNo: this.sequence.formatTicketNo(seq),
          title: dto.title,
          description: dto.description,
          category: dto.category,
          priority: dto.priority,
          residentId: dto.residentId,
          timeline: {
            create: { status: "open", note: "Complaint registered", byName: user.name },
          },
          attachments: {
            create: (dto.attachments ?? []).map((a) => ({
              fileName: a.fileName,
              fileType: a.fileType,
              fileKey: a.key,
            })),
          },
        },
        include: COMPLAINT_INCLUDE,
      });
      await this.audit.log(
        user,
        {
          action: "created_complaint",
          entityType: "complaint",
          entityId: complaint.id,
          entityLabel: complaint.ticketNo,
          details: { title: dto.title, category: dto.category, priority: dto.priority },
        },
        tx,
      );
      return complaint;
    });

    await this.notifications.notifyOrg(user.orgId, {
      kind: "complaint",
      prefKey: "newComplaint",
      title: "New complaint",
      body: `${complaint.ticketNo}: ${complaint.title}`,
      link: `/complaints/${complaint.id}`,
      excludeUserId: user.userId,
    });
    return toComplaintDto(complaint);
  }

  async update(user: AuthUser, id: string, dto: UpdateComplaintDto) {
    const existing = await this.prisma.complaint.findFirst({
      where: { id, orgId: user.orgId },
    });
    if (!existing) throw ApiError.notFound("Complaint");

    if (dto.assignedToStaffId) {
      const staff = await this.prisma.staff.findFirst({
        where: { id: dto.assignedToStaffId, orgId: user.orgId, status: "active" },
      });
      if (!staff) throw ApiError.notFound("Staff member");
    }

    const statusChanged = dto.status != null && dto.status !== existing.status;
    const updated = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.complaint.update({
        where: { id: existing.id },
        data: {
          status: dto.status,
          assignedToStaffId: dto.assignedToStaffId,
          ...(statusChanged
            ? {
                timeline: {
                  create: { status: dto.status!, note: dto.note, byName: user.name },
                },
              }
            : {}),
        },
        include: COMPLAINT_INCLUDE,
      });
      await this.audit.log(
        user,
        {
          action: "updated_complaint",
          entityType: "complaint",
          entityId: updated.id,
          entityLabel: updated.ticketNo,
          details: {
            from: { status: existing.status, assignedToStaffId: existing.assignedToStaffId },
            to: { status: updated.status, assignedToStaffId: updated.assignedToStaffId },
            note: dto.note ?? null,
          },
        },
        tx,
      );
      return updated;
    });

    if (statusChanged) {
      await this.notifications.notifyOrg(user.orgId, {
        kind: "complaint",
        prefKey: updated.status === "resolved" ? "complaintResolved" : "newComplaint",
        title: `Complaint ${updated.status.replace("_", " ")}`,
        body: `${updated.ticketNo}: ${updated.title}`,
        link: `/complaints/${updated.id}`,
        excludeUserId: user.userId,
      });
    }
    return toComplaintDto(updated);
  }
}
