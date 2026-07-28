import {
  Controller,
  Get,
  Inject,
  Param,
  Post,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiError } from "../common/api-error";
import type { AuthUser } from "../common/auth-user";
import { CurrentUser } from "../common/decorators";
import { FilesService, MAX_FILE_SIZE_BYTES } from "./files.service";

/**
 * Every route here sits behind the global JWT guard — files are never
 * exposed on a public static path (frozen decision 4).
 */
@Controller()
export class FilesController {
  constructor(@Inject(FilesService) private readonly files: FilesService) {}

  /** Generic authenticated upload (complaint attachments etc.) → { key, url }. */
  @Post("uploads")
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: MAX_FILE_SIZE_BYTES } }))
  async upload(@CurrentUser() user: AuthUser, @UploadedFile() file?: Express.Multer.File) {
    if (!file) throw ApiError.badRequest("No file provided");
    return this.files.store(user, file);
  }

  /** Authenticated file fetch. `:orgId/:name` mirrors the storage key. */
  @Get("files/:orgId/:name")
  async serve(
    @CurrentUser() user: AuthUser,
    @Param("orgId") orgId: string,
    @Param("name") name: string,
  ): Promise<StreamableFile> {
    const { stream, contentType } = await this.files.open(user, `${orgId}/${name}`);
    return new StreamableFile(stream, { type: contentType });
  }
}
