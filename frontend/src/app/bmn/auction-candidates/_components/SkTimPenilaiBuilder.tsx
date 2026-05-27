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
} from "../_lib/sk-defaults";
import type { SkTimPenilaiMemutuskan } from "../_lib/sk-tim-penilai-defaults";

interface EmployeeOption {
  id: string | number;
  nama_lengkap?: string;
  name?: string;
  nip?: string | null;
}

interface SkTimPenilaiBuilderProps {
  menimbang: SkBuilderItem[];
  setMenimbang: (items: SkBuilderItem[]) => void;
  mengingat: SkBuilderItem[];
  setMengingat: (items: SkBuilderItem[]) => void;
  memutuskan: SkTimPenilaiMemutuskan;
  setMemutuskan: (m: SkTimPenilaiMemutuskan) => void;
  kepalaBalai: SkKepalaBalai;
  setKepalaBalai: (kb: SkKepalaBalai) => void;
  tembusan: SkBuilderItem[];
  setTembusan: (items: SkBuilderItem[]) => void;
}

export function SkTimPenilaiBuilder({
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
}: SkTimPenilaiBuilderProps) {
  const { data: employees = [], isLoading: isLoadingEmployees } = useQuery<EmployeeOption[]>({
    queryKey: ["employees-select-sk-tim-penilai-builder"],
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

  const updateMenimbang = (id: string, text: string) => {
    setMenimbang(menimbang.map((m) => (m.id === id ? { ...m, text } : m)));
  };
  const addMenimbang = () => setMenimbang([...menimbang, newSkBuilderItem("")]);
  const removeMenimbang = (id: string) => {
    if (menimbang.length <= 1) return;
    setMenimbang(menimbang.filter((m) => m.id !== id));
  };

  const updateMengingat = (id: string, text: string) => {
    setMengingat(mengingat.map((m) => (m.id === id ? { ...m, text } : m)));
  };
  const addMengingat = () => setMengingat([...mengingat, newSkBuilderItem("")]);
  const removeMengingat = (id: string) => {
    if (mengingat.length <= 1) return;
    setMengingat(mengingat.filter((m) => m.id !== id));
  };

  const updateMemutuskan = (key: keyof SkTimPenilaiMemutuskan, value: string) => {
    setMemutuskan({ ...memutuskan, [key]: value });
  };

  const handleSelectKepalaBalai = (employeeId: string) => {
    if (!employeeId) return;
    const emp = sortedEmployees.find((e) => String(e.id) === employeeId);
    if (!emp) return;
    const fullName = (emp.nama_lengkap || emp.name || "").toUpperCase();
    setKepalaBalai({ nama: fullName, nip: formatNip(emp.nip || "") });
  };

  const updateTembusan = (id: string, text: string) => {
    setTembusan(tembusan.map((t) => (t.id === id ? { ...t, text } : t)));
  };
  const addTembusan = () => setTembusan([...tembusan, newSkBuilderItem("")]);
  const removeTembusan = (id: string) => {
    setTembusan(tembusan.filter((t) => t.id !== id));
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Menimbang</h3>
          <Button size="xs" variant="outline" className="rounded-lg gap-1" onClick={addMenimbang}>
            <Plus className="h-3 w-3" />
            Tambah
          </Button>
        </div>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          Item akan diberi label a, b, c, ... pada dokumen.
        </p>
        <div className="mt-3 space-y-3">
          {menimbang.map((item, index) => (
            <div key={item.id} className="rounded-xl border border-zinc-200 bg-zinc-50/60 p-2.5 dark:border-zinc-800 dark:bg-zinc-900/50">
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wide text-zinc-500">
                  Menimbang {String.fromCharCode(97 + index)}
                </span>
                <Button
                  size="xs"
                  variant="destructive"
                  className="rounded-md gap-1"
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
                className="min-h-[72px] text-xs"
              />
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Mengingat</h3>
          <Button size="xs" variant="outline" className="rounded-lg gap-1" onClick={addMengingat}>
            <Plus className="h-3 w-3" />
            Tambah
          </Button>
        </div>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          Item akan diberi nomor 1, 2, 3, ... pada dokumen.
        </p>
        <div className="mt-3 space-y-3">
          {mengingat.map((item, index) => (
            <div key={item.id} className="rounded-xl border border-zinc-200 bg-zinc-50/60 p-2.5 dark:border-zinc-800 dark:bg-zinc-900/50">
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wide text-zinc-500">
                  Mengingat {index + 1}
                </span>
                <Button
                  size="xs"
                  variant="destructive"
                  className="rounded-md gap-1"
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
                className="min-h-[72px] text-xs"
              />
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Memutuskan</h3>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          Bagian Menetapkan, KESATU, KEDUA, KETIGA, dan KEEMPAT dari keputusan.
        </p>
        <div className="mt-3 space-y-3">
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wide text-zinc-500">Menetapkan</label>
            <Textarea
              value={memutuskan.menetapkan}
              onChange={(e) => updateMemutuskan("menetapkan", e.target.value)}
              className="mt-1 min-h-[80px] text-xs"
            />
          </div>
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wide text-zinc-500">KESATU</label>
            <Textarea
              value={memutuskan.kesatu}
              onChange={(e) => updateMemutuskan("kesatu", e.target.value)}
              className="mt-1 min-h-[80px] text-xs"
            />
          </div>
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wide text-zinc-500">KEDUA</label>
            <Textarea
              value={memutuskan.kedua}
              onChange={(e) => updateMemutuskan("kedua", e.target.value)}
              className="mt-1 min-h-[140px] text-xs"
            />
          </div>
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wide text-zinc-500">KETIGA</label>
            <Textarea
              value={memutuskan.ketiga}
              onChange={(e) => updateMemutuskan("ketiga", e.target.value)}
              className="mt-1 min-h-[64px] text-xs"
            />
          </div>
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wide text-zinc-500">KEEMPAT</label>
            <Textarea
              value={memutuskan.keempat}
              onChange={(e) => updateMemutuskan("keempat", e.target.value)}
              className="mt-1 min-h-[64px] text-xs"
            />
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Kepala Balai</h3>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          Pilih pegawai untuk mengisi nama dan NIP penandatangan.
        </p>
        <div className="mt-3 space-y-2">
          <select
            className="h-9 w-full rounded-lg border border-zinc-200 bg-white px-2 text-xs text-zinc-900 outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
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
          <div className="rounded-lg bg-zinc-50 p-3 text-xs dark:bg-zinc-950/50">
            <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-400">Nama</p>
            <p className="mt-0.5 font-semibold text-zinc-900 dark:text-zinc-100">
              {kepalaBalai.nama || "—"}
            </p>
            <p className="mt-2 text-[10px] font-bold uppercase tracking-wide text-zinc-400">NIP</p>
            <p className="mt-0.5 font-mono text-zinc-700 dark:text-zinc-300">
              {kepalaBalai.nip ? `NIP. ${kepalaBalai.nip}` : "—"}
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Tembusan</h3>
          <Button size="xs" variant="outline" className="rounded-lg gap-1" onClick={addTembusan}>
            <Plus className="h-3 w-3" />
            Tambah
          </Button>
        </div>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          Item akan diberi nomor 1, 2, 3, ... pada dokumen.
        </p>
        <div className="mt-3 space-y-3">
          {tembusan.map((item, index) => (
            <div key={item.id} className="rounded-xl border border-zinc-200 bg-zinc-50/60 p-2.5 dark:border-zinc-800 dark:bg-zinc-900/50">
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wide text-zinc-500">
                  Tembusan {index + 1}
                </span>
                <Button
                  size="xs"
                  variant="destructive"
                  className="rounded-md gap-1"
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
                className="min-h-[48px] text-xs"
              />
            </div>
          ))}
          {tembusan.length === 0 && (
            <p className="rounded-lg border border-dashed border-zinc-300 p-3 text-center text-xs text-zinc-400">
              Belum ada tembusan. Klik Tambah untuk menambahkan.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
