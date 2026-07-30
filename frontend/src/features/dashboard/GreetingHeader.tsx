import type { DashboardRange } from "@/api/types";
import { RangeFilter } from "./RangeFilter";

/** "Thursday, 30 July 2026" — weekday form not covered by lib/format.ts. */
function formatFullDate(d: Date): string {
  return d.toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function GreetingHeader({
  userName,
  range,
  onRangeChange,
}: {
  userName: string;
  range: DashboardRange;
  onRangeChange: (range: DashboardRange) => void;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 className="text-xl font-semibold text-primary">Namaste 🙏, {userName}</h1>
        <p className="mt-0.5 text-sm text-muted">{formatFullDate(new Date())}</p>
      </div>
      <div className="sm:pt-1">
        <RangeFilter value={range} onChange={onRangeChange} />
      </div>
    </div>
  );
}
