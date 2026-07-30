import type { DashboardData } from "@/api/types";
import { Card } from "@/components/ui/Card";
import { formatMoney } from "@/lib/format";

function MiniStat({
  label,
  value,
  children,
}: {
  label: string;
  value: string;
  children?: React.ReactNode;
}) {
  return (
    <Card className="p-3">
      <p className="text-[11px] font-medium tracking-wide text-muted uppercase">{label}</p>
      <p className="mt-1 font-mono text-lg font-semibold text-primary">{value}</p>
      {children}
    </Card>
  );
}

/** Row 2 — five smaller cards, 5-col desktop collapsing to 2-col mobile. */
export function SmallStatsGrid({ data }: { data: DashboardData }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      <MiniStat label="Active Residents" value={String(data.activeResidents)} />
      <MiniStat label="Advance Collection" value={formatMoney(data.advanceCollectedPaisa)} />
      <MiniStat label="Cash Inflow" value={formatMoney(data.cashInflowPaisa)} />
      <MiniStat label="Complaints" value={String(data.complaints.total)}>
        <p className="mt-0.5 text-[11px] text-muted">
          <span className="text-red-600">{data.complaints.active} active</span> ·{" "}
          <span className="text-green-700">{data.complaints.resolved} resolved</span>
        </p>
      </MiniStat>
      <MiniStat label="Expense" value={formatMoney(data.expense.totalPaisa)} />
    </div>
  );
}
