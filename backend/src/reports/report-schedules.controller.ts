import { Controller, Delete, Get, Inject, Param, Post, Put, Query } from "@nestjs/common";
import type { AuthUser } from "../common/auth-user";
import { CurrentUser, Roles } from "../common/decorators";
import { ValidatedBody } from "../common/validated";
import { CreateReportScheduleDto, UpdateReportScheduleDto } from "./report-schedules.dto";
import { ReportSchedulesService } from "./report-schedules.service";

/** Report scheduling (feature 16) is owner only, like the reports themselves. */
@Controller("report-schedules")
@Roles("owner")
export class ReportSchedulesController {
  constructor(
    @Inject(ReportSchedulesService) private readonly schedules: ReportSchedulesService,
  ) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.schedules.list(user);
  }

  /** Generated-and-stored artifacts (feature 16). `?scheduleId=` optional. */
  @Get("runs")
  listRuns(@CurrentUser() user: AuthUser, @Query("scheduleId") scheduleId?: string) {
    return this.schedules.listRuns(user, scheduleId);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @ValidatedBody(CreateReportScheduleDto) dto: CreateReportScheduleDto) {
    return this.schedules.create(user, dto);
  }

  @Put(":id")
  update(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @ValidatedBody(UpdateReportScheduleDto) dto: UpdateReportScheduleDto,
  ) {
    return this.schedules.update(user, id, dto);
  }

  @Delete(":id")
  remove(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.schedules.remove(user, id);
  }

  /** Generate + store this schedule's report immediately. */
  @Post(":id/run")
  runNow(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.schedules.runNow(user, id);
  }
}
