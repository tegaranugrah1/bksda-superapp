"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { Archive, Loader2, Printer, Save } from "lucide-react";
import {
  handlePrintUsageAgreement,
  UsageAgreementDocument,
  type UsageAgreementAsset,
  type UsageAgreementParty,
} from "../_components/UsageAgreementDocument";
import { RecentDocumentTable } from "../_components/RecentDocumentTable";
import { AssetSelectionTable } from "../_components/AssetSelectionTable";
import { confirmAndDeleteDocument } from "../_lib/report-actions";
import {
  todayInputValue,
  buildBaNumber,
  formatNip,
  isDraftNumber,
  extractDocumentSequence,
  extractDocumentKap,
  type EmployeeOption,
} from "../_lib/report-utils";
import {
  type UsageAgreementHistory,
  type EditingDocumentState,
  DEFAULT_FIRST_PARTY,
} from "../_lib/types";

export interface UsageAgreementTabProps {
  formState: ReturnType<typeof useUsageAgreementFormState>;
  employees: EmployeeOption[];
  loadingEmployees?: boolean;
  canGenerate?: boolean;
  canWrite?: boolean;
  canDelete?: boolean;
  editingDocument?: EditingDocumentState | null;
  onSetEditingDocument?: (doc: EditingDocumentState) => void;
  onClearEditing?: () => void;
  onViewHistory?: (item: UsageAgreementHistory) => void;
  onRefetchHistory?: () => Promise<void> | void;
}

export function useUsageAgreementFormState(editingDocument?: EditingDocumentState | null) {
  const editingAppliedRef = useRef<EditingDocumentState | null | undefined>(undefined);
  const initialItem =
    editingDocument && editingDocument.type === "usage"
      ? (editingDocument.item as UsageAgreementHistory | undefined)
      : undefined;

  const [selectedEmployeeId, setSelectedEmployeeId] = useState(
    initialItem?.employee?.id ? String(initialItem.employee.id) : (initialItem?.second_party_snapshot?.id ? String(initialItem.second_party_snapshot.id) : "")
  );
  const [assets, setAssets] = useState<UsageAgreementAsset[]>(
    initialItem?.assets_snapshot || []
  );
  const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>(
    initialItem?.asset_ids || initialItem?.assets_snapshot?.map((a) => a.id) || []
  );
  const [history, setHistory] = useState<UsageAgreementHistory[]>([]);
  const [loadingUsageData, setLoadingUsageData] = useState(false);
  const [savingUsageAgreement, setSavingUsageAgreement] = useState(false);
  const [baSequence, setBaSequence] = useState(
    editingDocument?.isDuplicate ? "" : (initialItem?.number ? extractDocumentSequence(initialItem.number) : "")
  );
  const [kap, setKap] = useState(
    (initialItem?.number ? extractDocumentKap(initialItem.number) : null) || (initialItem as any)?.kap || "KAP.03.02"
  );
  const [documentDate, setDocumentDate] = useState(
    initialItem?.document_date ? initialItem.document_date.split("T")[0] : todayInputValue()
  );
  const [firstPartyEmployeeId, setFirstPartyEmployeeId] = useState("");
  const [firstParty, setFirstParty] = useState<UsageAgreementParty>(
    initialItem?.first_party_snapshot || DEFAULT_FIRST_PARTY
  );
  const [notes, setNotes] = useState(
    initialItem?.notes ||
      "Sehingga tanggung jawab atas penggunaan, pengamanan, dan pemeliharaan yang dibebankan pada DIPA satuan kerja berada pada PIHAK KEDUA."
  );

  return {
    editingAppliedRef, selectedEmployeeId,
    setSelectedEmployeeId, assets,
    setAssets, selectedAssetIds,
    setSelectedAssetIds, history,
    setHistory, loadingUsageData,
    setLoadingUsageData, savingUsageAgreement,
    setSavingUsageAgreement, baSequence,
    setBaSequence, kap,
    setKap, documentDate,
    setDocumentDate, firstPartyEmployeeId,
    setFirstPartyEmployeeId, firstParty,
    setFirstParty, notes,
    setNotes,
  };
}

