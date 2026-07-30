import type { CollectionByMethod, DashboardData, PaymentMethod } from "@/api/types";
import { Card } from "@/components/ui/Card";
import { MoneyDisplay } from "@/components/shared/MoneyDisplay";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/cn";
import { BreakdownBars, type BreakdownItem } from "./BreakdownBars";

const METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: "Cash",
  upi: "UPI",
  bank_transfer: "Bank transfer",
  card: "Card",
  cheque: "Cheque",
};

function methodBreakdown(byMethod: CollectionByMethod, total: number): BreakdownItem[] {
  return (Object.keys(METHOD_LABELS) as PaymentMethod[])
    .map((m) => ({
      key: m,
      label: METHOD_LABELS[m],
      amountPaisa: byMethod[m],
      pct: total === 0 ? 0 : Math.round((byMethod[m] / total) * 100),
    }))
    .filter((it) => it.amountPaisa > 0)
    .sort((a, b) => b.amountPaisa - a.amountPaisa);
}

function BigCard({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="flex flex-col p-4">
      <p className="text-[11px] font-medium tracking-wide text-muted uppercase">{label}</p>
      {children}
    </Card>
  );
}

/** Row 1 — four equal-height cards: Occupancy, Dues, Total Collection, Profit. */
export function LargeStatsGrid({ data }: { data: DashboardData }) {
  const { occupancy, dues, collection, netProfitPaisa } = data;
  const showProperties = occupancy.byProperty.length > 1;
  const profitPositive = netProfitPaisa >= 0;

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {/* Occupancy */}
      <BigCard label="Occupancy">
        <p className="mt-1 font-mono text-2xl font-semibold text-primary">{occupancy.occupancyPct}%</p>
        <p className="mt-0.5 text-xs text-muted">
          {occupancy.occupiedBeds}/{occupancy.totalBeds} beds occupied
        </p>
        {showProperties && (
          <ul className="mt-3 space-y-1.5 border-t border-slate-100 pt-3">
            {occupancy.byProperty.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-2 text-xs">
                <span className="truncate text-ink">{p.name}</span>
                <span className="shrink-0 font-mono tabular-nums text-muted">
                  {p.occupiedBeds}/{p.totalBeds} · {p.occupancyPct}%
                </span>
              </li>
            ))}
          </ul>
        )}
      </BigCard>

      {/* Dues */}
      <BigCard label="Outstanding Dues">
        <MoneyDisplay
          paisa={dues.totalDuesPaisa}
          className={cn("mt-1 text-2xl font-semibold", dues.totalDuesPaisa > 0 ? "text-red-600" : "text-green-700")}
        />
        <div className="mt-3 grid grid-cols-2 gap-2 border-t border-slate-100 pt-3 text-xs">
          <div>
            <p className="font-mono text-sm font-semibold text-ink">{dues.residentsWithDues}</p>
            <p className="text-muted">residents</p>
          </div>
          <div>
            <p className="font-mono text-sm font-semibold text-red-600">{dues.highSeverityCount}</p>
            <p className="text-muted">high risk</p>
          </div>
        </div>
      </BigCard>

      {/* Total Collection */}
      <BigCard label="Total Collection">
        <MoneyDisplay paisa={collection.totalPaisa} className="mt-1 text-2xl font-semibold text-primary" />
        <div className="mt-3 border-t border-slate-100 pt-3">
          <BreakdownBars items={methodBreakdown(collection.byMethod, collection.totalPaisa)} />
        </div>
      </BigCard>

      {/* Profit */}
      <BigCard label="Net Profit">
        <p
          className={cn(
            "mt-1 font-mono text-2xl font-semibold",
            profitPositive ? "text-green-700" : "text-red-600",
          )}
        >
          {formatMoney(netProfitPaisa)}
        </p>
        <p className="mt-0.5 text-xs text-muted">Collection − expenses, this range</p>
        <p className="mt-3 border-t border-slate-100 pt-3 text-xs text-muted">
          {profitPositive ? "In the black for this range." : "Spending outpaced collection."}
        </p>
      </BigCard>
    </div>
  );
}
