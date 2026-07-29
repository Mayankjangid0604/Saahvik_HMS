import { DiscountKind, FeeCycle, PaymentMethod, PaymentType } from "@prisma/client";
import { Type } from "class-transformer";
import {
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from "class-validator";
import { ListParamsDto } from "../common/pagination";

// ---------- payments ----------

export class PaymentListParamsDto extends ListParamsDto {
  @IsOptional()
  @IsString()
  method?: string; // PaymentMethod | "all"

  @IsOptional()
  @IsString()
  type?: string; // PaymentType | "all"

  @IsOptional()
  @IsString()
  from?: string;

  @IsOptional()
  @IsString()
  to?: string;
}

export class RecordPaymentDto {
  @IsString()
  @IsNotEmpty()
  residentId!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  amountPaisa!: number;

  @IsEnum(PaymentMethod)
  method!: PaymentMethod;

  @IsEnum(PaymentType)
  type!: PaymentType;

  @IsString()
  @IsNotEmpty()
  paidAt!: string;

  @IsOptional()
  @IsString()
  periodMonth?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class RefundPaymentDto {
  @IsString()
  @IsNotEmpty()
  paymentId!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  amountPaisa!: number;

  @IsString()
  @IsNotEmpty()
  reason!: string;
}

// ---------- fee structures ----------

export class CreateFeeStructureDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  amountPaisa!: number;

  @IsEnum(FeeCycle)
  cycle!: FeeCycle;

  @IsOptional()
  @IsString()
  description?: string;
}

export class AssignFeeDto {
  @IsString()
  @IsNotEmpty()
  feeStructureId!: string;

  @IsArray()
  @IsString({ each: true })
  residentIds!: string[];

  @IsString()
  @IsNotEmpty()
  startDate!: string;
}

// ---------- invoices ----------

export class InvoiceItemDto {
  @IsString()
  @IsNotEmpty()
  description!: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  amountPaisa!: number;
}

export class CreateInvoiceDto {
  @IsString()
  @IsNotEmpty()
  residentId!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InvoiceItemDto)
  items!: InvoiceItemDto[];

  @IsString()
  @IsNotEmpty()
  dueDate!: string;
}

export class InvoiceListParamsDto extends ListParamsDto {
  @IsOptional()
  @IsString()
  status?: string; // frontend InvoiceStatus | "all"
}

// ---------- deposits ----------

export class CreateDepositDto {
  @IsString()
  @IsNotEmpty()
  residentId!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  amountPaisa!: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class DepositListParamsDto extends ListParamsDto {
  @IsOptional()
  @IsString()
  status?: string; // DepositStatus | "all"
}

export class RefundDepositDto {
  /** Omit for a full refund of the remaining amount. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  amountPaisa?: number;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class ForfeitDepositDto {
  @IsOptional()
  @IsString()
  reason?: string;
}

// ---------- discounts ----------

export class CreateDiscountDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsEnum(DiscountKind)
  kind!: DiscountKind;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  value!: number;

  @IsOptional()
  @IsString()
  validTill?: string;
}

export class ApplyDiscountDto {
  @IsArray()
  @IsString({ each: true })
  residentIds!: string[];
}
