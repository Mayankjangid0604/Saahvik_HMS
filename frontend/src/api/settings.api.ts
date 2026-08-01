/** Settings API backed by the real backend: org, admission form, subscription, notification prefs. */
import type {
  AdmissionFormConfig,
  ExportJob,
  NotificationPreferences,
  Org,
  Subscription,
} from "./types";
import { apiClient } from "./client";

export async function getOrgSettings(): Promise<Org> {
  const { data } = await apiClient.get<Org>("/settings/org");
  return data;
}

export async function updateOrgSettings(input: Partial<Org>): Promise<Org> {
  const { data } = await apiClient.put<Org>("/settings/org", input);
  return data;
}

/** Upload the org logo (multipart). Returns the updated Org with a logoUrl. */
export async function uploadOrgLogo(file: File): Promise<Org> {
  const form = new FormData();
  form.append("file", file);
  const { data } = await apiClient.post<Org>("/settings/org/logo", form);
  return data;
}

// ---------- Admission form ----------

export async function getAdmissionFormConfig(): Promise<AdmissionFormConfig> {
  const { data } = await apiClient.get<AdmissionFormConfig>("/settings/admission-form-fields");
  return data;
}

export async function updateAdmissionFormConfig(
  input: AdmissionFormConfig,
): Promise<AdmissionFormConfig> {
  const { data } = await apiClient.put<AdmissionFormConfig>(
    "/settings/admission-form-fields",
    input,
  );
  return data;
}

export async function resetAdmissionFormConfig(): Promise<AdmissionFormConfig> {
  const { data } = await apiClient.post<AdmissionFormConfig>(
    "/settings/admission-form-fields/reset",
  );
  return data;
}

// ---------- Subscription ----------

export async function getSubscription(): Promise<Subscription> {
  const { data } = await apiClient.get<Subscription>("/settings/subscription");
  return data;
}

// ---------- Notification preferences ----------

export async function getNotificationPreferences(): Promise<NotificationPreferences> {
  const { data } = await apiClient.get<NotificationPreferences>("/settings/notifications");
  return data;
}

export async function updateNotificationPreferences(
  input: NotificationPreferences,
): Promise<NotificationPreferences> {
  const { data } = await apiClient.put<NotificationPreferences>("/settings/notifications", input);
  return data;
}

// ---------- Data export ----------
// The backend has no export endpoint yet (not in backend/HANDOFF.md either).
// This client-side stub keeps the Data Export page functional-looking without
// the mock layer; replace with real endpoints when the backend adds them.

let exportJob: ExportJob | null = null;

export async function requestExport(): Promise<ExportJob> {
  exportJob = {
    id: `exp_${Date.now()}`,
    status: "processing",
    requestedAt: new Date().toISOString(),
  };
  setTimeout(() => {
    if (exportJob) {
      exportJob.status = "ready";
      exportJob.downloadUrl = "#export-not-implemented";
    }
  }, 4000);
  return { ...exportJob };
}

export async function getExportStatus(): Promise<ExportJob | null> {
  return exportJob ? { ...exportJob } : null;
}
