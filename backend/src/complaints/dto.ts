import { ComplaintCategory, ComplaintPriority, ComplaintStatus } from "@prisma/client";
import { Type } from "class-transformer";
import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from "class-validator";
import { ListParamsDto } from "../common/pagination";

export class ComplaintListParamsDto extends ListParamsDto {
  @IsOptional()
  @IsString()
  status?: string; // ComplaintStatus | "all"

  @IsOptional()
  @IsString()
  category?: string; // ComplaintCategory | "all"
}

export class ComplaintAttachmentDto {
  @IsString()
  @IsNotEmpty()
  fileName!: string;

  @IsString()
  @IsNotEmpty()
  fileType!: string;

  /** Storage key from POST /uploads. */
  @IsOptional()
  @IsString()
  key?: string;
}

export class CreateComplaintDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsNotEmpty()
  description!: string;

  @IsEnum(ComplaintCategory)
  category!: ComplaintCategory;

  @IsEnum(ComplaintPriority)
  priority!: ComplaintPriority;

  @IsOptional()
  @IsString()
  residentId?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ComplaintAttachmentDto)
  attachments?: ComplaintAttachmentDto[];
}

export class UpdateComplaintDto {
  @IsOptional()
  @IsEnum(ComplaintStatus)
  status?: ComplaintStatus;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsString()
  assignedToStaffId?: string;
}
