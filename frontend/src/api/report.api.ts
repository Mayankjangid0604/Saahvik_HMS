/** Reports API backed by the real backend: the four Basic-plan reports (owner only). */
import type {
  CollectionReportRow,
  DueEntry,
  OccupancyReportRow,
  ReportFilters,
  Resident,
} from "./types";
import { apiClient } from "./client";

export async function getOccupancyReport(filters: ReportFilters = {}): Promise<OccupancyReportRow[]> {
  const { data } = await apiClient.get<OccupancyReportRow[]>("/reports/occupancy", {
    params: filters,
  });
  return data;
}

export async function getDuesReport(filters: ReportFilters = {}): Promise<DueEntry[]> {
  const { data } = await apiClient.get<DueEntry[]>("/reports/dues", { params: filters });
  return data;
}

export async function getResidentListReport(filters: ReportFilters = {}): Promise<Resident[]> {
  const { data } = await apiClient.get<Resident[]>("/reports/residents", { params: filters });
  return data;
}

export async function getMonthlyCollectionReport(
  filters: ReportFilters = {},
): Promise<CollectionReportRow[]> {
  const { data } = await apiClient.get<CollectionReportRow[]>("/reports/monthly-collection", {
    params: filters,
  });
  return data;
}
