/** Mock dashboard API. */
import type { DashboardData } from "./types";
import { complaints, delay, payments, residents, rooms, ym } from "./mock/db";
import { getDuesSummary } from "./payment.api";

export async function getDashboard(): Promise<DashboardData> {
  await delay(450);

  const allBeds = rooms.flatMap((r) => r.beds);
  const occupiedBeds = allBeds.filter((b) => b.status === "occupied").length;
  const maintenanceBeds = allBeds.filter((b) => b.status === "maintenance").length;
  const vacantBeds = allBeds.length - occupiedBeds - maintenanceBeds;

  const dues = await getDuesSummary();

  const thisMonthKey = ym(0);
  const collectedPaisa = payments
    .filter((p) => p.paidAt.startsWith(thisMonthKey) && p.status !== "refunded")
    .reduce((s, p) => s + p.amountPaisa - p.refundedPaisa, 0);
  const expectedPaisa = residents
    .filter((r) => r.status === "active")
    .reduce((s, r) => s + r.monthlyFeePaisa, 0);

  const collectionsChart = Array.from({ length: 6 }, (_, i) => {
    const key = ym(i - 5);
    return {
      month: key,
      amountPaisa: payments
        .filter((p) => p.paidAt.startsWith(key))
        .reduce((s, p) => s + p.amountPaisa - p.refundedPaisa, 0),
    };
  });

  return {
    occupancy: {
      totalBeds: allBeds.length,
      occupiedBeds,
      vacantBeds,
      maintenanceBeds,
      occupancyPct: Math.round((occupiedBeds / allBeds.length) * 100),
    },
    dues,
    thisMonth: { collectedPaisa, expectedPaisa },
    recentPayments: payments.slice(0, 5).map((p) => ({ ...p })),
    recentComplaints: complaints
      .filter((c) => c.status === "open" || c.status === "in_progress")
      .slice(0, 5)
      .map((c) => ({ ...c })),
    collectionsChart,
  };
}
