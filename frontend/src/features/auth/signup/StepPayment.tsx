import { useState } from "react";
import { CreditCard, IndianRupee, Lock } from "lucide-react";
import type { MockPaymentResult, PlanSelection } from "@/api/types";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/cn";
import { formatMoney } from "@/lib/format";
import { mockRazorpayPay } from "./mocks";

type Method = "card" | "upi";

/**
 * Razorpay-style checkout, entirely mock. The card/UPI fields are visual —
 * nothing entered here is processed or stored.
 *
 * TODO: replace with real Razorpay Checkout.js integration — requires backend
 * to create the order server-side (never trust a client-only amount) and
 * verify the payment signature via webhook before activating the subscription.
 */
export function StepPayment({
  selection,
  onSuccess,
  onBack,
}: {
  selection: PlanSelection;
  onSuccess: (result: MockPaymentResult) => void;
  onBack: () => void;
}) {
  const [method, setMethod] = useState<Method>("card");
  const [paying, setPaying] = useState(false);

  async function pay() {
    setPaying(true);
    const result = await mockRazorpayPay(selection.amountPaisa, method);
    onSuccess(result);
  }

  return (
    <div className="space-y-4">
      {/* Order summary */}
      <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted">Plan</span>
          <span className="font-medium text-ink">Basic</span>
        </div>
        <div className="mt-1.5 flex items-center justify-between text-sm">
          <span className="text-muted">Billing</span>
          <span className="font-medium text-ink capitalize">{selection.billingCycle}</span>
        </div>
        <div className="mt-1.5 flex items-center justify-between border-t border-slate-200 pt-1.5 text-sm">
          <span className="text-muted">Due today</span>
          <span className="font-semibold text-primary">{formatMoney(selection.amountPaisa)}</span>
        </div>
      </div>

      {/* Mock gateway panel */}
      <div className="overflow-hidden rounded-lg border border-slate-200">
        <div className="flex items-center justify-between bg-primary px-4 py-2.5">
          <span className="text-xs font-semibold text-white">Razorpay Checkout</span>
          <span className="rounded bg-white/15 px-1.5 py-0.5 text-[10px] font-medium text-white/80">
            MOCK — no real charge
          </span>
        </div>
        <div className="p-4">
          <div
            className="mb-3 grid grid-cols-2 gap-1 rounded-md border border-slate-200 p-1"
            role="radiogroup"
            aria-label="Payment method"
          >
            {(
              [
                ["card", "Card", CreditCard],
                ["upi", "UPI", IndianRupee],
              ] as const
            ).map(([id, label, Icon]) => (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={method === id}
                onClick={() => setMethod(id)}
                className={cn(
                  "inline-flex items-center justify-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
                  method === id ? "bg-primary text-white" : "text-muted hover:text-ink",
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            ))}
          </div>

          {method === "card" ? (
            <div className="space-y-2">
              <Input placeholder="Card number" inputMode="numeric" autoComplete="off" />
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder="MM / YY" inputMode="numeric" autoComplete="off" />
                <Input placeholder="CVV" type="password" maxLength={4} autoComplete="off" />
              </div>
              <Input placeholder="Name on card" autoComplete="off" />
            </div>
          ) : (
            <div className="space-y-2">
              <Input placeholder="yourname@upi" autoComplete="off" />
              <p className="text-[11px] text-muted">
                You'd approve the collect request in your UPI app.
              </p>
            </div>
          )}

          <Button type="button" className="mt-4 w-full" isLoading={paying} onClick={pay}>
            {paying ? "Processing…" : `Pay ${formatMoney(selection.amountPaisa)}`}
          </Button>
          <p className="mt-2 flex items-center justify-center gap-1 text-[11px] text-muted">
            <Lock className="h-3 w-3" /> This is a demo checkout — no money moves.
          </p>
        </div>
      </div>

      <div className="flex justify-start">
        <Button type="button" variant="ghost" onClick={onBack} disabled={paying}>
          Back
        </Button>
      </div>
    </div>
  );
}
