import { HttpStatus } from "@nestjs/common";
import type { AdmissionFieldDefinition } from "@prisma/client";
import { ApiError } from "../common/api-error";

/**
 * Business rule 5: admissionData is validated server-side against the org's
 * own field definitions on every resident create/update.
 * - every key must correspond to a field belonging to the same org
 * - required fields must be present and non-empty
 * - select values must exist in the field's options
 * - aadhaar/pincode format checks, plus per-type sanity checks
 */
export function validateAdmissionData(
  fields: AdmissionFieldDefinition[],
  data: Record<string, unknown>,
  { partial = false }: { partial?: boolean } = {},
): void {
  const byKey = new Map(fields.map((f) => [f.key, f]));

  for (const key of Object.keys(data)) {
    if (!byKey.has(key)) {
      throw new ApiError(
        HttpStatus.UNPROCESSABLE_ENTITY,
        "UNKNOWN_ADMISSION_FIELD",
        `"${key}" is not a field on this organization's admission form`,
        { key },
      );
    }
  }

  for (const field of fields) {
    const raw = data[field.key];
    const value = raw == null ? "" : String(raw).trim();

    if (field.required && field.fieldType !== "auto") {
      // On partial updates only the supplied keys are checked.
      if ((!partial || field.key in data) && value === "") {
        throw new ApiError(
          HttpStatus.UNPROCESSABLE_ENTITY,
          "ADMISSION_FIELD_REQUIRED",
          `${field.label} is required`,
          { key: field.key },
        );
      }
    }
    if (value === "") continue;

    if (field.fieldType === "select") {
      const options = Array.isArray(field.options) ? (field.options as string[]) : [];
      if (!options.includes(value)) {
        throw new ApiError(
          HttpStatus.UNPROCESSABLE_ENTITY,
          "ADMISSION_FIELD_INVALID_OPTION",
          `"${value}" is not a valid choice for ${field.label}`,
          { key: field.key, options },
        );
      }
    }
    if (field.fieldType === "number" && Number.isNaN(Number(value))) {
      invalid(field.key, `${field.label} must be a number`);
    }
    if (field.fieldType === "date" && Number.isNaN(Date.parse(value))) {
      invalid(field.key, `${field.label} must be a valid date`);
    }
    if (field.fieldType === "phone" && !/^\+?[\d\s-]{7,15}$/.test(value)) {
      invalid(field.key, `${field.label} must be a valid phone number`);
    }
    if (field.validation === "aadhaar" && !/^\d{12}$/.test(value.replace(/\s/g, ""))) {
      invalid(field.key, `${field.label} must be a 12-digit Aadhaar number`);
    }
    if (field.validation === "pincode" && !/^\d{6}$/.test(value)) {
      invalid(field.key, `${field.label} must be a 6-digit pincode`);
    }
  }
}

function invalid(key: string, message: string): never {
  throw new ApiError(HttpStatus.UNPROCESSABLE_ENTITY, "ADMISSION_FIELD_INVALID", message, { key });
}
