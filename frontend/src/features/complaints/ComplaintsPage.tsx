import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import type { ColumnDef, SortingState } from "@tanstack/react-table";
import { Plus, Search } from "lucide-react";
import { listComplaints } from "@/api/complaint.api";
import type { Complaint } from "@/api/types";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Tabs } from "@/components/ui/Tabs";
import { DataTable } from "@/components/ui/Table";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { DateDisplay } from "@/components/shared/DateDisplay";
import { useDebounce } from "@/hooks/useDebounce";
import { usePagination } from "@/hooks/usePagination";
import { NewComplaintDialog } from "./NewComplaintDialog";

export function ComplaintsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const [statusTab, setStatusTab] = useState("all");
  const [category, setCategory] = useState("all");
  const [sorting, setSorting] = useState<SortingState>([{ id: "createdAt", desc: true }]);
  const { page, pageSize, setPage, setPageSize } = usePagination();
  const debouncedSearch = useDebounce(search);
  const [newOpen, setNewOpen] = useState(searchParams.get("new") === "1");

  const { data, isLoading } = useQuery({
    queryKey: ["complaints", "list", { page, pageSize, debouncedSearch, statusTab, category, sorting }],
    queryFn: () =>
      listComplaints({
        page,
        pageSize,
        search: debouncedSearch,
        status: statusTab as Complaint["status"] | "all",
        category: category as Complaint["category"] | "all",
        sortBy: sorting[0]?.id,
        sortDir: sorting[0]?.desc ? "desc" : "asc",
      }),
    placeholderData: keepPreviousData,
  });

  const columns = useMemo<ColumnDef<Complaint>[]>(
    () => [
      {
        accessorKey: "ticketNo",
        header: "Ticket",
        cell: ({ getValue }) => (
          <span className="font-mono text-xs font-medium text-primary">{getValue<string>()}</span>
        ),
      },
      {
        accessorKey: "title",
        header: "Complaint",
        cell: ({ row }) => (
          <span className="block max-w-72 truncate font-medium" title={row.original.title}>
            {row.original.title}
          </span>
        ),
      },
      {
        accessorKey: "category",
        header: "Category",
        cell: ({ getValue }) => <span className="capitalize">{getValue<string>()}</span>,
      },
      {
        accessorKey: "roomNumber",
        header: "Room",
        cell: ({ getValue }) => getValue<string>() ?? <span className="text-muted">General</span>,
      },
      {
        accessorKey: "priority",
        header: "Priority",
        cell: ({ getValue }) => <StatusBadge status={getValue<string>()} />,
      },
      {
        accessorKey: "createdAt",
        header: "Raised",
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
        title="Complaints"
        subtitle={data ? `${data.total} tickets` : undefined}
        actions={
          <Button size="sm" onClick={() => setNewOpen(true)}>
            <Plus className="h-3.5 w-3.5" /> New complaint
          </Button>
        }
      />

      <Tabs
        className="mb-3"
        active={statusTab}
        onChange={(k) => {
          setStatusTab(k);
          setPage(1);
        }}
        items={[
          { key: "all", label: "All" },
          { key: "open", label: "Open" },
          { key: "in_progress", label: "In progress" },
          { key: "resolved", label: "Resolved" },
          { key: "closed", label: "Closed" },
        ]}
      />

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-64">
          <Search className="absolute top-2.5 left-2.5 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search title, ticket, resident…"
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
          value={category}
          onChange={(e) => {
            setCategory(e.target.value);
            setPage(1);
          }}
          options={[
            { value: "all", label: "All categories" },
            { value: "electrical", label: "Electrical" },
            { value: "plumbing", label: "Plumbing" },
            { value: "cleaning", label: "Cleaning" },
            { value: "food", label: "Food / Mess" },
            { value: "wifi", label: "WiFi" },
            { value: "furniture", label: "Furniture" },
            { value: "security", label: "Security" },
            { value: "other", label: "Other" },
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
        onRowClick={(c) => navigate(`/complaints/${c.id}`)}
        emptyTitle="No complaints found"
        emptyDescription="That's a good thing!"
      />

      <NewComplaintDialog
        isOpen={newOpen}
        onClose={() => {
          setNewOpen(false);
          if (searchParams.get("new")) {
            searchParams.delete("new");
            setSearchParams(searchParams, { replace: true });
          }
        }}
      />
    </div>
  );
}
