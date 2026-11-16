"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  formatNip,
  newSkBuilderItem,
  type SkBuilderItem,
  type SkKepalaBalai,
  type SkMemutuskan,
} from "../_lib/sk-defaults";

interface EmployeeOption {
  id: string | number;
  nama_lengkap?: string;
  name?: string;
  nip?: string | null;
}

interface SkBuilderProps {
  menimbang: SkBuilderItem[];
  setMenimbang: (items: SkBuilderItem[]) => void;
  mengingat: SkBuilderItem[];
  setMengingat: (items: SkBuilderItem[]) => void;
  memutuskan: SkMemutuskan;
  setMemutuskan: (m: SkMemutuskan) => void;
  kepalaBalai: SkKepalaBalai;
  setKepalaBalai: (kb: SkKepalaBalai) => void;
  tembusan: SkBuilderItem[];
  setTembusan: (items: SkBuilderItem[]) => void;
}

export function SkBuilder({
  menimbang,
  setMenimbang,
  mengingat,
  setMengingat,
  memutuskan,
  setMemutuskan,
  kepalaBalai,
  setKepalaBalai,
  tembusan,
  setTembusan,
}: SkBuilderProps) {
  const { data: employees = [], isLoading: isLoadingEmployees } = useQuery<EmployeeOption[]>({
    queryKey: ["employees-select-sk-builder"],
    queryFn: async () => {
      const res = await api.get("/kepegawaian/employees/select");
      return res.data?.data || res.data || [];
    },
  });

  const sortedEmployees = useMemo(() => {
    const list = Array.isArray(employees) ? [...employees] : [];
    return list.sort((a, b) => {
      const an = (a.nama_lengkap || a.name || "").toLowerCase();
      const bn = (b.nama_lengkap || b.name || "").toLowerCase();
      return an.localeCompare(bn);
    });
  }, [employees]);

  // -- Menimbang handlers --
  const updateMenimbang = (id: string, text: string) => {
    setMenimbang(menimbang.map((m) => (m.id === id ? { ...m, text } : m)));
  };
  const addMenimbang = () => {
    setMenimbang([...menimbang, newSkBuilderItem("")]);
  };
  const removeMenimbang = (id: string) => {
    if (menimbang.length <= 1) return;
    setMenimbang(menimbang.filter((m) => m.id !== id));
  };

  // -- Mengingat handlers --
  const updateMengingat = (id: string, text: string) => {
    setMengingat(mengingat.map((m) => (m.id === id ? { ...m, text } : m)));
  };
  const addMengingat = () => {
    setMengingat([...mengingat, newSkBuilderItem("")]);
  };
  const removeMengingat = (id: string) => {
    if (mengingat.length <= 1) return;
    setMengingat(mengingat.filter((m) => m.id !== id));
  };

  // -- Memutuskan handler --
  const updateMemutuskan = (key: keyof SkMemutuskan, value: string) => {
    setMemutuskan({ ...memutuskan, [key]: value });
  };

  // -- Kepala Balai handler --
  const handleSelectKepalaBalai = (employeeId: string) => {
    if (!employeeId) {
      return;
    }
    const emp = sortedEmployees.find((e) => String(e.id) === employeeId);
    if (!emp) return;
    const fullName = (emp.nama_lengkap || emp.name || "").toUpperCase();
    setKepalaBalai({
      nama: fullName,
      nip: formatNip(emp.nip || ""),
    });
  };

  // -- Tembusan handlers --
  const updateTembusan = (id: string, text: string) => {
    setTembusan(tembusan.map((t) => (t.id === id ? { ...t, text } : t)));
  };
  const addTembusan = () => {
    setTembusan([...tembusan, newSkBuilderItem("")]);
  };
  const removeTembusan = (id: string) => {
    setTembusan(tembusan.filter((t) => t.id !== id));
  };

  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-slate-200/80 dark:border-zinc-800 bg-[var(--ds-surface)] p-4 shadow-xs">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-[var(--ds-fg)]">Menimbang</h3>
          <Button size="xs" variant="outline" className="rounded-lg gap-1" onClick={addMenimbang}>
            <Plus className="h-3 w-3" />
            Tambah
          </Button>
        </div>
        <p className="mt-1 text-xs text-[var(--ds-fg-muted)]">
          Item akan diberi label a, b, c, ... pada dokumen.
        </p>
        <div className="mt-3 space-y-3">
          {menimbang.map((item, index) => (
            <div key={item.id} className="rounded-lg border border-slate-200/80 dark:border-zinc-800 bg-[var(--ds-surface-muted)] p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wide text-[var(--ds-fg-muted)]">
                  Menimbang {String.fromCharCode(97 + index)}
                </span>
                <Button
                  size="xs"
                  variant="destructive"
                  className="rounded-lg gap-1"
                  onClick={() => removeMenimbang(item.id)}
                  disabled={menimbang.length <= 1}
                >
                  <Trash2 className="h-3 w-3" />
                  Hapus
                </Button>
              </div>
              <Textarea
                value={item.text}
                onChange={(e) => updateMenimbang(item.id, e.target.value)}
                placeholder="Tulis isi menimbang..."
                className="min-h-18 text-xs"
              />
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200/80 dark:border-zinc-800 bg-[var(--ds-surface)] p-4 shadow-xs">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-[var(--ds-fg)]">Mengingat</h3>
          <Button size="xs" variant="outline" className="rounded-lg gap-1" onClick={addMengingat}>
            <Plus className="h-3 w-3" />
            Tambah
          </Button>
        </div>
        <p className="mt-1 text-xs text-[var(--ds-fg-muted)]">
          Item akan diberi nomor 1, 2, 3, ... pada dokumen.
        </p>
        <div className="mt-3 space-y-3">
          {mengingat.map((item, index) => (
            <div key={item.id} className="rounded-lg border border-slate-200/80 dark:border-zinc-800 bg-[var(--ds-surface-muted)] p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wide text-[var(--ds-fg-muted)] tabular-nums">
                  Mengingat {index + 1}
                </span>
                <Button
                  size="xs"
                  variant="destructive"
                  className="rounded-lg gap-1"
                  onClick={() => removeMengingat(item.id)}
                  disabled={mengingat.length <= 1}
                >
                  <Trash2 className="h-3 w-3" />
                  Hapus
                </Button>
              </div>
              <Textarea
                value={item.text}
                onChange={(e) => updateMengingat(item.id, e.target.value)}
                placeholder="Tulis isi mengingat..."
                className="min-h-18 text-xs"
              />
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200/80 dark:border-zinc-800 bg-[var(--ds-surface)] p-4 shadow-xs">
        <h3 className="text-sm font-bold text-[var(--ds-fg)]">Memutuskan</h3>
        <p className="mt-1 text-xs text-[var(--ds-fg-muted)]">
          Bagian Menetapkan, KESATU, KEDUA, dan KETIGA dari keputusan.
        </p>
        <div className="mt-3 space-y-3">
          <div>
            <label className="text-xs font-bold uppercase tracking-wide text-[var(--ds-fg-muted)]">Menetapkan</label>
            <Textarea
              value={memutuskan.menetapkan}
              onChange={(e) => updateMemutuskan("menetapkan", e.target.value)}
              className="mt-1 min-h-20 text-xs"
            />
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-wide text-[var(--ds-fg-muted)]">KESATU</label>
            <Textarea
              value={memutuskan.kesatu}
              onChange={(e) => updateMemutuskan("kesatu", e.target.value)}
              className="mt-1 min-h-20 text-xs"
            />
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-wide text-[var(--ds-fg-muted)]">KEDUA</label>
            <Textarea
              value={memutuskan.kedua}
              onChange={(e) => updateMemutuskan("kedua", e.target.value)}
              className="mt-1 min-h-16 text-xs"
            />
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-wide text-[var(--ds-fg-muted)]">KETIGA</label>
            <Textarea
              value={memutuskan.ketiga}
              onChange={(e) => updateMemutuskan("ketiga", e.target.value)}
              className="mt-1 min-h-14 text-xs"
            />
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200/80 dark:border-zinc-800 bg-[var(--ds-surface)] p-4 shadow-xs">
        <h3 className="text-sm font-bold text-[var(--ds-fg)]">Kepala Balai</h3>
        <p className="mt-1 text-xs text-[var(--ds-fg-muted)]">
          Pilih pegawai untuk mengisi nama dan NIP penandatangan.
        </p>
        <div className="mt-3 space-y-2">
          <select
            className="h-9 w-full rounded-lg border border-slate-200/80 dark:border-zinc-800 bg-[var(--ds-surface)] px-2 text-xs text-[var(--ds-fg)] outline-none focus:border-[var(--ds-status-warning-border)] focus:ring-2 focus:ring-[var(--ds-status-warning-bg)]"
            onChange={(e) => handleSelectKepalaBalai(e.target.value)}
            defaultValue=""
            disabled={isLoadingEmployees}
          >
            <option value="" disabled>
              {isLoadingEmployees ? "Memuat pegawai..." : "Pilih pegawai..."}
            </option>
            {sortedEmployees.map((emp) => {
              const label = emp.nama_lengkap || emp.name || "(tanpa nama)";
              return (
                <option key={emp.id} value={String(emp.id)}>
                  {label}
                  {emp.nip ? ` — ${emp.nip}` : ""}
                </option>
              );
            })}
          </select>
          <div className="rounded-lg bg-[var(--ds-surface-muted)] p-3 text-xs">
            <p className="text-xs font-bold uppercase tracking-wide text-[var(--ds-fg-muted)]">Nama</p>
            <p className="mt-1 font-semibold text-[var(--ds-fg)]">
              {kepalaBalai.nama || "—"}
            </p>
            <p className="mt-2 text-xs font-bold uppercase tracking-wide text-[var(--ds-fg-muted)]">NIP</p>
            <p className="mt-1 font-mono text-[var(--ds-fg-secondary)] tabular-nums">
              {kepalaBalai.nip ? `NIP. ${kepalaBalai.nip}` : "—"}
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200/80 dark:border-zinc-800 bg-[var(--ds-surface)] p-4 shadow-xs">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-[var(--ds-fg)]">Tembusan</h3>
          <Button size="xs" variant="outline" className="rounded-lg gap-1" onClick={addTembusan}>
            <Plus className="h-3 w-3" />
            Tambah
          </Button>
        </div>
        <p className="mt-1 text-xs text-[var(--ds-fg-muted)]">
          Item akan diberi nomor 1, 2, 3, ... pada dokumen.
        </p>
        <div className="mt-3 space-y-3">
          {tembusan.map((item, index) => (
            <div key={item.id} className="rounded-lg border border-slate-200/80 dark:border-zinc-800 bg-[var(--ds-surface-muted)] p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wide text-[var(--ds-fg-muted)] tabular-nums">
                  Tembusan {index + 1}
                </span>
                <Button
                  size="xs"
                  variant="destructive"
                  className="rounded-lg gap-1"
                  onClick={() => removeTembusan(item.id)}
                >
                  <Trash2 className="h-3 w-3" />
                  Hapus
                </Button>
              </div>
              <Textarea
                value={item.text}
                onChange={(e) => updateTembusan(item.id, e.target.value)}
                placeholder="Tulis isi tembusan..."
                className="min-h-12 text-xs"
              />
            </div>
          ))}
          {tembusan.length === 0 && (
            <p className="rounded-lg border border-dashed border-slate-200/80 dark:border-zinc-800 p-3 text-center text-xs text-[var(--ds-fg-muted)]">
              Belum ada tembusan. Klik Tambah untuk menambahkan.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default SkBuilder;
