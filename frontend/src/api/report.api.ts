/** Mock reports API: the four Basic-plan reports. */
import type {
  CollectionReportRow,
  DueEntry,
  OccupancyReportRow,
  ReportFilters,
  Resident,
} from "./types";
import { delay, payments, residents, rooms } from "./mock/db";
import { listDues } from "./payment.api";

export async function getOccupancyReport(_filters: ReportFilters = {}): Promise<OccupancyReportRow[]> {
  await delay(500);
  return rooms.map((r) => {
    const occupied = r.beds.filter((b) => b.status === "occupied").length;
    return {
      floor: r.floor,
      roomNumber: r.number,
      type: r.type,
      capacity: r.capacity,
      occupied,
      vacant: r.capacity - occupied,
      occupancyPct: Math.round((occupied / r.capacity) * 100),
    };
  });
}

export async function getDuesReport(_filters: ReportFilters = {}): Promise<DueEntry[]> {
  const res = await listDues({ page: 1, pageSize: 500 });
  return res.data;
}

export async function getResidentListReport(filters: ReportFilters = {}): Promise<Resident[]> {
  await delay(500);
  let list = residents.filter((r) => r.status !== "alumni");
  if (filters.from) list = list.filter((r) => r.joinDate >= filters.from!);
  if (filters.to) list = list.filter((r) => r.joinDate <= `${filters.to}T23:59:59`);
  return list.map((r) => ({ ...r }));
}

export async function getMonthlyCollectionReport(
  filters: ReportFilters = {},
): Promise<CollectionReportRow[]> {
  await delay(500);
  const months = new Map<string, CollectionReportRow>();
  for (const p of payments) {
    const key = p.paidAt.slice(0, 7);
    if (filters.from && key < filters.from.slice(0, 7)) continue;
    if (filters.to && key > filters.to.slice(0, 7)) continue;
    let row = months.get(key);
    if (!row) {
      row = { month: key, rentPaisa: 0, depositPaisa: 0, otherPaisa: 0, totalPaisa: 0, paymentCount: 0 };
      months.set(key, row);
    }
    const net = p.amountPaisa - p.refundedPaisa;
    if (p.type === "rent") row.rentPaisa += net;
    else if (p.type === "deposit") row.depositPaisa += net;
    else row.otherPaisa += net;
    row.totalPaisa += net;
    row.paymentCount++;
  }
  return [...months.values()].sort((a, b) => b.month.localeCompare(a.month));
}
