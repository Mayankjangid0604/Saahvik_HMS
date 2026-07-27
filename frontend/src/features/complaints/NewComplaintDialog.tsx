import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createComplaint } from "@/api/complaint.api";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { FormField } from "@/components/ui/FormField";
import { useToast } from "@/components/ui/Toast";
import { ResidentPicker } from "@/components/shared/ResidentPicker";
import { FileUpload, type UploadedFile } from "@/components/shared/FileUpload";
import { requiredString } from "@/lib/validators";

const schema = z.object({
  title: requiredString("Title"),
  description: requiredString("Description"),
  category: z.enum(["electrical", "plumbing", "cleaning", "food", "wifi", "furniture", "security", "other"]),
  priority: z.enum(["low", "medium", "high"]),
  residentId: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

export function NewComplaintDialog({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [attachments, setAttachments] = useState<UploadedFile[]>([]);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { category: "other", priority: "medium" },
  });

  const mutation = useMutation({
    mutationFn: (v: FormValues) =>
      createComplaint({
        ...v,
        residentId: v.residentId || undefined,
        attachments: attachments.map((a) => ({ fileName: a.file.name, fileType: a.file.type })),
      }),
    onSuccess: (c) => {
      queryClient.invalidateQueries({ queryKey: ["complaints"] });
      toast({ title: `Complaint ${c.ticketNo} registered`, variant: "success" });
      reset();
      setAttachments([]);
      onClose();
    },
    onError: (err: Error) => toast({ title: "Could not register complaint", description: err.message, variant: "error" }),
  });

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="New complaint">
      <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="space-y-3">
        <FormField label="Title" error={errors.title?.message} required>
          <Input placeholder="Geyser not working on 2nd floor" error={!!errors.title} {...register("title")} />
        </FormField>
        <FormField label="Description" error={errors.description?.message} required>
          <Textarea rows={3} placeholder="What happened, where and since when" error={!!errors.description} {...register("description")} />
        </FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Category" required>
            <Select
              {...register("category")}
              options={[
                { value: "electrical", label: "Electrical" },
                { value: "plumbing", label: "Plumbing" },
                { value: "cleaning", label: "Cleaning" },
                { value: "food", label: "Food / Mess" },
                { value: "wifi", label: "WiFi" },
                { value: "furniture", label: "Furniture" },
                { value: "security", label: "Security" },
                { value: "other", label: "Other" },
              ]}
            />
          </FormField>
          <FormField label="Priority" required>
            <Select
              {...register("priority")}
              options={[
                { value: "low", label: "Low" },
                { value: "medium", label: "Medium" },
                { value: "high", label: "High" },
              ]}
            />
          </FormField>
        </div>
        <FormField label="Raised by" hint="Optional — link a resident">
          <ResidentPicker
            value={watch("residentId") ?? ""}
            onChange={(id) => setValue("residentId", id)}
          />
        </FormField>
        <FormField label="Attachments" hint="Photos or documents">
          <FileUpload
            label="Add photos / files"
            accept=".jpg,.jpeg,.png,.pdf,.doc,.docx"
            multiple
            value={attachments}
            onChange={setAttachments}
          />
        </FormField>
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={mutation.isPending}>
            Register complaint
          </Button>
        </div>
      </form>
    </Modal>
  );
}
