"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PemeriksaAnggota } from "../_lib/pemeriksa-defaults";
import type { EmployeeOption } from "../_hooks/useEmployeeOptions";

interface PemeriksaEditorProps {
  pemeriksaList: PemeriksaAnggota[];
  employees: EmployeeOption[];
  onAdd: () => void;
  onRemove: (id: string) => void;
  onUpdate: (id: string, field: keyof PemeriksaAnggota, value: string) => void;
  onSelectEmployee: (id: string, employeeId: string, employees: EmployeeOption[]) => void;
}

export function PemeriksaEditor({
  pemeriksaList,
  employees,
  onAdd,
  onRemove,
  onUpdate,
  onSelectEmployee,
}: PemeriksaEditorProps) {
  return (
    <div className="rounded-3xl border border-slate-200/80 dark:border-zinc-800 bg-[var(--ds-surface)] p-4 shadow-xs">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-[var(--ds-fg)]">Pemeriksa</h3>
        <Button size="xs" variant="outline" className="rounded-lg gap-1" onClick={onAdd}>
          <Plus className="h-3 w-3" />
          Tambah
        </Button>
      </div>
      <p className="mt-1 text-xs text-[var(--ds-fg-muted)]">
        Daftar pemeriksa BMN yang akan ditampilkan pada berita acara.
      </p>
      <div className="mt-3 space-y-3">
        {pemeriksaList.map((item) => (
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
              value={item.nama}
              onChange={(e) => onUpdate(item.id, "nama", e.target.value)}
              placeholder="Nama"
              className="mt-2 h-8 w-full rounded-lg border border-slate-200/80 dark:border-zinc-800 bg-[var(--ds-surface)] px-2 text-xs text-[var(--ds-fg)] outline-none focus:border-[var(--ds-accent-soft-border)] focus:ring-2 focus:ring-[var(--ds-accent-soft)]"
            />
            <input
              value={item.nip}
              onChange={(e) => onUpdate(item.id, "nip", e.target.value)}
              placeholder="NIP"
              className="mt-2 h-8 w-full rounded-lg border border-slate-200/80 dark:border-zinc-800 bg-[var(--ds-surface)] px-2 text-xs text-[var(--ds-fg)] tabular-nums outline-none focus:border-[var(--ds-accent-soft-border)] focus:ring-2 focus:ring-[var(--ds-accent-soft)]"
            />
            <input
              value={item.jabatan}
              onChange={(e) => onUpdate(item.id, "jabatan", e.target.value)}
              placeholder="Jabatan"
              className="mt-2 h-8 w-full rounded-lg border border-slate-200/80 dark:border-zinc-800 bg-[var(--ds-surface)] px-2 text-xs text-[var(--ds-fg)] outline-none focus:border-[var(--ds-accent-soft-border)] focus:ring-2 focus:ring-[var(--ds-accent-soft)]"
            />
          </div>
        ))}
        {pemeriksaList.length === 0 && (
          <p className="rounded-lg border border-dashed border-slate-200/80 dark:border-zinc-800 p-3 text-center text-xs text-[var(--ds-fg-muted)]">
            Belum ada pemeriksa. Klik Tambah untuk menambahkan.
          </p>
        )}
      </div>
    </div>
  );
}
