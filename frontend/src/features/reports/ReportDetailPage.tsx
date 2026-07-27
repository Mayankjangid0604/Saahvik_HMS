import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, FileDown } from "lucide-react";
import {
  getDuesReport,
  getMonthlyCollectionReport,
  getOccupancyReport,
  getResidentListReport,
} from "@/api/report.api";
import type { ReportFilters } from "@/api/types";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { PDFViewer } from "@/components/shared/PDFViewer";
import { generateTableReportPdf } from "@/lib/pdf";
import { formatDate, formatMoney, formatMonth } from "@/lib/format";
import { useAuth } from "@/features/auth/AuthContext";

interface ReportDef {
  title: string;
  columns: string[];
  pdfColumns: { label: string; width: number; align?: "left" | "right" }[];
  fetch: (filters: ReportFilters) => Promise<string[][]>;
  summary?: (rows: string[][]) => string;
}

const defs: Record<string, ReportDef> = {
  occupancy: {
    title: "Occupancy report",
    columns: ["Room", "Floor", "Type", "Capacity", "Occupied", "Vacant", "Occupancy"],
    pdfColumns: [
      { label: "Room", width: 34 },
      { label: "Floor", width: 20 },
      { label: "Type", width: 26 },
      { label: "Capacity", width: 26, align: "right" },
      { label: "Occupied", width: 26, align: "right" },
      { label: "Vacant", width: 24, align: "right" },
      { label: "Occ %", width: 26, align: "right" },
    ],
    fetch: async (f) =>
      (await getOccupancyReport(f)).map((r) => [
        r.roomNumber,
        String(r.floor),
        r.type,
        String(r.capacity),
        String(r.occupied),
        String(r.vacant),
        `${r.occupancyPct}%`,
      ]),
  },
  dues: {
    title: "Dues report",
    columns: ["Resident", "Room", "Phone", "Outstanding", "Months", "Severity"],
    pdfColumns: [
      { label: "Resident", width: 44 },
      { label: "Room", width: 26 },
      { label: "Phone", width: 30 },
      { label: "Outstanding", width: 34, align: "right" },
      { label: "Months", width: 22, align: "right" },
      { label: "Severity", width: 26 },
    ],
    fetch: async (f) => {
      void f;
      const rows = await getDuesReport();
      return rows.map((d) => [
        d.residentName,
        d.roomNumber ?? "-",
        d.phone,
        formatMoney(d.duesPaisa),
        String(d.monthsOverdue),
        d.severity,
      ]);
    },
    summary: (rows) => `${rows.length} residents with dues`,
  },
  residents: {
    title: "Resident list",
    columns: ["Name", "Phone", "Room / Bed", "Monthly fee", "Joined", "Guardian phone"],
    pdfColumns: [
      { label: "Name", width: 42 },
      { label: "Phone", width: 28 },
      { label: "Room/Bed", width: 30 },
      { label: "Fee", width: 26, align: "right" },
      { label: "Joined", width: 28 },
      { label: "Guardian Ph", width: 28 },
    ],
    fetch: async (f) =>
      (await getResidentListReport(f)).map((r) => [
        r.name,
        r.phone,
        r.roomNumber ? `${r.roomNumber} / ${r.bedLabel}` : "-",
        formatMoney(r.monthlyFeePaisa),
        formatDate(r.joinDate),
        r.guardianPhone || "-",
      ]),
    summary: (rows) => `${rows.length} active residents`,
  },
  collections: {
    title: "Monthly collection report",
    columns: ["Month", "Rent", "Deposits", "Other", "Total", "Payments"],
    pdfColumns: [
      { label: "Month", width: 30 },
      { label: "Rent", width: 32, align: "right" },
      { label: "Deposits", width: 32, align: "right" },
      { label: "Other", width: 30, align: "right" },
      { label: "Total", width: 34, align: "right" },
      { label: "Count", width: 22, align: "right" },
    ],
    fetch: async (f) =>
      (await getMonthlyCollectionReport(f)).map((r) => [
        formatMonth(r.month),
        formatMoney(r.rentPaisa),
        formatMoney(r.depositPaisa),
        formatMoney(r.otherPaisa),
        formatMoney(r.totalPaisa),
        String(r.paymentCount),
      ]),
  },
};

export function ReportDetailPage() {
  const { type = "" } = useParams();
  const navigate = useNavigate();
  const { org } = useAuth();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  const def = defs[type];

  const { data: rows, isLoading } = useQuery({
    queryKey: ["reports", type, { from, to }],
    queryFn: () => def.fetch({ from: from || undefined, to: to || undefined }),
    enabled: !!def,
  });

  if (!def) {
    return (
      <EmptyState
        title="Unknown report"
        description={`"${type}" is not a report type.`}
        action={
          <Button variant="outline" size="sm" onClick={() => navigate("/reports")}>
            Back to reports
          </Button>
        }
      />
    );
  }

  const downloadPdf = () => {
    if (!rows) return;
    // PDF table can't render the ₹ glyph — swap for "Rs."
    const pdfRows = rows.map((r) => r.map((c) => c.replace(/₹/g, "Rs. ")));
    const url = generateTableReportPdf({
      org,
      title: def.title,
      subtitle:
        from || to
          ? `Period: ${from || "start"} to ${to || "today"}`
          : `Generated on ${formatDate(new Date())}`,
      columns: def.pdfColumns,
      rows: pdfRows,
      summary: def.summary?.(rows),
    });
    setPdfUrl(url);
  };

  return (
    <div>
      <button
        onClick={() => navigate("/reports")}
        className="mb-2 flex items-center gap-1 text-xs text-muted hover:text-ink"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> All reports
      </button>
      <PageHeader
        title={def.title}
        actions={
          <Button size="sm" onClick={downloadPdf} disabled={!rows || rows.length === 0}>
            <FileDown className="h-3.5 w-3.5" /> Download PDF
          </Button>
        }
      />

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <label className="text-xs text-muted">From</label>
        <Input type="date" className="w-36" value={from} onChange={(e) => setFrom(e.target.value)} />
        <label className="text-xs text-muted">To</label>
        <Input type="date" className="w-36" value={to} onChange={(e) => setTo(e.target.value)} />
        {(from || to) && (
          <button
            className="text-xs font-medium text-accent-600 hover:underline"
            onClick={() => {
              setFrom("");
              setTo("");
            }}
          >
            Clear
          </button>
        )}
      </div>

      <Card className="overflow-hidden">
        {isLoading || !rows ? (
          <TableSkeleton cols={def.columns.length} />
        ) : rows.length === 0 ? (
          <EmptyState title="No data for this period" description="Try widening the date range." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-max text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-left">
                  {def.columns.map((c) => (
                    <th key={c} className="h-9 px-4 text-xs font-semibold whitespace-nowrap text-slate-600">
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={i} className="h-11 border-b border-slate-100 last:border-0">
                    {row.map((cell, c) => (
                      <td
                        key={c}
                        className={
                          /^₹|^\d+%?$/.test(cell)
                            ? "px-4 font-mono whitespace-nowrap"
                            : "px-4 whitespace-nowrap"
                        }
                      >
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {rows && def.summary && rows.length > 0 && (
          <p className="border-t border-slate-100 px-4 py-2 text-right text-xs font-medium text-muted">
            {def.summary(rows)}
          </p>
        )}
      </Card>

      <PDFViewer
        isOpen={!!pdfUrl}
        onClose={() => setPdfUrl(null)}
        blobUrl={pdfUrl}
        fileName={`saahvik-${type}-report.pdf`}
        title={def.title}
      />
    </div>
  );
}
