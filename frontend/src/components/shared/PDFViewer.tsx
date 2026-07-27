import { useEffect } from "react";
import { Download, X } from "lucide-react";
import { Modal } from "@/components/ui/Modal";

/**
 * Shows a jsPDF-generated document in a modal via a blob URL, with download.
 */
export function PDFViewer({
  isOpen,
  onClose,
  blobUrl,
  fileName,
  title,
}: {
  isOpen: boolean;
  onClose: () => void;
  blobUrl: string | null;
  fileName: string;
  title?: string;
}) {
  useEffect(() => {
    return () => {
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [blobUrl]);

  if (!blobUrl) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title ?? fileName} size="xl">
      <div className="flex justify-end gap-2 pb-2">
        <a
          href={blobUrl}
          download={fileName}
          className="inline-flex h-8 items-center gap-1.5 rounded-md bg-accent px-3 text-xs font-medium text-white hover:bg-accent-600"
        >
          <Download className="h-3.5 w-3.5" /> Download
        </a>
        <button
          onClick={onClose}
          className="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-300 px-3 text-xs font-medium hover:bg-slate-50"
        >
          <X className="h-3.5 w-3.5" /> Close
        </button>
      </div>
      <iframe src={blobUrl} title={fileName} className="h-[65vh] w-full rounded border border-slate-200" />
    </Modal>
  );
}
