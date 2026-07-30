import { CalendarRange, Check, ChevronDown } from "lucide-react";
import type { DashboardRange } from "@/api/types";
import { Dropdown } from "@/components/ui/Dropdown";
import { cn } from "@/lib/cn";

export const RANGE_OPTIONS: { value: DashboardRange; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "last7", label: "Last 7 Days" },
  { value: "thisMonth", label: "This Month" },
  { value: "lastMonth", label: "Last Month" },
  { value: "thisQuarter", label: "This Quarter" },
  { value: "thisYear", label: "This Year" },
];

/** 7-option range selector. Dropdown (not Tabs) so it never overflows on mobile. */
export function RangeFilter({
  value,
  onChange,
}: {
  value: DashboardRange;
  onChange: (range: DashboardRange) => void;
}) {
  const current = RANGE_OPTIONS.find((r) => r.value === value) ?? RANGE_OPTIONS[3];
  return (
    <Dropdown
      align="right"
      trigger={
        <button
          className="inline-flex h-9 items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-ink hover:bg-slate-50"
          aria-label={`Date range: ${current.label}`}
        >
          <CalendarRange className="h-4 w-4 text-muted" />
          {current.label}
          <ChevronDown className="h-4 w-4 text-muted" />
        </button>
      }
    >
      {(close) => (
        <div className="min-w-44">
          {RANGE_OPTIONS.map((r) => (
            <button
              key={r.value}
              onClick={() => {
                onChange(r.value);
                close();
              }}
              className={cn(
                "flex w-full items-center justify-between px-3 py-1.5 text-left text-sm hover:bg-slate-50",
                r.value === value ? "font-medium text-accent-600" : "text-ink",
              )}
            >
              {r.label}
              {r.value === value && <Check className="h-3.5 w-3.5" />}
            </button>
          ))}
        </div>
      )}
    </Dropdown>
  );
}
