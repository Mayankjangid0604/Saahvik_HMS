import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import {
  getNotificationPreferences,
  updateNotificationPreferences,
} from "@/api/settings.api";
import type { NotificationPreferences } from "@/api/types";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";

const eventPrefs: { key: keyof NotificationPreferences; label: string; hint: string }[] = [
  { key: "paymentReceived", label: "Payment received", hint: "When any payment is recorded" },
  { key: "duesReminder", label: "Dues reminders", hint: "When a resident crosses a month of dues" },
  { key: "newComplaint", label: "New complaint", hint: "When a complaint is registered" },
  { key: "complaintResolved", label: "Complaint resolved", hint: "When a ticket is resolved or closed" },
  { key: "weeklySummary", label: "Weekly summary", hint: "Collections and occupancy digest every Monday" },
];

const channelPrefs: { key: keyof NotificationPreferences; label: string; hint: string }[] = [
  { key: "channelInApp", label: "In-app", hint: "Bell icon notifications" },
  { key: "channelEmail", label: "Email", hint: "Send to your account email" },
];

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={
        checked
          ? "relative h-5 w-9 rounded-full bg-accent"
          : "relative h-5 w-9 rounded-full bg-slate-300"
      }
    >
      <span
        className={
          checked
            ? "absolute top-0.5 left-4.5 h-4 w-4 rounded-full bg-white shadow"
            : "absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow"
        }
      />
    </button>
  );
}

export function NotificationPreferencesPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [prefs, setPrefs] = useState<NotificationPreferences | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["notification-preferences"],
    queryFn: getNotificationPreferences,
  });

  useEffect(() => {
    if (data) setPrefs(data);
  }, [data]);

  const mutation = useMutation({
    mutationFn: (p: NotificationPreferences) => updateNotificationPreferences(p),
    onSuccess: () => toast({ title: "Preferences saved", variant: "success" }),
  });

  const set = (key: keyof NotificationPreferences, value: boolean) => {
    setPrefs((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  return (
    <div className="mx-auto max-w-xl">
      <button
        onClick={() => navigate("/notifications")}
        className="mb-2 flex items-center gap-1 text-xs text-muted hover:text-ink"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Notifications
      </button>
      <PageHeader title="Notification preferences" />

      {isLoading || !prefs ? (
        <Skeleton className="h-64" />
      ) : (
        <>
          <Card>
            <CardHeader title="Notify me about" />
            <ul>
              {eventPrefs.map((p) => (
                <li
                  key={p.key}
                  className="flex items-center justify-between border-b border-slate-100 px-4 py-3 last:border-0"
                >
                  <div>
                    <p className="text-sm font-medium text-ink">{p.label}</p>
                    <p className="text-xs text-muted">{p.hint}</p>
                  </div>
                  <Toggle checked={prefs[p.key]} onChange={(v) => set(p.key, v)} />
                </li>
              ))}
            </ul>
          </Card>

          <Card className="mt-3">
            <CardHeader title="Channels" />
            <ul>
              {channelPrefs.map((p) => (
                <li
                  key={p.key}
                  className="flex items-center justify-between border-b border-slate-100 px-4 py-3 last:border-0"
                >
                  <div>
                    <p className="text-sm font-medium text-ink">{p.label}</p>
                    <p className="text-xs text-muted">{p.hint}</p>
                  </div>
                  <Toggle checked={prefs[p.key]} onChange={(v) => set(p.key, v)} />
                </li>
              ))}
            </ul>
            <CardBody className="flex justify-end border-t border-slate-100">
              <Button onClick={() => mutation.mutate(prefs)} isLoading={mutation.isPending}>
                Save preferences
              </Button>
            </CardBody>
          </Card>
        </>
      )}
    </div>
  );
}
