"use client";

import { useCallback, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Archive, Download, FileClock, FileText, Handshake, Loader2, Package, Printer, Save, UserRound, Wrench } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  handlePrintUsageAgreement,
  UsageAgreementDocument,
  type UsageAgreementAsset,
  type UsageAgreementParty,
} from "./_components/UsageAgreementDocument";

interface EmployeeOption {
  id: number;
  nama_lengkap: string;
  nip: string;
  jabatan?: string | null;
  pangkat_golongan?: string | null;
  satuan_kerja?: string | null;
}

interface UsageAgreementHistory {
  id: string;
  number: string;
  document_date: string;
  second_party_snapshot?: UsageAgreementParty & { unit?: string | null };
  assets_snapshot?: UsageAgreementAsset[];
  generator?: { name: string };
  created_at?: string;
}

const DEFAULT_FIRST_PARTY: UsageAgreementParty = {
  name: "M. ARI WIBAWANTO, S.Hut., M.Sc.",
  nip: "19740514 199903 1 001",
  rank: "Pembina Tingkat I / IV b",
  position: "Kepala Balai Konservasi Sumber Daya Alam Kalimantan Timur",
};

function todayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

function monthNumber(value: string) {
  const date = value ? new Date(`${value}T00:00:00`) : new Date();
  return String((Number.isNaN(date.getTime()) ? new Date() : date).getMonth() + 1).padStart(2, "0");
}

function yearNumber(value: string) {
  const date = value ? new Date(`${value}T00:00:00`) : new Date();
  return (Number.isNaN(date.getTime()) ? new Date() : date).getFullYear();
}

function buildBaNumber(sequence: string, kap: string, documentDate: string) {
  return `BA.${sequence.trim() || "____"}/K.18/TU/${kap.trim() || "KAP.03.02"}/B/${monthNumber(documentDate)}/${yearNumber(documentDate)}`;
}

function formatDate(value?: string) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}

