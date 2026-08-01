import { Controller, Get, Inject, Param, Post } from "@nestjs/common";
import type { AuthUser } from "../common/auth-user";
import { CurrentUser, Roles } from "../common/decorators";
import { ValidatedBody } from "../common/validated";
import { CreatePortalComplaintDto } from "./dto";
import { PortalService } from "./portal.service";

/**
 * Portal self-service routes. `@Roles("resident","guardian")` admits ONLY
 * portal tokens (owner/staff are excluded here just as portal tokens are
 * excluded everywhere else by the RolesGuard default-deny). Every :residentId
 * is authorized against the subject inside the service before any data is read.
 */
@Controller("portal")
@Roles("resident", "guardian")
export class PortalController {
  constructor(@Inject(PortalService) private readonly portal: PortalService) {}

  @Get("me")
  me(@CurrentUser() user: AuthUser) {
    return this.portal.me(user);
  }

  @Get("residents/:residentId")
  profile(@CurrentUser() user: AuthUser, @Param("residentId") residentId: string) {
    return this.portal.residentProfile(user, residentId);
  }

  @Get("residents/:residentId/dues")
  dues(@CurrentUser() user: AuthUser, @Param("residentId") residentId: string) {
    return this.portal.dues(user, residentId);
  }

  @Get("residents/:residentId/documents")
  documents(@CurrentUser() user: AuthUser, @Param("residentId") residentId: string) {
    return this.portal.documents(user, residentId);
  }

  @Get("residents/:residentId/complaints")
  complaints(@CurrentUser() user: AuthUser, @Param("residentId") residentId: string) {
    return this.portal.listComplaints(user, residentId);
  }

  @Post("residents/:residentId/complaints")
  createComplaint(
    @CurrentUser() user: AuthUser,
    @Param("residentId") residentId: string,
    @ValidatedBody(CreatePortalComplaintDto) dto: CreatePortalComplaintDto,
  ) {
    return this.portal.createComplaint(user, residentId, dto);
  }
}
