import { useEffect, useMemo, useRef, useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Lock, Save } from "lucide-react";
import { createResident } from "@/api/resident.api";
import { listAllRooms } from "@/api/hostel.api";
import { getAdmissionFormConfig } from "@/api/settings.api";
import type { AdmissionFormField } from "@/api/types";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { FormField } from "@/components/ui/FormField";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { FileUpload, type UploadedFile } from "@/components/shared/FileUpload";
import { RoomPicker } from "@/components/shared/RoomPicker";
import { BedPicker } from "@/components/shared/BedPicker";
import { rupeesToPaisa } from "@/lib/format";

const DRAFT_KEY = "saahvik.draft.add-resident";

type FormValues = Record<string, string>;

/** Zod schema for one configurable admission field. */
function fieldSchema(f: AdmissionFormField): z.ZodType<string> {
  let s: z.ZodType<string> =
    f.required && f.type !== "auto"
      ? z.string().trim().min(1, `${f.label} is required`)
      : z.string().trim();
  if (f.type === "phone") {
    s = s.refine((v) => !v || /^[6-9]\d{9}$/.test(v), "Enter a valid 10-digit mobile number");
  }
  if (f.type === "number") {
    s = s.refine((v) => !v || !Number.isNaN(Number(v)), "Enter a number");
  }
  if (f.validation === "aadhaar") {
    s = s.refine((v) => !v || /^\d{12}$/.test(v.replace(/\s/g, "")), "Aadhar No. must be 12 digits");
  }
  if (f.validation === "pincode") {
    s = s.refine((v) => !v || /^\d{6}$/.test(v), "Pincode must be 6 digits");
  }
  return s;
}

