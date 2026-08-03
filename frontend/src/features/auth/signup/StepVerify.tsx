import { useId, useState } from "react";
import { CheckCircle2, Clock } from "lucide-react";
import { sendEmailOtp, verifyEmailOtp } from "@/api/emailOtp.api";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/cn";

type CardPhase = "idle" | "sending" | "sent" | "verifying";

/** Email verification: Send → 6-digit code → Verify, all server-side. */
function EmailOtpCard({
  email,
  verified,
  onVerified,
}: {
  email: string;
  verified: boolean;
  onVerified: () => void;
}) {
  const inputId = useId();
  const [phase, setPhase] = useState<CardPhase>("idle");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function send() {
    setPhase("sending");
    setError(null);
    try {
      await sendEmailOtp(email);
      setPhase("sent");
      setCode("");
    } catch (err) {
      // Covers the 60s per-address cooldown and the per-IP limiter — the
      // backend's message already says how long to wait.
      setError((err as Error).message);
      // A cooldown rejection means a code is already out there; keep the
      // entry field up rather than dropping back to a dead "Send" button.
      setPhase((p) => (p === "sending" ? "idle" : p));
    }
  }

  async function verify() {
    setPhase("verifying");
    setError(null);
    try {
      await verifyEmailOtp(email, code);
      onVerified();
    } catch (err) {
      setPhase("sent");
      setError((err as Error).message);
      setCode("");
    }
  }

  return (
    <div
      className={cn(
        "rounded-lg border p-4",
        verified ? "border-emerald-300 bg-emerald-50/60" : "border-slate-200 bg-white",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-ink">Verify your email</p>
          <p className="mt-0.5 text-xs text-muted">{email}</p>
        </div>
        {verified && (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
            <CheckCircle2 className="h-3.5 w-3.5" /> Verified
          </span>
        )}
      </div>

      {!verified && (
        <div className="mt-3 space-y-2">
          {phase === "idle" || phase === "sending" ? (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                isLoading={phase === "sending"}
                onClick={send}
              >
                Send code
              </Button>
              {error && (
                <p role="alert" className="text-xs text-red-600">
                  {error}
                </p>
              )}
            </>
          ) : (
            <>
              <label htmlFor={inputId} className="block text-xs font-medium text-slate-600">
                Enter the 6-digit code
              </label>
              <div className="flex gap-2">
                <Input
                  id={inputId}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  placeholder="••••••"
                  className="max-w-[120px] text-center font-mono tracking-[0.3em]"
                  error={!!error}
                />
                <Button
                  type="button"
                  size="md"
                  isLoading={phase === "verifying"}
                  disabled={code.length !== 6}
                  onClick={verify}
                >
                  Verify
                </Button>
              </div>
              {error && (
                <p role="alert" className="text-xs text-red-600">
                  {error}
                </p>
              )}
              <button
                type="button"
                className="text-xs text-accent-600 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                onClick={send}
              >
                Resend code
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Phone verification is deliberately not built: TRAI DLT registration isn't
 * done and no SMS provider is connected, so there is nothing to call. The
 * number is shown as entered and the account stays phoneVerified: false —
 * no send/verify controls, and no badge claiming otherwise.
 */
function PhoneDeferredCard({ phone }: { phone: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-ink">Phone verification</p>
          <p className="mt-0.5 text-xs text-muted">+91 {phone}</p>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-slate-200 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
          <Clock className="h-3.5 w-3.5" /> Later
        </span>
      </div>
      <p className="mt-2 text-xs text-muted">
        Phone verification isn't available yet — you can verify this later from
        your account settings.
      </p>
    </div>
  );
}

export function StepVerify({
  phone,
  email,
  emailVerified,
  onEmailVerified,
  onBack,
  onContinue,
}: {
  phone: string;
  email: string;
  emailVerified: boolean;
  onEmailVerified: () => void;
  onBack: () => void;
  onContinue: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <EmailOtpCard email={email} verified={emailVerified} onVerified={onEmailVerified} />
        <PhoneDeferredCard phone={phone} />
      </div>
      <p className="text-xs text-muted">
        You only verify once — future sign-ins won't repeat this.
      </p>
      <div className="flex items-center justify-between gap-3">
        <Button type="button" variant="ghost" onClick={onBack}>
          Back
        </Button>
        {/* Email alone gates the wizard — phone is deferred, not required. */}
        <Button type="button" disabled={!emailVerified} onClick={onContinue}>
          Continue
        </Button>
      </div>
    </div>
  );
}
