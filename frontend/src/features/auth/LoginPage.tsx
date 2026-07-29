import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { AuthLayout } from "./AuthLayout";
import { useAuth } from "./AuthContext";
import { login as loginApi } from "@/api/auth.api";
import type { AuthSession, GoogleAuthResult } from "@/api/types";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { FormField } from "@/components/ui/FormField";
import { useToast } from "@/components/ui/Toast";
import { emailSchema } from "@/lib/validators";
import { AuthDivider, SocialButtons } from "./signup/SocialButtons";
import { mockGoogleSignIn } from "./signup/mocks";

/**
 * Build a client-side session for the mock Google login.
 * TODO: replace with real Google OAuth (Google Identity Services), needs a
 * registered OAuth client ID + authorized redirect URI. The real flow must
 * exchange the Google credential server-side for a backend-issued JWT — this
 * fabricated token will NOT authenticate against the real API.
 */
function buildMockGoogleSession(g: GoogleAuthResult): AuthSession {
  const now = new Date().toISOString();
  return {
    token: `mock-google-${g.googleId}`,
    user: {
      id: `google-${g.googleId}`,
      orgId: "mock-google-org",
      name: g.name,
      email: g.email,
      phone: "9999999999",
      role: "owner",
      twoFactorEnabled: false,
      createdAt: now,
    },
    org: {
      id: "mock-google-org",
      name: g.name,
      hostelName: "Google Demo Hostel",
      addressLine: "",
      city: "",
      state: "",
      pincode: "",
      phone: "",
      email: g.email,
      plan: "basic",
      setupComplete: true,
    },
  };
}

const schema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required"),
});
type FormValues = z.infer<typeof schema>;

export function LoginPage() {
  const { login, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const from = (location.state as { from?: string } | null)?.from ?? "/dashboard";

  // Showing the login form means starting a fresh session: drop any stored
  // token so a stale one can't bypass the credentials being entered.
  useEffect(() => {
    if (isAuthenticated) logout();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const [googleLoading, setGoogleLoading] = useState(false);

  // Google login skips the password but NOT 2FA — the mock user simply has
  // 2FA off, so it goes straight in. Real Google-linked users with 2FA
  // enabled would still hit the existing TwoFactorPage challenge.
  async function handleGoogleLogin() {
    setGoogleLoading(true);
    try {
      const result = await mockGoogleSignIn(); // simulated popup delay
      login(buildMockGoogleSession(result));
      toast({
        title: "Signed in with Google (mock)",
        description: "This session is simulated — no real OAuth yet.",
        variant: "info",
      });
      navigate(from, { replace: true });
    } finally {
      setGoogleLoading(false);
    }
  }

  const mutation = useMutation({
    mutationFn: loginApi,
    onSuccess: (res) => {
      if (res.requiresTwoFactor) {
        navigate("/2fa", { state: { from } });
        return;
      }
      login({ token: res.token!, user: res.user!, org: res.org! });
      navigate(from, { replace: true });
    },
    onError: (err: Error) => toast({ title: "Login failed", description: err.message, variant: "error" }),
  });

  return (
    <AuthLayout title="Sign in" subtitle="Welcome back — sign in to manage your hostel.">
      <div className="mb-4 space-y-3">
        <SocialButtons onGoogle={handleGoogleLogin} googleLoading={googleLoading} />
        <AuthDivider label="or continue with email" />
      </div>
      <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="space-y-3">
        {mutation.isError && (
          <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            {(mutation.error as Error).message}
          </p>
        )}
        <FormField label="Email" error={errors.email?.message} required>
          <Input
            type="email"
            placeholder="owner@hostel.com"
            autoComplete="email"
            error={!!errors.email}
            {...register("email")}
          />
        </FormField>
        <FormField label="Password" error={errors.password?.message} required>
          <PasswordInput
            placeholder="••••••••"
            autoComplete="current-password"
            error={!!errors.password}
            {...register("password")}
          />
        </FormField>
        <div className="flex justify-end">
          <Link to="/forgot-password" className="text-xs text-accent-600 hover:underline">
            Forgot password?
          </Link>
        </div>
        <Button type="submit" className="w-full" isLoading={mutation.isPending}>
          Sign in
        </Button>
      </form>
      <p className="mt-4 text-center text-xs text-muted">
        New to Saahvik?{" "}
        <Link to="/signup" className="font-medium text-accent-600 hover:underline">
          Create an account
        </Link>
      </p>
    </AuthLayout>
  );
}
