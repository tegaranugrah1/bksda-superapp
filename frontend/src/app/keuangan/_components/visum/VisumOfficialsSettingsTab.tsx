"use client";

import React, { useState } from "react";
import { Building2, UserCheck, Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import api from "@/lib/api";
import {
  VisumSpdSettings,
  PpkSettingItem,
  RegionalOfficialItem,
} from "../VisumManageTemplatesModal";

interface VisumOfficialsSettingsTabProps {
  settings: VisumSpdSettings;
  setSettings: React.Dispatch<React.SetStateAction<VisumSpdSettings | null>>;
  employeeOptions: { id: number; name: string; nip?: string | null; position?: string | null }[];
  onSettingsSaved: (newSettings?: VisumSpdSettings) => void;
}

export function VisumOfficialsSettingsTab({
  settings,
  setSettings,
  employeeOptions,
  onSettingsSaved,
}: VisumOfficialsSettingsTabProps) {
  const [saving, setSaving] = useState(false);

  const handleSelectOfficialEmployee = (
    regionKey: "samarinda" | "berau" | "tenggarong" | "balikpapan",
    employeeId: number
  ) => {
    const emp = employeeOptions.find((e) => e.id === employeeId);
    if (!emp) return;

    const curReg = settings[regionKey];
    setSettings({
      ...settings,
      [regionKey]: {
        ...curReg,
        official_name: emp.name,
        official_nip: emp.nip || curReg.official_nip,
      },
    });
    toast.success(`Data ${emp.name} diterapkan ke Wilayah ${regionKey.toUpperCase()}`);
  };

  const handleSelectPpkEmployee = (employeeId: number, target: "dipa" | "folu") => {
    const emp = employeeOptions.find((e) => e.id === employeeId);
    if (!emp) return;

    if (target === "dipa") {
      const cur = settings.ppk_dipa || settings.ppk;
      const nextPpk: PpkSettingItem = {
        name: emp.name,
        nip: emp.nip || cur?.nip || "19810907 200012 1 004",
        position: cur?.position || "Pejabat Pembuat Komitmen,",
        statement:
          cur?.statement ||
          "Telah diperiksa dengan keterangan bahwa perjalanan tersebut atas perintahnya dan semata-mata untuk kepentingan jabatan dalam waktu yang sesingkat-singkatnya.",
      };
      setSettings({
        ...settings,
        ppk_dipa: nextPpk,
      });
      toast.success(`PPK DIPA diset ke ${emp.name}`);
    } else {
      const cur = settings.ppk_folu || settings.ppk;
      const nextPpk: PpkSettingItem = {
        name: emp.name,
        nip: emp.nip || cur?.nip || "19820301 200012 1 001",
        position: cur?.position || "Pejabat Pembuat Komitmen,",
        statement:
          cur?.statement ||
          "Telah diperiksa dengan keterangan bahwa perjalanan tersebut atas perintahnya dan semata-mata untuk kepentingan jabatan dalam waktu yang sesingkat-singkatnya.",
      };
      setSettings({
        ...settings,
        ppk_folu: nextPpk,
        ppk: nextPpk,
      });
      toast.success(`PPK FOLU diset ke ${emp.name}`);
    }
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      const payload = {
        samarinda: settings.samarinda,
        berau: settings.berau,
        tenggarong: settings.tenggarong,
        balikpapan: settings.balikpapan,
        ppk_dipa: settings.ppk_dipa,
        ppk_folu: settings.ppk_folu || settings.ppk,
        ppk: settings.ppk_folu || settings.ppk,
      };

      const res = await api.post("/api/keuangan/visum/settings", payload);
      if (res.data?.success) {
        toast.success("Pengaturan Pejabat 4 Wilayah & PPK berhasil disimpan!");
        onSettingsSaved(payload as unknown as VisumSpdSettings);
      }
    } catch (err) {
      console.error(err);
      toast.error("Gagal menyimpan pengaturan pejabat");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
          Master Pejabat Penandatangan 4 Wilayah Kerja
        </h3>
        <p className="text-xs text-zinc-500">
          Data pejabat ini akan otomatis terisi saat user menekan salah satu dari 4 tombol cepat wilayah di formulir Visum SPD.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {[
          { key: "samarinda" as const, title: "1. Samarinda (Balai)", roleLabel: "Kasubbag TU", defaultDipaPos: "Kepala Subbagian Tata Usaha," },
          { key: "berau" as const, title: "2. Berau (Wilayah I)", roleLabel: "Kepala Seksi Wil. I", defaultDipaPos: "Kepala Seksi Konservasi Wilayah I," },
          { key: "tenggarong" as const, title: "3. Tenggarong (Wilayah II)", roleLabel: "Kepala Seksi Wil. II", defaultDipaPos: "Kepala Seksi Konservasi Wilayah II," },
          { key: "balikpapan" as const, title: "4. Balikpapan (Wilayah III)", roleLabel: "Kepala Seksi Wil. III", defaultDipaPos: "Kepala Seksi Konservasi Wilayah III," },
        ].map((reg) => {
          const regData = settings[reg.key];
          return (
            <div key={reg.key} className="rounded-2xl border border-zinc-200 bg-zinc-50/70 p-5 dark:border-zinc-800 dark:bg-zinc-900/60 shadow-xs">
              <div className="mb-3.5 flex flex-wrap items-center justify-between gap-2 border-b border-zinc-200/70 pb-2.5 dark:border-zinc-800">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-700 dark:text-amber-400">
                  <Building2 className="h-4 w-4 shrink-0" />
                  <span>{reg.title}</span>
                </div>
                {employeeOptions.length > 0 && (
                  <select
                    onChange={(e) =>
                      handleSelectOfficialEmployee(reg.key, Number(e.target.value))
                    }
                    defaultValue=""
                    className="h-7 rounded-lg border border-zinc-200 bg-white px-2 text-[11px] font-medium text-zinc-700 outline-none hover:bg-zinc-50 focus:border-amber-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 cursor-pointer max-w-[200px]"
                  >
                    <option value="" disabled>
                      Pilih dari Pegawai...
                    </option>
                    {employeeOptions.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name} {emp.position ? `(${emp.position})` : ""}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400">
                    Nama Pejabat ({reg.roleLabel})
                  </label>
                  <input
                    type="text"
                    value={regData?.official_name || ""}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        [reg.key]: { ...regData, official_name: e.target.value },
                      })
                    }
                    className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-900 outline-none focus:border-amber-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400">
                    NIP Pejabat
                  </label>
                  <input
                    type="text"
                    value={regData?.official_nip || ""}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        [reg.key]: { ...regData, official_nip: e.target.value },
                      })
                    }
                    className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 outline-none focus:border-amber-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-blue-700 dark:text-blue-400 flex items-center gap-1">
                    <span>Jabatan Berangkat SPD DIPA (Bagian I - Tanpa a.n.)</span>
                  </label>
                  <textarea
                    rows={2}
                    value={regData?.depart_position_dipa || reg.defaultDipaPos}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        [reg.key]: { ...regData, depart_position_dipa: e.target.value },
                      })
                    }
                    className="mt-1 w-full rounded-xl border border-blue-200 bg-white px-3 py-2 text-xs outline-none focus:border-blue-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                    <span>Jabatan Berangkat SPD FOLU (Bagian I - Pakai a.n.)</span>
                  </label>
                  <textarea
                    rows={2}
                    value={regData?.depart_position_folu || regData?.depart_position || ""}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        [reg.key]: {
                          ...regData,
                          depart_position_folu: e.target.value,
                          depart_position: e.target.value,
                        },
                      })
                    }
                    className="mt-1 w-full rounded-xl border border-emerald-200 bg-white px-3 py-2 text-xs outline-none focus:border-emerald-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400">
                    Jabatan Pengesah Tiba Kembali (Bagian VI)
                  </label>
                  <textarea
                    rows={2}
                    value={regData?.return_position || ""}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        [reg.key]: { ...regData, return_position: e.target.value },
                      })
                    }
                    className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs outline-none focus:border-amber-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Dual PPK Section: PPK DIPA & PPK FOLU */}
      <div className="space-y-4">
        {/* 1. PPK DIPA */}
        <div className="rounded-2xl border border-blue-200 bg-blue-50/40 p-5 dark:border-blue-500/30 dark:bg-blue-500/5 shadow-xs">
          <div className="mb-3.5 flex flex-wrap items-center justify-between gap-2 border-b border-blue-200/60 pb-2.5 dark:border-blue-500/20">
            <div className="flex items-center gap-2 text-xs font-bold text-blue-900 dark:text-blue-300">
              <UserCheck className="h-4 w-4 text-blue-600 shrink-0" />
              <span>1. Pejabat Pembuat Komitmen (PPK) — Anggaran DIPA</span>
            </div>
            {employeeOptions.length > 0 && (
              <select
                onChange={(e) => handleSelectPpkEmployee(Number(e.target.value), "dipa")}
                defaultValue=""
                className="h-7 rounded-lg border border-blue-200 bg-white px-2 text-[11px] font-medium text-zinc-700 outline-none hover:bg-zinc-50 focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 cursor-pointer max-w-[220px]"
              >
                <option value="" disabled>
                  Pilih Pegawai PPK DIPA...
                </option>
                {employeeOptions.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} {emp.position ? `(${emp.position})` : ""}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
                Nama PPK DIPA
              </label>
              <input
                type="text"
                value={settings.ppk_dipa?.name || "RUSMANTO, S.Hut"}
                onChange={(e) => {
                  const cur = settings.ppk_dipa || settings.ppk;
                  setSettings({
                    ...settings,
                    ppk_dipa: {
                      name: e.target.value,
                      nip: cur?.nip || "19810907 200012 1 004",
                      position: cur?.position || "Pejabat Pembuat Komitmen,",
                      statement:
                        cur?.statement ||
                        "Telah diperiksa dengan keterangan bahwa perjalanan tersebut atas perintahnya dan semata-mata untuk kepentingan jabatan dalam waktu yang sesingkat-singkatnya.",
                    },
                  });
                }}
                className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-900 outline-none focus:border-blue-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
                NIP PPK DIPA
              </label>
              <input
                type="text"
                value={settings.ppk_dipa?.nip || "19810907 200012 1 004"}
                onChange={(e) => {
                  const cur = settings.ppk_dipa || settings.ppk;
                  setSettings({
                    ...settings,
                    ppk_dipa: {
                      name: cur?.name || "RUSMANTO, S.Hut",
                      nip: e.target.value,
                      position: cur?.position || "Pejabat Pembuat Komitmen,",
                      statement:
                        cur?.statement ||
                        "Telah diperiksa dengan keterangan bahwa perjalanan tersebut atas perintahnya dan semata-mata untuk kepentingan jabatan dalam waktu yang sesingkat-singkatnya.",
                    },
                  });
                }}
                className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 outline-none focus:border-blue-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
                Keterangan Pernyataan PPK DIPA (Bagian VI Kanan)
              </label>
              <textarea
                rows={2}
                value={
                  settings.ppk_dipa?.statement ||
                  "Telah diperiksa dengan keterangan bahwa perjalanan tersebut atas perintahnya dan semata-mata untuk kepentingan jabatan dalam waktu yang sesingkat-singkatnya."
                }
                onChange={(e) => {
                  const cur = settings.ppk_dipa || settings.ppk;
                  setSettings({
                    ...settings,
                    ppk_dipa: {
                      name: cur?.name || "RUSMANTO, S.Hut",
                      nip: cur?.nip || "19810907 200012 1 004",
                      position: cur?.position || "Pejabat Pembuat Komitmen,",
                      statement: e.target.value,
                    },
                  });
                }}
                className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs outline-none focus:border-blue-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
              />
            </div>
          </div>
        </div>

        {/* 2. PPK FOLU */}
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-5 dark:border-emerald-500/30 dark:bg-emerald-500/5 shadow-xs">
          <div className="mb-3.5 flex flex-wrap items-center justify-between gap-2 border-b border-emerald-200/60 pb-2.5 dark:border-emerald-500/20">
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-900 dark:text-emerald-300">
              <UserCheck className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>2. Pejabat Pembuat Komitmen (PPK) — Anggaran FOLU Net Sink 2030</span>
            </div>
            {employeeOptions.length > 0 && (
              <select
                onChange={(e) => handleSelectPpkEmployee(Number(e.target.value), "folu")}
                defaultValue=""
                className="h-7 rounded-lg border border-emerald-200 bg-white px-2 text-[11px] font-medium text-zinc-700 outline-none hover:bg-zinc-50 focus:border-emerald-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 cursor-pointer max-w-[220px]"
              >
                <option value="" disabled>
                  Pilih Pegawai PPK FOLU...
                </option>
                {employeeOptions.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} {emp.position ? `(${emp.position})` : ""}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
                Nama PPK FOLU
              </label>
              <input
                type="text"
                value={settings.ppk_folu?.name || settings.ppk?.name || "Ahmad Hidayat, S.PKP., M.Ling"}
                onChange={(e) => {
                  const cur = settings.ppk_folu || settings.ppk;
                  const nextPpk: PpkSettingItem = {
                    name: e.target.value,
                    nip: cur?.nip || "19820301 200012 1 001",
                    position: cur?.position || "Pejabat Pembuat Komitmen,",
                    statement:
                      cur?.statement ||
                      "Telah diperiksa dengan keterangan bahwa perjalanan tersebut atas perintahnya dan semata-mata untuk kepentingan jabatan dalam waktu yang sesingkat-singkatnya.",
                  };
                  setSettings({
                    ...settings,
                    ppk_folu: nextPpk,
                    ppk: nextPpk,
                  });
                }}
                className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-900 outline-none focus:border-emerald-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
                NIP PPK FOLU
              </label>
              <input
                type="text"
                value={settings.ppk_folu?.nip || settings.ppk?.nip || "19820301 200012 1 001"}
                onChange={(e) => {
                  const cur = settings.ppk_folu || settings.ppk;
                  const nextPpk: PpkSettingItem = {
                    name: cur?.name || "Ahmad Hidayat, S.PKP., M.Ling",
                    nip: e.target.value,
                    position: cur?.position || "Pejabat Pembuat Komitmen,",
                    statement:
                      cur?.statement ||
                      "Telah diperiksa dengan keterangan bahwa perjalanan tersebut atas perintahnya dan semata-mata untuk kepentingan jabatan dalam waktu yang sesingkat-singkatnya.",
                  };
                  setSettings({
                    ...settings,
                    ppk_folu: nextPpk,
                    ppk: nextPpk,
                  });
                }}
                className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 outline-none focus:border-emerald-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
                Keterangan Pernyataan PPK FOLU (Bagian VI Kanan)
              </label>
              <textarea
                rows={2}
                value={
                  settings.ppk_folu?.statement ||
                  settings.ppk?.statement ||
                  "Telah diperiksa dengan keterangan bahwa perjalanan tersebut atas perintahnya dan semata-mata untuk kepentingan jabatan dalam waktu yang sesingkat-singkatnya."
                }
                onChange={(e) => {
                  const cur = settings.ppk_folu || settings.ppk;
                  const nextPpk: PpkSettingItem = {
                    name: cur?.name || "Ahmad Hidayat, S.PKP., M.Ling",
                    nip: cur?.nip || "19820301 200012 1 001",
                    position: cur?.position || "Pejabat Pembuat Komitmen,",
                    statement: e.target.value,
                  };
                  setSettings({
                    ...settings,
                    ppk_folu: nextPpk,
                    ppk: nextPpk,
                  });
                }}
                className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs outline-none focus:border-emerald-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end pt-2">
        <Button
          type="button"
          size="sm"
          onClick={handleSaveSettings}
          disabled={saving}
          className="flex items-center gap-1.5 rounded-xl bg-amber-600 px-5 py-2 text-xs font-semibold text-white hover:bg-amber-700 shadow-md"
        >
          {saving ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Save className="h-3.5 w-3.5" />
          )}
          <span>Simpan Pengaturan Pejabat &amp; PPK</span>
        </Button>
      </div>
    </div>
  );
}
