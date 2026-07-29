import { Controller, Get, Inject, Injectable, Module } from "@nestjs/common";
import type { AuthUser } from "../common/auth-user";
import { CurrentUser } from "../common/decorators";
import { toPaymentDto, PaymentsService } from "../finance/payments.service";
import { FinanceModule } from "../finance/finance.module";
import { PrismaService } from "../prisma/prisma.service";

function ym(offset: number): string {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

@Injectable()
export class DashboardService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(PaymentsService) private readonly payments: PaymentsService,
  ) {}

  async getDashboard(user: AuthUser) {
    const orgId = user.orgId;
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const [beds, activeResidents, recentPayments, monthPayments, openComplaints] =
      await Promise.all([
        this.prisma.bed.groupBy({
          by: ["status"],
          where: { orgId },
          _count: { _all: true },
          orderBy: { status: "asc" },
        }),
        this.prisma.resident.findMany({
          where: { orgId, status: "active" },
          select: { monthlyFeePaisa: true },
        }),
        this.prisma.payment.findMany({
          where: { orgId },
          include: { resident: { select: { name: true, room: { select: { number: true } } } } },
          orderBy: { paidAt: "desc" },
          take: 5,
        }),
        this.prisma.payment.findMany({
          where: { orgId, paidAt: { gte: sixMonthsAgo } },
          select: { paidAt: true, amountPaisa: true, refundedPaisa: true, status: true },
        }),
        this.prisma.complaint.findMany({
          where: { orgId, status: { in: ["open", "in_progress"] } },
          include: {
            resident: { select: { name: true, room: { select: { number: true } } } },
            timeline: { orderBy: { at: "asc" } },
            attachments: true,
          },
          orderBy: { createdAt: "desc" },
          take: 5,
        }),
      ]);

    const count = (status: string) =>
      beds.find((b) => b.status === status)?._count._all ?? 0;
    const totalBeds = beds.reduce((s, b) => s + b._count._all, 0);
    const occupiedBeds = count("occupied");
    const maintenanceBeds = count("maintenance");

    const thisMonthKey = ym(0);
    const monthKey = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

    const collectedPaisa = monthPayments
      .filter((p) => monthKey(p.paidAt) === thisMonthKey && p.status !== "refunded")
      .reduce((s, p) => s + p.amountPaisa - p.refundedPaisa, 0);
    const expectedPaisa = activeResidents.reduce((s, r) => s + r.monthlyFeePaisa, 0);

    const collectionsChart = Array.from({ length: 6 }, (_, i) => {
      const key = ym(i - 5);
      return {
        month: key,
        amountPaisa: monthPayments
          .filter((p) => monthKey(p.paidAt) === key)
          .reduce((s, p) => s + p.amountPaisa - p.refundedPaisa, 0),
      };
    });

    return {
      occupancy: {
        totalBeds,
        occupiedBeds,
        vacantBeds: totalBeds - occupiedBeds - maintenanceBeds,
        maintenanceBeds,
        occupancyPct: totalBeds === 0 ? 0 : Math.round((occupiedBeds / totalBeds) * 100),
      },
      dues: await this.payments.duesSummary(user),
      thisMonth: { collectedPaisa, expectedPaisa },
      recentPayments: recentPayments.map(toPaymentDto),
      recentComplaints: openComplaints.map((c) => ({
        id: c.id,
        ticketNo: c.ticketNo,
        title: c.title,
        description: c.description,
        category: c.category,
        priority: c.priority,
        status: c.status,
        residentId: c.residentId ?? undefined,
        residentName: c.resident?.name,
        roomNumber: c.resident?.room?.number,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
        timeline: c.timeline.map((e) => ({
          id: e.id,
          status: e.status,
          note: e.note ?? undefined,
          byName: e.byName,
          at: e.at.toISOString(),
        })),
        attachments: [],
      })),
      collectionsChart,
    };
  }
}

@Controller("dashboard")
export class DashboardController {
  constructor(@Inject(DashboardService) private readonly dashboard: DashboardService) {}

  @Get()
  getDashboard(@CurrentUser() user: AuthUser) {
    return this.dashboard.getDashboard(user);
  }
}

@Module({
  imports: [FinanceModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
