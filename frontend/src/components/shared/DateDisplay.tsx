import { formatDate, formatDateTime } from "@/lib/format";

export function DateDisplay({
  date,
  withTime = false,
  className,
}: {
  date: string | null | undefined;
  withTime?: boolean;
  className?: string;
}) {
  return (
    <span className={className} title={date ? formatDateTime(date) : undefined}>
      {withTime ? formatDateTime(date) : formatDate(date)}
    </span>
  );
}
