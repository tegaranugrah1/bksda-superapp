"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useDebounce } from "use-debounce";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { Eye, FileClock, FileText, Loader2, Pencil, Printer, Search, Trash2 } from "lucide-react";
import {
  handlePrintUsageAgreement,
  UsageAgreementDocument,
} from "../_components/UsageAgreementDocument";
import {
  handlePrintHandoverAgreement,
  HandoverAgreementDocument,
} from "../_components/HandoverAgreementDocument";
import {
  handlePrintPowerOfAttorney,
  PowerOfAttorneyDocument,
} from "../_components/PowerOfAttorneyDocument";
import {
  handlePrintCoveringLetter,
  CoveringLetterDocument,
} from "../_components/CoveringLetterDocument";
import { confirmAndDeleteDocument } from "../_lib/report-actions";
import { formatDate, isDraftNumber, type EmployeeOption } from "../_lib/report-utils";
import {
  type DocumentHistoryType,
  type DocumentHistoryItem,
  type PaginatedDocumentHistory,
  type UsageAgreementHistory,
  type HandoverAgreementHistory,
  type PowerOfAttorneyHistory,
  type CoveringLetterHistory,
  type BmnAssetOption,
  DEFAULT_FIRST_PARTY,
  DEFAULT_POA_FIRST_PARTY,
} from "../_lib/types";

export interface DocumentHistoryTabProps {
  canWrite?: boolean;
  employees: EmployeeOption[];
  vehicleAssetOptions?: BmnAssetOption[];
  onEdit: (item: DocumentHistoryItem) => void;
  onDuplicate: (item: DocumentHistoryItem) => void;
}

