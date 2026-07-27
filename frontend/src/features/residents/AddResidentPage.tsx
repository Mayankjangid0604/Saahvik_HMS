import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Save } from "lucide-react";
import { createResident } from "@/api/resident.api";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { FormField } from "@/components/ui/FormField";
import { useToast } from "@/components/ui/Toast";
import { FileUpload, type UploadedFile } from "@/components/shared/FileUpload";
import { RoomPicker } from "@/components/shared/RoomPicker";
import { BedPicker } from "@/components/shared/BedPicker";
import { emailSchema, phoneSchema, requiredString, rupeeAmountSchema } from "@/lib/validators";
import { rupeesToPaisa } from "@/lib/format";

const DRAFT_KEY = "saahvik.draft.add-resident";

const schema = z.object({
  name: requiredString("Name"),
  phone: phoneSchema,
  email: emailSchema.optional().or(z.literal("")),
  guardianName: requiredString("Guardian name"),
  guardianPhone: phoneSchema,
  permanentAddress: requiredString("Address"),
  idType: z.enum(["aadhaar", "pan", "passport", "driving_license", "voter_id"]),
  idNumber: requiredString("ID number"),
  occupation: z.enum(["student", "working"]),
  institutionOrCompany: z.string().optional(),
  roomId: requiredString("Room"),
  bedId: requiredString("Bed"),
  joinDate: requiredString("Join date"),
  monthlyFeeRupees: rupeeAmountSchema,
  depositRupees: z.coerce.number().min(0),
  notes: z.string().optional(),
});
type FormInput = z.input<typeof schema>;
type FormValues = z.output<typeof schema>;

