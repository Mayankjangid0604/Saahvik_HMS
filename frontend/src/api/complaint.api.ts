/** Complaints API backed by the real backend. */
import type {
  Complaint,
  ComplaintListParams,
  ComplaintStatus,
  CreateComplaintInput,
  Paginated,
} from "./types";
import { apiClient } from "./client";

export async function listComplaints(params: ComplaintListParams = {}): Promise<Paginated<Complaint>> {
  const { data } = await apiClient.get<Paginated<Complaint>>("/complaints", { params });
  return data;
}

export async function getComplaint(id: string): Promise<Complaint> {
  const { data } = await apiClient.get<Complaint>(`/complaints/${id}`);
  return data;
}

export async function createComplaint(input: CreateComplaintInput): Promise<Complaint> {
  const { data } = await apiClient.post<Complaint>("/complaints", input);
  return data;
}

export async function updateComplaintStatus(
  id: string,
  status: ComplaintStatus,
  note?: string,
): Promise<Complaint> {
  const { data } = await apiClient.put<Complaint>(`/complaints/${id}`, { status, note });
  return data;
}