export function DocumentHistoryTab({
  canWrite = false,
  employees,
  vehicleAssetOptions = [],
  onEdit,
  onDuplicate,
}: DocumentHistoryTabProps) {
  const confirm = useConfirm();

  const [historyDocumentType, setHistoryDocumentType] = useState<DocumentHistoryType>("all");
  const [historyEmployeeFilter, setHistoryEmployeeFilter] = useState("");
  const [historySearch, setHistorySearch] = useState("");
  const [debouncedHistorySearch] = useDebounce(historySearch, 300);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyPerPage, setHistoryPerPage] = useState(10);

  const [selectedHistoryAgreement, setSelectedHistoryAgreement] = useState<UsageAgreementHistory | null>(null);
  const [selectedHandoverAgreement, setSelectedHandoverAgreement] = useState<HandoverAgreementHistory | null>(null);
  const [selectedPowerOfAttorney, setSelectedPowerOfAttorney] = useState<PowerOfAttorneyHistory | null>(null);
  const [selectedCoveringLetter, setSelectedCoveringLetter] = useState<CoveringLetterHistory | null>(null);

  const {
    data: documentHistory,
    isLoading: loadingDocumentHistory,
    isFetching: fetchingDocumentHistory,
    refetch: refetchDocumentHistory,
  } = useQuery<PaginatedDocumentHistory>({
    queryKey: [
      "bmn-document-histories",
      historyDocumentType,
      historyEmployeeFilter,
      debouncedHistorySearch,
      historyPage,
      historyPerPage,
    ],
    queryFn: async () => {
      const response = await api.get("/bmn/document-histories", {
        params: {
          type: historyDocumentType,
          page: historyPage,
          per_page: historyPerPage,
          ...(historyEmployeeFilter ? { employee_id: historyEmployeeFilter } : {}),
          ...(debouncedHistorySearch.trim() ? { search: debouncedHistorySearch.trim() } : {}),
        },
      });
      return response.data;
    },
  });

  const documentHistoryItems = documentHistory?.data || [];
  const documentHistoryMeta = documentHistory?.meta || {
    current_page: 1,
    from: null,
    last_page: 1,
    per_page: historyPerPage,
    to: null,
    total: 0,
  };

  const isUsageHistoryItem = (
    item: DocumentHistoryItem
  ): item is UsageAgreementHistory & { document_type: "usage_agreement" } =>
    item.document_type === "usage_agreement";

  const isPowerOfAttorneyHistoryItem = (
    item: DocumentHistoryItem
  ): item is PowerOfAttorneyHistory & { document_type: "power_of_attorney" } =>
    item.document_type === "power_of_attorney";

  const isCoveringLetterHistoryItem = (item: DocumentHistoryItem): item is CoveringLetterHistory =>
    item.document_type === "covering_letter";

  const documentTypeLabel = (item: DocumentHistoryItem) => {
    if (isUsageHistoryItem(item)) return "BA Pemakaian";
    if (isPowerOfAttorneyHistoryItem(item)) return "Surat Kuasa Kendaraan";
    if (isCoveringLetterHistoryItem(item)) return "Surat Pengantar";
    return item.variant === "vehicle" ? "BA Serah Terima Kendaraan" : "BA Serah Terima Barang";
  };

  const documentPartiesLabel = (item: DocumentHistoryItem) => {
    if (isUsageHistoryItem(item)) {
      return item.second_party_snapshot?.name || item.employee?.nama_lengkap || "-";
    }
    if (isCoveringLetterHistoryItem(item)) {
      return `${item.sender_snapshot?.name || item.sender_employee?.nama_lengkap || "Pengirim"} -> ${
        item.recipient_title || "Penerima"
      }`;
    }
    return `${item.first_party_snapshot?.name || "-"} -> ${item.second_party_snapshot?.name || "-"}`;
  };

  const documentItemCountLabel = (item: DocumentHistoryItem) => {
    if (isUsageHistoryItem(item)) {
      return `${item.assets_snapshot?.length || 0} aset`;
    }
    if (isPowerOfAttorneyHistoryItem(item)) {
      return `${item.assets_snapshot?.length || 0} kendaraan`;
    }
    if (isCoveringLetterHistoryItem(item)) {
      return `${item.items_snapshot?.length || 0} berkas`;
    }
    return `${item.items_snapshot?.length || 0} item`;
  };

  const clearSelectedPreviews = () => {
    setSelectedHistoryAgreement(null);
    setSelectedHandoverAgreement(null);
    setSelectedPowerOfAttorney(null);
    setSelectedCoveringLetter(null);
  };

  const viewDocument = (item: DocumentHistoryItem) => {
    clearSelectedPreviews();
    if (isUsageHistoryItem(item)) {
      setSelectedHistoryAgreement(item);
    } else if (isPowerOfAttorneyHistoryItem(item)) {
      setSelectedPowerOfAttorney(item);
    } else if (isCoveringLetterHistoryItem(item)) {
      setSelectedCoveringLetter(item);
    } else {
      setSelectedHandoverAgreement(item);
    }
  };

  const printDocumentDirect = (item: DocumentHistoryItem) => {
    viewDocument(item);
    window.setTimeout(() => {
      if (isUsageHistoryItem(item)) {
        handlePrintUsageAgreement("ba-pemakaian-history-print-root");
      } else if (isPowerOfAttorneyHistoryItem(item)) {
        handlePrintPowerOfAttorney("power-of-attorney-history-print-root");
      } else if (isCoveringLetterHistoryItem(item)) {
        handlePrintCoveringLetter("covering-letter-history-print-root");
      } else {
        handlePrintHandoverAgreement("ba-serah-terima-history-print-root");
      }
    }, 150);
  };

  const handleDelete = async (item: DocumentHistoryItem) => {
    let endpoint = "";
    let label = "";
    if (isUsageHistoryItem(item)) {
      endpoint = "/bmn/usage-agreements";
      label = "BA Pemakaian";
    } else if (isPowerOfAttorneyHistoryItem(item)) {
      endpoint = "/bmn/power-of-attorneys";
      label = "Surat Kuasa";
    } else if (isCoveringLetterHistoryItem(item)) {
      endpoint = "/bmn/covering-letters";
      label = "Surat Pengantar";
    } else {
      endpoint = "/bmn/handover-agreements";
      label = "BA Serah Terima";
    }

    await confirmAndDeleteDocument({
      confirm,
      endpoint,
      id: item.id,
      number: item.number,
      documentLabel: label,
      onSuccess: async () => {
        if (selectedHistoryAgreement?.id === item.id) setSelectedHistoryAgreement(null);
        if (selectedHandoverAgreement?.id === item.id) setSelectedHandoverAgreement(null);
        if (selectedPowerOfAttorney?.id === item.id) setSelectedPowerOfAttorney(null);
        if (selectedCoveringLetter?.id === item.id) setSelectedCoveringLetter(null);
        await refetchDocumentHistory();
      },
    });
  };

  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10">
            <FileClock className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-zinc-900 dark:text-white">Riwayat Dokumen</h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Semua dokumen dinas BMN yang pernah digenerate, dengan filter dan pencarian.
            </p>
          </div>
        </div>

        <div className="mb-3 flex flex-wrap gap-2">
          {([
            ["all", "Semua"],
            ["usage_agreement", "BA Pemakaian"],
            ["handover_agreement", "BA Serah Terima"],
            ["power_of_attorney", "Surat Kuasa"],
            ["covering_letter", "Surat Pengantar"],
          ] as const).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => {
                setHistoryDocumentType(value);
                setHistoryPage(1);
                clearSelectedPreviews();
              }}
              className={`h-9 rounded-xl border px-3 text-xs font-semibold transition ${
                historyDocumentType === value
                  ? "border-emerald-600 bg-emerald-600 text-white"
                  : "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-300"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[1fr_260px_160px] gap-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <input
              value={historySearch}
              onChange={(event) => {
                setHistorySearch(event.target.value);
                setHistoryPage(1);
              }}
              placeholder="Cari nomor dokumen, nama pegawai, pembuat..."
              className="h-12 w-full rounded-xl border border-zinc-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/10 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
            />
          </div>

          <select
            value={historyEmployeeFilter}
            onChange={(event) => {
              setHistoryEmployeeFilter(event.target.value);
              setHistoryPage(1);
            }}
            className="h-12 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/10 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
          >
            <option value="">Semua Pegawai</option>
            {employees.map((employee) => (
              <option key={employee.id} value={employee.id}>
                {employee.nama_lengkap}
              </option>
            ))}
          </select>

          <select
            value={historyPerPage}
            onChange={(event) => {
              setHistoryPerPage(Number(event.target.value));
              setHistoryPage(1);
            }}
            className="h-12 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/10 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
          >
            {[10, 25, 50].map((value) => (
              <option key={value} value={value}>
                {value} / halaman
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Daftar Riwayat Dokumen</h3>
            <p className="text-xs text-zinc-500">
              {documentHistoryMeta.total === 0
                ? "0 dokumen"
                : `${documentHistoryMeta.from || 0}-${documentHistoryMeta.to || 0} dari ${
                    documentHistoryMeta.total
                  } dokumen`}
            </p>
          </div>
          {(loadingDocumentHistory || fetchingDocumentHistory) && (
            <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
          )}
        </div>
        <div className="max-h-96 overflow-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
          <table className="w-full min-w-[1040px] text-left text-xs">
            <thead className="sticky top-0 bg-zinc-50 text-zinc-500 dark:bg-zinc-950 dark:text-zinc-400">
              <tr>
                <th className="px-3 py-2">Jenis</th>
                <th className="px-3 py-2">Nomor</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Tanggal</th>
                <th className="px-3 py-2">Pegawai / Pihak</th>
                <th className="px-3 py-2">Barang / Berkas</th>
                <th className="px-3 py-2">Pembuat</th>
                <th className="px-3 py-2 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {documentHistoryItems.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-3 py-8 text-center text-zinc-500">
                    Belum ada riwayat dokumen yang sesuai filter.
                  </td>
                </tr>
              ) : (
                documentHistoryItems.map((item) => (
                  <tr
                    key={item.id}
                    className={`text-zinc-700 dark:text-zinc-200 ${
                      selectedHistoryAgreement?.id === item.id ||
                      selectedHandoverAgreement?.id === item.id ||
                      selectedPowerOfAttorney?.id === item.id ||
                      selectedCoveringLetter?.id === item.id
                        ? "bg-emerald-50/70 dark:bg-emerald-500/10"
                        : ""
                    }`}
                  >
                    <td className="px-3 py-2">
                      <span
                        className={`rounded-full px-2 py-1 text-[11px] font-semibold ${
                          isUsageHistoryItem(item)
                            ? "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300"
                            : isPowerOfAttorneyHistoryItem(item)
                            ? "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300"
                            : isCoveringLetterHistoryItem(item)
                            ? "bg-purple-50 text-purple-700 dark:bg-purple-500/10 dark:text-purple-300"
                            : "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
                        }`}
                      >
                        {documentTypeLabel(item)}
                      </span>
                    </td>
                    <td className="px-3 py-2 font-semibold">
                      {isDraftNumber(item.number) ? (
                        <div>
                          <span className="font-mono text-xs text-zinc-700 dark:text-zinc-300">{item.number}</span>
                          <span className="block text-[10px] font-medium text-amber-600 dark:text-amber-400">
                            Belum ada nomor
                          </span>
                        </div>
                      ) : (
                        item.number
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                          item.status === "draft" || isDraftNumber(item.number)
                            ? "border border-amber-200/60 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-400"
                            : "border border-emerald-200/60 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            item.status === "draft" || isDraftNumber(item.number) ? "bg-amber-500" : "bg-emerald-500"
                          }`}
                        />
                        {item.status === "draft" || isDraftNumber(item.number) ? "Draf" : "Terbit"}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-zinc-500">{formatDate(item.document_date)}</td>
                    <td className="px-3 py-2 text-zinc-500">{documentPartiesLabel(item)}</td>
                    <td className="px-3 py-2 text-zinc-500">{documentItemCountLabel(item)}</td>
                    <td className="px-3 py-2 text-zinc-500">{item.generator?.name || "-"}</td>
                    <td className="px-3 py-2">
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8 rounded-lg border-emerald-200 px-2 text-xs text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-950/50"
                          onClick={() => onEdit(item)}
                        >
                          <Pencil className="mr-1 h-3.5 w-3.5" />
                          Edit
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8 rounded-lg px-2 text-xs"
                          onClick={() => viewDocument(item)}
                        >
                          <Eye className="mr-1 h-3.5 w-3.5" />
                          Lihat
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          className="h-8 rounded-lg bg-emerald-600 px-2 text-xs hover:bg-emerald-500"
                          onClick={() => printDocumentDirect(item)}
                        >
                          <Printer className="mr-1 h-3.5 w-3.5" />
                          Cetak
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8 rounded-lg px-2 text-xs"
                          onClick={() => onDuplicate(item)}
                        >
                          <FileText className="mr-1 h-3.5 w-3.5" />
                          Duplikasi
                        </Button>
                        {canWrite && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8 rounded-lg border-rose-200 px-2 text-xs text-rose-600 hover:bg-rose-50"
                            onClick={() => handleDelete(item)}
                          >
                            <Trash2 className="mr-1 h-3.5 w-3.5" />
                            Hapus
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="mt-4 flex flex-col gap-3 border-t border-zinc-100 pt-4 text-xs text-zinc-500 dark:border-zinc-800 sm:flex-row sm:items-center sm:justify-between">
          <span>
            Halaman {documentHistoryMeta.current_page} dari {documentHistoryMeta.last_page || 1}
          </span>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 rounded-lg px-3 text-xs"
              disabled={documentHistoryMeta.current_page <= 1 || loadingDocumentHistory || fetchingDocumentHistory}
              onClick={() => setHistoryPage((page) => Math.max(1, page - 1))}
            >
              Sebelumnya
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 rounded-lg px-3 text-xs"
              disabled={
                documentHistoryMeta.current_page >= documentHistoryMeta.last_page ||
                loadingDocumentHistory ||
                fetchingDocumentHistory
              }
              onClick={() =>
                setHistoryPage((page) => Math.min(documentHistoryMeta.last_page || page, page + 1))
              }
            >
              Berikutnya
            </Button>
          </div>
        </div>
      </div>

      {selectedHistoryAgreement && (
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Preview Arsip BA</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {selectedHistoryAgreement.number} - {formatDate(selectedHistoryAgreement.document_date)}
              </p>
            </div>
            <Button
              className="rounded-xl gap-2 bg-emerald-600 hover:bg-emerald-500"
              onClick={() => handlePrintUsageAgreement("ba-pemakaian-history-print-root")}
            >
              <Printer className="w-4 h-4" />
              Cetak Arsip
            </Button>
          </div>
          <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-zinc-100 p-4 dark:border-zinc-800 dark:bg-zinc-950">
            <UsageAgreementDocument
              documentId="ba-pemakaian-history-print-root"
              number={selectedHistoryAgreement.number}
              documentDate={selectedHistoryAgreement.document_date}
              firstParty={selectedHistoryAgreement.first_party_snapshot || DEFAULT_FIRST_PARTY}
              secondParty={
                selectedHistoryAgreement.second_party_snapshot || { name: "", nip: "", rank: "", position: "" }
              }
              assets={selectedHistoryAgreement.assets_snapshot || []}
              notes={selectedHistoryAgreement.notes || ""}
            />
          </div>
        </div>
      )}

      {selectedHandoverAgreement && (
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Preview Arsip BA Serah Terima</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {selectedHandoverAgreement.number} - {formatDate(selectedHandoverAgreement.document_date)}
              </p>
            </div>
            <Button
              className="rounded-xl gap-2 bg-emerald-600 hover:bg-emerald-500"
              onClick={() => handlePrintHandoverAgreement("ba-serah-terima-history-print-root")}
            >
              <Printer className="w-4 h-4" />
              Cetak Arsip
            </Button>
          </div>
          <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-zinc-100 p-4 dark:border-zinc-800 dark:bg-zinc-950">
            <HandoverAgreementDocument
              documentId="ba-serah-terima-history-print-root"
              number={selectedHandoverAgreement.number}
              title={selectedHandoverAgreement.title}
              variant={selectedHandoverAgreement.variant}
              documentDate={selectedHandoverAgreement.document_date}
              firstParty={selectedHandoverAgreement.first_party_snapshot}
              secondParty={selectedHandoverAgreement.second_party_snapshot}
              items={selectedHandoverAgreement.items_snapshot || []}
              description={selectedHandoverAgreement.metadata?.description || ""}
              receiptClause={selectedHandoverAgreement.metadata?.receipt_clause}
              signerCount={
                selectedHandoverAgreement.metadata?.signer_count ||
                (selectedHandoverAgreement.witness_snapshot ? 3 : 2)
              }
              witness={selectedHandoverAgreement.witness_snapshot || selectedHandoverAgreement.metadata?.witness}
            />
          </div>
        </div>
      )}

      {selectedPowerOfAttorney && (
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Preview Arsip Surat Kuasa</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {selectedPowerOfAttorney.number} - {formatDate(selectedPowerOfAttorney.document_date)}
              </p>
            </div>
            <Button
              className="rounded-xl gap-2 bg-emerald-600 hover:bg-emerald-500"
              onClick={() => handlePrintPowerOfAttorney("power-of-attorney-history-print-root")}
            >
              <Printer className="w-4 h-4" />
              Cetak Arsip
            </Button>
          </div>
          <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-zinc-100 p-4 dark:border-zinc-800 dark:bg-zinc-950">
            <PowerOfAttorneyDocument
              documentId="power-of-attorney-history-print-root"
              number={selectedPowerOfAttorney.number}
              documentDate={selectedPowerOfAttorney.document_date}
              firstParty={selectedPowerOfAttorney.first_party_snapshot || DEFAULT_POA_FIRST_PARTY}
              secondParty={
                selectedPowerOfAttorney.second_party_snapshot || {
                  name: "",
                  nip: "",
                  position: "",
                  address: "Jln. Teuku Umar Samarinda",
                }
              }
              assets={(selectedPowerOfAttorney.assets_snapshot || []).map((snapshotAsset) => {
                const matched = vehicleAssetOptions.find((a) => a.id === snapshotAsset.id);
                return {
                  ...snapshotAsset,
                  stnk_document: matched?.stnk_document || snapshotAsset.stnk_document || null,
                };
              })}
              notes={selectedPowerOfAttorney.notes || ""}
              ktpUrl={selectedPowerOfAttorney.ktp_url}
            />
          </div>
        </div>
      )}

      {selectedCoveringLetter && (
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Preview Arsip Surat Pengantar</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {selectedCoveringLetter.number} - {formatDate(selectedCoveringLetter.document_date)}
              </p>
            </div>
            <Button
              className="rounded-xl gap-2 bg-emerald-600 hover:bg-emerald-500"
              onClick={() => handlePrintCoveringLetter("covering-letter-history-print-root")}
            >
              <Printer className="w-4 h-4" />
              Cetak Arsip
            </Button>
          </div>
          <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-zinc-100 p-4 dark:border-zinc-800 dark:bg-zinc-950">
            <CoveringLetterDocument
              documentId="covering-letter-history-print-root"
              number={selectedCoveringLetter.number}
              hasNumber={selectedCoveringLetter.metadata?.has_number ?? selectedCoveringLetter.number !== "-"}
              showNumberAndRegarding={
                selectedCoveringLetter.metadata?.header_mode !== undefined
                  ? selectedCoveringLetter.metadata.header_mode !== "none"
                  : true
              }
              regarding={selectedCoveringLetter.regarding}
              documentDate={selectedCoveringLetter.document_date}
              recipientTitle={selectedCoveringLetter.recipient_title}
              recipientLocation={selectedCoveringLetter.recipient_location}
              items={selectedCoveringLetter.items_snapshot || []}
              closingPhrase={selectedCoveringLetter.closing_phrase}
              receivedDate={selectedCoveringLetter.received_date}
              showSignatures={selectedCoveringLetter.show_signatures ?? true}
              showReceiverSignature={
                selectedCoveringLetter.metadata?.show_receiver !== undefined
                  ? selectedCoveringLetter.metadata.show_receiver
                  : Boolean(selectedCoveringLetter.receiver_snapshot?.name?.trim())
              }
              receiverIncludePhone={selectedCoveringLetter.metadata?.receiver_include_phone ?? false}
              receiverPhone={selectedCoveringLetter.metadata?.receiver_phone || ""}
              sender={selectedCoveringLetter.sender_snapshot}
              receiver={selectedCoveringLetter.receiver_snapshot}
            />
          </div>
        </div>
      )}
    </section>
  );
}
