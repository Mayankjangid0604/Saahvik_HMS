import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Archive, Download, FileArchive } from "lucide-react";
import { getExportStatus, requestExport } from "@/api/settings.api";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { DateDisplay } from "@/components/shared/DateDisplay";

const contents = [
  "Residents (CSV) — active and alumni with full details",
  "Rooms & beds (CSV)",
  "Payments & refunds (CSV)",
  "Invoices (CSV + PDFs)",
  "Security deposits (CSV)",
  "Complaints with timelines (CSV)",
  "Uploaded documents (photos, ID proofs)",
];

export function DataExportPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: job } = useQuery({
    queryKey: ["export-status"],
    queryFn: getExportStatus,
    refetchInterval: (query) => (query.state.data?.status === "processing" ? 1500 : false),
  });

  const mutation = useMutation({
    mutationFn: requestExport,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["export-status"] });
      toast({
        title: "Export started",
        description: "We're bundling your data — this takes a moment.",
        variant: "info",
      });
    },
  });

  useEffect(() => {
    if (job?.status === "ready") {
      queryClient.invalidateQueries({ queryKey: ["export-status"] });
    }
  }, [job?.status, queryClient]);

  return (
    <div className="mx-auto max-w-xl">
      <PageHeader title="Export data" subtitle="Download everything as a single zip file" />

      <Card>
        <CardHeader
          title={
            <span className="flex items-center gap-2">
              <Archive className="h-4 w-4 text-accent" /> Full organisation export
            </span>
          }
          subtitle="Your data belongs to you — export it anytime."
        />
        <CardBody className="space-y-4">
          <ul className="space-y-1.5">
            {contents.map((c) => (
              <li key={c} className="flex items-center gap-2 text-sm text-ink">
                <FileArchive className="h-3.5 w-3.5 shrink-0 text-slate-400" /> {c}
              </li>
            ))}
          </ul>

          {job ? (
            <div className="flex items-center justify-between rounded-md border border-slate-200 bg-surface/60 px-3 py-2.5">
              <div>
                <p className="flex items-center gap-2 text-sm font-medium text-ink">
                  Export <StatusBadge status={job.status} />
                </p>
                <p className="text-xs text-muted">
                  Requested <DateDisplay date={job.requestedAt} withTime />
                </p>
              </div>
              {job.status === "ready" ? (
                <a href={job.downloadUrl}>
                  <Button size="sm">
                    <Download className="h-3.5 w-3.5" /> Download zip
                  </Button>
                </a>
              ) : (
                <span className="text-xs text-muted">Preparing…</span>
              )}
            </div>
          ) : (
            <p className="rounded bg-slate-50 px-3 py-2 text-xs text-muted">
              No export requested yet.
            </p>
          )}

          <div className="flex justify-end">
            <Button
              onClick={() => mutation.mutate()}
              isLoading={mutation.isPending || job?.status === "processing"}
            >
              <Archive className="h-3.5 w-3.5" />
              {job?.status === "ready" ? "Export again" : "Start export"}
            </Button>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
