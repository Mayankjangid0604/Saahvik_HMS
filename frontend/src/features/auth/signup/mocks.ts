/**
 * Mock auth/verification/payment flows for the signup wizard and login page.
 * No OAuth, OTP, or payment provider exists yet — every function here fakes
 * the provider round-trip with a delay so the UI behaves like the real thing.
 */
import type {
  GoogleAuthResult,
  MockPaymentResult,
  OtpChannel,
  OtpSendResult,
  OtpVerifyResult,
} from "@/api/types";

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

// TODO: replace with real Google OAuth (Google Identity Services), needs a
// registered OAuth client ID + authorized redirect URI. The result must then
// be exchanged server-side for a backend-issued JWT — the mock session built
// from this result will NOT authenticate against the real API.
export async function mockGoogleSignIn(): Promise<GoogleAuthResult> {
  await delay(800); // simulated popup/redirect round-trip
  return {
    provider: "google",
    googleId: "mock-google-sub-108234",
    name: "Mayank Jangid",
    email: "owner.google@saahvik.dev",
    emailVerified: true,
  };
}

// TODO: replace with real SMS OTP (reseller: MSG91/Gupshup per cost-basis doc)
// and real email OTP delivery (SES) once backend exists.
export async function mockSendOtp(
  channel: OtpChannel,
  destination: string,
): Promise<OtpSendResult> {
  await delay(600);
  return { channel, sent: true, destination };
}

// TODO: same as mockSendOtp — verification must happen server-side; the
// "any code except 000000" rule exists only so the failure path is testable.
export async function mockVerifyOtp(
  channel: OtpChannel,
  code: string,
): Promise<OtpVerifyResult> {
  await delay(700);
  if (code === "000000") {
    return { channel, verified: false, error: "That code didn't match. Try again." };
  }
  return { channel, verified: true };
}

// TODO: replace with real Razorpay Checkout.js integration — requires backend
// to create the order server-side (never trust a client-only amount) and
// verify the payment signature via webhook before activating the subscription.
export async function mockRazorpayPay(
  amountPaisa: number,
  method: "card" | "upi",
): Promise<MockPaymentResult> {
  await delay(1400); // simulated gateway processing
  return {
    status: "success",
    paymentId: `pay_mock_${Date.now().toString(36)}`,
    method,
    amountPaisa,
  };
}
