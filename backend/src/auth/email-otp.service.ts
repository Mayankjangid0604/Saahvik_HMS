import { HttpStatus, Inject, Injectable } from "@nestjs/common";
import { createHash, randomInt } from "crypto";
import { ApiError } from "../common/api-error";
import { PrismaService } from "../prisma/prisma.service";
import { EmailService } from "./email.service";

const CODE_TTL_MS = 10 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;
/** Wrong guesses allowed against one code before it is burned. */
const MAX_ATTEMPTS = 5;

/**
 * Pre-account email verification for the signup wizard.
 *
 * The wizard verifies the address before POST /auth/signup runs, so state is
 * keyed by email in EmailVerification rather than on Owner. AuthService.signup
 * consumes the row to stamp Owner.emailVerified.
 */
@Injectable()
export class EmailOtpService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(EmailService) private readonly email: EmailService,
  ) {}

  async send(rawEmail: string) {
    const email = normalizeEmail(rawEmail);

    const existing = await this.prisma.emailVerification.findUnique({ where: { email } });
    if (existing?.lastSentAt) {
      const elapsed = Date.now() - existing.lastSentAt.getTime();
      if (elapsed < RESEND_COOLDOWN_MS) {
        const retryAfterSeconds = Math.ceil((RESEND_COOLDOWN_MS - elapsed) / 1000);
        throw new ApiError(
          HttpStatus.TOO_MANY_REQUESTS,
          "OTP_COOLDOWN",
          `Please wait ${retryAfterSeconds}s before requesting another code.`,
          { retryAfterSeconds },
        );
      }
    }

    // randomInt is CSPRNG-backed; Math.random would be guessable.
    const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
    const data = {
      codeHash: hashCode(code),
      expiresAt: new Date(Date.now() + CODE_TTL_MS),
      attempts: 0, // a fresh code gets a fresh attempt budget
      lastSentAt: new Date(),
      verifiedAt: null,
    };
    await this.prisma.emailVerification.upsert({
      where: { email },
      create: { email, ...data },
      update: data,
    });

    await this.email.sendOtpEmail(email, code);
    return { sent: true, cooldownSeconds: RESEND_COOLDOWN_MS / 1000 };
  }

  async verify(rawEmail: string, code: string) {
    const email = normalizeEmail(rawEmail);
    const record = await this.prisma.emailVerification.findUnique({ where: { email } });

    if (!record?.codeHash || !record.expiresAt) {
      throw new ApiError(
        HttpStatus.BAD_REQUEST,
        "OTP_NOT_SENT",
        "Request a verification code first.",
      );
    }

    if (record.expiresAt.getTime() <= Date.now()) {
      throw new ApiError(
        HttpStatus.BAD_REQUEST,
        "OTP_EXPIRED",
        "That code has expired. Request a new one.",
      );
    }

    if (record.attempts >= MAX_ATTEMPTS) {
      throw new ApiError(
        HttpStatus.TOO_MANY_REQUESTS,
        "OTP_LOCKED",
        "Too many incorrect attempts. Request a new code.",
      );
    }

    if (record.codeHash !== hashCode(code)) {
      const updated = await this.prisma.emailVerification.update({
        where: { email },
        data: { attempts: { increment: 1 } },
      });
      const remaining = Math.max(0, MAX_ATTEMPTS - updated.attempts);
      throw new ApiError(
        HttpStatus.BAD_REQUEST,
        remaining === 0 ? "OTP_LOCKED" : "OTP_INVALID",
        remaining === 0
          ? "Too many incorrect attempts. Request a new code."
          : `That code didn't match. ${remaining} attempt${remaining === 1 ? "" : "s"} left.`,
        { attemptsRemaining: remaining },
      );
    }

    // Correct: burn the code so it cannot be replayed, keep the verified mark.
    await this.prisma.emailVerification.update({
      where: { email },
      data: { codeHash: null, expiresAt: null, attempts: 0, verifiedAt: new Date() },
    });
    return { verified: true };
  }

  /** True when this address completed verification (used by signup). */
  async isVerified(rawEmail: string): Promise<boolean> {
    const record = await this.prisma.emailVerification.findUnique({
      where: { email: normalizeEmail(rawEmail) },
    });
    return !!record?.verifiedAt;
  }
}

/** Addresses are matched case-insensitively so send and verify agree. */
function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Same principle as the password-reset token: the DB never holds the secret. */
function hashCode(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}