export function AddResidentPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [photo, setPhoto] = useState<UploadedFile[]>([]);
  const [idDoc, setIdDoc] = useState<UploadedFile[]>([]);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    getValues,
    reset,
    formState: { errors },
  } = useForm<FormInput, unknown, FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      idType: "aadhaar",
      occupation: "student",
      joinDate: new Date().toISOString().slice(0, 10),
      depositRupees: 10000,
    },
  });

  // Draft restore/save (photo/ID files are not persisted)
  useEffect(() => {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (raw) {
      try {
        reset({ ...getValues(), ...JSON.parse(raw) });
        toast({ title: "Draft restored", description: "Continuing your unsaved form.", variant: "info" });
      } catch {
        localStorage.removeItem(DRAFT_KEY);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saveDraft = () => {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(getValues()));
    toast({ title: "Draft saved", description: "You can finish this later.", variant: "success" });
  };

  const roomId = watch("roomId");

  const mutation = useMutation({
    mutationFn: (v: FormValues) =>
      createResident({
        name: v.name,
        phone: v.phone,
        email: v.email || undefined,
        guardianName: v.guardianName,
        guardianPhone: v.guardianPhone,
        permanentAddress: v.permanentAddress,
        idType: v.idType,
        idNumber: v.idNumber,
        occupation: v.occupation,
        institutionOrCompany: v.institutionOrCompany,
        roomId: v.roomId,
        bedId: v.bedId,
        joinDate: v.joinDate,
        monthlyFeePaisa: rupeesToPaisa(v.monthlyFeeRupees),
        depositPaisa: rupeesToPaisa(v.depositRupees),
        notes: v.notes,
        photoUrl: photo[0]?.previewUrl,
      }),
    onSuccess: (resident) => {
      localStorage.removeItem(DRAFT_KEY);
      queryClient.invalidateQueries({ queryKey: ["residents"] });
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
      toast({ title: `${resident.name} added`, description: `${resident.roomNumber} · Bed ${resident.bedLabel}`, variant: "success" });
      navigate(`/residents/${resident.id}`);
    },
    onError: (err: Error) => toast({ title: "Could not add resident", description: err.message, variant: "error" }),
  });

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Add resident"
        actions={
          <Button variant="outline" size="sm" onClick={saveDraft}>
            <Save className="h-3.5 w-3.5" /> Save draft
          </Button>
        }
      />

      <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="space-y-4">
        <Card>
          <CardHeader title="Personal details" />
          <CardBody className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField label="Full name" error={errors.name?.message} required>
                <Input placeholder="Rahul Sharma" error={!!errors.name} {...register("name")} />
              </FormField>
              <FormField label="Mobile number" error={errors.phone?.message} required>
                <Input type="tel" maxLength={10} placeholder="9876543210" error={!!errors.phone} {...register("phone")} />
              </FormField>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField label="Email" error={errors.email?.message}>
                <Input type="email" placeholder="Optional" error={!!errors.email} {...register("email")} />
              </FormField>
              <FormField label="Occupation" required>
                <Select
                  {...register("occupation")}
                  options={[
                    { value: "student", label: "Student" },
                    { value: "working", label: "Working professional" },
                  ]}
                />
              </FormField>
            </div>
            <FormField label="College / Company">
              <Input placeholder="MNIT Jaipur" {...register("institutionOrCompany")} />
            </FormField>
            <FormField label="Permanent address" error={errors.permanentAddress?.message} required>
              <Textarea rows={2} placeholder="Village/Town, District, State" error={!!errors.permanentAddress} {...register("permanentAddress")} />
            </FormField>
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField label="Photo" hint="jpg or png">
                <FileUpload label="Upload photo" accept=".jpg,.jpeg,.png" value={photo} onChange={setPhoto} />
              </FormField>
              <FormField label="ID document" hint="jpg, png, pdf or doc">
                <FileUpload label="Upload ID" accept=".jpg,.jpeg,.png,.pdf,.doc,.docx" value={idDoc} onChange={setIdDoc} />
              </FormField>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField label="ID type" required>
                <Select
                  {...register("idType")}
                  options={[
                    { value: "aadhaar", label: "Aadhaar" },
                    { value: "pan", label: "PAN" },
                    { value: "passport", label: "Passport" },
                    { value: "driving_license", label: "Driving license" },
                    { value: "voter_id", label: "Voter ID" },
                  ]}
                />
              </FormField>
              <FormField label="ID number" error={errors.idNumber?.message} required>
                <Input placeholder="XXXX XXXX 1234" error={!!errors.idNumber} {...register("idNumber")} />
              </FormField>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Guardian" />
          <CardBody className="grid gap-3 sm:grid-cols-2">
            <FormField label="Guardian name" error={errors.guardianName?.message} required>
              <Input placeholder="Om Prakash Sharma" error={!!errors.guardianName} {...register("guardianName")} />
            </FormField>
            <FormField label="Guardian phone" error={errors.guardianPhone?.message} required>
              <Input type="tel" maxLength={10} error={!!errors.guardianPhone} {...register("guardianPhone")} />
            </FormField>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Room & fees" />
          <CardBody className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField label="Room" error={errors.roomId?.message} required>
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
              <FormField label="Bed" error={errors.bedId?.message} required>
                <BedPicker
                  roomId={roomId ?? ""}
                  value={watch("bedId") ?? ""}
                  onChange={(id) => setValue("bedId", id, { shouldValidate: true })}
                  error={!!errors.bedId}
                />
              </FormField>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <FormField label="Join date" error={errors.joinDate?.message} required>
                <Input type="date" error={!!errors.joinDate} {...register("joinDate")} />
              </FormField>
              <FormField label="Monthly fee (₹)" error={errors.monthlyFeeRupees?.message} required>
                <Input type="number" min={0} step="100" placeholder="5500" error={!!errors.monthlyFeeRupees} {...register("monthlyFeeRupees")} />
              </FormField>
              <FormField label="Security deposit (₹)" error={errors.depositRupees?.message}>
                <Input type="number" min={0} step="500" error={!!errors.depositRupees} {...register("depositRupees")} />
              </FormField>
            </div>
            <FormField label="Notes">
              <Textarea rows={2} placeholder="Anything to remember about this resident" {...register("notes")} />
            </FormField>
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
