/**
 * Mock payment flow for the signup wizard. No payment provider is connected
 * yet, so the gateway round-trip is faked with a delay to keep the UI honest
 * about its own states. Email verification is real — see emailOtp.api.ts.
 */
import type { MockPaymentResult } from "@/api/types";

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

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
