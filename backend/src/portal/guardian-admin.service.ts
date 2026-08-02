import { HttpStatus, Inject, Injectable } from "@nestjs/common";
import { PortalInviteKind } from "@prisma/client";
import { createHash, randomBytes } from "crypto";
import { AuditService } from "../audit/audit.service";
import { ApiError } from "../common/api-error";
import type { AuthUser } from "../common/auth-user";
import { PrismaService } from "../prisma/prisma.service";
import type { CreateInviteDto, LinkGuardianDto } from "./dto";

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Owner/staff-side management of the portal trust boundary: issuing invites,
 * viewing which guardians are linked to a resident, and linking/unlinking
 * existing guardians (the safe path for siblings — a new guardian invite can
 * never attach to an existing guardian account). Every method is org-scoped.
 */
@Injectable()
export class GuardianAdminService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

  private async requireResident(orgId: string, residentId: string) {
    const r = await this.prisma.resident.findFirst({ where: { id: residentId, orgId } });
    if (!r) throw ApiError.notFound("Resident");
    return r;
  }

  /** Create a one-time invite tied to a resident. Returns the raw token ONCE. */
  async createInvite(user: AuthUser, residentId: string, dto: CreateInviteDto) {
    const resident = await this.requireResident(user.orgId, residentId);

    if (dto.kind === PortalInviteKind.resident && resident.passwordHash) {
      throw new ApiError(HttpStatus.CONFLICT, "PORTAL_ALREADY_ENABLED", "This resident already has portal access");
    }

    const rawToken = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + INVITE_TTL_MS);
    await this.prisma.portalInvite.create({
      data: {
        orgId: user.orgId,
        kind: dto.kind,
        residentId,
        phone: dto.phone,
        tokenHash: hashToken(rawToken),
        expiresAt,
        createdByUserId: user.userId,
        createdByName: user.name,
      },
    });
    await this.audit.log(user, {
      action: "created_portal_invite",
      entityType: "resident",
      entityId: residentId,
      entityLabel: resident.name,
      details: { kind: dto.kind },
    });

    const appUrl = process.env.APP_URL ?? "https://app.saahvik.com";
    return {
      kind: dto.kind,
      // Raw token returned exactly once — only its hash is stored.
      token: rawToken,
      link: `${appUrl}/portal/accept-invite?token=${rawToken}`,
      expiresAt: expiresAt.toISOString(),
    };
  }

  async listResidentGuardians(user: AuthUser, residentId: string) {
    await this.requireResident(user.orgId, residentId);
    const links = await this.prisma.guardianResident.findMany({
      where: { orgId: user.orgId, residentId },
      include: { guardian: true },
    });
    return links.map((l) => ({
      id: l.guardian.id,
      name: l.guardian.name,
      phone: l.guardian.phone,
      email: l.guardian.email ?? undefined,
      linkedAt: l.createdAt.toISOString(),
    }));
  }

  async portalStatus(user: AuthUser, residentId: string) {
    const resident = await this.requireResident(user.orgId, residentId);
    const guardianCount = await this.prisma.guardianResident.count({
      where: { orgId: user.orgId, residentId },
    });
    return { residentLoginEnabled: resident.passwordHash !== null, guardianCount };
  }

  async linkGuardian(user: AuthUser, guardianId: string, dto: LinkGuardianDto) {
    const guardian = await this.prisma.guardian.findFirst({
      where: { id: guardianId, orgId: user.orgId },
    });
    if (!guardian) throw ApiError.notFound("Guardian");
    const resident = await this.requireResident(user.orgId, dto.residentId);

    const existing = await this.prisma.guardianResident.findUnique({
      where: { guardianId_residentId: { guardianId, residentId: dto.residentId } },
    });
    if (existing) throw new ApiError(HttpStatus.CONFLICT, "ALREADY_LINKED", "This guardian is already linked to this resident");

    await this.prisma.guardianResident.create({
      data: { orgId: user.orgId, guardianId, residentId: dto.residentId },
    });
    await this.audit.log(user, {
      action: "linked_guardian",
      entityType: "guardian",
      entityId: guardianId,
      entityLabel: guardian.name,
      details: { residentId: dto.residentId, residentName: resident.name },
    });
    return { ok: true };
  }

  async unlinkGuardian(user: AuthUser, guardianId: string, residentId: string) {
    const link = await this.prisma.guardianResident.findFirst({
      where: { orgId: user.orgId, guardianId, residentId },
    });
    if (!link) throw ApiError.notFound("Guardian link");
    await this.prisma.guardianResident.delete({ where: { id: link.id } });
    await this.audit.log(user, {
      action: "unlinked_guardian",
      entityType: "guardian",
      entityId: guardianId,
      entityLabel: guardianId,
      details: { residentId },
    });
    return { ok: true };
  }
}

function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}
