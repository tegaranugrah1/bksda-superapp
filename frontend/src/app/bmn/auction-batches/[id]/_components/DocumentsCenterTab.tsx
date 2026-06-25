"use client";

import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { getDocumentContext, recordPrintEvent, updateDraftMetadata, AuctionBatch, ChecklistResponse } from "../../_lib/api";
import { AUCTION_DOCUMENT_WORKFLOW, AuctionDocumentPhase } from "../_lib/document-workflow";
import { toast } from "sonner";
import {
  Check,
  ChevronsUpDown,
  Loader2,
  Printer,
  AlertTriangle,
  Search,
  GripVertical,
  X,
} from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

// Import candidate print components directly to avoid code duplication
import {
  CorrectionDocument as BaKoreksiDocument,
  handlePrintBa as handlePrintBaKoreksi,
} from "../../../auction-candidates/_components/BaKoreksiDocument";
import {
  SkPenghentianDocument,
  handlePrintSk as handlePrintSkPenghentian,
} from "../../../auction-candidates/_components/SkPenghentianDocument";
import {
  SkPanitiaDocument,
  handlePrintSkPanitia,
} from "../../../auction-candidates/_components/SkPanitiaDocument";
import {
  SkTimPenilaiDocument,
  handlePrintSkTimPenilai,
} from "../../../auction-candidates/_components/SkTimPenilaiDocument";
import {
  SptjLimitDocument,
  handlePrintSptjLimit,
} from "../../../auction-candidates/_components/SptjLimitDocument";
import {
  SptjmDocument,
  handlePrintSptjm,
} from "../../../auction-candidates/_components/SptjmDocument";
import {
  SpTugasDocument,
  handlePrintSpTugas,
} from "../../../auction-candidates/_components/SpTugasDocument";
import {
  SkKebenaranDokumenDocument as SkKebenaranDocument,
  handlePrintSkKebenaran,
} from "../../../auction-candidates/_components/SkKebenaranDokumenDocument";
import {
  BaPemeriksaanDocument,
  handlePrintBaPemeriksaan,
} from "../../../auction-candidates/_components/BaPemeriksaanDocument";
import {
  NotaDinasDocument,
  handlePrintNotaDinas,
} from "../../../auction-candidates/_components/NotaDinasDocument";
import {
  PermohonanKpknlDocument,
  handlePrintPermohonanKpknl,
} from "../../../auction-candidates/_components/PermohonanKpknlDocument";
import { SuratTugasPemeriksaanPenilaianDocument } from "../../../auction-candidates/_components/SuratTugasPemeriksaanPenilaianDocument";
import { PERNYATAAN_PRINT_CSS } from "../../../auction-candidates/_lib/print-pernyataan";

import {
  DEFAULT_MEMUTUSKAN,
  DEFAULT_MENIMBANG,
  DEFAULT_MENGINGAT,
} from "../../../auction-candidates/_lib/sk-defaults";
import {
  DEFAULT_PANITIA_MEMUTUSKAN,
  DEFAULT_PANITIA_MENIMBANG,
  DEFAULT_PANITIA_MENGINGAT,
  DEFAULT_PANITIA_TEMBUSAN,
} from "../../../auction-candidates/_lib/sk-panitia-defaults";
import {
  DEFAULT_TIM_PENILAI_MEMUTUSKAN,
  DEFAULT_TIM_PENILAI_MENIMBANG,
  DEFAULT_TIM_PENILAI_MENGINGAT,
  DEFAULT_TIM_PENILAI_TEMBUSAN,
} from "../../../auction-candidates/_lib/sk-tim-penilai-defaults";
import type { Employee } from "./workflow/types";

interface DocumentsCenterTabProps {
  batch: AuctionBatch;
  phaseFilter?: AuctionDocumentPhase;
  checklist?: ChecklistResponse | null;
  onRefetch?: () => void;
}

interface DocumentItem {
  key: string;
  title: string;
  category: "internal" | "sk" | "pernyataan" | "eksternal";
  description: string;
  rootId: string;
  workflowKey?: string;
  channel?: string;
  requiresValuation?: boolean;
  printable?: boolean;
  numberKey?: string | null;
  dateKey?: string | null;
}

interface CommitteePickerProps {
  label: string;
  description: string;
  employees: Employee[];
  selectedIds: string[];
  disabled: boolean;
  onChange: (ids: string[]) => void;
}

const channelLabels: Record<string, string> = {
  srikandi: "Srikandi",
  manual_ttd: "Manual TTD",
  external: "Eksternal",
  app: "Aplikasi",
};

const documentNumberPrefixes: Record<string, string> = {
  ba_koreksi: "BA.",
  sk_penghentian: "SK.",
  sk_panitia: "SK.",
  sk_tim_penilai: "SK.",
  sk_kebenaran: "KT.",
  sptjm: "SPTJM.",
  sp_tugas: "SM.",
  ba_pemeriksaan: "BA.",
  surat_tugas_pemeriksaan_penilaian: "ST.",
  sptj_limit: "SM.",
  nota_dinas: "ND.",
  permohonan_kpknl: "S.",
};

const defaultDocumentKaps: Record<string, string> = {
  sptjm: "BALAI",
  sptj_limit: "BALAI",
  sp_tugas: "BALAI",
};

const getEmployeeName = (employee: Employee) => employee.nama_lengkap || employee.name || "-";
const getEmployeePosition = (employee: Employee) => employee.jabatan || employee.position || "";
const getEmployeeLabel = (employee: Employee) =>
  `${getEmployeeName(employee)}${employee.nip ? ` - NIP. ${employee.nip}` : ""}`;

function normalizeIds(value: unknown): string[] {
  return Array.isArray(value) ? value.filter(Boolean).map((id) => String(id)) : [];
}

