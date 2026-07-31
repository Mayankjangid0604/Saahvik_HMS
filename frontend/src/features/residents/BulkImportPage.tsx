import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { CheckCircle2, Download, FileUp } from "lucide-react";
import { importResidents } from "@/api/resident.api";
import { getAdmissionFormConfig } from "@/api/settings.api";
import type { BulkImportResult, BulkImportRow, AdmissionFormField } from "@/api/types";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { FileUpload, type UploadedFile } from "@/components/shared/FileUpload";

const CORE_COLUMNS = ["name", "phone", "roomNumber", "bedLabel", "monthlyFeeRupees", "joinDate"];

function getExtraFields(fields: AdmissionFormField[]): AdmissionFormField[] {
  return fields.filter(
    (f) => f.type !== "file" && f.type !== "auto" && !["candidateName", "contactNo"].includes(f.key),
  );
}

function buildTemplate(extraFields: AdmissionFormField[]): string {
  const headers = [...CORE_COLUMNS, ...extraFields.map((f) => f.key)];
  const example = [
    "Suresh Kumar",
    "9812340001",
    "Room 104",
    "A",
    "8000",
    "2026-07-01",
    ...extraFields.map(() => ""),
  ];
  return [headers.join(","), example.join(",")].join("\n");
}

function parseCsv(
  text: string,
  extraFields: AdmissionFormField[],
): { rows: BulkImportRow[]; parseErrors: string[] } {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  const parseErrors: string[] = [];
  if (lines.length < 2) return { rows: [], parseErrors: ["File has no data rows"] };

  const header = lines[0].split(",").map((h) => h.trim());
  const required = ["name", "phone"];
  const missing = required.filter((e) => !header.includes(e));
  if (missing.length) parseErrors.push(`Missing required columns: ${missing.join(", ")}`);

  const idx = (k: string) => header.indexOf(k);
  const extraKeys = extraFields.map((f) => f.key);
  const detectedExtras = extraKeys.filter((k) => header.includes(k));

  const rows: BulkImportRow[] = lines.slice(1).map((line) => {
    const cols = line.split(",").map((c) => c.trim());
    const admissionData: Record<string, string> = {};
    for (const key of detectedExtras) {
      const val = cols[idx(key)];
      if (val) admissionData[key] = val;
    }
    return {
      name: cols[idx("name")] ?? "",
      phone: cols[idx("phone")] ?? "",
      roomNumber: cols[idx("roomNumber")] ?? "",
      bedLabel: cols[idx("bedLabel")] ?? "",
      monthlyFeeRupees: Number(cols[idx("monthlyFeeRupees")] ?? 0),
      joinDate: cols[idx("joinDate")] ?? "",
      ...(Object.keys(admissionData).length > 0 ? { admissionData } : {}),
    };
  });
  return { rows, parseErrors };
}

