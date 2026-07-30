import type { DashboardChartPoint } from "@/api/types";
import { formatMoney } from "@/lib/format";

/** Hand-rolled bar chart (no chart lib is a dependency). Bars fill the width; x-labels thin out when dense. */
export function CollectionChart({ data }: { data: DashboardChartPoint[] }) {
  const max = Math.max(...data.map((d) => d.amountPaisa), 1);
  const total = data.reduce((s, d) => s + d.amountPaisa, 0);
  const labelEvery = Math.max(1, Math.ceil(data.length / 8));

  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between">
        <span className="text-[11px] text-muted">Peak {formatMoney(max)}</span>
        <span className="text-[11px] text-muted">Total {formatMoney(total)}</span>
      </div>
      <div className="flex h-44 items-end gap-0.5 border-b border-slate-100">
        {data.map((d, i) => (
          <div key={i} className="flex h-full flex-1 items-end">
            <div
              className="w-full rounded-t bg-accent transition-colors hover:bg-accent-600"
              style={{ height: `${Math.max((d.amountPaisa / max) * 100, d.amountPaisa > 0 ? 3 : 0)}%` }}
              title={`${d.label}: ${formatMoney(d.amountPaisa)}`}
            />
          </div>
        ))}
      </div>
      <div className="mt-1 flex gap-0.5">
        {data.map((d, i) => (
          <div key={i} className="flex-1 truncate text-center text-[9px] text-muted">
            {i % labelEvery === 0 ? d.label : ""}
          </div>
        ))}
      </div>
    </div>
  );
}
