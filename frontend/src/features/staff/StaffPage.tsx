import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2, UserPlus } from "lucide-react";
import { addStaff, listStaff, removeStaff } from "@/api/staff.api";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { FormField } from "@/components/ui/FormField";
import { Modal, ConfirmDialog } from "@/components/ui/Modal";
import { Avatar } from "@/components/ui/Avatar";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { DateDisplay } from "@/components/shared/DateDisplay";
import { emailSchema, phoneSchema, requiredString } from "@/lib/validators";
import { timeAgo } from "@/lib/format";
import { cn } from "@/lib/cn";

const schema = z.object({
  name: requiredString("Name"),
  email: emailSchema,
  phone: phoneSchema,
});
type FormValues = z.infer<typeof schema>;

export function StaffPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [addOpen, setAddOpen] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<{ id: string; name: string } | null>(null);

  const { data, isLoading } = useQuery({ queryKey: ["staff"], queryFn: listStaff });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const addMutation = useMutation({
    mutationFn: addStaff,
    onSuccess: (member) => {
      queryClient.invalidateQueries({ queryKey: ["staff"] });
      toast({
        title: `${member.name} added`,
        description: member.tempPassword
          ? `Temporary password: ${member.tempPassword} — share it now, it won't be shown again.`
          : "They can now sign in with their email.",
        variant: "success",
      });
      reset();
      setAddOpen(false);
    },
    onError: (err: Error) => toast({ title: "Could not add staff", description: err.message, variant: "error" }),
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => removeStaff(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff"] });
      toast({ title: "Staff member removed", variant: "success" });
      setRemoveTarget(null);
    },
    onError: (err: Error) => {
      toast({ title: "Could not remove", description: err.message, variant: "error" });
      setRemoveTarget(null);
    },
  });

  const atLimit = data ? data.used >= data.limit : false;

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Staff"
        subtitle={
          data && (
            <span className={cn(atLimit && "text-amber-700")}>
              {data.used} of {data.limit} slots used (owner counts as one)
            </span>
          )
        }
        actions={
          <Button size="sm" onClick={() => setAddOpen(true)} disabled={atLimit || isLoading}>
            <UserPlus className="h-3.5 w-3.5" /> Add staff
          </Button>
        }
      />

      {atLimit && (
        <p className="mb-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          You've used all {data?.limit} member slots on the Basic plan. Upgrade your plan to add more
          staff.
        </p>
      )}

      {isLoading ? (
        <Skeleton className="h-40" />
      ) : (
        <Card>
          <ul>
            {data?.staff.map((member) => (
              <li
                key={member.id}
                className="flex h-14 cursor-pointer items-center gap-3 border-b border-slate-100 px-4 last:border-0 hover:bg-surface/60"
                onClick={() => navigate(`/staff/${member.id}`)}
              >
                <Avatar name={member.name} size="md" />
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 text-sm font-medium text-ink">
                    {member.name} <StatusBadge status={member.role} />
                  </p>
                  <p className="truncate text-xs text-muted">
                    {member.email} · {member.phone}
                  </p>
                </div>
                <div className="hidden text-right sm:block">
                  <p className="text-xs text-muted">
                    Added <DateDisplay date={member.addedAt} />
                  </p>
                  {member.lastActiveAt && (
                    <p className="text-[11px] text-muted">Active {timeAgo(member.lastActiveAt)}</p>
                  )}
                </div>
                {member.role !== "owner" && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setRemoveTarget({ id: member.id, name: member.name });
                    }}
                    className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                    aria-label={`Remove ${member.name}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Modal isOpen={addOpen} onClose={() => setAddOpen(false)} title="Add staff member">
        <form onSubmit={handleSubmit((v) => addMutation.mutate(v))} className="space-y-3">
          <p className="rounded bg-slate-50 px-3 py-2 text-xs text-muted">
            Staff can record payments, manage residents and handle complaints. They cannot change
            billing or delete the hostel.
          </p>
          <FormField label="Name" error={errors.name?.message} required>
            <Input placeholder="Ramesh Choudhary" error={!!errors.name} {...register("name")} />
          </FormField>
          <FormField label="Email" error={errors.email?.message} required>
            <Input type="email" placeholder="warden@example.com" error={!!errors.email} {...register("email")} />
          </FormField>
          <FormField label="Phone" error={errors.phone?.message} required>
            <Input type="tel" maxLength={10} error={!!errors.phone} {...register("phone")} />
          </FormField>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={addMutation.isPending}>
              Add staff
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!removeTarget}
        onClose={() => setRemoveTarget(null)}
        onConfirm={() => removeTarget && removeMutation.mutate(removeTarget.id)}
        isLoading={removeMutation.isPending}
        title="Remove staff member?"
        message={`${removeTarget?.name} will lose access to this hostel immediately.`}
        confirmLabel="Remove"
        danger
      />
    </div>
  );
}
