import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateRoomFee } from "@/api/hostel.api";
import type { Room } from "@/api/types";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { FormField } from "@/components/ui/FormField";
import { useToast } from "@/components/ui/Toast";
import { paisaToRupees, rupeesToPaisa } from "@/lib/format";

/** Edit a room's fee mode after creation (Room Settings). */
export function RoomFeeDialog({ room, onClose }: { room: Room | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [fixed, setFixed] = useState(false);
  const [feeRupees, setFeeRupees] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (room) {
      setFixed(room.feeMode === "fixed");
      setFeeRupees(
        room.fixedFeeAmountPaisa != null ? String(paisaToRupees(room.fixedFeeAmountPaisa)) : "",
      );
      setError(null);
    }
  }, [room]);

  const mutation = useMutation({
    mutationFn: () =>
      updateRoomFee(room!.id, {
        feeMode: fixed ? "fixed" : "variable",
        fixedFeeAmountPaisa: fixed ? rupeesToPaisa(feeRupees) : null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
      queryClient.invalidateQueries({ queryKey: ["residents"] });
      toast({ title: "Room fee updated", variant: "success" });
      onClose();
    },
    onError: (err: Error) => toast({ title: "Update failed", description: err.message, variant: "error" }),
  });

  const submit = () => {
    if (fixed && (!feeRupees || Number(feeRupees) <= 0)) {
      setError("Enter the room fee");
      return;
    }
    setError(null);
    mutation.mutate();
  };

  return (
    <Modal isOpen={!!room} onClose={onClose} title={room ? `Fee settings — ${room.number}` : ""} size="sm">
      {room && (
        <div className="space-y-3">
          <label className="flex cursor-pointer items-start gap-2.5 rounded-md border border-slate-200 px-3 py-2.5">
            <input
              type="checkbox"
              className="mt-0.5 accent-accent"
              checked={fixed}
              onChange={(e) => setFixed(e.target.checked)}
            />
            <span>
              <span className="block text-sm font-medium text-ink">Fixed Room Fee</span>
              <span className="block text-xs text-muted">
                When on, every resident in {room.number} pays this amount and their fee cannot be
                edited individually.
              </span>
            </span>
          </label>
          {fixed && (
            <FormField label="Room Fee (₹/month)" error={error ?? undefined} required>
              <Input
                type="number"
                min={0}
                step="100"
                value={feeRupees}
                onChange={(e) => setFeeRupees(e.target.value)}
                error={!!error}
              />
            </FormField>
          )}
          {fixed && room.occupiedCount > 0 && (
            <p className="rounded bg-amber-50 px-3 py-2 text-xs text-amber-800">
              {room.occupiedCount} current resident{room.occupiedCount === 1 ? "" : "s"} will move to
              this fee.
            </p>
          )}
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={submit} isLoading={mutation.isPending}>
              Save
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
