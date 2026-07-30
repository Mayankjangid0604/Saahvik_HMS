import { Controller, Get, Inject, Injectable, Module } from "@nestjs/common";
import type { PaymentMethod } from "@prisma/client";
import { IsIn, IsOptional } from "class-validator";
import type { AuthUser } from "../common/auth-user";
import { CurrentUser } from "../common/decorators";
import { userHasPermission } from "../common/permissions";
import { ValidatedQuery } from "../common/validated";
import { toPaymentDto, PaymentsService } from "../finance/payments.service";
import { FinanceModule } from "../finance/finance.module";
import { PrismaService } from "../prisma/prisma.service";

// ---------- range windows ----------

const RANGES = [
  "today",
  "yesterday",
  "last7",
  "thisMonth",
  "lastMonth",
  "thisQuarter",
  "thisYear",
] as const;
type DashboardRange = (typeof RANGES)[number];

const RANGE_LABELS: Record<DashboardRange, string> = {
  today: "Today",
  yesterday: "Yesterday",
  last7: "Last 7 days",
  thisMonth: "This month",
  lastMonth: "Last month",
  thisQuarter: "This quarter",
  thisYear: "This year",
};

type Granularity = "hour" | "day" | "month";

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

/** [start, end] window + chart granularity for a range. Uses server-local time. */
function rangeWindow(range: DashboardRange, now: Date): {
  start: Date;
  end: Date;
  granularity: Granularity;
} {
  switch (range) {
    case "today":
      return { start: startOfDay(now), end: now, granularity: "hour" };
    case "yesterday": {
      const start = startOfDay(now);
      start.setDate(start.getDate() - 1);
      const end = new Date(startOfDay(now).getTime() - 1);
      return { start, end, granularity: "hour" };
    }
    case "last7": {
      const start = startOfDay(now);
      start.setDate(start.getDate() - 6);
      return { start, end: now, granularity: "day" };
    }
    case "thisMonth": {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      return { start, end: now, granularity: "day" };
    }
    case "lastMonth": {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, -1);
      return { start, end, granularity: "day" };
    }
    case "thisQuarter": {
      const q = Math.floor(now.getMonth() / 3);
      const start = new Date(now.getFullYear(), q * 3, 1);
      return { start, end: now, granularity: "month" };
    }
    case "thisYear": {
      const start = new Date(now.getFullYear(), 0, 1);
      return { start, end: now, granularity: "month" };
    }
  }
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Ordered chart buckets + a keyOf() that maps a date to its bucket key. */
function makeBuckets(start: Date, end: Date, granularity: Granularity): {
  order: { key: string; label: string }[];
  keyOf: (d: Date) => string;
} {
  if (granularity === "hour") {
    const order = Array.from({ length: 24 }, (_, h) => ({
      key: String(h),
      label: `${((h + 11) % 12) + 1}${h < 12 ? "a" : "p"}`,
    }));
    return { order, keyOf: (d) => String(d.getHours()) };
  }
  if (granularity === "day") {
    const order: { key: string; label: string }[] = [];
    const cur = startOfDay(start);
    const last = startOfDay(end);
    while (cur <= last) {
      order.push({
        key: `${cur.getFullYear()}-${cur.getMonth()}-${cur.getDate()}`,
        label: `${cur.getDate()} ${MONTHS[cur.getMonth()]}`,
      });
      cur.setDate(cur.getDate() + 1);
    }
    return { order, keyOf: (d) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}` };
  }
  // month
  const order: { key: string; label: string }[] = [];
  const cur = new Date(start.getFullYear(), start.getMonth(), 1);
  const last = new Date(end.getFullYear(), end.getMonth(), 1);
  while (cur <= last) {
    order.push({ key: `${cur.getFullYear()}-${cur.getMonth()}`, label: MONTHS[cur.getMonth()] });
    cur.setMonth(cur.getMonth() + 1);
  }
  return { order, keyOf: (d) => `${d.getFullYear()}-${d.getMonth()}` };
}

const EMPTY_BY_METHOD = (): Record<PaymentMethod, number> => ({
  cash: 0,
  upi: 0,
  bank_transfer: 0,
  card: 0,
  cheque: 0,
});

type PaymentSlice = {
  paidAt: Date;
  amountPaisa: number;
  refundedPaisa: number;
  method: PaymentMethod;
  type: string;
};

const netOf = (p: { amountPaisa: number; refundedPaisa: number }) => p.amountPaisa - p.refundedPaisa;

@Injectable()
export class DashboardService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(PaymentsService) private readonly payments: PaymentsService,
  ) {}

  async getDashboard(user: AuthUser, range: DashboardRange) {
    const orgId = user.orgId;
    const now = new Date();
    const { start, end, granularity } = rangeWindow(range, now);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      beds,
      hostels,
      rangePayments,
      monthPayments,
      rangeExpenses,
      monthExpenses,
      recentPayments,
      openComplaints,
      complaintCounts,
      activeResidents,
      advanceBalanceAgg,
      dues,
      expensesVisible,
    ] = await Promise.all([
      this.prisma.bed.findMany({
        where: { orgId },
        select: { status: true, room: { select: { hostelId: true } } },
      }),
      this.prisma.hostel.findMany({
        where: { orgId },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
      this.prisma.payment.findMany({
        where: { orgId, paidAt: { gte: start, lte: end } },
        select: { paidAt: true, amountPaisa: true, refundedPaisa: true, method: true, type: true, advanceAppliedPaisa: true },
      }),
      this.prisma.payment.findMany({
        where: { orgId, paidAt: { gte: monthStart, lte: now } },
        select: { paidAt: true, amountPaisa: true, refundedPaisa: true, method: true, type: true, advanceAppliedPaisa: true },
      }),
      this.prisma.expense.findMany({
        where: { orgId, spentAt: { gte: start, lte: end } },
        select: { amountPaisa: true, categoryId: true, category: { select: { name: true } } },
      }),
      this.prisma.expense.findMany({
        where: { orgId, spentAt: { gte: monthStart, lte: now } },
        select: { amountPaisa: true },
      }),
      this.prisma.payment.findMany({
        where: { orgId },
        include: { resident: { select: { name: true, room: { select: { number: true } } } } },
        orderBy: { paidAt: "desc" },
        take: 5,
      }),
      this.prisma.complaint.findMany({
        where: { orgId, status: { in: ["open", "in_progress"] } },
        include: {
          resident: { select: { name: true, room: { select: { number: true } } } },
          timeline: { orderBy: { at: "asc" } },
        },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
      this.prisma.complaint.groupBy({
        by: ["status"],
        where: { orgId },
        _count: { _all: true },
      }),
      this.prisma.resident.count({ where: { orgId, status: "active" } }),
      this.prisma.resident.aggregate({
        where: { orgId, status: "active" },
        _sum: { advanceBalancePaisa: true },
      }),
      this.payments.buildDues(orgId),
      userHasPermission(this.prisma, user, "manageExpenses"),
    ]);

    // ----- occupancy (point in time), overall + per hostel -----
    const totalBeds = beds.length;
    const occupiedBeds = beds.filter((b) => b.status === "occupied").length;
    const maintenanceBeds = beds.filter((b) => b.status === "maintenance").length;
    const byProperty = hostels.map((h) => {
      const hostelBeds = beds.filter((b) => b.room?.hostelId === h.id);
      const occ = hostelBeds.filter((b) => b.status === "occupied").length;
      return {
        id: h.id,
        name: h.name,
        occupiedBeds: occ,
        totalBeds: hostelBeds.length,
        occupancyPct: hostelBeds.length === 0 ? 0 : Math.round((occ / hostelBeds.length) * 100),
      };
    });

    // ----- collection (range), by method -----
    const collection = this.collectionOf(rangePayments);
    // Advance collected = rent overpayment routed to advance this range (exact
    // fact persisted per payment), NOT security-deposit intake.
    const advanceCollectedPaisa = rangePayments.reduce((s, p) => s + p.advanceAppliedPaisa, 0);
    const advanceBalanceTotalPaisa = advanceBalanceAgg._sum.advanceBalancePaisa ?? 0;

    // ----- expenses (range) + breakdown -----
    const expenseTotal = rangeExpenses.reduce((s, e) => s + e.amountPaisa, 0);
    const byCategory = new Map<string, { label: string; amountPaisa: number }>();
    for (const e of rangeExpenses) {
      const cur = byCategory.get(e.categoryId) ?? { label: e.category.name, amountPaisa: 0 };
      cur.amountPaisa += e.amountPaisa;
      byCategory.set(e.categoryId, cur);
    }
    const expenseBreakdown = [...byCategory.entries()]
      .map(([categoryId, v]) => ({
        categoryId,
        label: v.label,
        amountPaisa: v.amountPaisa,
        pct: expenseTotal === 0 ? 0 : Math.round((v.amountPaisa / expenseTotal) * 100),
      }))
      .sort((a, b) => b.amountPaisa - a.amountPaisa);

    // ----- collections chart (range granularity) -----
    const { order, keyOf } = makeBuckets(start, end, granularity);
    const chartMap = new Map(order.map((o) => [o.key, 0]));
    for (const p of rangePayments) {
      const k = keyOf(p.paidAt);
      if (chartMap.has(k)) chartMap.set(k, (chartMap.get(k) ?? 0) + netOf(p));
    }
    const collectionsChart = order.map((o) => ({
      label: o.label,
      amountPaisa: chartMap.get(o.key) ?? 0,
    }));

    // ----- complaint counts (point in time) -----
    const cCount = (statuses: string[]) =>
      complaintCounts
        .filter((c) => statuses.includes(c.status))
        .reduce((s, c) => s + c._count._all, 0);
    const complaints = {
      total: complaintCounts.reduce((s, c) => s + c._count._all, 0),
      active: cCount(["open", "in_progress"]),
      resolved: cCount(["resolved", "closed"]),
    };

    // ----- fixed "this calendar month" card (never range-filtered) -----
    const monthCollection = monthPayments.reduce((s, p) => s + netOf(p), 0);
    const monthAdvance = monthPayments.reduce((s, p) => s + p.advanceAppliedPaisa, 0);
    const monthExpenseTotal = monthExpenses.reduce((s, e) => s + e.amountPaisa, 0);

    return {
      range,
      rangeLabel: RANGE_LABELS[range],
      occupancy: {
        totalBeds,
        occupiedBeds,
        vacantBeds: totalBeds - occupiedBeds - maintenanceBeds,
        maintenanceBeds,
        occupancyPct: totalBeds === 0 ? 0 : Math.round((occupiedBeds / totalBeds) * 100),
        byProperty,
      },
      dues: {
        totalDuesPaisa: dues.reduce((s, d) => s + d.duesPaisa, 0),
        residentsWithDues: dues.length,
        highSeverityCount: dues.filter((d) => d.severity === "high").length,
      },
      collection: { totalPaisa: collection.total, byMethod: collection.byMethod },
      activeResidents,
      advanceCollectedPaisa,
      advanceBalanceTotalPaisa,
      cashInflowPaisa: collection.byMethod.cash,
      complaints,
      // Profit + expense figures reveal spending — only for owners / staff with
      // manageExpenses. The frontend gates the Profit and Expense cards on this
      // flag; the keys are genuinely absent (not zeroed) when hidden.
      expensesVisible,
      ...(expensesVisible
        ? {
            netProfitPaisa: collection.total - expenseTotal,
            expense: { totalPaisa: expenseTotal, breakdown: expenseBreakdown },
          }
        : {}),
      collectionsChart,
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
      // Longest overdue first, then largest amount — top 8 for the dashboard list.
      dueResidents: [...dues]
        .sort((a, b) => b.monthsOverdue - a.monthsOverdue || b.duesPaisa - a.duesPaisa)
        .slice(0, 8),
      thisMonthFixed: {
        collectionPaisa: monthCollection,
        advancePaisa: monthAdvance,
        // Net profit reveals expenses too — omit for users who can't see them.
        ...(expensesVisible ? { netProfitPaisa: monthCollection - monthExpenseTotal } : {}),
      },
    };
  }

  private collectionOf(payments: PaymentSlice[]) {
    const byMethod = EMPTY_BY_METHOD();
    let total = 0;
    for (const p of payments) {
      const net = netOf(p);
      byMethod[p.method] += net;
      total += net;
    }
    return { total, byMethod };
  }
}

class DashboardQueryDto {
  @IsOptional()
  @IsIn(RANGES)
  range?: DashboardRange;
}

@Controller("dashboard")
export class DashboardController {
  constructor(@Inject(DashboardService) private readonly dashboard: DashboardService) {}

  @Get()
  getDashboard(
    @CurrentUser() user: AuthUser,
    @ValidatedQuery(DashboardQueryDto) query: DashboardQueryDto,
  ) {
    return this.dashboard.getDashboard(user, query.range ?? "thisMonth");
  }
}

@Module({
  imports: [FinanceModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
