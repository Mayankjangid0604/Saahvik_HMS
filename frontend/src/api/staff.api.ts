/** Staff API backed by the real backend. Basic plan: hard limit of 3 members including the owner. */
import type { AddStaffInput, StaffList, StaffMember, UpdateStaffInput } from "./types";
import { apiClient } from "./client";

export async function listStaff(): Promise<StaffList> {
  const { data } = await apiClient.get<StaffList>("/staff");
  return data;
}

export async function getStaffMember(id: string): Promise<StaffMember> {
  const { data } = await apiClient.get<StaffMember>(`/staff/${id}`);
  return data;
}

export async function addStaff(input: AddStaffInput): Promise<StaffMember> {
  const { data } = await apiClient.post<StaffMember>("/staff", input);
  return data;
}

export async function updateStaff(id: string, input: UpdateStaffInput): Promise<StaffMember> {
  const { data } = await apiClient.put<StaffMember>(`/staff/${id}`, input);
  return data;
}

export async function removeStaff(id: string): Promise<{ ok: boolean }> {
  const { data } = await apiClient.delete<{ ok: boolean }>(`/staff/${id}`);
  return data;
}
