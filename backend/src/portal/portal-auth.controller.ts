import { Controller, Inject, Post, UseGuards } from "@nestjs/common";
import { Throttle, ThrottlerGuard } from "@nestjs/throttler";
import type { AuthUser } from "../common/auth-user";
import { CurrentUser, Public, Roles } from "../common/decorators";
import { ValidatedBody } from "../common/validated";
import {
  AcceptInviteDto,
  PortalForgotPasswordDto,
  PortalLoginDto,
  PortalResetPasswordDto,
} from "./dto";
import { PortalAuthService } from "./portal-auth.service";

/**
 * Public portal auth surface. RATE-LIMITED (ThrottlerGuard) because
 * residents/guardians are a large, exposed population — brute-force risk is
 * higher than for the tiny owner/staff set. Limits are per-IP; the in-memory
 * store is single-instance (fine for the current single-node deploy; a Redis
 * ThrottlerStorage is the multi-instance follow-up — flagged in the report).
 */
@Controller("portal")
@UseGuards(ThrottlerGuard)
export class PortalAuthController {
  constructor(@Inject(PortalAuthService) private readonly auth: PortalAuthService) {}

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post("guardian/login")
  guardianLogin(@ValidatedBody(PortalLoginDto) dto: PortalLoginDto) {
    return this.auth.guardianLogin(dto);
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post("resident/login")
  residentLogin(@ValidatedBody(PortalLoginDto) dto: PortalLoginDto) {
    return this.auth.residentLogin(dto);
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post("accept-invite")
  acceptInvite(@ValidatedBody(AcceptInviteDto) dto: AcceptInviteDto) {
    return this.auth.acceptInvite(dto);
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post("forgot-password")
  forgotPassword(@ValidatedBody(PortalForgotPasswordDto) dto: PortalForgotPasswordDto) {
    return this.auth.forgotPassword(dto);
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post("reset-password")
  resetPassword(@ValidatedBody(PortalResetPasswordDto) dto: PortalResetPasswordDto) {
    return this.auth.resetPassword(dto);
  }

  /** Server-side token revocation for the authenticated portal subject. */
  @Roles("resident", "guardian")
  @Post("logout")
  logout(@CurrentUser() user: AuthUser) {
    return this.auth.logout(user);
  }
}
