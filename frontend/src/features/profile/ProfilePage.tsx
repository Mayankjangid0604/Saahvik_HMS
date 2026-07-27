import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { KeyRound, ShieldCheck } from "lucide-react";
import { updateProfile } from "@/api/auth.api";
import { useAuth } from "@/features/auth/AuthContext";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { FormField } from "@/components/ui/FormField";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { useToast } from "@/components/ui/Toast";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { phoneSchema, requiredString } from "@/lib/validators";

const schema = z.object({
  name: requiredString("Name"),
  phone: phoneSchema,
});
type FormValues = z.infer<typeof schema>;

export function ProfilePage() {
  const { user, updateUser } = useAuth();
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: user?.name ?? "", phone: user?.phone ?? "" },
  });

  const mutation = useMutation({
    mutationFn: (v: FormValues) => updateProfile(v),
    onSuccess: (updated) => {
      updateUser({ ...updated, email: user?.email ?? updated.email });
      toast({ title: "Profile updated", variant: "success" });
    },
  });

  if (!user) return null;

  return (
    <div className="mx-auto max-w-xl">
      <PageHeader title="Profile" />

      <Card>
        <CardBody className="flex items-center gap-4">
          <Avatar name={user.name} size="lg" />
          <div>
            <p className="flex items-center gap-2 text-sm font-semibold text-ink">
              {user.name} <StatusBadge status={user.role} />
            </p>
            <p className="text-xs text-muted">{user.email}</p>
          </div>
        </CardBody>
      </Card>

      <Card className="mt-3">
        <CardHeader title="Edit details" />
        <CardBody>
          <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="space-y-3">
            <FormField label="Name" error={errors.name?.message} required>
              <Input error={!!errors.name} {...register("name")} />
            </FormField>
            <FormField label="Phone" error={errors.phone?.message} required>
              <Input type="tel" maxLength={10} error={!!errors.phone} {...register("phone")} />
            </FormField>
            <FormField label="Email" hint="Contact support to change your email">
              <Input value={user.email} disabled />
            </FormField>
            <div className="flex justify-end">
              <Button type="submit" isLoading={mutation.isPending}>
                Save changes
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>

      <Card className="mt-3">
        <CardHeader title="Security" />
        <ul>
          <li className="border-b border-slate-100">
            <Link
              to="/profile/password"
              className="flex items-center gap-3 px-4 py-3 hover:bg-surface/60"
            >
              <KeyRound className="h-4 w-4 text-muted" />
              <span className="flex-1 text-sm font-medium text-ink">Change password</span>
              <span className="text-xs text-muted">›</span>
            </Link>
          </li>
          <li>
            <Link to="/profile/2fa" className="flex items-center gap-3 px-4 py-3 hover:bg-surface/60">
              <ShieldCheck className="h-4 w-4 text-muted" />
              <span className="flex-1 text-sm font-medium text-ink">Two-factor authentication</span>
              <Badge tone={user.twoFactorEnabled ? "green" : "slate"}>
                {user.twoFactorEnabled ? "On" : "Off"}
              </Badge>
            </Link>
          </li>
        </ul>
      </Card>
    </div>
  );
}
