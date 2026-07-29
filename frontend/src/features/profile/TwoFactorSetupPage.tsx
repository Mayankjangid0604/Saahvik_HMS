import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowLeft, Copy, ShieldCheck, ShieldOff } from "lucide-react";
import { confirmTwoFactor, disableTwoFactor, setupTwoFactor } from "@/api/auth.api";
import { useAuth } from "@/features/auth/AuthContext";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { FormField } from "@/components/ui/FormField";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";

export function TwoFactorSetupPage() {
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();
  const { toast } = useToast();
  const [code, setCode] = useState("");

  const enabled = user?.twoFactorEnabled ?? false;

  const { data: setup, isLoading } = useQuery({
    queryKey: ["2fa-setup"],
    queryFn: setupTwoFactor,
    enabled: !enabled,
  });

  const confirmMutation = useMutation({
    mutationFn: () => confirmTwoFactor(code),
    onSuccess: () => {
      if (user) updateUser({ ...user, twoFactorEnabled: true });
      toast({ title: "Two-factor enabled", description: "You'll be asked for a code at sign-in.", variant: "success" });
      setCode("");
    },
    onError: (err: Error) => toast({ title: "Invalid code", description: err.message, variant: "error" }),
  });

  const disableMutation = useMutation({
    mutationFn: (disableCode: string) => disableTwoFactor(disableCode),
    onSuccess: () => {
      if (user) updateUser({ ...user, twoFactorEnabled: false });
      toast({ title: "Two-factor disabled", variant: "info" });
      setCode("");
    },
    onError: (err: Error) =>
      toast({ title: "Could not disable 2FA", description: err.message, variant: "error" }),
  });

  const copySecret = () => {
    if (setup) {
      navigator.clipboard.writeText(setup.secret);
      toast({ title: "Secret copied", variant: "success" });
    }
  };

  return (
    <div className="mx-auto max-w-md">
      <button
        onClick={() => navigate("/profile")}
        className="mb-2 flex items-center gap-1 text-xs text-muted hover:text-ink"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Profile
      </button>
      <PageHeader title="Two-factor authentication" />

      {enabled ? (
        <Card>
          <CardBody className="flex flex-col items-center py-8 text-center">
            <ShieldCheck className="mb-2 h-10 w-10 text-green-600" />
            <p className="text-sm font-semibold text-ink">Two-factor is on</p>
            <p className="mt-1 max-w-xs text-xs text-muted">
              Signing in requires a 6-digit code from your authenticator app in addition to your
              password.
            </p>
            <div className="mt-4 w-full max-w-xs space-y-3 text-left">
              <FormField label="Enter a code from your app to disable" required>
                <Input
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="123456"
                  className="text-center font-mono text-lg tracking-[0.5em]"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                />
              </FormField>
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => disableMutation.mutate(code)}
                isLoading={disableMutation.isPending}
                disabled={code.length !== 6}
              >
                <ShieldOff className="h-3.5 w-3.5" /> Disable 2FA
              </Button>
            </div>
          </CardBody>
        </Card>
      ) : (
        <Card>
          <CardHeader
            title="Set up authenticator"
            subtitle="Use Google Authenticator, Authy or any TOTP app"
          />
          <CardBody className="space-y-4">
            {isLoading || !setup ? (
              <Skeleton className="h-32" />
            ) : (
              <>
                <div>
                  <p className="mb-1.5 text-xs font-medium text-muted">
                    1. Add this secret key to your authenticator app
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-sm tracking-widest">
                      {setup.secret}
                    </code>
                    <Button variant="outline" size="sm" onClick={copySecret} aria-label="Copy secret">
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                <FormField label="2. Enter the 6-digit code it shows" required>
                  <Input
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="123456"
                    className="text-center font-mono text-lg tracking-[0.5em]"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                  />
                </FormField>
                <div className="flex justify-end">
                  <Button
                    onClick={() => confirmMutation.mutate()}
                    isLoading={confirmMutation.isPending}
                    disabled={code.length !== 6}
                  >
                    <ShieldCheck className="h-3.5 w-3.5" /> Enable 2FA
                  </Button>
                </div>
              </>
            )}
          </CardBody>
        </Card>
      )}
    </div>
  );
}
