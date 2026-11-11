"use client";

import { type ReactNode } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useDialogFocusReturn } from "@/components/ui/use-dialog-focus-return";

export function KepegawaianDialog({
  title,
  children,
  onClose,
  busy = false,
  className,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  busy?: boolean;
  className?: string;
}) {
  const focusReturn = useDialogFocusReturn();

  return (
    <Dialog open onOpenChange={(open) => { if (!open && !busy) onClose(); }}>
      <DialogContent
        data-module="kepegawaian"
        className={cn("kpg-ui w-[calc(100%-2rem)] max-h-[92dvh] overflow-y-auto gap-0 border-0 p-0 sm:max-w-lg", className)}
        aria-describedby={undefined}
        showCloseButton={false}
        {...focusReturn}
      >
        <DialogTitle className="sr-only">{title}</DialogTitle>
        {children}
      </DialogContent>
    </Dialog>
  );
}
