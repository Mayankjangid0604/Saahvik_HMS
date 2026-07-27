import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  AlarmClock,
  BedDouble,
  FileUp,
  IndianRupee,
  Plus,
  UserPlus,
  Wrench,
} from "lucide-react";
import { getDashboard } from "@/api/dashboard.api";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { MoneyDisplay } from "@/components/shared/MoneyDisplay";
import { formatMoney, formatMonth, timeAgo } from "@/lib/format";
import { useAuth } from "@/features/auth/AuthContext";

function StatTile({
  label,
  value,
  sub,
  tone = "default",
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "default" | "danger" | "success";
}) {
  return (
    <Card className="px-4 py-3">
      <p className="text-[11px] font-medium tracking-wide text-muted uppercase">{label}</p>
      <p
        className={
        tone === "danger"
            ? "mt-1 font-mono text-xl font-semibold text-red-600"
            : tone === "success"
              ? "mt-1 font-mono text-xl font-semibold text-green-700"
              : "mt-1 font-mono text-xl font-semibold text-primary"
        }
      >
        {value}
      </p>
      {sub && <p className="mt-0.5 text-xs text-muted">{sub}</p>}
    </Card>
  );
}

function CollectionsChart({ data }: { data: { month: string; amountPaisa: number }[] }) {
  const max = Math.max(...data.map((d) => d.amountPaisa), 1);
  const barW = 36;
  const gap = 22;
  const chartH = 120;
  const width = data.length * (barW + gap) + gap;
  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${width} ${chartH + 34}`}
        className="h-44 w-full min-w-[320px]"
        role="img"
        aria-label="Monthly collections for the last 6 months"
      >
        {data.map((d, i) => {
          const h = Math.max(2, Math.round((d.amountPaisa / max) * chartH));
          const x = gap + i * (barW + gap);
          const y = chartH - h + 6;
          const isCurrent = i === data.length - 1;
          return (
            <g key={d.month}>
              <title>{`${formatMonth(d.month)}: ${formatMoney(d.amountPaisa)}`}</title>
              <rect
                x={x}
                y={y}
                width={barW}
                height={h}
                rx={3}
                fill={isCurrent ? "#B08D57" : "#1B2A4A"}
                opacity={isCurrent ? 1 : 0.85}
              />
              <text
                x={x + barW / 2}
                y={y - 4}
                textAnchor="middle"
                fontSize="9"
                fontFamily="JetBrains Mono Variable, monospace"
                fill="#64748B"
              >
                {`₹${Math.round(d.amountPaisa / 100000)}k`}
              </text>
              <text
                x={x + barW / 2}
                y={chartH + 22}
                textAnchor="middle"
                fontSize="10"
                fill="#64748B"
              >
                {formatMonth(d.month).split(" ")[0]}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

const quickActions = [
  { label: "Record payment", to: "/payments?record=1", icon: IndianRupee },
  { label: "Add resident", to: "/residents/new", icon: UserPlus },
  { label: "Add room", to: "/rooms?add=1", icon: Plus },
  { label: "New complaint", to: "/complaints?new=1", icon: Wrench },
  { label: "View dues", to: "/dues", icon: AlarmClock },
  { label: "Bulk import", to: "/residents/import", icon: FileUp },
];

export function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({ queryKey: ["dashboard"], queryFn: getDashboard });

  if (isLoading || !data) {
    return (
      <div className="space-y-4">
        <PageHeader title="Dashboard" />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
        <Skeleton className="h-56" />
      </div>
    );
  }

  const { occupancy, dues, thisMonth } = data;
  const collectionPct =
    thisMonth.expectedPaisa > 0
      ? Math.round((thisMonth.collectedPaisa / thisMonth.expectedPaisa) * 100)
      : 0;

  return (
    <div className="space-y-4">
      <PageHeader
        title={`Namaste, ${user?.name.split(" ")[0] ?? "there"}`}
        subtitle="Here's how the hostel is doing today."
      />

      {/* 1. Occupancy + 2. Dues summary + collections tiles */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          label="Occupancy"
          value={`${occupancy.occupiedBeds}/${occupancy.totalBeds}`}
          sub={`${occupancy.occupancyPct}% full · ${occupancy.vacantBeds} vacant · ${occupancy.maintenanceBeds} in maintenance`}
        />
        <StatTile
          label="Outstanding dues"
          value={formatMoney(dues.totalDuesPaisa)}
          sub={`${dues.residentsWithDues} residents · ${dues.highSeverityCount} high risk`}
          tone={dues.totalDuesPaisa > 0 ? "danger" : "success"}
        />
        <StatTile
          label="Collected this month"
          value={formatMoney(thisMonth.collectedPaisa)}
          sub={`${collectionPct}% of expected ${formatMoney(thisMonth.expectedPaisa)}`}
          tone="success"
        />
        <StatTile
          label="Open complaints"
          value={String(data.recentComplaints.length)}
          sub="Needing attention"
        />
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        {/* 5. Collections chart */}
        <Card className="lg:col-span-2">
          <CardHeader title="Collections — last 6 months" subtitle="Net of refunds" />
          <CardBody>
            <CollectionsChart data={data.collectionsChart} />
          </CardBody>
        </Card>

        {/* 6. Quick actions */}
        <Card>
          <CardHeader title="Quick actions" />
          <CardBody className="grid grid-cols-2 gap-2">
            {quickActions.map((a) => (
              <Link
                key={a.label}
                to={a.to}
                className="flex flex-col items-center gap-1.5 rounded-md border border-slate-200 px-2 py-3 text-center text-xs font-medium text-ink hover:border-accent hover:bg-accent-50"
              >
                <a.icon className="h-4 w-4 text-primary" />
                {a.label}
              </Link>
            ))}
          </CardBody>
        </Card>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        {/* 3. Recent payments */}
        <Card>
          <CardHeader
            title="Recent payments"
            actions={
              <Link to="/payments" className="text-xs font-medium text-accent-600 hover:underline">
                View all
              </Link>
            }
          />
          <ul>
            {data.recentPayments.map((p) => (
              <li
                key={p.id}
                className="flex h-11 cursor-pointer items-center justify-between gap-2 border-b border-slate-100 px-4 last:border-0 hover:bg-surface/60"
                onClick={() => navigate(`/payments/${p.id}`)}
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink">{p.residentName}</p>
                  <p className="text-[11px] text-muted">
                    {p.roomNumber} · {p.method.replace("_", " ")} · {timeAgo(p.paidAt)}
                  </p>
                </div>
                <MoneyDisplay paisa={p.amountPaisa} className="text-sm font-medium" />
              </li>
            ))}
          </ul>
        </Card>

        {/* 4. Recent complaints */}
        <Card>
          <CardHeader
            title="Open complaints"
            actions={
              <Link to="/complaints" className="text-xs font-medium text-accent-600 hover:underline">
                View all
              </Link>
            }
          />
          <ul>
            {data.recentComplaints.length === 0 && (
              <li className="px-4 py-6 text-center text-xs text-muted">No open complaints 🎉</li>
            )}
            {data.recentComplaints.map((c) => (
              <li
                key={c.id}
                className="flex h-11 cursor-pointer items-center justify-between gap-2 border-b border-slate-100 px-4 last:border-0 hover:bg-surface/60"
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
        </Card>
      </div>

      {/* Occupancy strip */}
      <Card>
        <CardHeader
          title="Bed occupancy"
          subtitle={`${occupancy.occupiedBeds} occupied · ${occupancy.vacantBeds} vacant · ${occupancy.maintenanceBeds} maintenance`}
          actions={
            <Link to="/rooms" className="text-xs font-medium text-accent-600 hover:underline">
              Manage rooms
            </Link>
          }
        />
        <CardBody>
          <div className="flex h-3 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="bg-primary"
              style={{ width: `${(occupancy.occupiedBeds / occupancy.totalBeds) * 100}%` }}
              title={`${occupancy.occupiedBeds} occupied`}
            />
            <div
              className="bg-amber-400"
              style={{ width: `${(occupancy.maintenanceBeds / occupancy.totalBeds) * 100}%` }}
              title={`${occupancy.maintenanceBeds} maintenance`}
            />
          </div>
          <div className="mt-2 flex items-center gap-4 text-[11px] text-muted">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-primary" /> Occupied
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-amber-400" /> Maintenance
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-slate-200" /> Vacant
            </span>
            <span className="ml-auto flex items-center gap-1.5">
              <BedDouble className="h-3.5 w-3.5" /> {occupancy.totalBeds} total beds
            </span>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
