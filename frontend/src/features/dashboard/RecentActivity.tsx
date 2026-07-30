import { Link, useNavigate } from "react-router-dom";
import { RotateCcw } from "lucide-react";
import type { Complaint, Payment } from "@/api/types";
import { Card, CardHeader } from "@/components/ui/Card";
import { MoneyDisplay } from "@/components/shared/MoneyDisplay";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { timeAgo } from "@/lib/format";
import { cn } from "@/lib/cn";

/** Recent Payments — inbound and outbound (refunds shown in red/negative). */
export function RecentPayments({ payments = [] }: { payments?: Payment[] }) {
  const navigate = useNavigate();
  const list = payments ?? [];
  return (
    <Card>
      <CardHeader
        title="Recent payments"
        actions={
          <Link to="/payments" className="text-xs font-medium text-accent-600 hover:underline">
            View all
          </Link>
        }
      />
      {list.length === 0 ? (
        <p className="px-4 py-6 text-center text-xs text-muted">No payments yet</p>
      ) : (
        <ul>
          {list.map((p) => {
            const refunded = (p.refundedPaisa ?? 0) > 0 || p.status !== "completed";
            return (
              <li
                key={p.id}
                className="flex h-11 cursor-pointer items-center justify-between gap-2 border-b border-slate-100 px-4 last:border-0 hover:bg-surface/60"
                onClick={() => navigate(`/payments/${p.id}`)}
              >
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 truncate text-sm font-medium text-ink">
                    {p.residentName}
                    {refunded && (
                      <span className="inline-flex items-center gap-0.5 rounded bg-red-50 px-1 text-[10px] font-medium text-red-600">
                        <RotateCcw className="h-2.5 w-2.5" /> Refund
                      </span>
                    )}
                  </p>
                  <p className="text-[11px] text-muted">
                    {p.roomNumber ?? "—"} · {(p.method ?? "").replace("_", " ")} · {timeAgo(p.paidAt)}
                  </p>
                </div>
                {refunded ? (
                  <span className="font-mono text-sm font-medium text-red-600 tabular-nums">
                    −<MoneyDisplay paisa={p.refundedPaisa || p.amountPaisa || 0} className="text-red-600" />
                  </span>
                ) : (
                  <MoneyDisplay paisa={p.amountPaisa ?? 0} className="text-sm font-medium text-ink" />
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

/** Recent Complaints — reuses StatusBadge, matching the ComplaintsPage pattern. */
export function RecentComplaints({ complaints = [] }: { complaints?: Complaint[] }) {
  const navigate = useNavigate();
  const list = complaints ?? [];
  return (
    <Card>
      <CardHeader
        title="Recent complaints"
        actions={
          <Link to="/complaints" className="text-xs font-medium text-accent-600 hover:underline">
            View all
          </Link>
        }
      />
      {list.length === 0 ? (
        <p className="px-4 py-6 text-center text-xs text-muted">No open complaints 🎉</p>
      ) : (
        <ul>
          {list.map((c) => (
            <li
              key={c.id}
              className={cn(
                "flex h-11 cursor-pointer items-center justify-between gap-2 border-b border-slate-100 px-4 last:border-0 hover:bg-surface/60",
              )}
              onClick={() => navigate(`/complaints/${c.id}`)}
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-ink">{c.title}</p>
                <p className="text-[11px] text-muted">
                  {c.ticketNo} · {c.roomNumber ?? "General"} · {timeAgo(c.createdAt)}
                </p>
              </div>
              <StatusBadge status={c.status} />
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
