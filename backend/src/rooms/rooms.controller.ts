import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Post,
  Put,
  Query,
} from "@nestjs/common";
import type { AuthUser } from "../common/auth-user";
import { CurrentUser, Roles } from "../common/decorators";
import { ValidatedBody, ValidatedQuery } from "../common/validated";
import {
  BulkAddRoomsDto,
  CreateRoomDto,
  RoomListParamsDto,
  RoomTransferDto,
  UpdateRoomFeeDto,
} from "./dto";
import { RoomsService } from "./rooms.service";

@Controller("rooms")
export class RoomsController {
  constructor(@Inject(RoomsService) private readonly rooms: RoomsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser, @ValidatedQuery(RoomListParamsDto) params: RoomListParamsDto) {
    return this.rooms.list(user, params);
  }

  @Get("all")
  listAll(@CurrentUser() user: AuthUser) {
    return this.rooms.listAll(user);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @ValidatedBody(CreateRoomDto) dto: CreateRoomDto) {
    return this.rooms.create(user, dto);
  }

  @Post("bulk")
  bulkAdd(@CurrentUser() user: AuthUser, @ValidatedBody(BulkAddRoomsDto) dto: BulkAddRoomsDto) {
    return this.rooms.bulkAdd(user, dto);
  }

  @Post("transfer")
  transfer(@CurrentUser() user: AuthUser, @ValidatedBody(RoomTransferDto) dto: RoomTransferDto) {
    return this.rooms.transfer(user, dto);
  }

  @Put(":id/fee-settings")
  @Roles("owner")
  updateFeeSettings(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @ValidatedBody(UpdateRoomFeeDto) dto: UpdateRoomFeeDto,
  ) {
    return this.rooms.updateFeeSettings(user, id, dto);
  }

  @Delete(":id")
  @Roles("owner")
  remove(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.rooms.remove(user, id);
  }
}
