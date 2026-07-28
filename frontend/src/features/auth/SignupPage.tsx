import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { AuthLayout } from "./AuthLayout";
import { useAuth } from "./AuthContext";
import { signup } from "@/api/auth.api";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { FormField } from "@/components/ui/FormField";
import { useToast } from "@/components/ui/Toast";
import { emailSchema, passwordSchema, phoneSchema, requiredString } from "@/lib/validators";

const schema = z.object({
  name: requiredString("Your name"),
  hostelName: requiredString("Hostel name"),
  email: emailSchema,
  phone: phoneSchema,
  password: passwordSchema,
});
type FormValues = z.infer<typeof schema>;

export function SignupPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const mutation = useMutation({
    mutationFn: signup,
    onSuccess: (session) => {
      login(session);
      toast({ title: "Welcome to Saahvik!", description: "Let's set up your hostel.", variant: "success" });
      navigate("/setup");
    },
    onError: (err: Error) => toast({ title: "Signup failed", description: err.message, variant: "error" }),
  });

  return (
    <AuthLayout title="Create your account" subtitle="Start managing your hostel in minutes.">
      <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="space-y-3">
        <FormField label="Your name" error={errors.name?.message} required>
          <Input placeholder="Mayank Jangid" error={!!errors.name} {...register("name")} />
        </FormField>
        <FormField label="Hostel name" error={errors.hostelName?.message} required>
          <Input placeholder="Shanti Niwas Boys Hostel" error={!!errors.hostelName} {...register("hostelName")} />
        </FormField>
        <FormField label="Email" error={errors.email?.message} required>
          <Input type="email" placeholder="you@example.com" error={!!errors.email} {...register("email")} />
        </FormField>
        <FormField label="Mobile number" error={errors.phone?.message} required>
          <Input type="tel" placeholder="9829012345" maxLength={10} error={!!errors.phone} {...register("phone")} />
        </FormField>
        <FormField label="Password" error={errors.password?.message} required hint="At least 8 characters">
          <PasswordInput autoComplete="new-password" error={!!errors.password} {...register("password")} />
        </FormField>
        <Button type="submit" className="w-full" isLoading={mutation.isPending}>
          Create account
        </Button>
      </form>
      <p className="mt-4 text-center text-xs text-muted">
        Already have an account?{" "}
        <Link to="/login" className="font-medium text-accent-600 hover:underline">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
}
