import { useRef, useState } from "react";
import { FileText, Upload, X } from "lucide-react";
import { cn } from "@/lib/cn";

export interface UploadedFile {
  file: File;
  previewUrl?: string;
}

/**
 * File picker with image previews. Accepts jpg/png/pdf/doc by default.
 * Files stay in memory (mock mode) — the real API will get FormData later.
 */
export function FileUpload({
  label = "Upload file",
  accept = ".jpg,.jpeg,.png,.pdf,.doc,.docx",
  multiple = false,
  value,
  onChange,
  className,
}: {
  label?: string;
  accept?: string;
  multiple?: boolean;
  value: UploadedFile[];
  onChange: (files: UploadedFile[]) => void;
  className?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const addFiles = (list: FileList | null) => {
    if (!list) return;
    const next: UploadedFile[] = Array.from(list).map((file) => ({
      file,
      previewUrl: file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined,
    }));
    onChange(multiple ? [...value, ...next] : next.slice(0, 1));
  };

  const remove = (idx: number) => {
    const f = value[idx];
    if (f.previewUrl) URL.revokeObjectURL(f.previewUrl);
    onChange(value.filter((_, i) => i !== idx));
  };

  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          addFiles(e.dataTransfer.files);
        }}
        className={cn(
          "flex w-full flex-col items-center justify-center gap-1 rounded-md border border-dashed px-4 py-5 text-center",
          dragOver ? "border-accent bg-accent-50" : "border-slate-300 bg-white hover:bg-slate-50",
        )}
      >
        <Upload className="h-5 w-5 text-slate-400" />
        <span className="text-xs font-medium text-ink">{label}</span>
        <span className="text-[11px] text-muted">
          Click or drag — {accept.replace(/\./g, "").replace(/,/g, ", ")}
        </span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        className="hidden"
        onChange={(e) => {
          addFiles(e.target.files);
          e.target.value = "";
        }}
      />
      {value.length > 0 && (
        <ul className="mt-2 space-y-1.5">
          {value.map((f, i) => (
            <li
              key={`${f.file.name}-${i}`}
              className="flex items-center gap-2 rounded-md border border-slate-200 bg-white p-1.5"
            >
              {f.previewUrl ? (
                <img src={f.previewUrl} alt={f.file.name} className="h-9 w-9 rounded object-cover" />
              ) : (
                <span className="flex h-9 w-9 items-center justify-center rounded bg-slate-100">
                  <FileText className="h-4 w-4 text-slate-500" />
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-ink">{f.file.name}</p>
                <p className="text-[11px] text-muted">{(f.file.size / 1024).toFixed(0)} KB</p>
              </div>
              <button
                type="button"
                onClick={() => remove(i)}
                className="rounded p-1 text-slate-400 hover:text-red-600"
                aria-label={`Remove ${f.file.name}`}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
