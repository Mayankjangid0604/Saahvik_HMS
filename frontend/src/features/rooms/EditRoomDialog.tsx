import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { updateRoom } from "@/api/hostel.api";
import { listWings } from "@/api/wing.api";
import type { Room } from "@/api/types";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { FormField } from "@/components/ui/FormField";
import { useToast } from "@/components/ui/Toast";
import { requiredString } from "@/lib/validators";

const schema = z.object({
  number: requiredString("Room number"),
  floor: z.coerce.number().int().min(0, "Floor is required"),
  wingId: z.string().optional(),
  notes: z.string().optional(),
});
type FormInput = z.input<typeof schema>;
type FormOutput = z.output<typeof schema>;

export function EditRoomDialog({ room, onClose }: { room: Room | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: wings = [] } = useQuery({ queryKey: ["wings"], queryFn: listWings });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(schema),
    mode: "onBlur",
  });

  useEffect(() => {
    if (room) {
      reset({
        number: room.number.replace(/^Room\s*/i, ""),
        floor: room.floor,
        wingId: room.wingId ?? "",
        notes: room.notes ?? "",
      });
    }
  }, [room, reset]);

  const mutation = useMutation({
    mutationFn: (v: FormOutput) =>
      updateRoom(room!.id, {
        number: v.number.startsWith("Room") ? v.number : `Room ${v.number}`,
        floor: v.floor,
        wingId: v.wingId || null,
        notes: v.notes || undefined,
      }),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
      toast({ title: `${updated.number} updated`, variant: "success" });
      onClose();
    },
    onError: (err: Error) => toast({ title: "Update failed", description: err.message, variant: "error" }),
  });

  return (
    <Modal isOpen={!!room} onClose={onClose} title={room ? `Edit ${room.number}` : ""}>
      <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Room number" error={errors.number?.message} required>
            <Input placeholder="305" error={!!errors.number} {...register("number")} />
          </FormField>
          <FormField label="Floor" error={errors.floor?.message} required>
            <Input type="number" min={0} error={!!errors.floor} {...register("floor")} />
          </FormField>
        </div>

        <FormField label="Wing" hint="Optional">
          <Select {...register("wingId")}>
            <option value="">No wing</option>
            {wings.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </Select>
        </FormField>

        <FormField label="Notes" hint="Optional">
          <Input placeholder="e.g. AC room, corner unit" {...register("notes")} />
        </FormField>

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={mutation.isPending}>
            Save changes
          </Button>
        </div>
      </form>
    </Modal>
  );
}
