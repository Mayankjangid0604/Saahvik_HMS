import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, Plus, RotateCcw, Trash2 } from "lucide-react";
import {
  getAdmissionFormConfig,
  resetAdmissionFormConfig,
  updateAdmissionFormConfig,
} from "@/api/settings.api";
import type { AdmissionFieldType, AdmissionFormField } from "@/api/types";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { FormField } from "@/components/ui/FormField";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";

const typeLabels: Record<AdmissionFieldType, string> = {
  text: "Text",
  number: "Number",
  date: "Date",
  phone: "Phone",
  select: "Dropdown",
  textarea: "Text area",
  file: "File upload",
  auto: "Auto-generated",
};

const customTypeOptions = [
  { value: "text", label: "Text" },
  { value: "number", label: "Number" },
  { value: "date", label: "Date" },
  { value: "select", label: "Dropdown" },
];

function slugify(label: string): string {
  const base = label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
  return `custom_${base || "field"}_${Date.now().toString(36)}`;
}

export function AdmissionFormConfigPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [fields, setFields] = useState<AdmissionFormField[] | null>(null);
  const [dirty, setDirty] = useState(false);

  // Add-field mini form
  const [adding, setAdding] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newType, setNewType] = useState<AdmissionFieldType>("text");
  const [newOptions, setNewOptions] = useState("");
  const [newRequired, setNewRequired] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admission-form"],
    queryFn: getAdmissionFormConfig,
  });

  useEffect(() => {
    if (data && !dirty) setFields(data.fields);
  }, [data, dirty]);

  const saveMutation = useMutation({
    mutationFn: () => updateAdmissionFormConfig({ fields: fields! }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admission-form"] });
      setDirty(false);
      toast({ title: "Admission form saved", variant: "success" });
    },
  });

  const resetMutation = useMutation({
    mutationFn: resetAdmissionFormConfig,
    onSuccess: (config) => {
      queryClient.invalidateQueries({ queryKey: ["admission-form"] });
      setFields(config.fields);
      setDirty(false);
      toast({ title: "Restored default fields", variant: "success" });
    },
  });

  const mutate = (fn: (prev: AdmissionFormField[]) => AdmissionFormField[]) => {
    setFields((prev) => (prev ? fn(prev) : prev));
    setDirty(true);
  };

  const move = (index: number, dir: -1 | 1) => {
    mutate((prev) => {
      const next = [...prev];
      const target = index + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const remove = (key: string) => mutate((prev) => prev.filter((f) => f.key !== key));

  const addField = () => {
    if (!newLabel.trim()) {
      setAddError("Enter a label");
      return;
    }
    const options = newOptions
      .split(",")
      .map((o) => o.trim())
      .filter(Boolean);
    if (newType === "select" && options.length < 2) {
      setAddError("Enter at least 2 dropdown options, comma-separated");
      return;
    }
    mutate((prev) => [
      ...prev,
      {
        key: slugify(newLabel),
        label: newLabel.trim(),
        type: newType,
        required: newRequired,
        isDefault: false,
        options: newType === "select" ? options : undefined,
      },
    ]);
    setNewLabel("");
    setNewType("text");
    setNewOptions("");
    setNewRequired(false);
    setAddError(null);
    setAdding(false);
  };

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Admission form"
        subtitle="These fields make up the resident admission form, in this order"
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => resetMutation.mutate()}
              isLoading={resetMutation.isPending}
            >
              <RotateCcw className="h-3.5 w-3.5" /> Restore defaults
            </Button>
            <Button
              size="sm"
              onClick={() => saveMutation.mutate()}
              isLoading={saveMutation.isPending}
              disabled={!dirty || !fields}
            >
              Save form
            </Button>
          </>
        }
      />

      {isLoading || !fields ? (
        <Skeleton className="h-96" />
      ) : (
        <>
          <Card>
            <CardHeader
              title={`Form fields (${fields.length})`}
              subtitle="Default fields come from the Sunrise Hostel paper form; any field can be removed"
            />
            <ul>
              {fields.map((f, i) => (
                <li
                  key={f.key}
                  className="flex h-11 items-center gap-2 border-b border-slate-100 px-3 last:border-0"
                >
                  <div className="flex flex-col">
                    <button
                      onClick={() => move(i, -1)}
                      disabled={i === 0}
                      className="rounded p-0.5 text-slate-300 hover:text-ink disabled:opacity-30"
                      aria-label={`Move ${f.label} up`}
                    >
                      <ArrowUp className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => move(i, 1)}
                      disabled={i === fields.length - 1}
                      className="rounded p-0.5 text-slate-300 hover:text-ink disabled:opacity-30"
                      aria-label={`Move ${f.label} down`}
                    >
                      <ArrowDown className="h-3 w-3" />
                    </button>
                  </div>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink">
                    {f.label}
                    {f.options && (
                      <span className="ml-1.5 text-xs font-normal text-muted">
                        ({f.options.join(" / ")})
                      </span>
                    )}
                  </span>
                  <Badge tone="slate">{typeLabels[f.type]}</Badge>
                  {f.required && <Badge tone="amber">Required</Badge>}
                  {!f.isDefault && <Badge tone="gold">Custom</Badge>}
                  <button
                    onClick={() => remove(f.key)}
                    className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                    aria-label={`Remove ${f.label}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
              {fields.length === 0 && (
                <li className="px-4 py-6 text-center text-xs text-muted">
                  No fields — add some below or restore defaults.
                </li>
              )}
            </ul>
          </Card>

          <Card className="mt-3">
            <CardHeader title="Custom fields" subtitle="Add your own fields to the admission form" />
            <CardBody>
              {adding ? (
                <div className="space-y-3 rounded-md border border-slate-200 p-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <FormField label="Label" required error={addError ?? undefined}>
                      <Input
                        placeholder="Blood group"
                        value={newLabel}
                        onChange={(e) => setNewLabel(e.target.value)}
                        error={!!addError}
                      />
                    </FormField>
                    <FormField label="Field type" required>
                      <Select
                        value={newType}
                        onChange={(e) => setNewType(e.target.value as AdmissionFieldType)}
                        options={customTypeOptions}
                      />
                    </FormField>
                  </div>
                  {newType === "select" && (
                    <FormField label="Dropdown options" hint="Comma-separated, e.g. A+, B+, O+" required>
                      <Input
                        placeholder="A+, A-, B+, B-, O+, O-, AB+, AB-"
                        value={newOptions}
                        onChange={(e) => setNewOptions(e.target.value)}
                      />
                    </FormField>
                  )}
                  <label className="flex cursor-pointer items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      className="accent-accent"
                      checked={newRequired}
                      onChange={(e) => setNewRequired(e.target.checked)}
                    />
                    Required field
                  </label>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={() => setAdding(false)}>
                      Cancel
                    </Button>
                    <Button size="sm" onClick={addField}>
                      Add field
                    </Button>
                  </div>
                </div>
              ) : (
                <Button variant="outline" size="sm" onClick={() => setAdding(true)}>
                  <Plus className="h-3.5 w-3.5" /> Add Field
                </Button>
              )}
              <p className="mt-3 text-xs text-muted">
                Custom fields appear at the bottom of the admission form. Remember to hit "Save
                form" after making changes.
              </p>
            </CardBody>
          </Card>
        </>
      )}
    </div>
  );
}
