import {
  Body,
  Controller,
  Get,
  Inject,
  Post,
  Put,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { AdmissionFieldType } from "@prisma/client";
import { Type } from "class-transformer";
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsHexColor,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from "class-validator";
import { ApiError } from "../common/api-error";
import type { AuthUser } from "../common/auth-user";
import { CurrentUser, Roles } from "../common/decorators";
import { ValidatedBody, ValidatedQuery } from "../common/validated";
import { FilesService, MAX_FILE_SIZE_BYTES } from "../files/files.service";
import { SettingsService } from "./settings.service";

class UpdateOrgDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() hostelName?: string;
  @IsOptional() @IsString() addressLine?: string;
  @IsOptional() @IsString() city?: string;
  @IsOptional() @IsString() state?: string;
  @IsOptional() @IsString() pincode?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() email?: string;
  @IsOptional() @IsString() gstin?: string;
  // GST config (feature 8).
  @IsOptional() @IsBoolean() gstEnabled?: boolean;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(28) gstRatePercent?: number;
  @IsOptional() @IsBoolean() gstInclusive?: boolean;
  // Brand theme colors (feature 17).
  @IsOptional() @IsHexColor() themeColorPrimary?: string;
  @IsOptional() @IsHexColor() themeColorAccent?: string;
  @IsOptional() @IsBoolean() setupComplete?: boolean;
}

class AdmissionFieldDto {
  @IsString()
  @IsNotEmpty()
  key!: string;

  @IsString()
  @IsNotEmpty()
  label!: string;

  @IsEnum(AdmissionFieldType)
  type!: AdmissionFieldType;

  @IsBoolean()
  required!: boolean;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  options?: string[];

  @IsOptional()
  @IsIn(["aadhaar", "pincode"])
  validation?: "aadhaar" | "pincode";

  @IsOptional()
  @IsIn(["today", "formNo"])
  autoFill?: "today" | "formNo";
}

class AdmissionFormConfigDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AdmissionFieldDto)
  fields!: AdmissionFieldDto[];
}

class NotificationPreferencesDto {
  @IsOptional() @IsBoolean() duesReminder?: boolean;
  @IsOptional() @IsBoolean() paymentReceived?: boolean;
  @IsOptional() @IsBoolean() newComplaint?: boolean;
  @IsOptional() @IsBoolean() complaintResolved?: boolean;
  @IsOptional() @IsBoolean() weeklySummary?: boolean;
  @IsOptional() @IsBoolean() channelInApp?: boolean;
  @IsOptional() @IsBoolean() channelEmail?: boolean;
}

@Controller("settings")
export class SettingsController {
  constructor(
    @Inject(SettingsService) private readonly settings: SettingsService,
    @Inject(FilesService) private readonly files: FilesService,
  ) {}

  @Get("org")
  getOrg(@CurrentUser() user: AuthUser) {
    return this.settings.getOrg(user);
  }

  @Put("org")
  @Roles("owner")
  updateOrg(@CurrentUser() user: AuthUser, @ValidatedBody(UpdateOrgDto) dto: UpdateOrgDto) {
    return this.settings.updateOrg(user, dto);
  }

  /** Upload the org logo for PDF/receipt + UI branding (feature 17). Owner only. */
  @Post("org/logo")
  @Roles("owner")
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: MAX_FILE_SIZE_BYTES } }))
  async uploadLogo(@CurrentUser() user: AuthUser, @UploadedFile() file?: Express.Multer.File) {
    if (!file) throw ApiError.badRequest("No file provided");
    const { key } = await this.files.store(user, file);
    return this.settings.setLogo(user, key);
  }

  /** Billing/subscription is owner only (access matrix). */
  @Get("subscription")
  @Roles("owner")
  getSubscription(@CurrentUser() user: AuthUser) {
    return this.settings.getSubscription(user);
  }

  @Get("admission-form-fields")
  getAdmissionForm(@CurrentUser() user: AuthUser) {
    return this.settings.getAdmissionForm(user);
  }

  @Put("admission-form-fields")
  @Roles("owner")
  updateAdmissionForm(@CurrentUser() user: AuthUser, @ValidatedBody(AdmissionFormConfigDto) dto: AdmissionFormConfigDto) {
    return this.settings.updateAdmissionForm(user, dto.fields);
  }

  @Post("admission-form-fields/reset")
  @Roles("owner")
  resetAdmissionForm(@CurrentUser() user: AuthUser) {
    return this.settings.resetAdmissionForm(user);
  }

  @Get("notifications")
  getNotificationPreferences(@CurrentUser() user: AuthUser) {
    return this.settings.getNotificationPreferences(user);
  }

  @Put("notifications")
  updateNotificationPreferences(
    @CurrentUser() user: AuthUser,
    @ValidatedBody(NotificationPreferencesDto) dto: NotificationPreferencesDto,
  ) {
    return this.settings.updateNotificationPreferences(user, dto);
  }
}
