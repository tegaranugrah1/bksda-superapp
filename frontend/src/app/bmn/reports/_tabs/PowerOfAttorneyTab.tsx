"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { FileText, Loader2, Printer, Save, Search, Upload } from "lucide-react";
import {
  handlePrintPowerOfAttorney,
  PowerOfAttorneyDocument,
  type PowerOfAttorneyParty,
} from "../_components/PowerOfAttorneyDocument";
import { RecentDocumentTable } from "../_components/RecentDocumentTable";
import { AssetSelectionTable } from "../_components/AssetSelectionTable";
import { confirmAndDeleteDocument } from "../_lib/report-actions";
import {
  todayInputValue,
  buildPoaNumber,
  formatNip,
  isDraftNumber,
  extractDocumentSequence,
  extractDocumentKap,
  type EmployeeOption,
} from "../_lib/report-utils";
import {
  type PowerOfAttorneyHistory,
  type BmnAssetOption,
  type EditingDocumentState,
  DEFAULT_POA_FIRST_PARTY,
} from "../_lib/types";

export interface PowerOfAttorneyTabProps {
  employees: EmployeeOption[];
  vehicleAssetOptions: BmnAssetOption[];
  loadingEmployees?: boolean;
  canGenerate?: boolean;
  canWrite?: boolean;
  editingDocument?: EditingDocumentState | null;
  onClearEditing?: () => void;
  onViewHistory?: (item: PowerOfAttorneyHistory) => void;
  onRefetchHistory?: () => Promise<void> | void;
}