export function AddResidentPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [files, setFiles] = useState<Record<string, UploadedFile[]>>({});
  const initializedRef = useRef(false);

  const { data: config } = useQuery({
    queryKey: ["admission-form"],
    queryFn: getAdmissionFormConfig,
  });
  const { data: allRooms } = useQuery({ queryKey: ["rooms", "all"], queryFn: listAllRooms });

  const admissionFields = useMemo(
    () => (config?.fields ?? []).filter((f) => f.type !== "file"),
    [config],
  );
  const fileFields = useMemo(() => (config?.fields ?? []).filter((f) => f.type === "file"), [config]);

  const schema = useMemo(() => {
    const shape: Record<string, z.ZodType<string>> = {};
    for (const f of admissionFields) shape[f.key] = fieldSchema(f);
    shape.roomId = z.string().min(1, "Room is required");
    shape.bedId = z.string().min(1, "Bed is required");
    shape.monthlyFeeRupees = z.string().refine((v) => Number(v) > 0, "Enter the monthly fee");
    shape.depositRupees = z.string().refine((v) => v === "" || Number(v) >= 0, "Invalid amount");
    return z.object(shape);
  }, [admissionFields]);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    getValues,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    // The schema is built dynamically from config, so its static input type is
    // looser than FormValues — safe because every field parses to a string.
    resolver: zodResolver(schema) as unknown as Resolver<FormValues>,
  });

  // Seed auto-filled values (and restore any saved draft) once config arrives
  useEffect(() => {
    if (!config || initializedRef.current) return;
    initializedRef.current = true;
    const today = new Date().toISOString().slice(0, 10);
    const values: FormValues = { roomId: "", bedId: "", monthlyFeeRupees: "", depositRupees: "10000" };
    for (const f of config.fields) {
      if (f.type === "file") continue;
      values[f.key] =
        f.autoFill === "today"
          ? today
          : f.autoFill === "formNo"
            ? `ADM-${new Date().getFullYear()}-${String(Math.floor(1000 + Math.random() * 9000))}`
            : "";
    }
    const raw = localStorage.getItem(DRAFT_KEY);
    if (raw) {
      try {
        reset({ ...values, ...(JSON.parse(raw) as FormValues) });
        toast({ title: "Draft restored", description: "Continuing your unsaved form.", variant: "info" });
        return;
      } catch {
        localStorage.removeItem(DRAFT_KEY);
      }
    }
    reset(values);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config]);

  const saveDraft = () => {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(getValues()));
    toast({ title: "Draft saved", description: "You can finish this later.", variant: "success" });
  };

  // Fixed-fee rooms lock the fee input (Change 3)
  const roomId = watch("roomId");
  const selectedRoom = (allRooms ?? []).find((r) => r.id === roomId);
  const isFixedFee = selectedRoom?.feeMode === "fixed" && selectedRoom.fixedFeeAmountPaisa != null;
  useEffect(() => {
    if (isFixedFee && selectedRoom?.fixedFeeAmountPaisa != null) {
      setValue("monthlyFeeRupees", String(selectedRoom.fixedFeeAmountPaisa / 100));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, isFixedFee]);

  const mutation = useMutation({
    mutationFn: (v: FormValues) => {
      const today = new Date().toISOString().slice(0, 10);
      const admissionData = Object.fromEntries(
        admissionFields.map((f) => [f.key, v[f.key] ?? ""]),
      );
      return createResident({
        name: v.candidateName || "Unnamed resident",
        phone: v.contactNo || "",
        email: undefined,
        guardianName: v.localGuardianName || v.fatherName || "",
        guardianPhone: v.guardianContactNo || v.fatherContactNo || "",
        permanentAddress: [v.permanentAddress, v.district, v.state, v.pincode]
          .filter(Boolean)
          .join(", "),
        idType: "aadhaar",
        idNumber: v.aadharNo || "",
        occupation: "student",
        institutionOrCompany: v.coachingName || undefined,
        roomId: v.roomId,
        bedId: v.bedId,
        joinDate: v.admissionDate || today,
        monthlyFeePaisa: rupeesToPaisa(v.monthlyFeeRupees),
        depositPaisa: rupeesToPaisa(v.depositRupees || 0),
        photoUrl: files.photo?.[0]?.previewUrl,
        admissionData,
      });
    },
    onSuccess: (resident) => {
      localStorage.removeItem(DRAFT_KEY);
      queryClient.invalidateQueries({ queryKey: ["residents"] });
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
      toast({
        title: `${resident.name} added`,
        description: `${resident.roomNumber} · Bed ${resident.bedLabel}`,
        variant: "success",
      });
      navigate(`/residents/${resident.id}`);
    },
    onError: (err: Error) =>
      toast({ title: "Could not add resident", description: err.message, variant: "error" }),
  });

  if (!config) {
    return (
      <div className="mx-auto max-w-3xl space-y-3">
        <PageHeader title="Add resident" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  const renderField = (f: AdmissionFormField) => {
    const error = errors[f.key]?.message as string | undefined;
    const wide = f.type === "textarea";
    return (
      <FormField
        key={f.key}
        label={f.label}
        error={error}
        required={f.required}
        className={wide ? "sm:col-span-2" : undefined}
        hint={f.type === "auto" ? "Auto-generated" : undefined}
      >
        {f.type === "auto" ? (
          <Input disabled value={watch(f.key) ?? ""} readOnly />
        ) : f.type === "textarea" ? (
          <Textarea rows={2} error={!!error} {...register(f.key)} />
        ) : f.type === "select" ? (
          <Select
            error={!!error}
            placeholder="Select…"
            options={(f.options ?? []).map((o) => ({ value: o, label: o }))}
            {...register(f.key)}
          />
        ) : (
          <Input
            type={f.type === "date" ? "date" : f.type === "number" ? "number" : f.type === "phone" ? "tel" : "text"}
            maxLength={f.type === "phone" ? 10 : f.validation === "pincode" ? 6 : undefined}
            error={!!error}
            {...register(f.key)}
          />
        )}
      </FormField>
    );
  };

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Add resident"
        subtitle="Fields are configured in Settings → Admission Form"
        actions={
          <Button variant="outline" size="sm" onClick={saveDraft}>
            <Save className="h-3.5 w-3.5" /> Save draft
          </Button>
        }
      />

      <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="space-y-4">
        <Card>
          <CardHeader title="Admission details" subtitle="From your admission form configuration" />
          <CardBody className="grid gap-3 sm:grid-cols-2">
            {fileFields.map((f) => (
              <FormField key={f.key} label={f.label} required={f.required}>
                <FileUpload
                  label={`Upload ${f.label.toLowerCase()}`}
                  accept={f.key === "photo" ? ".jpg,.jpeg,.png" : ".jpg,.jpeg,.png,.pdf,.doc,.docx"}
                  value={files[f.key] ?? []}
                  onChange={(next) => setFiles((prev) => ({ ...prev, [f.key]: next }))}
                />
              </FormField>
            ))}
            {admissionFields.map(renderField)}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Room & fees" subtitle="Room assignment and money live here, not on the admission form" />
          <CardBody className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField label="Room" error={errors.roomId?.message as string | undefined} required>
                <RoomPicker
                  value={roomId ?? ""}
                  onChange={(id) => {
                    setValue("roomId", id, { shouldValidate: true });
                    setValue("bedId", "");
                  }}
                  onlyWithVacancy
                  error={!!errors.roomId}
                />
              </FormField>
              <FormField label="Bed" error={errors.bedId?.message as string | undefined} required>
                <BedPicker
                  roomId={roomId ?? ""}
                  value={watch("bedId") ?? ""}
                  onChange={(id) => setValue("bedId", id, { shouldValidate: true })}
                  error={!!errors.bedId}
                />
              </FormField>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField
                label="Monthly fee (₹)"
                error={errors.monthlyFeeRupees?.message as string | undefined}
                required
                hint={
                  isFixedFee ? undefined : "Entered per resident — this room has no fixed fee"
                }
              >
                <Input
                  type="number"
                  min={0}
                  step="100"
                  placeholder="5500"
                  disabled={isFixedFee}
                  error={!!errors.monthlyFeeRupees}
                  {...register("monthlyFeeRupees")}
                />
                {isFixedFee && (
                  <p className="mt-1 flex items-center gap-1 text-xs text-muted">
                    <Lock className="h-3 w-3 text-accent" /> Fee fixed by room —{" "}
                    <Link to="/rooms" className="text-accent-600 hover:underline">
                      change it at the room level
                    </Link>
                  </p>
                )}
              </FormField>
              <FormField
                label="Security deposit (₹)"
                error={errors.depositRupees?.message as string | undefined}
              >
                <Input type="number" min={0} step="500" error={!!errors.depositRupees} {...register("depositRupees")} />
              </FormField>
            </div>
          </CardBody>
        </Card>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => navigate("/residents")}>
            Cancel
          </Button>
          <Button type="submit" isLoading={mutation.isPending}>
            Add resident
          </Button>
        </div>
      </form>
    </div>
  );
}
