import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export type BadgeTone = "green" | "red" | "amber" | "blue" | "slate" | "gold" | "purple";

const tones: Record<BadgeTone, string> = {
  green: "bg-green-50 text-green-700 border-green-200",
  red: "bg-red-50 text-red-700 border-red-200",
  amber: "bg-amber-50 text-amber-700 border-amber-200",
  blue: "bg-blue-50 text-blue-700 border-blue-200",
  slate: "bg-slate-100 text-slate-600 border-slate-200",
  gold: "bg-accent-50 text-accent-600 border-accent/30",
  purple: "bg-purple-50 text-purple-700 border-purple-200",
};

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
}

export function Badge({ tone = "slate", className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded border px-1.5 py-0.5 text-[11px] font-medium leading-4 whitespace-nowrap",
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}
