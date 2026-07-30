import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import type { ColumnDef, SortingState } from "@tanstack/react-table";
import { Lock, Receipt, Search } from "lucide-react";
import { listExpenseCategories, listExpenses } from "@/api/expense.api";
import type { Expense } from "@/api/types";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Card } from "@/components/ui/Card";
import { DataTable } from "@/components/ui/Table";
import { EmptyState } from "@/components/ui/EmptyState";
import { MoneyDisplay } from "@/components/shared/MoneyDisplay";
import { DateDisplay } from "@/components/shared/DateDisplay";
import { useDebounce } from "@/hooks/useDebounce";
import { usePagination } from "@/hooks/usePagination";
import { useAuth } from "@/features/auth/AuthContext";
import { hasPermission } from "@/features/staff/permissions";
import { AddExpenseDialog } from "./AddExpenseDialog";

export function ExpensesPage() {
  const { user } = useAuth();
  const canManage = hasPermission(user, "manageExpenses");

  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("all");
  const [method, setMethod] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [sorting, setSorting] = useState<SortingState>([{ id: "spentAt", desc: true }]);
  const { page, pageSize, setPage, setPageSize } = usePagination();
  const debouncedSearch = useDebounce(search);
  const [addOpen, setAddOpen] = useState(searchParams.get("add") === "1");

  const { data: categories = [] } = useQuery({
    queryKey: ["expense-categories"],
    queryFn: listExpenseCategories,
    enabled: canManage,
  });

  const { data, isLoading } = useQuery({
    queryKey: ["expenses", "list", { page, pageSize, debouncedSearch, categoryId, method, from, to, sorting }],
    queryFn: () =>
      listExpenses({
        page,
        pageSize,
        search: debouncedSearch,
        categoryId: categoryId as Expense["categoryId"] | "all",
        method: method as Expense["method"] | "all",
        from: from || undefined,
        to: to || undefined,
        sortBy: sorting[0]?.id,
        sortDir: sorting[0]?.desc ? "desc" : "asc",
      }),
    placeholderData: keepPreviousData,
    enabled: canManage,
  });

  const columns = useMemo<ColumnDef<Expense>[]>(
    () => [
      {
        accessorKey: "label",
        header: "Expense",
        cell: ({ row }) => (
          <span>
            <span className="block leading-4 font-medium">{row.original.label}</span>
            {row.original.notes && (
              <span className="block max-w-xs truncate text-[11px] leading-4 text-muted">
                {row.original.notes}
              </span>
            )}
          </span>
        ),
      },
      { accessorKey: "categoryName", header: "Category" },
      {
        accessorKey: "amountPaisa",
        header: "Amount",
        cell: ({ getValue }) => <MoneyDisplay paisa={getValue<number>()} className="font-medium" />,
      },
      {
        accessorKey: "method",
        header: "Mode",
        cell: ({ getValue }) => <span className="capitalize">{getValue<string>().replace("_", " ")}</span>,
      },
      {
        accessorKey: "spentAt",
        header: "Date",
        cell: ({ getValue }) => <DateDisplay date={getValue<string>()} />,
      },
      { accessorKey: "recordedByName", header: "Recorded by" },
    ],
    [],
  );

  if (!canManage) {
    return (
      <div>
        <PageHeader title="Expenses" />
        <Card>
          <EmptyState
            icon={<Lock className="h-10 w-10" />}
            title="You don't have access to expenses"
            description="Ask an owner to grant you the “Manage expenses” permission."
          />
        </Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Expenses"
        subtitle={data ? `${data.total} expenses` : undefined}
        actions={
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <Receipt className="h-3.5 w-3.5" /> Add expense
          </Button>
        }
      />

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-56">
          <Search className="absolute top-2.5 left-2.5 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search label, notes…"
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
          value={categoryId}
          onChange={(e) => {
            setCategoryId(e.target.value);
            setPage(1);
          }}
        >
          <option value="all">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
        <Select
          className="w-36"
          value={method}
          onChange={(e) => {
            setMethod(e.target.value);
            setPage(1);
          }}
          options={[
            { value: "all", label: "All modes" },
            { value: "cash", label: "Cash" },
            { value: "upi", label: "UPI" },
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
        emptyTitle="No expenses found"
        emptyDescription="Record your first expense to see it here."
      />

      <AddExpenseDialog
        isOpen={addOpen}
        onClose={() => {
          setAddOpen(false);
          if (searchParams.get("add")) {
            searchParams.delete("add");
            setSearchParams(searchParams, { replace: true });
          }
        }}
      />
    </div>
  );
}
