import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, Loader2 } from "lucide-react";
import { useAuth } from "./AuthContext";
import { signup } from "@/api/auth.api";
import type { MockPaymentResult, PlanSelection } from "@/api/types";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { WizardShell } from "./signup/WizardShell";
import { StepAccount, type AccountValues } from "./signup/StepAccount";
import { StepVerify } from "./signup/StepVerify";
import { StepPlan } from "./signup/StepPlan";
import { StepPayment } from "./signup/StepPayment";
import {
  clearWizardDraft,
  loadWizardDraft,
  saveWizardDraft,
  type WizardDraft,
  type WizardStepId,
} from "./signup/wizardStorage";

const STEP_TITLES: Record<WizardStepId, { title: string; subtitle: string }> = {
  account: { title: "Create your account", subtitle: "Start managing your hostel in minutes." },
  verify: {
    title: "Verify your email",
    subtitle: "One-time verification — never repeated on login.",
  },
  plan: { title: "Choose how to start", subtitle: "Start free today, or pay upfront." },
  payment: { title: "Payment", subtitle: "Complete your Basic subscription." },
  done: { title: "Finishing up", subtitle: "Creating your hostel workspace." },
};

type CompletionState =
  | { status: "pending" }
  | { status: "success" }
  | { status: "error"; message: string };

export function SignupPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [draft, setDraft] = useState<WizardDraft>(loadWizardDraft);
  // Held in memory only — never written to storage (see wizardStorage.ts).
  const [password, setPassword] = useState("");
  const [completion, setCompletion] = useState<CompletionState>({ status: "pending" });
  const completingRef = useRef(false);

  // A refresh drops the in-memory password and any in-flight completion:
  // "done" falls back to the plan step (choice is preserved, one click away),
  // and anything past step 1 returns there to re-enter the password.
  const restoredRef = useRef(false);
  useEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;
    setDraft((d) => {
      if (d.step === "done" || (d.step === "payment" && !d.plan)) {
        return { ...d, step: "plan" };
      }
      return d;
    });
    if (draft.step !== "account" && !password) {
      setDraft((d) => ({ ...d, step: "account" }));
      toast({
        title: "Please re-enter your password",
        description: "Your other details were saved.",
        variant: "info",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    saveWizardDraft(draft);
  }, [draft]);

  const steps: { id: WizardStepId; label: string }[] = [
    { id: "account", label: "Account" },
    { id: "verify", label: "Verify" },
    { id: "plan", label: "Plan" },
    ...(draft.plan?.mode === "paid" ? [{ id: "payment" as const, label: "Payment" }] : []),
    { id: "done", label: "Finish" },
  ];

  function handleAccountSubmit(values: AccountValues) {
    setPassword(values.password);
    setDraft((d) => ({
      ...d,
      name: values.name,
      hostelName: values.hostelName,
      email: values.email,
      phone: values.phone,
      // Changing the email invalidates a prior verification — the OTP was
      // issued against the old address.
      emailVerified: d.email === values.email && d.emailVerified,
      step: "verify",
    }));
  }

  /**
   * The real account creation. Fired from event handlers (plan selection /
   * payment success), NOT from a mount effect — StrictMode's double-mount
   * detaches effect-fired mutations from their callbacks.
   */
  async function completeSignup(draftNow: WizardDraft) {
    if (completingRef.current) return;
    completingRef.current = true;
    setCompletion({ status: "pending" });
    if (!password) {
      completingRef.current = false;
      setDraft((d) => ({ ...d, step: "account" }));
      toast({
        title: "Please re-enter your password",
        description: "Your other details were saved.",
        variant: "info",
      });
      return;
    }
    try {
      const session = await signup({
        name: draftNow.name,
        email: draftNow.email,
        phone: draftNow.phone,
        hostelName: draftNow.hostelName,
        password,
      });
      login(session);
      clearWizardDraft();
      setCompletion({ status: "success" });
      window.setTimeout(() => {
        toast({
          title: "Welcome to Saahvik!",
          description: "Let's set up your hostel.",
          variant: "success",
        });
        navigate(session.org.setupComplete ? "/dashboard" : "/setup", { replace: true });
      }, 1400);
    } catch (err) {
      completingRef.current = false;
      setCompletion({ status: "error", message: (err as Error).message });
    }
  }

  function handlePlanSelect(selection: PlanSelection) {
    const next: WizardDraft = {
      ...draft,
      plan: selection,
      step: selection.mode === "paid" ? "payment" : "done",
    };
    setDraft(next);
    if (selection.mode === "pilot") void completeSignup(next);
  }

  function handlePaymentSuccess(result: MockPaymentResult) {
    void result; // mock receipt — a real flow would send this to the backend
    const next: WizardDraft = { ...draft, step: "done" };
    setDraft(next);
    void completeSignup(next);
  }

  const goTo = (step: WizardStepId) => setDraft((d) => ({ ...d, step }));
  const { title, subtitle } = STEP_TITLES[draft.step];

  return (
    <WizardShell steps={steps} current={draft.step} title={title} subtitle={subtitle}>
      {draft.step === "account" && (
        <StepAccount
          defaults={{
            name: draft.name,
            hostelName: draft.hostelName,
            email: draft.email,
            phone: draft.phone,
            password: "",
          }}
          onSubmit={handleAccountSubmit}
        />
      )}
      {draft.step === "verify" && (
        <StepVerify
          phone={draft.phone}
          email={draft.email}
          emailVerified={draft.emailVerified}
          onEmailVerified={() => setDraft((d) => ({ ...d, emailVerified: true }))}
          onBack={() => goTo("account")}
          onContinue={() => goTo("plan")}
        />
      )}
      {draft.step === "plan" && (
        <StepPlan onSelect={handlePlanSelect} onBack={() => goTo("verify")} />
      )}
      {draft.step === "payment" && draft.plan && (
        <StepPayment
          selection={draft.plan}
          onSuccess={handlePaymentSuccess}
          onBack={() => goTo("plan")}
        />
      )}
      {draft.step === "done" && (
        <StepComplete
          hostelName={draft.hostelName}
          completion={completion}
          onRetry={() => void completeSignup(draft)}
          onBackToDetails={() => goTo("account")}
        />
      )}
    </WizardShell>
  );
}

/** Final step: pending spinner → success screen (redirect is on a timer). */
function StepComplete({
  hostelName,
  completion,
  onRetry,
  onBackToDetails,
}: {
  hostelName: string;
  completion: CompletionState;
  onRetry: () => void;
  onBackToDetails: () => void;
}) {
  if (completion.status === "error") {
    return (
      <div className="space-y-3">
        <p
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700"
        >
          {completion.message}
        </p>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={onBackToDetails}>
            Back to details
          </Button>
          <Button type="button" onClick={onRetry}>
            Try again
          </Button>
        </div>
      </div>
    );
  }

  if (completion.status === "success") {
    return (
      <div className="flex flex-col items-center py-6 text-center">
        <CheckCircle2 className="h-10 w-10 text-emerald-500" />
        <p className="mt-3 text-base font-semibold text-ink">
          You're all set, {hostelName}!
        </p>
        <p className="mt-1 text-xs text-muted">Signing you in…</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center py-8">
      <Loader2 className="h-7 w-7 animate-spin text-accent" />
      <p className="mt-3 text-xs text-muted">Creating your account…</p>
    </div>
  );
}
