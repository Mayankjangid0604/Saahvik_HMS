import { Module } from "@nestjs/common";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { EmailOtpService } from "./email-otp.service";
import { EmailService } from "./email.service";

@Module({
  controllers: [AuthController],
  providers: [AuthService, EmailOtpService, EmailService],
})
export class AuthModule {}
