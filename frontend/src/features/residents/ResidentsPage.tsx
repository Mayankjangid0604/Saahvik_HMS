import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import type { ColumnDef, SortingState } from "@tanstack/react-table";
import { FileText, Search, Trash2, UserPlus } from "lucide-react";
import { listResidents } from "@/api/resident.api";
import type { Resident } from "@/api/types";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { DataTable } from "@/components/ui/Table";
import { Avatar } from "@/components/ui/Avatar";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { MoneyDisplay } from "@/components/shared/MoneyDisplay";
import { DateDisplay } from "@/components/shared/DateDisplay";
import { useDebounce } from "@/hooks/useDebounce";
import { usePagination } from "@/hooks/usePagination";
import { getDrafts, deleteDraft } from "./draft-store";

function DraftsPanel({ onUpdate }: { onUpdate: () => void }) {
  const navigate = useNavigate();
  const drafts = getDrafts();
  if (drafts.length === 0) return null;

  return (
    <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3">
      <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-amber-800">
        <FileText className="h-3.5 w-3.5" /> Saved drafts ({drafts.length})
      </h3>
      <div className="space-y-1.5">
        {drafts.map((d) => (
          <div key={d.id} className="flex items-center justify-between rounded bg-white px-3 py-1.5 text-sm">
            <button
              className="font-medium text-accent-600 hover:underline"
              onClick={() => navigate(`/residents/new?draft=${d.id}`)}
            >
              {d.name}
            </button>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted">
                {new Date(d.savedAt).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
              <button
                className="text-muted hover:text-red-600"
                onClick={() => {
                  deleteDraft(d.id);
                  onUpdate();
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ResidentsPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("active");
  const [sorting, setSorting] = useState<SortingState>([{ id: "name", desc: false }]);
  const { page, pageSize, setPage, setPageSize } = usePagination();
  const debouncedSearch = useDebounce(search);
  const [draftKey, setDraftKey] = useState(0);

  const { data, isLoading } = useQuery({
    queryKey: ["residents", "list", { page, pageSize, debouncedSearch, status, sorting }],
    queryFn: () =>
      listResidents({
        page,
        pageSize,
        search: debouncedSearch,
        status: status as Resident["status"] | "all",
        sortBy: sorting[0]?.id,
        sortDir: sorting[0]?.desc ? "desc" : "asc",
      }),
    placeholderData: keepPreviousData,
  });

  const columns = useMemo<ColumnDef<Resident>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Resident",
        cell: ({ row }) => (
          <span className="flex items-center gap-2.5">
            <Avatar name={row.original.name} src={row.original.photoUrl} size="sm" />
            <span>
              <span className="block leading-4 font-medium text-ink">{row.original.name}</span>
              <span className="block text-[11px] leading-4 text-muted">{row.original.phone}</span>
            </span>
          </span>
        ),
      },
      {
        accessorKey: "roomNumber",
        header: "Room / Bed",
        cell: ({ row }) =>
          row.original.roomNumber ? (
            <span>
              {row.original.roomNumber}{" "}
              <span className="text-muted">· Bed {row.original.bedLabel}</span>
            </span>
          ) : (
            <span className="text-muted">—</span>
          ),
      },
      {
        accessorKey: "monthlyFeePaisa",
        header: "Monthly fee",
        cell: ({ getValue }) => <MoneyDisplay paisa={getValue<number>()} />,
      },
      {
        accessorKey: "duesPaisa",
        header: "Dues",
        cell: ({ getValue }) => <MoneyDisplay paisa={getValue<number>()} colorBySign />,
      },
      {
        accessorKey: "joinDate",
        header: "Joined",
        cell: ({ getValue }) => <DateDisplay date={getValue<string>()} />,
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ getValue }) => <StatusBadge status={getValue<string>()} />,
      },
    ],
    [],
  );

  return (
    <div>
      <PageHeader
        title="Residents"
        subtitle={data ? `${data.total} residents` : undefined}
        actions={
          <Button size="sm" onClick={() => navigate("/residents/new")}>
            <UserPlus className="h-3.5 w-3.5" /> Add resident
          </Button>
        }
      />

      <DraftsPanel key={draftKey} onUpdate={() => setDraftKey((k) => k + 1)} />

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-64">
          <Search className="absolute top-2.5 left-2.5 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search name, phone, room…"
            className="pl-8"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <Select
          className="w-36"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          options={[
            { value: "active", label: "Active" },
            { value: "all", label: "All statuses" },
            { value: "alumni", label: "Alumni" },
          ]}
        />
        <Link to="/residents/import" className="ml-auto text-xs font-medium text-accent-600 hover:underline">
          Bulk import from CSV →
        </Link>
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
        onRowClick={(r) => navigate(`/residents/${r.id}`)}
        emptyTitle="No residents found"
        emptyDescription="Try a different search, or add your first resident."
      />
    </div>
  );
}
