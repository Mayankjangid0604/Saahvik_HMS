/** Approval requests API (feature 18): single-step owner sign-off. */
import type {
  ApprovalListParams,
  ApprovalRequest,
  CreateApprovalInput,
  Paginated,
} from "./types";
import { apiClient } from "./client";

export async function listApprovals(
  params: ApprovalListParams = {},
): Promise<Paginated<ApprovalRequest>> {
  const { data } = await apiClient.get<Paginated<ApprovalRequest>>("/approvals", { params });
  return data;
}

export async function getApproval(id: string): Promise<ApprovalRequest> {
  const { data } = await apiClient.get<ApprovalRequest>(`/approvals/${id}`);
  return data;
}

export async function createApproval(input: CreateApprovalInput): Promise<ApprovalRequest> {
  const { data } = await apiClient.post<ApprovalRequest>("/approvals", input);
  return data;
}

export async function approveRequest(
  id: string,
  body: { decisionNote?: string } = {},
): Promise<ApprovalRequest> {
  const { data } = await apiClient.post<ApprovalRequest>(`/approvals/${id}/approve`, body);
  return data;
}

export async function rejectRequest(
  id: string,
  body: { decisionNote?: string } = {},
): Promise<ApprovalRequest> {
  const { data } = await apiClient.post<ApprovalRequest>(`/approvals/${id}/reject`, body);
  return data;
}
