"use client";

import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Calendar, Save, Award, Info, AlertCircle, CheckCircle2, ShieldCheck, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface EmployeeLeaveData {
  id?: number;
  employee_id: number;
  year: number;
  hak_cuti_n: number;
  sisa_cuti_n1: number;
  cuti_terpakai_n1: number;
  sisa_cuti_n2: number;
  cuti_terpakai_n2: number;
  cuti_terpakai_n0: number;
  catatan?: string | null;
  hak_n1_diakui: number;
  hak_n2_diakui: number;
  total_hak_cuti: number;
  sisa_cuti_tersedia: number;
  is_eligible_24_days: boolean;
}

interface EmployeeLeaveTabProps {
  employeeId: string;
}

export function EmployeeLeaveTab({ employeeId }: EmployeeLeaveTabProps) {
  const queryClient = useQueryClient();
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);

  const [form, setForm] = useState({
    hak_cuti_n: 12,
    sisa_cuti_n1: 0,
    cuti_terpakai_n1: 0,
    sisa_cuti_n2: 0,
    cuti_terpakai_n2: 0,
    cuti_terpakai_n0: 0,
    catatan: "",
  });

  const { data: leaveData, isLoading } = useQuery({
    queryKey: ["employeeLeave", employeeId, selectedYear],
    queryFn: async () => {
      const { data } = await api.get<{ data: EmployeeLeaveData }>(
        `/kepegawaian/employees/${employeeId}/leaves?year=${selectedYear}`
      );
      return data.data;
    },
  });

  // Sync form state whenever leaveData changes or refetches
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (leaveData) {
      setForm({
        hak_cuti_n: leaveData.hak_cuti_n ?? 12,
        sisa_cuti_n1: leaveData.sisa_cuti_n1 ?? 0,
        cuti_terpakai_n1: leaveData.cuti_terpakai_n1 ?? 0,
        sisa_cuti_n2: leaveData.sisa_cuti_n2 ?? 0,
        cuti_terpakai_n2: leaveData.cuti_terpakai_n2 ?? 0,
        cuti_terpakai_n0: leaveData.cuti_terpakai_n0 ?? 0,
        catatan: leaveData.catatan || "",
      });
    }
  }, [leaveData]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Real-time calculation based on BKN PNS Leave Rules (PerBKN 24/2017 & 7/2021)
  const calc = useMemo(() => {
    const hakN = Math.max(0, form.hak_cuti_n || 12);

    // Sisa N-1 diakui max 6 hari
    const sisaN1Raw = Math.max(0, form.sisa_cuti_n1 || 0);
    const hakN1 = Math.min(6, sisaN1Raw);

    // Akumulasi 24 hari: Syarat 0 terpakai di N-1 dan 0 terpakai di N-2 serta sisa >= 12
    const usedN1 = Math.max(0, form.cuti_terpakai_n1 || 0);
    const usedN2 = Math.max(0, form.cuti_terpakai_n2 || 0);
    const sisaN2Raw = Math.max(0, form.sisa_cuti_n2 || 0);

    const isEligible24 = usedN1 === 0 && usedN2 === 0 && sisaN1Raw >= 12 && sisaN2Raw >= 12;
    const hakN2 = isEligible24 ? 6 : 0;

    const totalHak = hakN + hakN1 + hakN2;
    const usedN0 = Math.max(0, form.cuti_terpakai_n0 || 0);
    const sisaTersedia = Math.max(0, totalHak - usedN0);

    return {
      hakN,
      hakN1,
      hakN2,
      isEligible24,
      totalHak,
      usedN0,
      sisaTersedia,
    };
  }, [form]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        year: selectedYear,
        hak_cuti_n: form.hak_cuti_n,
        sisa_cuti_n1: form.sisa_cuti_n1,
        cuti_terpakai_n1: form.cuti_terpakai_n1,
        sisa_cuti_n2: form.sisa_cuti_n2,
        cuti_terpakai_n2: form.cuti_terpakai_n2,
        cuti_terpakai_n0: form.cuti_terpakai_n0,
        catatan: form.catatan,
      };
      await api.post(`/kepegawaian/employees/${employeeId}/leaves`, payload);
    },
    onSuccess: () => {
      toast.success("Saldo & Hak Cuti Pegawai berhasil diperbarui!");
      queryClient.invalidateQueries({ queryKey: ["employeeLeave", employeeId, selectedYear] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Gagal menyimpan saldo cuti.");
    },
  });

  return (
    <div className="space-y-6">
      {/* Header Selector & Title */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            <h3 className="text-base font-bold text-slate-900">Manajemen Hak Cuti PNS</h3>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Penghitungan otomatis hak cuti tahunan sesuai <span className="font-semibold text-slate-700">Peraturan BKN No. 24 Tahun 2017 & No. 7 Tahun 2021</span>.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-slate-600">Tahun Kalender:</label>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            {[currentYear + 1, currentYear, currentYear - 1, currentYear - 2].map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="p-8 text-center text-xs text-slate-400">
          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          Memuat data saldo cuti...
        </div>
      ) : (
        <>
          {/* Top Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Total Hak Cuti Tahun Ini */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl p-4 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-blue-700">Total Hak Cuti {selectedYear}</span>
                <Award className="w-4 h-4 text-blue-600" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-blue-900">{calc.totalHak}</span>
                <span className="text-xs font-bold text-blue-600">Hari Kerja</span>
              </div>
              <span className="text-[11px] text-blue-600/80 block mt-1">
                (12 Hari Utama + {calc.hakN1} Hari Sisa {selectedYear - 1} + {calc.hakN2} Hari Sisa {selectedYear - 2})
              </span>
            </div>

            {/* Sisa Cuti Tersedia Saat Ini */}
            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100 rounded-2xl p-4 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-emerald-700">Sisa Cuti Tersedia</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-emerald-900">{calc.sisaTersedia}</span>
                <span className="text-xs font-bold text-emerald-600">Hari Kerja</span>
              </div>
              <span className="text-[11px] text-emerald-600/80 block mt-1">
                Terpakai tahun ini: <span className="font-bold">{calc.usedN0} Hari</span>
              </span>
            </div>

            {/* Status Akumulasi Klausa 24 Hari */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-600 block mb-1">Status Akumulasi Cuti</span>
                {calc.isEligible24 ? (
                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-100/80 px-2.5 py-1 rounded-lg w-fit">
                    <ShieldCheck className="w-4 h-4 shrink-0" />
                    <span>Akumulasi 24 Hari Aktif</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 bg-slate-200/70 px-2.5 py-1 rounded-lg w-fit">
                    <Clock className="w-4 h-4 text-slate-500 shrink-0" />
                    <span>Maksimal Standar 18 Hari</span>
                  </div>
                )}
              </div>
              <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">
                {calc.isEligible24
                  ? "2 Tahun berturut-turut tidak ada cuti terpakai (0 hari). Kuota maksimal 24 hari diizinkan."
                  : "Terdapat pemakaian cuti di 2 tahun sebelumnya. Kuota diakumulasikan maksimal 18 hari."}
              </p>
            </div>
          </div>

          {/* Form Input Admin Kepegawaian */}
          <div className="bg-slate-50/50 border border-slate-200 rounded-2xl p-5 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Info className="w-4 h-4 text-blue-500" />
                Rincian Cuti Per Tahun ($N$, $N-1$, $N-2$)
              </span>
              <span className="text-[11px] text-slate-400 font-medium">Input Khusus Admin Kepegawaian</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* Block N-2 (2 Tahun Lalu) */}
              <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="text-xs font-bold text-slate-700">Tahun {selectedYear - 2} ($N-2$)</span>
                  <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-semibold">
                    Diakui: +{calc.hakN2} Hari
                  </span>
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-600">Sisa Cuti Tahun {selectedYear - 2}</label>
                  <Input
                    type="number"
                    min={0}
                    max={30}
                    value={form.sisa_cuti_n2}
                    onChange={(e) => setForm({ ...form, sisa_cuti_n2: Number(e.target.value) })}
                    className="mt-1 h-9 text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-600">Cuti Terpakai Tahun {selectedYear - 2}</label>
                  <Input
                    type="number"
                    min={0}
                    max={30}
                    value={form.cuti_terpakai_n2}
                    onChange={(e) => setForm({ ...form, cuti_terpakai_n2: Number(e.target.value) })}
                    className="mt-1 h-9 text-xs font-semibold"
                  />
                </div>
              </div>

              {/* Block N-1 (Tahun Lalu) */}
              <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="text-xs font-bold text-slate-700">Tahun {selectedYear - 1} ($N-1$)</span>
                  <span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md font-semibold">
                    Diakui: +{calc.hakN1} Hari (Max 6)
                  </span>
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-600">Sisa Cuti Tahun {selectedYear - 1}</label>
                  <Input
                    type="number"
                    min={0}
                    max={30}
                    value={form.sisa_cuti_n1}
                    onChange={(e) => setForm({ ...form, sisa_cuti_n1: Number(e.target.value) })}
                    className="mt-1 h-9 text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-600">Cuti Terpakai Tahun {selectedYear - 1}</label>
                  <Input
                    type="number"
                    min={0}
                    max={30}
                    value={form.cuti_terpakai_n1}
                    onChange={(e) => setForm({ ...form, cuti_terpakai_n1: Number(e.target.value) })}
                    className="mt-1 h-9 text-xs font-semibold"
                  />
                </div>
              </div>

              {/* Block N (Tahun Berjalan) */}
              <div className="bg-white border border-blue-200 rounded-xl p-4 space-y-3 shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="text-xs font-bold text-blue-800">Tahun {selectedYear} ($N$)</span>
                  <span className="text-[10px] bg-blue-600 text-white px-2 py-0.5 rounded-md font-semibold">
                    Pokok: {calc.hakN} Hari
                  </span>
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-600">Hak Cuti Pokok Tahun {selectedYear}</label>
                  <Input
                    type="number"
                    min={0}
                    max={30}
                    value={form.hak_cuti_n}
                    onChange={(e) => setForm({ ...form, hak_cuti_n: Number(e.target.value) })}
                    className="mt-1 h-9 text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-600">Cuti Terpakai Tahun {selectedYear}</label>
                  <Input
                    type="number"
                    min={0}
                    max={30}
                    value={form.cuti_terpakai_n0}
                    onChange={(e) => setForm({ ...form, cuti_terpakai_n0: Number(e.target.value) })}
                    className="mt-1 h-9 text-xs font-semibold"
                  />
                </div>
              </div>
            </div>

            {/* Catatan / Keterangan Penangguhan */}
            <div>
              <label className="text-[11px] font-semibold text-slate-700">Catatan / Keterangan Penangguhan Cuti (Opsional)</label>
              <Textarea
                rows={2}
                value={form.catatan}
                onChange={(e) => setForm({ ...form, catatan: e.target.value })}
                placeholder="Contoh: Penangguhan Cuti Tahunan No. ST-102/2025 untuk tugas kedinasan mendesak..."
                className="mt-1 text-xs"
              />
            </div>

            {/* Action Bar */}
            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span>
                  Sisa cuti $N-1$ yang tersisa 7-12 hari secara otomatis dibatasi diakui 6 hari sesuai PerBKN 24/2017.
                </span>
              </div>

              <Button
                type="button"
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-5 h-9 rounded-xl shadow-sm gap-2"
              >
                <Save className="w-3.5 h-3.5" />
                {saveMutation.isPending ? "Menyimpan..." : "Simpan Saldo Cuti"}
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
