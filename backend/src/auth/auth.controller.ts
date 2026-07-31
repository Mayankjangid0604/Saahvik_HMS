import { Body, Controller, Get, Inject, Post, Put } from "@nestjs/common";
import type { AuthUser } from "../common/auth-user";
import { CurrentUser, Public, Roles } from "../common/decorators";
import { ValidatedBody, ValidatedQuery } from "../common/validated";
import { AuthService } from "./auth.service";
import {
  ChangePasswordDto,
  ForgotPasswordDto,
  LoginDto,
  ResetPasswordDto,
  SignupDto,
  TwoFactorTokenDto,
  TwoFactorVerifyDto,
  UpdateProfileDto,
} from "./dto";

@Controller("auth")
export class AuthController {
  constructor(@Inject(AuthService) private readonly auth: AuthService) {}

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
