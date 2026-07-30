import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createExpense, listExpenseCategories } from "@/api/expense.api";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { FormField } from "@/components/ui/FormField";
import { useToast } from "@/components/ui/Toast";
import { requiredString } from "@/lib/validators";
import { rupeesToPaisa } from "@/lib/format";

const schema = z.object({
  categoryId: requiredString("Category"),
  label: requiredString("Label"),
  amountRupees: z.coerce.number().positive("Enter an amount"),
  method: z.enum(["cash", "upi", "bank_transfer", "card", "cheque"]),
  spentAt: requiredString("Date"),
  notes: z.string().optional(),
});
type FormInput = z.input<typeof schema>;
type FormValues = z.output<typeof schema>;

const METHOD_OPTIONS = [
  { value: "cash", label: "Cash" },
  { value: "upi", label: "UPI" },
  { value: "bank_transfer", label: "Bank transfer" },
  { value: "card", label: "Card" },
  { value: "cheque", label: "Cheque" },
];

const today = () => new Date().toISOString().slice(0, 10);

export function AddExpenseDialog({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: categories = [] } = useQuery({
    queryKey: ["expense-categories"],
    queryFn: listExpenseCategories,
  });
  const activeCategories = categories.filter((c) => c.active);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormInput, unknown, FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { method: "cash", spentAt: today() },
  });

  const mutation = useMutation({
    mutationFn: (v: FormValues) =>
      createExpense({
        categoryId: v.categoryId,
        label: v.label,
        amountPaisa: rupeesToPaisa(v.amountRupees),
        method: v.method,
        spentAt: v.spentAt,
        notes: v.notes || undefined,
      }),
    onSuccess: (expense) => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast({ title: `Expense recorded`, description: expense.label, variant: "success" });
      reset({ method: "cash", spentAt: today() });
      onClose();
    },
    onError: (err: Error) =>
      toast({ title: "Could not record expense", description: err.message, variant: "error" }),
  });

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add expense">
      {activeCategories.length === 0 ? (
        <div className="space-y-3 text-sm">
          <p className="text-muted">
            You need at least one active expense category first.
          </p>
          <Link
            to="/settings/expense-categories"
            onClick={onClose}
            className="inline-flex text-accent-600 hover:underline"
          >
            Manage categories →
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Category" error={errors.categoryId?.message} required>
              <Select
                placeholder="Select…"
                error={!!errors.categoryId}
                options={activeCategories.map((c) => ({ value: c.id, label: c.name }))}
                {...register("categoryId")}
              />
            </FormField>
            <FormField label="Amount (₹)" error={errors.amountRupees?.message} required>
              <Input
                type="number"
                min={0}
                step="1"
                placeholder="1200"
                error={!!errors.amountRupees}
                {...register("amountRupees")}
              />
            </FormField>
          </div>
          <FormField label="What was it for?" error={errors.label?.message} required>
            <Input placeholder="July electricity bill" error={!!errors.label} {...register("label")} />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Paid via" error={errors.method?.message} required>
              <Select options={METHOD_OPTIONS} error={!!errors.method} {...register("method")} />
            </FormField>
            <FormField label="Date" error={errors.spentAt?.message} required>
              <Input type="date" error={!!errors.spentAt} {...register("spentAt")} />
            </FormField>
          </div>
          <FormField label="Notes" error={errors.notes?.message}>
            <Textarea rows={2} placeholder="Optional" {...register("notes")} />
          </FormField>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" isLoading={mutation.isPending}>
              Add expense
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
