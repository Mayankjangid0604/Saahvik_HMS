import { useQuery } from "@tanstack/react-query";
import { Select } from "@/components/ui/Select";
import { listAllActiveResidents } from "@/api/resident.api";

/** Dropdown of active residents (name — room). */
export function ResidentPicker({
  value,
  onChange,
  error,
  disabled,
}: {
  value: string;
  onChange: (residentId: string) => void;
  error?: boolean;
  disabled?: boolean;
}) {
  const { data, isLoading } = useQuery({
    queryKey: ["residents", "all-active"],
    queryFn: listAllActiveResidents,
  });

  return (
    <Select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={isLoading ? "Loading residents…" : "Select resident"}
      error={error}
      disabled={disabled || isLoading}
      options={(data ?? []).map((r) => ({
        value: r.id,
        label: `${r.name}${r.roomNumber ? ` — ${r.roomNumber} (${r.bedLabel})` : ""}`,
      }))}
    />
  );
}
