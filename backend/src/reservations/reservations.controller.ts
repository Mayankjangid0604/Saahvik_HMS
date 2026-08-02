import { Controller, Get, Inject, Param, Post, Put } from "@nestjs/common";
import type { AuthUser } from "../common/auth-user";
import { CurrentUser } from "../common/decorators";
import { ValidatedBody, ValidatedQuery } from "../common/validated";
import {
  ConvertReservationDto,
  CreateReservationDto,
  ReservationListParamsDto,
  UpdateReservationDto,
} from "./dto";
import { ReservationsService } from "./reservations.service";

// Reception and owner both manage reservations, so these routes are open to any
// authenticated user — no @Roles gate.
@Controller("reservations")
export class ReservationsController {
  constructor(
    @Inject(ReservationsService) private readonly reservations: ReservationsService,
  ) {}

  @Get()
  list(
    @CurrentUser() user: AuthUser,
    @ValidatedQuery(ReservationListParamsDto) params: ReservationListParamsDto,
  ) {
    return this.reservations.list(user, params);
  }

  @Get(":id")
  get(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.reservations.get(user, id);
  }

  @Post()
  create(
    @CurrentUser() user: AuthUser,
    @ValidatedBody(CreateReservationDto) dto: CreateReservationDto,
  ) {
    return this.reservations.create(user, dto);
  }

  @Put(":id")
  update(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @ValidatedBody(UpdateReservationDto) dto: UpdateReservationDto,
  ) {
    return this.reservations.update(user, id, dto);
  }

  @Post(":id/cancel")
  cancel(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.reservations.cancel(user, id);
  }

  @Post(":id/convert")
  convert(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @ValidatedBody(ConvertReservationDto) dto: ConvertReservationDto,
  ) {
    return this.reservations.convert(user, id, dto);
  }
}
