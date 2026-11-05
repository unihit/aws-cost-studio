import { AlertTriangle, CheckCircle2, Info, X } from "lucide-react";
import type { ToastItem } from "../hooks/useToast";
import { cn } from "./Primitives";

interface ToastStackProps {
  toasts: ToastItem[];
  onDismiss: (id: number) => void;
}

export function ToastStack({ toasts, onDismiss }: ToastStackProps) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex flex-col items-center gap-2 px-4">
      {toasts.map((toast) => {
        const Icon = toast.tone === "success" ? CheckCircle2 : toast.tone === "warn" ? AlertTriangle : Info;
        return (
          <div
            key={toast.id}
            role="status"
            className="pointer-events-auto flex w-full max-w-md animate-fade-up items-center gap-2.5 rounded-xl border border-white/10 bg-zinc-900/95 px-3.5 py-2.5 text-white shadow-lift backdrop-blur"
          >
            <Icon
              size={15}
              className={cn(
                "shrink-0",
                toast.tone === "success"
                  ? "text-emerald-400"
                  : toast.tone === "warn"
                    ? "text-amber-400"
                    : "text-indigo-300",
              )}
            />
            <p className="min-w-0 flex-1 text-xs leading-snug text-zinc-100">{toast.message}</p>
            {toast.actionLabel && toast.onAction && (
              <button
                type="button"
                onClick={() => {
                  toast.onAction?.();
                  onDismiss(toast.id);
                }}
                className="shrink-0 rounded-md bg-white/10 px-2 py-1 text-[10px] font-bold text-white transition hover:bg-white/20"
              >
                {toast.actionLabel}
              </button>
            )}
            <button
              type="button"
              aria-label="알림 닫기"
              onClick={() => onDismiss(toast.id)}
              className="grid h-6 w-6 shrink-0 place-items-center rounded-md text-zinc-400 transition hover:bg-white/10 hover:text-white"
            >
              <X size={13} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
