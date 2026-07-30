import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Mail, Phone, ShieldCheck } from "lucide-react";
import type { StaffPermission } from "@/api/types";
import { getStaffMember, updateStaff } from "@/api/staff.api";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { Switch } from "@/components/ui/Switch";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { DateDisplay } from "@/components/shared/DateDisplay";
import { useToast } from "@/components/ui/Toast";
import { useAuth } from "@/features/auth/AuthContext";
import { timeAgo } from "@/lib/format";
import { STAFF_PERMISSIONS } from "./permissions";

/** True when two permission arrays hold the same set. */
function sameSet(a: StaffPermission[], b: StaffPermission[]): boolean {
  return a.length === b.length && a.every((p) => b.includes(p));
}

export function StaffDetailPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  const viewerIsOwner = user?.role === "owner";

  const { data: member, isLoading } = useQuery({
    queryKey: ["staff", id],
    queryFn: () => getStaffMember(id),
  });

  const [selected, setSelected] = useState<StaffPermission[]>([]);
  useEffect(() => {
    if (member) setSelected(member.permissions ?? []);
  }, [member]);

  const saveMutation = useMutation({
    mutationFn: (permissions: StaffPermission[]) => updateStaff(id, { permissions }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff", id] });
      queryClient.invalidateQueries({ queryKey: ["staff"] });
      toast({ title: "Permissions updated", variant: "success" });
    },
    onError: (err: Error) =>
      toast({ title: "Could not update permissions", description: err.message, variant: "error" }),
  });

  if (isLoading || !member) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-64 max-w-xl" />
      </div>
    );
  }

  const isOwnerMember = member.role === "owner";
  const dirty = !sameSet(selected, member.permissions ?? []);
  const toggle = (key: StaffPermission, on: boolean) =>
    setSelected((prev) => (on ? [...new Set([...prev, key])] : prev.filter((p) => p !== key)));

  return (
    <div className="mx-auto max-w-xl">
      <button
        onClick={() => navigate("/staff")}
        className="mb-2 flex items-center gap-1 text-xs text-muted hover:text-ink"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> All staff
      </button>
      <PageHeader title={member.name} />

      <Card>
        <CardBody className="flex items-center gap-4">
          <Avatar name={member.name} size="lg" />
          <div>
            <p className="flex items-center gap-2 text-sm font-semibold text-ink">
              {member.name} <StatusBadge status={member.role} />
              {member.status === "inactive" && <StatusBadge status="inactive" />}
            </p>
            <p className="mt-1 flex items-center gap-1.5 text-xs text-muted">
              <Mail className="h-3 w-3" /> {member.email}
            </p>
            <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted">
              <Phone className="h-3 w-3" /> {member.phone}
            </p>
            <p className="mt-1 text-[11px] text-muted">
              Added <DateDisplay date={member.addedAt} />
              {member.lastActiveAt && <> · last active {timeAgo(member.lastActiveAt)}</>}
            </p>
          </div>
        </CardBody>
      </Card>

      {/* Permissions are an owner-only surface: staff never see or edit them. */}
      {viewerIsOwner &&
        (isOwnerMember ? (
          <Card className="mt-3">
            <CardHeader title="Permissions" subtitle="Owners have full access" />
            <CardBody className="flex items-center gap-2 text-sm text-muted">
              <ShieldCheck className="h-4 w-4 text-accent" />
              This owner can do everything, including managing staff and billing.
            </CardBody>
          </Card>
        ) : (
          <Card className="mt-3">
            <CardHeader
              title="Permissions"
              subtitle="Grant extra capabilities on top of this staff member's role"
              actions={
                <Button
                  size="sm"
                  onClick={() => saveMutation.mutate(selected)}
                  disabled={!dirty}
                  isLoading={saveMutation.isPending}
                >
                  Save
                </Button>
              }
            />
            <ul>
              {STAFF_PERMISSIONS.map((perm) => {
                const on = selected.includes(perm.key);
                return (
                  <li
                    key={perm.key}
                    className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 last:border-0"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-ink">{perm.label}</p>
                      <p className="text-xs text-muted">{perm.description}</p>
                    </div>
                    <Switch checked={on} onChange={(v) => toggle(perm.key, v)} label={perm.label} />
                  </li>
                );
              })}
            </ul>
          </Card>
        ))}
    </div>
  );
}
