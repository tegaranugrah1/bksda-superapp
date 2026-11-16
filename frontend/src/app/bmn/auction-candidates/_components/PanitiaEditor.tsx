"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PanitiaAnggota } from "../_lib/sk-panitia-defaults";
import type { EmployeeOption } from "../_hooks/useEmployeeOptions";

interface PanitiaEditorProps {
  susunanPanitia: PanitiaAnggota[];
  employees: EmployeeOption[];
  onAdd: () => void;
  onRemove: (id: string) => void;
  onUpdate: (id: string, field: keyof PanitiaAnggota, value: string) => void;
  onSelectEmployee: (id: string, employeeId: string, employees: EmployeeOption[]) => void;
}

export function PanitiaEditor({
  susunanPanitia,
  employees,
  onAdd,
  onRemove,
  onUpdate,
  onSelectEmployee,
}: PanitiaEditorProps) {
  return (
    <div className="mt-4 rounded-3xl border border-slate-200/80 dark:border-zinc-800 bg-[var(--ds-surface)] p-4 shadow-xs">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-[var(--ds-fg)]">Susunan Panitia</h3>
        <Button size="xs" variant="outline" className="rounded-lg gap-1" onClick={onAdd}>
          <Plus className="h-3 w-3" />
          Tambah
        </Button>
      </div>
      <p className="mt-1 text-xs text-[var(--ds-fg-muted)]">
        Susunan panitia yang akan ditampilkan pada halaman lampiran.
      </p>
      <div className="mt-3 space-y-3">
        {susunanPanitia.map((item) => (
          <div key={item.id} className="rounded-lg border border-slate-200/80 dark:border-zinc-800 bg-[var(--ds-surface-muted)] p-3">
            <div className="flex items-center gap-2">
              <select
                value=""
                onChange={(e) => onSelectEmployee(item.id, e.target.value, employees)}
                className="h-8 flex-1 rounded-lg border border-slate-200/80 dark:border-zinc-800 bg-[var(--ds-surface)] px-2 text-xs text-[var(--ds-fg)] outline-none focus:border-[var(--ds-accent-soft-border)] focus:ring-2 focus:ring-[var(--ds-accent-soft)]"
              >
                <option value="">-- Pilih Pegawai --</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={String(emp.id)}>
                    {emp.nama_lengkap || emp.name || "-"}
                  </option>
                ))}
              </select>
              <Button
                size="xs"
                variant="destructive"
                className="rounded-lg gap-1"
                onClick={() => onRemove(item.id)}
              >
                <Trash2 className="h-3 w-3" />
                Hapus
              </Button>
            </div>
            <input
              value={item.jabatanKegiatan}
              onChange={(e) => onUpdate(item.id, "jabatanKegiatan", e.target.value)}
              placeholder="Jabatan dalam Kegiatan (Ketua, Sekretaris, Anggota...)"
              className="mt-2 h-8 w-full rounded-lg border border-slate-200/80 dark:border-zinc-800 bg-[var(--ds-surface)] px-2 text-xs text-[var(--ds-fg)] outline-none focus:border-[var(--ds-accent-soft-border)] focus:ring-2 focus:ring-[var(--ds-accent-soft)]"
            />
            {item.nama && (
              <div className="mt-2 rounded-lg border border-[var(--ds-accent-soft-border)] bg-[var(--ds-accent-soft)] px-3 py-2 text-xs text-[var(--ds-accent-fg)]">
                <p className="font-semibold">{item.nama}</p>
                <p className="tabular-nums">NIP. {item.nip}</p>
                <p className="whitespace-pre-line">{item.jabatanInstansi}</p>
              </div>
            )}
          </div>
        ))}
        {susunanPanitia.length === 0 && (
          <p className="rounded-lg border border-dashed border-slate-200/80 dark:border-zinc-800 p-3 text-center text-xs text-[var(--ds-fg-muted)]">
            Belum ada anggota panitia. Klik Tambah untuk menambahkan.
          </p>
        )}
      </div>
    </div>
  );
}
