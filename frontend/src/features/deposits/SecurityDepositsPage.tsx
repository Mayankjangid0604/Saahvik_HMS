import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import type { ColumnDef, SortingState } from "@tanstack/react-table";
import { Search } from "lucide-react";
import { actOnDeposit, listDeposits } from "@/api/payment.api";
import type { DepositActionInput, SecurityDeposit } from "@/api/types";
import { PageHeader } from "@/components/ui/PageHeader";
import { Input, Textarea } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { DataTable } from "@/components/ui/Table";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { useToast } from "@/components/ui/Toast";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { MoneyDisplay } from "@/components/shared/MoneyDisplay";
import { DateDisplay } from "@/components/shared/DateDisplay";
import { useDebounce } from "@/hooks/useDebounce";
import { usePagination } from "@/hooks/usePagination";
import { formatMoney, rupeesToPaisa } from "@/lib/format";

type Action = DepositActionInput["action"];

export function SecurityDepositsPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [sorting, setSorting] = useState<SortingState>([{ id: "collectedOn", desc: true }]);
  const { page, pageSize, setPage, setPageSize } = usePagination();
  const debouncedSearch = useDebounce(search);

  const [target, setTarget] = useState<SecurityDeposit | null>(null);
  const [action, setAction] = useState<Action>("full_refund");
  const [partialRupees, setPartialRupees] = useState("");
  const [reason, setReason] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["deposits", { page, pageSize, debouncedSearch, status, sorting }],
    queryFn: () =>
      listDeposits({
        page,
        pageSize,
        search: debouncedSearch,
        status: status as SecurityDeposit["status"] | "all",
        sortBy: sorting[0]?.id,
        sortDir: sorting[0]?.desc ? "desc" : "asc",
      }),
    placeholderData: keepPreviousData,
  });

  const mutation = useMutation({
    mutationFn: () =>
      actOnDeposit({
        depositId: target!.id,
        action,
        amountPaisa: action === "partial_refund" ? rupeesToPaisa(partialRupees) : undefined,
        reason: reason || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deposits"] });
      toast({ title: "Deposit updated", variant: "success" });
      closeDialog();
    },
    onError: (err: Error) => toast({ title: "Action failed", description: err.message, variant: "error" }),
  });

  const closeDialog = () => {
    setTarget(null);
    setAction("full_refund");
    setPartialRupees("");
    setReason("");
  };

  const columns = useMemo<ColumnDef<SecurityDeposit>[]>(
    () => [
      {
        accessorKey: "residentName",
        header: "Resident",
        cell: ({ row }) => (
          <span>
            <span className="block leading-4 font-medium">{row.original.residentName}</span>
            <span className="block text-[11px] leading-4 text-muted">
              {row.original.roomNumber ?? "Moved out"}
            </span>
          </span>
        ),
      },
      {
        accessorKey: "amountPaisa",
        header: "Deposit",
        cell: ({ getValue }) => <MoneyDisplay paisa={getValue<number>()} className="font-medium" />,
      },
      {
        accessorKey: "refundedPaisa",
        header: "Refunded",
        cell: ({ getValue }) => <MoneyDisplay paisa={getValue<number>()} />,
      },
      {
        accessorKey: "collectedOn",
        header: "Collected",
        cell: ({ getValue }) => <DateDisplay date={getValue<string>()} />,
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ getValue }) => <StatusBadge status={getValue<string>()} />,
      },
      {
        id: "actions",
        header: "",
        enableSorting: false,
        cell: ({ row }) => {
          const d = row.original;
          const settled = d.status === "refunded" || d.status === "forfeited";
          return settled ? (
            <span className="text-xs text-muted">{d.notes ?? "Settled"}</span>
          ) : (
            <Button size="sm" variant="outline" onClick={() => setTarget(d)}>
              Settle…
            </Button>
          );
        },
      },
    ],
    [],
  );

  const remaining = target ? target.amountPaisa - target.refundedPaisa : 0;

  return (
    <div>
      <PageHeader
        title="Security deposits"
        subtitle="Hold, refund (full or partial) or forfeit deposits"
      />

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-64">
          <Search className="absolute top-2.5 left-2.5 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search resident…"
            className="pl-8"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <Select
          className="w-44"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          options={[
            { value: "all", label: "All statuses" },
            { value: "held", label: "Held" },
            { value: "partially_refunded", label: "Partially refunded" },
            { value: "refunded", label: "Refunded" },
            { value: "forfeited", label: "Forfeited" },
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
        emptyTitle="No deposits found"
      />

      <Modal
        isOpen={!!target}
        onClose={closeDialog}
        title={target ? `Settle deposit — ${target.residentName}` : ""}
        size="sm"
      >
        {target && (
          <div className="space-y-3">
            <p className="rounded bg-slate-50 px-3 py-2 text-xs text-muted">
              Deposit {formatMoney(target.amountPaisa)}
              {target.refundedPaisa > 0 && ` · ${formatMoney(target.refundedPaisa)} already refunded`}
              {` · ${formatMoney(remaining)} remaining`}
            </p>
            <FormField label="Action" required>
              <Select
                value={action}
                onChange={(e) => setAction(e.target.value as Action)}
                options={[
                  { value: "full_refund", label: `Full refund (${formatMoney(remaining)})` },
                  { value: "partial_refund", label: "Partial refund…" },
                  { value: "forfeit", label: "Forfeit deposit" },
                ]}
              />
            </FormField>
            {action === "partial_refund" && (
              <FormField label="Refund amount (₹)" required>
                <Input
                  type="number"
                  min={1}
                  value={partialRupees}
                  onChange={(e) => setPartialRupees(e.target.value)}
                  placeholder={String(remaining / 100)}
                />
              </FormField>
            )}
            <FormField label="Reason / note" hint={action === "forfeit" ? "Why is it being forfeited?" : "Optional"}>
              <Textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} />
            </FormField>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={closeDialog}>
                Cancel
              </Button>
              <Button
                variant={action === "forfeit" ? "danger" : "primary"}
                onClick={() => mutation.mutate()}
                isLoading={mutation.isPending}
                disabled={action === "partial_refund" && !partialRupees}
              >
                Confirm
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
