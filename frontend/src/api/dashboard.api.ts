/** Dashboard API backed by the real backend. */
import type { DashboardData, DashboardRange } from "./types";
import { apiClient } from "./client";

export async function getDashboard(range: DashboardRange = "thisMonth"): Promise<DashboardData> {
  const { data } = await apiClient.get<DashboardData>("/dashboard", { params: { range } });
  return data;
}
