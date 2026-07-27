import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import type { ColumnDef, SortingState } from "@tanstack/react-table";
import { IndianRupee, Phone, Search } from "lucide-react";
import { getDuesSummary, listDues } from "@/api/payment.api";
import type { DueEntry } from "@/api/types";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { DataTable } from "@/components/ui/Table";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { MoneyDisplay } from "@/components/shared/MoneyDisplay";
import { DateDisplay } from "@/components/shared/DateDisplay";
import { useDebounce } from "@/hooks/useDebounce";
import { usePagination } from "@/hooks/usePagination";
import { RecordPaymentDialog } from "@/features/payments/RecordPaymentDialog";
import { formatMoney } from "@/lib/format";

export function DuesPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [sorting, setSorting] = useState<SortingState>([{ id: "duesPaisa", desc: true }]);
  const { page, pageSize, setPage, setPageSize } = usePagination();
  const debouncedSearch = useDebounce(search);
  const [collectFor, setCollectFor] = useState<string | null>(null);

  const { data: summary } = useQuery({ queryKey: ["dues", "summary"], queryFn: getDuesSummary });
  const { data, isLoading } = useQuery({
    queryKey: ["dues", "list", { page, pageSize, debouncedSearch, sorting }],
    queryFn: () =>
      listDues({
        page,
        pageSize,
        search: debouncedSearch,
        sortBy: sorting[0]?.id,
        sortDir: sorting[0]?.desc ? "desc" : "asc",
      }),
    placeholderData: keepPreviousData,
  });

  const columns = useMemo<ColumnDef<DueEntry>[]>(
    () => [
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
        accessorKey: "duesPaisa",
        header: "Outstanding",
        cell: ({ getValue }) => (
          <MoneyDisplay paisa={getValue<number>()} className="font-semibold text-red-600" />
        ),
      },
      {
        accessorKey: "monthsOverdue",
        header: "Months",
        cell: ({ getValue }) => <span className="font-mono">{getValue<number>()}</span>,
      },
      {
        accessorKey: "oldestDueDate",
        header: "Oldest due",
        cell: ({ getValue }) => <DateDisplay date={getValue<string>()} />,
      },
      {
        accessorKey: "severity",
        header: "Severity",
        cell: ({ getValue }) => <StatusBadge status={getValue<string>()} />,
      },
      {
        id: "actions",
        header: "",
        enableSorting: false,
        cell: ({ row }) => (
          <span className="flex items-center gap-1">
            <a
              href={`tel:${row.original.phone}`}
              onClick={(e) => e.stopPropagation()}
              className="rounded p-1.5 text-muted hover:bg-slate-100 hover:text-ink"
              aria-label={`Call ${row.original.residentName}`}
            >
              <Phone className="h-3.5 w-3.5" />
            </a>
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                setCollectFor(row.original.residentId);
              }}
            >
              <IndianRupee className="h-3 w-3" /> Collect
            </Button>
          </span>
        ),
      },
    ],
    [],
  );

  return (
    <div>
      <PageHeader title="Outstanding dues" subtitle="Sorted by amount — worst first" />

      {summary && (
        <div className="mb-4 grid grid-cols-3 gap-3">
          <Card className="px-4 py-3">
            <p className="text-[11px] font-medium text-muted uppercase">Total outstanding</p>
            <p className="mt-1 font-mono text-lg font-semibold text-red-600">
              {formatMoney(summary.totalDuesPaisa)}
            </p>
          </Card>
          <Card className="px-4 py-3">
            <p className="text-[11px] font-medium text-muted uppercase">Residents with dues</p>
            <p className="mt-1 font-mono text-lg font-semibold text-primary">{summary.residentsWithDues}</p>
          </Card>
          <Card className="px-4 py-3">
            <p className="text-[11px] font-medium text-muted uppercase">High severity (3+ months)</p>
            <p className="mt-1 font-mono text-lg font-semibold text-red-600">{summary.highSeverityCount}</p>
          </Card>
        </div>
      )}

      <div className="relative mb-3 w-full sm:w-64">
        <Search className="absolute top-2.5 left-2.5 h-4 w-4 text-slate-400" />
        <Input
          placeholder="Search resident or room…"
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
        onRowClick={(d) => navigate(`/residents/${d.residentId}`)}
        emptyTitle="No outstanding dues"
        emptyDescription="Everyone is paid up. Well done!"
      />

      <RecordPaymentDialog
        isOpen={!!collectFor}
        onClose={() => setCollectFor(null)}
        presetResidentId={collectFor ?? undefined}
      />
    </div>
  );
}
