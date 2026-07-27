import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, FileDown, Undo2 } from "lucide-react";
import { getPayment } from "@/api/payment.api";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { MoneyDisplay } from "@/components/shared/MoneyDisplay";
import { DateDisplay } from "@/components/shared/DateDisplay";
import { PDFViewer } from "@/components/shared/PDFViewer";
import { RefundDialog } from "./RefundDialog";
import { generateReceiptPdf } from "@/lib/pdf";
import { useAuth } from "@/features/auth/AuthContext";

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-100 py-2.5 last:border-0">
      <span className="text-xs text-muted">{label}</span>
      <span className="text-sm text-ink">{value}</span>
    </div>
  );
}

export function PaymentDetailPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { org } = useAuth();
  const [refundOpen, setRefundOpen] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  const { data: payment, isLoading } = useQuery({
    queryKey: ["payments", id],
    queryFn: () => getPayment(id),
  });

  if (isLoading || !payment) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-64 max-w-xl" />
      </div>
    );
  }

  const canRefund = payment.status !== "refunded";

  return (
    <div className="mx-auto max-w-xl">
      <button
        onClick={() => navigate(-1)}
        className="mb-2 flex items-center gap-1 text-xs text-muted hover:text-ink"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back
      </button>
      <PageHeader
        title={payment.receiptNo}
        subtitle="Payment details"
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPdfUrl(generateReceiptPdf(payment, org))}
            >
              <FileDown className="h-3.5 w-3.5" /> Receipt PDF
            </Button>
            {canRefund && (
              <Button variant="outline" size="sm" onClick={() => setRefundOpen(true)}>
                <Undo2 className="h-3.5 w-3.5" /> Refund
              </Button>
            )}
          </>
        }
      />

      <Card>
        <CardHeader
          title={<MoneyDisplay paisa={payment.amountPaisa} className="text-lg" />}
          subtitle={`Paid by ${payment.residentName}`}
          actions={<StatusBadge status={payment.status} />}
        />
        <CardBody className="pt-1">
          <Row
            label="Resident"
            value={
              <button
                className="text-accent-600 hover:underline"
                onClick={() => navigate(`/residents/${payment.residentId}`)}
              >
                {payment.residentName}
              </button>
            }
          />
          <Row label="Room" value={payment.roomNumber ?? "—"} />
          <Row label="Type" value={<span className="capitalize">{payment.type}</span>} />
          {payment.periodMonth && <Row label="For month" value={payment.periodMonth} />}
          <Row label="Mode" value={<span className="capitalize">{payment.method.replace("_", " ")}</span>} />
          <Row label="Paid on" value={<DateDisplay date={payment.paidAt} withTime />} />
          <Row label="Recorded by" value={payment.recordedByName} />
          {payment.refundedPaisa > 0 && (
            <Row
              label="Refunded"
              value={<MoneyDisplay paisa={payment.refundedPaisa} className="text-red-600" />}
            />
          )}
          {payment.notes && <Row label="Notes" value={payment.notes} />}
        </CardBody>
      </Card>

      <RefundDialog isOpen={refundOpen} onClose={() => setRefundOpen(false)} payment={payment} />
      <PDFViewer
        isOpen={!!pdfUrl}
        onClose={() => setPdfUrl(null)}
        blobUrl={pdfUrl}
        fileName={`${payment.receiptNo}.pdf`}
        title={`Receipt ${payment.receiptNo}`}
      />
    </div>
  );
}
