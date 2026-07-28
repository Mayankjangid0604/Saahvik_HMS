import type { AdmissionFieldType } from "@prisma/client";

export interface DefaultAdmissionField {
  key: string;
  label: string;
  fieldType: AdmissionFieldType;
  required: boolean;
  options?: string[];
  validation?: "aadhaar" | "pincode";
  autoFill?: "today" | "formNo";
}

/**
 * The 28 default admission fields, seeded for every new org. Matches the
 * Sunrise Hostel paper form and, verbatim, the field keys the frontend's
 * mock ships (frontend/src/api/settings.api.ts) — the frontend keys
 * admissionData by these keys.
 */
export const DEFAULT_ADMISSION_FIELDS: DefaultAdmissionField[] = [
  { key: "formNo", label: "Form No.", fieldType: "auto", required: false, autoFill: "formNo" },
  { key: "formDate", label: "Date", fieldType: "date", required: false, autoFill: "today" },
  { key: "photo", label: "Photo", fieldType: "file", required: false },
  { key: "candidateName", label: "Name of Candidate", fieldType: "text", required: true },
  { key: "fatherName", label: "Father's Name", fieldType: "text", required: true },
  { key: "motherName", label: "Mother's Name", fieldType: "text", required: false },
  { key: "contactNo", label: "Contact No.", fieldType: "phone", required: true },
  { key: "fatherContactNo", label: "Father's Contact No.", fieldType: "phone", required: false },
  { key: "motherContactNo", label: "Mother's Contact No.", fieldType: "phone", required: false },
  { key: "alternateNo", label: "Alternate No.", fieldType: "phone", required: false },
  { key: "dateOfBirth", label: "Date of Birth", fieldType: "date", required: false },
  { key: "aadharNo", label: "Aadhar No.", fieldType: "text", required: false, validation: "aadhaar" },
  { key: "coachingName", label: "Coaching/Institute Name", fieldType: "text", required: false },
  { key: "class", label: "Class", fieldType: "text", required: false },
  { key: "admissionType", label: "Admission Type", fieldType: "select", required: false, options: ["Fresher", "Repeater"] },
  { key: "permanentAddress", label: "Permanent Address", fieldType: "textarea", required: false },
  { key: "district", label: "District", fieldType: "text", required: false },
  { key: "state", label: "State", fieldType: "text", required: false },
  { key: "pincode", label: "Pincode", fieldType: "text", required: false, validation: "pincode" },
  { key: "localGuardianName", label: "Local Guardian Name", fieldType: "text", required: false },
  { key: "guardianRelation", label: "Guardian Relation", fieldType: "text", required: false },
  { key: "guardianContactNo", label: "Guardian Contact No.", fieldType: "phone", required: false },
  { key: "admissionDate", label: "Date of Admission", fieldType: "date", required: false, autoFill: "today" },
  { key: "leavingDate", label: "Date of Leaving", fieldType: "date", required: false },
  { key: "fatherQualification", label: "Father's Qualification", fieldType: "text", required: false },
  { key: "fatherOccupation", label: "Father's Occupation", fieldType: "text", required: false },
  { key: "motherQualification", label: "Mother's Qualification", fieldType: "text", required: false },
  { key: "motherOccupation", label: "Mother's Occupation", fieldType: "text", required: false },
];
