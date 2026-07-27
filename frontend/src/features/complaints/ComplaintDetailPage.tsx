import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Paperclip } from "lucide-react";
import { getComplaint, updateComplaintStatus } from "@/api/complaint.api";
import type { ComplaintStatus } from "@/api/types";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { Select } from "@/components/ui/Select";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { DateDisplay } from "@/components/shared/DateDisplay";
import { cn } from "@/lib/cn";

const statusFlow: Record<ComplaintStatus, ComplaintStatus[]> = {
  open: ["in_progress", "resolved", "closed"],
  in_progress: ["resolved", "closed"],
  resolved: ["closed", "in_progress"],
  closed: [],
};

export function ComplaintDetailPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [nextStatus, setNextStatus] = useState<ComplaintStatus | "">("");
  const [note, setNote] = useState("");

  const { data: complaint, isLoading } = useQuery({
    queryKey: ["complaints", id],
    queryFn: () => getComplaint(id),
  });

  const mutation = useMutation({
    mutationFn: () => updateComplaintStatus(id, nextStatus as ComplaintStatus, note || undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["complaints"] });
      toast({ title: "Status updated", variant: "success" });
      setNextStatus("");
      setNote("");
    },
    onError: (err: Error) => toast({ title: "Update failed", description: err.message, variant: "error" }),
  });

  if (isLoading || !complaint) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  const options = statusFlow[complaint.status];

  return (
    <div className="mx-auto max-w-3xl">
      <button
        onClick={() => navigate(-1)}
        className="mb-2 flex items-center gap-1 text-xs text-muted hover:text-ink"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back
      </button>
      <PageHeader
        title={complaint.title}
        subtitle={
          <>
            {complaint.ticketNo} · <span className="capitalize">{complaint.category}</span>
            {complaint.roomNumber && <> · {complaint.roomNumber}</>}
            {complaint.residentName && <> · raised by {complaint.residentName}</>}
          </>
        }
        actions={
          <span className="flex items-center gap-2">
            <StatusBadge status={complaint.priority} />
            <StatusBadge status={complaint.status} />
          </span>
        }
      />

      <div className="grid gap-3 lg:grid-cols-3">
        <div className="space-y-3 lg:col-span-2">
          <Card>
            <CardHeader title="Description" />
            <CardBody>
              <p className="text-sm whitespace-pre-wrap text-ink">{complaint.description}</p>
              {complaint.attachments.length > 0 && (
                <div className="mt-3 space-y-1 border-t border-slate-100 pt-3">
                  {complaint.attachments.map((a) => (
                    <p key={a.id} className="flex items-center gap-1.5 text-xs text-accent-600">
                      <Paperclip className="h-3 w-3" /> {a.fileName}
                    </p>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>

          {/* Status timeline */}
          <Card>
            <CardHeader title="Timeline" />
            <CardBody>
              <ol className="relative space-y-4 border-l border-slate-200 pl-5">
                {[...complaint.timeline].reverse().map((event, i) => (
                  <li key={event.id} className="relative">
                    <span
                      className={cn(
                        "absolute top-1 -left-[26.5px] h-3 w-3 rounded-full border-2 border-white",
                        i === 0 ? "bg-accent" : "bg-slate-300",
                      )}
                    />
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge status={event.status} />
                      <span className="text-xs text-muted">
                        by {event.byName} · <DateDisplay date={event.at} withTime />
                      </span>
                    </div>
                    {event.note && <p className="mt-1 text-sm text-ink">{event.note}</p>}
                  </li>
                ))}
              </ol>
            </CardBody>
          </Card>
        </div>

        <Card className="h-fit">
          <CardHeader title="Update status" />
          <CardBody className="space-y-3">
            {options.length === 0 ? (
              <p className="text-xs text-muted">This ticket is closed.</p>
            ) : (
              <>
                <Select
                  value={nextStatus}
                  onChange={(e) => setNextStatus(e.target.value as ComplaintStatus)}
                  placeholder="Move to…"
                  options={options.map((s) => ({
                    value: s,
                    label: s.replace("_", " ").replace(/^\w/, (c) => c.toUpperCase()),
                  }))}
                />
                <Input
                  placeholder="Add a note (optional)"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
                <Button
                  className="w-full"
                  onClick={() => mutation.mutate()}
                  isLoading={mutation.isPending}
                  disabled={!nextStatus}
                >
                  Update
                </Button>
              </>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
