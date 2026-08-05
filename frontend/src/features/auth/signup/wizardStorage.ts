/**
 * sessionStorage persistence for the signup wizard, so a mid-signup refresh
 * doesn't lose progress. The password is deliberately NOT stored — it lives
 * only in component state, so a refresh past step 1 sends the user back there
 * to re-enter it (all other fields stay filled).
 */
import type { PlanSelection } from "@/api/types";

export type WizardStepId = "account" | "verify" | "plan" | "payment" | "done";

export interface WizardDraft {
  step: WizardStepId;
  name: string;
  email: string;
  phone: string;
  hostelName: string;
  /**
   * Email only. There is no `phoneVerified` here because there is no phone
   * verification flow — the backend's Owner.phoneVerified stays false and the
   * wizard has no way to change it.
   */
  emailVerified: boolean;
  plan: PlanSelection | null;
}

export const EMPTY_DRAFT: WizardDraft = {
  step: "account",
  name: "",
  email: "",
  phone: "",
  hostelName: "",
  emailVerified: false,
  plan: null,
};

/**
 * Versioned. v1 drafts could carry `emailVerified: true` set purely from a
 * Google sign-in or the OTP mock, neither of which proves anything now that
 * verification is a real server-side check — so v1 is ignored outright rather
 * than migrated, and the old key is cleaned up on load.
 */
const STORAGE_KEY = "saahvik.signupWizard.v2";
const LEGACY_STORAGE_KEY = "saahvik.signupWizard";

/**
 * Only known keys are copied out of storage, so a draft written by another
 * build can't smuggle unexpected shape into state. Anything unreadable or
 * unrecognised degrades to a fresh draft rather than throwing — a bad draft
 * must never be able to break the signup page on load.
 */
export function loadWizardDraft(): WizardDraft {
  try {
    sessionStorage.removeItem(LEGACY_STORAGE_KEY);
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY_DRAFT;
    const parsed = JSON.parse(raw) as Partial<WizardDraft> | null;
    if (!parsed || typeof parsed !== "object") return EMPTY_DRAFT;
    return {
      step: parsed.step ?? EMPTY_DRAFT.step,
      name: parsed.name ?? EMPTY_DRAFT.name,
      email: parsed.email ?? EMPTY_DRAFT.email,
      phone: parsed.phone ?? EMPTY_DRAFT.phone,
      hostelName: parsed.hostelName ?? EMPTY_DRAFT.hostelName,
      emailVerified: parsed.emailVerified ?? EMPTY_DRAFT.emailVerified,
      plan: parsed.plan ?? EMPTY_DRAFT.plan,
    };
  } catch {
    return EMPTY_DRAFT;
  }
}

export function saveWizardDraft(draft: WizardDraft): void {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
}

export function clearWizardDraft(): void {
  sessionStorage.removeItem(STORAGE_KEY);
  sessionStorage.removeItem(LEGACY_STORAGE_KEY);
}
