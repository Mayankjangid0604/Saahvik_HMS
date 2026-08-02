/**
 * Signup email verification. Both routes are public — the Owner row does not
 * exist until the wizard's final step, so verification is keyed by address
 * server-side (see backend EmailOtpService).
 */
import type { EmailOtpSendResult, EmailOtpVerifyResult } from "./types";
import { apiClient } from "./client";

export async function sendEmailOtp(email: string): Promise<EmailOtpSendResult> {
  const { data } = await apiClient.post<EmailOtpSendResult>("/auth/email-otp/send", { email });
  return data;
}

export async function verifyEmailOtp(
  email: string,
  code: string,
): Promise<EmailOtpVerifyResult> {
  const { data } = await apiClient.post<EmailOtpVerifyResult>("/auth/email-otp/verify", {
    email,
    code,
  });
  return data;
}
