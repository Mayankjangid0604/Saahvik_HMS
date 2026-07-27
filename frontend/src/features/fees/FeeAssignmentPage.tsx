import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { Layers, Trash2, UserPlus } from "lucide-react";
import {
  assignFee,
  listFeeAssignments,
  listFeeStructures,
  removeFeeAssignment,
} from "@/api/payment.api";
import type { FeeAssignment } from "@/api/types";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { FormField } from "@/components/ui/FormField";
import { DataTable } from "@/components/ui/Table";
import { useToast } from "@/components/ui/Toast";
import { ResidentPicker } from "@/components/shared/ResidentPicker";
import { MoneyDisplay } from "@/components/shared/MoneyDisplay";
import { DateDisplay } from "@/components/shared/DateDisplay";
import { usePagination } from "@/hooks/usePagination";
import { formatMoney } from "@/lib/format";

export function FeeAssignmentPage() {
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { page, pageSize, setPage, setPageSize } = usePagination();

  const [feeId, setFeeId] = useState(searchParams.get("fee") ?? "");
  const [residentId, setResidentId] = useState("");
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));

  const { data: fees } = useQuery({ queryKey: ["fees"], queryFn: listFeeStructures });
  const { data: assignments, isLoading } = useQuery({
    queryKey: ["fee-assignments", { page, pageSize }],
    queryFn: () => listFeeAssignments({ page, pageSize }),
    placeholderData: keepPreviousData,
  });

  const assignMutation = useMutation({
    mutationFn: () => assignFee({ feeStructureId: feeId, residentIds: [residentId], startDate }),
    onSuccess: ({ assigned }) => {
      queryClient.invalidateQueries({ queryKey: ["fee-assignments"] });
      queryClient.invalidateQueries({ queryKey: ["fees"] });
      toast({
        title: assigned > 0 ? "Fee assigned" : "Already assigned",
        variant: assigned > 0 ? "success" : "info",
      });
      setResidentId("");
    },
    onError: (err: Error) => toast({ title: "Assignment failed", description: err.message, variant: "error" }),
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => removeFeeAssignment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fee-assignments"] });
      queryClient.invalidateQueries({ queryKey: ["fees"] });
      toast({ title: "Assignment removed", variant: "success" });
    },
  });

  const columns = useMemo<ColumnDef<FeeAssignment>[]>(
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
      { accessorKey: "feeName", header: "Fee" },
      {
        accessorKey: "amountPaisa",
        header: "Amount",
        cell: ({ getValue }) => <MoneyDisplay paisa={getValue<number>()} />,
      },
      {
        accessorKey: "startDate",
        header: "Since",
        cell: ({ getValue }) => <DateDisplay date={getValue<string>()} />,
      },
      {
        id: "actions",
        header: "",
        enableSorting: false,
        cell: ({ row }) => (
          <button
            onClick={(e) => {
              e.stopPropagation();
              removeMutation.mutate(row.original.id);
            }}
            className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
            aria-label="Remove assignment"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        ),
      },
    ],
    [removeMutation],
  );

  const selectedFee = fees?.find((f) => f.id === feeId);

  return (
    <div>
      <PageHeader
        title="Fee assignments"
        subtitle="Which resident pays which fee"
        actions={
          <Link to="/fees/bulk-assign">
            <Button variant="outline" size="sm">
              <Layers className="h-3.5 w-3.5" /> Bulk assign
            </Button>
          </Link>
        }
      />

      <Card className="mb-4">
        <CardHeader title="Assign a fee" />
        <CardBody>
          <div className="grid gap-3 sm:grid-cols-4">
            <FormField label="Fee structure" required>
              <Select
                value={feeId}
                onChange={(e) => setFeeId(e.target.value)}
                placeholder="Select fee"
                options={(fees ?? []).map((f) => ({
                  value: f.id,
                  label: `${f.name} — ${formatMoney(f.amountPaisa)}`,
                }))}
              />
            </FormField>
            <FormField label="Resident" required>
              <ResidentPicker value={residentId} onChange={setResidentId} />
            </FormField>
            <FormField label="Start date" required>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </FormField>
            <div className="flex items-end">
              <Button
                onClick={() => assignMutation.mutate()}
                isLoading={assignMutation.isPending}
                disabled={!feeId || !residentId}
                className="w-full"
              >
                <UserPlus className="h-3.5 w-3.5" /> Assign
              </Button>
            </div>
          </div>
          {selectedFee && (
            <p className="mt-2 text-xs text-muted">
              {selectedFee.name}: {formatMoney(selectedFee.amountPaisa)} ·{" "}
              {selectedFee.cycle.replace("_", " ")} · currently assigned to {selectedFee.assignedCount}
            </p>
          )}
        </CardBody>
      </Card>

      <DataTable
        columns={columns}
        data={assignments?.data ?? []}
        total={assignments?.total ?? 0}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        isLoading={isLoading}
        emptyTitle="No assignments yet"
        emptyDescription="Assign a fee to a resident using the form above."
      />
    </div>
  );
}
