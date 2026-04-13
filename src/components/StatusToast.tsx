/* ================================================================
   Toast notification — twAIn red theme
   ================================================================ */

import { useEffect } from "react";
import { CheckCircle, AlertCircle, X } from "lucide-react";

export interface Toast {
  id: string;
  type: "success" | "error" | "info";
  message: string;
}

interface Props {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}

export default function StatusToast({ toasts, onDismiss }: Props) {
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: Toast;
  onDismiss: (id: string) => void;
}) {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), 5000);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  const colors = {
    success: "border-fh-success/40 bg-fh-success/10 text-fh-success",
    error: "border-fh-red/40 bg-fh-red/10 text-fh-red-bright",
    info: "border-fh-border bg-fh-card text-fh-muted",
  };
  const Icon = toast.type === "error" ? AlertCircle : CheckCircle;

  return (
    <div
      className={`flex items-start gap-2 px-4 py-3 rounded-lg border text-sm ${colors[toast.type]}`}
    >
      <Icon className="w-4 h-4 mt-0.5 flex-shrink-0" />
      <span className="flex-1">{toast.message}</span>
      <button onClick={() => onDismiss(toast.id)} className="opacity-60 hover:opacity-100">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
