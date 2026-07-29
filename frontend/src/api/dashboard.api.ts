/** Dashboard API backed by the real backend. */
import type { DashboardData } from "./types";
import { apiClient } from "./client";

export async function getDashboard(): Promise<DashboardData> {
  const { data } = await apiClient.get<DashboardData>("/dashboard");
  return data;
}
