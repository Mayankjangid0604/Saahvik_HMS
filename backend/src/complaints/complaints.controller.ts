import { Body, Controller, Get, Inject, Param, Post, Put, Query } from "@nestjs/common";
import type { AuthUser } from "../common/auth-user";
import { CurrentUser } from "../common/decorators";
import { ValidatedBody, ValidatedQuery } from "../common/validated";
import { ComplaintsService } from "./complaints.service";
import { ComplaintListParamsDto, CreateComplaintDto, UpdateComplaintDto } from "./dto";

/** Complaints are accessible to every authenticated org member (staff included). */
@Controller("complaints")
export class ComplaintsController {
  constructor(@Inject(ComplaintsService) private readonly complaints: ComplaintsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser, @ValidatedQuery(ComplaintListParamsDto) params: ComplaintListParamsDto) {
    return this.complaints.list(user, params);
  }

  @Get(":id")
  get(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.complaints.get(user, id);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @ValidatedBody(CreateComplaintDto) dto: CreateComplaintDto) {
    return this.complaints.create(user, dto);
  }

  @Put(":id")
  update(@CurrentUser() user: AuthUser, @Param("id") id: string, @ValidatedBody(UpdateComplaintDto) dto: UpdateComplaintDto) {
    return this.complaints.update(user, id, dto);
  }
}
