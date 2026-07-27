/** Mock settings API: org, admission form, subscription, export. */
import type {
  AdmissionFormConfig,
  ExportJob,
  NotificationPreferences,
  Org,
  Subscription,
} from "./types";
import { delay, org, residents, staff, STAFF_LIMIT } from "./mock/db";

export async function getOrgSettings(): Promise<Org> {
  await delay(250);
  return { ...org };
}

export async function updateOrgSettings(input: Partial<Org>): Promise<Org> {
  await delay(500);
  Object.assign(org, input);
  return { ...org };
}

// ---------- Admission form ----------

const admissionForm: AdmissionFormConfig = {
  fields: [
    { key: "name", label: "Full name", enabled: true, required: true, builtIn: true },
    { key: "phone", label: "Mobile number", enabled: true, required: true, builtIn: true },
    { key: "email", label: "Email", enabled: true, required: false, builtIn: true },
    { key: "photo", label: "Photo", enabled: true, required: false, builtIn: true },
    { key: "guardianName", label: "Guardian name", enabled: true, required: true, builtIn: true },
    { key: "guardianPhone", label: "Guardian phone", enabled: true, required: true, builtIn: true },
    { key: "permanentAddress", label: "Permanent address", enabled: true, required: true, builtIn: true },
    { key: "idDocument", label: "ID document", enabled: true, required: true, builtIn: true },
    { key: "occupation", label: "Student / Working", enabled: true, required: true, builtIn: true },
    { key: "institution", label: "College / Company", enabled: true, required: false, builtIn: true },
    { key: "bloodGroup", label: "Blood group", enabled: false, required: false, builtIn: false },
    { key: "vehicleNumber", label: "Vehicle number", enabled: false, required: false, builtIn: false },
    { key: "emergencyContact", label: "Emergency contact", enabled: true, required: false, builtIn: false },
  ],
};

export async function getAdmissionFormConfig(): Promise<AdmissionFormConfig> {
  await delay(300);
  return { fields: admissionForm.fields.map((f) => ({ ...f })) };
}

export async function updateAdmissionFormConfig(
  input: AdmissionFormConfig,
): Promise<AdmissionFormConfig> {
  await delay(500);
  admissionForm.fields = input.fields.map((f) => ({ ...f }));
  return { fields: [...admissionForm.fields] };
}

// ---------- Subscription ----------

export async function getSubscription(): Promise<Subscription> {
  await delay(300);
  const renews = new Date();
  renews.setMonth(renews.getMonth() + 1);
  renews.setDate(4);
  return {
    plan: "basic",
    planLabel: "Basic",
    pricePaisaPerMonth: 99900, // ₹999/month
    renewsOn: renews.toISOString(),
    limits: { staff: STAFF_LIMIT, residents: 100, hostels: 1 },
    usage: {
      staff: staff.length,
      residents: residents.filter((r) => r.status !== "alumni").length,
      hostels: 1,
    },
  };
}

// ---------- Notification preferences ----------

const prefs: NotificationPreferences = {
  duesReminder: true,
  paymentReceived: true,
  newComplaint: true,
  complaintResolved: false,
  weeklySummary: true,
  channelInApp: true,
  channelEmail: false,
};

export async function getNotificationPreferences(): Promise<NotificationPreferences> {
  await delay(250);
  return { ...prefs };
}

export async function updateNotificationPreferences(
  input: NotificationPreferences,
): Promise<NotificationPreferences> {
  await delay(400);
  Object.assign(prefs, input);
  return { ...prefs };
}

// ---------- Data export ----------

let exportJob: ExportJob | null = null;

export async function requestExport(): Promise<ExportJob> {
  await delay(500);
  exportJob = {
    id: `exp_${Date.now()}`,
    status: "processing",
    requestedAt: new Date().toISOString(),
  };
  // Simulate the job finishing shortly after
  setTimeout(() => {
    if (exportJob) {
      exportJob.status = "ready";
      exportJob.downloadUrl = "#mock-export.zip";
    }
  }, 4000);
  return { ...exportJob };
}

export async function getExportStatus(): Promise<ExportJob | null> {
  await delay(250);
  return exportJob ? { ...exportJob } : null;
}
