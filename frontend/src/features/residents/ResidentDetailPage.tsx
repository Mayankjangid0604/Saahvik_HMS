import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowLeftRight, IndianRupee, LogOut, Phone } from "lucide-react";
import { getResident } from "@/api/resident.api";
import { checkoutResident } from "@/api/resident.api";
import { listPayments } from "@/api/payment.api";
import { getAdmissionFormConfig } from "@/api/settings.api";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { Skeleton } from "@/components/ui/Skeleton";
import { ConfirmDialog } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { MoneyDisplay } from "@/components/shared/MoneyDisplay";
import { DateDisplay } from "@/components/shared/DateDisplay";
import { RoomTransferDialog } from "@/features/rooms/RoomTransferDialog";
import { RecordPaymentDialog } from "@/features/payments/RecordPaymentDialog";
import { formatMoney } from "@/lib/format";

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] font-medium tracking-wide text-muted uppercase">{label}</p>
      <p className="mt-0.5 text-sm text-ink">{value || "—"}</p>
    </div>
  );
}

export function ResidentDetailPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [transferOpen, setTransferOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  const { data: resident, isLoading } = useQuery({
    queryKey: ["residents", id],
    queryFn: () => getResident(id),
  });

  const { data: formConfig } = useQuery({
    queryKey: ["admission-form"],
    queryFn: getAdmissionFormConfig,
  });

  const { data: payments } = useQuery({
    queryKey: ["payments", "by-resident", id],
    queryFn: () => listPayments({ search: resident?.name, pageSize: 50 }),
    enabled: !!resident,
    select: (res) => res.data.filter((p) => p.residentId === id),
  });

  const checkoutMutation = useMutation({
    mutationFn: () => checkoutResident(id, new Date().toISOString()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["residents"] });
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
      toast({ title: "Resident checked out", description: "Bed is now vacant.", variant: "success" });
      setCheckoutOpen(false);
    },
    onError: (err: Error) => toast({ title: "Checkout failed", description: err.message, variant: "error" }),
  });

  if (isLoading || !resident) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-40" />
        <Skeleton className="h-40" />
      </div>
    );
  }

  const idTypeLabel = resident.idType.replace("_", " ");

  return (
    <div>
      <button
        onClick={() => navigate(-1)}
        className="mb-2 flex items-center gap-1 text-xs text-muted hover:text-ink"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back
      </button>
      <PageHeader
        title={resident.name}
        subtitle={
          resident.roomNumber
            ? `${resident.roomNumber} · Bed ${resident.bedLabel}`
            : "Not assigned to a bed"
        }
        actions={
          resident.status !== "alumni" && (
            <>
              <Button size="sm" onClick={() => setPaymentOpen(true)}>
                <IndianRupee className="h-3.5 w-3.5" /> Record payment
              </Button>
              <Button variant="outline" size="sm" onClick={() => setTransferOpen(true)}>
                <ArrowLeftRight className="h-3.5 w-3.5" /> Transfer
              </Button>
              <Button variant="outline" size="sm" onClick={() => setCheckoutOpen(true)}>
                <LogOut className="h-3.5 w-3.5" /> Check out
              </Button>
            </>
          )
        }
      />

      <div className="grid gap-3 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardBody className="flex flex-col items-center text-center">
            <Avatar name={resident.name} src={resident.photoUrl} size="lg" />
            <p className="mt-2 text-sm font-semibold text-ink">{resident.name}</p>
            <p className="flex items-center gap-1 text-xs text-muted">
              <Phone className="h-3 w-3" /> {resident.phone}
            </p>
            <div className="mt-2">
              <StatusBadge status={resident.status} />
            </div>
            <div className="mt-4 grid w-full grid-cols-2 gap-2 border-t border-slate-100 pt-3">
              <div>
                <p className="text-[11px] text-muted uppercase">Monthly fee</p>
                <MoneyDisplay paisa={resident.monthlyFeePaisa} className="text-sm font-medium" />
              </div>
              <div>
                <p className="text-[11px] text-muted uppercase">Dues</p>
                <MoneyDisplay paisa={resident.duesPaisa} className="text-sm font-medium" colorBySign />
              </div>
              <div>
                <p className="text-[11px] text-muted uppercase">Deposit</p>
                <MoneyDisplay paisa={resident.depositPaisa} className="text-sm font-medium" />
              </div>
              <div>
                <p className="text-[11px] text-muted uppercase">Joined</p>
                <p className="text-sm"><DateDisplay date={resident.joinDate} /></p>
              </div>
            </div>
          </CardBody>
        </Card>

        <div className="space-y-3 lg:col-span-2">
          <Card>
            <CardHeader title="Details" />
            <CardBody className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
              <Detail label="Guardian" value={resident.guardianName} />
              <Detail label="Guardian phone" value={resident.guardianPhone} />
              <Detail label="Occupation" value={<span className="capitalize">{resident.occupation}</span>} />
              <Detail label="College / Company" value={resident.institutionOrCompany} />
              <Detail label="ID" value={<span className="capitalize">{`${idTypeLabel} · ${resident.idNumber}`}</span>} />
              <Detail label="Email" value={resident.email} />
              <Detail label="Address" value={resident.permanentAddress} />
              {resident.exitDate && <Detail label="Exited" value={<DateDisplay date={resident.exitDate} />} />}
              {resident.notes && <Detail label="Notes" value={resident.notes} />}
            </CardBody>
          </Card>

          {resident.admissionData && Object.values(resident.admissionData).some(Boolean) && (
            <Card>
              <CardHeader title="Admission form" subtitle="As filled at admission" />
              <CardBody className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
                {(formConfig?.fields ?? [])
                  .filter((f) => resident.admissionData?.[f.key])
                  .map((f) => (
                    <Detail key={f.key} label={f.label} value={resident.admissionData![f.key]} />
                  ))}
              </CardBody>
            </Card>
          )}

          <Card>
            <CardHeader title="Payment history" subtitle={payments ? `${payments.length} payments` : undefined} />
            {payments && payments.length > 0 ? (
              <ul>
                {payments.slice(0, 8).map((p) => (
                  <li
                    key={p.id}
                    className="flex h-11 cursor-pointer items-center justify-between border-b border-slate-100 px-4 last:border-0 hover:bg-surface/60"
                    onClick={() => navigate(`/payments/${p.id}`)}
                  >
                    <div>
                      <p className="text-sm text-ink">
                        {p.receiptNo}
                        <span className="ml-2 text-xs text-muted capitalize">
                          {p.type} · {p.method.replace("_", " ")}
                        </span>
                      </p>
                      <p className="text-[11px] text-muted">
                        <DateDisplay date={p.paidAt} />
                      </p>
                    </div>
                    <MoneyDisplay paisa={p.amountPaisa} className="text-sm font-medium" />
                  </li>
                ))}
              </ul>
            ) : (
              <CardBody>
                <p className="text-xs text-muted">No payments recorded yet.</p>
              </CardBody>
            )}
          </Card>
        </div>
      </div>

      <RoomTransferDialog
        isOpen={transferOpen}
        onClose={() => {
          setTransferOpen(false);
          queryClient.invalidateQueries({ queryKey: ["residents", id] });
        }}
        presetResidentId={id}
      />
      <RecordPaymentDialog
        isOpen={paymentOpen}
        onClose={() => setPaymentOpen(false)}
        presetResidentId={id}
      />
      <ConfirmDialog
        isOpen={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
        onConfirm={() => checkoutMutation.mutate()}
        isLoading={checkoutMutation.isPending}
        title="Check out resident?"
        message={
          resident.duesPaisa > 0
            ? `${resident.name} still owes ${formatMoney(resident.duesPaisa)}. Their bed will be freed and they move to Alumni.`
            : `${resident.name} will move to Alumni and their bed becomes vacant.`
        }
        confirmLabel="Check out"
        danger
      />
    </div>
  );
}
