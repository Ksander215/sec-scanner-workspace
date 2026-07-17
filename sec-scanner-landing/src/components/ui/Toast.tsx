"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, AlertCircle, Info, X, XCircle } from "lucide-react";

type ToastType = "success" | "error" | "info" | "warning";

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  duration?: number;
}

interface ToastContextValue {
  addToast: (toast: Omit<Toast, "id">) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue>({
  addToast: () => {},
  removeToast: () => {},
});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((toast: Omit<Toast, "id">) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { ...toast, id }]);
    const duration = toast.duration ?? 4000;
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const iconMap: Record<ToastType, React.ElementType> = {
    success: CheckCircle2,
    error: XCircle,
    warning: AlertCircle,
    info: Info,
  };

  const colorMap: Record<ToastType, string> = {
    success: "text-accent",
    error: "text-red",
    warning: "text-amber",
    info: "text-cyan",
  };

  const borderMap: Record<ToastType, string> = {
    success: "border-accent/30",
    error: "border-red/30",
    warning: "border-amber/30",
    info: "border-cyan/30",
  };

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm">
        <AnimatePresence>
          {toasts.map((toast) => {
            const Icon = iconMap[toast.type];
            return (
              <motion.div
                key={toast.id}
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className={`flex items-start gap-3 p-4 rounded-xl bg-surface border ${borderMap[toast.type]} shadow-lg`}
              >
                <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${colorMap[toast.type]}`} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-foreground">{toast.title}</div>
                  {toast.description && (
                    <div className="text-xs text-muted-2 mt-1">{toast.description}</div>
                  )}
                </div>
                <button
                  onClick={() => removeToast(toast.id)}
                  className="shrink-0 text-muted hover:text-foreground transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
