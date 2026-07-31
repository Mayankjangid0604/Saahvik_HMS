import { HttpStatus, Inject, Injectable, Logger, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import type { Guardian, Resident } from "@prisma/client";
import * as bcrypt from "bcryptjs";
import { createHash, randomBytes } from "crypto";
import { ApiError } from "../common/api-error";
import type { AuthUser, JwtPayload } from "../common/auth-user";
import { PrismaService } from "../prisma/prisma.service";
import { EmailService } from "../auth/email.service";
import type {
  AcceptInviteDto,
  PortalForgotPasswordDto,
  PortalLoginDto,
  PortalResetPasswordDto,
} from "./dto";

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;
const BCRYPT_ROUNDS = 10;

/**
 * Guardian + resident (portal) authentication. Uses the SAME primitives as
 * Owner auth — bcrypt password hashing, sha256-hashed one-time tokens, and
 * tokenVersion-based JWT revocation — never a second, weaker mechanism.
 *
 * Login is by phone + password. Phone is unique per org but not globally, so
 * the password itself disambiguates across orgs: we collect every account with
 * that phone and require EXACTLY ONE to match the password. Zero or multiple
 * matches → generic "incorrect phone or password" (documented in the report).
 */
@Injectable()
export class PortalAuthService {
  private readonly logger = new Logger("PortalAuth");

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(JwtService) private readonly jwt: JwtService,
    @Inject(EmailService) private readonly email: EmailService,
  ) {}

  // ---------- login ----------

  async guardianLogin(dto: PortalLoginDto) {
    const candidates = await this.prisma.guardian.findMany({ where: { phone: dto.phone } });
    const guardian = await this.uniquePasswordMatch(candidates, dto.password, (g) => g.passwordHash);
    return {
      token: await this.signGuardianToken(guardian),
      role: "guardian" as const,
      profile: { id: guardian.id, name: guardian.name, phone: guardian.phone, email: guardian.email ?? undefined },
    };
  }

  async residentLogin(dto: PortalLoginDto) {
    const candidates = await this.prisma.resident.findMany({
      where: { phone: dto.phone, passwordHash: { not: null } },
    });
    const resident = await this.uniquePasswordMatch(
      candidates,
      dto.password,
      (r) => r.passwordHash!,
    );
    return {
      token: await this.signResidentToken(resident),
      role: "resident" as const,
      profile: { id: resident.id, name: resident.name, phone: resident.phone },
    };
  }

  /** Exactly one candidate must match the password, else a generic 401. */
  private async uniquePasswordMatch<T>(
    candidates: T[],
    password: string,
    hashOf: (c: T) => string,
  ): Promise<T> {
    const matches: T[] = [];
    for (const c of candidates) {
      if (await bcrypt.compare(password, hashOf(c))) matches.push(c);
    }
    if (matches.length !== 1) {
      throw new UnauthorizedException("Incorrect phone or password");
    }
    return matches[0];
  }

  // ---------- invite acceptance (signup) ----------

  async acceptInvite(dto: AcceptInviteDto) {
    const invite = await this.prisma.portalInvite.findFirst({
      where: { tokenHash: hashToken(dto.token) },
    });
    if (!invite || invite.usedAt || invite.expiresAt < new Date()) {
      throw new ApiError(HttpStatus.BAD_REQUEST, "INVITE_INVALID", "This invite is invalid or has expired");
    }
    const resident = await this.prisma.resident.findFirst({
      where: { id: invite.residentId, orgId: invite.orgId },
    });
    if (!resident) throw ApiError.notFound("Resident");

    if (invite.kind === "resident") {
      if (resident.passwordHash) {
        throw new ApiError(HttpStatus.CONFLICT, "PORTAL_ALREADY_ENABLED", "Portal access is already set up for this resident");
      }
      const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
      const updated = await this.prisma.$transaction(async (tx) => {
        const r = await tx.resident.update({
          where: { id: resident.id },
          data: { passwordHash, tokenVersion: 0 },
        });
        await tx.portalInvite.update({ where: { id: invite.id }, data: { usedAt: new Date() } });
        return r;
      });
      return {
        token: await this.signResidentToken(updated),
        role: "resident" as const,
        profile: { id: updated.id, name: updated.name, phone: updated.phone },
      };
    }

    // guardian invite
    const name = dto.name?.trim();
    if (!name) throw ApiError.badRequest("A guardian name is required");
    const phone = (dto.phone ?? invite.phone ?? "").trim();
    if (!phone) throw ApiError.badRequest("A guardian phone is required");

    const existing = await this.prisma.guardian.findFirst({
      where: { orgId: invite.orgId, phone },
    });
    if (existing) {
      // Never silently attach to an existing account (would let an invite set a
      // password on someone else's guardian). Staff link existing guardians.
      throw new ApiError(
        HttpStatus.CONFLICT,
        "GUARDIAN_EXISTS",
        "A guardian with this phone already exists — ask the hostel to link them to this resident",
      );
    }
    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const guardian = await this.prisma.$transaction(async (tx) => {
      const g = await tx.guardian.create({
        data: { orgId: invite.orgId, name, phone, passwordHash },
      });
      await tx.guardianResident.create({
        data: { orgId: invite.orgId, guardianId: g.id, residentId: invite.residentId },
      });
      await tx.portalInvite.update({ where: { id: invite.id }, data: { usedAt: new Date() } });
      return g;
    });
    return {
      token: await this.signGuardianToken(guardian),
      role: "guardian" as const,
      profile: { id: guardian.id, name: guardian.name, phone: guardian.phone, email: undefined },
    };
  }

  // ---------- password reset (mirrors Owner.passwordResetToken pattern) ----------

  async forgotPassword(dto: PortalForgotPasswordDto) {
    const rawToken = randomBytes(32).toString("hex");
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);
    const appUrl = process.env.APP_URL ?? "https://app.saahvik.com";
    const link = `${appUrl}/portal/reset-password?token=${rawToken}&kind=${dto.kind}`;

    if (dto.kind === "guardian") {
      const guardians = await this.prisma.guardian.findMany({ where: { phone: dto.phone } });
      for (const g of guardians) {
        await this.prisma.guardian.update({
          where: { id: g.id },
          data: { passwordResetToken: tokenHash, passwordResetExpiresAt: expiresAt },
        });
        await this.deliverReset(g.email, link);
      }
    } else {
      const residents = await this.prisma.resident.findMany({
        where: { phone: dto.phone, passwordHash: { not: null } },
      });
      for (const r of residents) {
        await this.prisma.resident.update({
          where: { id: r.id },
          data: { passwordResetToken: tokenHash, passwordResetExpiresAt: expiresAt },
        });
        await this.deliverReset(r.email, link);
      }
    }
    // Uniform response regardless of existence — no account enumeration.
    return { sent: true };
  }

  async resetPassword(dto: PortalResetPasswordDto) {
    const tokenHash = hashToken(dto.token);
    const now = new Date();
    const passwordHash = await bcrypt.hash(dto.newPassword, BCRYPT_ROUNDS);

    if (dto.kind === "guardian") {
      const g = await this.prisma.guardian.findFirst({
        where: { passwordResetToken: tokenHash, passwordResetExpiresAt: { gt: now } },
      });
      if (!g) throw this.resetInvalid();
      await this.prisma.guardian.update({
        where: { id: g.id },
        data: {
          passwordHash,
          passwordResetToken: null,
          passwordResetExpiresAt: null,
          tokenVersion: { increment: 1 },
        },
      });
    } else {
      const r = await this.prisma.resident.findFirst({
        where: { passwordResetToken: tokenHash, passwordResetExpiresAt: { gt: now } },
      });
      if (!r) throw this.resetInvalid();
      await this.prisma.resident.update({
        where: { id: r.id },
        data: {
          passwordHash,
          passwordResetToken: null,
          passwordResetExpiresAt: null,
          tokenVersion: { increment: 1 },
        },
      });
    }
    return { ok: true };
  }

  // ---------- logout (server-side revocation) ----------

  async logout(user: AuthUser) {
    if (user.role === "guardian") {
      await this.prisma.guardian.update({
        where: { id: user.userId },
        data: { tokenVersion: { increment: 1 } },
      });
    } else if (user.role === "resident") {
      await this.prisma.resident.update({
        where: { id: user.userId },
        data: { tokenVersion: { increment: 1 } },
      });
    }
    return { ok: true };
  }

  // ---------- helpers ----------

  private async deliverReset(email: string | null, link: string): Promise<void> {
    if (email) {
      await this.email.sendPasswordReset(email, link);
    } else {
      // No email on file. SMS delivery is out of scope for BG-2 (messaging is a
      // separate phase). Log for dev; flagged as a delivery dependency.
      this.logger.warn(`Portal reset requested for an account with no email; SMS delivery not available. Link: ${link}`);
    }
  }

  private resetInvalid(): ApiError {
    return new ApiError(HttpStatus.BAD_REQUEST, "RESET_TOKEN_INVALID", "This reset link is invalid or has expired");
  }

  private async signGuardianToken(guardian: Guardian): Promise<string> {
    const payload: JwtPayload = {
      sub: guardian.id,
      orgId: guardian.orgId,
      role: "guardian",
      name: guardian.name,
      tv: guardian.tokenVersion,
    };
    return this.jwt.signAsync(payload);
  }

  private async signResidentToken(resident: Resident): Promise<string> {
    const payload: JwtPayload = {
      sub: resident.id,
      orgId: resident.orgId,
      role: "resident",
      name: resident.name,
      tv: resident.tokenVersion,
    };
    return this.jwt.signAsync(payload);
  }
}

/** sha256 of a raw token — only the hash is ever stored (DB read ≠ takeover). */
function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}
