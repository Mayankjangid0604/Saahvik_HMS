import { cn } from "@/lib/cn";
import { formatMoney } from "@/lib/format";

/** Money in tables/detail views: JetBrains Mono, right-aligned by default in tables. */
export function MoneyDisplay({
  paisa,
  className,
  colorBySign = false,
}: {
  paisa: number;
  className?: string;
  colorBySign?: boolean;
}) {
  return (
    <span
      className={cn(
        "font-mono tabular-nums",
        colorBySign && paisa > 0 && "text-red-600",
        colorBySign && paisa === 0 && "text-green-600",
        className,
      )}
    >
      {formatMoney(paisa)}
    </span>
  );
}
