import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { Building2 } from "lucide-react";
import { updateHostel } from "@/api/hostel.api";
import { useAuth } from "@/features/auth/AuthContext";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { FormField } from "@/components/ui/FormField";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { useToast } from "@/components/ui/Toast";
import { phoneSchema, requiredString } from "@/lib/validators";

const schema = z.object({
  hostelName: requiredString("Hostel name"),
  addressLine: requiredString("Address"),
  city: requiredString("City"),
  state: requiredString("State"),
  pincode: z.string().regex(/^\d{6}$/, "Enter a 6-digit PIN code"),
  phone: phoneSchema,
  gstin: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

const states = [
  "Rajasthan", "Delhi", "Uttar Pradesh", "Maharashtra", "Karnataka", "Gujarat",
  "Madhya Pradesh", "Haryana", "Punjab", "Tamil Nadu", "Telangana", "West Bengal", "Other",
];

/** First-time setup after signup. */
export function HostelSetupPage() {
  const { org, updateOrg } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: "onBlur",
    defaultValues: {
      hostelName: org?.hostelName ?? "",
      addressLine: org?.addressLine ?? "",
      city: org?.city ?? "",
      state: org?.state ?? "Rajasthan",
      pincode: org?.pincode ?? "",
      phone: org?.phone ?? "",
      gstin: org?.gstin ?? "",
    },
  });

  const mutation = useMutation({
    mutationFn: (v: FormValues) => updateHostel({ ...v, setupComplete: true }),
    onSuccess: (updated) => {
      updateOrg(updated);
      toast({ title: "Hostel set up!", description: "Now add your rooms and residents.", variant: "success" });
      navigate("/rooms");
    },
  });

  return (
    <div className="mx-auto max-w-xl">
      <Card>
        <CardHeader
          title={
            <span className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-accent" /> Set up your hostel
            </span>
          }
          subtitle="These details appear on receipts and invoices."
        />
        <CardBody>
          <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="space-y-3">
            <FormField label="Hostel name" error={errors.hostelName?.message} required>
              <Input error={!!errors.hostelName} {...register("hostelName")} />
            </FormField>
            <FormField label="Address" error={errors.addressLine?.message} required>
              <Input placeholder="Plot 42, Gopalpura Bypass" error={!!errors.addressLine} {...register("addressLine")} />
            </FormField>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="City" error={errors.city?.message} required>
                <Input error={!!errors.city} {...register("city")} />
              </FormField>
              <FormField label="State" error={errors.state?.message} required>
                <Select options={states.map((s) => ({ value: s, label: s }))} {...register("state")} />
              </FormField>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="PIN code" error={errors.pincode?.message} required>
                <Input maxLength={6} inputMode="numeric" error={!!errors.pincode} {...register("pincode")} />
              </FormField>
              <FormField label="Contact phone" error={errors.phone?.message} required>
                <Input type="tel" maxLength={10} error={!!errors.phone} {...register("phone")} />
              </FormField>
            </div>
            <FormField label="GSTIN" error={errors.gstin?.message} hint="Optional — shown on invoices if provided">
              <Input placeholder="08ABCDE1234F1Z5" {...register("gstin")} />
            </FormField>
            <div className="flex justify-end pt-1">
              <Button type="submit" isLoading={mutation.isPending}>
                Save & continue
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
