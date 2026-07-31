import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import type { ColumnDef, SortingState } from "@tanstack/react-table";
import { ArrowLeftRight, BedDouble, Layers, Pencil, Plus, Search, Settings2 } from "lucide-react";
import { listAllRooms, listRooms, updateRoomFee } from "@/api/hostel.api";
import type { Room } from "@/api/types";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { DataTable } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { MoneyDisplay } from "@/components/shared/MoneyDisplay";
import { Switch } from "@/components/ui/Switch";
import { useToast } from "@/components/ui/Toast";
import { useDebounce } from "@/hooks/useDebounce";
import { usePagination } from "@/hooks/usePagination";
import { AddRoomDialog } from "./AddRoomDialog";
import { BulkAddDialog } from "./BulkAddDialog";
import { RoomTransferDialog } from "./RoomTransferDialog";
import { RoomFeeDialog } from "./RoomFeeDialog";
import { EditRoomDialog } from "./EditRoomDialog";

const typeLabels: Record<Room["type"], string> = {
  single: "Single",
  double: "Double",
  triple: "Triple",
  quad: "Quad",
  dorm: "Dorm",
};

export function RoomsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [floor, setFloor] = useState("");
  const [type, setType] = useState("all");
  const [sorting, setSorting] = useState<SortingState>([{ id: "number", desc: false }]);
  const { page, pageSize, setPage, setPageSize } = usePagination(20);
  const debouncedSearch = useDebounce(search);

  const [addOpen, setAddOpen] = useState(searchParams.get("add") === "1");
  const [bulkOpen, setBulkOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [feeRoom, setFeeRoom] = useState<Room | null>(null);
  const [editRoom, setEditRoom] = useState<Room | null>(null);

  const toggleOffMutation = useMutation({
    mutationFn: (roomId: string) =>
      updateRoomFee(roomId, { feeMode: "variable", fixedFeeAmountPaisa: null }),
    onSuccess: (room) => {
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
      queryClient.invalidateQueries({ queryKey: ["residents"] });
      toast({ title: `${room.number} switched to per-resident fee`, variant: "success" });
    },
    onError: (err: Error) => toast({ title: "Update failed", description: err.message, variant: "error" }),
  });

  // Filter options come from the rooms that actually exist (Change 4)
  const { data: allRooms } = useQuery({ queryKey: ["rooms", "all"], queryFn: listAllRooms });
  const floorOptions = [...new Set((allRooms ?? []).map((r) => r.floor))].sort((a, b) => a - b);
  const typeOptions = [...new Set((allRooms ?? []).map((r) => r.type))];

  const { data, isLoading } = useQuery({
    queryKey: ["rooms", "list", { page, pageSize, debouncedSearch, floor, type, sorting }],
    queryFn: () =>
      listRooms({
        page,
        pageSize,
        search: debouncedSearch,
        floor: floor ? Number(floor) : undefined,
        type: type as Room["type"] | "all",
        sortBy: sorting[0]?.id,
        sortDir: sorting[0]?.desc ? "desc" : "asc",
      }),
    placeholderData: keepPreviousData,
  });

  const columns = useMemo<ColumnDef<Room>[]>(
    () => [
      {
        accessorKey: "number",
        header: "Room",
        cell: ({ row }) => (
          <span className="font-medium text-primary">{row.original.number}</span>
        ),
      },
      { accessorKey: "floor", header: "Floor" },
      {
        accessorKey: "type",
        header: "Type",
        cell: ({ getValue }) => typeLabels[getValue<Room["type"]>()],
      },
      {
        id: "beds",
        header: "Beds",
        enableSorting: false,
        cell: ({ row }) => {
          const r = row.original;
          const vacant = r.beds.filter((b) => b.status === "vacant").length;
          return (
            <span className="flex items-center gap-1.5">
              <span className="font-mono text-xs">
                {r.occupiedCount}/{r.capacity}
              </span>
              {vacant > 0 ? (
                <Badge tone="green">{vacant} vacant</Badge>
              ) : (
                <Badge tone="slate">Full</Badge>
              )}
            </span>
          );
        },
      },
      {
        accessorKey: "monthlyRentPaisa",
        header: "Fixed fee",
        cell: ({ row }) => {
          const r = row.original;
          const isFixed = r.feeMode === "fixed" && r.fixedFeeAmountPaisa != null;
          return (
            <span className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
              <Switch
                checked={isFixed}
                label={`Fixed fee for ${r.number}`}
                onChange={(on) => {
                  if (on) {
                    setFeeRoom(r);
                  } else {
                    toggleOffMutation.mutate(r.id);
                  }
                }}
              />
              {isFixed ? (
                <button
                  className="flex items-center gap-1 text-xs text-accent-600 hover:underline"
                  onClick={() => setFeeRoom(r)}
                >
                  <MoneyDisplay paisa={r.fixedFeeAmountPaisa!} />
                </button>
              ) : (
                <span className="text-xs text-muted">Per resident</span>
              )}
            </span>
          );
        },
      },
    ],
    [],
  );

  const clearAddParam = () => {
    if (searchParams.get("add")) {
      searchParams.delete("add");
      setSearchParams(searchParams, { replace: true });
    }
  };

  return (
    <div>
      <PageHeader
        title="Rooms & Beds"
        subtitle="Click a row to see its beds"
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => setTransferOpen(true)}>
              <ArrowLeftRight className="h-3.5 w-3.5" /> Transfer
            </Button>
            <Button variant="outline" size="sm" onClick={() => setBulkOpen(true)}>
              <Layers className="h-3.5 w-3.5" /> Bulk add
            </Button>
            <Button size="sm" onClick={() => setAddOpen(true)}>
              <Plus className="h-3.5 w-3.5" /> Add room
            </Button>
          </>
        }
      />

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-64">
          <Search className="absolute top-2.5 left-2.5 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search room or resident…"
            className="pl-8"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <Select
          className="w-32"
          value={floor}
          onChange={(e) => {
            setFloor(e.target.value);
            setPage(1);
          }}
          placeholder="All floors"
          options={floorOptions.map((f) => ({ value: String(f), label: `Floor ${f}` }))}
        />
        <Select
          className="w-36"
          value={type}
          onChange={(e) => {
            setType(e.target.value);
            setPage(1);
          }}
          options={[
            { value: "all", label: "All types" },
            ...typeOptions.map((t) => ({ value: t, label: typeLabels[t] })),
          ]}
        />
      </div>

      <DataTable
        columns={columns}
        data={data?.data ?? []}
        total={data?.total ?? 0}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        sorting={sorting}
        onSortingChange={setSorting}
        isLoading={isLoading}
        emptyTitle="No rooms yet"
        emptyDescription="Add your first room to start assigning beds."
        emptyAction={
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <Plus className="h-3.5 w-3.5" /> Add room
          </Button>
        }
        renderExpanded={(row) => (
          <div className="flex flex-wrap items-center gap-2">
            <button
              className="flex min-w-40 items-center gap-2 rounded-md border border-dashed border-slate-300 bg-white px-3 py-2 text-xs font-medium text-muted hover:border-accent hover:text-accent-600"
              onClick={(e) => {
                e.stopPropagation();
                setEditRoom(row.original);
              }}
            >
              <Pencil className="h-3.5 w-3.5" /> Edit room
            </button>
            <button
              className="flex min-w-40 items-center gap-2 rounded-md border border-dashed border-slate-300 bg-white px-3 py-2 text-xs font-medium text-muted hover:border-accent hover:text-accent-600"
              onClick={(e) => {
                e.stopPropagation();
                setFeeRoom(row.original);
              }}
            >
              <Settings2 className="h-3.5 w-3.5" /> Fee settings
            </button>
            {row.original.beds.map((bed) => (
              <div
                key={bed.id}
                className="flex min-w-40 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2"
              >
                <BedDouble className="h-4 w-4 shrink-0 text-primary" />
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-ink">Bed {bed.label}</p>
                  {bed.residentName ? (
                    <button
                      className="max-w-36 truncate text-xs text-accent-600 hover:underline"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/residents/${bed.residentId}`);
                      }}
                    >
                      {bed.residentName}
                    </button>
                  ) : (
                    <StatusBadge status={bed.status} />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      />

      <AddRoomDialog
        isOpen={addOpen}
        onClose={() => {
          setAddOpen(false);
          clearAddParam();
        }}
      />
      <BulkAddDialog isOpen={bulkOpen} onClose={() => setBulkOpen(false)} />
      <RoomTransferDialog isOpen={transferOpen} onClose={() => setTransferOpen(false)} />
      <EditRoomDialog room={editRoom} onClose={() => setEditRoom(null)} />
      <RoomFeeDialog room={feeRoom} onClose={() => setFeeRoom(null)} />
    </div>
  );
}
