import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, Pencil, Plus, Trash2 } from "lucide-react";
import type { Wing } from "@/api/types";
import { createWing, deleteWing, listWings, updateWing } from "@/api/wing.api";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { FormField } from "@/components/ui/FormField";
import { Modal, ConfirmDialog } from "@/components/ui/Modal";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";
import { useAuth } from "@/features/auth/AuthContext";
import { requiredString } from "@/lib/validators";

const schema = z.object({
  name: requiredString("Wing name"),
  notes: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

export function WingsPage() {
  const { user } = useAuth();
  const isOwner = user?.role === "owner";
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [editing, setEditing] = useState<Wing | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<Wing | null>(null);

  const { data: wings, isLoading } = useQuery({ queryKey: ["wings"], queryFn: listWings });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const openCreate = () => {
    setEditing(null);
    reset({ name: "", notes: "" });
    setFormOpen(true);
  };
  const openEdit = (w: Wing) => {
    setEditing(w);
    reset({ name: w.name, notes: w.notes ?? "" });
    setFormOpen(true);
  };

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["wings"] });
    queryClient.invalidateQueries({ queryKey: ["rooms"] });
  };

  const saveMutation = useMutation({
    mutationFn: (v: FormValues) =>
      editing
        ? updateWing(editing.id, { name: v.name, notes: v.notes || undefined })
        : createWing({ name: v.name, notes: v.notes || undefined }),
    onSuccess: () => {
      invalidate();
      toast({ title: editing ? "Wing updated" : "Wing created", variant: "success" });
      setFormOpen(false);
    },
    onError: (err: Error) => toast({ title: "Could not save wing", description: err.message, variant: "error" }),
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => deleteWing(id),
    onSuccess: () => {
      invalidate();
      toast({ title: "Wing deleted", variant: "success" });
      setRemoveTarget(null);
    },
    onError: (err: Error) => {
      toast({ title: "Could not delete", description: err.message, variant: "error" });
      setRemoveTarget(null);
    },
  });

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Wings"
        subtitle="An optional layer between your hostel and its rooms (e.g. blocks or floors)."
        actions={
          isOwner ? (
            <Button size="sm" onClick={openCreate} disabled={isLoading}>
              <Plus className="h-3.5 w-3.5" /> Add wing
            </Button>
          ) : undefined
        }
      />

      {isLoading ? (
        <Skeleton className="h-40" />
      ) : !wings || wings.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Building2 className="h-10 w-10" />}
            title="No wings yet"
            description="Wings help you group rooms. Rooms without a wing keep working exactly as before."
            action={
              isOwner ? (
                <Button size="sm" onClick={openCreate}>
                  <Plus className="h-3.5 w-3.5" /> Add your first wing
                </Button>
              ) : undefined
            }
          />
        </Card>
      ) : (
        <Card>
          <ul>
            {wings.map((w) => (
              <li
                key={w.id}
                className="flex items-center gap-3 border-b border-slate-100 px-4 py-3 last:border-0"
              >
                <Building2 className="h-4 w-4 shrink-0 text-accent" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">{w.name}</p>
                  <p className="truncate text-xs text-muted">
                    {w.roomCount} {w.roomCount === 1 ? "room" : "rooms"}
                    {w.notes ? ` · ${w.notes}` : ""}
                  </p>
                </div>
                {isOwner && (
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      onClick={() => openEdit(w)}
                      className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-ink"
                      aria-label={`Edit ${w.name}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setRemoveTarget(w)}
                      className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                      aria-label={`Delete ${w.name}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Modal
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? "Edit wing" : "Add wing"}
      >
        <form onSubmit={handleSubmit((v) => saveMutation.mutate(v))} className="space-y-3">
          <FormField label="Wing name" error={errors.name?.message} required>
            <Input placeholder="A Block" error={!!errors.name} {...register("name")} />
          </FormField>
          <FormField label="Notes" error={errors.notes?.message}>
            <Textarea rows={2} placeholder="Optional" {...register("notes")} />
          </FormField>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={saveMutation.isPending}>
              {editing ? "Save changes" : "Add wing"}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!removeTarget}
        onClose={() => setRemoveTarget(null)}
        onConfirm={() => removeTarget && removeMutation.mutate(removeTarget.id)}
        isLoading={removeMutation.isPending}
        title="Delete wing?"
        message={
          removeTarget
            ? `"${removeTarget.name}" will be removed. Its ${removeTarget.roomCount} room(s) stay put but lose their wing.`
            : ""
        }
        confirmLabel="Delete"
        danger
      />
    </div>
  );
}
