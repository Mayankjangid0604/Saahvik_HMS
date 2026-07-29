/** Residents API backed by the real backend. */
import type {
  BulkImportResult,
  BulkImportRow,
  CreateResidentInput,
  Paginated,
  Resident,
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
