import { useQuery } from "@tanstack/react-query";
import { BadgeCheck, Sparkles } from "lucide-react";
import { getSubscription } from "@/api/settings.api";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { Badge } from "@/components/ui/Badge";
import { DateDisplay } from "@/components/shared/DateDisplay";
import { formatMoney } from "@/lib/format";
import { useToast } from "@/components/ui/Toast";

const included = [
  "1 hostel",
  "Up to 100 residents",
  "Owner + 2 staff accounts",
  "Payments, dues & invoices",
  "Complaints tracking",
  "4 standard reports with PDF export",
  "In-app notifications",
];

function UsageBar({ label, used, limit }: { label: string; used: number; limit: number }) {
  const pct = Math.min(100, Math.round((used / limit) * 100));
  return (
    <div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted">{label}</span>
        <span className="font-mono text-ink">
          {used} / {limit}
        </span>
      </div>
      <div className="mt-1 h-1.5 w-full rounded-full bg-slate-100">
        <div
          className={pct >= 100 ? "h-1.5 rounded-full bg-amber-500" : "h-1.5 rounded-full bg-primary"}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function SubscriptionPage() {
  const { toast } = useToast();
  const { data: sub, isLoading } = useQuery({
    queryKey: ["subscription"],
    queryFn: getSubscription,
  });

  if (isLoading || !sub) {
    return (
      <div className="mx-auto max-w-xl">
        <PageHeader title="Subscription" />
        <Skeleton className="h-80" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl">
      <PageHeader title="Subscription" subtitle="Your current plan and usage" />

      <Card>
        <CardHeader
          title={
            <span className="flex items-center gap-2">
              {sub.planLabel} Plan <Badge tone="gold">Current</Badge>
            </span>
          }
          subtitle={
            <>
              {formatMoney(sub.pricePaisaPerMonth)}/month · renews <DateDisplay date={sub.renewsOn} />
            </>
          }
        />
        <CardBody className="space-y-4">
          <div className="space-y-3">
            <UsageBar label="Staff accounts" used={sub.usage.staff} limit={sub.limits.staff} />
            <UsageBar label="Residents" used={sub.usage.residents} limit={sub.limits.residents} />
            <UsageBar label="Hostels" used={sub.usage.hostels} limit={sub.limits.hostels} />
          </div>

          <div className="border-t border-slate-100 pt-3">
            <p className="mb-2 text-xs font-semibold text-muted uppercase">Included in Basic</p>
            <ul className="grid gap-1.5 sm:grid-cols-2">
              {included.map((item) => (
                <li key={item} className="flex items-center gap-1.5 text-sm text-ink">
                  <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-green-600" /> {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="flex items-center justify-between rounded-md border border-accent/30 bg-accent-50 px-3 py-2.5">
            <div>
              <p className="text-sm font-medium text-ink">Need more staff or hostels?</p>
              <p className="text-xs text-muted">The Pro plan lifts staff and hostel limits.</p>
            </div>
            <Button
              size="sm"
              onClick={() =>
                toast({
                  title: "Upgrades coming soon",
                  description: "Pro plan will be available shortly.",
                  variant: "info",
                })
              }
            >
              <Sparkles className="h-3.5 w-3.5" /> Upgrade
            </Button>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
