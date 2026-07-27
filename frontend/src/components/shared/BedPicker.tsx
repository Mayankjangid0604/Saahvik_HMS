import { useQuery } from "@tanstack/react-query";
import { Select } from "@/components/ui/Select";
import { listAllRooms } from "@/api/hostel.api";

/** Dropdown of vacant beds within the selected room. */
export function BedPicker({
  roomId,
  value,
  onChange,
  error,
  disabled,
}: {
  roomId: string;
  value: string;
  onChange: (bedId: string) => void;
  error?: boolean;
  disabled?: boolean;
}) {
  const { data, isLoading } = useQuery({ queryKey: ["rooms", "all"], queryFn: listAllRooms });

  const room = (data ?? []).find((r) => r.id === roomId);
  const beds = room?.beds.filter((b) => b.status === "vacant") ?? [];

  return (
    <Select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={
        !roomId ? "Select a room first" : isLoading ? "Loading…" : beds.length === 0 ? "No vacant beds" : "Select bed"
      }
      error={error}
      disabled={disabled || !roomId || isLoading || beds.length === 0}
      options={beds.map((b) => ({ value: b.id, label: `Bed ${b.label}` }))}
    />
  );
}
