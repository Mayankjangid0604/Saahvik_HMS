import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link } from "react-router-dom";
import type { GoogleAuthResult } from "@/api/types";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { FormField } from "@/components/ui/FormField";
import { emailSchema, passwordSchema, phoneSchema, requiredString } from "@/lib/validators";
import { AuthDivider, SocialButtons } from "./SocialButtons";

const baseSchema = z.object({
  name: requiredString("Your name"),
  hostelName: requiredString("Hostel name"),
  email: emailSchema,
  phone: phoneSchema,
});

const manualSchema = baseSchema.extend({ password: passwordSchema });
// Google-linked accounts don't choose a password — Google is the credential.
const googleSchema = baseSchema.extend({ password: z.string().optional() });

export interface AccountValues {
  name: string;
  hostelName: string;
  email: string;
  phone: string;
  password?: string;
}

export function StepAccount({
  defaults,
  google,
  onSubmit,
  onGoogle,
  googleLoading,
}: {
  defaults: AccountValues;
  /** Set when the user entered via "Continue with Google". */
  google: GoogleAuthResult | null;
  onSubmit: (values: AccountValues) => void;
  onGoogle: () => void;
  googleLoading: boolean;
}) {
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<AccountValues>({
    resolver: zodResolver(google ? googleSchema : manualSchema),
    defaultValues: defaults,
  });

  // Google can arrive after mount (the user clicks the button on this step):
  // push its verified identity into the form. The fields are readOnly, not
  // disabled — disabled inputs are dropped from react-hook-form submissions.
  useEffect(() => {
    if (google) {
      setValue("name", google.name, { shouldValidate: true });
      setValue("email", google.email, { shouldValidate: true });
    }
  }, [google, setValue]);

  return (
    <div className="space-y-4">
      {!google && (
        <>
          <SocialButtons onGoogle={onGoogle} googleLoading={googleLoading} />
          <AuthDivider label="or continue with email" />
        </>
      )}
      {google && (
        <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
          Signed in with Google as <strong>{google.email}</strong> — your email
          is already verified. We still need your phone and hostel details.
        </p>
      )}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
        <FormField label="Your name" error={errors.name?.message} required>
          <Input
            placeholder="Mayank Jangid"
            autoComplete="name"
            readOnly={!!google}
            className={google ? "bg-slate-50 text-slate-500" : undefined}
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
            readOnly={!!google}
            className={google ? "bg-slate-50 text-slate-500" : undefined}
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
        {!google && (
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
        )}
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