function toggleId(ids: string[], id: string) {
  return ids.includes(id) ? ids.filter((value) => value !== id) : [...ids, id];
}

function CommitteePicker({
  label,
  description,
  employees,
  selectedIds,
  disabled,
  onChange,
}: CommitteePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const selectedEmployees = selectedIds
    .map((id) => employees.find((employee) => String(employee.id) === id))
    .filter(Boolean) as Employee[];
  const filteredEmployees = employees.filter((employee) => {
    const query = search.trim().toLowerCase();
    if (!query) return true;

    return [getEmployeeName(employee), employee.nip, getEmployeePosition(employee)]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(query));
  });
  const reorderSelected = (dragId: string, targetId: string) => {
    if (disabled || dragId === targetId) return;

    const fromIndex = selectedIds.indexOf(dragId);
    const toIndex = selectedIds.indexOf(targetId);
    if (fromIndex < 0 || toIndex < 0) return;

    const nextIds = [...selectedIds];
    const [movedId] = nextIds.splice(fromIndex, 1);
    nextIds.splice(toIndex, 0, movedId);
    onChange(nextIds);
  };

  return (
    <div className="rounded-xl border border-zinc-200 bg-zinc-50/40 p-3 dark:border-zinc-800 dark:bg-zinc-900/40">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold text-zinc-900 dark:text-zinc-50">{label}</p>
          <p className="mt-0.5 text-[11px] leading-relaxed text-zinc-500">{description}</p>
        </div>
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled}
              className="h-8 shrink-0 rounded-lg text-[11px] font-semibold"
            >
              Pilih ({selectedIds.length})
              <ChevronsUpDown className="h-3.5 w-3.5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[min(620px,calc(100vw-2rem))] p-0" align="end">
            <div className="border-b border-zinc-100 px-3 py-2 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 shrink-0 text-zinc-400" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Cari nama, NIP, atau jabatan..."
                  className="h-9 border-0 px-0 text-xs focus-visible:ring-0"
                />
              </div>
            </div>
            <div className="max-h-80 overflow-y-auto p-1.5">
              {filteredEmployees.length === 0 ? (
                <div className="px-3 py-6 text-center text-xs text-zinc-500">Pegawai tidak ditemukan.</div>
              ) : (
                filteredEmployees.map((employee) => {
                  const employeeId = String(employee.id);
                  const isSelected = selectedIds.includes(employeeId);

                  return (
                    <button
                      key={employee.id}
                      type="button"
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs hover:bg-zinc-50 dark:hover:bg-zinc-900"
                      onClick={() => onChange(toggleId(selectedIds, employeeId))}
                    >
                      <Check className={`h-4 w-4 shrink-0 text-emerald-600 ${isSelected ? "opacity-100" : "opacity-0"}`} />
                      <span className="min-w-0">
                        <span className="block truncate font-semibold text-zinc-850 dark:text-zinc-100">
                          {getEmployeeName(employee)}
                        </span>
                        <span className="block truncate font-mono text-[10px] text-zinc-400">
                          NIP. {employee.nip || "-"}
                          {getEmployeePosition(employee) ? ` - ${getEmployeePosition(employee)}` : ""}
                        </span>
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {selectedEmployees.map((employee, index) => (
          <span
            key={employee.id}
            draggable={!disabled}
            onDragStart={(event) => {
              const employeeId = String(employee.id);
              setDraggingId(employeeId);
              event.dataTransfer.effectAllowed = "move";
              event.dataTransfer.setData("text/plain", employeeId);
            }}
            onDragEnd={() => setDraggingId(null)}
            onDragOver={(event) => {
              if (!disabled) {
                event.preventDefault();
                event.dataTransfer.dropEffect = "move";
              }
            }}
            onDrop={(event) => {
              event.preventDefault();
              const dragId = event.dataTransfer.getData("text/plain") || draggingId;
              if (dragId) {
                reorderSelected(dragId, String(employee.id));
              }
              setDraggingId(null);
            }}
            className={`inline-flex items-center gap-1 rounded-full bg-white px-2 py-1 text-[11px] font-semibold text-zinc-700 ring-1 ring-zinc-200 transition dark:bg-zinc-950 dark:text-zinc-200 dark:ring-zinc-800 ${
              draggingId === String(employee.id) ? "opacity-50 ring-emerald-300" : ""
            } ${disabled ? "" : "cursor-grab active:cursor-grabbing"}`}
          >
            <GripVertical className="h-3.5 w-3.5 shrink-0 text-zinc-400" />
            <span className="max-w-[13rem] truncate">
              {index + 1}. {getEmployeeName(employee)}
            </span>
            <button
              type="button"
              disabled={disabled}
              className="ml-0.5 rounded-full p-0.5 text-zinc-400 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-red-950/30"
              aria-label={`Hapus ${getEmployeeName(employee)}`}
              onClick={() => onChange(selectedIds.filter((id) => id !== String(employee.id)))}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </span>
        ))}
        {selectedEmployees.length === 0 && (
          <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-zinc-400 ring-1 ring-dashed ring-zinc-200 dark:bg-zinc-950 dark:ring-zinc-800">
            Belum dipilih
          </span>
        )}
      </div>
    </div>
  );
}

function buildDocumentNumberPreview(documentKey: string, number: string, kap: string) {
  const monthSuffix = `${String(new Date().getMonth() + 1).padStart(2, "0")}/${new Date().getFullYear()}`;
  const prefix = documentNumberPrefixes[documentKey] || "";

  return `${prefix}${number || "____"}/K.18/TU/${kap || "____"}/B/${monthSuffix}`;
}

export function DocumentsCenterTab({ batch, phaseFilter, checklist, onRefetch }: DocumentsCenterTabProps) {
  const [printingDocKey, setPrintingDocKey] = useState<string | null>(null);
  const [isKepalaPickerOpen, setIsKepalaPickerOpen] = useState(false);
  const [kepalaSearch, setKepalaSearch] = useState("");

  // Load document context
  const { data: contextResponse, isLoading, error, refetch: refetchContext } = useQuery({
    queryKey: ["bmn-auction-document-context", batch.id],
    queryFn: () => getDocumentContext(batch.id),
  });
  const { data: employees = [], isLoading: isLoadingEmployees } = useQuery<Employee[]>({
    queryKey: ["employees-select-auction-documents"],
    queryFn: async () => {
      const res = await api.get("/kepegawaian/employees/select");
      return res.data?.data || res.data || [];
    },
  });

  const context = contextResponse?.data;

  // Record print event mutation
  const logPrintMutation = useMutation({
    mutationFn: (docKey: string) => recordPrintEvent(batch.id, docKey),
  });
  const updateWorkflowMutation = useMutation({
    mutationFn: ({ workflowKey, status }: { workflowKey: string; status: string }) =>
      updateDraftMetadata(batch.id, {
        workflow: {
          documents: {
            [workflowKey]: { status: status as any },
          },
        },
      }),
    onSuccess: () => {
      toast.success("Status dokumen diperbarui.");
      refetchContext();
      onRefetch?.();
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Gagal memperbarui status dokumen.");
    },
  });
  const updateDocumentFieldsMutation = useMutation({
    mutationFn: ({
      numberKey,
      kapKey,
      dateKey,
      number,
      kap,
      date,
      kepalaBalaiId,
      signatories,
    }: {
      numberKey?: string | null;
      kapKey?: string | null;
      dateKey?: string | null;
      number?: string | null;
      kap?: string | null;
      date?: string | null;
      kepalaBalaiId?: string | null;
      signatories?: {
        panitia?: string[];
        tim_penilai?: string[];
        pemeriksa?: string[];
      };
    }) => {
      const payload: Parameters<typeof updateDraftMetadata>[1] = {};

      if (kepalaBalaiId !== undefined) {
        payload.kepala_balai_id = kepalaBalaiId || null;
      }

      if (signatories) {
        payload.signatories = signatories;
      }

      if (numberKey) {
        payload.document_numbers = { [numberKey]: number || null };
      }

      if (kapKey) {
        payload.document_kaps = { [kapKey]: kap || null };
      }

      if (dateKey) {
        payload.document_dates = { [dateKey]: date || null };
      }

      return updateDraftMetadata(batch.id, payload);
    },
    onSuccess: () => {
      toast.success("Data dokumen diperbarui.");
      refetchContext();
      onRefetch?.();
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Gagal memperbarui data dokumen.");
    },
  });

  const printDocumentConfig: Record<string, { description: string; rootId: string }> = {
    nota_dinas: {
      description: "Nota Dinas KSDAE setelah nilai taksiran tim penilai selesai.",
      rootId: "nota-dinas-print-root",
    },
    sk_penghentian: {
      description: "SK penetapan penghentian penggunaan aset BMN dari operasional dinas.",
      rootId: "sk-penghentian-print-root",
    },
    sk_panitia: {
      description: "SK pembentukan panitia pelaksana penghapusan BMN.",
      rootId: "sk-panitia-print-root",
    },
    sk_tim_penilai: {
      description: "SK pembentukan Panitia Penaksir Harga BMN.",
      rootId: "sk-tim-penilai-print-root",
    },
    ba_koreksi: {
      description: "Berita acara koreksi perubahan kondisi BMN.",
      rootId: "ba-koreksi-print-root",
    },
    ba_pemeriksaan: {
      description: "Berita acara pemeriksaan fisik oleh panitia.",
      rootId: "ba-pemeriksaan-print-root",
    },
    surat_tugas_pemeriksaan_penilaian: {
      description: "Surat tugas pemeriksaan dan penilaian BMN sebelum nilai taksiran.",
      rootId: "surat-tugas-pemeriksaan-penilaian-print-root",
    },
    sk_kebenaran: {
      description: "Surat pernyataan keabsahan dokumen kepemilikan aset BMN.",
      rootId: "sk-kebenaran-print-root",
    },
    sptjm: {
      description: "Pernyataan tanggung jawab mutlak atas penghapusan BMN.",
      rootId: "sptjm-print-root",
    },
    sptj_limit: {
      description: "Pernyataan tanggung jawab atas penetapan nilai limit lelang.",
      rootId: "sptj-limit-print-root",
    },
    sp_tugas: {
      description: "Surat pernyataan bahwa pemindahtanganan aset tidak mengganggu dinas.",
      rootId: "sp-tugas-print-root",
    },
    permohonan_kpknl: {
      description: "Surat pengajuan lelang resmi yang ditujukan kepada KPKNL setempat.",
      rootId: "permohonan-kpknl-print-root",
    },
  };

  if (isLoading) {
    return (
      <div className="flex h-60 flex-col items-center justify-center space-y-4">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
        <p className="text-xs text-zinc-500">Memuat berkas dokumen...</p>
      </div>
    );
  }

  if (error || !context) {
    return (
      <div className="flex h-60 flex-col items-center justify-center space-y-2 text-center p-6 bg-red-50 dark:bg-red-950/10 rounded-2xl">
        <AlertTriangle className="h-8 w-8 text-red-500" />
        <h3 className="font-bold text-xs text-zinc-900 dark:text-zinc-50">Gagal Memuat Dokumen</h3>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Silakan muat ulang halaman ini atau pastikan data paket lengkap.
        </p>
      </div>
    );
  }

  // Check Schema Version
  if (context.metadata_schema_version && ![1, 2].includes(context.metadata_schema_version)) {
    return (
      <div className="flex h-60 flex-col items-center justify-center space-y-2 text-center p-6 bg-amber-50 dark:bg-amber-950/10 rounded-2xl border border-amber-200">
        <AlertTriangle className="h-8 w-8 text-amber-500" />
        <h3 className="font-bold text-xs text-zinc-900 dark:text-zinc-50">Skema Metadata Tidak Didukung</h3>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-md">
          Dokumen ini dibuat menggunakan skema metadata versi {context.metadata_schema_version} yang belum didukung oleh sistem cetak saat ini.
        </p>
      </div>
    );
  }

  // Handle document printing
  const handlePrint = (doc: DocumentItem) => {
    if (!doc.printable) {
      toast.error("Template cetak dokumen ini belum tersedia.");
      return;
    }

    setPrintingDocKey(doc.key);

    // Give DOM time to render the print component
    setTimeout(() => {
      const printElement = document.getElementById(doc.rootId);
      if (!printElement) {
        toast.error(`Dokumen ${doc.title} gagal disiapkan.`);
        setPrintingDocKey(null);
        return;
      }

      switch (doc.key) {
        case "ba_koreksi":
          handlePrintBaKoreksi(mappedAssets);
          break;
        case "sk_penghentian":
          handlePrintSkPenghentian(mappedAssets, getDocumentNumber("sk_penghentian"));
          break;
        case "sk_panitia":
          handlePrintSkPanitia();
          break;
        case "sk_tim_penilai":
          handlePrintSkTimPenilai();
          break;
        case "ba_pemeriksaan":
          handlePrintBaPemeriksaan();
          break;
        case "nota_dinas":
          handlePrintNotaDinas();
          break;
        case "permohonan_kpknl":
          handlePrintPermohonanKpknl();
          break;
        case "sk_kebenaran":
          handlePrintSkKebenaran();
          break;
        case "sptjm":
          handlePrintSptjm();
          break;
        case "sptj_limit":
          handlePrintSptjLimit();
          break;
        case "sp_tugas":
          handlePrintSpTugas();
          break;
        default: {
          const printWindow = window.open("", "_blank");
          if (!printWindow) {
            setPrintingDocKey(null);
            return;
          }

          printWindow.document.write(`
            <html>
              <head>
                <title>${doc.title}</title>
                <style>${PERNYATAAN_PRINT_CSS}</style>
              </head>
              <body>${printElement.innerHTML}</body>
            </html>
          `);
          printWindow.document.close();
          printWindow.focus();
          setTimeout(() => printWindow.print(), 500);
        }
      }

      logPrintMutation.mutate(doc.workflowKey || doc.key);
      setPrintingDocKey(null);
    }, 150);
  };

  // Convert context data structures to fit expectations of imported candidate templates
  const mappedAssets = context.assets || [];
  const meta = context.metadata || {};
  const rawSignatories = meta.signatories_raw || {};
  const currentKepalaBalaiId = String(context.kepala_balai_id || batch.kepala_balai_id || meta.signatories?.kepala_balai?.id || "");
  const panitiaIds = normalizeIds(rawSignatories.panitia);
  const timPenilaiIds = normalizeIds(rawSignatories.tim_penilai);
  const pemeriksaIds = normalizeIds(rawSignatories.pemeriksa);
  const selectedKepalaBalai = employees.find((employee) => String(employee.id) === currentKepalaBalaiId) || null;
  const defaultKepalaBalai =
    employees.find((employee) => {
      const position = getEmployeePosition(employee).toLowerCase();

      return position.includes("kepala balai") && !position.includes("seksi") && !position.includes("subbagian");
    }) || null;
  const printKepalaBalai = selectedKepalaBalai || defaultKepalaBalai;
  const filteredKepalaBalaiEmployees = employees.filter((employee) => {
    const query = kepalaSearch.trim().toLowerCase();
    if (!query) return true;

    return [getEmployeeName(employee), employee.nip, getEmployeePosition(employee)]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(query));
  });

  const kepalaBalai = {
    nama: meta.signatories?.kepala_balai?.nama || (printKepalaBalai ? getEmployeeName(printKepalaBalai) : "-"),
    nip: meta.signatories?.kepala_balai?.nip || printKepalaBalai?.nip || "",
  };
  const hasPrintableKepalaBalai = kepalaBalai.nama !== "-";
  const resolveCommitteePeople = (people: any[] | undefined, ids: string[]) => {
    if (Array.isArray(people) && people.length > 0) {
      return people;
    }

    return ids
      .map((id) => employees.find((employee) => String(employee.id) === id))
      .filter(Boolean)
      .map((employee) => ({
        id: employee!.id,
        nama: getEmployeeName(employee!),
        nip: employee!.nip || "",
        jabatan: getEmployeePosition(employee!),
      }));
  };
  const getCommitteeRole = (index: number) => (index === 0 ? "Ketua" : index === 1 ? "Sekretaris" : "Anggota");
  const panitiaList = resolveCommitteePeople(meta.committees?.panitia_penghapusan, panitiaIds).map((person, index) => ({
    id: String(person.id || person.nip || index),
    nama: person.nama || person.name || "-",
    nip: person.nip || "",
    jabatanInstansi: person.jabatanInstansi || person.jabatan || person.position || person.unit_kerja || "",
    jabatanKegiatan: person.jabatanKegiatan || person.jabatan_kegiatan || getCommitteeRole(index),
  }));
  const timPenilaiList = resolveCommitteePeople(meta.committees?.tim_penilai, timPenilaiIds).map((person, index) => ({
    id: String(person.id || person.nip || index),
    nama: person.nama || person.name || "-",
    nip: person.nip || "",
    jabatan: person.jabatan || person.position || person.unit_kerja || "",
    jabatanKegiatan: person.jabatanKegiatan || person.jabatan_kegiatan || getCommitteeRole(index),
    keterangan: person.keterangan || "",
  }));
  const pemeriksaList = resolveCommitteePeople(meta.committees?.pemeriksa, pemeriksaIds).map((person, index) => ({
    id: String(person.id || person.nip || index),
    nama: person.nama || person.name || "-",
    nip: person.nip || "",
    jabatan: person.jabatan || person.position || person.unit_kerja || "",
    jabatanKegiatan: person.jabatanKegiatan || person.jabatan_kegiatan || getCommitteeRole(index),
    keterangan: person.keterangan || "",
  }));
  const signatoryFieldDisabled = batch.status !== "DRAFT" || updateDocumentFieldsMutation.isPending || isLoadingEmployees;

  const getDocumentNumber = (key: string, fallback = "____") => meta.document_numbers?.[key] || fallback;
  const getDocumentKap = (key: string, fallback = defaultDocumentKaps[key] || "Balai") => meta.document_kaps?.[key] || fallback;
  const getDocumentDate = (key: string) => meta.document_dates?.[key] || "";

  const stNumber = getDocumentNumber("surat_tugas_pemeriksaan_penilaian");
  const stTanggal = getDocumentDate("surat_tugas_pemeriksaan_penilaian");
  const workflowPrintKeys: Record<string, string | null> = {
    sk_penghentian: "sk_penghentian",
    ba_koreksi: "ba_koreksi",
    sk_panitia_penghapusan: "sk_panitia",
    sk_kebenaran: "sk_kebenaran",
    sptjm: "sptjm",
    sp_kelancaran_tugas: "sp_tugas",
    ba_pemeriksaan: "ba_pemeriksaan",
    surat_tugas_pemeriksaan_penilaian: "surat_tugas_pemeriksaan_penilaian",
    sk_panitia_penaksir_harga: "sk_tim_penilai",
    sptj_limit: "sptj_limit",
    nota_dinas_ksdae: "nota_dinas",
    permohonan_kpknl: "permohonan_kpknl",
  };
  const visibleDocuments: DocumentItem[] = AUCTION_DOCUMENT_WORKFLOW
    .filter((definition) => definition.phase !== "valuation")
    .filter((definition) => !phaseFilter || definition.phase === phaseFilter)
    .map((definition) => {
      const printKey = Object.prototype.hasOwnProperty.call(workflowPrintKeys, definition.key)
        ? workflowPrintKeys[definition.key]
        : definition.legacy_key ?? definition.key;
      const printDoc = printKey ? printDocumentConfig[printKey] : null;

      return {
        key: printKey || definition.key,
        workflowKey: definition.key,
        title: definition.title,
        category:
          definition.channel === "srikandi"
            ? "sk"
            : definition.channel === "external"
            ? "eksternal"
            : "pernyataan",
        description: printDoc?.description || "Dokumen workflow BMN yang perlu ditandai sesuai progres administrasi.",
        rootId: printDoc?.rootId || "",
        channel: definition.channel,
        requiresValuation: definition.requires_valuation,
        printable: Boolean(printDoc),
        numberKey: definition.number_key,
        dateKey: definition.date_key,
      };
    });
  const groupedDocuments = ["srikandi", "manual_ttd", "external", "app"]
    .map((channel) => ({
      key: channel,
      label: channelLabels[channel] || channel,
      documents: visibleDocuments.filter((document) => document.channel === channel),
    }))
    .filter((group) => group.documents.length > 0);
  const valuationComplete = checklist?.can_complete_post_valuation_documents ?? false;
  const phaseTitle =
    phaseFilter === "pre_valuation"
      ? "Dokumen Awal Sebelum Penaksiran"
      : phaseFilter === "post_valuation"
      ? "Dokumen Setelah Nilai Taksiran"
      : "Pusat Dokumen Cetak BMN";
  const phaseDescription =
    phaseFilter === "pre_valuation"
      ? "Urutan mengikuti alur Srikandi dan dokumen manual sebelum Panitia Penaksir Harga serta nilai taksiran."
      : phaseFilter === "post_valuation"
      ? "Nota Dinas KSDAE, SPTJ nilai limit, dan permohonan KPKNL baru dikerjakan setelah nilai taksiran selesai."
      : "Unduh dan cetak seluruh Surat Keputusan (SK) dan Berita Acara (BA) resmi administrasi penghapusan aset.";

  if (phaseFilter === "post_valuation" && checklist && !valuationComplete) {
    const valuationItems = checklist.sections?.find((section) => section.key === "valuation")?.items ?? [];
    return (
      <div className="space-y-6">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-900 shadow-xs dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-200">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            <div>
              <h2 className="text-sm font-bold">Dokumen setelah taksiran belum dibuka</h2>
              <p className="mt-1 text-xs leading-relaxed text-amber-800/80 dark:text-amber-200/80">
                Selesaikan nilai taksiran seluruh aset terlebih dahulu. Setelah itu Nota Dinas KSDAE dan permohonan KPKNL dapat diproses.
              </p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-xs dark:border-zinc-800 dark:bg-zinc-950">
          <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">Checklist nilai taksiran</h3>
          <div className="mt-4 space-y-2">
            {valuationItems.map((item) => (
              <div key={item.key} className="rounded-xl border border-zinc-100 bg-zinc-50 px-3 py-2 text-xs dark:border-zinc-800 dark:bg-zinc-900">
                <p className="font-semibold text-zinc-800 dark:text-zinc-200">{item.label}</p>
                {item.message && <p className="mt-0.5 text-[11px] text-zinc-500">{item.message}</p>}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 p-5 rounded-2xl shadow-xs">
        <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-50">
          {phaseTitle}
        </h2>
        <p className="text-xs text-zinc-500 mt-0.5">
          {phaseDescription}
        </p>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-xs dark:border-zinc-800 dark:bg-zinc-950">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(320px,420px)] lg:items-start">
          <div>
            <p className="text-[10px] font-bold uppercase text-zinc-400">Penandatangan & Panitia Dokumen</p>
            <h3 className="mt-1 text-sm font-bold text-zinc-900 dark:text-zinc-50">Kepala Balai</h3>
            <p className="mt-1 text-xs text-zinc-500">
              {kepalaBalai.nama !== "-" ? `${kepalaBalai.nama}${kepalaBalai.nip ? ` - NIP. ${kepalaBalai.nip}` : ""}` : "Belum dipilih"}
            </p>
            <p className="mt-2 max-w-2xl text-xs leading-relaxed text-zinc-500">
              Panitia yang dipilih di sini dipakai langsung untuk lampiran SK Panitia Penghapusan, SK Panitia Penaksir Harga, Surat Tugas Pemeriksaan-Penilaian, dan BA Pemeriksaan.
            </p>
          </div>

          <Popover open={isKepalaPickerOpen} onOpenChange={setIsKepalaPickerOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                role="combobox"
                aria-expanded={isKepalaPickerOpen}
                disabled={signatoryFieldDisabled}
                className="h-auto min-h-11 w-full justify-between rounded-xl border-zinc-200 bg-white px-3 py-2 text-left text-xs font-normal dark:border-zinc-800 dark:bg-zinc-900"
              >
                <span className="min-w-0 truncate">
                  {selectedKepalaBalai
                    ? getEmployeeLabel(selectedKepalaBalai)
                    : defaultKepalaBalai
                    ? `${getEmployeeLabel(defaultKepalaBalai)} (default)`
                    : "-- Pilih Kepala Balai --"}
                </span>
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 text-zinc-400" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[min(560px,calc(100vw-2rem))] p-0" align="end">
              <div className="border-b border-zinc-100 px-3 py-2 dark:border-zinc-800">
                <div className="flex items-center gap-2">
                  <Search className="h-4 w-4 shrink-0 text-zinc-400" />
                  <Input
                    value={kepalaSearch}
                    onChange={(event) => setKepalaSearch(event.target.value)}
                    placeholder="Cari nama, NIP, atau jabatan..."
                    className="h-9 border-0 px-0 text-xs focus-visible:ring-0"
                  />
                </div>
              </div>
              <div className="max-h-72 overflow-y-auto p-1.5">
                {filteredKepalaBalaiEmployees.length === 0 ? (
                  <div className="px-3 py-6 text-center text-xs text-zinc-500">Pegawai tidak ditemukan.</div>
                ) : (
                  filteredKepalaBalaiEmployees.map((employee) => {
                    const employeeId = String(employee.id);
                    const isSelected = employeeId === currentKepalaBalaiId;

                    return (
                      <button
                        key={employee.id}
                        type="button"
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs hover:bg-zinc-50 dark:hover:bg-zinc-900"
                        onClick={() => {
                          updateDocumentFieldsMutation.mutate({ kepalaBalaiId: employeeId });
                          setKepalaSearch("");
                          setIsKepalaPickerOpen(false);
                        }}
                      >
                        <Check className={`h-4 w-4 shrink-0 text-emerald-600 ${isSelected ? "opacity-100" : "opacity-0"}`} />
                        <span className="min-w-0">
                          <span className="block truncate font-semibold text-zinc-850 dark:text-zinc-100">
                            {getEmployeeName(employee)}
                          </span>
                          <span className="block truncate font-mono text-[10px] text-zinc-400">
                            NIP. {employee.nip || "-"}
                            {getEmployeePosition(employee) ? ` - ${getEmployeePosition(employee)}` : ""}
                          </span>
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            </PopoverContent>
          </Popover>
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-3">
          <CommitteePicker
            label="Panitia Penghapusan"
            description="Muncul pada lampiran SK Panitia Penghapusan."
            employees={employees}
            selectedIds={panitiaIds}
            disabled={signatoryFieldDisabled}
            onChange={(ids) => updateDocumentFieldsMutation.mutate({ signatories: { panitia: ids } })}
          />
          <CommitteePicker
            label="Panitia Penaksir Harga"
            description="Muncul pada lampiran SK Panitia Penaksir dan Surat Tugas."
            employees={employees}
            selectedIds={timPenilaiIds}
            disabled={signatoryFieldDisabled}
            onChange={(ids) => updateDocumentFieldsMutation.mutate({ signatories: { tim_penilai: ids } })}
          />
          <CommitteePicker
            label="Tim Pemeriksa"
            description="Muncul pada Surat Tugas dan BA Pemeriksaan."
            employees={employees}
            selectedIds={pemeriksaIds}
            disabled={signatoryFieldDisabled}
            onChange={(ids) => updateDocumentFieldsMutation.mutate({ signatories: { pemeriksa: ids } })}
          />
        </div>
      </div>

      {groupedDocuments.map((group) => (
        <section key={group.key} className="space-y-3">
          <h3 className="text-[11px] font-bold uppercase text-zinc-400">{group.label}</h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {group.documents.map((doc) => {
              const isPrintingThis = printingDocKey === doc.key;
              const workflowKey = doc.workflowKey || doc.key;
              const progress = meta.workflow?.documents?.[workflowKey];
              const status = progress?.status || "not_started";
              const waitingForValuation = Boolean(doc.requiresValuation && !valuationComplete);
              const workflowDisabled = batch.status !== "DRAFT" || updateWorkflowMutation.isPending || waitingForValuation;
              const documentFieldDisabled = batch.status !== "DRAFT" || updateDocumentFieldsMutation.isPending || waitingForValuation;
              const documentNumber = doc.numberKey ? meta.document_numbers?.[doc.numberKey] ?? "" : "";
              const documentKap = doc.numberKey
                ? getDocumentKap(doc.numberKey, defaultDocumentKaps[doc.numberKey] || defaultDocumentKaps[doc.key] || "Balai")
                : "";
              const documentDate = doc.dateKey ? meta.document_dates?.[doc.dateKey] ?? "" : "";

              return (
                <div
                  key={workflowKey}
                  className="flex flex-col justify-between rounded-2xl border border-zinc-200 bg-white p-5 shadow-xs dark:border-zinc-800 dark:bg-zinc-950"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] font-bold uppercase text-zinc-400 dark:text-zinc-500">
                        {channelLabels[doc.channel || ""] || doc.category}
                      </span>
                      {doc.requiresValuation && (
                        <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 ring-1 ring-amber-200">
                          Setelah taksiran
                        </span>
                      )}
                      {waitingForValuation && (
                        <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-700 ring-1 ring-red-200">
                          Menunggu Nilai Taksiran
                        </span>
                      )}
                      {!doc.printable && (
                        <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-bold text-zinc-500 ring-1 ring-zinc-200">
                          Status saja
                        </span>
                      )}
                    </div>
                    <h3 className="mt-1 text-sm font-bold text-zinc-900 dark:text-zinc-50">{doc.title}</h3>
                    <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-zinc-500">{doc.description}</p>
                    {(doc.numberKey || doc.dateKey) && (
                      <div className="mt-4 space-y-3">
                        {doc.numberKey && (
                          <div className="space-y-2">
                            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_8.5rem]">
                              <div className="space-y-1.5">
                                <label className="text-[10px] font-bold uppercase text-zinc-400">Nomor Dokumen</label>
                                <Input
                                  key={`${workflowKey}-number-${documentNumber}`}
                                  defaultValue={documentNumber}
                                  disabled={documentFieldDisabled}
                                  placeholder="Masukkan nomor"
                                  onBlur={(event) => {
                                    const nextNumber = event.currentTarget.value.trim();
                                    if (nextNumber === documentNumber) {
                                      return;
                                    }

                                    updateDocumentFieldsMutation.mutate({
                                      numberKey: doc.numberKey,
                                      number: nextNumber,
                                    });
                                  }}
                                  onKeyDown={(event) => {
                                    if (event.key === "Enter") {
                                      event.currentTarget.blur();
                                    }
                                  }}
                                  className="h-9 rounded-xl text-xs font-semibold"
                                />
                              </div>
                              <div className="space-y-1.5">
                                <label className="text-[10px] font-bold uppercase text-zinc-400">KAP</label>
                                <Input
                                  key={`${workflowKey}-kap-${documentKap}`}
                                  defaultValue={documentKap}
                                  disabled={documentFieldDisabled}
                                  placeholder="KAP"
                                  onBlur={(event) => {
                                    const nextKap = event.currentTarget.value.trim();
                                    if (nextKap === documentKap) {
                                      return;
                                    }

                                    updateDocumentFieldsMutation.mutate({
                                      kapKey: doc.numberKey,
                                      kap: nextKap,
                                    });
                                  }}
                                  onKeyDown={(event) => {
                                    if (event.key === "Enter") {
                                      event.currentTarget.blur();
                                    }
                                  }}
                                  className="h-9 rounded-xl text-xs font-semibold"
                                />
                              </div>
                            </div>
                            <p className="truncate rounded-lg bg-zinc-50 px-2 py-1 font-mono text-[10px] font-semibold text-zinc-500 dark:bg-zinc-900">
                              {buildDocumentNumberPreview(doc.key, documentNumber, documentKap)}
                            </p>
                          </div>
                        )}
                        {doc.dateKey && (
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold uppercase text-zinc-400">Tanggal</label>
                            <Input
                              key={`${workflowKey}-date-${documentDate}`}
                              type="date"
                              defaultValue={documentDate}
                              disabled={documentFieldDisabled}
                              onChange={(event) => {
                                const nextDate = event.currentTarget.value;
                                if (nextDate === documentDate) {
                                  return;
                                }

                                updateDocumentFieldsMutation.mutate({
                                  dateKey: doc.dateKey,
                                  date: nextDate,
                                });
                              }}
                              className="h-9 rounded-xl text-xs font-semibold"
                            />
                          </div>
                        )}
                      </div>
                    )}
                    <div className="mt-4">
                      <label className="text-[10px] font-bold uppercase text-zinc-400">Status Workflow</label>
                      <select
                        value={status}
                        disabled={workflowDisabled}
                        onChange={(event) =>
                          updateWorkflowMutation.mutate({
                            workflowKey,
                            status: event.target.value,
                          })
                        }
                        className="mt-1 h-9 w-full rounded-xl border border-zinc-200 bg-white px-3 text-xs font-semibold text-zinc-800 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 disabled:bg-zinc-50 disabled:text-zinc-400 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
                      >
                        <option value="not_started">Belum mulai</option>
                        <option value="prepared">Disiapkan</option>
                        <option value="printed">Dicetak</option>
                        <option value="signed">Ditandatangani</option>
                        <option value="completed">Selesai</option>
                        <option value="skipped">Dilewati</option>
                      </select>
                    </div>
                  </div>

                  <div className="mt-5 flex justify-end border-t border-zinc-100 pt-3 dark:border-zinc-800">
                    <Button
                      onClick={() => handlePrint(doc)}
                      className="flex items-center gap-1.5 rounded-xl bg-emerald-600 text-xs font-semibold text-white hover:bg-emerald-700"
                      disabled={!!printingDocKey || !doc.printable || waitingForValuation || isLoadingEmployees || !hasPrintableKepalaBalai}
                    >
                      {isPrintingThis ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
                      {isPrintingThis ? "Menyiapkan..." : "Cetak Dokumen"}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ))}

      {/* Hidden print templates area - rendered off-screen only when needed to save DOM weight */}
      {printingDocKey && (
        <div style={{ position: "absolute", left: "-9999px", top: "-9999px" }}>
          {printingDocKey === "ba_koreksi" && (
            <BaKoreksiDocument
              assets={mappedAssets}
              baNumber={getDocumentNumber("ba_koreksi")}
              baKap={getDocumentKap("ba_koreksi")}
              kepalaBalai={kepalaBalai}
            />
          )}
          {printingDocKey === "sk_penghentian" && (
            <SkPenghentianDocument
              assets={mappedAssets}
              skNumber={getDocumentNumber("sk_penghentian")}
              skKap={getDocumentKap("sk_penghentian")}
              menimbang={meta.sk_details?.penghentian?.menimbang || DEFAULT_MENIMBANG}
              mengingat={meta.sk_details?.penghentian?.mengingat || DEFAULT_MENGINGAT}
              memutuskan={meta.sk_details?.penghentian?.memutuskan || DEFAULT_MEMUTUSKAN}
              kepalaBalai={kepalaBalai}
              tembusan={meta.sk_details?.penghentian?.tembusan || []}
            />
          )}
          {printingDocKey === "sk_panitia" && (
            <SkPanitiaDocument
              skNumber={getDocumentNumber("sk_panitia")}
              skKap={getDocumentKap("sk_panitia")}
              menimbang={meta.sk_details?.panitia?.menimbang || DEFAULT_PANITIA_MENIMBANG}
              mengingat={meta.sk_details?.panitia?.mengingat || DEFAULT_PANITIA_MENGINGAT}
              memutuskan={meta.sk_details?.panitia?.memutuskan || DEFAULT_PANITIA_MEMUTUSKAN}
              kepalaBalai={kepalaBalai}
              tembusan={meta.sk_details?.panitia?.tembusan || DEFAULT_PANITIA_TEMBUSAN}
              susunanPanitia={panitiaList}
            />
          )}
          {printingDocKey === "sk_tim_penilai" && (
            <SkTimPenilaiDocument
              skNumber={getDocumentNumber("sk_tim_penilai")}
              skKap={getDocumentKap("sk_tim_penilai")}
              menimbang={meta.sk_details?.tim_penilai?.menimbang || DEFAULT_TIM_PENILAI_MENIMBANG}
              mengingat={meta.sk_details?.tim_penilai?.mengingat || DEFAULT_TIM_PENILAI_MENGINGAT}
              memutuskan={meta.sk_details?.tim_penilai?.memutuskan || DEFAULT_TIM_PENILAI_MEMUTUSKAN}
              kepalaBalai={kepalaBalai}
              tembusan={meta.sk_details?.tim_penilai?.tembusan || DEFAULT_TIM_PENILAI_TEMBUSAN}
              susunanTimPenilai={timPenilaiList}
            />
          )}
          {printingDocKey === "ba_pemeriksaan" && (
            <BaPemeriksaanDocument
              number={getDocumentNumber("ba_pemeriksaan")}
              kap={getDocumentKap("ba_pemeriksaan")}
              pemeriksaList={pemeriksaList}
              stNumber={stNumber}
              stTanggal={stTanggal}
              assets={mappedAssets}
              kepalaBalai={kepalaBalai}
            />
          )}
          {printingDocKey === "surat_tugas_pemeriksaan_penilaian" && (
            <div id="surat-tugas-pemeriksaan-penilaian-print-root">
              <SuratTugasPemeriksaanPenilaianDocument
                number={getDocumentNumber("surat_tugas_pemeriksaan_penilaian")}
                kap={getDocumentKap("surat_tugas_pemeriksaan_penilaian")}
                assets={mappedAssets}
                kepalaBalai={kepalaBalai}
                timPenilai={timPenilaiList}
                pemeriksa={pemeriksaList}
              />
            </div>
          )}
          {printingDocKey === "nota_dinas" && (
            <NotaDinasDocument
              number={getDocumentNumber("nota_dinas")}
              kap={getDocumentKap("nota_dinas")}
              assets={mappedAssets}
              kepalaBalai={kepalaBalai}
              perihal="Permohonan Persetujuan Penjualan BMN Rusak Berat"
              lampiran="1 (Satu) Berkas"
              lokasi="Samarinda"
              tembusan={[]}
              kesimpulan="Aset BMN tersebut sudah tidak dapat digunakan dan perlu dihapuskan."
              nilaiTaksiran={batch.nilai_taksiran_total || 0}
            />
          )}
          {printingDocKey === "permohonan_kpknl" && (
            <PermohonanKpknlDocument
              number={getDocumentNumber("permohonan_kpknl")}
              kap={getDocumentKap("permohonan_kpknl")}
              assets={mappedAssets}
              kepalaBalai={kepalaBalai}
              perihal="Permohonan Pelaksanaan Lelang Barang Milik Negara"
              lampiran="1 (Satu) Berkas"
              lokasi="Samarinda"
              tembusan={[]}
              kesimpulan="Aset BMN tersebut dalam kondisi Rusak Berat dan diusulkan untuk dilelang."
            />
          )}
          {printingDocKey === "sk_kebenaran" && (
            <SkKebenaranDocument
              number={getDocumentNumber("sk_kebenaran")}
              kap={getDocumentKap("sk_kebenaran")}
              assets={mappedAssets}
              kepalaBalai={kepalaBalai}
            />
          )}
          {printingDocKey === "sptjm" && (
            <SptjmDocument number={getDocumentNumber("sptjm", "01")} kap={getDocumentKap("sptjm", "BALAI")} kepalaBalai={kepalaBalai} />
          )}
          {printingDocKey === "sptj_limit" && (
            <SptjLimitDocument number={getDocumentNumber("sptj_limit", "01")} kap={getDocumentKap("sptj_limit", "BALAI")} kepalaBalai={kepalaBalai} />
          )}
          {printingDocKey === "sp_tugas" && (
            <SpTugasDocument number={getDocumentNumber("sp_tugas", "01")} kap={getDocumentKap("sp_tugas", "BALAI")} kepalaBalai={kepalaBalai} />
          )}
        </div>
      )}
    </div>
  );
}
