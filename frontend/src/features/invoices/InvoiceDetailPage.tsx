import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, FileDown, IndianRupee } from "lucide-react";
import { getInvoice } from "@/api/payment.api";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { MoneyDisplay } from "@/components/shared/MoneyDisplay";
import { DateDisplay } from "@/components/shared/DateDisplay";
import { PDFViewer } from "@/components/shared/PDFViewer";
import { RecordPaymentDialog } from "@/features/payments/RecordPaymentDialog";
import { generateTableReportPdf, pdfMoney } from "@/lib/pdf";
import { useAuth } from "@/features/auth/AuthContext";

export function InvoiceDetailPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { org } = useAuth();
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [collectOpen, setCollectOpen] = useState(false);

  const { data: invoice, isLoading } = useQuery({
    queryKey: ["invoices", id],
    queryFn: () => getInvoice(id),
  });

  if (isLoading || !invoice) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-64 max-w-xl" />
      </div>
    );
  }

  const balance = invoice.totalPaisa - invoice.paidPaisa;

  const downloadPdf = () => {
    const url = generateTableReportPdf({
      org,
      title: `Invoice ${invoice.number}`,
      subtitle: `Billed to ${invoice.residentName} (${invoice.roomNumber ?? "—"}) · Issued ${new Date(invoice.issueDate).toLocaleDateString("en-IN")} · Due ${new Date(invoice.dueDate).toLocaleDateString("en-IN")}`,
      columns: [
        { label: "Description", width: 130 },
        { label: "Amount", width: 52, align: "right" },
      ],
      rows: invoice.items.map((it) => [it.description, pdfMoney(it.amountPaisa)]),
      summary: `Total: ${pdfMoney(invoice.totalPaisa)}  |  Paid: ${pdfMoney(invoice.paidPaisa)}  |  Balance: ${pdfMoney(balance)}`,
    });
    setPdfUrl(url);
  };

  return (
    <div className="mx-auto max-w-xl">
      <button
        onClick={() => navigate(-1)}
        className="mb-2 flex items-center gap-1 text-xs text-muted hover:text-ink"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back
      </button>
      <PageHeader
        title={invoice.number}
        subtitle={`Billed to ${invoice.residentName}`}
        actions={
          <>
            <Button variant="outline" size="sm" onClick={downloadPdf}>
              <FileDown className="h-3.5 w-3.5" /> Invoice PDF
            </Button>
            {balance > 0 && (
              <Button size="sm" onClick={() => setCollectOpen(true)}>
                <IndianRupee className="h-3.5 w-3.5" /> Collect payment
              </Button>
            )}
          </>
        }
      />

      <Card>
        <CardHeader
          title={<MoneyDisplay paisa={invoice.totalPaisa} className="text-lg" />}
          subtitle={
            <>
              Issued <DateDisplay date={invoice.issueDate} /> · Due <DateDisplay date={invoice.dueDate} />
            </>
          }
          actions={<StatusBadge status={invoice.status} />}
        />
        <CardBody className="pt-1">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs text-muted">
                <th className="py-2 font-medium">Item</th>
                <th className="py-2 text-right font-medium">Amount</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((item, i) => (
                <tr key={i} className="border-b border-slate-100 last:border-0">
                  <td className="py-2.5">{item.description}</td>
                  <td className="py-2.5 text-right">
                    <MoneyDisplay paisa={item.amountPaisa} />
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-slate-200">
                <td className="py-2 font-medium">Total</td>
                <td className="py-2 text-right">
                  <MoneyDisplay paisa={invoice.totalPaisa} className="font-semibold" />
                </td>
              </tr>
              <tr>
                <td className="py-1 text-xs text-muted">Paid</td>
                <td className="py-1 text-right">
                  <MoneyDisplay paisa={invoice.paidPaisa} className="text-sm text-green-700" />
                </td>
              </tr>
              <tr>
                <td className="py-1 text-xs text-muted">Balance</td>
                <td className="py-1 text-right">
                  <MoneyDisplay paisa={balance} className="text-sm" colorBySign />
                </td>
              </tr>
            </tfoot>
          </table>
        </CardBody>
      </Card>

      <PDFViewer
        isOpen={!!pdfUrl}
        onClose={() => setPdfUrl(null)}
        blobUrl={pdfUrl}
        fileName={`${invoice.number}.pdf`}
        title={`Invoice ${invoice.number}`}
      />
      <RecordPaymentDialog
        isOpen={collectOpen}
        onClose={() => setCollectOpen(false)}
        presetResidentId={invoice.residentId}
      />
    </div>
  );
}
