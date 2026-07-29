import { Controller, Get, Header, Inject, Query, StreamableFile } from "@nestjs/common";
import type { AuthUser } from "../common/auth-user";
import { CurrentUser, Roles } from "../common/decorators";
import { ReportsService, type ReportFilters } from "./reports.service";

/**
 * All reports are owner only. `format=pdf` streams application/pdf inline
 * (Noto Sans, real ₹ glyph); anything else returns structured JSON.
 */
@Controller("reports")
@Roles("owner")
export class ReportsController {
  constructor(@Inject(ReportsService) private readonly reports: ReportsService) {}

  @Get("occupancy")
  @Header("Content-Disposition", "inline")
  async occupancy(@CurrentUser() user: AuthUser, @Query() q: ReportFilters & { format?: string }) {
    if (q.format === "pdf") {
      return new StreamableFile(await this.reports.occupancyPdf(user, q), {
        type: "application/pdf",
      });
    }
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
      return new StreamableFile(await this.reports.duesPdf(user, filters), {
        type: "application/pdf",
      });
    }
    return this.reports.duesData(user);
  }

  @Get("residents")
  @Header("Content-Disposition", "inline")
  async residents(@CurrentUser() user: AuthUser, @Query() q: ReportFilters & { format?: string }) {
    if (q.format === "pdf") {
      return new StreamableFile(await this.reports.residentsPdf(user, q), {
        type: "application/pdf",
      });
    }
    return this.reports.residentsData(user, q);
  }

  @Get("monthly-collection")
  @Header("Content-Disposition", "inline")
  async monthlyCollection(
    @CurrentUser() user: AuthUser,
    @Query() q: ReportFilters & { format?: string },
  ) {
    if (q.format === "pdf") {
      return new StreamableFile(await this.reports.collectionPdf(user, q), {
        type: "application/pdf",
      });
    }
    return this.reports.collectionData(user, q);
  }
}
