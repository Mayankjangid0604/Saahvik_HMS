import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { AuthLayout } from "./AuthLayout";
import { useAuth } from "./AuthContext";
import { verifyTwoFactor } from "@/api/auth.api";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { FormField } from "@/components/ui/FormField";
import { useToast } from "@/components/ui/Toast";

const schema = z.object({
  code: z.string().regex(/^\d{6}$/, "Enter the 6-digit code"),
});
type FormValues = z.infer<typeof schema>;

export function TwoFactorPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const from = (location.state as { from?: string } | null)?.from ?? "/dashboard";

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const mutation = useMutation({
    mutationFn: (v: FormValues) => verifyTwoFactor(v.code),
    onSuccess: (session) => {
      login(session);
      navigate(from, { replace: true });
    },
    onError: (err: Error) =>
      toast({ title: "Verification failed", description: err.message, variant: "error" }),
  });

  return (
    <AuthLayout
      title="Two-factor verification"
      subtitle="Enter the 6-digit code from your authenticator app."
    >
      <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="space-y-3">
        <FormField label="Verification code" error={errors.code?.message} required>
          <Input
            inputMode="numeric"
            maxLength={6}
            placeholder="123456"
            className="text-center font-mono text-lg tracking-[0.5em]"
            error={!!errors.code}
            {...register("code")}
          />
        </FormField>
        <Button type="submit" className="w-full" isLoading={mutation.isPending}>
          Verify & sign in
        </Button>
      </form>
      <p className="mt-4 text-center text-xs text-muted">
        <Link to="/login" className="font-medium text-accent-600 hover:underline">
          Back to sign in
        </Link>
      </p>
    </AuthLayout>
  );
}
