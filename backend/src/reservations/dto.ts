import { Type } from "class-transformer";
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from "class-validator";
import { ListParamsDto } from "../common/pagination";

export class ReservationListParamsDto extends ListParamsDto {
  @IsOptional()
  @IsString()
  status?: string; // ReservationStatus | "all"

  @IsOptional()
  @IsString()
  roomId?: string;
}

export class CreateReservationDto {
  @IsString()
  @IsNotEmpty()
  roomId!: string;

  @IsOptional()
  @IsString()
  bedId?: string;

  @IsString()
  @IsNotEmpty()
  residentName!: string;

  @IsString()
  @IsNotEmpty()
  residentPhone!: string;

  @IsString()
  @IsNotEmpty()
  expectedCheckIn!: string;

  @IsOptional()
  @IsString()
  holdUntil?: string;

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
}

export class UpdateReservationDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  roomId?: string;

  @IsOptional()
  @IsString()
  bedId?: string | null;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  residentName?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  residentPhone?: string;

  @IsOptional()
  @IsString()
  expectedCheckIn?: string;

  @IsOptional()
  @IsString()
  holdUntil?: string | null;

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
}

export class ConvertReservationDto {
  @IsString()
  @IsNotEmpty()
  bedId!: string;

  @IsString()
  @IsNotEmpty()
  joinDate!: string;

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
}
