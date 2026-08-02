import { ApprovalType } from "@prisma/client";
import { IsEnum, IsNotEmpty, IsObject, IsOptional, IsString } from "class-validator";
import { ListParamsDto } from "../common/pagination";

export class ApprovalListParamsDto extends ListParamsDto {
  @IsOptional()
  @IsString()
  status?: string; // "pending" | "approved" | "rejected" | "all"

  @IsOptional()
  @IsString()
  type?: string; // ApprovalType | undefined
}

export class CreateApprovalDto {
  @IsEnum(ApprovalType)
  type!: ApprovalType;

  @IsString()
  @IsNotEmpty()
  entityType!: string;

  @IsOptional()
  @IsString()
  entityId?: string;

  @IsString()
  @IsNotEmpty()
  summary!: string;

  /** Opaque snapshot of the pending action; this module never interprets it. */
  @IsOptional()
  @IsObject()
  payload?: Record<string, unknown>;
}

export class DecideApprovalDto {
  @IsOptional()
  @IsString()
  decisionNote?: string;
}
