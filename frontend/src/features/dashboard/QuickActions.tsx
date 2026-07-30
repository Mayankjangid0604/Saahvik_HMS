import { Link } from "react-router-dom";
import {
  AlarmClock,
  BarChart3,
  IndianRupee,
  Plus,
  UserPlus,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";

/** Exactly these six, in this order (per spec). "Add Expense" is deliberately excluded. */
const ACTIONS: { label: string; to: string; icon: LucideIcon }[] = [
  { label: "Add Student", to: "/residents/new", icon: UserPlus },
  { label: "Receive Fee", to: "/payments?record=1", icon: IndianRupee },
  { label: "Add Room", to: "/rooms?add=1", icon: Plus },
  { label: "View Complaints", to: "/complaints", icon: Wrench },
  { label: "View Dues", to: "/dues", icon: AlarmClock },
  { label: "View Reports", to: "/reports", icon: BarChart3 },
];

export function QuickActions() {
  return (
    <Card className="flex flex-col">
      <CardHeader title="Quick actions" />
      <div className="flex flex-col gap-2 p-3">
        {ACTIONS.map((a) => (
          <Link
            key={a.label}
            to={a.to}
            className="flex items-center gap-2.5 rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-ink hover:border-accent hover:bg-accent-50"
          >
            <a.icon className="h-4 w-4 text-primary" />
            {a.label}
          </Link>
        ))}
      </div>
    </Card>
  );
}
