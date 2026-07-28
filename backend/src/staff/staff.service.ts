import { ConflictException, HttpStatus, Inject, Injectable } from "@nestjs/common";
import type { Staff, StaffRole, StaffStatus } from "@prisma/client";
import * as bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { AuditService } from "../audit/audit.service";
import { ApiError } from "../common/api-error";
import type { AuthUser } from "../common/auth-user";
import { PrismaService } from "../prisma/prisma.service";

/**
 * Basic plan: total logins per org (owners + active staff) hard-capped at 3.
 */
export const TOTAL_LOGIN_LIMIT = 3;

function toStaffMemberDto(s: Staff) {
  return {
    id: s.id,
    name: s.name,
    email: s.email,
    phone: s.phone ?? "",
    role: "staff" as const,
    staffRole: s.role,
    status: s.status,
    addedAt: s.createdAt.toISOString(),
    lastActiveAt: s.lastLoginAt?.toISOString(),
  };
}

@Injectable()
export class StaffService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

  /** Frontend `StaffList` shape — owners appear in the list with role "owner". */
  async list(user: AuthUser) {
    const [owners, staff] = await this.prisma.$transaction([
      this.prisma.owner.findMany({ where: { orgId: user.orgId }, orderBy: { createdAt: "asc" } }),
      this.prisma.staff.findMany({
        where: { orgId: user.orgId, status: "active" },
        orderBy: { createdAt: "asc" },
      }),
    ]);
    const members = [
      ...owners.map((o) => ({
        id: o.id,
        name: o.name,
        email: o.email,
        phone: o.phone ?? "",
        role: "owner" as const,
        addedAt: o.createdAt.toISOString(),
        lastActiveAt: undefined as string | undefined,
      })),
      ...staff.map(toStaffMemberDto),
    ];
    return { staff: members, limit: TOTAL_LOGIN_LIMIT, used: members.length };
  }

  async get(user: AuthUser, id: string) {
    const s = await this.prisma.staff.findFirst({ where: { id, orgId: user.orgId } });
    if (!s) throw ApiError.notFound("Staff member");
    return toStaffMemberDto(s);
  }

  async create(
    user: AuthUser,
    input: { name: string; email: string; phone?: string; role?: StaffRole; password?: string },
  ) {
    // Hard block at login #4: owners + active staff, counted server-side.
    const [ownerCount, staffCount] = await this.prisma.$transaction([
      this.prisma.owner.count({ where: { orgId: user.orgId } }),
      this.prisma.staff.count({ where: { orgId: user.orgId, status: "active" } }),
    ]);
    if (ownerCount + staffCount >= TOTAL_LOGIN_LIMIT) {
      throw new ApiError(
        HttpStatus.UNPROCESSABLE_ENTITY,
        "STAFF_CAP_EXCEEDED",
        `Your Basic plan allows ${TOTAL_LOGIN_LIMIT} members (owner + ${TOTAL_LOGIN_LIMIT - 1} staff). Upgrade to add more.`,
        { plan: "BASIC", limit: TOTAL_LOGIN_LIMIT },
      );
    }

    const emailTaken =
      (await this.prisma.staff.findFirst({
        where: { orgId: user.orgId, email: { equals: input.email, mode: "insensitive" } },
      })) ??
      (await this.prisma.owner.findFirst({
        where: { email: { equals: input.email, mode: "insensitive" } },
      }));
    if (emailTaken) throw new ConflictException("A member with this email already exists");

    // No password in the frontend's AddStaffInput — generate one and return it
    // exactly once so the owner can hand it to the staff member.
    const tempPassword = input.password ?? generateTempPassword();
    const staff = await this.prisma.staff.create({
      data: {
        orgId: user.orgId,
        name: input.name,
        email: input.email,
        phone: input.phone,
        passwordHash: await bcrypt.hash(tempPassword, 10),
        role: input.role ?? "manager",
      },
    });
    await this.prisma.notificationPreference.create({
      data: { orgId: user.orgId, userId: staff.id, userType: "staff" },
    });

    await this.audit.log(user, {
      action: "added_staff",
      entityType: "staff",
      entityId: staff.id,
      entityLabel: staff.name,
      details: { email: staff.email, role: staff.role },
    });
    return {
      ...toStaffMemberDto(staff),
      ...(input.password ? {} : { tempPassword }),
    };
  }

  async update(
    user: AuthUser,
    id: string,
    input: { name?: string; role?: StaffRole; status?: StaffStatus; phone?: string },
  ) {
    const existing = await this.prisma.staff.findFirst({ where: { id, orgId: user.orgId } });
    if (!existing) throw ApiError.notFound("Staff member");

    // Re-activating a deactivated member must respect the cap too.
    if (input.status === "active" && existing.status === "inactive") {
      const [ownerCount, staffCount] = await this.prisma.$transaction([
        this.prisma.owner.count({ where: { orgId: user.orgId } }),
        this.prisma.staff.count({ where: { orgId: user.orgId, status: "active" } }),
      ]);
      if (ownerCount + staffCount >= TOTAL_LOGIN_LIMIT) {
        throw new ApiError(
          HttpStatus.UNPROCESSABLE_ENTITY,
          "STAFF_CAP_EXCEEDED",
          `Your Basic plan allows ${TOTAL_LOGIN_LIMIT} members. Deactivate someone first.`,
          { plan: "BASIC", limit: TOTAL_LOGIN_LIMIT },
        );
      }
    }

    const staff = await this.prisma.staff.update({
      where: { id: existing.id },
      data: {
        name: input.name,
        role: input.role,
        status: input.status,
        phone: input.phone,
      },
    });
    await this.audit.log(user, {
      action: "updated_staff",
      entityType: "staff",
      entityId: staff.id,
      entityLabel: staff.name,
      details: { changes: input },
    });
    return toStaffMemberDto(staff);
  }

  /** Deactivate — never a hard delete; audit history must keep resolving names. */
  async deactivate(user: AuthUser, id: string) {
    const existing = await this.prisma.staff.findFirst({ where: { id, orgId: user.orgId } });
    if (!existing) throw ApiError.notFound("Staff member");
    await this.prisma.staff.update({
      where: { id: existing.id },
      data: { status: "inactive" },
    });
    await this.audit.log(user, {
      action: "deactivated_staff",
      entityType: "staff",
      entityId: existing.id,
      entityLabel: existing.name,
    });
    return { ok: true };
  }
}

function generateTempPassword(): string {
  return randomBytes(9).toString("base64url");
}
