import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlarmClock, Bell, CheckCheck, IndianRupee, Settings2, Wrench } from "lucide-react";
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/api/notification.api";
import type { AppNotification } from "@/api/types";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { timeAgo } from "@/lib/format";
import { cn } from "@/lib/cn";

const kindIcons: Record<AppNotification["kind"], typeof Bell> = {
  payment: IndianRupee,
  complaint: Wrench,
  due: AlarmClock,
  system: Bell,
};

export function NotificationsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["notifications", "list"],
    queryFn: () => listNotifications({ pageSize: 50 }),
  });

  const markAllMutation = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const markOneMutation = useMutation({
    mutationFn: markNotificationRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const unreadCount = data?.data.filter((n) => !n.read).length ?? 0;

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Notifications"
        subtitle={unreadCount > 0 ? `${unreadCount} unread` : "You're all caught up"}
        actions={
          <>
            <Link to="/notifications/preferences">
              <Button variant="outline" size="sm">
                <Settings2 className="h-3.5 w-3.5" /> Preferences
              </Button>
            </Link>
            {unreadCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => markAllMutation.mutate()}
                isLoading={markAllMutation.isPending}
              >
                <CheckCheck className="h-3.5 w-3.5" /> Mark all read
              </Button>
            )}
          </>
        }
      />

      {isLoading ? (
        <Skeleton className="h-64" />
      ) : !data || data.data.length === 0 ? (
        <EmptyState title="No notifications" description="Payment and complaint updates appear here." />
      ) : (
        <Card>
          <ul>
            {data.data.map((n) => {
              const Icon = kindIcons[n.kind];
              return (
                <li key={n.id}>
                  <button
                    className={cn(
                      "flex w-full items-start gap-3 border-b border-slate-100 px-4 py-3 text-left last:border-0",
                      n.read ? "bg-white" : "bg-accent-50/50",
                      "hover:bg-surface/60",
                    )}
                    onClick={() => {
                      if (!n.read) markOneMutation.mutate(n.id);
                      if (n.link) navigate(n.link);
                    }}
                  >
                    <span
                      className={cn(
                        "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
                        n.read ? "bg-slate-100 text-slate-500" : "bg-accent/15 text-accent-600",
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={cn("block text-sm", n.read ? "text-ink" : "font-semibold text-ink")}>
                        {n.title}
                      </span>
                      <span className="mt-0.5 block text-xs text-muted">{n.body}</span>
                    </span>
                    <span className="shrink-0 text-[11px] text-muted">{timeAgo(n.createdAt)}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </div>
  );
}
