import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Lock } from "lucide-react";
import { getAdmissionFormConfig, updateAdmissionFormConfig } from "@/api/settings.api";
import type { AdmissionFormField } from "@/api/types";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/cn";

export function AdmissionFormConfigPage() {
  const { toast } = useToast();
  const [fields, setFields] = useState<AdmissionFormField[] | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admission-form"],
    queryFn: getAdmissionFormConfig,
  });

  useEffect(() => {
    if (data) setFields(data.fields);
  }, [data]);

  const mutation = useMutation({
    mutationFn: () => updateAdmissionFormConfig({ fields: fields! }),
    onSuccess: () => toast({ title: "Admission form saved", variant: "success" }),
  });

  const update = (key: string, patch: Partial<AdmissionFormField>) => {
    setFields((prev) =>
      prev ? prev.map((f) => (f.key === key ? { ...f, ...patch } : f)) : prev,
    );
  };

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Admission form"
        subtitle="Choose which fields appear when adding a resident"
      />

      {isLoading || !fields ? (
        <Skeleton className="h-96" />
      ) : (
        <Card>
          <CardHeader
            title="Form fields"
            subtitle="Name and phone are always required and cannot be turned off"
          />
          <div className="overflow-x-auto">
            <table className="w-full min-w-max text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-left text-xs text-slate-600">
                  <th className="h-9 px-4 font-semibold">Field</th>
                  <th className="px-4 font-semibold">Show on form</th>
                  <th className="px-4 font-semibold">Required</th>
                </tr>
              </thead>
              <tbody>
                {fields.map((f) => {
                  const locked = f.key === "name" || f.key === "phone";
                  return (
                    <tr key={f.key} className="h-11 border-b border-slate-100 last:border-0">
                      <td className={cn("px-4 font-medium", !f.enabled && "text-slate-400")}>
                        <span className="flex items-center gap-1.5">
                          {f.label}
                          {locked && <Lock className="h-3 w-3 text-slate-400" />}
                          {!f.builtIn && (
                            <span className="rounded bg-slate-100 px-1 text-[10px] text-muted">custom</span>
                          )}
                        </span>
                      </td>
                      <td className="px-4">
                        <input
                          type="checkbox"
                          className="accent-accent"
                          checked={f.enabled}
                          disabled={locked}
                          onChange={(e) =>
                            update(f.key, {
                              enabled: e.target.checked,
                              required: e.target.checked ? f.required : false,
                            })
                          }
                        />
                      </td>
                      <td className="px-4">
                        <input
                          type="checkbox"
                          className="accent-accent"
                          checked={f.required}
                          disabled={locked || !f.enabled}
                          onChange={(e) => update(f.key, { required: e.target.checked })}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <CardBody className="flex justify-end border-t border-slate-100">
            <Button onClick={() => mutation.mutate()} isLoading={mutation.isPending}>
              Save form
            </Button>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
