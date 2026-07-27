import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { transferResident } from "@/api/hostel.api";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { FormField } from "@/components/ui/FormField";
import { useToast } from "@/components/ui/Toast";
import { ResidentPicker } from "@/components/shared/ResidentPicker";
import { RoomPicker } from "@/components/shared/RoomPicker";
import { BedPicker } from "@/components/shared/BedPicker";

export function RoomTransferDialog({
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
  const [residentId, setResidentId] = useState(presetResidentId ?? "");
  const [roomId, setRoomId] = useState("");
  const [bedId, setBedId] = useState("");
  const [effectiveDate, setEffectiveDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () =>
      transferResident({ residentId, toRoomId: roomId, toBedId: bedId, effectiveDate, reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
      queryClient.invalidateQueries({ queryKey: ["residents"] });
      toast({ title: "Resident transferred", variant: "success" });
      onClose();
    },
    onError: (err: Error) => toast({ title: "Transfer failed", description: err.message, variant: "error" }),
  });

  const submit = () => {
    if (!residentId || !roomId || !bedId) {
      setError("Pick a resident and the destination bed");
      return;
    }
    setError(null);
    mutation.mutate();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Transfer resident">
      <div className="space-y-3">
        <FormField label="Resident" required>
          <ResidentPicker value={residentId} onChange={setResidentId} disabled={!!presetResidentId} />
        </FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="New room" required>
            <RoomPicker
              value={roomId}
              onChange={(id) => {
                setRoomId(id);
                setBedId("");
              }}
              onlyWithVacancy
            />
          </FormField>
          <FormField label="New bed" required>
            <BedPicker roomId={roomId} value={bedId} onChange={setBedId} />
          </FormField>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Effective date" required>
            <Input type="date" value={effectiveDate} onChange={(e) => setEffectiveDate(e.target.value)} />
          </FormField>
          <FormField label="Reason" hint="Optional">
            <Input placeholder="Roommate issue" value={reason} onChange={(e) => setReason(e.target.value)} />
          </FormField>
        </div>
        <p className="rounded bg-slate-50 px-3 py-2 text-xs text-muted">
          Rent updates to the new room's rate from the effective date.
        </p>
        {error && <p className="text-xs text-red-600">{error}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} isLoading={mutation.isPending}>
            Transfer
          </Button>
        </div>
      </div>
    </Modal>
  );
}
