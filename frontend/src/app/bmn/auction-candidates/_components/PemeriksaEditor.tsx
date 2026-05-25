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
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Pemeriksa</h3>
        <Button size="xs" variant="outline" className="rounded-lg gap-1" onClick={onAdd}>
          <Plus className="h-3 w-3" />
          Tambah
        </Button>
      </div>
      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
        Daftar pemeriksa BMN yang akan ditampilkan pada berita acara.
      </p>
      <div className="mt-3 space-y-3">
        {pemeriksaList.map((item) => (
          <div key={item.id} className="rounded-xl border border-zinc-200 bg-zinc-50/60 p-2.5 dark:border-zinc-800 dark:bg-zinc-900/50">
            <div className="flex items-center gap-2">
              <select
                value=""
                onChange={(e) => onSelectEmployee(item.id, e.target.value, employees)}
                className="h-8 flex-1 rounded-lg border border-zinc-200 bg-white px-2 text-xs text-zinc-900 outline-none focus:ring-1 focus:ring-orange-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
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
                className="rounded-md gap-1"
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
              className="mt-2 h-8 w-full rounded-lg border border-zinc-200 bg-white px-2 text-xs text-zinc-900 outline-none focus:ring-1 focus:ring-orange-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
            />
            <input
              value={item.nip}
              onChange={(e) => onUpdate(item.id, "nip", e.target.value)}
              placeholder="NIP"
              className="mt-2 h-8 w-full rounded-lg border border-zinc-200 bg-white px-2 text-xs text-zinc-900 outline-none focus:ring-1 focus:ring-orange-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
            />
            <input
              value={item.jabatan}
              onChange={(e) => onUpdate(item.id, "jabatan", e.target.value)}
              placeholder="Jabatan"
              className="mt-2 h-8 w-full rounded-lg border border-zinc-200 bg-white px-2 text-xs text-zinc-900 outline-none focus:ring-1 focus:ring-orange-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
            />
          </div>
        ))}
        {pemeriksaList.length === 0 && (
          <p className="rounded-lg border border-dashed border-zinc-300 p-3 text-center text-xs text-zinc-400">
            Belum ada pemeriksa. Klik Tambah untuk menambahkan.
          </p>
        )}
      </div>
    </div>
  );
}
