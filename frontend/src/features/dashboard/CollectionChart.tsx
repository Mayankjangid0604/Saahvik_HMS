import type { DashboardChartPoint } from "@/api/types";
import { formatMoney } from "@/lib/format";

/** Hand-rolled bar chart (no chart lib is a dependency). Bars fill the width; x-labels thin out when dense. */
export function CollectionChart({ data = [] }: { data?: DashboardChartPoint[] }) {
  const chartData = data ?? [];
  // Actual peak for display; separate 1-paisa floor only for the height math so
  // an all-zero range shows "Peak ₹0", not the ₹0.01 divide-by-zero guard.
  const peak = Math.max(0, ...chartData.map((d) => d.amountPaisa ?? 0));
  const denom = Math.max(peak, 1);
  const total = chartData.reduce((s, d) => s + (d.amountPaisa ?? 0), 0);
  const labelEvery = Math.max(1, Math.ceil((chartData.length ?? 0) / 8));

  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between">
        <span className="text-[11px] text-muted">Peak {formatMoney(peak)}</span>
        <span className="text-[11px] text-muted">Total {formatMoney(total)}</span>
      </div>
      <div className="flex h-44 items-end gap-0.5 border-b border-slate-100">
        {chartData.map((d, i) => (
          <div key={i} className="flex h-full flex-1 items-end">
            <div
              className="w-full rounded-t bg-accent transition-colors hover:bg-accent-600"
              style={{ height: `${Math.max(((d.amountPaisa ?? 0) / denom) * 100, (d.amountPaisa ?? 0) > 0 ? 3 : 0)}%` }}
              title={`${d.label}: ${formatMoney(d.amountPaisa ?? 0)}`}
            />
          </div>
        ))}
      </div>
      <div className="mt-1 flex gap-0.5">
        {chartData.map((d, i) => (
          <div key={i} className="flex-1 truncate text-center text-[9px] text-muted">
            {i % labelEvery === 0 ? d.label : ""}
          </div>
        ))}
      </div>
    </div>
  );
}
