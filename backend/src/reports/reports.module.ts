import { Module } from "@nestjs/common";
import { FinanceModule } from "../finance/finance.module";
import { ReportSchedulesController } from "./report-schedules.controller";
import { ReportSchedulesService } from "./report-schedules.service";
import { ReportsController } from "./reports.controller";
import { ReportsService } from "./reports.service";

@Module({
  imports: [FinanceModule],
  controllers: [ReportsController, ReportSchedulesController],
  providers: [ReportsService, ReportSchedulesService],
})
export class ReportsModule {}
