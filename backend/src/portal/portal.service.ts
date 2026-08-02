import { Inject, Injectable } from "@nestjs/common";
import { ComplaintPriority, Prisma } from "@prisma/client";
import type { AuthUser } from "../common/auth-user";
import { effectiveDues } from "../common/dues";
import { assertResidentAccess, resolvePortalResidentIds } from "../common/portal-scope";
import { ComplaintsService } from "../complaints/complaints.service";
import { fileUrl } from "../files/files.service";
import { toPaymentDto } from "../finance/payments.service";
import { PrismaService } from "../prisma/prisma.service";
import type { CreatePortalComplaintDto } from "./dto";

const RESIDENT_SELF_INCLUDE = {
  room: { select: { number: true, floor: true } },
  bed: { select: { label: true } },
} satisfies Prisma.ResidentInclude;

type ResidentSelf = Prisma.ResidentGetPayload<{ include: typeof RESIDENT_SELF_INCLUDE }>;

/**
 * Self-service read/act surface for portal subjects (resident + guardian).
 * DELIBERATELY MINIMAL — it is not a parallel copy of the staff API. Every
 * method resolves the target resident from the authenticated subject via
 * assertResidentAccess(); a residentId in the URL is never trusted until it
 * passes that check. Read-only for anything financial; the only write is
 * filing a complaint (scoped to the subject's own resident).
 */
@Injectable()
export class PortalService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(ComplaintsService) private readonly complaints: ComplaintsService,
  ) {}

  // ---------- profile ----------

  async me(user: AuthUser) {
    if (user.role === "resident") {
      const resident = await this.getResidentSelf(user.userId);
      return { role: "resident" as const, resident };
    }
    // guardian
    const guardian = await this.prisma.guardian.findUnique({ where: { id: user.userId } });
    const residentIds = await resolvePortalResidentIds(this.prisma, user);
    const residents = await Promise.all(residentIds.map((id) => this.getResidentSelf(id)));
    return {
      role: "guardian" as const,
      guardian: guardian
        ? { id: guardian.id, name: guardian.name, phone: guardian.phone, email: guardian.email ?? undefined }
        : undefined,
      residents,
    };
  }

  async residentProfile(user: AuthUser, residentId: string) {
    await assertResidentAccess(this.prisma, user, residentId);
    return this.getResidentSelf(residentId);
  }

  // ---------- dues + payment history (read-only) ----------

  async dues(user: AuthUser, residentId: string) {
    await assertResidentAccess(this.prisma, user, residentId);
    const resident = await this.prisma.resident.findUniqueOrThrow({
      where: { id: residentId },
      select: { monthlyFeePaisa: true, duesPaisa: true, advanceBalancePaisa: true, depositPaisa: true },
    });
    const payments = await this.prisma.payment.findMany({
      where: { orgId: user.orgId, residentId },
      include: { resident: { select: { name: true, room: { select: { number: true } } } } },
      orderBy: { paidAt: "desc" },
      take: 100,
    });
    return {
      // effectiveDues() from common/dues.ts — the single source of dues math,
      // NOT reimplemented here.
      duesPaisa: effectiveDues(resident.duesPaisa, resident.advanceBalancePaisa),
      advanceBalancePaisa: resident.advanceBalancePaisa,
      monthlyFeePaisa: resident.monthlyFeePaisa,
      depositPaisa: resident.depositPaisa,
      payments: payments.map(toPaymentDto),
    };
  }

  // ---------- documents (read-only) ----------

  async documents(user: AuthUser, residentId: string) {
    await assertResidentAccess(this.prisma, user, residentId);
    const docs = await this.prisma.residentDocument.findMany({
      where: { orgId: user.orgId, residentId },
      orderBy: { uploadedAt: "desc" },
    });
    return docs.map((d) => ({
      id: d.id,
      category: d.category,
      fileUrl: fileUrl(d.fileKey),
      label: d.label ?? undefined,
      expiryDate: d.expiryDate?.toISOString(),
      uploadedAt: d.uploadedAt.toISOString(),
    }));
  }

  // ---------- complaints (list own + file) ----------

  async listComplaints(user: AuthUser, residentId: string) {
    await assertResidentAccess(this.prisma, user, residentId);
    const rows = await this.prisma.complaint.findMany({
      where: { orgId: user.orgId, residentId },
      include: { timeline: { orderBy: { at: "asc" } } },
      orderBy: { createdAt: "desc" },
    });
    return rows.map((c) => ({
      id: c.id,
      ticketNo: c.ticketNo,
      title: c.title,
      description: c.description,
      category: c.category,
      priority: c.priority,
      status: c.status,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
      timeline: c.timeline.map((e) => ({
        status: e.status,
        note: e.note ?? undefined,
        byName: e.byName,
        at: e.at.toISOString(),
      })),
    }));
  }

  async createComplaint(user: AuthUser, residentId: string, dto: CreatePortalComplaintDto) {
    await assertResidentAccess(this.prisma, user, residentId);
    // Reuse the existing ComplaintsService (ticket numbering, timeline, staff
    // notifications) — residentId is FORCED to the authorized one, never taken
    // from the client body.
    return this.complaints.create(
      { userId: user.userId, orgId: user.orgId, role: user.role, name: user.name },
      {
        title: dto.title,
        description: dto.description,
        category: dto.category,
        priority: dto.priority ?? ComplaintPriority.medium,
        residentId,
      },
    );
  }

  // ---------- helpers ----------

  private async getResidentSelf(residentId: string) {
    const r = await this.prisma.resident.findUniqueOrThrow({
      where: { id: residentId },
      include: RESIDENT_SELF_INCLUDE,
    });
    return toResidentSelfDto(r);
  }
}

/** The resident's own view — profile + assignment + medical + dues summary. */
function toResidentSelfDto(r: ResidentSelf) {
  return {
    id: r.id,
    name: r.name,
    phone: r.phone,
    email: r.email ?? undefined,
    status: r.status,
    photoUrl: r.photoKey ? fileUrl(r.photoKey) : undefined,
    room: r.room ? { number: r.room.number, floor: r.room.floor } : undefined,
    bedLabel: r.bed?.label,
    joinDate: r.joinDate.toISOString(),
    monthlyFeePaisa: r.monthlyFeePaisa,
    depositPaisa: r.depositPaisa,
    duesPaisa: effectiveDues(r.duesPaisa, r.advanceBalancePaisa),
    advanceBalancePaisa: r.advanceBalancePaisa,
    idDoc: {
      url: r.idDocKey ? fileUrl(r.idDocKey) : undefined,
      expiryDate: r.idDocExpiryDate?.toISOString(),
    },
    medical: {
      bloodGroup: r.bloodGroup ?? undefined,
      allergies: r.allergies ?? undefined,
      dietaryPreference: r.dietaryPreference ?? undefined,
      medicalNotes: r.medicalNotes ?? undefined,
      emergencyContactName: r.emergencyContactName ?? undefined,
      emergencyContactPhone: r.emergencyContactPhone ?? undefined,
    },
  };
}
