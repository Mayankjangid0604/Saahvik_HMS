import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createRoom } from "@/api/hostel.api";
import type { RoomType } from "@/api/types";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { FormField } from "@/components/ui/FormField";
import { useToast } from "@/components/ui/Toast";
import { requiredString, rupeeAmountSchema } from "@/lib/validators";
import { rupeesToPaisa } from "@/lib/format";

const schema = z.object({
  number: requiredString("Room number"),
  floor: z.coerce.number().int().min(0, "Floor is required"),
  type: z.enum(["single", "double", "triple", "dorm"]),
  capacity: z.coerce.number().int().min(1, "At least 1 bed").max(12, "Max 12 beds"),
  rentRupees: rupeeAmountSchema,
});
type FormInput = z.input<typeof schema>;
type FormValues = z.output<typeof schema>;

const typeCapacity: Record<RoomType, number> = { single: 1, double: 2, triple: 3, dorm: 4 };

export function AddRoomDialog({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<FormInput, unknown, FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { type: "double", capacity: 2, floor: 1 },
  });

  const mutation = useMutation({
    mutationFn: (v: FormValues) =>
      createRoom({
        number: v.number.startsWith("Room") ? v.number : `Room ${v.number}`,
        floor: v.floor,
        type: v.type,
        capacity: v.capacity,
        monthlyRentPaisa: rupeesToPaisa(v.rentRupees),
      }),
    onSuccess: (room) => {
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
      toast({ title: `${room.number} added`, description: `${room.capacity} beds created`, variant: "success" });
      reset();
      onClose();
    },
    onError: (err: Error) => toast({ title: "Could not add room", description: err.message, variant: "error" }),
  });

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add room">
      <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Room number" error={errors.number?.message} required>
            <Input placeholder="305" error={!!errors.number} {...register("number")} />
          </FormField>
          <FormField label="Floor" error={errors.floor?.message} required>
            <Input type="number" min={0} error={!!errors.floor} {...register("floor")} />
          </FormField>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Room type" error={errors.type?.message} required>
            <Select
              {...register("type", {
                onChange: (e) => setValue("capacity", typeCapacity[e.target.value as RoomType]),
              })}
              options={[
                { value: "single", label: "Single" },
                { value: "double", label: "Double sharing" },
                { value: "triple", label: "Triple sharing" },
                { value: "dorm", label: "Dormitory" },
              ]}
            />
          </FormField>
          <FormField label="Beds" error={errors.capacity?.message} required hint="Labelled A, B, C…">
            <Input type="number" min={1} max={12} error={!!errors.capacity} {...register("capacity")} />
          </FormField>
        </div>
        <FormField label="Monthly rent per bed (₹)" error={errors.rentRupees?.message} required>
          <Input type="number" min={0} step="100" placeholder="5500" error={!!errors.rentRupees} {...register("rentRupees")} />
        </FormField>
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={mutation.isPending}>
            Add room
          </Button>
        </div>
      </form>
    </Modal>
  );
}
