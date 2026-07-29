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
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiError } from "../common/api-error";
import type { AuthUser } from "../common/auth-user";
import { CurrentUser, Roles } from "../common/decorators";
import { ValidatedBody, ValidatedQuery } from "../common/validated";
import { FilesService, MAX_FILE_SIZE_BYTES } from "../files/files.service";
import {
  BulkImportDto,
  CheckoutDto,
  CreateResidentDto,
  ResidentListParamsDto,
  UpdateResidentDto,
} from "./dto";
import { ResidentsService } from "./residents.service";

@Controller("residents")
export class ResidentsController {
  constructor(
    @Inject(ResidentsService) private readonly residents: ResidentsService,
    @Inject(FilesService) private readonly files: FilesService,
  ) {}

  @Get()
  list(@CurrentUser() user: AuthUser, @ValidatedQuery(ResidentListParamsDto) params: ResidentListParamsDto) {
    return this.residents.list(user, params);
  }

  @Get("all-active")
  listAllActive(@CurrentUser() user: AuthUser) {
    return this.residents.listAllActive(user);
  }

  @Get(":id")
  get(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.residents.get(user, id);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @ValidatedBody(CreateResidentDto) dto: CreateResidentDto) {
    return this.residents.create(user, dto);
  }

  @Post("import")
  bulkImport(@CurrentUser() user: AuthUser, @ValidatedBody(BulkImportDto) dto: BulkImportDto) {
    return this.residents.bulkImport(user, dto);
  }

  @Put(":id")
  update(@CurrentUser() user: AuthUser, @Param("id") id: string, @ValidatedBody(UpdateResidentDto) dto: UpdateResidentDto) {
    return this.residents.update(user, id, dto);
  }

  @Post(":id/checkout")
  checkout(@CurrentUser() user: AuthUser, @Param("id") id: string, @ValidatedBody(CheckoutDto) dto: CheckoutDto) {
    return this.residents.checkout(user, id, dto);
  }

  /** Resident deletion is owner only (access matrix) — staff may view, never delete. */
  @Delete(":id")
  @Roles("owner")
  remove(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.residents.remove(user, id);
  }

  @Post(":id/photo")
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: MAX_FILE_SIZE_BYTES } }))
  async uploadPhoto(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file) throw ApiError.badRequest("No file provided");
    const { key } = await this.files.store(user, file);
    return this.residents.setPhoto(user, id, key);
  }

  @Post(":id/id-doc")
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: MAX_FILE_SIZE_BYTES } }))
  async uploadIdDoc(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file) throw ApiError.badRequest("No file provided");
    const { key } = await this.files.store(user, file);
    return this.residents.setIdDoc(user, id, key);
  }
}
