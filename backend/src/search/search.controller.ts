import { Controller, Delete, Get, Inject, Param, Post } from "@nestjs/common";
import type { AuthUser } from "../common/auth-user";
import { CurrentUser } from "../common/decorators";
import { ValidatedBody, ValidatedQuery } from "../common/validated";
import { CreateSavedSearchDto, GlobalSearchDto } from "./dto";
import { SearchService } from "./search.service";

/**
 * Both roles may search — no blanket @Roles here. The role-based filtering
 * (e.g. staff cannot see `staff` results) happens INSIDE SearchService.
 */
@Controller("search")
export class SearchController {
  constructor(@Inject(SearchService) private readonly search: SearchService) {}

  @Get()
  globalSearch(@CurrentUser() user: AuthUser, @ValidatedQuery(GlobalSearchDto) dto: GlobalSearchDto) {
    return this.search.globalSearch(user, dto);
  }

  @Get("saved")
  listSaved(@CurrentUser() user: AuthUser) {
    return this.search.listSaved(user);
  }

  @Post("saved")
  createSaved(@CurrentUser() user: AuthUser, @ValidatedBody(CreateSavedSearchDto) dto: CreateSavedSearchDto) {
    return this.search.createSaved(user, dto);
  }

  @Delete("saved/:id")
  deleteSaved(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.search.deleteSaved(user, id);
  }
}
