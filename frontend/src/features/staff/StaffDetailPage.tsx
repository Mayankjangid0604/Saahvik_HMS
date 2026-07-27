import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Mail, Phone } from "lucide-react";
import { getStaffMember } from "@/api/staff.api";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { Skeleton } from "@/components/ui/Skeleton";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { DateDisplay } from "@/components/shared/DateDisplay";
import { timeAgo } from "@/lib/format";

const permissions = [
  { label: "Record payments & refunds", owner: true, staff: true },
  { label: "Manage residents & rooms", owner: true, staff: true },
  { label: "Handle complaints", owner: true, staff: true },
  { label: "View reports", owner: true, staff: true },
  { label: "Manage staff", owner: true, staff: false },
  { label: "Billing & subscription", owner: true, staff: false },
  { label: "Export / delete data", owner: true, staff: false },
];

export function StaffDetailPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();

  const { data: member, isLoading } = useQuery({
    queryKey: ["staff", id],
    queryFn: () => getStaffMember(id),
  });

  if (isLoading || !member) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-64 max-w-xl" />
      </div>
    );
  }

  const isOwner = member.role === "owner";

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

      <Card className="mt-3">
        <CardHeader title="Permissions" subtitle={isOwner ? "Owners have full access" : "Staff role"} />
        <ul>
          {permissions.map((p) => {
            const allowed = isOwner ? p.owner : p.staff;
            return (
              <li
                key={p.label}
                className="flex h-10 items-center justify-between border-b border-slate-100 px-4 text-sm last:border-0"
              >
                <span className={allowed ? "text-ink" : "text-slate-400"}>{p.label}</span>
                <span className={allowed ? "text-xs font-medium text-green-700" : "text-xs text-slate-400"}>
                  {allowed ? "Allowed" : "No access"}
                </span>
              </li>
            );
          })}
        </ul>
      </Card>
    </div>
  );
}