export function PowerOfAttorneyTab({
  employees,
  vehicleAssetOptions,
  loadingEmployees = false,
  canGenerate = true,
  canWrite = false,
  editingDocument,
  onClearEditing,
  onViewHistory,
  onRefetchHistory,
}: PowerOfAttorneyTabProps) {
  const confirm = useConfirm();

  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [poaSequence, setPoaSequence] = useState("");
  const [poaKap, setPoaKap] = useState("KAP.03.02");
  const [poaDate, setPoaDate] = useState(todayInputValue());
  const [poaFirstEmployeeId, setPoaFirstEmployeeId] = useState("");
  const [poaFirstParty, setPoaFirstParty] = useState<PowerOfAttorneyParty>(DEFAULT_POA_FIRST_PARTY);
  const [poaSecondParty, setPoaSecondParty] = useState<PowerOfAttorneyParty>({
    name: "",
    nip: "",
    position: "",
    address: "Jln. Teuku Umar Samarinda",
  });
  const [poaSelectedAssetIds, setPoaSelectedAssetIds] = useState<string[]>([]);
  const [poaNotes, setPoaNotes] = useState(
    "Untuk melakukan pengecekan fisik kendaraan roda 2 (dua) dan 4 (empat) sebagai berikut:"
  );
  const [savingPowerOfAttorney, setSavingPowerOfAttorney] = useState(false);
  const [poaHistory, setPoaHistory] = useState<PowerOfAttorneyHistory[]>([]);
  const [loadingPoaData, setLoadingPoaData] = useState(false);
  const [poaKtpFile, setPoaKtpFile] = useState<File | null>(null);
  const [poaKtpPreviewUrl, setPoaKtpPreviewUrl] = useState<string | null>(null);
  const [poaKtpPath, setPoaKtpPath] = useState<string | null>(null);
  const [vehicleSearch, setVehicleSearch] = useState("");

  const selectedEmployee = useMemo(
    () => employees.find((employee) => String(employee.id) === selectedEmployeeId) || null,
    [employees, selectedEmployeeId]
  );

  const fullPoaNumber = useMemo(
    () => buildPoaNumber(poaSequence, poaKap, poaDate),
    [poaSequence, poaKap, poaDate]
  );

  const poaSelectedAssets = useMemo(
    () => vehicleAssetOptions.filter((asset) => poaSelectedAssetIds.includes(asset.id)),
    [vehicleAssetOptions, poaSelectedAssetIds]
  );

  const filteredPoaVehicleAssets = useMemo(() => {
    const needle = vehicleSearch.trim().toLocaleLowerCase("id-ID");
    if (!needle) return vehicleAssetOptions;

    return vehicleAssetOptions.filter((asset) =>
      [
        asset.nama_barang,
        asset.merk_tipe,
        asset.merk,
        asset.no_polisi,
        asset.no_mesin,
        asset.no_rangka,
      ]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase("id-ID")
        .includes(needle)
    );
  }, [vehicleAssetOptions, vehicleSearch]);

  const recentEmployeePoaHistory = useMemo(
    () => poaHistory.slice(0, 5),
    [poaHistory]
  );

  const loadPoaData = useCallback(async (employeeId: string) => {
    if (!employeeId) {
      setPoaHistory([]);
      return;
    }

    setLoadingPoaData(true);
    try {
      const response = await api.get("/bmn/power-of-attorneys", { params: { employee_id: employeeId, per_page: 20 } });
      setPoaHistory(response.data.data || []);
    } catch {
      toast.error("Gagal memuat riwayat Surat Kuasa pegawai.");
    } finally {
      setLoadingPoaData(false);
    }
  }, []);

  const handleEmployeeChange = async (employeeId: string) => {
    setSelectedEmployeeId(employeeId);
    await loadPoaData(employeeId);
    const employee = employees.find((item) => String(item.id) === employeeId);
    if (employee) {
      setPoaSecondParty({
        name: employee.nama_lengkap,
        nip: formatNip(employee.nip),
        position: employee.jabatan || "",
        address: "Jln. Teuku Umar Samarinda",
      });
    }
  };

  useEffect(() => {
    if (!poaFirstEmployeeId) {
      setPoaFirstParty(DEFAULT_POA_FIRST_PARTY);
      return;
    }

    const employee = employees.find((item) => String(item.id) === poaFirstEmployeeId);
    if (!employee) return;

    setPoaFirstParty({
      name: employee.nama_lengkap,
      nip: formatNip(employee.nip),
      position: employee.jabatan || "-",
      address: "Jln. Teuku Umar Samarinda",
    });
  }, [employees, poaFirstEmployeeId]);

  const togglePoaAsset = (assetId: string) => {
    setPoaSelectedAssetIds((current) =>
      current.includes(assetId)
        ? current.filter((id) => id !== assetId)
        : [...current, assetId]
    );
  };

  const handlePoaKtpUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("File KTP harus berupa gambar (JPG, PNG, WebP).");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Ukuran file KTP maksimal 5MB.");
      return;
    }

    setPoaKtpFile(file);
    const url = URL.createObjectURL(file);
    setPoaKtpPreviewUrl(url);
    toast.success("Foto KTP berhasil dipilih.");
  };

  const duplicatePowerOfAttorney = (agreement: PowerOfAttorneyHistory) => {
    setPoaSequence("");
    const kapVal = extractDocumentKap(agreement.number);
    if (kapVal) setPoaKap(kapVal);
    setPoaDate(todayInputValue());
    setPoaFirstEmployeeId("");
    setPoaFirstParty(agreement.first_party_snapshot || DEFAULT_POA_FIRST_PARTY);
    setPoaSecondParty(agreement.second_party_snapshot || { name: "", nip: "", position: "", address: "Jln. Teuku Umar Samarinda" });
    setPoaSelectedAssetIds(agreement.asset_ids || agreement.assets_snapshot?.map((a) => a.id) || []);
    setPoaNotes(agreement.notes || "Untuk melakukan pengecekan fisik kendaraan roda 2 (dua) dan 4 (empat) sebagai berikut:");
    setPoaKtpPreviewUrl(agreement.ktp_url || null);
    setPoaKtpPath(agreement.ktp_path || null);
    setPoaKtpFile(null);
    toast.info("Arsip Surat Kuasa disalin sebagai dokumen baru. Silakan lengkapi nomor dan tanggal.");
  };

  const editPowerOfAttorney = async (agreement: PowerOfAttorneyHistory) => {
    const employeeId = agreement.second_party_snapshot?.id;
    if (employeeId) {
      setSelectedEmployeeId(String(employeeId));
      await loadPoaData(String(employeeId));
    }

    const seq = extractDocumentSequence(agreement.number);
    setPoaSequence(seq);
    const kapVal = extractDocumentKap(agreement.number);
    if (kapVal) setPoaKap(kapVal);

    if (agreement.document_date) {
      setPoaDate(agreement.document_date);
    }
    setPoaFirstEmployeeId("");
    setPoaFirstParty(agreement.first_party_snapshot || DEFAULT_POA_FIRST_PARTY);
    setPoaSecondParty(agreement.second_party_snapshot || { name: "", nip: "", position: "", address: "Jln. Teuku Umar Samarinda" });
    setPoaSelectedAssetIds(agreement.asset_ids || agreement.assets_snapshot?.map((a) => a.id) || []);
    setPoaNotes(agreement.notes || "Untuk melakukan pengecekan fisik kendaraan roda 2 (dua) dan 4 (empat) sebagai berikut:");
    setPoaKtpPreviewUrl(agreement.ktp_url || null);
    setPoaKtpPath(agreement.ktp_path || null);
    setPoaKtpFile(null);
    toast.info(`Mengedit dokumen: ${isDraftNumber(agreement.number) ? "Surat Kuasa Kendaraan (Draf)" : agreement.number}`);
  };

  const printPowerOfAttorneyHistory = (agreement: PowerOfAttorneyHistory) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Gagal membuka jendela cetak.");
      return;
    }
    printWindow.document.write("<html><head><title>Cetak Surat Kuasa</title></head><body>");
    printWindow.document.write(`<div id="print-root"></div>`);
    printWindow.document.write("</body></html>");
    printWindow.document.close();
    window.setTimeout(() => handlePrintPowerOfAttorney("power-of-attorney-history-print-root"), 100);
  };

  const deletePowerOfAttorney = async (agreement: PowerOfAttorneyHistory) => {
    await confirmAndDeleteDocument({
      confirm,
      endpoint: "/bmn/power-of-attorneys",
      id: agreement.id,
      number: agreement.number,
      documentLabel: "Surat Kuasa",
      onSuccess: async () => {
        if (selectedEmployeeId) {
          await loadPoaData(selectedEmployeeId);
        }
        if (onRefetchHistory) {
          await onRefetchHistory();
        }
      },
    });
  };

  const savePowerOfAttorney = async () => {
    if (!selectedEmployee) {
      toast.error("Pilih penerima kuasa terlebih dahulu.");
      return;
    }

    if (poaSelectedAssetIds.length === 0) {
      toast.error("Pilih minimal satu kendaraan.");
      return;
    }

    const isDraft = !poaSequence.trim();
    const docStatus = isDraft ? "draft" : "published";

    setSavingPowerOfAttorney(true);
    try {
      const formData = new FormData();
      formData.append("number", isDraft ? "" : fullPoaNumber);
      formData.append("status", docStatus);
      if (poaKap) formData.append("kap", poaKap);
      formData.append("document_date", poaDate);

      formData.append("first_party[name]", poaFirstParty.name);
      if (poaFirstParty.nip) formData.append("first_party[nip]", poaFirstParty.nip);
      if (poaFirstParty.position) formData.append("first_party[position]", poaFirstParty.position);
      if (poaFirstParty.address) formData.append("first_party[address]", poaFirstParty.address);

      formData.append("second_party[name]", poaSecondParty.name);
      if (poaSecondParty.nip) formData.append("second_party[nip]", poaSecondParty.nip);
      if (poaSecondParty.position) formData.append("second_party[position]", poaSecondParty.position);
      if (poaSecondParty.address) formData.append("second_party[address]", poaSecondParty.address);

      poaSelectedAssetIds.forEach((id) => {
        formData.append("asset_ids[]", id);
      });
      if (poaNotes) formData.append("notes", poaNotes);

      if (poaKtpFile) {
        formData.append("ktp_image", poaKtpFile);
      } else if (poaKtpPath) {
        formData.append("existing_ktp_path", poaKtpPath);
      }

      if (editingDocument && editingDocument.type === "power_of_attorney") {
        formData.append("_method", "PUT");
        await api.post(`/bmn/power-of-attorneys/${editingDocument.id}`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        toast.success(isDraft ? "Draf Surat Kuasa berhasil diperbarui." : "Perubahan Surat Kuasa berhasil disimpan.");
        if (onClearEditing) onClearEditing();
      } else {
        await api.post("/bmn/power-of-attorneys", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        toast.success(isDraft ? "Draf Surat Kuasa berhasil disimpan." : "Riwayat Surat Kuasa berhasil disimpan.");
      }

      setPoaKtpFile(null);
      setPoaKtpPreviewUrl(null);
      setPoaKtpPath(null);

      await loadPoaData(String(selectedEmployee.id));
      if (onRefetchHistory) {
        await onRefetchHistory();
      }
    } catch {
      toast.error("Gagal menyimpan riwayat Surat Kuasa.");
    } finally {
      setSavingPowerOfAttorney(false);
    }
  };

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <div>
          <h2 className="text-base font-bold text-zinc-900 dark:text-white">Generate Surat Kuasa Kendaraan</h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {selectedEmployee ? fullPoaNumber : "Pilih penerima kuasa untuk mulai membuat dokumen."}
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button
            variant="outline"
            className="rounded-xl gap-2"
            onClick={savePowerOfAttorney}
            disabled={savingPowerOfAttorney || !selectedEmployee || !canGenerate}
          >
            {savingPowerOfAttorney ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {editingDocument?.type === "power_of_attorney"
              ? poaSequence.trim()
                ? "Simpan Perubahan"
                : "Simpan Perubahan (Draf)"
              : !poaSequence.trim()
              ? "Simpan Draf"
              : "Simpan Riwayat"}
          </Button>
          <Button
            className="rounded-xl gap-2 bg-emerald-600 hover:bg-emerald-500"
            onClick={() => handlePrintPowerOfAttorney()}
            disabled={!selectedEmployee}
          >
            <Printer className="w-4 h-4" />
            Cetak
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-zinc-900 dark:text-white">1. Pilih Penerima Kuasa (Pihak Kedua)</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Pegawai yang akan diberikan kuasa untuk melakukan pemeriksaan kendaraan.</p>
          </div>
          {loadingPoaData && <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />}
        </div>
        <select
          value={selectedEmployeeId}
          onChange={(event) => handleEmployeeChange(event.target.value)}
          disabled={loadingEmployees}
          className="h-12 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/10 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
        >
          <option value="">{loadingEmployees ? "Memuat pegawai..." : "Pilih pegawai"}</option>
          {employees.map((employee) => (
            <option key={employee.id} value={employee.id}>
              {employee.nama_lengkap} - {employee.nip}
            </option>
          ))}
        </select>
      </div>

      {!selectedEmployee ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-10 text-center dark:border-zinc-700 dark:bg-zinc-900">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10">
            <FileText className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Belum ada dokumen yang dibuat</h3>
          <p className="mx-auto mt-1 max-w-md text-xs text-zinc-500 dark:text-zinc-400">
            Pilih penerima kuasa terlebih dahulu. Setelah itu kamu bisa memilih kendaraan, melengkapi nomor Surat Kuasa, lalu preview dan cetak dokumen.
          </p>
        </div>
      ) : (
        <>
          <RecentDocumentTable
            items={recentEmployeePoaHistory}
            title="Surat Kuasa Terakhir Pegawai Ini"
            subtitle="Gunakan arsip lama sebagai referensi, cetak ulang, atau duplikasi sebagai dokumen baru."
            unitLabel="kendaraan"
            emptyMessage="Belum ada Surat Kuasa yang pernah digenerate untuk pegawai ini."
            loading={loadingPoaData}
            canWrite={canWrite}
            onEdit={editPowerOfAttorney}
            onView={(item) => {
              if (onViewHistory) onViewHistory(item);
            }}
            onPrint={printPowerOfAttorneyHistory}
            onDuplicate={duplicatePowerOfAttorney}
            onDelete={deletePowerOfAttorney}
          />

          <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-white">2. Pilih Kendaraan Kuasa</h3>
                <p className="text-xs text-zinc-500">{poaSelectedAssetIds.length} dari {vehicleAssetOptions.length} kendaraan dipilih</p>
              </div>
            </div>
            <div className="mb-3 relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              <input
                value={vehicleSearch}
                onChange={(event) => setVehicleSearch(event.target.value)}
                placeholder="Cari kendaraan, merk, tipe, nomor polisi, nomor mesin/rangka..."
                className="h-10 w-full rounded-xl border border-zinc-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/10 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
              />
            </div>
            <AssetSelectionTable
              items={filteredPoaVehicleAssets}
              selectedIds={poaSelectedAssetIds}
              onToggle={togglePoaAsset}
              emptyMessage="Tidak ada kendaraan yang sesuai."
              columns={[
                {
                  header: "Kendaraan",
                  render: (asset) => (
                    <div>
                      <span className="block font-semibold">{asset.nama_barang}</span>
                      {asset.merk_tipe || asset.merk ? (
                        <span className="text-[10px] text-zinc-400">{asset.merk_tipe || asset.merk}</span>
                      ) : null}
                    </div>
                  ),
                },
                {
                  header: "No. Polisi",
                  className: "text-zinc-500",
                  render: (asset) => <span className="text-zinc-500">{asset.no_polisi || "-"}</span>,
                },
                {
                  header: "No. Mesin",
                  className: "text-zinc-500",
                  render: (asset) => <span className="text-zinc-500">{asset.no_mesin || "-"}</span>,
                },
                {
                  header: "No. Rangka",
                  className: "text-zinc-500",
                  render: (asset) => <span className="text-zinc-500">{asset.no_rangka || "-"}</span>,
                },
              ]}
            />
          </div>

          <div className="grid grid-cols-1 2xl:grid-cols-[430px_minmax(0,1fr)] gap-5">
            <div className="space-y-5">
              <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
                <h3 className="mb-4 text-sm font-bold text-zinc-900 dark:text-white">3. Detail Dokumen</h3>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <label className="block">
                      <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">Nomor Surat</span>
                      <input
                        value={poaSequence}
                        onChange={(event) => setPoaSequence(event.target.value)}
                        placeholder="contoh: 184"
                        className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/10 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                      />
                    </label>
                    <label className="block">
                      <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">KAP</span>
                      <input
                        value={poaKap}
                        onChange={(event) => setPoaKap(event.target.value)}
                        placeholder="KAP.03.02"
                        className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/10 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                      />
                    </label>
                  </div>

                  <label className="block">
                    <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">Tanggal Dokumen</span>
                    <input
                      type="date"
                      value={poaDate}
                      onChange={(event) => setPoaDate(event.target.value)}
                      className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/10 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                    />
                  </label>

                  <textarea
                    value={poaNotes}
                    onChange={(event) => setPoaNotes(event.target.value)}
                    rows={3}
                    placeholder="Catatan / klausul kuasa..."
                    className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/10 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
                <h3 className="mb-4 text-sm font-bold text-zinc-900 dark:text-white">4. Pihak Pertama (Pemberi Kuasa)</h3>
                <div className="space-y-2">
                  <select
                    value={poaFirstEmployeeId}
                    onChange={(event) => setPoaFirstEmployeeId(event.target.value)}
                    className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                  >
                    <option value="">Default - Hardi Purnama</option>
                    {employees.map((employee) => (
                      <option key={employee.id} value={employee.id}>
                        {employee.nama_lengkap} - {employee.nip}
                      </option>
                    ))}
                  </select>
                  <input
                    value={poaFirstParty.name}
                    onChange={(event) => setPoaFirstParty({ ...poaFirstParty, name: event.target.value })}
                    placeholder="Nama Lengkap"
                    className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                  />
                  <input
                    value={poaFirstParty.nip || ""}
                    onChange={(event) => setPoaFirstParty({ ...poaFirstParty, nip: event.target.value })}
                    placeholder="NIP"
                    className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                  />
                  <input
                    value={poaFirstParty.position || ""}
                    onChange={(event) => setPoaFirstParty({ ...poaFirstParty, position: event.target.value })}
                    placeholder="Jabatan"
                    className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                  />
                  <input
                    value={poaFirstParty.address || ""}
                    onChange={(event) => setPoaFirstParty({ ...poaFirstParty, address: event.target.value })}
                    placeholder="Alamat"
                    className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
                <h3 className="mb-4 text-sm font-bold text-zinc-900 dark:text-white">5. Pihak Kedua (Penerima Kuasa)</h3>
                <div className="space-y-2">
                  <input
                    value={poaSecondParty.name}
                    onChange={(event) => setPoaSecondParty({ ...poaSecondParty, name: event.target.value })}
                    placeholder="Nama Lengkap"
                    className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                  />
                  <input
                    value={poaSecondParty.nip || ""}
                    onChange={(event) => setPoaSecondParty({ ...poaSecondParty, nip: event.target.value })}
                    placeholder="NIP / No. Identitas"
                    className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                  />
                  <input
                    value={poaSecondParty.position || ""}
                    onChange={(event) => setPoaSecondParty({ ...poaSecondParty, position: event.target.value })}
                    placeholder="Jabatan"
                    className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                  />
                  <input
                    value={poaSecondParty.address || ""}
                    onChange={(event) => setPoaSecondParty({ ...poaSecondParty, address: event.target.value })}
                    placeholder="Alamat"
                    className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                  />
                  <div>
                    <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-300 mb-1">
                      Foto KTP Penerima Kuasa
                    </label>
                    <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-zinc-300 p-3 text-xs text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800">
                      <Upload className="h-4 w-4" />
                      <span>{poaKtpFile ? poaKtpFile.name : poaKtpPath ? "Ganti Foto KTP" : "Unggah Foto KTP"}</span>
                      <input type="file" accept="image/*" onChange={handlePoaKtpUpload} className="hidden" />
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <div className="min-w-0 rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-white">6. Preview Dokumen</h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">{fullPoaNumber}</p>
                </div>
              </div>
              <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-zinc-100 p-4 dark:border-zinc-800 dark:bg-zinc-950">
                <PowerOfAttorneyDocument
                  number={fullPoaNumber}
                  documentDate={poaDate}
                  firstParty={poaFirstParty}
                  secondParty={poaSecondParty}
                  assets={poaSelectedAssets}
                  notes={poaNotes}
                  ktpUrl={poaKtpPreviewUrl}
                />
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
