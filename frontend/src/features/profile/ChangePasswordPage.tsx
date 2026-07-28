import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { changePassword } from "@/api/auth.api";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { FormField } from "@/components/ui/FormField";
import { useToast } from "@/components/ui/Toast";
import { passwordSchema } from "@/lib/validators";

const schema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password"),
    newPassword: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });
type FormValues = z.infer<typeof schema>;

export function ChangePasswordPage() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const mutation = useMutation({
    mutationFn: (v: FormValues) =>
      changePassword({ currentPassword: v.currentPassword, newPassword: v.newPassword }),
    onSuccess: () => {
      toast({ title: "Password changed", variant: "success" });
      reset();
      navigate("/profile");
    },
    onError: (err: Error) => toast({ title: "Could not change password", description: err.message, variant: "error" }),
  });

  return (
    <div className="mx-auto max-w-md">
      <button
        onClick={() => navigate("/profile")}
        className="mb-2 flex items-center gap-1 text-xs text-muted hover:text-ink"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Profile
      </button>
      <PageHeader title="Change password" />
      <Card>
        <CardBody>
          <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="space-y-3">
            <FormField label="Current password" error={errors.currentPassword?.message} required>
              <PasswordInput autoComplete="current-password" error={!!errors.currentPassword} {...register("currentPassword")} />
            </FormField>
            <FormField label="New password" error={errors.newPassword?.message} required hint="At least 8 characters">
              <PasswordInput autoComplete="new-password" error={!!errors.newPassword} {...register("newPassword")} />
            </FormField>
            <FormField label="Confirm new password" error={errors.confirmPassword?.message} required>
              <PasswordInput autoComplete="new-password" error={!!errors.confirmPassword} {...register("confirmPassword")} />
            </FormField>
            <div className="flex justify-end">
              <Button type="submit" isLoading={mutation.isPending}>
                Change password
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
