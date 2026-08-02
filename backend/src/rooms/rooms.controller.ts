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
  BlockRoomDto,
  BulkAddRoomsDto,
  CreateRoomDto,
  RoomListParamsDto,
  RoomTransferDto,
  UpdateRoomDto,
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

  /** Floor-level grouping + per-floor occupancy summary (feature 1). */
  @Get("floors")
  floors(@CurrentUser() user: AuthUser) {
    return this.rooms.floorSummary(user);
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

  @Put(":id")
  update(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @ValidatedBody(UpdateRoomDto) dto: UpdateRoomDto,
  ) {
    return this.rooms.update(user, id, dto);
  }

  /** Toggle a maintenance hold on a room (feature 3). Owner only. */
  @Put(":id/block")
  @Roles("owner")
  setBlocked(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @ValidatedBody(BlockRoomDto) dto: BlockRoomDto,
  ) {
    return this.rooms.setBlocked(user, id, dto);
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
