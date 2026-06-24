"use client";

import { AlertTriangle, CheckCircle, Loader2, Lock, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { FinalSubmitPanelProps } from "./types";

export function FinalSubmitPanel({ checklist, isLoading, isLocking, onLock }: FinalSubmitPanelProps) {
  const isComplete = checklist?.can_lock_submit ?? checklist?.complete ?? false;
  const sections = checklist?.sections || [];

  return (
    <div className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-xs dark:border-zinc-800 dark:bg-zinc-950">
      <h3 className="flex items-center gap-1.5 border-b pb-2 text-sm font-bold text-zinc-900 dark:border-zinc-800 dark:text-zinc-50">
        <UserCheck className="h-4.5 w-4.5 text-zinc-400" />
        Checklist Kunci Paket
      </h3>

      {isLoading ? (
        <div className="flex justify-center p-6">
          <Loader2 className="h-5 w-5 animate-spin text-emerald-600" />
        </div>
      ) : (
        <div className="max-h-[520px] space-y-4 overflow-y-auto pr-1">
          {sections.map((section) => (
            <section key={section.key} className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-[11px] font-bold uppercase text-zinc-400">{section.label}</h4>
                {section.complete ? (
                  <CheckCircle className="h-4 w-4 text-emerald-600" />
                ) : (
                  <Lock className="h-4 w-4 text-red-500" />
                )}
              </div>
              <div className="space-y-2">
                {section.items.map((item) => {
                  const isWarning = item.key === "document_readiness_reviewed";
                  return (
                    <div key={item.key} className="flex items-start gap-2 rounded-lg bg-zinc-50 px-2.5 py-2 text-xs dark:bg-zinc-900/40">
                      {item.passed ? (
                        <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-650" />
                      ) : isWarning ? (
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                      ) : (
                        <Lock className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                      )}
                      <div>
                        <p className={`font-semibold ${item.passed ? "text-zinc-800" : isWarning ? "text-amber-800" : "text-red-800"}`}>
                          {item.label}
                        </p>
                        {item.message && <p className="mt-0.5 text-[10px] text-zinc-450">{item.message}</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}

      <Button
        onClick={onLock}
        disabled={!isComplete || isLocking}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 py-2 text-xs font-bold text-white shadow-xs hover:bg-red-700"
      >
        <Lock className="h-4 w-4" />
        {isLocking ? "Mengunci..." : "Kunci & Ajukan Paket"}
      </Button>
    </div>
  );
}
