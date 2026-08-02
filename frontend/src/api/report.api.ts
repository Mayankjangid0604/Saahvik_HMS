/** Reports API backed by the real backend: the Basic-plan reports (owner only). */
import type {
  CollectionReportRow,
  DueEntry,
  OccupancyReportRow,
  ReportDownloadFormat,
  ReportFilters,
  Resident,
  StaffReport,
  StaffReportType,
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

/** Staff roster + attendance summary as structured JSON (feature 14). */
export async function getStaffReport(): Promise<StaffReport> {
  const { data } = await apiClient.get<StaffReport>("/reports/staff");
  return data;
}

/**
 * Download a report as a PDF or Excel blob (features 13, 14). `format=xlsx`
 * streams an .xlsx attachment; `format=pdf` streams application/pdf. The axios
 * interceptor passes Blob responses through untouched.
 */
export async function downloadReport(
  type: StaffReportType,
  format: ReportDownloadFormat,
  filters: ReportFilters = {},
): Promise<Blob> {
  const { data } = await apiClient.get<Blob>(`/reports/${type}`, {
    params: { ...filters, format },
    responseType: "blob",
  });
  return data;
}
