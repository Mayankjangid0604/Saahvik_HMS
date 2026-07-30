import { Link } from "react-router-dom";
import type { DashboardData, DueEntry } from "@/api/types";
import { Card, CardHeader } from "@/components/ui/Card";
import { MoneyDisplay } from "@/components/shared/MoneyDisplay";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { formatMoney } from "@/lib/format";
import { BreakdownBars } from "./BreakdownBars";

function daysOverdue(iso: string): number {
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000));
}

/** Due residents, longest overdue first (order comes from the API). */
export function DueResidentsList({ dues }: { dues: DueEntry[] }) {
  return (
    <Card>
      <CardHeader
        title="Due residents"
        subtitle="Longest overdue first"
        actions={
          <Link to="/dues" className="text-xs font-medium text-accent-600 hover:underline">
            View all
          </Link>
        }
      />
      {dues.length === 0 ? (
        <p className="px-4 py-6 text-center text-xs text-muted">No dues outstanding 🎉</p>
      ) : (
        <ul>
          {dues.map((d) => (
            <li
              key={d.residentId}
              className="flex h-12 items-center justify-between gap-2 border-b border-slate-100 px-4 last:border-0"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-ink">{d.residentName}</p>
                <p className="text-[11px] text-muted">
                  {d.roomNumber ?? "—"} · {daysOverdue(d.oldestDueDate)} days overdue
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <StatusBadge status={d.severity} />
                <MoneyDisplay paisa={d.duesPaisa} className="text-sm font-medium text-red-600" />
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

/** Expense Breakdown — styled after the reference screenshot (no budget-vs-actual line). */
export function ExpenseBreakdown({ data }: { data: DashboardData }) {
  // Only rendered when expenses are visible; guard keeps the optional field safe.
  const expense = data?.expense;
  if (!expense || expense.totalPaisa == null) return null;
  const items = (expense.breakdown ?? []).map((e) => ({
    key: e.categoryId,
    label: e.label,
    amountPaisa: e.amountPaisa ?? 0,
    pct: e.pct ?? 0,
  }));
  return (
    <Card>
      <CardHeader
        title="Expense Breakdown"
        subtitle={data?.rangeLabel ?? ""}
        actions={
          <span className="font-mono text-sm font-semibold text-primary">
            {formatMoney(expense.totalPaisa ?? 0)}
          </span>
        }
      />
      <div className="p-4">
        <BreakdownBars items={items} emptyLabel="No expenses recorded in this range" />
      </div>
    </Card>
  );
}
