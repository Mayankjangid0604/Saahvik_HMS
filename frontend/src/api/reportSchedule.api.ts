/** Scheduled reports API (feature 16): recurring report generation + run history. */
import type {
  CreateReportScheduleInput,
  ReportRun,
  ReportSchedule,
  UpdateReportScheduleInput,
} from "./types";
import { apiClient } from "./client";

export async function listReportSchedules(): Promise<ReportSchedule[]> {
  const { data } = await apiClient.get<ReportSchedule[]>("/report-schedules");
  return data;
}

/** Past generated runs, optionally filtered to one schedule. */
export async function listReportRuns(scheduleId?: string): Promise<ReportRun[]> {
  const { data } = await apiClient.get<ReportRun[]>("/report-schedules/runs", {
    params: scheduleId !== undefined ? { scheduleId } : undefined,
  });
  return data;
}

export async function createReportSchedule(
  input: CreateReportScheduleInput,
): Promise<ReportSchedule> {
  const { data } = await apiClient.post<ReportSchedule>("/report-schedules", input);
  return data;
}

export async function updateReportSchedule(
  id: string,
  input: UpdateReportScheduleInput,
): Promise<ReportSchedule> {
  const { data } = await apiClient.put<ReportSchedule>(`/report-schedules/${id}`, input);
  return data;
}

export async function deleteReportSchedule(id: string): Promise<{ ok: boolean }> {
  const { data } = await apiClient.delete<{ ok: boolean }>(`/report-schedules/${id}`);
  return data;
}

/** Owner-triggered "run now"; returns the stored run. */
export async function runReportScheduleNow(id: string): Promise<ReportRun> {
  const { data } = await apiClient.post<ReportRun>(`/report-schedules/${id}/run`);
  return data;
}
