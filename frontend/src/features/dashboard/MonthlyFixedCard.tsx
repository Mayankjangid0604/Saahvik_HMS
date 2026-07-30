import { CalendarDays } from "lucide-react";
import type { DashboardData } from "@/api/types";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/cn";

/**
 * Bottom card — always the CURRENT CALENDAR MONTH, never the range filter.
 * Styled distinctly (navy) from the range-driven cards above so it never reads
 * as contradicting the range when e.g. "Today" is selected.
 */
export function MonthlyFixedCard({ data }: { data: DashboardData }) {
  const { collectionPaisa, advancePaisa, netProfitPaisa } = data.thisMonthFixed;
  const stats = [
    { label: "Total Collection", value: formatMoney(collectionPaisa), tone: "text-white" },
    { label: "Advance Earned", value: formatMoney(advancePaisa), tone: "text-white" },
    // Net Profit reveals expenses — omitted for users who can't see them.
    ...(netProfitPaisa != null
      ? [
          {
            label: "Net Profit",
            value: formatMoney(netProfitPaisa),
            tone: netProfitPaisa >= 0 ? "text-green-300" : "text-red-300",
          },
        ]
      : []),
  ];
  return (
    <div className="rounded-lg bg-primary p-4 text-white">
      <div className="mb-3 flex items-center gap-1.5">
        <CalendarDays className="h-4 w-4 text-accent" />
        <p className="text-sm font-semibold">Monthly summary</p>
        <span className="ml-1 rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-medium text-slate-200">
          This calendar month
        </span>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {stats.map((s) => (
          <div key={s.label} className="rounded-md bg-white/5 px-3 py-2.5">
            <p className="text-[11px] tracking-wide text-slate-300 uppercase">{s.label}</p>
            <p className={cn("mt-1 font-mono text-lg font-semibold", s.tone)}>{s.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
