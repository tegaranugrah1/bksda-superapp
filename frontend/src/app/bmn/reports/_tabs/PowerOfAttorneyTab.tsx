"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  formState: ReturnType<typeof usePowerOfAttorneyFormState>;
  employees: EmployeeOption[];
  vehicleAssetOptions: BmnAssetOption[];
  loadingEmployees?: boolean;
  canGenerate?: boolean;
  canWrite?: boolean;
  canDelete?: boolean;
  editingDocument?: EditingDocumentState | null;
  onSetEditingDocument?: (doc: EditingDocumentState) => void;
  onClearEditing?: () => void;
  onViewHistory?: (item: PowerOfAttorneyHistory) => void;
  onRefetchHistory?: () => Promise<void> | void;
}

export function usePowerOfAttorneyFormState(editingDocument?: EditingDocumentState | null) {
  const editingAppliedRef = useRef<EditingDocumentState | null | undefined>(undefined);
  const initialItem =
    editingDocument && editingDocument.type === "power_of_attorney"
      ? (editingDocument.item as PowerOfAttorneyHistory | undefined)
      : undefined;

  const [selectedEmployeeId, setSelectedEmployeeId] = useState(
    initialItem?.employee?.id ? String(initialItem.employee.id) : (initialItem?.second_party_snapshot?.id ? String(initialItem.second_party_snapshot.id) : "")
  );
  const [poaSequence, setPoaSequence] = useState(
    editingDocument?.isDuplicate ? "" : (initialItem?.number ? extractDocumentSequence(initialItem.number) : "")
  );
  const [poaKap, setPoaKap] = useState(
    (initialItem?.number ? extractDocumentKap(initialItem.number) : null) || (initialItem as any)?.kap || "KAP.03.02"
  );
  const [poaDate, setPoaDate] = useState(
    initialItem?.document_date ? initialItem.document_date.split("T")[0] : todayInputValue()
  );
  const [poaFirstEmployeeId, setPoaFirstEmployeeId] = useState("");
  const [poaFirstParty, setPoaFirstParty] = useState<PowerOfAttorneyParty>(
    initialItem?.first_party_snapshot || DEFAULT_POA_FIRST_PARTY
  );
  const [poaSecondParty, setPoaSecondParty] = useState<PowerOfAttorneyParty>(
    initialItem?.second_party_snapshot || {
      name: "",
      nip: "",
      position: "",
      address: "Jln. Teuku Umar Samarinda",
    }
  );
  const [poaSelectedAssetIds, setPoaSelectedAssetIds] = useState<string[]>(
    initialItem?.asset_ids || initialItem?.assets_snapshot?.map((a) => a.id) || []
  );
  const [poaNotes, setPoaNotes] = useState(
    initialItem?.notes || "Untuk melakukan pengecekan fisik kendaraan roda 2 (dua) dan 4 (empat) sebagai berikut:"
  );
  const [savingPowerOfAttorney, setSavingPowerOfAttorney] = useState(false);
  const [poaHistory, setPoaHistory] = useState<PowerOfAttorneyHistory[]>([]);
  const [loadingPoaData, setLoadingPoaData] = useState(false);
  const [poaKtpFile, setPoaKtpFile] = useState<File | null>(null);
  const [poaKtpPreviewUrl, setPoaKtpPreviewUrl] = useState<string | null>(initialItem?.ktp_url || null);
  const [poaKtpPath, setPoaKtpPath] = useState<string | null>(initialItem?.ktp_path || null);
  const [vehicleSearch, setVehicleSearch] = useState("");

  useEffect(() => () => {
    if (poaKtpPreviewUrl?.startsWith("blob:")) URL.revokeObjectURL(poaKtpPreviewUrl);
  }, [poaKtpPreviewUrl]);

  return {
    editingAppliedRef, selectedEmployeeId,
    setSelectedEmployeeId, poaSequence,
    setPoaSequence, poaKap,
    setPoaKap, poaDate,
    setPoaDate, poaFirstEmployeeId,
    setPoaFirstEmployeeId, poaFirstParty,
    setPoaFirstParty, poaSecondParty,
    setPoaSecondParty, poaSelectedAssetIds,
    setPoaSelectedAssetIds, poaNotes,
    setPoaNotes, savingPowerOfAttorney,
    setSavingPowerOfAttorney, poaHistory,
    setPoaHistory, loadingPoaData,
    setLoadingPoaData, poaKtpFile,
    setPoaKtpFile, poaKtpPreviewUrl,
    setPoaKtpPreviewUrl, poaKtpPath,
    setPoaKtpPath, vehicleSearch,
    setVehicleSearch,
  };
}

