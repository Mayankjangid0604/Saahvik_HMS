import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { bulkAddRooms } from "@/api/hostel.api";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { FormField } from "@/components/ui/FormField";
import { useToast } from "@/components/ui/Toast";
import { rupeeAmountSchema } from "@/lib/validators";
import { rupeesToPaisa } from "@/lib/format";

const schema = z.object({
  floor: z.coerce.number().int().min(0),
  startNumber: z.coerce.number().int().min(1, "Starting number required"),
  count: z.coerce.number().int().min(1, "At least 1").max(50, "Max 50 at a time"),
  type: z.enum(["single", "double", "triple", "dorm"]),
  capacity: z.coerce.number().int().min(1).max(12),
  rentRupees: rupeeAmountSchema,
});
type FormInput = z.input<typeof schema>;
type FormValues = z.output<typeof schema>;

export function BulkAddDialog({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormInput, unknown, FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { floor: 4, startNumber: 401, count: 6, type: "double", capacity: 2 },
  });

  const startNumber = Number(watch("startNumber"));
  const count = Number(watch("count"));

  const mutation = useMutation({
    mutationFn: (v: FormValues) =>
      bulkAddRooms({
        floor: v.floor,
        startNumber: v.startNumber,
        count: v.count,
        type: v.type,
        capacity: v.capacity,
        monthlyRentPaisa: rupeesToPaisa(v.rentRupees),
      }),
    onSuccess: ({ created }) => {
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
      toast({
        title: `${created} rooms created`,
        description: created < count ? "Some room numbers already existed and were skipped" : undefined,
        variant: "success",
      });
      reset();
      onClose();
    },
    onError: (err: Error) => toast({ title: "Bulk add failed", description: err.message, variant: "error" }),
  });

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Bulk add rooms">
      <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="space-y-3">
        <div className="grid grid-cols-3 gap-3">
          <FormField label="Floor" error={errors.floor?.message} required>
            <Input type="number" min={0} error={!!errors.floor} {...register("floor")} />
          </FormField>
          <FormField label="Start at" error={errors.startNumber?.message} required>
            <Input type="number" min={1} error={!!errors.startNumber} {...register("startNumber")} />
          </FormField>
          <FormField label="How many" error={errors.count?.message} required>
            <Input type="number" min={1} max={50} error={!!errors.count} {...register("count")} />
          </FormField>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Room type" required>
            <Select
              {...register("type")}
              options={[
                { value: "single", label: "Single" },
                { value: "double", label: "Double sharing" },
                { value: "triple", label: "Triple sharing" },
                { value: "dorm", label: "Dormitory" },
              ]}
            />
          </FormField>
          <FormField label="Beds per room" error={errors.capacity?.message} required>
            <Input type="number" min={1} max={12} error={!!errors.capacity} {...register("capacity")} />
          </FormField>
        </div>
        <FormField label="Monthly rent per bed (₹)" error={errors.rentRupees?.message} required>
          <Input type="number" min={0} step="100" placeholder="5500" error={!!errors.rentRupees} {...register("rentRupees")} />
        </FormField>
        {startNumber > 0 && count > 0 && (
          <p className="rounded bg-accent-50 px-3 py-2 text-xs text-accent-600">
            Will create Room {startNumber} … Room {Number(startNumber) + Number(count) - 1}
          </p>
        )}
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={mutation.isPending}>
            Create rooms
          </Button>
        </div>
      </form>
    </Modal>
  );
}
