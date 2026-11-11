"use client";

import { useRef, type ReactNode } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export function SuratTugasDialog({
  children,
  onClose,
  busy = false,
  className,
}: {
  children: ReactNode;
  onClose: () => void;
  busy?: boolean;
  className?: string;
}) {
  const opener = useRef<HTMLElement | null>(null);

  return (
    <Dialog open onOpenChange={(open) => { if (!open && !busy) onClose(); }}>
      <DialogContent
        data-module="surat-tugas"
        className={cn("st-ui max-h-[90dvh] overflow-y-auto rounded-2xl p-5", className)}
        aria-describedby={undefined}
        showCloseButton={false}
        onOpenAutoFocus={() => { opener.current = document.activeElement as HTMLElement | null; }}
        onCloseAutoFocus={(event) => { event.preventDefault(); opener.current?.focus(); }}
      >
        {children}
      </DialogContent>
    </Dialog>
  );
}
