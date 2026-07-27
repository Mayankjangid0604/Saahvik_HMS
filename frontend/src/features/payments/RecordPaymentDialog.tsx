import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { recordPayment } from "@/api/payment.api";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { FormField } from "@/components/ui/FormField";
import { useToast } from "@/components/ui/Toast";
import { ResidentPicker } from "@/components/shared/ResidentPicker";
import { requiredString, rupeeAmountSchema } from "@/lib/validators";
import { rupeesToPaisa } from "@/lib/format";

const schema = z.object({
  residentId: requiredString("Resident"),
  amountRupees: rupeeAmountSchema,
  method: z.enum(["cash", "upi", "bank_transfer", "card", "cheque"]),
  type: z.enum(["rent", "deposit", "fine", "other"]),
  paidAt: requiredString("Date"),
  periodMonth: z.string().optional(),
  notes: z.string().optional(),
});
type FormInput = z.input<typeof schema>;
type FormValues = z.output<typeof schema>;

export function RecordPaymentDialog({
  isOpen,
  onClose,
  presetResidentId,
}: {
  isOpen: boolean;
  onClose: () => void;
  presetResidentId?: string;
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<FormInput, unknown, FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      residentId: presetResidentId ?? "",
      method: "upi",
      type: "rent",
      paidAt: new Date().toISOString().slice(0, 10),
      periodMonth: new Date().toISOString().slice(0, 7),
    },
  });

  const type = watch("type");

  const mutation = useMutation({
    mutationFn: (v: FormValues) =>
      recordPayment({
        residentId: v.residentId,
        amountPaisa: rupeesToPaisa(v.amountRupees),
        method: v.method,
        type: v.type,
        paidAt: new Date(v.paidAt).toISOString(),
        periodMonth: v.type === "rent" ? v.periodMonth : undefined,
        notes: v.notes,
      }),
    onSuccess: (payment) => {
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      queryClient.invalidateQueries({ queryKey: ["residents"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["dues"] });
      toast({ title: "Payment recorded", description: payment.receiptNo, variant: "success" });
      reset();
      onClose();
    },
    onError: (err: Error) =>
      toast({ title: "Could not record payment", description: err.message, variant: "error" }),
  });

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Record payment">
      <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="space-y-3">
        <FormField label="Resident" error={errors.residentId?.message} required>
          <ResidentPicker
            value={watch("residentId")}
            onChange={(id) => setValue("residentId", id, { shouldValidate: true })}
            error={!!errors.residentId}
            disabled={!!presetResidentId}
          />
        </FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Amount (₹)" error={errors.amountRupees?.message} required>
            <Input type="number" min={0} step="1" placeholder="5500" error={!!errors.amountRupees} {...register("amountRupees")} />
          </FormField>
          <FormField label="Payment date" error={errors.paidAt?.message} required>
            <Input type="date" error={!!errors.paidAt} {...register("paidAt")} />
          </FormField>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Type" required>
            <Select
              {...register("type")}
              options={[
                { value: "rent", label: "Rent" },
                { value: "deposit", label: "Security deposit" },
                { value: "fine", label: "Fine" },
                { value: "other", label: "Other" },
              ]}
            />
          </FormField>
          <FormField label="Mode" required>
            <Select
              {...register("method")}
              options={[
                { value: "upi", label: "UPI" },
                { value: "cash", label: "Cash" },
                { value: "bank_transfer", label: "Bank transfer" },
                { value: "card", label: "Card" },
                { value: "cheque", label: "Cheque" },
              ]}
            />
          </FormField>
        </div>
        {type === "rent" && (
          <FormField label="For month" hint="Which month's rent this covers">
            <Input type="month" {...register("periodMonth")} />
          </FormField>
        )}
        <FormField label="Notes">
          <Textarea rows={2} placeholder="Optional" {...register("notes")} />
        </FormField>
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={mutation.isPending}>
            Record payment
          </Button>
        </div>
      </form>
    </Modal>
  );
}
