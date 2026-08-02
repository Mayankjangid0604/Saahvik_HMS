import { Controller, Delete, Get, Inject, Param, Post } from "@nestjs/common";
import type { AuthUser } from "../common/auth-user";
import { CurrentUser, Roles } from "../common/decorators";
import { ValidatedBody } from "../common/validated";
import { CreateInviteDto, LinkGuardianDto } from "./dto";
import { GuardianAdminService } from "./guardian-admin.service";

/**
 * Owner/staff-side management of portal access: issuing invites and
 * linking/unlinking guardians. Explicitly `@Roles("owner","staff")` (which is
 * also the default) to document that these are staff-side, never portal.
 */
@Controller("portal-admin")
@Roles("owner", "staff")
export class GuardianAdminController {
  constructor(@Inject(GuardianAdminService) private readonly admin: GuardianAdminService) {}

  /** Issue a resident- or guardian-signup invite tied to a resident. */
  @Post("residents/:residentId/invite")
  createInvite(
    @CurrentUser() user: AuthUser,
    @Param("residentId") residentId: string,
    @ValidatedBody(CreateInviteDto) dto: CreateInviteDto,
  ) {
    return this.admin.createInvite(user, residentId, dto);
  }

  @Get("residents/:residentId/guardians")
  listGuardians(@CurrentUser() user: AuthUser, @Param("residentId") residentId: string) {
    return this.admin.listResidentGuardians(user, residentId);
  }

  @Get("residents/:residentId/portal-status")
  portalStatus(@CurrentUser() user: AuthUser, @Param("residentId") residentId: string) {
    return this.admin.portalStatus(user, residentId);
  }

  /** Link an EXISTING guardian to another resident (siblings). */
  @Post("guardians/:guardianId/link")
  link(
    @CurrentUser() user: AuthUser,
    @Param("guardianId") guardianId: string,
    @ValidatedBody(LinkGuardianDto) dto: LinkGuardianDto,
  ) {
    return this.admin.linkGuardian(user, guardianId, dto);
  }

  @Delete("guardians/:guardianId/link/:residentId")
  unlink(
    @CurrentUser() user: AuthUser,
    @Param("guardianId") guardianId: string,
    @Param("residentId") residentId: string,
  ) {
    return this.admin.unlinkGuardian(user, guardianId, residentId);
  }
}
