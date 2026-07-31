import { useEffect, useMemo, useRef, useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ChevronLeft, ChevronRight, Lock, Save } from "lucide-react";
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
import { saveDraft as saveDraftToStore, getDraft, deleteDraft, clearLegacyDraft } from "./draft-store";

const STEPS = ["Personal details", "Room details", "Fee details"] as const;

type FormValues = Record<string, string>;

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

function StepIndicator({ current, steps }: { current: number; steps: readonly string[] }) {
  return (
    <nav className="mb-6 flex items-center gap-1">
      {steps.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <div key={label} className="flex items-center gap-1">
            {i > 0 && <div className={`h-px w-6 ${done ? "bg-accent" : "bg-slate-200"}`} />}
            <div className="flex items-center gap-1.5">
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                  done
                    ? "bg-accent text-white"
                    : active
                      ? "border-2 border-accent text-accent"
                      : "border border-slate-300 text-muted"
                }`}
              >
                {done ? <Check className="h-3.5 w-3.5" /> : i + 1}
              </span>
              <span
                className={`hidden text-xs font-medium sm:inline ${
                  active ? "text-ink" : "text-muted"
                }`}
              >
                {label}
              </span>
            </div>
          </div>
        );
      })}
    </nav>
  );
}

export function AddResidentPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const draftId = searchParams.get("draft");
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [files, setFiles] = useState<Record<string, UploadedFile[]>>({});
  const [currentDraftId, setCurrentDraftId] = useState<string | undefined>(draftId ?? undefined);
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

  const admissionFieldKeys = useMemo(
    () => new Set(admissionFields.map((f) => f.key)),
    [admissionFields],
  );

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    getValues,
    reset,
    trigger,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema) as unknown as Resolver<FormValues>,
    mode: "onBlur",
  });

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
            ? "(auto-generated on submit)"
            : "";
    }
    clearLegacyDraft();
    if (draftId) {
      const draft = getDraft(draftId);
      if (draft) {
        reset({ ...values, ...draft.data });
        toast({ title: "Draft restored", description: `Continuing "${draft.name}".`, variant: "info" });
        return;
      }
    }
    reset(values);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config]);

  const handleSaveDraft = () => {
    const id = saveDraftToStore(getValues(), currentDraftId);
    setCurrentDraftId(id);
    toast({ title: "Draft saved", description: "You can find it on the Residents page.", variant: "success" });
  };

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
      if (currentDraftId) deleteDraft(currentDraftId);
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

  const goNext = async () => {
    if (step === 0) {
      const personalKeys = [...admissionFieldKeys];
      const valid = await trigger(personalKeys);
      if (!valid) return;
    } else if (step === 1) {
      const valid = await trigger(["roomId", "bedId"]);
      if (!valid) return;
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const goBack = () => {
    setStep((s) => Math.max(s - 1, 0));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

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
            placeholder="Select..."
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
        subtitle={`Step ${step + 1} of ${STEPS.length} — ${STEPS[step]}`}
        actions={
          <Button variant="outline" size="sm" onClick={handleSaveDraft}>
            <Save className="h-3.5 w-3.5" /> Save draft
          </Button>
        }
      />

      <StepIndicator current={step} steps={STEPS} />

      <form onSubmit={handleSubmit((v) => mutation.mutate(v))}>
        {/* Step 1: Personal details */}
        {step === 0 && (
          <Card>
            <CardHeader title="Personal details" subtitle="From your admission form configuration" />
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
        )}

        {/* Step 2: Room details */}
        {step === 1 && (
          <Card>
            <CardHeader title="Room details" subtitle="Pick the room and bed for this resident" />
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
              {selectedRoom && (
                <p className="rounded bg-slate-50 px-3 py-2 text-xs text-muted">
                  {selectedRoom.number} — {selectedRoom.type} room, Floor {selectedRoom.floor}
                  {selectedRoom.feeMode === "fixed" ? " (fixed fee)" : " (per-resident fee)"}
                </p>
              )}
            </CardBody>
          </Card>
        )}

        {/* Step 3: Fee details */}
        {step === 2 && (
          <Card>
            <CardHeader
              title="Fee details"
              subtitle={isFixedFee ? "Monthly fee is set by the room — only security deposit is needed" : "Set the monthly fee and security deposit"}
            />
            <CardBody className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                {!isFixedFee && (
                  <FormField
                    label="Monthly fee (₹)"
                    error={errors.monthlyFeeRupees?.message as string | undefined}
                    required
                    hint="Entered per resident — this room has no fixed fee"
                  >
                    <Input
                      type="number"
                      min={0}
                      step="100"
                      placeholder="5500"
                      error={!!errors.monthlyFeeRupees}
                      {...register("monthlyFeeRupees")}
                    />
                  </FormField>
                )}
                {isFixedFee && (
                  <FormField label="Monthly fee (₹)">
                    <Input
                      type="number"
                      disabled
                      value={watch("monthlyFeeRupees")}
                      readOnly
                    />
                    <p className="mt-1 flex items-center gap-1 text-xs text-muted">
                      <Lock className="h-3 w-3 text-accent" /> Fixed by room —{" "}
                      <Link to="/rooms" className="text-accent-600 hover:underline">
                        change in room settings
                      </Link>
                    </p>
                  </FormField>
                )}
                <FormField
                  label="Security deposit (₹)"
                  error={errors.depositRupees?.message as string | undefined}
                >
                  <Input type="number" min={0} step="500" error={!!errors.depositRupees} {...register("depositRupees")} />
                </FormField>
              </div>
            </CardBody>
          </Card>
        )}

        {/* Navigation */}
        <div className="mt-4 flex items-center justify-between">
          <div>
            {step > 0 && (
              <Button type="button" variant="outline" onClick={goBack}>
                <ChevronLeft className="h-3.5 w-3.5" /> Back
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => navigate("/residents")}>
              Cancel
            </Button>
            {step < STEPS.length - 1 ? (
              <Button type="button" onClick={goNext}>
                Next <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            ) : (
              <Button type="submit" isLoading={mutation.isPending}>
                Add resident
              </Button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
