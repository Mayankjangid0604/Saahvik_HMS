import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BadgePercent, Plus, Users } from "lucide-react";
import { applyDiscount, createDiscount, listDiscounts, toggleDiscount } from "@/api/payment.api";
import type { Discount } from "@/api/types";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { FormField } from "@/components/ui/FormField";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { ResidentPicker } from "@/components/shared/ResidentPicker";
import { requiredString } from "@/lib/validators";
import { formatMoney, rupeesToPaisa } from "@/lib/format";
import { DateDisplay } from "@/components/shared/DateDisplay";

const schema = z.object({
  name: requiredString("Name"),
  kind: z.enum(["flat", "percent"]),
  value: z.coerce.number().positive("Enter a value"),
  validTill: z.string().optional(),
});
type FormInput = z.input<typeof schema>;
type FormValues = z.output<typeof schema>;

function discountLabel(d: Discount): string {
  return d.kind === "flat" ? `${formatMoney(d.value)} off` : `${d.value}% off`;
}

export function DiscountsPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [createOpen, setCreateOpen] = useState(false);
  const [applyTarget, setApplyTarget] = useState<Discount | null>(null);
  const [applyResidentId, setApplyResidentId] = useState("");

  const { data: discounts, isLoading } = useQuery({ queryKey: ["discounts"], queryFn: listDiscounts });

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormInput, unknown, FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { kind: "percent" },
  });

  const kind = watch("kind");

  const createMutation = useMutation({
    mutationFn: (v: FormValues) =>
      createDiscount({
        name: v.name,
        kind: v.kind,
        value: v.kind === "flat" ? rupeesToPaisa(v.value) : v.value,
        validTill: v.validTill || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["discounts"] });
      toast({ title: "Discount created", variant: "success" });
      reset();
      setCreateOpen(false);
    },
  });

  const toggleMutation = useMutation({
    mutationFn: (id: string) => toggleDiscount(id),
    onSuccess: (d) => {
      queryClient.invalidateQueries({ queryKey: ["discounts"] });
      toast({ title: d.active ? "Discount activated" : "Discount deactivated", variant: "success" });
    },
  });

  const applyMutation = useMutation({
    mutationFn: () => applyDiscount({ discountId: applyTarget!.id, residentIds: [applyResidentId] }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["discounts"] });
      toast({ title: "Discount applied", variant: "success" });
      setApplyTarget(null);
      setApplyResidentId("");
    },
  });

  return (
    <div>
      <PageHeader
        title="Discounts"
        subtitle="Create discounts and apply them to residents"
        actions={
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-3.5 w-3.5" /> New discount
          </Button>
        }
      />

      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(discounts ?? []).map((d) => (
            <Card key={d.id} className={!d.active ? "opacity-60" : undefined}>
              <CardBody>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-md bg-accent-50">
                      <BadgePercent className="h-4 w-4 text-accent" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-ink">{d.name}</p>
                      <p className="text-xs text-muted">{discountLabel(d)}</p>
                    </div>
                  </div>
                  <Badge tone={d.active ? "green" : "slate"}>{d.active ? "Active" : "Inactive"}</Badge>
                </div>
                <p className="mt-3 text-xs text-muted">
                  Applied to {d.appliedCount} resident{d.appliedCount === 1 ? "" : "s"}
                  {d.validTill && (
                    <>
                      {" "}
                      · valid till <DateDisplay date={d.validTill} />
                    </>
                  )}
                </p>
                <div className="mt-3 flex justify-end gap-2 border-t border-slate-100 pt-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleMutation.mutate(d.id)}
                    isLoading={toggleMutation.isPending && toggleMutation.variables === d.id}
                  >
                    {d.active ? "Deactivate" : "Activate"}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setApplyTarget(d)} disabled={!d.active}>
                    <Users className="h-3 w-3" /> Apply
                  </Button>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      <Modal isOpen={createOpen} onClose={() => setCreateOpen(false)} title="New discount">
        <form onSubmit={handleSubmit((v) => createMutation.mutate(v))} className="space-y-3">
          <FormField label="Discount name" error={errors.name?.message} required>
            <Input placeholder="Sibling Discount" error={!!errors.name} {...register("name")} />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Type" required>
              <Select
                {...register("kind")}
                options={[
                  { value: "percent", label: "Percentage off" },
                  { value: "flat", label: "Flat amount off" },
                ]}
              />
            </FormField>
            <FormField
              label={kind === "flat" ? "Amount (₹)" : "Percent (%)"}
              error={errors.value?.message}
              required
            >
              <Input
                type="number"
                min={0}
                max={kind === "percent" ? 100 : undefined}
                placeholder={kind === "flat" ? "500" : "10"}
                error={!!errors.value}
                {...register("value")}
              />
            </FormField>
          </div>
          <FormField label="Valid till" hint="Optional">
            <Input type="date" {...register("validTill")} />
          </FormField>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={createMutation.isPending}>
              Create discount
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={!!applyTarget}
        onClose={() => setApplyTarget(null)}
        title={applyTarget ? `Apply "${applyTarget.name}"` : ""}
        size="sm"
      >
        {applyTarget && (
          <div className="space-y-3">
            <p className="rounded bg-accent-50 px-3 py-2 text-xs text-accent-600">
              {discountLabel(applyTarget)} will apply to the resident's monthly fee.
            </p>
            <FormField label="Resident" required>
              <ResidentPicker value={applyResidentId} onChange={setApplyResidentId} />
            </FormField>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={() => setApplyTarget(null)}>
                Cancel
              </Button>
              <Button
                onClick={() => applyMutation.mutate()}
                isLoading={applyMutation.isPending}
                disabled={!applyResidentId}
              >
                Apply discount
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
