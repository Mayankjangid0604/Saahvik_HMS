import { formatMoney } from "@/lib/format";

export interface BreakdownItem {
  key: string;
  label: string;
  amountPaisa: number;
  /** Share of total, 0–100. */
  pct: number;
}

/**
 * Ranked proportional bars, shared by the Total Collection card (by method) and
 * the Expense Breakdown card so both "breakdown" surfaces read identically.
 * Bars use the champagne-gold accent, fading slightly down the ranking rather
 * than inventing new colors.
 */
export function BreakdownBars({
  items,
  emptyLabel = "Nothing in this range",
}: {
  items: BreakdownItem[];
  emptyLabel?: string;
}) {
  if (items.length === 0) {
    return <p className="py-2 text-xs text-muted">{emptyLabel}</p>;
  }
  return (
    <ul className="space-y-2">
      {items.map((it, i) => (
        <li key={it.key}>
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="truncate text-ink">{it.label}</span>
            <span className="shrink-0 font-mono tabular-nums text-muted">
              {formatMoney(it.amountPaisa)} · {it.pct}%
            </span>
          </div>
          <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-accent"
              style={{ width: `${Math.max(it.pct, 2)}%`, opacity: 1 - Math.min(i * 0.12, 0.5) }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
