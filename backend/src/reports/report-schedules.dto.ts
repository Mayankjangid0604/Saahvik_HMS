import { ReportFormat, ScheduledReportType, ScheduleFrequency } from "@prisma/client";
import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
} from "class-validator";

export class CreateReportScheduleDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsEnum(ScheduledReportType)
  reportType!: ScheduledReportType;

  @IsOptional()
  @IsEnum(ReportFormat)
  format?: ReportFormat;

  @IsOptional()
  @IsEnum(ScheduleFrequency)
  frequency?: ScheduleFrequency;

  @IsOptional()
  @IsObject()
  filters?: Record<string, unknown>;
}

export class UpdateReportScheduleDto {
  @IsOptional() @IsString() @IsNotEmpty() name?: string;
  @IsOptional() @IsEnum(ReportFormat) format?: ReportFormat;
  @IsOptional() @IsEnum(ScheduleFrequency) frequency?: ScheduleFrequency;
  @IsOptional() @IsObject() filters?: Record<string, unknown>;
  @IsOptional() @IsBoolean() active?: boolean;
}
