import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { JwtModule } from "@nestjs/jwt";
import { ScheduleModule } from "@nestjs/schedule";
import { ApprovalsModule } from "./approvals/approvals.module";
import { AuditModule } from "./audit/audit.module";
import { AuthModule } from "./auth/auth.module";
import { JwtAuthGuard } from "./common/jwt-auth.guard";
import { RolesGuard } from "./common/roles.guard";
import { ComplaintsModule } from "./complaints/complaints.module";
import { DashboardModule } from "./dashboard/dashboard.module";
import { ExpensesModule } from "./expenses/expenses.module";
import { FilesModule } from "./files/files.module";
import { FinanceModule } from "./finance/finance.module";
import { WingsModule } from "./wings/wings.module";
import { NotificationsModule } from "./notifications/notifications.module";
import { PdfModule } from "./pdf/pdf.module";
import { PrismaModule } from "./prisma/prisma.module";
import { ReportsModule } from "./reports/reports.module";
import { ReservationsModule } from "./reservations/reservations.module";
import { ResidentsModule } from "./residents/residents.module";
import { RoomsModule } from "./rooms/rooms.module";
import { SearchModule } from "./search/search.module";
import { SettingsModule } from "./settings/settings.module";
import { StaffModule } from "./staff/staff.module";
import { VendorsModule } from "./vendors/vendors.module";
import { HealthController } from "./health.controller";

@Module({
  imports: [
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET ?? "dev-only-secret-do-not-use-in-production",
      // jsonwebtoken accepts "1d"-style strings at runtime; its types only
      // admit the template-literal form, hence the cast for env values.
      signOptions: { expiresIn: (process.env.JWT_EXPIRES_IN ?? "1d") as unknown as number },
    }),
    ScheduleModule.forRoot(),
    PrismaModule,
    PdfModule,
    AuditModule,
    AuthModule,
    SettingsModule,
    RoomsModule,
    WingsModule,
    ResidentsModule,
    StaffModule,
    ComplaintsModule,
    NotificationsModule,
    FinanceModule,
    ExpensesModule,
    DashboardModule,
    ReportsModule,
    FilesModule,
    ReservationsModule,
    VendorsModule,
    SearchModule,
    ApprovalsModule,
  ],
  controllers: [HealthController],
  providers: [
    // Order matters: JWT auth first, then role checks.
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