export function BulkImportPage() {
  const { toast } = useToast();
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [preview, setPreview] = useState<BulkImportRow[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [result, setResult] = useState<BulkImportResult | null>(null);

  const { data: formConfig } = useQuery({
    queryKey: ["admission-form-config"],
    queryFn: getAdmissionFormConfig,
  });
  const extraFields = getExtraFields(formConfig?.fields ?? []);

  const handleFiles = async (next: UploadedFile[]) => {
    setFiles(next);
    setResult(null);
    if (next.length === 0) {
      setPreview([]);
      setParseErrors([]);
      return;
    }
    const text = await next[0].file.text();
    const { rows, parseErrors: errs } = parseCsv(text, extraFields);
    setPreview(rows);
    setParseErrors(errs);
  };

  const mutation = useMutation({
    mutationFn: () => importResidents(preview),
    onSuccess: (res) => {
      setResult(res);
      toast({
        title: `${res.imported} residents imported`,
        description: res.errors.length ? `${res.errors.length} rows had problems` : undefined,
        variant: res.errors.length ? "info" : "success",
      });
    },
    onError: (err: Error) => toast({ title: "Import failed", description: err.message, variant: "error" }),
  });

  const downloadTemplate = () => {
    const csv = buildTemplate(extraFields);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "saahvik-residents-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const extraColumnsInPreview = extraFields.filter((f) =>
    preview.some((r) => r.admissionData?.[f.key]),
  );

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Bulk import residents"
        subtitle="Upload a CSV to add many residents at once"
        actions={
          <Button variant="outline" size="sm" onClick={downloadTemplate}>
            <Download className="h-3.5 w-3.5" /> Download template
          </Button>
        }
      />

      <Card>
        <CardHeader
          title="1 — Upload CSV"
          subtitle={
            extraFields.length > 0
              ? `Core columns: name, phone, roomNumber, bedLabel, monthlyFeeRupees, joinDate. Extra: ${extraFields.map((f) => f.key).join(", ")}`
              : "Columns: name, phone, roomNumber, bedLabel, monthlyFeeRupees, joinDate"
          }
        />
        <CardBody>
          <FileUpload label="Upload CSV file" accept=".csv" value={files} onChange={handleFiles} />
          {parseErrors.length > 0 && (
            <ul className="mt-2 space-y-1">
              {parseErrors.map((e, i) => (
                <li key={i} className="text-xs text-red-600">
                  {e}
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>

      {preview.length > 0 && (
        <Card className="mt-3">
          <CardHeader title={`2 — Preview (${preview.length} rows)`} />
          <div className="overflow-x-auto">
            <table className="w-full min-w-max text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-left text-xs text-slate-600">
                  <th className="h-9 px-4">Name</th>
                  <th className="px-4">Phone</th>
                  <th className="px-4">Room</th>
                  <th className="px-4">Bed</th>
                  <th className="px-4">Fee (&#x20B9;)</th>
                  <th className="px-4">Join date</th>
                  {extraColumnsInPreview.map((f) => (
                    <th key={f.key} className="px-4">{f.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.slice(0, 10).map((r, i) => (
                  <tr key={i} className="h-11 border-b border-slate-100 last:border-0">
                    <td className="px-4 font-medium">{r.name}</td>
                    <td className="px-4">{r.phone}</td>
                    <td className="px-4">{r.roomNumber}</td>
                    <td className="px-4">{r.bedLabel}</td>
                    <td className="px-4 font-mono">{r.monthlyFeeRupees}</td>
                    <td className="px-4">{r.joinDate}</td>
                    {extraColumnsInPreview.map((f) => (
                      <td key={f.key} className="px-4 text-xs">{r.admissionData?.[f.key] ?? ""}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {preview.length > 10 && (
            <p className="px-4 py-2 text-xs text-muted">&hellip;and {preview.length - 10} more rows</p>
          )}
          <div className="flex justify-end border-t border-slate-100 px-4 py-3">
            <Button onClick={() => mutation.mutate()} isLoading={mutation.isPending} disabled={parseErrors.length > 0}>
              <FileUp className="h-3.5 w-3.5" /> Import {preview.length} residents
            </Button>
          </div>
        </Card>
      )}

      {result && (
        <Card className="mt-3">
          <CardHeader
            title={
              <span className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" /> Import complete
              </span>
            }
          />
          <CardBody className="space-y-2 text-sm">
            <p>
              <span className="font-medium text-green-700">{result.imported} imported</span>
              {result.skipped > 0 && <span className="text-muted"> &middot; {result.skipped} skipped (duplicate phone)</span>}
            </p>
            {result.errors.length > 0 && (
              <ul className="space-y-1">
                {result.errors.map((e) => (
                  <li key={e.row} className="text-xs text-red-600">
                    Row {e.row}: {e.message}
                  </li>
                ))}
              </ul>
            )}
            <Link to="/residents" className="inline-block text-xs font-medium text-accent-600 hover:underline">
              View residents &rarr;
            </Link>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