export function PowerOfAttorneyTab({
  formState,
  employees,
  vehicleAssetOptions,
  loadingEmployees = false,
  canGenerate = true,
  canWrite = false,
  canDelete = false,
  editingDocument,
  onSetEditingDocument,
  onClearEditing,
  onViewHistory,
  onRefetchHistory,
}: PowerOfAttorneyTabProps) {
  const confirm = useConfirm();

  const {
    editingAppliedRef, selectedEmployeeId,
    setSelectedEmployeeId, poaSequence,
    setPoaSequence, poaKap,
    setPoaKap, poaDate,
    setPoaDate, poaFirstEmployeeId,
    setPoaFirstEmployeeId, poaFirstParty,
    setPoaFirstParty, poaSecondParty,
    setPoaSecondParty, poaSelectedAssetIds,
    setPoaSelectedAssetIds, poaNotes,
    setPoaNotes, savingPowerOfAttorney,
    setSavingPowerOfAttorney, poaHistory,
    setPoaHistory, loadingPoaData,
    setLoadingPoaData, poaKtpFile,
    setPoaKtpFile, poaKtpPreviewUrl,
    setPoaKtpPreviewUrl, poaKtpPath,
    setPoaKtpPath, vehicleSearch,
    setVehicleSearch,
  } = formState;

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

  const applyDataToForm = (item: PowerOfAttorneyHistory, isDuplicate = false) => {
    const empId = item.employee?.id || item.second_party_snapshot?.id;
    if (empId) {
      setSelectedEmployeeId(String(empId));
      loadPoaData(String(empId));
    }

    setPoaSequence(isDuplicate ? "" : extractDocumentSequence(item.number));
    const kapVal = extractDocumentKap(item.number) || (item as any).kap;
    if (kapVal) setPoaKap(kapVal);
    if (item.document_date) {
      setPoaDate(item.document_date.split("T")[0]);
    }
    setPoaFirstEmployeeId("");
    setPoaFirstParty(item.first_party_snapshot || DEFAULT_POA_FIRST_PARTY);
    setPoaSecondParty(
      item.second_party_snapshot || { name: "", nip: "", position: "", address: "Jln. Teuku Umar Samarinda" }
    );
    setPoaSelectedAssetIds(item.asset_ids || item.assets_snapshot?.map((a) => a.id) || []);
    setPoaNotes(item.notes || "Untuk melakukan pengecekan fisik kendaraan roda 2 (dua) dan 4 (empat) sebagai berikut:");
    setPoaKtpPreviewUrl(item.ktp_url || null);
    setPoaKtpPath(item.ktp_path || null);
    setPoaKtpFile(null);
  };

  const resetForm = () => {
    setSelectedEmployeeId("");
    setPoaSequence("");
    setPoaKap("KAP.03.02");
    setPoaDate(todayInputValue());
    setPoaFirstEmployeeId("");
    setPoaFirstParty(DEFAULT_POA_FIRST_PARTY);
    setPoaSecondParty({ name: "", nip: "", position: "", address: "Jln. Teuku Umar Samarinda" });
    setPoaSelectedAssetIds([]);
    setPoaNotes("Untuk melakukan pengecekan fisik kendaraan roda 2 (dua) dan 4 (empat) sebagai berikut:");
    setPoaKtpFile(null);
    setPoaKtpPreviewUrl(null);
    setPoaKtpPath(null);
    setPoaHistory([]);
  };

  // History resources include full snapshots; synchronize edit mode once, without refetch overwriting a draft.

  useEffect(() => {
    if (editingAppliedRef.current === editingDocument) return;
    editingAppliedRef.current = editingDocument;
    if (editingDocument && editingDocument.type === "power_of_attorney" && editingDocument.item) {
      applyDataToForm(editingDocument.item as PowerOfAttorneyHistory, Boolean(editingDocument.isDuplicate));
    } else if (!editingDocument) {
      resetForm();
    }
  }, [editingDocument, loadPoaData, editingAppliedRef]);

  const handlePoaFirstPartyChange = (employeeId: string) => {
    setPoaFirstEmployeeId(employeeId);
    const employee = employees.find((item) => String(item.id) === employeeId);
    setPoaFirstParty(employee ? {
      name: employee.nama_lengkap,
      nip: formatNip(employee.nip),
      position: employee.jabatan || "-",
      address: "Jln. Teuku Umar Samarinda",
    } : DEFAULT_POA_FIRST_PARTY);
  };

  const togglePoaAsset = (assetId: string) => {
    setPoaSelectedAssetIds((current) =>
      current.includes(assetId)
        ? current.filter((id) => id !== assetId)
        : [...current, assetId]
    );
  };

  const handlePoaKtpUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!canGenerate) return;
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
    if (onSetEditingDocument) {
      onSetEditingDocument({
        type: "power_of_attorney",
        titleOrNumber: isDraftNumber(agreement.number) ? "Dokumen (Draf)" : agreement.number,
        status: "draft",
        item: { ...agreement, document_type: "power_of_attorney" },
        isDuplicate: true,
      });
      return;
    }

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
    if (onSetEditingDocument) {
      onSetEditingDocument({
        id: agreement.id,
        type: "power_of_attorney",
        titleOrNumber: isDraftNumber(agreement.number) ? "Dokumen (Draf)" : agreement.number,
        status: agreement.status || (isDraftNumber(agreement.number) ? "draft" : "published"),
        item: { ...agreement, document_type: "power_of_attorney" },
        isDuplicate: false,
      });
      return;
    }

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
      formData.append("employee_id", String(selectedEmployee.id));
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

      if (editingDocument && editingDocument.type === "power_of_attorney" && editingDocument.id && !editingDocument.isDuplicate) {
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
        if (onClearEditing) onClearEditing();
      }

      setPoaKtpFile(null);
      setPoaKtpPreviewUrl(null);
      setPoaKtpPath(null);

      await loadPoaData(String(selectedEmployee.id));
      if (onRefetchHistory) {
        await onRefetchHistory();
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || (err?.response?.data?.errors ? Object.values(err.response.data.errors).flat().join(", ") : null) || "Gagal menyimpan riwayat Surat Kuasa.";
      toast.error(msg);
    } finally {
      setSavingPowerOfAttorney(false);
    }
  };

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] p-5">
        <div>
          <h2 className="text-base font-bold text-[var(--ds-fg)]">Generate Surat Kuasa Kendaraan</h2>
          <p className="text-xs text-[var(--ds-fg-muted)]">
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
            {editingDocument?.type === "power_of_attorney" && !editingDocument.isDuplicate
              ? poaSequence.trim()
                ? "Simpan Perubahan"
                : "Simpan Perubahan (Draf)"
              : !poaSequence.trim()
              ? "Simpan Draf"
              : "Simpan Riwayat"}
          </Button>
          <Button
            className="rounded-xl gap-2"
            onClick={() => handlePrintPowerOfAttorney()}
            disabled={!selectedEmployee}
          >
            <Printer className="w-4 h-4" />
            Cetak
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-[var(--ds-fg)]">1. Pilih Penerima Kuasa (Pihak Kedua)</h3>
            <p className="text-xs text-[var(--ds-fg-muted)]">Pegawai yang akan diberikan kuasa untuk melakukan pemeriksaan kendaraan.</p>
          </div>
          {loadingPoaData && <Loader2 className="w-4 h-4 animate-spin text-[var(--ds-accent-fg)]" />}
        </div>
        <select
          aria-label="Penerima kuasa"
                  value={selectedEmployeeId}
          onChange={(event) => handleEmployeeChange(event.target.value)}
          disabled={loadingEmployees}
          className="h-12 w-full rounded-xl border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] px-3 text-sm outline-none"
        >
          <option value="">{loadingEmployees ? "Memuat pegawai..." : "Pilih pegawai"}</option>
          {employees.map((employee) => (
            <option key={employee.id} value={employee.id}>
              {employee.nama_lengkap || employee.name} - {formatNip(employee.nip)}
            </option>
          ))}
        </select>
      </div>

      {!selectedEmployee ? (
        <div className="rounded-2xl border border-dashed border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] p-10 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--ds-accent-soft)] text-[var(--ds-accent-fg)]">
            <FileText className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-[var(--ds-fg)]">Belum ada dokumen yang dibuat</h3>
          <p className="mx-auto mt-1 max-w-md text-xs text-[var(--ds-fg-muted)]">
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
            canDelete={canDelete}
            onEdit={editPowerOfAttorney}
            onView={(item) => {
              if (onViewHistory) onViewHistory(item);
            }}
            onPrint={printPowerOfAttorneyHistory}
            onDuplicate={duplicatePowerOfAttorney}
            onDelete={deletePowerOfAttorney}
          />

          <div className="rounded-2xl border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-[var(--ds-fg)]">2. Pilih Kendaraan Kuasa</h3>
                <p className="text-xs text-[var(--ds-fg-muted)]">{poaSelectedAssetIds.length} dari {vehicleAssetOptions.length} kendaraan dipilih</p>
              </div>
            </div>
            <div className="mb-3 relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--ds-fg-muted)]" />
              <input
                aria-label="Cari kendaraan"
                  value={vehicleSearch}
                onChange={(event) => setVehicleSearch(event.target.value)}
                placeholder="Cari kendaraan, merk, tipe, nomor polisi, nomor mesin/rangka..."
                className="h-10 w-full rounded-xl border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] pl-9 pr-3 text-sm outline-none"
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
                        <span className="text-xs text-[var(--ds-fg-muted)]">{asset.merk_tipe || asset.merk}</span>
                      ) : null}
                    </div>
                  ),
                },
                {
                  header: "No. Polisi",
                  className: "text-[var(--ds-fg-muted)]",
                  render: (asset) => <span className="text-[var(--ds-fg-muted)]">{asset.no_polisi || "-"}</span>,
                },
                {
                  header: "No. Mesin",
                  className: "text-[var(--ds-fg-muted)]",
                  render: (asset) => <span className="text-[var(--ds-fg-muted)]">{asset.no_mesin || "-"}</span>,
                },
                {
                  header: "No. Rangka",
                  className: "text-[var(--ds-fg-muted)]",
                  render: (asset) => <span className="text-[var(--ds-fg-muted)]">{asset.no_rangka || "-"}</span>,
                },
              ]}
            />
          </div>

          <div className="grid grid-cols-1 2xl:grid-cols-[430px_minmax(0,1fr)] gap-5">
            <div className="space-y-5">
              <div className="rounded-2xl border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] p-5">
                <h3 className="mb-4 text-sm font-bold text-[var(--ds-fg)]">3. Detail Dokumen</h3>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <label className="block">
                      <span className="text-xs font-semibold text-[var(--ds-fg-secondary)]">Nomor Surat</span>
                      <input
                        value={poaSequence}
                        onChange={(event) => setPoaSequence(event.target.value)}
                        placeholder="contoh: 184"
                        className="mt-1 w-full rounded-xl border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] px-3 py-2 text-sm outline-none"
                      />
                    </label>
                    <label className="block">
                      <span className="text-xs font-semibold text-[var(--ds-fg-secondary)]">KAP</span>
                      <input
                        value={poaKap}
                        onChange={(event) => setPoaKap(event.target.value)}
                        placeholder="KAP.03.02"
                        className="mt-1 w-full rounded-xl border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] px-3 py-2 text-sm outline-none"
                      />
                    </label>
                  </div>

                  <label className="block">
                    <span className="text-xs font-semibold text-[var(--ds-fg-secondary)]">Tanggal Dokumen</span>
                    <input
                      type="date"
                      value={poaDate}
                      onChange={(event) => setPoaDate(event.target.value)}
                      className="mt-1 w-full rounded-xl border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] px-3 py-2 text-sm outline-none"
                    />
                  </label>

                  <textarea
                    aria-label="Catatan Surat Kuasa"
                  value={poaNotes}
                    onChange={(event) => setPoaNotes(event.target.value)}
                    rows={3}
                    placeholder="Catatan / klausul kuasa..."
                    className="w-full rounded-xl border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] px-3 py-2 text-xs outline-none"
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] p-5">
                <h3 className="mb-4 text-sm font-bold text-[var(--ds-fg)]">4. Pihak Pertama (Pemberi Kuasa)</h3>
                <div className="space-y-2">
                  <select
                    aria-label="Pilih pemberi kuasa"
                  value={poaFirstEmployeeId}
                    onChange={(event) => handlePoaFirstPartyChange(event.target.value)}
                    className="w-full rounded-lg border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] px-3 py-2 text-xs"
                  >
                    <option value="">Default - Hardi Purnama</option>
                    {employees.map((employee) => (
                      <option key={employee.id} value={employee.id}>
                        {employee.nama_lengkap || employee.name} - {formatNip(employee.nip)}
                      </option>
                    ))}
                  </select>
                  <input
                    aria-label="Nama pemberi kuasa"
                  value={poaFirstParty.name}
                    onChange={(event) => setPoaFirstParty({ ...poaFirstParty, name: event.target.value })}
                    placeholder="Nama Lengkap"
                    className="w-full rounded-lg border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] px-3 py-2 text-xs"
                  />
                  <input
                    aria-label="NIP pemberi kuasa"
                  value={poaFirstParty.nip || ""}
                    onChange={(event) => setPoaFirstParty({ ...poaFirstParty, nip: event.target.value })}
                    placeholder="NIP"
                    className="w-full rounded-lg border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] px-3 py-2 text-xs"
                  />
                  <input
                    aria-label="Jabatan pemberi kuasa"
                  value={poaFirstParty.position || ""}
                    onChange={(event) => setPoaFirstParty({ ...poaFirstParty, position: event.target.value })}
                    placeholder="Jabatan"
                    className="w-full rounded-lg border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] px-3 py-2 text-xs"
                  />
                  <input
                    aria-label="Alamat pemberi kuasa"
                  value={poaFirstParty.address || ""}
                    onChange={(event) => setPoaFirstParty({ ...poaFirstParty, address: event.target.value })}
                    placeholder="Alamat"
                    className="w-full rounded-lg border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] px-3 py-2 text-xs"
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] p-5">
                <h3 className="mb-4 text-sm font-bold text-[var(--ds-fg)]">5. Pihak Kedua (Penerima Kuasa)</h3>
                <div className="space-y-2">
                  <input
                    aria-label="Nama penerima kuasa"
                  value={poaSecondParty.name}
                    onChange={(event) => setPoaSecondParty({ ...poaSecondParty, name: event.target.value })}
                    placeholder="Nama Lengkap"
                    className="w-full rounded-lg border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] px-3 py-2 text-xs"
                  />
                  <input
                    aria-label="Identitas penerima kuasa"
                  value={poaSecondParty.nip || ""}
                    onChange={(event) => setPoaSecondParty({ ...poaSecondParty, nip: event.target.value })}
                    placeholder="NIP / No. Identitas"
                    className="w-full rounded-lg border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] px-3 py-2 text-xs"
                  />
                  <input
                    aria-label="Jabatan penerima kuasa"
                  value={poaSecondParty.position || ""}
                    onChange={(event) => setPoaSecondParty({ ...poaSecondParty, position: event.target.value })}
                    placeholder="Jabatan"
                    className="w-full rounded-lg border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] px-3 py-2 text-xs"
                  />
                  <input
                    aria-label="Alamat penerima kuasa"
                  value={poaSecondParty.address || ""}
                    onChange={(event) => setPoaSecondParty({ ...poaSecondParty, address: event.target.value })}
                    placeholder="Alamat"
                    className="w-full rounded-lg border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] px-3 py-2 text-xs"
                  />
                  <div>
                    <label className="block text-xs font-semibold text-[var(--ds-fg-secondary)] mb-1">
                      Foto KTP Penerima Kuasa
                    </label>
                    <label aria-disabled={!canGenerate} className="bmn-upload-field relative flex items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--ds-border-subtle)] p-3 text-xs text-[var(--ds-fg-secondary)]">
                      <Upload className="h-4 w-4" />
                      <span>{poaKtpFile ? poaKtpFile.name : poaKtpPath ? "Ganti Foto KTP" : "Unggah Foto KTP"}</span>
                      <input aria-label="Foto KTP penerima kuasa" disabled={!canGenerate} type="file" accept="image/*" onChange={handlePoaKtpUpload} className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0" />
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <div className="min-w-0 rounded-2xl border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] p-5">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-[var(--ds-fg)]">6. Preview Dokumen</h3>
                  <p className="text-xs text-[var(--ds-fg-muted)]">{fullPoaNumber}</p>
                </div>
              </div>
              <div className="overflow-x-auto rounded-xl border border-[var(--ds-border-subtle)] bg-[var(--ds-surface-muted)] p-4">
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
