import { PaymentMethod } from "@prisma/client";
import { Type } from "class-transformer";
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from "class-validator";
import { ListParamsDto } from "../common/pagination";

export class ExpenseListParamsDto extends ListParamsDto {
  @IsOptional()
  @IsString()
  categoryId?: string; // category id | "all"

  @IsOptional()
  @IsString()
  method?: string; // PaymentMethod | "all"

  @IsOptional()
  @IsString()
  from?: string;

  @IsOptional()
  @IsString()
  to?: string;
}

export class CreateExpenseDto {
  @IsString()
  @IsNotEmpty()
  categoryId!: string;

  @IsString()
  @IsNotEmpty()
  label!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  amountPaisa!: number;

  @IsEnum(PaymentMethod)
  method!: PaymentMethod;

  @IsString()
  @IsNotEmpty()
  spentAt!: string;

  @IsOptional()
  @IsString()
  notes?: string;

  /** Storage key from a completed upload; served via authenticated /files/:key. */
  @IsOptional()
  @IsString()
  attachmentKey?: string;
}

export class CreateExpenseCategoryDto {
  @IsString()
  @IsNotEmpty()
  name!: string;
}

export class UpdateExpenseCategoryDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
