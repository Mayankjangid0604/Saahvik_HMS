import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import type { ColumnDef, SortingState } from "@tanstack/react-table";
import { IndianRupee, Search } from "lucide-react";
import { listPayments } from "@/api/payment.api";
import type { Payment } from "@/api/types";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { DataTable } from "@/components/ui/Table";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { MoneyDisplay } from "@/components/shared/MoneyDisplay";
import { DateDisplay } from "@/components/shared/DateDisplay";
import { useDebounce } from "@/hooks/useDebounce";
import { usePagination } from "@/hooks/usePagination";
import { RecordPaymentDialog } from "./RecordPaymentDialog";

export function PaymentsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const [method, setMethod] = useState("all");
  const [type, setType] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [sorting, setSorting] = useState<SortingState>([{ id: "paidAt", desc: true }]);
  const { page, pageSize, setPage, setPageSize } = usePagination();
  const debouncedSearch = useDebounce(search);
  const [recordOpen, setRecordOpen] = useState(searchParams.get("record") === "1");

  const { data, isLoading } = useQuery({
    queryKey: ["payments", "list", { page, pageSize, debouncedSearch, method, type, from, to, sorting }],
    queryFn: () =>
      listPayments({
        page,
        pageSize,
        search: debouncedSearch,
        method: method as Payment["method"] | "all",
        type: type as Payment["type"] | "all",
        from: from || undefined,
        to: to || undefined,
        sortBy: sorting[0]?.id,
        sortDir: sorting[0]?.desc ? "desc" : "asc",
      }),
    placeholderData: keepPreviousData,
  });

  const columns = useMemo<ColumnDef<Payment>[]>(
    () => [
      {
        accessorKey: "receiptNo",
        header: "Receipt",
        cell: ({ getValue }) => <span className="font-mono text-xs font-medium text-primary">{getValue<string>()}</span>,
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
        accessorKey: "amountPaisa",
        header: "Amount",
        cell: ({ getValue }) => <MoneyDisplay paisa={getValue<number>()} className="font-medium" />,
      },
      {
        accessorKey: "type",
        header: "Type",
        cell: ({ getValue }) => <span className="capitalize">{getValue<string>()}</span>,
      },
      {
        accessorKey: "method",
        header: "Mode",
        cell: ({ getValue }) => <span className="capitalize">{getValue<string>().replace("_", " ")}</span>,
      },
      {
        accessorKey: "paidAt",
        header: "Date",
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
        title="Payments"
        subtitle={data ? `${data.total} payments` : undefined}
        actions={
          <Button size="sm" onClick={() => setRecordOpen(true)}>
            <IndianRupee className="h-3.5 w-3.5" /> Record payment
          </Button>
        }
      />

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-56">
          <Search className="absolute top-2.5 left-2.5 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search receipt, resident…"
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
          value={type}
          onChange={(e) => {
            setType(e.target.value);
            setPage(1);
          }}
          options={[
            { value: "all", label: "All types" },
            { value: "rent", label: "Rent" },
            { value: "deposit", label: "Deposit" },
            { value: "fine", label: "Fine" },
            { value: "other", label: "Other" },
          ]}
        />
        <Select
          className="w-36"
          value={method}
          onChange={(e) => {
            setMethod(e.target.value);
            setPage(1);
          }}
          options={[
            { value: "all", label: "All modes" },
            { value: "upi", label: "UPI" },
            { value: "cash", label: "Cash" },
            { value: "bank_transfer", label: "Bank transfer" },
            { value: "card", label: "Card" },
            { value: "cheque", label: "Cheque" },
          ]}
        />
        <Input
          type="date"
          className="w-36"
          value={from}
          onChange={(e) => {
            setFrom(e.target.value);
            setPage(1);
          }}
          aria-label="From date"
        />
        <span className="text-xs text-muted">to</span>
        <Input
          type="date"
          className="w-36"
          value={to}
          onChange={(e) => {
            setTo(e.target.value);
            setPage(1);
          }}
          aria-label="To date"
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
        onRowClick={(p) => navigate(`/payments/${p.id}`)}
        emptyTitle="No payments found"
        emptyDescription="Record your first payment to see it here."
      />

      <RecordPaymentDialog
        isOpen={recordOpen}
        onClose={() => {
          setRecordOpen(false);
          if (searchParams.get("record")) {
            searchParams.delete("record");
            setSearchParams(searchParams, { replace: true });
          }
        }}
      />
    </div>
  );
}
