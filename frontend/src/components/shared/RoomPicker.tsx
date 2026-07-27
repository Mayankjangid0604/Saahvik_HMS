import { useQuery } from "@tanstack/react-query";
import { Select } from "@/components/ui/Select";
import { listAllRooms } from "@/api/hostel.api";

/** Dropdown of rooms with vacancy info. Set onlyWithVacancy to hide full rooms. */
export function RoomPicker({
  value,
  onChange,
  onlyWithVacancy = false,
  error,
  disabled,
}: {
  value: string;
  onChange: (roomId: string) => void;
  onlyWithVacancy?: boolean;
  error?: boolean;
  disabled?: boolean;
}) {
  const { data, isLoading } = useQuery({ queryKey: ["rooms", "all"], queryFn: listAllRooms });

  const rooms = (data ?? []).filter(
    (r) => !onlyWithVacancy || r.beds.some((b) => b.status === "vacant"),
  );

  return (
    <Select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={isLoading ? "Loading rooms…" : "Select room"}
      error={error}
      disabled={disabled || isLoading}
      options={rooms.map((r) => ({
        value: r.id,
        label: `${r.number} — ${r.type}, ${r.beds.filter((b) => b.status === "vacant").length} vacant`,
      }))}
    />
  );
}
