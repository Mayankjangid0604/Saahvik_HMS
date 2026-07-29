import { RoomType, FeeMode } from "@prisma/client";
import { Type } from "class-transformer";
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  ValidateIf,
} from "class-validator";
import { ListParamsDto } from "../common/pagination";

export class RoomListParamsDto extends ListParamsDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  floor?: number;

  @IsOptional()
  @IsString()
  type?: string; // RoomType | "all"
}

export class CreateRoomDto {
  @IsString()
  @IsNotEmpty()
  number!: string;

  @Type(() => Number)
  @IsInt()
  floor!: number;

  @IsEnum(RoomType)
  type!: RoomType;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  capacity!: number;

  @IsEnum(FeeMode)
  feeMode!: FeeMode;

  @ValidateIf((o: CreateRoomDto) => o.feeMode === "fixed")
  @Type(() => Number)
  @IsInt()
  @Min(0)
  fixedFeeAmountPaisa!: number | null;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class BulkAddRoomsDto {
  @Type(() => Number)
  @IsInt()
  floor!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  startNumber!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  count!: number;

  @IsEnum(RoomType)
  type!: RoomType;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  capacity!: number;

  @IsEnum(FeeMode)
  feeMode!: FeeMode;

  @ValidateIf((o: BulkAddRoomsDto) => o.feeMode === "fixed")
  @Type(() => Number)
  @IsInt()
  @Min(0)
  fixedFeeAmountPaisa!: number | null;
}

export class UpdateRoomFeeDto {
  @IsEnum(FeeMode)
  feeMode!: FeeMode;

  @ValidateIf((o: UpdateRoomFeeDto) => o.feeMode === "fixed")
  @Type(() => Number)
  @IsInt()
  @Min(0)
  fixedFeeAmountPaisa!: number | null;
}

export class RoomTransferDto {
  @IsString()
  @IsNotEmpty()
  residentId!: string;

  @IsString()
  @IsNotEmpty()
  toRoomId!: string;

  @IsString()
  @IsNotEmpty()
  toBedId!: string;

  @IsString()
  @IsNotEmpty()
  effectiveDate!: string;

  @IsOptional()
  @IsString()
  reason?: string;
}
