import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle } from "lucide-react";
import type { DashboardRange } from "@/api/types";
import { getDashboard } from "@/api/dashboard.api";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { useAuth } from "@/features/auth/AuthContext";
import { GreetingHeader } from "./GreetingHeader";
import { LargeStatsGrid } from "./LargeStatsGrid";
import { SmallStatsGrid } from "./SmallStatsGrid";
import { CollectionChart } from "./CollectionChart";
import { QuickActions } from "./QuickActions";
import { RecentPayments, RecentComplaints } from "./RecentActivity";
import { DueResidentsList, ExpenseBreakdown } from "./DuesAndExpense";
import { MonthlyFixedCard } from "./MonthlyFixedCard";

const RANGE_KEY = "saahvik.dashboard.range";
const RANGES: DashboardRange[] = [
  "today",
  "yesterday",
  "last7",
  "thisMonth",
  "lastMonth",
  "thisQuarter",
  "thisYear",
];

/** Resets to thisMonth on a fresh tab/session; sessionStorage keeps it while navigating. */
function initialRange(): DashboardRange {
  const stored = sessionStorage.getItem(RANGE_KEY) as DashboardRange | null;
  return stored && RANGES.includes(stored) ? stored : "thisMonth";
}

export function DashboardPage() {
  const { user } = useAuth();
  const [range, setRange] = useState<DashboardRange>(initialRange);

  const changeRange = (r: DashboardRange) => {
    sessionStorage.setItem(RANGE_KEY, r);
    setRange(r);
  };

  // One query drives the whole page — one loading, one error, one skeleton pass.
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["dashboard", range],
    queryFn: () => getDashboard(range),
  });

  return (
    <div className="space-y-4">
      <GreetingHeader
        userName={user?.name ?? "there"}
        range={range}
        onRangeChange={changeRange}
      />

      {isError ? (
        <Card>
          <CardBody className="flex flex-col items-center gap-3 py-10 text-center">
            <AlertTriangle className="h-8 w-8 text-red-500" />
            <div>
              <p className="text-sm font-medium text-ink">Couldn't load the dashboard</p>
              <p className="mt-1 text-xs text-muted">
                {error instanceof Error ? error.message : "Please try again."}
              </p>
            </div>
            <button
              onClick={() => refetch()}
              className="h-8 rounded-md bg-accent px-4 text-xs font-medium text-white hover:bg-accent-600"
            >
              Retry
            </button>
          </CardBody>
        </Card>
      ) : isLoading || !data ? (
        <DashboardSkeleton />
      ) : (
        <>
          <LargeStatsGrid data={data} />
          <SmallStatsGrid data={data} />

          <div className="grid gap-3 lg:grid-cols-4">
            <Card className="lg:col-span-3">
              <CardHeader title="Collections" subtitle={`Net of refunds · ${data.rangeLabel}`} />
              <CardBody>
                <CollectionChart data={data.collectionsChart} />
              </CardBody>
            </Card>
            <div className="lg:col-span-1">
              <QuickActions />
            </div>
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            <RecentPayments payments={data.recentPayments} />
            <RecentComplaints complaints={data.recentComplaints} />
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            <DueResidentsList dues={data.dueResidents} />
            <ExpenseBreakdown data={data} />
          </div>

          <MonthlyFixedCard data={data} />
        </>
      )}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-20" />
        ))}
      </div>
      <div className="grid gap-3 lg:grid-cols-4">
        <Skeleton className="h-64 lg:col-span-3" />
        <Skeleton className="h-64 lg:col-span-1" />
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        <Skeleton className="h-56" />
        <Skeleton className="h-56" />
      </div>
    </div>
  );
}
