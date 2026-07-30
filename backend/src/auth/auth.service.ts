import {
  ConflictException,
  HttpStatus,
  Inject,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import type { Organization, Owner, Prisma, Staff } from "@prisma/client";
import * as bcrypt from "bcryptjs";
import { createHash, randomBytes } from "crypto";
import { authenticator } from "otplib";
import * as QRCode from "qrcode";
import { AuditService } from "../audit/audit.service";
import { ApiError } from "../common/api-error";
import type { AuthUser, JwtPayload } from "../common/auth-user";
import { staffToUserDto, toOrgDto, toUserDto } from "../common/mappers";
import { PrismaService } from "../prisma/prisma.service";
import { DEFAULT_ADMISSION_FIELDS } from "../settings/admission-defaults";
import { EmailService } from "./email.service";
import type {
  ChangePasswordDto,
  LoginDto,
  SignupDto,
  TwoFactorVerifyDto,
  UpdateProfileDto,
} from "./dto";

const TWO_FACTOR_CHALLENGE_TTL_MS = 5 * 60 * 1000;
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

// Accept the previous/next 30s TOTP step — standard authenticator-app
// clock-skew tolerance.
authenticator.options = { window: 1 };

@Injectable()
export class AuthService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(JwtService) private readonly jwt: JwtService,
    @Inject(AuditService) private readonly audit: AuditService,
    @Inject(EmailService) private readonly email: EmailService,
  ) {}

  // ---------- signup ----------

  async signup(dto: SignupDto) {
    const existing = await this.prisma.owner.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException("An account with this email already exists");

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const { org, owner } = await this.prisma.$transaction(async (tx) => {
      const org = await tx.organization.create({
        data: {
          name: dto.hostelName,
          hostelName: dto.hostelName,
          phone: dto.phone,
          email: dto.email,
          planStartDate: new Date(),
        },
      });
      const owner = await tx.owner.create({
        data: {
          orgId: org.id,
          name: dto.name,
          email: dto.email,
          phone: dto.phone,
          passwordHash,
        },
      });
      await tx.hostel.create({ data: { orgId: org.id, name: dto.hostelName } });

      // Seed the 28 default admission-form fields (Sunrise Hostel pattern).
      await tx.admissionFieldDefinition.createMany({
        data: DEFAULT_ADMISSION_FIELDS.map((f, i) => ({
          orgId: org.id,
          key: f.key,
          label: f.label,
          fieldType: f.fieldType,
          options: f.options as Prisma.InputJsonValue | undefined,
          required: f.required,
          isDefault: true,
          validation: f.validation,
          autoFill: f.autoFill,
          sortOrder: i,
        })),
      });

      await tx.notificationPreference.create({
        data: { orgId: org.id, userId: owner.id, userType: "owner" },
      });
      return { org, owner };
    });

    const actor: AuthUser = { userId: owner.id, orgId: org.id, role: "owner", name: owner.name };
    await this.audit.log(actor, {
      action: "created_organization",
      entityType: "organization",
      entityId: org.id,
      entityLabel: org.name,
      details: { hostelName: dto.hostelName },
    });

    return {
      token: await this.signToken(owner),
      user: toUserDto(owner),
      org: toOrgDto(org),
    };
  }

  // ---------- login (with 2FA challenge flow) ----------

  async login(dto: LoginDto) {
    const owner = await this.prisma.owner.findUnique({ where: { email: dto.email } });
    if (owner) {
      await this.checkPassword(dto.password, owner.passwordHash);

      if (owner.twoFactorEnabled) {
        // Do NOT issue the full JWT yet — hand out a 5-minute challenge id.
        const challenge = await this.prisma.authChallenge.create({
          data: {
            ownerId: owner.id,
            expiresAt: new Date(Date.now() + TWO_FACTOR_CHALLENGE_TTL_MS),
          },
        });
        return { requiresTwoFactor: true as const, tempSessionId: challenge.id };
      }

      const org = await this.mustGetOrg(owner.orgId);
      return {
        requiresTwoFactor: false as const,
        token: await this.signToken(owner),
        user: toUserDto(owner),
        org: toOrgDto(org),
      };
    }

    const staff = await this.prisma.staff.findFirst({
      where: { email: dto.email, status: "active" },
    });
    if (!staff) throw new UnauthorizedException("Incorrect email or password");
    await this.checkPassword(dto.password, staff.passwordHash);
    await this.prisma.staff.update({
      where: { id: staff.id },
      data: { lastLoginAt: new Date() },
    });

    const org = await this.mustGetOrg(staff.orgId);
    return {
      requiresTwoFactor: false as const,
      token: await this.signStaffToken(staff),
      user: staffToUserDto(staff),
      org: toOrgDto(org),
    };
  }

  async verifyTwoFactorLogin(dto: TwoFactorVerifyDto) {
    const challenge = await this.prisma.authChallenge.findUnique({
      where: { id: dto.tempSessionId },
      include: { owner: true },
    });
    if (!challenge || challenge.expiresAt < new Date()) {
      throw new ApiError(
        HttpStatus.UNAUTHORIZED,
        "TWO_FACTOR_SESSION_EXPIRED",
        "Your login session expired — please sign in again",
      );
    }

    const owner = challenge.owner;
    const ok =
      this.verifyTotp(dto.token, owner.twoFactorSecret) ||
      (await this.consumeBackupCode(owner, dto.token));
    if (!ok) throw new UnauthorizedException("Invalid authentication code");

    await this.prisma.authChallenge.deleteMany({ where: { ownerId: owner.id } });

    const org = await this.mustGetOrg(owner.orgId);
    return {
      token: await this.signToken(owner),
      user: toUserDto({ ...owner }),
      org: toOrgDto(org),
    };
  }

  // ---------- 2FA setup / disable ----------

  async setupTwoFactor(user: AuthUser) {
    const owner = await this.mustGetOwner(user.userId);
    const secret = authenticator.generateSecret();
    await this.prisma.owner.update({
      where: { id: owner.id },
      data: { twoFactorPendingSecret: secret },
    });

    const issuer = process.env.TOTP_ISSUER ?? "Saahvik";
    const otpauthUrl = authenticator.keyuri(owner.email, issuer, secret);
    const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);
    return { qrCodeDataUrl, secret, manualCode: secret, otpauthUrl };
  }

  async verifyTwoFactorSetup(user: AuthUser, token: string) {
    const owner = await this.mustGetOwner(user.userId);
    if (!owner.twoFactorPendingSecret) {
      throw ApiError.badRequest("Run 2FA setup first");
    }
    if (!this.verifyTotp(token, owner.twoFactorPendingSecret)) {
      throw new UnauthorizedException("Invalid authentication code");
    }

    // 8 one-time backup codes — returned in plain text exactly once.
    const backupCodes = Array.from({ length: 8 }, () => generateBackupCode());
    const hashes = await Promise.all(backupCodes.map((c) => bcrypt.hash(c, 10)));

    await this.prisma.owner.update({
      where: { id: owner.id },
      data: {
        twoFactorSecret: owner.twoFactorPendingSecret,
        twoFactorPendingSecret: null,
        twoFactorEnabled: true,
        twoFactorBackupCodes: hashes,
      },
    });
    await this.audit.log(user, {
      action: "enabled_two_factor",
      entityType: "owner",
      entityId: owner.id,
      entityLabel: owner.email,
    });
    return { enabled: true, backupCodes };
  }

  async disableTwoFactor(user: AuthUser, token: string) {
    const owner = await this.mustGetOwner(user.userId);
    if (!owner.twoFactorEnabled) return { enabled: false };
    if (!this.verifyTotp(token, owner.twoFactorSecret)) {
      throw new UnauthorizedException("Invalid authentication code");
    }
    await this.prisma.owner.update({
      where: { id: owner.id },
      data: {
        twoFactorEnabled: false,
        twoFactorSecret: null,
        twoFactorPendingSecret: null,
        twoFactorBackupCodes: [],
      },
    });
    await this.audit.log(user, {
      action: "disabled_two_factor",
      entityType: "owner",
      entityId: owner.id,
      entityLabel: owner.email,
    });
    return { enabled: false };
  }

  // ---------- password lifecycle ----------

  async forgotPassword(email: string) {
    const owner = await this.prisma.owner.findUnique({ where: { email } });
    if (owner) {
      const rawToken = randomBytes(32).toString("hex");
      await this.prisma.owner.update({
        where: { id: owner.id },
        data: {
          passwordResetToken: hashResetToken(rawToken),
          passwordResetExpiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
        },
      });
      const appUrl = process.env.APP_URL ?? "https://app.saahvik.com";
      await this.email.sendPasswordReset(email, `${appUrl}/reset-password?token=${rawToken}`);
    }
    // Same response whether or not the account exists — no email enumeration.
    return { sent: true };
  }

  async resetPassword(token: string, newPassword: string) {
    const owner = await this.prisma.owner.findFirst({
      where: { passwordResetToken: hashResetToken(token), passwordResetExpiresAt: { gt: new Date() } },
    });
    if (!owner) {
      throw new ApiError(
        HttpStatus.BAD_REQUEST,
        "RESET_TOKEN_INVALID",
        "This reset link is invalid or has expired",
      );
    }
    await this.prisma.owner.update({
      where: { id: owner.id },
      data: {
        passwordHash: await bcrypt.hash(newPassword, 10),
        passwordResetToken: null,
        passwordResetExpiresAt: null,
        tokenVersion: { increment: 1 }, // revoke all existing JWTs
      },
    });
    return { ok: true };
  }

  async changePassword(user: AuthUser, dto: ChangePasswordDto) {
    if (user.role === "owner") {
      const owner = await this.mustGetOwner(user.userId);
      await this.checkPassword(dto.currentPassword, owner.passwordHash, "Current password is incorrect");
      const updated = await this.prisma.owner.update({
        where: { id: owner.id },
        data: {
          passwordHash: await bcrypt.hash(dto.newPassword, 10),
          tokenVersion: { increment: 1 },
        },
      });
      await this.audit.log(user, {
        action: "changed_password",
        entityType: "owner",
        entityId: owner.id,
        entityLabel: owner.email,
      });
      // The old token just died (tokenVersion bump) — hand back a fresh one.
      return { ok: true, token: await this.signToken(updated) };
    }

    const staff = await this.prisma.staff.findFirst({
      where: { id: user.userId, status: "active" },
    });
    if (!staff) throw new UnauthorizedException();
    await this.checkPassword(dto.currentPassword, staff.passwordHash, "Current password is incorrect");
    await this.prisma.staff.update({
      where: { id: staff.id },
      data: { passwordHash: await bcrypt.hash(dto.newPassword, 10) },
    });
    await this.audit.log(user, {
      action: "changed_password",
      entityType: "staff",
      entityId: staff.id,
      entityLabel: staff.email,
    });
    return { ok: true };
  }

  async updateProfile(user: AuthUser, dto: UpdateProfileDto) {
    if (user.role === "owner") {
      const owner = await this.prisma.owner.update({
        where: { id: user.userId },
        data: { name: dto.name, phone: dto.phone },
      });
      await this.audit.log(user, {
        action: "updated_profile",
        entityType: "owner",
        entityId: owner.id,
        entityLabel: owner.email,
      });
      return toUserDto(owner);
    }
    const staff = await this.prisma.staff.update({
      where: { id: user.userId },
      data: { name: dto.name, phone: dto.phone },
    });
    await this.audit.log(user, {
      action: "updated_profile",
      entityType: "staff",
      entityId: staff.id,
      entityLabel: staff.email,
    });
    return staffToUserDto(staff);
  }

  async me(user: AuthUser) {
    if (user.role === "owner") {
      const owner = await this.mustGetOwner(user.userId);
      const org = await this.mustGetOrg(owner.orgId);
      return { user: toUserDto(owner), org: toOrgDto(org) };
    }
    const staff = await this.prisma.staff.findFirst({ where: { id: user.userId } });
    if (!staff) throw new UnauthorizedException();
    const org = await this.mustGetOrg(staff.orgId);
    return { user: staffToUserDto(staff), org: toOrgDto(org) };
  }

  // ---------- helpers ----------

  private async signToken(owner: Owner): Promise<string> {
    const payload: JwtPayload = {
      sub: owner.id,
      orgId: owner.orgId,
      role: "owner",
      name: owner.name,
      tv: owner.tokenVersion,
    };
    return this.jwt.signAsync(payload);
  }

  private async signStaffToken(staff: Staff): Promise<string> {
    const payload: JwtPayload = {
      sub: staff.id,
      orgId: staff.orgId,
      role: "staff",
      staffRole: staff.role,
      name: staff.name,
    };
    return this.jwt.signAsync(payload);
  }

  private async checkPassword(
    plain: string,
    hash: string,
    message = "Incorrect email or password",
  ): Promise<void> {
    if (!(await bcrypt.compare(plain, hash))) {
      throw new UnauthorizedException(message);
    }
  }

  private verifyTotp(token: string, secret: string | null): boolean {
    if (!secret || !/^\d{6}$/.test(token)) return false;
    return authenticator.verify({ token, secret });
  }

  private async consumeBackupCode(owner: Owner, code: string): Promise<boolean> {
    for (let i = 0; i < owner.twoFactorBackupCodes.length; i++) {
      if (await bcrypt.compare(code.toUpperCase(), owner.twoFactorBackupCodes[i])) {
        const remaining = owner.twoFactorBackupCodes.filter((_, j) => j !== i);
        await this.prisma.owner.update({
          where: { id: owner.id },
          data: { twoFactorBackupCodes: remaining },
        });
        return true;
      }
    }
    return false;
  }

  private async mustGetOwner(id: string): Promise<Owner> {
    const owner = await this.prisma.owner.findUnique({ where: { id } });
    if (!owner) throw new UnauthorizedException();
    return owner;
  }

  private async mustGetOrg(id: string): Promise<Organization> {
    const org = await this.prisma.organization.findUnique({ where: { id } });
    if (!org) throw new UnauthorizedException();
    return org;
  }
}

/** Reset tokens are stored as their SHA-256 hash — never the raw value (DB read access must not grant account takeover). */
function hashResetToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}

/** 8-char uppercase alphanumeric, unambiguous alphabet. */
function generateBackupCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(8);
  let out = "";
  for (let i = 0; i < 8; i++) out += alphabet[bytes[i] % alphabet.length];
  return out;
}
