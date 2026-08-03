import { Controller, Get, Inject, Post, Put, UseGuards } from "@nestjs/common";
import type { AuthUser } from "../common/auth-user";
import { CurrentUser, Public, Roles } from "../common/decorators";
import { IpRateLimit } from "../common/ip-rate-limit.guard";
import { ValidatedBody } from "../common/validated";
import { AuthService } from "./auth.service";
import { EmailOtpService } from "./email-otp.service";
import {
  ChangePasswordDto,
  ForgotPasswordDto,
  LoginDto,
  ResetPasswordDto,
  SendEmailOtpDto,
  SignupDto,
  TwoFactorTokenDto,
  TwoFactorVerifyDto,
  UpdateProfileDto,
  VerifyEmailOtpDto,
} from "./dto";

/**
 * Per-IP ceiling on top of the per-address cooldown in EmailOtpService: the
 * cooldown alone would let one client cycle through many addresses, each
 * costing a real SES send.
 */
const SendOtpRateLimitGuard = IpRateLimit({
  max: 8,
  windowMs: 10 * 60 * 1000,
  message: "Too many verification emails requested. Please try again in a few minutes.",
});

/**
 * Verifies are looser than sends — they cost nothing to serve, and guessing is
 * already capped by the 5-attempt-per-code lockout. This only stops a client
 * from spraying attempts across many addresses.
 */
const VerifyOtpRateLimitGuard = IpRateLimit({
  max: 20,
  windowMs: 10 * 60 * 1000,
  message: "Too many verification attempts. Please try again in a few minutes.",
});

@Controller("auth")
export class AuthController {
  constructor(
    @Inject(AuthService) private readonly auth: AuthService,
    @Inject(EmailOtpService) private readonly emailOtp: EmailOtpService,
  ) {}

  @Public()
  @Post("signup")
  signup(@ValidatedBody(SignupDto) dto: SignupDto) {
    return this.auth.signup(dto);
  }

  @Public()
  @Post("login")
  login(@ValidatedBody(LoginDto) dto: LoginDto) {
    return this.auth.login(dto);
  }

  /** Second step of login for owners with 2FA enabled. */
  @Public()
  @Post("2fa/verify")
  verifyTwoFactor(@ValidatedBody(TwoFactorVerifyDto) dto: TwoFactorVerifyDto) {
    return this.auth.verifyTwoFactorLogin(dto);
  }

  @Get("2fa/setup")
  @Roles("owner")
  setupTwoFactor(@CurrentUser() user: AuthUser) {
    return this.auth.setupTwoFactor(user);
  }

  @Post("2fa/verify-setup")
  @Roles("owner")
  verifyTwoFactorSetup(@CurrentUser() user: AuthUser, @ValidatedBody(TwoFactorTokenDto) dto: TwoFactorTokenDto) {
    return this.auth.verifyTwoFactorSetup(user, dto.token);
  }

  @Post("2fa/disable")
  @Roles("owner")
  disableTwoFactor(@CurrentUser() user: AuthUser, @ValidatedBody(TwoFactorTokenDto) dto: TwoFactorTokenDto) {
    return this.auth.disableTwoFactor(user, dto.token);
  }

  /**
   * Email verification for signup — public because the Owner does not exist
   * yet at this point in the wizard (account → verify → plan → signup).
   */
  @Public()
  @UseGuards(SendOtpRateLimitGuard)
  @Post("email-otp/send")
  sendEmailOtp(@ValidatedBody(SendEmailOtpDto) dto: SendEmailOtpDto) {
    return this.emailOtp.send(dto.email);
  }

  @Public()
  @UseGuards(VerifyOtpRateLimitGuard)
  @Post("email-otp/verify")
  verifyEmailOtp(@ValidatedBody(VerifyEmailOtpDto) dto: VerifyEmailOtpDto) {
    return this.emailOtp.verify(dto.email, dto.code);
  }

  @Public()
  @Post("forgot-password")
  forgotPassword(@ValidatedBody(ForgotPasswordDto) dto: ForgotPasswordDto) {
    return this.auth.forgotPassword(dto.email);
  }

  @Public()
  @Post("reset-password")
  resetPassword(@ValidatedBody(ResetPasswordDto) dto: ResetPasswordDto) {
    return this.auth.resetPassword(dto.token, dto.newPassword);
  }

  @Post("logout")
  logout(@CurrentUser() user: AuthUser) {
    return this.auth.logout(user);
  }

  @Post("change-password")
  changePassword(@CurrentUser() user: AuthUser, @ValidatedBody(ChangePasswordDto) dto: ChangePasswordDto) {
    return this.auth.changePassword(user, dto);
  }

  @Put("profile")
  updateProfile(@CurrentUser() user: AuthUser, @ValidatedBody(UpdateProfileDto) dto: UpdateProfileDto) {
    return this.auth.updateProfile(user, dto);
  }

  @Get("me")
  me(@CurrentUser() user: AuthUser) {
    return this.auth.me(user);
  }
}
