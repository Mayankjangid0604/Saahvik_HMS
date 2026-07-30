import { IsNotEmpty, IsOptional, IsString } from "class-validator";

export class CreateWingDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  /** Defaults to the org's (single) hostel when omitted. */
  @IsOptional()
  @IsString()
  hostelId?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateWingDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
