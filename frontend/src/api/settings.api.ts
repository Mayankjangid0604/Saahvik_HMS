/** Mock settings API: org, admission form, subscription, export. */
import type {
  AdmissionFormConfig,
  AdmissionFormField,
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

/**
 * Default fields, seeded from Sunrise Hostel's paper admission form.
 * Personal / guardian / academic details only — room and fee fields live on
 * the Room Assignment and Fee Assignment screens.
 */
const defaultAdmissionFields: AdmissionFormField[] = [
  { key: "formNo", label: "Form No.", type: "auto", required: false, isDefault: true, autoFill: "formNo" },
  { key: "formDate", label: "Date", type: "date", required: false, isDefault: true, autoFill: "today" },
  { key: "photo", label: "Photo", type: "file", required: false, isDefault: true },
  { key: "candidateName", label: "Name of Candidate", type: "text", required: true, isDefault: true },
  { key: "fatherName", label: "Father's Name", type: "text", required: true, isDefault: true },
  { key: "motherName", label: "Mother's Name", type: "text", required: false, isDefault: true },
  { key: "contactNo", label: "Contact No.", type: "phone", required: true, isDefault: true },
  { key: "fatherContactNo", label: "Father's Contact No.", type: "phone", required: false, isDefault: true },
  { key: "motherContactNo", label: "Mother's Contact No.", type: "phone", required: false, isDefault: true },
  { key: "alternateNo", label: "Alternate No.", type: "phone", required: false, isDefault: true },
  { key: "dateOfBirth", label: "Date of Birth", type: "date", required: false, isDefault: true },
  { key: "aadharNo", label: "Aadhar No.", type: "text", required: false, isDefault: true, validation: "aadhaar" },
  { key: "coachingName", label: "Coaching/Institute Name", type: "text", required: false, isDefault: true },
  { key: "class", label: "Class", type: "text", required: false, isDefault: true },
  { key: "admissionType", label: "Admission Type", type: "select", required: false, isDefault: true, options: ["Fresher", "Repeater"] },
  { key: "permanentAddress", label: "Permanent Address", type: "textarea", required: false, isDefault: true },
  { key: "district", label: "District", type: "text", required: false, isDefault: true },
  { key: "state", label: "State", type: "text", required: false, isDefault: true },
  { key: "pincode", label: "Pincode", type: "text", required: false, isDefault: true, validation: "pincode" },
  { key: "localGuardianName", label: "Local Guardian Name", type: "text", required: false, isDefault: true },
  { key: "guardianRelation", label: "Guardian Relation", type: "text", required: false, isDefault: true },
  { key: "guardianContactNo", label: "Guardian Contact No.", type: "phone", required: false, isDefault: true },
  { key: "admissionDate", label: "Date of Admission", type: "date", required: false, isDefault: true, autoFill: "today" },
  { key: "leavingDate", label: "Date of Leaving", type: "date", required: false, isDefault: true },
  { key: "fatherQualification", label: "Father's Qualification", type: "text", required: false, isDefault: true },
  { key: "fatherOccupation", label: "Father's Occupation", type: "text", required: false, isDefault: true },
  { key: "motherQualification", label: "Mother's Qualification", type: "text", required: false, isDefault: true },
  { key: "motherOccupation", label: "Mother's Occupation", type: "text", required: false, isDefault: true },
];

let admissionFields: AdmissionFormField[] = defaultAdmissionFields.map((f) => ({ ...f }));

export async function getAdmissionFormConfig(): Promise<AdmissionFormConfig> {
  await delay(300);
  return { fields: admissionFields.map((f) => ({ ...f })) };
}

export async function updateAdmissionFormConfig(
  input: AdmissionFormConfig,
): Promise<AdmissionFormConfig> {
  await delay(500);
  admissionFields = input.fields.map((f) => ({ ...f }));
  return { fields: admissionFields.map((f) => ({ ...f })) };
}

export async function resetAdmissionFormConfig(): Promise<AdmissionFormConfig> {
  await delay(400);
  admissionFields = defaultAdmissionFields.map((f) => ({ ...f }));
  return { fields: admissionFields.map((f) => ({ ...f })) };
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
