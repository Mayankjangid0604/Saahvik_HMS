/**
 * sessionStorage persistence for the signup wizard, so a mid-signup refresh
 * doesn't lose progress. The password is deliberately NOT stored — it lives
 * only in component state, so a refresh on the manual (non-Google) path sends
 * the user back to step 1 to re-enter it (all other fields stay filled).
 */
import type { GoogleAuthResult, PlanSelection } from "@/api/types";

export type WizardStepId = "account" | "verify" | "plan" | "payment" | "done";

export interface WizardDraft {
  step: WizardStepId;
  name: string;
  email: string;
  phone: string;
  hostelName: string;
  google: GoogleAuthResult | null;
  phoneVerified: boolean;
  emailVerified: boolean;
  plan: PlanSelection | null;
}

export const EMPTY_DRAFT: WizardDraft = {
  step: "account",
  name: "",
  email: "",
  phone: "",
  hostelName: "",
  google: null,
  phoneVerified: false,
  emailVerified: false,
  plan: null,
};

const STORAGE_KEY = "saahvik.signupWizard";

export function loadWizardDraft(): WizardDraft {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY_DRAFT;
    return { ...EMPTY_DRAFT, ...(JSON.parse(raw) as Partial<WizardDraft>) };
  } catch {
    return EMPTY_DRAFT;
  }
}

export function saveWizardDraft(draft: WizardDraft): void {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
}

export function clearWizardDraft(): void {
  sessionStorage.removeItem(STORAGE_KEY);
}
