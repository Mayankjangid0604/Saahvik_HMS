import { IdDocumentType, Occupation, ResidentStatus } from "@prisma/client";
import { Type } from "class-transformer";
import {
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from "class-validator";
import { ListParamsDto } from "../common/pagination";

export class ResidentListParamsDto extends ListParamsDto {
  @IsOptional()
  @IsString()
  status?: string; // ResidentStatus | "all"

  @IsOptional()
  @IsString()
  roomId?: string;
}

export class CreateResidentDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  phone!: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsEnum(ResidentStatus)
  status?: ResidentStatus;

  @IsOptional()
  @IsString()
  roomId?: string;

  @IsOptional()
  @IsString()
  bedId?: string;

  @IsString()
  @IsNotEmpty()
  joinDate!: string;

  @IsOptional()
  @IsString()
  guardianName?: string;

  @IsOptional()
  @IsString()
  guardianPhone?: string;

  @IsOptional()
  @IsString()
  permanentAddress?: string;

  @IsOptional()
  @IsEnum(IdDocumentType)
  idType?: IdDocumentType;

  @IsOptional()
  @IsString()
  idNumber?: string;

  @IsOptional()
  @IsEnum(Occupation)
  occupation?: Occupation;

  @IsOptional()
  @IsString()
  institutionOrCompany?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  monthlyFeePaisa?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  depositPaisa?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  // ID document expiry (feature 4) — ISO date string, nullable.
  @IsOptional()
  @IsString()
  idDocExpiryDate?: string;

  // Medical / dietary info (feature 7) — sensitive, same access as other PII.
  @IsOptional() @IsString() bloodGroup?: string;
  @IsOptional() @IsString() allergies?: string;
  @IsOptional() @IsString() dietaryPreference?: string;
  @IsOptional() @IsString() medicalNotes?: string;
  @IsOptional() @IsString() emergencyContactName?: string;
  @IsOptional() @IsString() emergencyContactPhone?: string;

  @IsOptional()
  @IsObject()
  admissionData?: Record<string, unknown>;
}

/** All fields optional on update (partial of CreateResidentDto + exitDate). */
export class UpdateResidentDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  phone?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsEnum(ResidentStatus)
  status?: ResidentStatus;

  @IsOptional()
  @IsString()
  joinDate?: string;

  @IsOptional()
  @IsString()
  exitDate?: string;

  @IsOptional()
  @IsString()
  guardianName?: string;

  @IsOptional()
  @IsString()
  guardianPhone?: string;

  @IsOptional()
  @IsString()
  permanentAddress?: string;

  @IsOptional()
  @IsEnum(IdDocumentType)
  idType?: IdDocumentType;

  @IsOptional()
  @IsString()
  idNumber?: string;

  @IsOptional()
  @IsEnum(Occupation)
  occupation?: Occupation;

  @IsOptional()
  @IsString()
  institutionOrCompany?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  monthlyFeePaisa?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  depositPaisa?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  idDocExpiryDate?: string;

  @IsOptional() @IsString() bloodGroup?: string;
  @IsOptional() @IsString() allergies?: string;
  @IsOptional() @IsString() dietaryPreference?: string;
  @IsOptional() @IsString() medicalNotes?: string;
  @IsOptional() @IsString() emergencyContactName?: string;
  @IsOptional() @IsString() emergencyContactPhone?: string;

  @IsOptional()
  @IsObject()
  admissionData?: Record<string, unknown>;
}

export class CheckoutDto {
  @IsString()
  @IsNotEmpty()
  exitDate!: string;
}

export class BulkImportRowDto {
  @IsString()
  name!: string;

  @IsString()
  phone!: string;

  @IsOptional()
  @IsString()
  roomNumber?: string;

  @IsOptional()
  @IsString()
  bedLabel?: string;

  @Type(() => Number)
  @Min(0)
  monthlyFeeRupees!: number;

  @IsOptional()
  @IsString()
  joinDate?: string;

  @IsOptional()
  admissionData?: Record<string, string>;
}

export class BulkImportDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkImportRowDto)
  rows!: BulkImportRowDto[];
}
