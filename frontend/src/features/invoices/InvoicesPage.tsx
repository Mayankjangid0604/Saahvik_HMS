import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import type { ColumnDef, SortingState } from "@tanstack/react-table";
import { Search } from "lucide-react";
import { listInvoices } from "@/api/payment.api";
import type { Invoice } from "@/api/types";
import { PageHeader } from "@/components/ui/PageHeader";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { DataTable } from "@/components/ui/Table";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { MoneyDisplay } from "@/components/shared/MoneyDisplay";
import { DateDisplay } from "@/components/shared/DateDisplay";
import { useDebounce } from "@/hooks/useDebounce";
import { usePagination } from "@/hooks/usePagination";

export function InvoicesPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [sorting, setSorting] = useState<SortingState>([{ id: "issueDate", desc: true }]);
  const { page, pageSize, setPage, setPageSize } = usePagination();
  const debouncedSearch = useDebounce(search);

  const { data, isLoading } = useQuery({
    queryKey: ["invoices", "list", { page, pageSize, debouncedSearch, status, sorting }],
    queryFn: () =>
      listInvoices({
        page,
        pageSize,
        search: debouncedSearch,
        status: status as Invoice["status"] | "all",
        sortBy: sorting[0]?.id,
        sortDir: sorting[0]?.desc ? "desc" : "asc",
      }),
    placeholderData: keepPreviousData,
  });

  const columns = useMemo<ColumnDef<Invoice>[]>(
    () => [
      {
        accessorKey: "number",
        header: "Invoice",
        cell: ({ getValue }) => (
          <span className="font-mono text-xs font-medium text-primary">{getValue<string>()}</span>
        ),
      },
      {
        accessorKey: "residentName",
        header: "Resident",
        cell: ({ row }) => (
          <span>
            <span className="block leading-4 font-medium">{row.original.residentName}</span>
            <span className="block text-[11px] leading-4 text-muted">{row.original.roomNumber}</span>
          </span>
        ),
      },
      {
        accessorKey: "totalPaisa",
        header: "Amount",
        cell: ({ getValue }) => <MoneyDisplay paisa={getValue<number>()} className="font-medium" />,
      },
      {
        accessorKey: "issueDate",
        header: "Issued",
        cell: ({ getValue }) => <DateDisplay date={getValue<string>()} />,
      },
      {
        accessorKey: "dueDate",
        header: "Due",
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
        title="Invoices"
        subtitle="Auto-numbered monthly invoices (INV-YYYY-seq)"
      />

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-64">
          <Search className="absolute top-2.5 left-2.5 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search invoice no. or resident…"
            className="pl-8"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <Select
          className="w-40"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          options={[
            { value: "all", label: "All statuses" },
            { value: "paid", label: "Paid" },
            { value: "unpaid", label: "Unpaid" },
            { value: "overdue", label: "Overdue" },
            { value: "partially_paid", label: "Partially paid" },
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
        onRowClick={(inv) => navigate(`/invoices/${inv.id}`)}
        emptyTitle="No invoices found"
      />
    </div>
  );
}
