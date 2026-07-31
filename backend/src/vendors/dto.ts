import { VendorCategory } from "@prisma/client";
import { Transform, Type } from "class-transformer";
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from "class-validator";
import { ListParamsDto } from "../common/pagination";

export class VendorListParamsDto extends ListParamsDto {
  @IsOptional()
  @IsString()
  category?: string; // VendorCategory | "all"

  // Query filter: "true" | "false" (absent => no active filter).
  @IsOptional()
  @Transform(({ value }) => (value === "true" || value === true ? true : false))
  @IsBoolean()
  active?: boolean;
}

export class CreateVendorDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsString()
  contactPerson?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsEnum(VendorCategory)
  category?: VendorCategory;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateVendorDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsString()
  contactPerson?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsEnum(VendorCategory)
  category?: VendorCategory;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreatePurchaseDto {
  @IsString()
  @IsNotEmpty()
  vendorId!: string;

  @IsString()
  @IsNotEmpty()
  label!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  amountPaisa!: number;

  @IsOptional()
  @IsEnum(VendorCategory)
  category?: VendorCategory;

  @IsString()
  @IsNotEmpty()
  purchasedAt!: string;

  @IsOptional()
  @IsString()
  invoiceRef?: string;

  /** Optional 1:1 link to an existing Expense (must belong to the org, unused). */
  @IsOptional()
  @IsString()
  expenseId?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  /** Storage key from a completed upload; served via authenticated /files/:key. */
  @IsOptional()
  @IsString()
  attachmentKey?: string;
}

export class PurchaseListParamsDto extends ListParamsDto {
  @IsOptional()
  @IsString()
  vendorId?: string;

  @IsOptional()
  @IsString()
  category?: string; // VendorCategory | "all"

  @IsOptional()
  @IsString()
  from?: string;

  @IsOptional()
  @IsString()
  to?: string;
}
