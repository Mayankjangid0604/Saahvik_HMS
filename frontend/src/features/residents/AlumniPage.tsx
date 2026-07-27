import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import type { ColumnDef, SortingState } from "@tanstack/react-table";
import { Search } from "lucide-react";
import { listAlumni } from "@/api/resident.api";
import type { Resident } from "@/api/types";
import { PageHeader } from "@/components/ui/PageHeader";
import { Input } from "@/components/ui/Input";
import { DataTable } from "@/components/ui/Table";
import { Avatar } from "@/components/ui/Avatar";
import { DateDisplay } from "@/components/shared/DateDisplay";
import { useDebounce } from "@/hooks/useDebounce";
import { usePagination } from "@/hooks/usePagination";

export function AlumniPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [sorting, setSorting] = useState<SortingState>([{ id: "exitDate", desc: true }]);
  const { page, pageSize, setPage, setPageSize } = usePagination();
  const debouncedSearch = useDebounce(search);

  const { data, isLoading } = useQuery({
    queryKey: ["residents", "alumni", { page, pageSize, debouncedSearch, sorting }],
    queryFn: () =>
      listAlumni({
        page,
        pageSize,
        search: debouncedSearch,
        sortBy: sorting[0]?.id,
        sortDir: sorting[0]?.desc ? "desc" : "asc",
      }),
    placeholderData: keepPreviousData,
  });

  const columns = useMemo<ColumnDef<Resident>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Name",
        cell: ({ row }) => (
          <span className="flex items-center gap-2.5">
            <Avatar name={row.original.name} size="sm" />
            <span className="font-medium text-ink">{row.original.name}</span>
          </span>
        ),
      },
      { accessorKey: "phone", header: "Phone" },
      {
        accessorKey: "joinDate",
        header: "Stayed from",
        cell: ({ getValue }) => <DateDisplay date={getValue<string>()} />,
      },
      {
        accessorKey: "exitDate",
        header: "Moved out",
        cell: ({ getValue }) => <DateDisplay date={getValue<string>()} />,
      },
      {
        accessorKey: "institutionOrCompany",
        header: "Reason / note",
        cell: ({ getValue }) => <span className="text-muted">{getValue<string>() ?? "—"}</span>,
      },
    ],
    [],
  );

  return (
    <div>
      <PageHeader title="Alumni" subtitle="Residents who have moved out" />
      <div className="relative mb-3 w-full sm:w-64">
        <Search className="absolute top-2.5 left-2.5 h-4 w-4 text-slate-400" />
        <Input
          placeholder="Search alumni…"
          className="pl-8"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
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
        onRowClick={(r) => navigate(`/residents/${r.id}`)}
        emptyTitle="No alumni yet"
        emptyDescription="Residents appear here after they check out."
      />
    </div>
  );
}
