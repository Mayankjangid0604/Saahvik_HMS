import { useId, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import type { OtpChannel } from "@/api/types";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/cn";
import { mockSendOtp, mockVerifyOtp } from "./mocks";

type CardPhase = "idle" | "sending" | "sent" | "verifying";

/** One verification card (phone or email): Send → 6-digit code → Verify. */
function OtpCard({
  channel,
  title,
  destination,
  verified,
  verifiedNote,
  onVerified,
}: {
  channel: OtpChannel;
  title: string;
  destination: string;
  verified: boolean;
  /** Shown instead of the flow when already verified (e.g. "via Google"). */
  verifiedNote?: string;
  onVerified: () => void;
}) {
  const inputId = useId();
  const [phase, setPhase] = useState<CardPhase>("idle");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function send() {
    setPhase("sending");
    setError(null);
    await mockSendOtp(channel, destination);
    setPhase("sent");
  }

  async function verify() {
    setPhase("verifying");
    setError(null);
    const result = await mockVerifyOtp(channel, code);
    if (result.verified) {
      onVerified();
    } else {
      setPhase("sent");
      setError(result.error ?? "Verification failed");
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
          <p className="text-sm font-semibold text-ink">{title}</p>
          <p className="mt-0.5 text-xs text-muted">{destination}</p>
        </div>
        {verified && (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
            <CheckCircle2 className="h-3.5 w-3.5" /> Verified
          </span>
        )}
      </div>

      {verified ? (
        verifiedNote && <p className="mt-2 text-xs text-emerald-700">{verifiedNote}</p>
      ) : (
        <div className="mt-3 space-y-2">
          {phase === "idle" || phase === "sending" ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              isLoading={phase === "sending"}
              onClick={send}
            >
              {channel === "phone" ? "Send OTP" : "Send code"}
            </Button>
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

export function StepVerify({
  phone,
  email,
  phoneVerified,
  emailVerified,
  emailVerifiedViaGoogle,
  onPhoneVerified,
  onEmailVerified,
  onBack,
  onContinue,
}: {
  phone: string;
  email: string;
  phoneVerified: boolean;
  emailVerified: boolean;
  emailVerifiedViaGoogle: boolean;
  onPhoneVerified: () => void;
  onEmailVerified: () => void;
  onBack: () => void;
  onContinue: () => void;
}) {
  const bothVerified = phoneVerified && emailVerified;
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <OtpCard
          channel="phone"
          title="Verify your phone"
          destination={`+91 ${phone}`}
          verified={phoneVerified}
          onVerified={onPhoneVerified}
        />
        <OtpCard
          channel="email"
          title="Verify your email"
          destination={email}
          verified={emailVerified}
          verifiedNote={
            emailVerifiedViaGoogle ? "Verified via Google — nothing to do here." : undefined
          }
          onVerified={onEmailVerified}
        />
      </div>
      <p className="text-xs text-muted">
        You only verify once — future sign-ins won't repeat this.
      </p>
      <div className="flex items-center justify-between gap-3">
        <Button type="button" variant="ghost" onClick={onBack}>
          Back
        </Button>
        <Button type="button" disabled={!bothVerified} onClick={onContinue}>
          Continue
        </Button>
      </div>
    </div>
  );
}
