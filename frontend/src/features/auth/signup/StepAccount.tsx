import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { FormField } from "@/components/ui/FormField";
import { emailSchema, passwordSchema, phoneSchema, requiredString } from "@/lib/validators";

const accountSchema = z.object({
  name: requiredString("Your name"),
  hostelName: requiredString("Hostel name"),
  email: emailSchema,
  phone: phoneSchema,
  password: passwordSchema,
});

export interface AccountValues {
  name: string;
  hostelName: string;
  email: string;
  phone: string;
  password: string;
}

export function StepAccount({
  defaults,
  onSubmit,
}: {
  defaults: AccountValues;
  onSubmit: (values: AccountValues) => void;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AccountValues>({
    resolver: zodResolver(accountSchema),
    defaultValues: defaults,
  });

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
        <FormField label="Your name" error={errors.name?.message} required>
          <Input
            placeholder="Mayank Jangid"
            autoComplete="name"
            error={!!errors.name}
            {...register("name")}
          />
        </FormField>
        <FormField label="Hostel name" error={errors.hostelName?.message} required>
          <Input
            placeholder="Shanti Niwas Boys Hostel"
            autoComplete="organization"
            error={!!errors.hostelName}
            {...register("hostelName")}
          />
        </FormField>
        <FormField label="Email" error={errors.email?.message} required>
          <Input
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            error={!!errors.email}
            {...register("email")}
          />
        </FormField>
        <FormField label="Mobile number" error={errors.phone?.message} required>
          <Input
            type="tel"
            placeholder="9829012345"
            maxLength={10}
            autoComplete="tel"
            inputMode="numeric"
            error={!!errors.phone}
            {...register("phone")}
          />
        </FormField>
        <FormField
          label="Password"
          error={errors.password?.message}
          required
          hint="At least 8 characters"
        >
          <PasswordInput
            autoComplete="new-password"
            error={!!errors.password}
            {...register("password")}
          />
        </FormField>
        <Button type="submit" className="w-full">
          Continue
        </Button>
      </form>
      <p className="text-center text-xs text-muted">
        Already have an account?{" "}
        <Link to="/login" className="font-medium text-accent-600 hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