export function UsageAgreementTab({
  formState,
  employees,
  loadingEmployees = false,
  canGenerate = true,
  canWrite = false,
  canDelete = false,
  editingDocument,
  onSetEditingDocument,
  onClearEditing,
  onViewHistory,
  onRefetchHistory,
}: UsageAgreementTabProps) {
  const confirm = useConfirm();

  const {
    editingAppliedRef, selectedEmployeeId,
    setSelectedEmployeeId, assets,
    setAssets, selectedAssetIds,
    setSelectedAssetIds, history,
    setHistory, loadingUsageData,
    setLoadingUsageData, savingUsageAgreement,
    setSavingUsageAgreement, baSequence,
    setBaSequence, kap,
    setKap, documentDate,
    setDocumentDate, firstPartyEmployeeId,
    setFirstPartyEmployeeId, firstParty,
    setFirstParty, notes,
    setNotes,
  } = formState;

  const selectedEmployee = useMemo(
    () => employees.find((employee) => String(employee.id) === selectedEmployeeId) || null,
    [employees, selectedEmployeeId]
  );

  const secondParty = useMemo<UsageAgreementParty>(() => ({
    name: selectedEmployee?.nama_lengkap || "",
    nip: formatNip(selectedEmployee?.nip),
    rank: selectedEmployee?.pangkat_golongan || "",
    position: selectedEmployee?.jabatan || "",
  }), [selectedEmployee]);

  const selectedAssets = useMemo(
    () => assets.filter((asset) => selectedAssetIds.includes(asset.id)),
    [assets, selectedAssetIds]
  );

  const fullBaNumber = useMemo(
    () => buildBaNumber(baSequence, kap, documentDate),
    [baSequence, kap, documentDate]
  );

  const recentEmployeeHistory = useMemo(
    () => history.slice(0, 5),
    [history]
  );

  const loadUsageData = useCallback(async (employeeId: string, agreement?: UsageAgreementHistory) => {
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
      const snapshotAssets = agreement?.assets_snapshot || [];
      setAssets(Array.from(new Map<string, UsageAgreementAsset>([...nextAssets, ...snapshotAssets].map((asset: UsageAgreementAsset) => [asset.id, asset])).values()));
      setSelectedAssetIds(agreement ? agreement.asset_ids || snapshotAssets.map((asset) => asset.id) : nextAssets.map((asset: UsageAgreementAsset) => asset.id));
      const nextHistory = historyResponse.data.data || [];
      setHistory(nextHistory);
    } catch {
      toast.error("Gagal memuat aset atau riwayat BA pegawai.");
    } finally {
      setLoadingUsageData(false);
    }
  }, []);

  const handleEmployeeChange = async (employeeId: string) => {
    setSelectedEmployeeId(employeeId);
    await loadUsageData(employeeId);
  };

  const applyDataToForm = (item: UsageAgreementHistory, isDuplicate = false) => {
    const empId = item.employee?.id || item.second_party_snapshot?.id;
    if (empId) {
      setSelectedEmployeeId(String(empId));
      loadUsageData(String(empId), item);
    }

    setBaSequence(isDuplicate ? "" : extractDocumentSequence(item.number));
    const kapVal = extractDocumentKap(item.number) || (item as any).kap;
    if (kapVal) setKap(kapVal);
    if (item.document_date) {
      setDocumentDate(item.document_date.split("T")[0]);
    }
    setFirstPartyEmployeeId("");
    setFirstParty(item.first_party_snapshot || DEFAULT_FIRST_PARTY);
    if (item.assets_snapshot && item.assets_snapshot.length > 0) {
      setAssets((prev) => {
        const existingIds = new Set(prev.map((a) => a.id));
        const toAdd = item.assets_snapshot!.filter((a) => !existingIds.has(a.id));
        return [...prev, ...toAdd];
      });
    }
    setSelectedAssetIds(item.asset_ids || item.assets_snapshot?.map((a) => a.id) || []);
    setNotes(
      item.notes ||
        "Sehingga tanggung jawab atas penggunaan, pengamanan, dan pemeliharaan yang dibebankan pada DIPA satuan kerja berada pada PIHAK KEDUA."
    );
  };

  const resetForm = () => {
    setSelectedEmployeeId("");
    setAssets([]);
    setSelectedAssetIds([]);
    setHistory([]);
    setBaSequence("");
    setKap("KAP.03.02");
    setDocumentDate(todayInputValue());
    setFirstPartyEmployeeId("");
    setFirstParty(DEFAULT_FIRST_PARTY);
    setNotes(
      "Sehingga tanggung jawab atas penggunaan, pengamanan, dan pemeliharaan yang dibebankan pada DIPA satuan kerja berada pada PIHAK KEDUA."
    );
  };

  // History resources include full snapshots; synchronize edit mode once, without refetch overwriting a draft.

  useEffect(() => {
    if (editingAppliedRef.current === editingDocument) return;
    editingAppliedRef.current = editingDocument;
    if (editingDocument && editingDocument.type === "usage" && editingDocument.item) {
      applyDataToForm(editingDocument.item as UsageAgreementHistory, Boolean(editingDocument.isDuplicate));
    } else if (!editingDocument) {
      resetForm();
    }
  }, [editingDocument, loadUsageData, editingAppliedRef]);

  const handleFirstPartyChange = (employeeId: string) => {
    setFirstPartyEmployeeId(employeeId);
    const employee = employees.find((item) => String(item.id) === employeeId);
    setFirstParty(employee ? {
      name: employee.nama_lengkap,
      nip: formatNip(employee.nip),
      rank: employee.pangkat_golongan || "-",
      position: employee.jabatan || "-",
    } : DEFAULT_FIRST_PARTY);
  };

  const toggleAsset = (assetId: string) => {
    setSelectedAssetIds((current) =>
      current.includes(assetId)
        ? current.filter((id) => id !== assetId)
        : [...current, assetId]
    );
  };

  const duplicateHistoryAgreement = (agreement: UsageAgreementHistory) => {
    if (onSetEditingDocument) {
      onSetEditingDocument({
        type: "usage",
        titleOrNumber: isDraftNumber(agreement.number) ? "Dokumen (Draf)" : agreement.number,
        status: "draft",
        item: { ...agreement, document_type: "usage_agreement" },
        isDuplicate: true,
      });
      return;
    }

    setBaSequence("");
    const kapVal = extractDocumentKap(agreement.number);
    if (kapVal) setKap(kapVal);
    setDocumentDate(todayInputValue());
    setFirstPartyEmployeeId("");
    setFirstParty(agreement.first_party_snapshot || DEFAULT_FIRST_PARTY);
    if (agreement.assets_snapshot && agreement.assets_snapshot.length > 0) {
      setAssets((prev) => {
        const existingIds = new Set(prev.map((a) => a.id));
        const toAdd = agreement.assets_snapshot!.filter((a) => !existingIds.has(a.id));
        return [...prev, ...toAdd];
      });
    }
    setSelectedAssetIds(agreement.asset_ids || agreement.assets_snapshot?.map((a) => a.id) || []);
    setNotes(
      agreement.notes ||
      "Sehingga tanggung jawab atas penggunaan, pengamanan, dan pemeliharaan yang dibebankan pada DIPA satuan kerja berada pada PIHAK KEDUA."
    );
    toast.info("Arsip BA disalin sebagai dokumen baru. Silakan lengkapi nomor dan tanggal BA.");
  };

  const editUsageAgreement = async (agreement: UsageAgreementHistory) => {
    if (onSetEditingDocument) {
      onSetEditingDocument({
        id: agreement.id,
        type: "usage",
        titleOrNumber: isDraftNumber(agreement.number) ? "Dokumen (Draf)" : agreement.number,
        status: agreement.status || (isDraftNumber(agreement.number) ? "draft" : "published"),
        item: { ...agreement, document_type: "usage_agreement" },
        isDuplicate: false,
      });
      return;
    }

    const employeeId = agreement.employee?.id || agreement.second_party_snapshot?.id;
    if (employeeId) {
      setSelectedEmployeeId(String(employeeId));
      await loadUsageData(String(employeeId));
    }

    const seq = extractDocumentSequence(agreement.number);
    setBaSequence(seq);
    const kapVal = extractDocumentKap(agreement.number);
    if (kapVal) setKap(kapVal);

    if (agreement.document_date) {
      setDocumentDate(agreement.document_date);
    }
    setFirstPartyEmployeeId("");
    setFirstParty(agreement.first_party_snapshot || DEFAULT_FIRST_PARTY);
    if (agreement.assets_snapshot && agreement.assets_snapshot.length > 0) {
      setAssets((prev) => {
        const existingIds = new Set(prev.map((a) => a.id));
        const toAdd = agreement.assets_snapshot!.filter((a) => !existingIds.has(a.id));
        return [...prev, ...toAdd];
      });
    }
    setSelectedAssetIds(agreement.asset_ids || agreement.assets_snapshot?.map((a) => a.id) || []);
    setNotes(
      agreement.notes ||
      "Sehingga tanggung jawab atas penggunaan, pengamanan, dan pemeliharaan yang dibebankan pada DIPA satuan kerja berada pada PIHAK KEDUA."
    );
    toast.info(`Mengedit dokumen: ${isDraftNumber(agreement.number) ? "BA Pemakaian (Draf)" : agreement.number}`);
  };

  const printHistoryAgreement = (_agreement: UsageAgreementHistory) => {
    handlePrintUsageAgreement("ba-pemakaian-history-print-root");
  };

  const deleteHistoryAgreement = async (agreement: UsageAgreementHistory) => {
    await confirmAndDeleteDocument({
      confirm,
      endpoint: "/bmn/usage-agreements",
      id: agreement.id,
      number: agreement.number,
      documentLabel: "BA Pemakaian",
      onSuccess: async () => {
        if (selectedEmployeeId) {
          await loadUsageData(selectedEmployeeId);
        }
        if (onRefetchHistory) {
          await onRefetchHistory();
        }
      },
    });
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
      const isDraft = !baSequence.trim();
      const payload = {
        number: isDraft ? null : fullBaNumber,
        status: isDraft ? "draft" : "published",
        document_date: documentDate,
        employee_id: selectedEmployee.id,
        first_party_snapshot: firstParty,
        second_party_snapshot: {
          ...secondParty,
          id: selectedEmployee.id,
          unit: selectedEmployee.satuan_kerja || null,
        },
        assets_snapshot: selectedAssets,
        asset_ids: selectedAssets.map((asset) => asset.id),
        notes: notes.trim() || null,
      };

      if (editingDocument && editingDocument.type === "usage" && editingDocument.id && !editingDocument.isDuplicate) {
        await api.put(`/bmn/usage-agreements/${editingDocument.id}`, payload);
        toast.success(isDraft ? "Draf BA Pemakaian berhasil diperbarui." : "Perubahan BA Pemakaian berhasil disimpan.");
        if (onClearEditing) onClearEditing();
      } else {
        await api.post("/bmn/usage-agreements", payload);
        toast.success(isDraft ? "Draf BA Pemakaian berhasil disimpan." : "Riwayat BA Pemakaian berhasil disimpan.");
        if (onClearEditing) onClearEditing();
      }

      await loadUsageData(String(selectedEmployee.id));
      if (onRefetchHistory) {
        await onRefetchHistory();
      }
    } catch {
      toast.error("Gagal menyimpan riwayat BA Pemakaian.");
    } finally {
      setSavingUsageAgreement(false);
    }
  };

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] p-5">
        <div>
          <h2 className="text-base font-bold text-[var(--ds-fg)]">Generate BA Pemakaian BMN</h2>
          <p className="text-xs text-[var(--ds-fg-muted)]">
            {selectedEmployee ? fullBaNumber : "Pilih pegawai untuk mulai membuat dokumen."}
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button
            variant="outline"
            className="rounded-xl gap-2"
            onClick={saveUsageAgreement}
            disabled={savingUsageAgreement || !selectedEmployee || !canGenerate}
          >
            {savingUsageAgreement ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {editingDocument?.type === "usage" && !editingDocument.isDuplicate
              ? baSequence.trim()
                ? "Simpan Perubahan"
                : "Simpan Perubahan (Draf)"
              : !baSequence.trim()
              ? "Simpan Draf"
              : "Simpan Riwayat"}
          </Button>
          <Button
            className="rounded-xl gap-2"
            onClick={() => handlePrintUsageAgreement()}
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
            <h3 className="text-sm font-bold text-[var(--ds-fg)]">1. Pilih Pegawai</h3>
            <p className="text-xs text-[var(--ds-fg-muted)]">Aset dan riwayat BA akan dimuat otomatis dari pegawai terpilih.</p>
          </div>
          {loadingUsageData && <Loader2 className="w-4 h-4 animate-spin text-[var(--ds-accent-fg)]" />}
        </div>
        <select
          aria-label="Pegawai pemakai BMN"
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
            <Archive className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-[var(--ds-fg)]">Belum ada dokumen yang dibuat</h3>
          <p className="mx-auto mt-1 max-w-md text-xs text-[var(--ds-fg-muted)]">
            Pilih pegawai terlebih dahulu. Setelah itu kamu bisa memilih aset, melengkapi nomor BA, lalu preview dan cetak dokumen.
          </p>
        </div>
      ) : (
        <>
          <RecentDocumentTable
            items={recentEmployeeHistory}
            title="BA Terakhir Pegawai Ini"
            subtitle="Gunakan arsip lama sebagai referensi, cetak ulang, atau duplikasi sebagai BA baru."
            unitLabel="aset"
            emptyMessage="Belum ada BA Pemakaian yang pernah digenerate untuk pegawai ini."
            loading={loadingUsageData}
            canWrite={canWrite}
            canDelete={canDelete}
            onEdit={editUsageAgreement}
            onView={(item) => {
              if (onViewHistory) onViewHistory(item);
            }}
            onPrint={printHistoryAgreement}
            onDuplicate={duplicateHistoryAgreement}
            onDelete={deleteHistoryAgreement}
          />

          <div className="rounded-2xl border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-[var(--ds-fg)]">2. Pilih Aset Dipakai</h3>
                <p className="text-xs text-[var(--ds-fg-muted)]">{selectedAssets.length} dari {assets.length} aset dipilih</p>
              </div>
            </div>
            <AssetSelectionTable
              items={assets}
              selectedIds={selectedAssetIds}
              onToggle={toggleAsset}
              emptyMessage="Belum ada aset BMN yang terhubung dengan pegawai ini."
              columns={[
                {
                  header: "Barang",
                  render: (asset) => <span className="font-semibold">{asset.nama_barang}</span>,
                },
                {
                  header: "Kode",
                  className: "text-[var(--ds-fg-muted)]",
                  render: (asset) => <span className="text-[var(--ds-fg-muted)]">{asset.kode_barang}</span>,
                },
                {
                  header: "NUP",
                  className: "text-[var(--ds-fg-muted)]",
                  render: (asset) => <span className="text-[var(--ds-fg-muted)]">{asset.nup}</span>,
                },
                {
                  header: "Kondisi",
                  className: "text-[var(--ds-fg-muted)]",
                  render: (asset) => <span className="text-[var(--ds-fg-muted)]">{asset.kondisi || "-"}</span>,
                },
              ]}
            />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-[380px_minmax(0,1fr)] gap-5">
            <div className="rounded-2xl border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] p-5">
              <h3 className="mb-4 text-sm font-bold text-[var(--ds-fg)]">3. Detail BA</h3>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <label className="block">
                    <span className="text-xs font-semibold text-[var(--ds-fg-secondary)]">Nomor BA</span>
                    <input
                      value={baSequence}
                      onChange={(event) => setBaSequence(event.target.value)}
                      placeholder="contoh: 015"
                      className="mt-1 w-full rounded-xl border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] px-3 py-2 text-sm outline-none"
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs font-semibold text-[var(--ds-fg-secondary)]">KAP</span>
                    <input
                      value={kap}
                      onChange={(event) => setKap(event.target.value)}
                      placeholder="KAP.03.02"
                      className="mt-1 w-full rounded-xl border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] px-3 py-2 text-sm outline-none"
                    />
                  </label>
                </div>

                <label className="block">
                  <span className="text-xs font-semibold text-[var(--ds-fg-secondary)]">Tanggal BA</span>
                  <input
                    type="date"
                    value={documentDate}
                    onChange={(event) => setDocumentDate(event.target.value)}
                    className="mt-1 w-full rounded-xl border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] px-3 py-2 text-sm outline-none"
                  />
                </label>

                <div className="rounded-xl border border-[var(--ds-border-subtle)] p-3 space-y-2">
                  <p className="text-xs font-semibold text-[var(--ds-fg-secondary)]">Pihak Pertama (Kepala Balai)</p>
                  <select
                    aria-label="Pilih pihak pertama"
                  value={firstPartyEmployeeId}
                    onChange={(event) => handleFirstPartyChange(event.target.value)}
                    className="w-full rounded-lg border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] px-3 py-2 text-xs"
                  >
                    <option value="">Default Kepala Balai - M. Ari Wibawanto</option>
                    {employees.map((employee) => (
                      <option key={employee.id} value={employee.id}>
                        {employee.nama_lengkap || employee.name} - {formatNip(employee.nip)}
                      </option>
                    ))}
                  </select>
                  <input
                    aria-label="Nama pihak pertama"
                  value={firstParty.name}
                    onChange={(event) => setFirstParty({ ...firstParty, name: event.target.value })}
                    className="w-full rounded-lg border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] px-3 py-2 text-xs"
                  />
                  <input
                    aria-label="NIP pihak pertama"
                  value={firstParty.nip || ""}
                    onChange={(event) => setFirstParty({ ...firstParty, nip: event.target.value })}
                    className="w-full rounded-lg border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] px-3 py-2 text-xs"
                  />
                  <input
                    aria-label="Pangkat pihak pertama"
                  value={firstParty.rank || ""}
                    onChange={(event) => setFirstParty({ ...firstParty, rank: event.target.value })}
                    className="w-full rounded-lg border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] px-3 py-2 text-xs"
                  />
                  <textarea
                    aria-label="Jabatan pihak pertama"
                  value={firstParty.position || ""}
                    onChange={(event) => setFirstParty({ ...firstParty, position: event.target.value })}
                    rows={2}
                    className="w-full rounded-lg border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] px-3 py-2 text-xs"
                  />
                </div>

                <textarea
                  aria-label="Catatan BA Pemakaian"
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  rows={3}
                  className="w-full rounded-xl border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] px-3 py-2 text-xs outline-none"
                />
              </div>
            </div>

            <div className="min-w-0 rounded-2xl border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] p-5">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-[var(--ds-fg)]">4. Preview Dokumen</h3>
                  <p className="text-xs text-[var(--ds-fg-muted)]">{fullBaNumber}</p>
                </div>
              </div>
              <div className="overflow-x-auto rounded-xl border border-[var(--ds-border-subtle)] bg-[var(--ds-surface-muted)] p-4">
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
          </div>
        </>
      )}
    </>
  );
}
