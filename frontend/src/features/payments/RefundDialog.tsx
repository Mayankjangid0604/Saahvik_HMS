import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { refundPayment } from "@/api/payment.api";
import type { Payment } from "@/api/types";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { FormField } from "@/components/ui/FormField";
import { useToast } from "@/components/ui/Toast";
import { requiredString, rupeeAmountSchema } from "@/lib/validators";
import { formatMoney, paisaToRupees, rupeesToPaisa } from "@/lib/format";

const schema = z.object({
  amountRupees: rupeeAmountSchema,
  reason: requiredString("Reason"),
});
type FormInput = z.input<typeof schema>;
type FormValues = z.output<typeof schema>;

export function RefundDialog({
  isOpen,
  onClose,
  payment,
}: {
  isOpen: boolean;
  onClose: () => void;
  payment: Payment;
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const remainingPaisa = payment.amountPaisa - payment.refundedPaisa;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormInput, unknown, FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { amountRupees: paisaToRupees(remainingPaisa) },
  });

  const mutation = useMutation({
    mutationFn: (v: FormValues) =>
      refundPayment({
        paymentId: payment.id,
        amountPaisa: rupeesToPaisa(v.amountRupees),
        reason: v.reason,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      toast({ title: "Refund recorded", variant: "success" });
      onClose();
    },
    onError: (err: Error) => toast({ title: "Refund failed", description: err.message, variant: "error" }),
  });

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Refund — ${payment.receiptNo}`} size="sm">
      <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="space-y-3">
        <p className="rounded bg-slate-50 px-3 py-2 text-xs text-muted">
          {payment.residentName} paid {formatMoney(payment.amountPaisa)}
          {payment.refundedPaisa > 0 && ` (${formatMoney(payment.refundedPaisa)} already refunded)`}.
          Up to {formatMoney(remainingPaisa)} can be refunded.
        </p>
        <FormField label="Refund amount (₹)" error={errors.amountRupees?.message} required>
          <Input type="number" min={0} step="1" error={!!errors.amountRupees} {...register("amountRupees")} />
        </FormField>
        <FormField label="Reason" error={errors.reason?.message} required>
          <Textarea rows={2} placeholder="Why is this being refunded?" error={!!errors.reason} {...register("reason")} />
        </FormField>
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="danger" isLoading={mutation.isPending}>
            Record refund
          </Button>
        </div>
      </form>
    </Modal>
  );
}
