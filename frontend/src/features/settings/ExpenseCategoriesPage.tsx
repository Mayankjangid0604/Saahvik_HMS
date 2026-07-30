import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Lock, Plus, Tag } from "lucide-react";
import type { ExpenseCategory } from "@/api/types";
import {
  createExpenseCategory,
  listExpenseCategories,
  updateExpenseCategory,
} from "@/api/expense.api";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { FormField } from "@/components/ui/FormField";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";
import { useAuth } from "@/features/auth/AuthContext";
import { hasPermission } from "@/features/staff/permissions";
import { requiredString } from "@/lib/validators";

const schema = z.object({ name: requiredString("Category name") });
type FormValues = z.infer<typeof schema>;

export function ExpenseCategoriesPage() {
  const { user } = useAuth();
  const canManage = hasPermission(user, "manageExpenses");
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [editing, setEditing] = useState<ExpenseCategory | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  const { data: categories, isLoading } = useQuery({
    queryKey: ["expense-categories"],
    queryFn: listExpenseCategories,
    enabled: canManage,
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["expense-categories"] });

  const saveMutation = useMutation({
    mutationFn: (v: FormValues) =>
      editing ? updateExpenseCategory(editing.id, { name: v.name }) : createExpenseCategory({ name: v.name }),
    onSuccess: () => {
      invalidate();
      toast({ title: editing ? "Category renamed" : "Category added", variant: "success" });
      setFormOpen(false);
    },
    onError: (err: Error) => toast({ title: "Could not save", description: err.message, variant: "error" }),
  });

  const toggleMutation = useMutation({
    mutationFn: (c: ExpenseCategory) => updateExpenseCategory(c.id, { active: !c.active }),
    onSuccess: (c) => {
      invalidate();
      toast({ title: c.active ? "Category reactivated" : "Category deactivated", variant: "success" });
    },
    onError: (err: Error) => toast({ title: "Could not update", description: err.message, variant: "error" }),
  });

  const openCreate = () => {
    setEditing(null);
    reset({ name: "" });
    setFormOpen(true);
  };
  const openEdit = (c: ExpenseCategory) => {
    setEditing(c);
    reset({ name: c.name });
    setFormOpen(true);
  };

  if (!canManage) {
    return (
      <div className="mx-auto max-w-2xl">
        <PageHeader title="Expense categories" />
        <Card>
          <EmptyState
            icon={<Lock className="h-10 w-10" />}
            title="You don't have access to expenses"
            description="Ask an owner to grant you the “Manage expenses” permission."
          />
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Expense categories"
        subtitle="Group expenses for reporting. Deactivated categories keep old expenses but can't be picked for new ones."
        actions={
          <Button size="sm" onClick={openCreate} disabled={isLoading}>
            <Plus className="h-3.5 w-3.5" /> Add category
          </Button>
        }
      />

      {isLoading ? (
        <Skeleton className="h-40" />
      ) : !categories || categories.length === 0 ? (
        <Card>
          <EmptyState icon={<Tag className="h-10 w-10" />} title="No categories yet" />
        </Card>
      ) : (
        <Card>
          <ul>
            {categories.map((c) => (
              <li
                key={c.id}
                className="flex items-center gap-3 border-b border-slate-100 px-4 py-3 last:border-0"
              >
                <Tag className="h-4 w-4 shrink-0 text-accent" />
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 text-sm font-medium text-ink">
                    {c.name}
                    {!c.active && <Badge tone="slate">Inactive</Badge>}
                  </p>
                  <p className="text-xs text-muted">
                    {c.expenseCount} {c.expenseCount === 1 ? "expense" : "expenses"}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    onClick={() => openEdit(c)}
                    className="text-xs font-medium text-accent-600 hover:underline"
                  >
                    Rename
                  </button>
                  <button
                    onClick={() => toggleMutation.mutate(c)}
                    className="text-xs font-medium text-muted hover:text-ink"
                  >
                    {c.active ? "Deactivate" : "Reactivate"}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Modal
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? "Rename category" : "Add category"}
        size="sm"
      >
        <form onSubmit={handleSubmit((v) => saveMutation.mutate(v))} className="space-y-3">
          <FormField label="Category name" error={errors.name?.message} required>
            <Input placeholder="Utilities" error={!!errors.name} {...register("name")} />
          </FormField>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={saveMutation.isPending}>
              {editing ? "Save" : "Add"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
