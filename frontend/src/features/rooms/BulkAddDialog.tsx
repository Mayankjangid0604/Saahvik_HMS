import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { bulkAddRooms } from "@/api/hostel.api";
import { listWings } from "@/api/wing.api";
import type { RoomType } from "@/api/types";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { FormField } from "@/components/ui/FormField";
import { useToast } from "@/components/ui/Toast";
import { rupeesToPaisa } from "@/lib/format";
import { ROOM_TYPE_OPTIONS, roomCapacityFor } from "./AddRoomDialog";

const schema = z
  .object({
    floor: z.coerce.number().int().min(0),
    startNumber: z.coerce.number().int().min(1, "Starting number required"),
    count: z.coerce.number().int().min(1, "At least 1").max(50, "Max 50 at a time"),
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

export function BulkAddDialog({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
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
      floor: 4,
      startNumber: 401,
      count: 6,
      type: "double",
      dormBeds: 4,
      fixedFee: false,
      wingId: "",
    },
  });

  const type = watch("type") as RoomType;
  const fixedFee = !!watch("fixedFee");
  const startNumber = Number(watch("startNumber"));
  const count = Number(watch("count"));
  const { data: wings = [] } = useQuery({ queryKey: ["wings"], queryFn: listWings });

  const mutation = useMutation({
    mutationFn: (v: FormValues) =>
      bulkAddRooms({
        floor: v.floor,
        startNumber: v.startNumber,
        count: v.count,
        type: v.type,
        capacity: roomCapacityFor(v.type, v.dormBeds),
        feeMode: v.fixedFee ? "fixed" : "variable",
        fixedFeeAmountPaisa: v.fixedFee ? rupeesToPaisa(v.feeRupees ?? 0) : null,
        wingId: v.wingId || undefined,
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
          <FormField
            label="Room type"
            required
            hint={type !== "dorm" ? "Bed count set by type" : undefined}
          >
            <Select {...register("type")} options={ROOM_TYPE_OPTIONS} />
          </FormField>
          {type === "dorm" && (
            <FormField label="Beds per room" error={errors.dormBeds?.message} required>
              <Input type="number" min={1} max={24} error={!!errors.dormBeds} {...register("dormBeds")} />
            </FormField>
          )}
        </div>

        <FormField
          label="Wing"
          hint={wings.length === 0 ? "Optional — create wings in Settings › Wings" : "Applies to every room created"}
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
              Applies to every room created — residents pay the room's fee, not a per-resident one.
            </span>
          </span>
        </label>

        {fixedFee && (
          <FormField label="Room Fee (₹/month)" error={errors.feeRupees?.message} required>
            <Input type="number" min={0} step="100" placeholder="5500" error={!!errors.feeRupees} {...register("feeRupees")} />
          </FormField>
        )}

        {startNumber > 0 && count > 0 && (
          <p className="rounded bg-accent-50 px-3 py-2 text-xs text-accent-600">
            Will create Room {startNumber} … Room {startNumber + count - 1}
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
