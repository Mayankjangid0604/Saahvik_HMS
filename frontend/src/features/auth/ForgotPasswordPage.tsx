import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { MailCheck } from "lucide-react";
import { AuthLayout } from "./AuthLayout";
import { forgotPassword } from "@/api/auth.api";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { FormField } from "@/components/ui/FormField";
import { emailSchema } from "@/lib/validators";

const schema = z.object({ email: emailSchema });
type FormValues = z.infer<typeof schema>;

export function ForgotPasswordPage() {
  const [sentTo, setSentTo] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const mutation = useMutation({
    mutationFn: (v: FormValues) => forgotPassword(v.email).then(() => v.email),
    onSuccess: (email) => setSentTo(email),
  });

  return (
    <AuthLayout title="Reset password" subtitle="We'll email you a link to reset it.">
      {sentTo ? (
        <div className="flex flex-col items-center py-4 text-center">
          <MailCheck className="mb-2 h-8 w-8 text-green-600" />
          <p className="text-sm font-medium text-ink">Check your inbox</p>
          <p className="mt-1 text-xs text-muted">
            If an account exists for <span className="font-medium">{sentTo}</span>, a reset link is on
            its way.
          </p>
          <Link to="/login" className="mt-4 text-xs font-medium text-accent-600 hover:underline">
            Back to sign in
          </Link>
        </div>
      ) : (
        <>
          <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="space-y-3">
            <FormField label="Email" error={errors.email?.message} required>
              <Input type="email" placeholder="you@example.com" error={!!errors.email} {...register("email")} />
            </FormField>
            <Button type="submit" className="w-full" isLoading={mutation.isPending}>
              Send reset link
            </Button>
          </form>
          <p className="mt-4 text-center text-xs text-muted">
            <Link to="/login" className="font-medium text-accent-600 hover:underline">
              Back to sign in
            </Link>
          </p>
        </>
      )}
    </AuthLayout>
  );
}
