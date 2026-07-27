import { useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Users } from "lucide-react";
import { createFeeStructure, deleteFeeStructure, listFeeStructures } from "@/api/payment.api";
import type { FeeCycle } from "@/api/types";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { FormField } from "@/components/ui/FormField";
import { Modal, ConfirmDialog } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { MoneyDisplay } from "@/components/shared/MoneyDisplay";
import { requiredString, rupeeAmountSchema } from "@/lib/validators";
import { rupeesToPaisa } from "@/lib/format";

const cycleLabels: Record<FeeCycle, string> = {
  monthly: "Monthly",
  quarterly: "Quarterly",
  half_yearly: "Half-yearly",
  yearly: "Yearly",
  one_time: "One-time",
};

const schema = z.object({
  name: requiredString("Fee name"),
  amountRupees: rupeeAmountSchema,
  cycle: z.enum(["monthly", "quarterly", "half_yearly", "yearly", "one_time"]),
  description: z.string().optional(),
});
type FormInput = z.input<typeof schema>;
type FormValues = z.output<typeof schema>;

export function FeeStructuresPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: fees, isLoading } = useQuery({ queryKey: ["fees"], queryFn: listFeeStructures });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormInput, unknown, FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { cycle: "monthly" },
  });

  const createMutation = useMutation({
    mutationFn: (v: FormValues) =>
      createFeeStructure({
        name: v.name,
        amountPaisa: rupeesToPaisa(v.amountRupees),
        cycle: v.cycle,
        description: v.description,
      }),
    onSuccess: (fee) => {
      queryClient.invalidateQueries({ queryKey: ["fees"] });
      toast({ title: `"${fee.name}" created`, variant: "success" });
      reset();
      setCreateOpen(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteFeeStructure(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fees"] });
      toast({ title: "Fee structure deleted", variant: "success" });
      setDeleteId(null);
    },
    onError: (err: Error) => {
      toast({ title: "Cannot delete", description: err.message, variant: "error" });
      setDeleteId(null);
    },
  });

  return (
    <div>
      <PageHeader
        title="Fee structures"
        subtitle="Reusable fee templates you can assign to residents"
        actions={
          <>
            <Link to="/fees/assign">
              <Button variant="outline" size="sm">
                <Users className="h-3.5 w-3.5" /> Assign fees
              </Button>
            </Link>
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="h-3.5 w-3.5" /> New fee
            </Button>
          </>
        }
      />

      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(fees ?? []).map((fee) => (
            <Card key={fee.id}>
              <CardBody className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-ink">{fee.name}</p>
                    <p className="mt-0.5 text-xs text-muted">{fee.description || "—"}</p>
                  </div>
                  <Badge tone="gold">{cycleLabels[fee.cycle]}</Badge>
                </div>
                <div className="mt-3 flex items-end justify-between">
                  <MoneyDisplay paisa={fee.amountPaisa} className="text-lg font-semibold text-primary" />
                  <span className="text-xs text-muted">{fee.assignedCount} assigned</span>
                </div>
                <div className="mt-2 flex justify-end gap-1 border-t border-slate-100 pt-2">
                  <Link
                    to={`/fees/assign?fee=${fee.id}`}
                    className="rounded px-2 py-1 text-xs font-medium text-accent-600 hover:bg-accent-50"
                  >
                    Assign
                  </Link>
                  <button
                    onClick={() => setDeleteId(fee.id)}
                    className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
                    aria-label={`Delete ${fee.name}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      <Modal isOpen={createOpen} onClose={() => setCreateOpen(false)} title="New fee structure">
        <form onSubmit={handleSubmit((v) => createMutation.mutate(v))} className="space-y-3">
          <FormField label="Fee name" error={errors.name?.message} required>
            <Input placeholder="Mess Fee" error={!!errors.name} {...register("name")} />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Amount (₹)" error={errors.amountRupees?.message} required>
              <Input type="number" min={0} step="50" placeholder="3000" error={!!errors.amountRupees} {...register("amountRupees")} />
            </FormField>
            <FormField label="Billing cycle" required>
              <Select
                {...register("cycle")}
                options={Object.entries(cycleLabels).map(([value, label]) => ({ value, label }))}
              />
            </FormField>
          </div>
          <FormField label="Description">
            <Textarea rows={2} placeholder="What does this fee cover?" {...register("description")} />
          </FormField>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={createMutation.isPending}>
              Create fee
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        isLoading={deleteMutation.isPending}
        title="Delete fee structure?"
        message="This removes the template. Fees already assigned to residents are not affected."
        confirmLabel="Delete"
        danger
      />
    </div>
  );
}
