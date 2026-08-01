import { Inject, Injectable } from "@nestjs/common";
import type { Organization } from "@prisma/client";
import type { AuthUser } from "../common/auth-user";
import { PaymentsService } from "../finance/payments.service";
import { PdfService, pdfMoney, type PdfBrand, type PdfOrgHeader } from "../pdf/pdf.service";
import { PrismaService } from "../prisma/prisma.service";
import { toResidentDto } from "../residents/residents.service";
import { XlsxService } from "../xlsx/xlsx.service";

export interface ReportFilters {
  from?: string;
  to?: string;
  month?: string; // MM
  year?: string; // YYYY
  status?: string; // residents report: active | checked_out | all
}

/** paisa → rupees number, for Excel money cells (formatted with numFmt). */
const rupees = (paisa: number): number => Math.round(paisa) / 100;

@Injectable()
export class ReportsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(PaymentsService) private readonly payments: PaymentsService,
    @Inject(PdfService) private readonly pdf: PdfService,
    @Inject(XlsxService) private readonly xlsx: XlsxService,
  ) {}

  private async orgHeader(
    orgId: string,
  ): Promise<{ org: Organization; header: PdfOrgHeader; brand: PdfBrand }> {
    const org = await this.prisma.organization.findUniqueOrThrow({ where: { id: orgId } });
    return {
      org,
      header: {
        hostelName: org.hostelName ?? org.name,
        addressLine: org.addressLine ?? undefined,
        city: org.city ?? undefined,
        state: org.state ?? undefined,
        pincode: org.pincode ?? undefined,
        phone: org.phone ?? undefined,
        gstin: org.gstEnabled ? (org.gstin ?? undefined) : undefined,
      },
      brand: { primary: org.themeColorPrimary, accent: org.themeColorAccent },
    };
  }

  // ---------- occupancy ----------

  async occupancyData(user: AuthUser) {
    const rooms = await this.prisma.room.findMany({
      where: { orgId: user.orgId },
      include: { beds: true },
      orderBy: [{ floor: "asc" }, { number: "asc" }],
    });
    return rooms.map((r) => {
      const occupied = r.beds.filter((b) => b.status === "occupied").length;
      return {
        floor: r.floor,
        roomNumber: r.number,
        type: r.type,
        capacity: r.capacity,
        occupied,
        vacant: r.capacity - occupied,
        occupancyPct: r.capacity === 0 ? 0 : Math.round((occupied / r.capacity) * 100),
      };
    });
  }

  async occupancyPdf(user: AuthUser, filters: ReportFilters): Promise<Buffer> {
    const rows = await this.occupancyData(user);
    const { header, brand } = await this.orgHeader(user.orgId);
    const totalOccupied = rows.reduce((s, r) => s + r.occupied, 0);
    const totalCapacity = rows.reduce((s, r) => s + r.capacity, 0);
    return this.pdf.table({
      org: header,
      brand,
      title: "Occupancy Report",
      subtitle: rangeSubtitle(filters),
      columns: [
        { label: "Floor", width: 60 },
        { label: "Room", width: 110 },
        { label: "Type", width: 90 },
        { label: "Capacity", width: 90, align: "right" },
        { label: "Occupied", width: 90, align: "right" },
        { label: "Occupancy %", width: 83, align: "right" },
      ],
      rows: rows.map((r) => [
        String(r.floor),
        r.roomNumber,
        r.type,
        String(r.capacity),
        String(r.occupied),
        `${r.occupancyPct}%`,
      ]),
      summary: `Overall: ${totalOccupied}/${totalCapacity} beds occupied (${
        totalCapacity === 0 ? 0 : Math.round((totalOccupied / totalCapacity) * 100)
      }%)`,
    });
  }

  // ---------- dues ----------

  async duesData(user: AuthUser) {
    return this.payments.buildDues(user.orgId);
  }

  async duesPdf(user: AuthUser, filters: ReportFilters): Promise<Buffer> {
    const rows = await this.duesData(user);
    const { header, brand } = await this.orgHeader(user.orgId);
    return this.pdf.table({
      org: header,
      brand,
      title: "Dues Report",
      subtitle: filters.to ? `As of ${filters.to}` : undefined,
      columns: [
        { label: "Resident", width: 140 },
        { label: "Room", width: 70 },
        { label: "Phone", width: 100 },
        { label: "Months", width: 60, align: "right" },
        { label: "Severity", width: 70 },
        { label: "Dues", width: 83, align: "right" },
      ],
      rows: rows.map((d) => [
        d.residentName,
        d.roomNumber ?? "-",
        d.phone,
        String(d.monthsOverdue),
        d.severity,
        pdfMoney(d.duesPaisa),
      ]),
      summary: `Total outstanding: ${pdfMoney(rows.reduce((s, d) => s + d.duesPaisa, 0))}`,
    });
  }

  // ---------- residents ----------

  async residentsData(user: AuthUser, filters: ReportFilters) {
    const status =
      filters.status === "checked_out"
        ? ({ equals: "alumni" } as const)
        : filters.status === "all"
          ? undefined
          : ({ not: "alumni" } as const);
    const rows = await this.prisma.resident.findMany({
      where: {
        orgId: user.orgId,
        ...(status ? { status } : {}),
        ...(filters.from ? { joinDate: { gte: new Date(filters.from) } } : {}),
        ...(filters.to ? { joinDate: { lte: new Date(`${filters.to}T23:59:59.999Z`) } } : {}),
      },
      include: { room: { select: { number: true } }, bed: { select: { id: true, label: true } } },
      orderBy: { name: "asc" },
    });
    return rows.map(toResidentDto);
  }

  async residentsPdf(user: AuthUser, filters: ReportFilters): Promise<Buffer> {
    const rows = await this.residentsData(user, filters);
    const { header, brand } = await this.orgHeader(user.orgId);
    return this.pdf.table({
      org: header,
      brand,
      title: "Resident List",
      subtitle: `Status: ${filters.status ?? "active"}${rangeSuffix(filters)}`,
      columns: [
        { label: "Name", width: 130 },
        { label: "Room", width: 60 },
        { label: "Phone", width: 90 },
        { label: "Joined", width: 80 },
        { label: "Monthly Fee", width: 90, align: "right" },
        { label: "Dues", width: 73, align: "right" },
      ],
      rows: rows.map((r) => [
        r.name,
        r.roomNumber ?? "-",
        r.phone,
        r.joinDate.slice(0, 10),
        pdfMoney(r.monthlyFeePaisa),
        pdfMoney(r.duesPaisa),
      ]),
      summary: `${rows.length} residents`,
    });
  }

  // ---------- monthly collection ----------

  async collectionData(user: AuthUser, filters: ReportFilters) {
    const where: { orgId: string; paidAt?: { gte?: Date; lte?: Date } } = { orgId: user.orgId };
    if (filters.month && filters.year) {
      const m = Number(filters.month) - 1;
      const y = Number(filters.year);
      where.paidAt = { gte: new Date(y, m, 1), lte: new Date(y, m + 1, 0, 23, 59, 59, 999) };
    } else {
      where.paidAt = {};
      if (filters.from) where.paidAt.gte = new Date(filters.from);
      if (filters.to) where.paidAt.lte = new Date(`${filters.to}T23:59:59.999Z`);
    }

    const payments = await this.prisma.payment.findMany({ where });
    const months = new Map<
      string,
      { month: string; rentPaisa: number; depositPaisa: number; otherPaisa: number; totalPaisa: number; paymentCount: number }
    >();
    for (const p of payments) {
      const key = `${p.paidAt.getFullYear()}-${String(p.paidAt.getMonth() + 1).padStart(2, "0")}`;
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

  async collectionPdf(user: AuthUser, filters: ReportFilters): Promise<Buffer> {
    const rows = await this.collectionData(user, filters);
    const { header, brand } = await this.orgHeader(user.orgId);
    return this.pdf.table({
      org: header,
      brand,
      title: "Monthly Collection",
      subtitle:
        filters.month && filters.year ? `${filters.year}-${filters.month}` : rangeSubtitle(filters),
      columns: [
        { label: "Month", width: 80 },
        { label: "Rent", width: 90, align: "right" },
        { label: "Deposits", width: 90, align: "right" },
        { label: "Other", width: 90, align: "right" },
        { label: "Payments", width: 80, align: "right" },
        { label: "Total", width: 93, align: "right" },
      ],
      rows: rows.map((r) => [
        r.month,
        pdfMoney(r.rentPaisa),
        pdfMoney(r.depositPaisa),
        pdfMoney(r.otherPaisa),
        String(r.paymentCount),
        pdfMoney(r.totalPaisa),
      ]),
      summary: `Grand total: ${pdfMoney(rows.reduce((s, r) => s + r.totalPaisa, 0))}`,
    });
  }

  // ---------- Excel exports (feature 13) ----------
  // Each reuses the SAME *Data method as its PDF counterpart — no duplicated
  // query logic between the PDF and Excel paths.

  async occupancyXlsx(user: AuthUser, _filters: ReportFilters): Promise<Buffer> {
    const rows = await this.occupancyData(user);
    const totalOccupied = rows.reduce((s, r) => s + r.occupied, 0);
    const totalCapacity = rows.reduce((s, r) => s + r.capacity, 0);
    return this.xlsx.table({
      sheetName: "Occupancy",
      title: "Occupancy Report",
      columns: [
        { label: "Floor", kind: "number" },
        { label: "Room" },
        { label: "Type" },
        { label: "Capacity", kind: "number" },
        { label: "Occupied", kind: "number" },
        { label: "Occupancy %", kind: "number" },
      ],
      rows: rows.map((r) => [r.floor, r.roomNumber, r.type, r.capacity, r.occupied, r.occupancyPct]),
      summary: `Overall: ${totalOccupied}/${totalCapacity} beds occupied`,
    });
  }

  async duesXlsx(user: AuthUser, _filters: ReportFilters): Promise<Buffer> {
    const rows = await this.duesData(user);
    return this.xlsx.table({
      sheetName: "Dues",
      title: "Dues Report",
      columns: [
        { label: "Resident", width: 24 },
        { label: "Room" },
        { label: "Phone", width: 16 },
        { label: "Months", kind: "number" },
        { label: "Severity" },
        { label: "Dues", kind: "money" },
      ],
      rows: rows.map((d) => [
        d.residentName,
        d.roomNumber ?? "-",
        d.phone,
        d.monthsOverdue,
        d.severity,
        rupees(d.duesPaisa),
      ]),
      summary: `Total outstanding: ${pdfMoney(rows.reduce((s, d) => s + d.duesPaisa, 0))}`,
    });
  }

  async residentsXlsx(user: AuthUser, filters: ReportFilters): Promise<Buffer> {
    const rows = await this.residentsData(user, filters);
    return this.xlsx.table({
      sheetName: "Residents",
      title: "Resident List",
      columns: [
        { label: "Name", width: 24 },
        { label: "Room" },
        { label: "Phone", width: 16 },
        { label: "Joined" },
        { label: "Monthly Fee", kind: "money" },
        { label: "Dues", kind: "money" },
      ],
      rows: rows.map((r) => [
        r.name,
        r.roomNumber ?? "-",
        r.phone,
        r.joinDate.slice(0, 10),
        rupees(r.monthlyFeePaisa),
        rupees(r.duesPaisa),
      ]),
      summary: `${rows.length} residents`,
    });
  }

  async collectionXlsx(user: AuthUser, filters: ReportFilters): Promise<Buffer> {
    const rows = await this.collectionData(user, filters);
    return this.xlsx.table({
      sheetName: "Collection",
      title: "Monthly Collection",
      columns: [
        { label: "Month" },
        { label: "Rent", kind: "money" },
        { label: "Deposits", kind: "money" },
        { label: "Other", kind: "money" },
        { label: "Payments", kind: "number" },
        { label: "Total", kind: "money" },
      ],
      rows: rows.map((r) => [
        r.month,
        rupees(r.rentPaisa),
        rupees(r.depositPaisa),
        rupees(r.otherPaisa),
        r.paymentCount,
        rupees(r.totalPaisa),
      ]),
      summary: `Grand total: ${pdfMoney(rows.reduce((s, r) => s + r.totalPaisa, 0))}`,
    });
  }

  // ---------- staff report (feature 14) ----------

  /**
   * Staff roster + attendance summary. Attendance tracking is Phase BG-3; until
   * it exists this report gracefully reports "not yet tracked" per member rather
   * than erroring. Shape is stable so the BG-3 phase can fill attendance in
   * without changing the report contract.
   */
  async staffData(user: AuthUser) {
    const [owners, staff] = await this.prisma.$transaction([
      this.prisma.owner.findMany({ where: { orgId: user.orgId }, orderBy: { createdAt: "asc" } }),
      this.prisma.staff.findMany({ where: { orgId: user.orgId }, orderBy: { createdAt: "asc" } }),
    ]);
    const roster = [
      ...owners.map((o) => ({
        name: o.name,
        email: o.email,
        phone: o.phone ?? "",
        role: "owner",
        status: "active",
        permissions: ["*"],
        addedAt: o.createdAt.toISOString(),
        lastActiveAt: undefined as string | undefined,
        attendance: "not_yet_tracked" as const,
      })),
      ...staff.map((s) => ({
        name: s.name,
        email: s.email,
        phone: s.phone ?? "",
        role: s.role,
        status: s.status,
        permissions: s.permissions,
        addedAt: s.createdAt.toISOString(),
        lastActiveAt: s.lastLoginAt?.toISOString(),
        attendance: "not_yet_tracked" as const,
      })),
    ];
    return {
      roster,
      total: roster.length,
      activeCount: roster.filter((m) => m.status === "active").length,
      // Signals to the frontend that the attendance block is a placeholder
      // pending Phase BG-3, so it can render "Not yet tracked" instead of zeros.
      attendanceTracking: { available: false, note: "Attendance tracking arrives in Phase BG-3" },
    };
  }

  async staffPdf(user: AuthUser): Promise<Buffer> {
    const data = await this.staffData(user);
    const { header, brand } = await this.orgHeader(user.orgId);
    return this.pdf.table({
      org: header,
      brand,
      title: "Staff Roster",
      subtitle: `${data.total} people · ${data.activeCount} active · attendance not yet tracked (Phase BG-3)`,
      columns: [
        { label: "Name", width: 120 },
        { label: "Role", width: 90 },
        { label: "Status", width: 70 },
        { label: "Phone", width: 100 },
        { label: "Added", width: 80 },
        { label: "Attendance", width: 80 },
      ],
      rows: data.roster.map((m) => [
        m.name,
        m.role,
        m.status,
        m.phone,
        m.addedAt.slice(0, 10),
        "Not tracked",
      ]),
      summary: `${data.total} staff/owners`,
    });
  }

  async staffXlsx(user: AuthUser): Promise<Buffer> {
    const data = await this.staffData(user);
    return this.xlsx.table({
      sheetName: "Staff",
      title: "Staff Roster",
      subtitle: `${data.total} people · ${data.activeCount} active · attendance not yet tracked (Phase BG-3)`,
      columns: [
        { label: "Name", width: 24 },
        { label: "Role" },
        { label: "Status" },
        { label: "Phone", width: 16 },
        { label: "Added" },
        { label: "Attendance" },
      ],
      rows: data.roster.map((m) => [
        m.name,
        m.role,
        m.status,
        m.phone,
        m.addedAt.slice(0, 10),
        "Not tracked",
      ]),
      summary: `${data.total} staff/owners`,
    });
  }
}

function rangeSubtitle(filters: ReportFilters): string | undefined {
  if (filters.from || filters.to) {
    return `Period: ${filters.from ?? "…"} to ${filters.to ?? "…"}`;
  }
  return undefined;
}

function rangeSuffix(filters: ReportFilters): string {
  return filters.from || filters.to ? ` — joined ${filters.from ?? "…"} to ${filters.to ?? "…"}` : "";
}
