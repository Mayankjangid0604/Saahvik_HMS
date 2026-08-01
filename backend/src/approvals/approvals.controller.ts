import { Controller, Get, Inject, Param, Post } from "@nestjs/common";
import type { AuthUser } from "../common/auth-user";
import { CurrentUser, Roles } from "../common/decorators";
import { ValidatedBody, ValidatedQuery } from "../common/validated";
import { ApprovalsService } from "./approvals.service";
import { ApprovalListParamsDto, CreateApprovalDto, DecideApprovalDto } from "./dto";

@Controller("approvals")
export class ApprovalsController {
  constructor(@Inject(ApprovalsService) private readonly approvals: ApprovalsService) {}

  @Get()
  list(
    @CurrentUser() user: AuthUser,
    @ValidatedQuery(ApprovalListParamsDto) params: ApprovalListParamsDto,
  ) {
    return this.approvals.list(user, params);
  }

  @Get(":id")
  get(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.approvals.get(user, id);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @ValidatedBody(CreateApprovalDto) dto: CreateApprovalDto) {
    return this.approvals.create(user, dto);
  }

  @Post(":id/approve")
  @Roles("owner")
  approve(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @ValidatedBody(DecideApprovalDto) dto: DecideApprovalDto,
  ) {
    return this.approvals.decide(user, id, true, dto);
  }

  @Post(":id/reject")
  @Roles("owner")
  reject(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @ValidatedBody(DecideApprovalDto) dto: DecideApprovalDto,
  ) {
    return this.approvals.decide(user, id, false, dto);
  }
}
