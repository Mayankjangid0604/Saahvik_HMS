import { Type } from "class-transformer";
import { IsInt, IsNotEmpty, IsString, Matches, Max, MaxLength, Min } from "class-validator";

/**
 * Payload of the public landing-page callback form. Every field is required —
 * the form marks all four `required`, and a lead without a phone number is
 * not actionable.
 */
export class CreateContactRequestDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  hostelName!: string;

  /** Digits, spaces, and the usual separators; 8–20 chars covers +91 forms. */
  @IsString()
  @IsNotEmpty()
  @Matches(/^[+\d][\d\s\-()]{7,19}$/, {
    message: "phone must be a valid phone number",
  })
  phone!: string;

  // Frozen decision 5: tsx strips design:type metadata, so the number
  // conversion must be declared explicitly rather than inferred.
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100_000)
  beds!: number;
}
