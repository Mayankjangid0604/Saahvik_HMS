import { Badge, type BadgeTone } from "@/components/ui/Badge";

/**
 * One place that maps every domain status string to a label + tone,
 * so status colors stay consistent across the app.
 */
const registry: Record<string, { label: string; tone: BadgeTone }> = {
  // resident
  active: { label: "Active", tone: "green" },
  notice: { label: "On notice", tone: "amber" },
  alumni: { label: "Alumni", tone: "slate" },
  // bed
  occupied: { label: "Occupied", tone: "blue" },
  vacant: { label: "Vacant", tone: "green" },
  maintenance: { label: "Maintenance", tone: "amber" },
  // payment
  completed: { label: "Completed", tone: "green" },
  refunded: { label: "Refunded", tone: "slate" },
  partially_refunded: { label: "Partial refund", tone: "amber" },
  // invoice
  paid: { label: "Paid", tone: "green" },
  unpaid: { label: "Unpaid", tone: "amber" },
  partially_paid: { label: "Partially paid", tone: "blue" },
  overdue: { label: "Overdue", tone: "red" },
  cancelled: { label: "Cancelled", tone: "slate" },
  // deposit
  held: { label: "Held", tone: "blue" },
  forfeited: { label: "Forfeited", tone: "red" },
  // complaint
  open: { label: "Open", tone: "red" },
  in_progress: { label: "In progress", tone: "amber" },
  resolved: { label: "Resolved", tone: "green" },
  closed: { label: "Closed", tone: "slate" },
  // severity / priority
  low: { label: "Low", tone: "slate" },
  medium: { label: "Medium", tone: "amber" },
  high: { label: "High", tone: "red" },
  // misc
  owner: { label: "Owner", tone: "gold" },
  staff: { label: "Staff", tone: "blue" },
  queued: { label: "Queued", tone: "slate" },
  processing: { label: "Processing", tone: "amber" },
  ready: { label: "Ready", tone: "green" },
};

export function StatusBadge({ status }: { status: string }) {
  const entry = registry[status] ?? { label: status, tone: "slate" as BadgeTone };
  return <Badge tone={entry.tone}>{entry.label}</Badge>;
}
