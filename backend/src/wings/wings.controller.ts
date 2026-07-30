import { Controller, Delete, Get, Inject, Param, Post, Put } from "@nestjs/common";
import type { AuthUser } from "../common/auth-user";
import { CurrentUser, Roles } from "../common/decorators";
import { ValidatedBody } from "../common/validated";
import { CreateWingDto, UpdateWingDto } from "./dto";
import { WingsService } from "./wings.service";

@Controller("wings")
export class WingsController {
  constructor(@Inject(WingsService) private readonly wings: WingsService) {}

  /** Readable by staff (needed for the room-create wing picker). */
  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.wings.list(user);
  }

  @Post()
  @Roles("owner")
  create(@CurrentUser() user: AuthUser, @ValidatedBody(CreateWingDto) dto: CreateWingDto) {
    return this.wings.create(user, dto);
  }

  @Put(":id")
  @Roles("owner")
  update(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @ValidatedBody(UpdateWingDto) dto: UpdateWingDto,
  ) {
    return this.wings.update(user, id, dto);
  }

  @Delete(":id")
  @Roles("owner")
  remove(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.wings.remove(user, id);
  }
}
