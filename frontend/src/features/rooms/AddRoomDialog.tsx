import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createRoom } from "@/api/hostel.api";
import { listWings } from "@/api/wing.api";
import type { RoomType } from "@/api/types";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { FormField } from "@/components/ui/FormField";
import { useToast } from "@/components/ui/Toast";
import { requiredString } from "@/lib/validators";
import { rupeesToPaisa } from "@/lib/format";

/** Room type implies bed count; only dormitories ask for a manual count. */
export const ROOM_TYPE_CAPACITY: Record<Exclude<RoomType, "dorm">, number> = {
  single: 1,
  double: 2,
  triple: 3,
  quad: 4,
};

export const ROOM_TYPE_OPTIONS = [
  { value: "single", label: "Single (1 bed)" },
  { value: "double", label: "Double (2 beds)" },
  { value: "triple", label: "Triple (3 beds)" },
  { value: "quad", label: "Quad (4 beds)" },
  { value: "dorm", label: "Dormitory (custom)" },
];

const schema = z
  .object({
    number: requiredString("Room number"),
    floor: z.coerce.number().int().min(0, "Floor is required"),
    type: z.enum(["single", "double", "triple", "quad", "dorm"]),
    dormBeds: z.coerce.number().optional(),
    wingId: z.string().optional(),
    fixedFee: z.boolean(),
    feeRupees: z.coerce.number().optional(),
  })
  .superRefine((v, ctx) => {
    if (v.type === "dorm" && (!v.dormBeds || v.dormBeds < 1 || v.dormBeds > 24)) {
      ctx.addIssue({ code: "custom", path: ["dormBeds"], message: "Enter 1–24 beds" });
    }
    if (v.fixedFee && (!v.feeRupees || v.feeRupees <= 0)) {
      ctx.addIssue({ code: "custom", path: ["feeRupees"], message: "Enter the room fee" });
    }
  });
type FormInput = z.input<typeof schema>;
type FormValues = z.output<typeof schema>;

export function roomCapacityFor(type: RoomType, dormBeds?: number): number {
  return type === "dorm" ? (dormBeds ?? 4) : ROOM_TYPE_CAPACITY[type];
}

export function AddRoomDialog({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
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
    defaultValues: { type: "double", floor: 1, fixedFee: false, dormBeds: 4, wingId: "" },
  });

  const type = watch("type") as RoomType;
  const fixedFee = !!watch("fixedFee");
  const { data: wings = [] } = useQuery({ queryKey: ["wings"], queryFn: listWings });

  const mutation = useMutation({
    mutationFn: (v: FormValues) =>
      createRoom({
        number: v.number.startsWith("Room") ? v.number : `Room ${v.number}`,
        floor: v.floor,
        type: v.type,
        capacity: roomCapacityFor(v.type, v.dormBeds),
        feeMode: v.fixedFee ? "fixed" : "variable",
        fixedFeeAmountPaisa: v.fixedFee ? rupeesToPaisa(v.feeRupees ?? 0) : null,
        wingId: v.wingId || undefined,
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
          <FormField
            label="Room type"
            error={errors.type?.message}
            required
            hint={type !== "dorm" ? `Bed count set by type — beds labelled A, B, C…` : undefined}
          >
            <Select {...register("type")} options={ROOM_TYPE_OPTIONS} />
          </FormField>
          {type === "dorm" && (
            <FormField label="Number of beds" error={errors.dormBeds?.message} required>
              <Input type="number" min={1} max={24} error={!!errors.dormBeds} {...register("dormBeds")} />
            </FormField>
          )}
        </div>

        <FormField
          label="Wing"
          hint={wings.length === 0 ? "Optional — create wings in Settings › Wings" : "Optional"}
        >
          <Select {...register("wingId")}>
            <option value="">No wing</option>
            {wings.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </Select>
        </FormField>

        <label className="flex cursor-pointer items-start gap-2.5 rounded-md border border-slate-200 px-3 py-2.5">
          <input
            type="checkbox"
            className="mt-0.5 accent-accent"
            checked={fixedFee}
            onChange={(e) => setValue("fixedFee", e.target.checked)}
          />
          <span>
            <span className="block text-sm font-medium text-ink">Fixed Room Fee</span>
            <span className="block text-xs text-muted">
              Every resident in this room pays the same fee, set here. Off = fee entered per
              resident.
            </span>
          </span>
        </label>

        {fixedFee && (
          <FormField label="Room Fee (₹/month)" error={errors.feeRupees?.message} required>
            <Input type="number" min={0} step="100" placeholder="5500" error={!!errors.feeRupees} {...register("feeRupees")} />
          </FormField>
        )}

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
