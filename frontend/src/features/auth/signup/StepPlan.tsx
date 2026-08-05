import { useState } from "react";
import { Check } from "lucide-react";
import type { BillingCycle, PlanSelection } from "@/api/types";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { formatMoney } from "@/lib/format";
import { PLANS } from "@/pages/Landing/plans";

/* Same Basic feature list the landing page's pricing section shows. */
const basicPlan = PLANS.find((p) => p.id === "basic")!;

/* Amounts due today, in paisa — matching the published landing page prices. */
export const BASIC_MONTHLY_PAISA = 99_900; // ₹999
export const BASIC_HALF_YEARLY_PAISA = 529_900; // ₹5,299
export const BASIC_YEARLY_PAISA = 1_009_900; // ₹10,099

export function StepPlan({
  onSelect,
  onBack,
}: {
  onSelect: (selection: PlanSelection) => void;
  onBack: () => void;
}) {
  const [cycle, setCycle] = useState<BillingCycle>("monthly");
  const paidAmount =
    cycle === "monthly"
      ? BASIC_MONTHLY_PAISA
      : cycle === "half_yearly"
        ? BASIC_HALF_YEARLY_PAISA
        : BASIC_YEARLY_PAISA;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        {/* Free pilot — the primary, highlighted choice. */}
        <div className="flex flex-col rounded-lg border-2 border-accent bg-accent/5 p-4">
          <span className="self-start rounded-full bg-accent px-2 py-0.5 text-[10px] font-semibold tracking-wide text-white uppercase">
            Recommended
          </span>
          <p className="mt-2 text-sm font-semibold text-ink">Basic — Free 6-month pilot</p>
          <p className="mt-1 text-xs text-muted">
            No payment required today. {formatMoney(BASIC_MONTHLY_PAISA)}/month after
            your pilot ends, cancel anytime.
          </p>
          <p className="mt-3 text-2xl font-semibold text-primary">
            ₹0 <span className="text-xs font-normal text-muted">today</span>
          </p>
          <Button
            type="button"
            className="mt-4 w-full"
            onClick={() =>
              onSelect({ planId: "basic", mode: "pilot", billingCycle: null, amountPaisa: 0 })
            }
          >
            Start free pilot
          </Button>
        </div>

        {/* Pay now */}
        <div className="flex flex-col rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-sm font-semibold text-ink">Basic — Pay now</p>
          <div
            className="mt-2 inline-flex self-start rounded-md border border-slate-200 p-0.5"
            role="radiogroup"
            aria-label="Billing cycle"
          >
            {(
              [
                ["monthly", "Monthly"],
                ["half_yearly", "Half-Yearly"],
                ["yearly", "Yearly"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={cycle === id}
                onClick={() => setCycle(id)}
                className={cn(
                  "rounded px-2.5 py-1 text-xs font-medium",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
                  cycle === id ? "bg-primary text-white" : "text-muted hover:text-ink",
                )}
              >
                {label}
              </button>
            ))}
          </div>
          <p className="mt-3 text-2xl font-semibold text-primary">
            {formatMoney(paidAmount)}
            <span className="text-xs font-normal text-muted">
              /{cycle === "monthly" ? "month" : cycle === "half_yearly" ? "6 months" : "year"}
            </span>
          </p>
          {cycle === "half_yearly" && (
            <p className="text-xs text-emerald-700">≈ ₹883/month effective</p>
          )}
          {cycle === "yearly" && (
            <p className="text-xs text-emerald-700">≈ ₹842/month effective</p>
          )}
          <Button
            type="button"
            variant="secondary"
            className="mt-4 w-full"
            onClick={() =>
              onSelect({
                planId: "basic",
                mode: "paid",
                billingCycle: cycle,
                amountPaisa: paidAmount,
              })
            }
          >
            Continue to payment
          </Button>
        </div>
      </div>

      <details className="rounded-md border border-slate-200 bg-slate-50/50 px-3 py-2">
        <summary className="cursor-pointer text-xs font-medium text-slate-600">
          What's included in Basic
        </summary>
        <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
          {basicPlan.features.map((feature) => (
            <li key={feature} className="flex items-start gap-1.5 text-xs text-ink">
              <Check className="mt-0.5 h-3 w-3 flex-none text-accent" />
              {feature}
            </li>
          ))}
        </ul>
      </details>

      <p className="text-xs text-muted">
        Beginner, Professional, and Business — for multi-building and
        multi-property operations — launching after Basic. We'll notify you.
      </p>

      <div className="flex justify-start">
        <Button type="button" variant="ghost" onClick={onBack}>
          Back
        </Button>
      </div>
    </div>
  );
}
