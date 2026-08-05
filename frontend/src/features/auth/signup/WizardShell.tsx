import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Check } from "lucide-react";
import { cn } from "@/lib/cn";
import type { WizardStepId } from "./wizardStorage";

interface StepMeta {
  id: WizardStepId;
  label: string;
}

/**
 * Card layout for the signup wizard: brand header, step indicator, content.
 * The step list is dynamic — the payment step only appears on the paid path.
 */
export function WizardShell({
  steps,
  current,
  title,
  subtitle,
  children,
}: {
  steps: readonly StepMeta[];
  current: WizardStepId;
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  const currentIndex = steps.findIndex((s) => s.id === current);
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-surface px-4 py-8">
      <Link to="/" className="mb-6 flex items-center gap-2.5 no-underline">
        <img src="/brand/saahvik-mark.png" alt="" className="h-10 w-10 rounded-lg" />
        <div>
          <p className="text-lg font-semibold text-primary">Saahvik</p>
          <p className="text-xs text-muted">Hostel Management</p>
        </div>
      </Link>

      <ol
        aria-label="Signup progress"
        className="mb-5 flex w-full max-w-xl items-center justify-center gap-1 sm:gap-2"
      >
        {steps.map((step, i) => {
          const state = i < currentIndex ? "done" : i === currentIndex ? "current" : "todo";
          return (
            <li key={step.id} className="flex min-w-0 items-center gap-1 sm:gap-2">
              {i > 0 && (
                <span
                  aria-hidden="true"
                  className={cn(
                    "h-px w-4 sm:w-8",
                    state === "todo" ? "bg-slate-300" : "bg-accent",
                  )}
                />
              )}
              <span
                aria-current={state === "current" ? "step" : undefined}
                className="flex min-w-0 items-center gap-1.5"
              >
                <span
                  className={cn(
                    "flex h-6 w-6 flex-none items-center justify-center rounded-full text-[11px] font-semibold",
                    state === "done" && "bg-primary text-white",
                    state === "current" && "bg-accent text-white",
                    state === "todo" && "border border-slate-300 bg-white text-slate-400",
                  )}
                >
                  {state === "done" ? <Check className="h-3.5 w-3.5" /> : i + 1}
                </span>
                <span
                  className={cn(
                    "hidden truncate text-xs sm:block",
                    state === "current" ? "font-semibold text-primary" : "text-muted",
                  )}
                >
                  {step.label}
                </span>
              </span>
            </li>
          );
        })}
      </ol>

      <div className="w-full max-w-xl rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h1 className="text-base font-semibold text-ink">{title}</h1>
        {subtitle && <p className="mt-1 text-xs text-muted">{subtitle}</p>}
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}
