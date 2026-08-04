"use client";

import React from "react";
import { Trash2, Undo2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ConfirmActionModalProps {
  open: boolean;
  title: string;
  message: string;
  variant: "danger" | "warning" | "success";
  action: () => Promise<void>;
  onClose: () => void;
}

export function ConfirmActionModal({
  open,
  title,
  message,
  variant,
  action,
  onClose,
}: ConfirmActionModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-md" onClick={onClose} />
      <div className="bg-white dark:bg-zinc-900 rounded-[2.5rem] p-10 shadow-2xl border border-slate-100 dark:border-zinc-800 w-full max-w-sm relative z-10 animate-in zoom-in-95 duration-300">
        <div className={cn(
          "w-16 h-16 rounded-2xl flex items-center justify-center mb-6 mx-auto shadow-xl",
          variant === 'danger' ? "bg-red-50 dark:bg-red-500/10 text-red-600 shadow-red-500/10" :
          variant === 'success' ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 shadow-emerald-500/10" :
          "bg-amber-50 dark:bg-amber-500/10 text-amber-600 shadow-amber-500/10"
        )}>
          {variant === 'danger' ? <Trash2 className="w-8 h-8" /> :
           variant === 'success' ? <Undo2 className="w-8 h-8" /> :
           <AlertCircle className="w-8 h-8" />}
        </div>
        <h3 className="text-xl font-black text-slate-900 dark:text-white text-center mb-2 tracking-tight">{title}</h3>
        <p className="text-slate-500 dark:text-zinc-400 text-center text-[11px] font-bold leading-relaxed mb-10">
          {message}
        </p>
        <div className="flex gap-3">
          <button 
            onClick={onClose}
            className="flex-1 py-3.5 rounded-xl bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 font-black text-[10px] tracking-widest uppercase hover:bg-slate-200 dark:hover:bg-zinc-700 transition-all"
          >
            Batal
          </button>
          <button 
            onClick={async () => {
              await action();
              onClose();
            }}
            className={cn(
              "flex-1 py-3.5 rounded-xl text-white font-black text-[10px] tracking-widest uppercase shadow-xl transition-all active:scale-95",
              variant === 'danger' ? "bg-red-600 shadow-red-500/30" :
              variant === 'success' ? "bg-emerald-600 shadow-emerald-500/30" :
              "bg-blue-600 shadow-blue-500/30"
            )}
          >
            Ya
          </button>
        </div>
      </div>
    </div>
  );
}
