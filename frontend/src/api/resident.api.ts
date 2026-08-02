/** Residents API backed by the real backend. */
import type {
  BulkImportResult,
  BulkImportRow,
  CreateResidentInput,
  ExpiringDocumentsReport,
  Paginated,
  Resident,
  ResidentDocument,
  ResidentListParams,
} from "./types";
import { apiClient } from "./client";

export async function listResidents(params: ResidentListParams = {}): Promise<Paginated<Resident>> {
  const { data } = await apiClient.get<Paginated<Resident>>("/residents", { params });
  return data;
}

export async function listAlumni(params: ResidentListParams = {}): Promise<Paginated<Resident>> {
  return listResidents({ ...params, status: "alumni" });
}

/** Unpaginated actives, for pickers. */
export async function listAllActiveResidents(): Promise<Resident[]> {
  const { data } = await apiClient.get<Resident[]>("/residents/all-active");
  return data;
}

export async function getResident(id: string): Promise<Resident> {
  const { data } = await apiClient.get<Resident>(`/residents/${id}`);
  return data;
}

export async function createResident(input: CreateResidentInput): Promise<Resident> {
  const { data } = await apiClient.post<Resident>("/residents", input);
  return data;
}

export async function updateResident(id: string, input: Partial<Resident>): Promise<Resident> {
  const { data } = await apiClient.put<Resident>(`/residents/${id}`, input);
  return data;
}

/** Move a resident out: frees the bed, marks alumni. */
export async function checkoutResident(id: string, exitDate: string): Promise<Resident> {
  const { data } = await apiClient.post<Resident>(`/residents/${id}/checkout`, { exitDate });
  return data;
}

export async function importResidents(mappedRows: BulkImportRow[]): Promise<BulkImportResult> {
  const { data } = await apiClient.post<BulkImportResult>("/residents/import", {
    rows: mappedRows,
  });
  return data;
}

// ---------- Categorized documents (feature 12) ----------

export async function listResidentDocuments(residentId: string): Promise<ResidentDocument[]> {
  const { data } = await apiClient.get<ResidentDocument[]>(`/residents/${residentId}/documents`);
  return data;
}

/** Upload a categorized document as multipart form-data. */
export async function uploadResidentDocument(
  residentId: string,
  file: File,
  meta: { category: string; label?: string; expiryDate?: string },
): Promise<ResidentDocument> {
  const form = new FormData();
  form.append("file", file);
  form.append("category", meta.category);
  if (meta.label !== undefined) form.append("label", meta.label);
  if (meta.expiryDate !== undefined) form.append("expiryDate", meta.expiryDate);
  const { data } = await apiClient.post<ResidentDocument>(
    `/residents/${residentId}/documents`,
    form,
  );
  return data;
}

export async function deleteResidentDocument(
  residentId: string,
  docId: string,
): Promise<{ ok: boolean }> {
  const { data } = await apiClient.delete<{ ok: boolean }>(
    `/residents/${residentId}/documents/${docId}`,
  );
  return data;
}

// ---------- Document expiry report (feature 4) ----------

export async function getExpiringDocuments(withinDays?: number): Promise<ExpiringDocumentsReport> {
  const { data } = await apiClient.get<ExpiringDocumentsReport>("/residents/documents/expiring", {
    params: withinDays !== undefined ? { withinDays } : undefined,
  });
  return data;
}
