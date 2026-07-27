import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckSquare, Square, Users } from "lucide-react";
import { assignFee, listFeeStructures } from "@/api/payment.api";
import { listAllActiveResidents } from "@/api/resident.api";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { FormField } from "@/components/ui/FormField";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { Avatar } from "@/components/ui/Avatar";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/cn";

export function BulkFeeAssignPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [feeId, setFeeId] = useState("");
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const { data: fees } = useQuery({ queryKey: ["fees"], queryFn: listFeeStructures });
  const { data: residents, isLoading } = useQuery({
    queryKey: ["residents", "all-active"],
    queryFn: listAllActiveResidents,
  });

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allSelected = residents && selected.size === residents.length && residents.length > 0;
  const toggleAll = () => {
    if (!residents) return;
    setSelected(allSelected ? new Set() : new Set(residents.map((r) => r.id)));
  };

  const mutation = useMutation({
    mutationFn: () =>
      assignFee({ feeStructureId: feeId, residentIds: [...selected], startDate }),
    onSuccess: ({ assigned }) => {
      queryClient.invalidateQueries({ queryKey: ["fee-assignments"] });
      queryClient.invalidateQueries({ queryKey: ["fees"] });
      toast({
        title: `Fee assigned to ${assigned} residents`,
        description: assigned < selected.size ? "Some already had this fee and were skipped" : undefined,
        variant: "success",
      });
      navigate("/fees/assign");
    },
    onError: (err: Error) => toast({ title: "Bulk assign failed", description: err.message, variant: "error" }),
  });

  const selectedFee = fees?.find((f) => f.id === feeId);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Bulk fee assignment" subtitle="Apply one fee to many residents at once" />

      <Card className="mb-3">
        <CardBody className="grid gap-3 sm:grid-cols-2">
          <FormField label="Fee structure" required>
            <Select
              value={feeId}
              onChange={(e) => setFeeId(e.target.value)}
              placeholder="Select fee"
              options={(fees ?? []).map((f) => ({
                value: f.id,
                label: `${f.name} — ${formatMoney(f.amountPaisa)} (${f.cycle.replace("_", " ")})`,
              }))}
            />
          </FormField>
          <FormField label="Start date" required>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </FormField>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title={`Select residents (${selected.size} selected)`}
          actions={
            <button
              onClick={toggleAll}
              className="flex items-center gap-1.5 text-xs font-medium text-accent-600 hover:underline"
            >
              {allSelected ? <CheckSquare className="h-3.5 w-3.5" /> : <Square className="h-3.5 w-3.5" />}
              {allSelected ? "Clear all" : "Select all"}
            </button>
          }
        />
        {isLoading ? (
          <CardBody>
            <Skeleton className="h-40" />
          </CardBody>
        ) : (
          <ul className="max-h-96 overflow-y-auto">
            {(residents ?? []).map((r) => {
              const isSelected = selected.has(r.id);
              return (
                <li key={r.id}>
                  <button
                    onClick={() => toggle(r.id)}
                    className={cn(
                      "flex h-11 w-full items-center gap-3 border-b border-slate-100 px-4 text-left last:border-0",
                      isSelected ? "bg-accent-50" : "hover:bg-surface/60",
                    )}
                  >
                    {isSelected ? (
                      <CheckSquare className="h-4 w-4 shrink-0 text-accent" />
                    ) : (
                      <Square className="h-4 w-4 shrink-0 text-slate-300" />
                    )}
                    <Avatar name={r.name} size="sm" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{r.name}</span>
                    </span>
                    <span className="text-xs text-muted">
                      {r.roomNumber} · Bed {r.bedLabel}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3">
          <p className="text-xs text-muted">
            {selectedFee && selected.size > 0
              ? `${selected.size} × ${formatMoney(selectedFee.amountPaisa)} = ${formatMoney(selectedFee.amountPaisa * selected.size)} per ${selectedFee.cycle === "one_time" ? "assignment" : selectedFee.cycle.replace("_", " ")}`
              : "Pick a fee and at least one resident"}
          </p>
          <Button
            onClick={() => mutation.mutate()}
            isLoading={mutation.isPending}
            disabled={!feeId || selected.size === 0}
          >
            <Users className="h-3.5 w-3.5" /> Assign to {selected.size}
          </Button>
        </div>
      </Card>
    </div>
  );
}
