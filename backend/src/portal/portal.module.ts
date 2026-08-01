import { Module } from "@nestjs/common";
import { ThrottlerModule } from "@nestjs/throttler";
import { EmailService } from "../auth/email.service";
import { ComplaintsModule } from "../complaints/complaints.module";
import { GuardianAdminController } from "./guardian-admin.controller";
import { GuardianAdminService } from "./guardian-admin.service";
import { PortalAuthController } from "./portal-auth.controller";
import { PortalAuthService } from "./portal-auth.service";
import { PortalController } from "./portal.controller";
import { PortalService } from "./portal.service";

@Module({
  imports: [
    // Default rate-limit envelope; per-route @Throttle tightens login endpoints.
    // In-memory store (single-instance). Multi-instance ⇒ Redis storage (follow-up).
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 20 }]),
    // Reuse ComplaintsService for portal complaint filing (no reimplementation).
    ComplaintsModule,
  ],
  controllers: [PortalAuthController, PortalController, GuardianAdminController],
  // EmailService is stateless and re-provided here (also lives in AuthModule).
  providers: [PortalAuthService, PortalService, GuardianAdminService, EmailService],
})
export class PortalModule {}
