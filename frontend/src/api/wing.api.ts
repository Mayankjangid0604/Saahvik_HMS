/** Wing API backed by the real backend. Wings are an optional layer between a hostel and its rooms. */
import type { CreateWingInput, UpdateWingInput, Wing } from "./types";
import { apiClient } from "./client";

export async function listWings(): Promise<Wing[]> {
  const { data } = await apiClient.get<Wing[]>("/wings");
  return data;
}

export async function createWing(input: CreateWingInput): Promise<Wing> {
  const { data } = await apiClient.post<Wing>("/wings", input);
  return data;
}

export async function updateWing(id: string, input: UpdateWingInput): Promise<Wing> {
  const { data } = await apiClient.put<Wing>(`/wings/${id}`, input);
  return data;
}

export async function deleteWing(id: string): Promise<{ ok: boolean }> {
  const { data } = await apiClient.delete<{ ok: boolean }>(`/wings/${id}`);
  return data;
}
