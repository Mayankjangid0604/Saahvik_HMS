import { Inject, Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import {
  Prisma,
  ReportFormat,
  ScheduledReportType,
  ScheduleFrequency,
  type ReportSchedule,
} from "@prisma/client";
import { AuditService } from "../audit/audit.service";
import { ApiError } from "../common/api-error";
import type { AuthUser } from "../common/auth-user";
import { FilesService } from "../files/files.service";
import { PrismaService } from "../prisma/prisma.service";
import { ReportsService, type ReportFilters } from "./reports.service";

/** Advance a schedule's next run from a base time by its frequency. */
function computeNextRun(from: Date, freq: ScheduleFrequency): Date {
  const d = new Date(from);
  if (freq === "daily") d.setDate(d.getDate() + 1);
  else if (freq === "weekly") d.setDate(d.getDate() + 7);
  else d.setMonth(d.getMonth() + 1);
  return d;
}

function toScheduleDto(s: ReportSchedule) {
  return {
    id: s.id,
    name: s.name,
    reportType: s.reportType,
    format: s.format,
    frequency: s.frequency,
    filters: (s.filters ?? undefined) as Record<string, unknown> | undefined,
    active: s.active,
    lastRunAt: s.lastRunAt?.toISOString(),
    nextRunAt: s.nextRunAt?.toISOString(),
    createdAt: s.createdAt.toISOString(),
  };
}

/**
 * Report scheduling (feature 16). Stores schedule config and, when a schedule
 * comes due, GENERATES AND STORES the report as a ReportRun (a /files artifact).
 * It does NOT deliver anything — email/WhatsApp delivery is Phase BG-5, and
 * building it here would duplicate that phase's notification work. The cron only
 * generates+stores; the owner (or Phase BG-5) picks the artifacts up later.
 */
@Injectable()
export class ReportSchedulesService {
  private readonly logger = new Logger("ReportSchedules");

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(ReportsService) private readonly reports: ReportsService,
    @Inject(FilesService) private readonly files: FilesService,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

  async list(user: AuthUser) {
    const rows = await this.prisma.reportSchedule.findMany({
      where: { orgId: user.orgId },
      orderBy: { createdAt: "desc" },
    });
    return rows.map(toScheduleDto);
  }

  async listRuns(user: AuthUser, scheduleId?: string) {
    const runs = await this.prisma.reportRun.findMany({
      where: { orgId: user.orgId, ...(scheduleId ? { scheduleId } : {}) },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return runs.map((r) => ({
      id: r.id,
      scheduleId: r.scheduleId ?? undefined,
      reportType: r.reportType,
      format: r.format,
      fileUrl: `/api/v1/files/${r.fileKey}`,
      createdAt: r.createdAt.toISOString(),
    }));
  }

  async create(
    user: AuthUser,
    dto: {
      name: string;
      reportType: ScheduledReportType;
      format?: ReportFormat;
      frequency?: ScheduleFrequency;
      filters?: Record<string, unknown>;
    },
  ) {
    const frequency = dto.frequency ?? "weekly";
    const schedule = await this.prisma.reportSchedule.create({
      data: {
        orgId: user.orgId,
        createdByUserId: user.userId,
        name: dto.name,
        reportType: dto.reportType,
        format: dto.format ?? "pdf",
        frequency,
        filters: (dto.filters ?? undefined) as Prisma.InputJsonValue | undefined,
        nextRunAt: computeNextRun(new Date(), frequency),
      },
    });
    await this.audit.log(user, {
      action: "created_report_schedule",
      entityType: "report_schedule",
      entityId: schedule.id,
      entityLabel: schedule.name,
      details: { reportType: schedule.reportType, frequency, format: schedule.format },
    });
    return toScheduleDto(schedule);
  }

  async update(
    user: AuthUser,
    id: string,
    dto: {
      name?: string;
      format?: ReportFormat;
      frequency?: ScheduleFrequency;
      filters?: Record<string, unknown>;
      active?: boolean;
    },
  ) {
    const existing = await this.prisma.reportSchedule.findFirst({
      where: { id, orgId: user.orgId },
    });
    if (!existing) throw ApiError.notFound("Report schedule");
    const data: Prisma.ReportScheduleUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.format !== undefined) data.format = dto.format;
    if (dto.frequency !== undefined) {
      data.frequency = dto.frequency;
      data.nextRunAt = computeNextRun(new Date(), dto.frequency);
    }
    if (dto.filters !== undefined) data.filters = dto.filters as Prisma.InputJsonValue;
    if (dto.active !== undefined) data.active = dto.active;
    const updated = await this.prisma.reportSchedule.update({ where: { id: existing.id }, data });
    await this.audit.log(user, {
      action: "updated_report_schedule",
      entityType: "report_schedule",
      entityId: updated.id,
      entityLabel: updated.name,
      details: { changes: dto },
    });
    return toScheduleDto(updated);
  }

  async remove(user: AuthUser, id: string) {
    const existing = await this.prisma.reportSchedule.findFirst({
      where: { id, orgId: user.orgId },
    });
    if (!existing) throw ApiError.notFound("Report schedule");
    await this.prisma.reportSchedule.delete({ where: { id: existing.id } });
    await this.audit.log(user, {
      action: "deleted_report_schedule",
      entityType: "report_schedule",
      entityId: existing.id,
      entityLabel: existing.name,
    });
    return { ok: true };
  }

  /** Manual "run now" (owner-triggered). Returns the stored run. */
  async runNow(user: AuthUser, id: string) {
    const schedule = await this.prisma.reportSchedule.findFirst({
      where: { id, orgId: user.orgId },
    });
    if (!schedule) throw ApiError.notFound("Report schedule");
    const run = await this.runSchedule(schedule);
    await this.audit.log(user, {
      action: "ran_report_schedule",
      entityType: "report_schedule",
      entityId: schedule.id,
      entityLabel: schedule.name,
      details: { runId: run.id },
    });
    return {
      id: run.id,
      scheduleId: run.scheduleId ?? undefined,
      reportType: run.reportType,
      format: run.format,
      fileUrl: `/api/v1/files/${run.fileKey}`,
      createdAt: run.createdAt.toISOString(),
    };
  }

  /**
   * Cron: every 30 minutes, generate+store any active schedule that is due.
   * Best-effort — a failing schedule is logged and skipped; others still run.
   */
  @Cron(CronExpression.EVERY_30_MINUTES)
  async runDue(): Promise<void> {
    const now = new Date();
    const due = await this.prisma.reportSchedule.findMany({
      where: { active: true, nextRunAt: { lte: now } },
    });
    for (const schedule of due) {
      try {
        await this.runSchedule(schedule);
      } catch (err) {
        this.logger.error(
          `Report schedule ${schedule.id} failed: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }
  }

  /** Generate the report, store it as a ReportRun, advance nextRunAt. */
  private async runSchedule(schedule: ReportSchedule) {
    const { buffer, ext } = await this.generate(
      schedule.orgId,
      schedule.reportType,
      schedule.format,
      (schedule.filters ?? {}) as ReportFilters,
    );
    const { key } = await this.files.storeBuffer(schedule.orgId, buffer, ext);
    const now = new Date();
    const [run] = await this.prisma.$transaction([
      this.prisma.reportRun.create({
        data: {
          orgId: schedule.orgId,
          scheduleId: schedule.id,
          reportType: schedule.reportType,
          format: schedule.format,
          fileKey: key,
        },
      }),
      this.prisma.reportSchedule.update({
        where: { id: schedule.id },
        data: { lastRunAt: now, nextRunAt: computeNextRun(now, schedule.frequency) },
      }),
    ]);
    return run;
  }

  /**
   * Dispatch to the matching ReportsService builder. Reuses the exact same
   * report data + rendering as the on-demand endpoints (no parallel logic). A
   * synthetic owner-scoped AuthUser carries only the orgId the builders read.
   */
  private async generate(
    orgId: string,
    type: ScheduledReportType,
    format: ReportFormat,
    filters: ReportFilters,
  ): Promise<{ buffer: Buffer; ext: string }> {
    const user: AuthUser = { userId: "scheduler", orgId, role: "owner", name: "Report Scheduler" };
    const isPdf = format === "pdf";
    const ext = isPdf ? ".pdf" : ".xlsx";
    let buffer: Buffer;
    switch (type) {
      case "occupancy":
        buffer = isPdf
          ? await this.reports.occupancyPdf(user, filters)
          : await this.reports.occupancyXlsx(user, filters);
        break;
      case "dues":
        buffer = isPdf
          ? await this.reports.duesPdf(user, filters)
          : await this.reports.duesXlsx(user, filters);
        break;
      case "residents":
        buffer = isPdf
          ? await this.reports.residentsPdf(user, filters)
          : await this.reports.residentsXlsx(user, filters);
        break;
      case "monthly_collection":
        buffer = isPdf
          ? await this.reports.collectionPdf(user, filters)
          : await this.reports.collectionXlsx(user, filters);
        break;
      case "staff":
        buffer = isPdf ? await this.reports.staffPdf(user) : await this.reports.staffXlsx(user);
        break;
    }
    return { buffer, ext };
  }
}
