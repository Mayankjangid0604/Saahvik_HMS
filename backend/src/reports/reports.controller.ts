import { Controller, Get, Header, Inject, Query, StreamableFile } from "@nestjs/common";
import type { AuthUser } from "../common/auth-user";
import { CurrentUser, Roles } from "../common/decorators";
import { ReportsService, type ReportFilters } from "./reports.service";

const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

/**
 * All reports are owner only. `format=pdf` streams application/pdf inline
 * (Noto Sans, real ₹ glyph); `format=xlsx` streams an .xlsx attachment
 * (feature 13); anything else returns structured JSON. The PDF and Excel paths
 * share the same underlying *Data builders in ReportsService.
 */
@Controller("reports")
@Roles("owner")
export class ReportsController {
  constructor(@Inject(ReportsService) private readonly reports: ReportsService) {}

  private xlsx(buf: Buffer, name: string): StreamableFile {
    return new StreamableFile(buf, {
      type: XLSX_MIME,
      disposition: `attachment; filename="${name}.xlsx"`,
    });
  }

  @Get("occupancy")
  @Header("Content-Disposition", "inline")
  async occupancy(@CurrentUser() user: AuthUser, @Query() q: ReportFilters & { format?: string }) {
    if (q.format === "pdf") {
      return new StreamableFile(await this.reports.occupancyPdf(user, q), { type: "application/pdf" });
    }
    if (q.format === "xlsx") return this.xlsx(await this.reports.occupancyXlsx(user, q), "occupancy");
    return this.reports.occupancyData(user);
  }

  @Get("dues")
  @Header("Content-Disposition", "inline")
  async dues(
    @CurrentUser() user: AuthUser,
    @Query() q: ReportFilters & { format?: string; date?: string },
  ) {
    const filters: ReportFilters = { ...q, to: q.date ?? q.to };
    if (q.format === "pdf") {
      return new StreamableFile(await this.reports.duesPdf(user, filters), { type: "application/pdf" });
    }
    if (q.format === "xlsx") return this.xlsx(await this.reports.duesXlsx(user, filters), "dues");
    return this.reports.duesData(user);
  }

  @Get("residents")
  @Header("Content-Disposition", "inline")
  async residents(@CurrentUser() user: AuthUser, @Query() q: ReportFilters & { format?: string }) {
    if (q.format === "pdf") {
      return new StreamableFile(await this.reports.residentsPdf(user, q), { type: "application/pdf" });
    }
    if (q.format === "xlsx") return this.xlsx(await this.reports.residentsXlsx(user, q), "residents");
    return this.reports.residentsData(user, q);
  }

  @Get("monthly-collection")
  @Header("Content-Disposition", "inline")
  async monthlyCollection(
    @CurrentUser() user: AuthUser,
    @Query() q: ReportFilters & { format?: string },
  ) {
    if (q.format === "pdf") {
      return new StreamableFile(await this.reports.collectionPdf(user, q), { type: "application/pdf" });
    }
    if (q.format === "xlsx") return this.xlsx(await this.reports.collectionXlsx(user, q), "monthly-collection");
    return this.reports.collectionData(user, q);
  }

  /** Staff roster + attendance summary (feature 14). Attendance is Phase BG-3. */
  @Get("staff")
  @Header("Content-Disposition", "inline")
  async staff(@CurrentUser() user: AuthUser, @Query() q: { format?: string }) {
    if (q.format === "pdf") {
      return new StreamableFile(await this.reports.staffPdf(user), { type: "application/pdf" });
    }
    if (q.format === "xlsx") return this.xlsx(await this.reports.staffXlsx(user), "staff");
    return this.reports.staffData(user);
  }
}
