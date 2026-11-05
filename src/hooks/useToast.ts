import { useCallback, useEffect, useRef, useState } from "react";

export type ToastTone = "default" | "success" | "warn";

export interface ToastItem {
  id: number;
  message: string;
  tone: ToastTone;
  actionLabel?: string;
  onAction?: () => void;
}

interface ToastOptions {
  tone?: ToastTone;
  duration?: number;
  actionLabel?: string;
  onAction?: () => void;
}

let nextId = 1;

export function useToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timers = useRef<Map<number, number>>(new Map());

  const dismiss = useCallback((id: number) => {
    const timer = timers.current.get(id);
    if (timer) window.clearTimeout(timer);
    timers.current.delete(id);
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const push = useCallback(
    (message: string, options: ToastOptions = {}) => {
      const id = nextId++;
      setToasts((current) => [
        ...current.slice(-2),
        {
          id,
          message,
          tone: options.tone ?? "default",
          actionLabel: options.actionLabel,
          onAction: options.onAction,
        },
      ]);
      const timer = window.setTimeout(() => dismiss(id), options.duration ?? 4200);
      timers.current.set(id, timer);
      return id;
    },
    [dismiss],
  );

  useEffect(() => {
    const map = timers.current;
    return () => {
      map.forEach((timer) => window.clearTimeout(timer));
      map.clear();
    };
  }, []);

  return { toasts, push, dismiss };
}
