"use client";

import React, { useRef } from "react";
import { RotateCcw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

interface ReturnLoanModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assetName?: string;
  borrowerName?: string;
  returnCondition: string;
  setReturnCondition: (cond: string) => void;
  handleReturn: () => Promise<void>;
  saving: boolean;
}

export function ReturnLoanModal({
  open,
  onOpenChange,
  assetName,
  borrowerName,
  returnCondition,
  setReturnCondition,
  handleReturn,
  saving,
}: ReturnLoanModalProps) {
  const opener = useRef<HTMLElement | null>(null);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onOpenAutoFocus={() => { opener.current = document.activeElement as HTMLElement | null; }} onCloseAutoFocus={(event) => { event.preventDefault(); opener.current?.focus(); }} data-module="bmn" className="bmn-assets-ui bmn-standard-ui bmn-popover sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RotateCcw className="w-5 h-5 text-[var(--ds-accent-fg)]" /> Kembalikan Aset?
          </DialogTitle>
          <DialogDescription>
            Konfirmasi pengembalian aset <strong>{assetName}</strong> dari <strong>{borrowerName}</strong>.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label>Kondisi Setelah Kembali *</Label>
            <Select value={returnCondition} onValueChange={setReturnCondition}>
              <SelectTrigger aria-label="Kondisi Setelah Kembali"><SelectValue placeholder="Pilih kondisi..." /></SelectTrigger>
              <SelectContent data-module="bmn" className="bmn-assets-ui bmn-standard-ui bmn-popover">
                <SelectItem value="Baik">Baik</SelectItem>
                <SelectItem value="Rusak Ringan">Rusak Ringan</SelectItem>
                <SelectItem value="Rusak Berat">Rusak Berat</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
          <Button onClick={handleReturn} disabled={saving} className="bg-[var(--ds-accent-solid)] hover:bg-[var(--ds-accent-hover)]">
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Kembalikan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
