import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import type { ColumnDef, SortingState } from "@tanstack/react-table";
import { ArrowLeftRight, BedDouble, Layers, Plus, Search } from "lucide-react";
import { listRooms } from "@/api/hostel.api";
import type { Room } from "@/api/types";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { DataTable } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { MoneyDisplay } from "@/components/shared/MoneyDisplay";
import { useDebounce } from "@/hooks/useDebounce";
import { usePagination } from "@/hooks/usePagination";
import { AddRoomDialog } from "./AddRoomDialog";
import { BulkAddDialog } from "./BulkAddDialog";
import { RoomTransferDialog } from "./RoomTransferDialog";

export function RoomsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [floor, setFloor] = useState("");
  const [type, setType] = useState("all");
  const [sorting, setSorting] = useState<SortingState>([{ id: "number", desc: false }]);
  const { page, pageSize, setPage, setPageSize } = usePagination(20);
  const debouncedSearch = useDebounce(search);

  const [addOpen, setAddOpen] = useState(searchParams.get("add") === "1");
  const [bulkOpen, setBulkOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);

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
        cell: ({ getValue }) => <span className="capitalize">{getValue<string>()}</span>,
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
        header: "Rent / bed",
        cell: ({ getValue }) => <MoneyDisplay paisa={getValue<number>()} />,
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
          options={[1, 2, 3, 4].map((f) => ({ value: String(f), label: `Floor ${f}` }))}
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
            { value: "single", label: "Single" },
            { value: "double", label: "Double" },
            { value: "triple", label: "Triple" },
            { value: "dorm", label: "Dorm" },
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
          <div className="flex flex-wrap gap-2">
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
    </div>
  );
}
