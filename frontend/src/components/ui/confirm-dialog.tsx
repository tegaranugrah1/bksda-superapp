"use client";

import { useState, useCallback, useRef, createContext, useContext, ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Trash2, Loader2 } from "lucide-react";

interface ConfirmOptions {
  title?: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "warning" | "default";
}

interface ConfirmDialogContextType {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ConfirmDialogContext = createContext<ConfirmDialogContextType | null>(null);

export function useConfirm() {
  const context = useContext(ConfirmDialogContext);
  if (!context) {
    throw new Error("useConfirm must be used within ConfirmDialogProvider");
  }
  return context.confirm;
}

export function ConfirmDialogProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolveRef = useRef<((value: boolean) => void) | null>(null);
  const [loading, setLoading] = useState(false);

  const confirm = useCallback((opts: ConfirmOptions): Promise<boolean> => {
    return new Promise<boolean>((resolve) => {
      setOptions(opts);
      resolveRef.current = resolve;
      setOpen(true);
      setLoading(false);
    });
  }, []);

  const handleConfirm = () => {
    setLoading(true);
    resolveRef.current?.(true);
    resolveRef.current = null;
    setOpen(false);
    setLoading(false);
  };

  const handleCancel = () => {
    resolveRef.current?.(false);
    resolveRef.current = null;
    setOpen(false);
  };

  const variant = options?.variant || "danger";

  const iconColorMap = {
    danger: "bg-rose-100 text-rose-600 ring-rose-200",
    warning: "bg-amber-100 text-amber-600 ring-amber-200",
    default: "bg-blue-100 text-blue-600 ring-blue-200",
  };

  const buttonColorMap = {
    danger: "bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-200/50",
    warning: "bg-amber-600 hover:bg-amber-700 text-white shadow-lg shadow-amber-200/50",
    default: "bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200/50",
  };

  return (
    <ConfirmDialogContext.Provider value={{ confirm }}>
      {children}
      <Dialog open={open} onOpenChange={(v) => { if (!v) handleCancel(); }}>
        <DialogContent className="sm:max-w-[420px] rounded-2xl border border-white/40 bg-white/95 backdrop-blur-2xl shadow-2xl shadow-gray-300/40 p-0 gap-0 overflow-hidden">
          <div className="px-6 pt-6 pb-4">
            <DialogHeader className="flex flex-col items-center text-center gap-3">
              <div className={`h-14 w-14 rounded-2xl flex items-center justify-center ring-1 ${iconColorMap[variant]}`}>
                {variant === "danger" ? (
                  <Trash2 className="h-7 w-7" />
                ) : (
                  <AlertTriangle className="h-7 w-7" />
                )}
              </div>
              <DialogTitle className="text-lg font-bold text-slate-800">
                {options?.title || "Konfirmasi"}
              </DialogTitle>
              <DialogDescription className="text-sm text-slate-500 leading-relaxed">
                {options?.description}
              </DialogDescription>
            </DialogHeader>
          </div>
          <DialogFooter className="px-6 pb-6 pt-2 flex flex-row gap-3 sm:justify-center">
            <Button
              variant="outline"
              onClick={handleCancel}
              className="flex-1 h-11 rounded-xl font-bold text-sm border-slate-200 hover:bg-slate-50 text-slate-600"
              disabled={loading}
            >
              {options?.cancelText || "Batal"}
            </Button>
            <Button
              onClick={handleConfirm}
              className={`flex-1 h-11 rounded-xl font-bold text-sm ${buttonColorMap[variant]}`}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              {options?.confirmText || "Ya, Hapus"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ConfirmDialogContext.Provider>
  );
}