export default function BmnReportsPage() {
  const [loadingAsset, setLoadingAsset] = useState(false);
  const [loadingLoan, setLoadingLoan] = useState(false);
  const [loadingMaintenance, setLoadingMaintenance] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [assets, setAssets] = useState<UsageAgreementAsset[]>([]);
  const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>([]);
  const [history, setHistory] = useState<UsageAgreementHistory[]>([]);
  const [loadingUsageData, setLoadingUsageData] = useState(false);
  const [savingUsageAgreement, setSavingUsageAgreement] = useState(false);
  const [baSequence, setBaSequence] = useState("");
  const [kap, setKap] = useState("KAP.03.02");
  const [documentDate, setDocumentDate] = useState(todayInputValue());
  const [firstParty, setFirstParty] = useState<UsageAgreementParty>(DEFAULT_FIRST_PARTY);
  const [notes, setNotes] = useState("Sehingga tanggung jawab atas penggunaan, pengamanan, dan pemeliharaan yang dibebankan pada DIPA satuan kerja berada pada PIHAK KEDUA.");

  const { data: employees = [], isLoading: loadingEmployees } = useQuery<EmployeeOption[]>({
    queryKey: ["bmn-usage-employees"],
    queryFn: async () => {
      const response = await api.get("/kepegawaian/employees", { params: { is_active: true, per_page: 300 } });
      return response.data.data || [];
    },
  });

  const executeDownload = async (endpoint: string, filename: string, setLoading: (s: boolean) => void) => {
    setLoading(true);
    try {
      const response = await api.get(endpoint, { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      toast.success(`${filename} berhasil diunduh.`);
    } catch { toast.error("Gagal mengunduh laporan."); }
    finally { setLoading(false); }
  };

  const selectedEmployee = useMemo(
    () => employees.find((employee) => String(employee.id) === selectedEmployeeId) || null,
    [employees, selectedEmployeeId],
  );

  const secondParty = useMemo<UsageAgreementParty>(() => ({
    name: selectedEmployee?.nama_lengkap || "",
    nip: selectedEmployee?.nip || "",
    rank: selectedEmployee?.pangkat_golongan || "",
    position: selectedEmployee?.jabatan || "",
  }), [selectedEmployee]);

  const selectedAssets = useMemo(
    () => assets.filter((asset) => selectedAssetIds.includes(asset.id)),
    [assets, selectedAssetIds],
  );

  const fullBaNumber = useMemo(
    () => buildBaNumber(baSequence, kap, documentDate),
    [baSequence, kap, documentDate],
  );

  const loadUsageData = useCallback(async (employeeId: string) => {
    if (!employeeId) {
      setAssets([]);
      setSelectedAssetIds([]);
      setHistory([]);
      return;
    }

    setLoadingUsageData(true);
    try {
      const [assetsResponse, historyResponse] = await Promise.all([
        api.get("/bmn/assets", { params: { employee_id: employeeId, per_page: 300 } }),
        api.get("/bmn/usage-agreements", { params: { employee_id: employeeId, per_page: 20 } }),
      ]);
      const nextAssets = assetsResponse.data.data || [];
      setAssets(nextAssets);
      setSelectedAssetIds(nextAssets.map((asset: UsageAgreementAsset) => asset.id));
      setHistory(historyResponse.data.data || []);
    } catch {
      toast.error("Gagal memuat aset atau riwayat BA pegawai.");
    } finally {
      setLoadingUsageData(false);
    }
  }, []);

  const handleEmployeeChange = (employeeId: string) => {
    setSelectedEmployeeId(employeeId);
    loadUsageData(employeeId);
  };

  const toggleAsset = (assetId: string) => {
    setSelectedAssetIds((current) =>
      current.includes(assetId)
        ? current.filter((id) => id !== assetId)
        : [...current, assetId],
    );
  };

  const saveUsageAgreement = async () => {
    if (!selectedEmployee) {
      toast.error("Pilih pegawai terlebih dahulu.");
      return;
    }
    if (selectedAssets.length === 0) {
      toast.error("Pilih minimal satu aset BMN.");
      return;
    }

    setSavingUsageAgreement(true);
    try {
      await api.post("/bmn/usage-agreements", {
        employee_id: selectedEmployee.id,
        number: fullBaNumber,
        kap,
        document_date: documentDate,
        first_party: firstParty,
        asset_ids: selectedAssetIds,
        notes,
      });
      toast.success("Riwayat BA Pemakaian berhasil disimpan.");
      await loadUsageData(String(selectedEmployee.id));
    } catch {
      toast.error("Gagal menyimpan riwayat BA Pemakaian.");
    } finally {
      setSavingUsageAgreement(false);
    }
  };

  const reports = [
    { title: "Katalog Aset BMN", desc: "Rekapitulasi seluruh aset beserta nilai perolehan.", icon: <Package className="w-6 h-6" />, color: "emerald", loading: loadingAsset, action: () => executeDownload("/bmn/assets/export", "Katalog_Aset_BMN.xlsx", setLoadingAsset) },
    { title: "Riwayat Peminjaman", desc: "Catatan historis serah-terima aset kepada pegawai.", icon: <Handshake className="w-6 h-6" />, color: "amber", loading: loadingLoan, action: () => executeDownload("/bmn/loans/export", "Peminjaman_BMN.xlsx", setLoadingLoan) },
    { title: "Biaya Pemeliharaan", desc: "Rekap pengeluaran dana untuk servis dan perbaikan.", icon: <Wrench className="w-6 h-6" />, color: "blue", loading: loadingMaintenance, action: () => executeDownload("/bmn/maintenances/export", "Pemeliharaan_BMN.xlsx", setLoadingMaintenance) },
  ];

  const colorMap: Record<string, { iconBg: string; iconText: string; btnBg: string }> = {
    emerald: { iconBg: "bg-emerald-50 dark:bg-emerald-500/10", iconText: "text-emerald-600", btnBg: "bg-emerald-600 hover:bg-emerald-500" },
    amber: { iconBg: "bg-amber-50 dark:bg-amber-500/10", iconText: "text-amber-600", btnBg: "bg-amber-600 hover:bg-amber-500" },
    blue: { iconBg: "bg-blue-50 dark:bg-blue-500/10", iconText: "text-blue-600", btnBg: "bg-blue-600 hover:bg-blue-500" },
  };

  return (
    <div className="p-6 md:p-10 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
          <FileText className="w-6 h-6 text-emerald-500" /> Laporan
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">Unduh laporan Excel dan buat dokumen berita acara BMN.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {reports.map((report) => {
          const c = colorMap[report.color] || colorMap.emerald;
          return (
            <div key={report.title} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 flex flex-col">
              <div className={`w-12 h-12 rounded-xl ${c.iconBg} ${c.iconText} flex items-center justify-center mb-4`}>
                {report.icon}
              </div>
              <h3 className="text-base font-bold text-zinc-900 dark:text-white mb-1">{report.title}</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-6 flex-1">{report.desc}</p>
              <Button
                onClick={report.action}
                disabled={report.loading}
                className={`w-full rounded-xl text-white font-semibold ${c.btnBg}`}
              >
                {report.loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Download className="w-4 h-4 mr-2" />}
                Unduh Excel
              </Button>
            </div>
          );
        })}
      </div>

      <section className="grid grid-cols-1 xl:grid-cols-[420px_minmax(0,1fr)] gap-6">
        <div className="space-y-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                <Archive className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-zinc-900 dark:text-white">BA Pemakaian BMN</h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">Generate berita acara pemakaian per pegawai.</p>
              </div>
            </div>

            <div className="space-y-3">
              <label className="block">
                <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">Pegawai</span>
                <select
                  value={selectedEmployeeId}
                  onChange={(event) => handleEmployeeChange(event.target.value)}
                  disabled={loadingEmployees}
                  className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/10 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                >
                  <option value="">{loadingEmployees ? "Memuat pegawai..." : "Pilih pegawai"}</option>
                  {employees.map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.nama_lengkap} - {employee.nip}
                    </option>
                  ))}
                </select>
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">Nomor BA</span>
                  <input
                    value={baSequence}
                    onChange={(event) => setBaSequence(event.target.value)}
                    placeholder="contoh: 015"
                    className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/10 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">KAP</span>
                  <input
                    value={kap}
                    onChange={(event) => setKap(event.target.value)}
                    className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/10 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                  />
                </label>
              </div>

              <label className="block">
                <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">Tanggal Dokumen</span>
                <input
                  type="date"
                  value={documentDate}
                  onChange={(event) => setDocumentDate(event.target.value)}
                  className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/10 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                />
              </label>

              <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-3 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-zinc-700 dark:text-zinc-200">
                  <UserRound className="w-3.5 h-3.5" /> Pihak Pertama
                </div>
                <input value={firstParty.name} onChange={(event) => setFirstParty({ ...firstParty, name: event.target.value })} className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100" />
                <input value={firstParty.nip || ""} onChange={(event) => setFirstParty({ ...firstParty, nip: event.target.value })} className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100" />
                <input value={firstParty.rank || ""} onChange={(event) => setFirstParty({ ...firstParty, rank: event.target.value })} className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100" />
                <textarea value={firstParty.position || ""} onChange={(event) => setFirstParty({ ...firstParty, position: event.target.value })} rows={2} className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100" />
              </div>

              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                rows={3}
                className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/10 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
              />
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Aset Dipakai</h3>
              {loadingUsageData && <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />}
            </div>
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {!selectedEmployee ? (
                <p className="text-xs text-zinc-500">Pilih pegawai untuk melihat aset BMN.</p>
              ) : assets.length === 0 ? (
                <p className="text-xs text-zinc-500">Belum ada aset BMN yang terhubung dengan pegawai ini.</p>
              ) : assets.map((asset) => (
                <label key={asset.id} className="flex gap-3 rounded-xl border border-zinc-200 dark:border-zinc-800 p-3 text-xs">
                  <input
                    type="checkbox"
                    checked={selectedAssetIds.includes(asset.id)}
                    onChange={() => toggleAsset(asset.id)}
                    className="mt-0.5"
                  />
                  <span className="min-w-0">
                    <span className="block font-semibold text-zinc-800 dark:text-zinc-100">{asset.nama_barang}</span>
                    <span className="block text-zinc-500">{asset.kode_barang} - NUP {asset.nup}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <FileClock className="w-4 h-4 text-emerald-600" />
              <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Riwayat BA Pegawai</h3>
            </div>
            <div className="space-y-2 max-h-56 overflow-y-auto">
              {!selectedEmployee ? (
                <p className="text-xs text-zinc-500">Riwayat akan tampil setelah pegawai dipilih.</p>
              ) : history.length === 0 ? (
                <p className="text-xs text-zinc-500">Belum ada riwayat BA Pemakaian.</p>
              ) : history.map((item) => (
                <div key={item.id} className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-3">
                  <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-100">{item.number}</p>
                  <p className="text-[11px] text-zinc-500">{formatDate(item.document_date)} - {item.assets_snapshot?.length || 0} aset</p>
                  {item.generator?.name && <p className="text-[11px] text-zinc-400">oleh {item.generator.name}</p>}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="min-w-0 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <div>
              <p className="text-sm font-bold text-zinc-900 dark:text-white">Preview Dokumen</p>
              <p className="text-xs text-zinc-500">{fullBaNumber}</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="rounded-xl gap-2" onClick={saveUsageAgreement} disabled={savingUsageAgreement || !selectedEmployee}>
                {savingUsageAgreement ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Simpan Riwayat
              </Button>
              <Button className="rounded-xl gap-2 bg-emerald-600 hover:bg-emerald-500" onClick={handlePrintUsageAgreement} disabled={!selectedEmployee}>
                <Printer className="w-4 h-4" />
                Cetak
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-zinc-200 bg-zinc-100 p-4 dark:border-zinc-800 dark:bg-zinc-950">
            <UsageAgreementDocument
              number={fullBaNumber}
              documentDate={documentDate}
              firstParty={firstParty}
              secondParty={secondParty}
              assets={selectedAssets}
              notes={notes}
            />
          </div>
        </div>
      </section>
    </div>
  );
}
