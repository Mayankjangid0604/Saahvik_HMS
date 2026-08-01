import { ComplaintCategory, ComplaintPriority, PortalInviteKind } from "@prisma/client";
import {
  IsEnum,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from "class-validator";

// ---------- portal auth (public) ----------

export class PortalLoginDto {
  @IsString()
  @IsNotEmpty()
  phone!: string;

  @IsString()
  @IsNotEmpty()
  password!: string;
}

export class AcceptInviteDto {
  @IsString()
  @IsNotEmpty()
  token!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  // Guardian invites: the guardian's own name (required for guardian, ignored
  // for resident invites — a resident's name already exists on their record).
  @IsOptional()
  @IsString()
  name?: string;

  // Optional override of the guardian's login phone (defaults to the invite's).
  @IsOptional()
  @IsString()
  phone?: string;
}

export class PortalForgotPasswordDto {
  @IsString()
  @IsNotEmpty()
  phone!: string;

  @IsIn(["guardian", "resident"])
  kind!: "guardian" | "resident";
}

export class PortalResetPasswordDto {
  @IsString()
  @IsNotEmpty()
  token!: string;

  @IsIn(["guardian", "resident"])
  kind!: "guardian" | "resident";

  @IsString()
  @MinLength(8)
  newPassword!: string;
}

// ---------- portal self-service ----------

export class CreatePortalComplaintDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsNotEmpty()
  description!: string;

  @IsEnum(ComplaintCategory)
  category!: ComplaintCategory;

  @IsOptional()
  @IsEnum(ComplaintPriority)
  priority?: ComplaintPriority;
}

// ---------- staff-side guardian/portal admin ----------

export class CreateInviteDto {
  @IsEnum(PortalInviteKind)
  kind!: PortalInviteKind;

  // For guardian invites, optionally pre-fill the guardian's phone.
  @IsOptional()
  @IsString()
  phone?: string;
}

export class LinkGuardianDto {
  @IsString()
  @IsNotEmpty()
  residentId!: string;
}
