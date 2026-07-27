import { z } from "zod";

export const phoneSchema = z
  .string()
  .regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number");

export const emailSchema = z.string().email("Enter a valid email address");

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters");

/** Rupee amount entered in a form (string or number), must be positive. */
export const rupeeAmountSchema = z.coerce
  .number({ message: "Enter an amount" })
  .positive("Amount must be greater than zero");

export const requiredString = (label: string) =>
  z.string().trim().min(1, `${label} is required`);
