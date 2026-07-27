import { type ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface TabItem {
  key: string;
  label: ReactNode;
  count?: number;
}

export function Tabs({
  items,
  active,
  onChange,
  className,
}: {
  items: TabItem[];
  active: string;
  onChange: (key: string) => void;
  className?: string;
}) {
  return (
    <div className={cn("flex gap-1 overflow-x-auto border-b border-slate-200", className)} role="tablist">
      {items.map((item) => (
        <button
          key={item.key}
          role="tab"
          aria-selected={active === item.key}
          onClick={() => onChange(item.key)}
          className={cn(
            "-mb-px flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium whitespace-nowrap",
            active === item.key
              ? "border-accent text-primary"
              : "border-transparent text-muted hover:text-ink",
          )}
        >
          {item.label}
          {item.count != null && (
            <span className="rounded-full bg-slate-100 px-1.5 text-[11px] text-muted">{item.count}</span>
          )}
        </button>
      ))}
    </div>
  );
}
