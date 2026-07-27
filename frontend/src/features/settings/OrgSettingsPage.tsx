import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { updateOrgSettings, getOrgSettings } from "@/api/settings.api";
import { useAuth } from "@/features/auth/AuthContext";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { FormField } from "@/components/ui/FormField";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { HostelSettingsSection } from "@/features/hostel/HostelSettingsPage";
import { emailSchema, phoneSchema, requiredString } from "@/lib/validators";

const schema = z.object({
  name: requiredString("Organisation name"),
  hostelName: requiredString("Hostel name"),
  addressLine: requiredString("Address"),
  city: requiredString("City"),
  state: requiredString("State"),
  pincode: z.string().regex(/^\d{6}$/, "Enter a 6-digit PIN code"),
  phone: phoneSchema,
  email: emailSchema,
  gstin: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

export function OrgSettingsPage() {
  const { toast } = useToast();
  const { updateOrg } = useAuth();

  const { data: org, isLoading } = useQuery({ queryKey: ["org-settings"], queryFn: getOrgSettings });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: org
      ? {
          name: org.name,
          hostelName: org.hostelName,
          addressLine: org.addressLine,
          city: org.city,
          state: org.state,
          pincode: org.pincode,
          phone: org.phone,
          email: org.email,
          gstin: org.gstin ?? "",
        }
      : undefined,
  });

  const mutation = useMutation({
    mutationFn: (v: FormValues) => updateOrgSettings(v),
    onSuccess: (updated) => {
      updateOrg(updated);
      toast({ title: "Organisation settings saved", variant: "success" });
    },
  });

  if (isLoading || !org) {
    return (
      <div className="mx-auto max-w-2xl space-y-3">
        <PageHeader title="Organization settings" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <PageHeader title="Organization settings" subtitle="Shown on receipts, invoices and reports" />

      <form onSubmit={handleSubmit((v) => mutation.mutate(v))}>
        <Card>
          <CardHeader title="Organisation & hostel" />
          <CardBody className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField label="Organisation name" error={errors.name?.message} required>
                <Input error={!!errors.name} {...register("name")} />
              </FormField>
              <FormField label="Hostel name" error={errors.hostelName?.message} required>
                <Input error={!!errors.hostelName} {...register("hostelName")} />
              </FormField>
            </div>
            <FormField label="Address" error={errors.addressLine?.message} required>
              <Input error={!!errors.addressLine} {...register("addressLine")} />
            </FormField>
            <div className="grid gap-3 sm:grid-cols-3">
              <FormField label="City" error={errors.city?.message} required>
                <Input error={!!errors.city} {...register("city")} />
              </FormField>
              <FormField label="State" error={errors.state?.message} required>
                <Input error={!!errors.state} {...register("state")} />
              </FormField>
              <FormField label="PIN code" error={errors.pincode?.message} required>
                <Input maxLength={6} inputMode="numeric" error={!!errors.pincode} {...register("pincode")} />
              </FormField>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <FormField label="Phone" error={errors.phone?.message} required>
                <Input type="tel" maxLength={10} error={!!errors.phone} {...register("phone")} />
              </FormField>
              <FormField label="Email" error={errors.email?.message} required>
                <Input type="email" error={!!errors.email} {...register("email")} />
              </FormField>
              <FormField label="GSTIN" error={errors.gstin?.message}>
                <Input {...register("gstin")} />
              </FormField>
            </div>
            <div className="flex justify-end">
              <Button type="submit" isLoading={mutation.isPending}>
                Save changes
              </Button>
            </div>
          </CardBody>
        </Card>
      </form>

      <HostelSettingsSection />
    </div>
  );
}
