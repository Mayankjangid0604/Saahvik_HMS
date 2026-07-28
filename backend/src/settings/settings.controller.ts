import { Body, Controller, Get, Inject, Post, Put } from "@nestjs/common";
import { AdmissionFieldType } from "@prisma/client";
import { Type } from "class-transformer";
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from "class-validator";
import type { AuthUser } from "../common/auth-user";
import { CurrentUser, Roles } from "../common/decorators";
import { ValidatedBody, ValidatedQuery } from "../common/validated";
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
  constructor(@Inject(SettingsService) private readonly settings: SettingsService) {}

  @Get("org")
  getOrg(@CurrentUser() user: AuthUser) {
    return this.settings.getOrg(user);
  }

  @Put("org")
  @Roles("owner")
  updateOrg(@CurrentUser() user: AuthUser, @ValidatedBody(UpdateOrgDto) dto: UpdateOrgDto) {
    return this.settings.updateOrg(user, dto);
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
