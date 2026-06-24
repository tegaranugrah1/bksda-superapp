"use client";

import React, { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { getChecklist, transition, AuctionBatch } from "../../_lib/api";
import { toast } from "sonner";
import {
  Loader2,
  Lock,
  UserCheck,
  FileText,
  AlertTriangle,
  CheckCircle,
  HelpCircle,
  Users,
  ShieldCheck,
  Search,
  Check,
  ChevronsUpDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface SignatoriesDocumentsTabProps {
  batch: AuctionBatch;
  readOnly: boolean;
  onRefetch: () => void;
}

interface Employee {
  id: string | number;
  nama_lengkap?: string | null;
  name?: string | null;
  nip: string | null;
  jabatan: string | null;
  position?: string | null;
}

export function SignatoriesDocumentsTab({ batch, readOnly, onRefetch }: SignatoriesDocumentsTabProps) {
  // Master employee data for pickers
  const { data: employees = [], isLoading: isLoadingEmployees } = useQuery<Employee[]>({
    queryKey: ["employees-select-auction"],
    queryFn: async () => {
      const res = await api.get("/kepegawaian/employees/select");
      return res.data?.data || res.data || [];
    },
  });

  // State for DRAFT editing
  const [kepalaBalaiId, setKepalaBalaiId] = useState<string>("");
  const [panitiaIds, setPanitiaIds] = useState<string[]>([]);
  const [timPenilaiIds, setTimPenilaiIds] = useState<string[]>([]);
  const [pemeriksaIds, setPemeriksaIds] = useState<string[]>([]);
  const [isKepalaBalaiPickerOpen, setIsKepalaBalaiPickerOpen] = useState(false);
  const [kepalaBalaiSearch, setKepalaBalaiSearch] = useState("");

  const [suratTugasNo, setSuratTugasNo] = useState("");
  const [suratTugasDate, setSuratTugasDate] = useState("");

  // Lock confirmation modal
  const [isLockConfirmOpen, setIsLockConfirmOpen] = useState(false);

  const getEmployeeName = (employee: Employee) => employee.nama_lengkap || employee.name || "-";
  const getEmployeePosition = (employee: Employee) => employee.jabatan || employee.position || "";
  const getEmployeeLabel = (employee: Employee) =>
    `${getEmployeeName(employee)}${employee.nip ? ` - NIP. ${employee.nip}` : ""}`;
  const selectedKepalaBalai = employees.find((employee) => String(employee.id) === kepalaBalaiId) || null;
  const filteredKepalaBalaiEmployees = employees.filter((employee) => {
    const query = kepalaBalaiSearch.trim().toLowerCase();
    if (!query) return true;

    return [getEmployeeName(employee), employee.nip, getEmployeePosition(employee)]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(query));
  });

  // Load checklist
  const { data: checklist, refetch: refetchChecklist, isLoading: isLoadingChecklist } = useQuery({
    queryKey: ["bmn-auction-batch-checklist", batch.id],
    queryFn: () => getChecklist(batch.id),
  });

  // Load saved draft values from batch model
  useEffect(() => {
    if (!readOnly && batch) {
      setKepalaBalaiId(batch.kepala_balai_id || "");
      // Retrieve signatory IDs from pivot or metadata if available
      const signatories = batch.metadata?.signatories_raw || {};
      setPanitiaIds(signatories.panitia || []);
      setTimPenilaiIds(signatories.tim_penilai || []);
      setPemeriksaIds(signatories.pemeriksa || []);

      const docNos = batch.metadata?.document_numbers || {};
      const docDates = batch.metadata?.document_dates || {};
      setSuratTugasNo(docNos.surat_tugas || "");
      setSuratTugasDate(docDates.surat_tugas || "");
    }
  }, [batch, readOnly]);

  // Save/Lock transition
  const lockMutation = useMutation({
    mutationFn: (payload: any) => transition(batch.id, payload),
    onSuccess: () => {
      toast.success("Paket lelang berhasil dikunci dan diajukan.");
      setIsLockConfirmOpen(false);
      onRefetch();
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Gagal mengunci paket lelang.");
    },
  });

  const handleLockSubmit = () => {
    lockMutation.mutate({
      status: "DIAJUKAN",
      kepala_balai_id: kepalaBalaiId || null,
      signatories: {
        panitia: panitiaIds,
        tim_penilai: timPenilaiIds,
        pemeriksa: pemeriksaIds,
      },
      document_numbers: {
        surat_tugas: suratTugasNo || null,
      },
      document_dates: {
        surat_tugas: suratTugasDate || null,
      },
    });
  };

  // Helper: auto-update checklist whenever field changes
  const handleFieldChange = async (fieldName: string, value: any) => {
    // Save draft state to API silently so checklist updates
    try {
      await api.post(`/bmn/auction-batches/${batch.id}/transition`, {
        status: "DRAFT",
        kepala_balai_id: fieldName === "kepala_balai" ? value : kepalaBalaiId || null,
        signatories: {
          panitia: fieldName === "panitia" ? value : panitiaIds,
          tim_penilai: fieldName === "tim_penilai" ? value : timPenilaiIds,
          pemeriksa: fieldName === "pemeriksa" ? value : pemeriksaIds,
        },
        document_numbers: {
          surat_tugas: fieldName === "surat_tugas_no" ? value : suratTugasNo || null,
        },
        document_dates: {
          surat_tugas: fieldName === "surat_tugas_date" ? value : suratTugasDate || null,
        },
      });
      refetchChecklist();
    } catch {
      // Ignore background save errors
    }
  };

  // Render locked/frozen metadata view
  if (readOnly) {
    const meta = batch.metadata || {};
    const frozenKepalaBalai = meta.signatories?.kepala_balai?.nama || "-";
    const frozenKepalaBalaiNip = meta.signatories?.kepala_balai?.nip || "";

    const frozenPanitia = meta.committees?.panitia_penghapusan || [];
    const frozenTimPenilai = meta.committees?.tim_penilai || [];
    const frozenPemeriksa = meta.committees?.pemeriksa || [];

    const frozenDocNos = meta.document_numbers || {};
    const frozenDocDates = meta.document_dates || {};

    return (
      <div className="space-y-6">
        {/* Banner locked */}
        <div className="flex items-center gap-3 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-350 border border-emerald-100 dark:border-emerald-900/30 p-4 rounded-2xl shadow-xs">
          <ShieldCheck className="h-5 w-5 shrink-0 text-emerald-600" />
          <div>
            <h3 className="font-bold text-sm">Dokumen & Tanda Tangan Terkunci</h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              Paket ini telah diajukan. Informasi penandatangan dan nomor dokumen di bawah ini dibekukan secara permanen dari arsip historical.
            </p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Signatories Read Only */}
          <div className="bg-white dark:bg-zinc-950 border border-zinc-205 dark:border-zinc-800 p-5 rounded-2xl shadow-xs space-y-4">
            <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-50 border-b pb-2 dark:border-zinc-800 flex items-center gap-2">
              <Users className="h-4.5 w-4.5 text-zinc-400" />
              Daftar Penandatangan
            </h3>

            <div>
              <p className="text-[10px] text-zinc-400 font-semibold uppercase">Kepala Balai</p>
              <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 mt-0.5">{frozenKepalaBalai}</p>
              {frozenKepalaBalaiNip && <p className="text-xs text-zinc-400 mt-0.5">NIP. {frozenKepalaBalaiNip}</p>}
            </div>

            <div>
              <p className="text-[10px] text-zinc-400 font-semibold uppercase">Panitia Penghapusan</p>
              <ul className="mt-1 space-y-1 text-xs text-zinc-800 dark:text-zinc-200">
                {frozenPanitia.map((p: any, i: number) => (
                  <li key={i} className="list-disc list-inside">
                    {p.nama} {p.nip && <span className="text-zinc-400 font-mono">(NIP. {p.nip})</span>}
                  </li>
                ))}
                {frozenPanitia.length === 0 && <li className="text-zinc-400 italic">Tidak ada</li>}
              </ul>
            </div>

            <div>
              <p className="text-[10px] text-zinc-400 font-semibold uppercase">Tim Penilai / Penaksir</p>
              <ul className="mt-1 space-y-1 text-xs text-zinc-800 dark:text-zinc-200">
                {frozenTimPenilai.map((p: any, i: number) => (
                  <li key={i} className="list-disc list-inside">
                    {p.nama} {p.nip && <span className="text-zinc-400 font-mono">(NIP. {p.nip})</span>}
                  </li>
                ))}
                {frozenTimPenilai.length === 0 && <li className="text-zinc-400 italic">Tidak ada</li>}
              </ul>
            </div>

            <div>
              <p className="text-[10px] text-zinc-400 font-semibold uppercase">Tim Pemeriksa</p>
              <ul className="mt-1 space-y-1 text-xs text-zinc-800 dark:text-zinc-200">
                {frozenPemeriksa.map((p: any, i: number) => (
                  <li key={i} className="list-disc list-inside">
                    {p.nama} {p.nip && <span className="text-zinc-400 font-mono">(NIP. {p.nip})</span>}
                  </li>
                ))}
                {frozenPemeriksa.length === 0 && <li className="text-zinc-400 italic">Tidak ada</li>}
              </ul>
            </div>
          </div>

          {/* Document Numbers Read Only */}
          <div className="bg-white dark:bg-zinc-950 border border-zinc-205 dark:border-zinc-800 p-5 rounded-2xl shadow-xs space-y-4">
            <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-50 border-b pb-2 dark:border-zinc-800 flex items-center gap-2">
              <FileText className="h-4.5 w-4.5 text-zinc-400" />
              Nomor & Tanggal Dokumen
            </h3>

            <div>
              <p className="text-[10px] text-zinc-400 font-semibold uppercase">Surat Tugas Penghapusan</p>
              <p className="text-sm font-semibold text-zinc-850 dark:text-zinc-250 mt-1">
                Nomor: <strong className="text-zinc-900 dark:text-zinc-50 font-mono">{frozenDocNos.surat_tugas || "-"}</strong>
              </p>
              <p className="text-xs text-zinc-450 mt-1">
                Tanggal: <strong>{frozenDocDates.surat_tugas ? new Intl.DateTimeFormat("id-ID", { dateStyle: "long" }).format(new Date(frozenDocDates.surat_tugas)) : "-"}</strong>
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Active DRAFT edit view
  const toggleSelectionList = (list: string[], setList: React.Dispatch<React.SetStateAction<string[]>>, id: string, type: string) => {
    let nextList: string[];
    if (list.includes(id)) {
      nextList = list.filter((x) => x !== id);
    } else {
      nextList = [...list, id];
    }
    setList(nextList);
    handleFieldChange(type, nextList);
  };

  const isChecklistComplete = checklist?.complete === true;

  return (
    <div className="grid gap-6 md:grid-cols-[1fr_320px]">
      {/* Forms Area */}
      <div className="space-y-6">
        {/* Signatories Forms */}
        <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 p-6 rounded-2xl shadow-xs space-y-5">
          <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-50">
            Daftar Penandatangan Dokumen
          </h2>

          {/* Kepala Balai */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              Kepala Balai
            </label>
            <Popover open={isKepalaBalaiPickerOpen} onOpenChange={setIsKepalaBalaiPickerOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  role="combobox"
                  aria-expanded={isKepalaBalaiPickerOpen}
                  className="h-auto min-h-10 w-full justify-between rounded-xl border-zinc-200 bg-white px-3 py-2 text-left text-xs font-normal dark:border-zinc-800 dark:bg-zinc-900"
                  disabled={isLoadingEmployees}
                >
                  <span className="min-w-0 truncate">
                    {selectedKepalaBalai ? getEmployeeLabel(selectedKepalaBalai) : "-- Pilih Kepala Balai --"}
                  </span>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 text-zinc-400" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[min(560px,calc(100vw-2rem))] p-0" align="start">
                <div className="border-b border-zinc-100 px-3 py-2 dark:border-zinc-800">
                  <div className="flex items-center gap-2">
                    <Search className="h-4 w-4 shrink-0 text-zinc-400" />
                    <Input
                      value={kepalaBalaiSearch}
                      onChange={(event) => setKepalaBalaiSearch(event.target.value)}
                      placeholder="Cari nama, NIP, atau jabatan..."
                      className="h-9 border-0 px-0 text-xs focus-visible:ring-0"
                    />
                  </div>
                </div>
                <div className="max-h-72 overflow-y-auto p-1.5">
                  {filteredKepalaBalaiEmployees.length === 0 ? (
                    <div className="px-3 py-6 text-center text-xs text-zinc-500">
                      Pegawai tidak ditemukan.
                    </div>
                  ) : (
                    filteredKepalaBalaiEmployees.map((emp) => (
                      <button
                        key={emp.id}
                        type="button"
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs hover:bg-zinc-50 dark:hover:bg-zinc-900"
                        onClick={() => {
                          const employeeId = String(emp.id);
                          setKepalaBalaiId(employeeId);
                          setKepalaBalaiSearch("");
                          setIsKepalaBalaiPickerOpen(false);
                          handleFieldChange("kepala_balai", employeeId);
                        }}
                      >
                        <Check
                          className={`h-4 w-4 shrink-0 text-emerald-600 ${
                            kepalaBalaiId === String(emp.id) ? "opacity-100" : "opacity-0"
                          }`}
                        />
                        <span className="min-w-0">
                          <span className="block truncate font-semibold text-zinc-850 dark:text-zinc-100">
                            {getEmployeeName(emp)}
                          </span>
                          <span className="block truncate font-mono text-[10px] text-zinc-400">
                            NIP. {emp.nip || "-"}
                            {getEmployeePosition(emp) ? ` - ${getEmployeePosition(emp)}` : ""}
                          </span>
                        </span>
                      </button>
                    ))
                  )}
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {/* Panitia */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block">
              Panitia Penghapusan (Multi-pilih)
            </label>
            <div className="max-h-40 overflow-y-auto border border-zinc-100 dark:border-zinc-800 rounded-xl p-2.5 space-y-1.5 bg-zinc-50/20">
              {employees.map((emp) => (
                <div
                  key={emp.id}
                  className="flex items-center gap-2 cursor-pointer hover:bg-zinc-50/70 p-1 rounded-lg"
                  onClick={() => toggleSelectionList(panitiaIds, setPanitiaIds, String(emp.id), "panitia")}
                >
                  <Checkbox
                    checked={panitiaIds.includes(String(emp.id))}
                    onCheckedChange={() => toggleSelectionList(panitiaIds, setPanitiaIds, String(emp.id), "panitia")}
                  />
                  <span className="text-xs">
                    {getEmployeeName(emp)} <span className="text-zinc-400 font-mono text-[10px]">(NIP. {emp.nip || "-"})</span>
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Tim Penilai */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block">
              Tim Penilai / Penaksir (Multi-pilih)
            </label>
            <div className="max-h-40 overflow-y-auto border border-zinc-100 dark:border-zinc-800 rounded-xl p-2.5 space-y-1.5 bg-zinc-50/20">
              {employees.map((emp) => (
                <div
                  key={emp.id}
                  className="flex items-center gap-2 cursor-pointer hover:bg-zinc-50/70 p-1 rounded-lg"
                  onClick={() => toggleSelectionList(timPenilaiIds, setTimPenilaiIds, String(emp.id), "tim_penilai")}
                >
                  <Checkbox
                    checked={timPenilaiIds.includes(String(emp.id))}
                    onCheckedChange={() =>
                      toggleSelectionList(timPenilaiIds, setTimPenilaiIds, String(emp.id), "tim_penilai")
                    }
                  />
                  <span className="text-xs">
                    {getEmployeeName(emp)} <span className="text-zinc-400 font-mono text-[10px]">(NIP. {emp.nip || "-"})</span>
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Pemeriksa */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block">
              Tim Pemeriksa (Multi-pilih)
            </label>
            <div className="max-h-40 overflow-y-auto border border-zinc-100 dark:border-zinc-800 rounded-xl p-2.5 space-y-1.5 bg-zinc-50/20">
              {employees.map((emp) => (
                <div
                  key={emp.id}
                  className="flex items-center gap-2 cursor-pointer hover:bg-zinc-50/70 p-1 rounded-lg"
                  onClick={() => toggleSelectionList(pemeriksaIds, setPemeriksaIds, String(emp.id), "pemeriksa")}
                >
                  <Checkbox
                    checked={pemeriksaIds.includes(String(emp.id))}
                    onCheckedChange={() =>
                      toggleSelectionList(pemeriksaIds, setPemeriksaIds, String(emp.id), "pemeriksa")
                    }
                  />
                  <span className="text-xs">
                    {getEmployeeName(emp)} <span className="text-zinc-400 font-mono text-[10px]">(NIP. {emp.nip || "-"})</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Document Numbers Forms */}
        <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 p-6 rounded-2xl shadow-xs space-y-4">
          <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-50">
            Nomor & Tanggal Surat Tugas
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                Nomor Surat Tugas
              </label>
              <Input
                placeholder="ST/XXX/BMN/YYYY"
                value={suratTugasNo}
                onChange={(e) => {
                  setSuratTugasNo(e.target.value);
                  handleFieldChange("surat_tugas_no", e.target.value);
                }}
                className="rounded-xl border-zinc-200 dark:border-zinc-800 text-xs focus-visible:ring-emerald-500"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                Tanggal Surat Tugas
              </label>
              <Input
                type="date"
                value={suratTugasDate}
                onChange={(e) => {
                  setSuratTugasDate(e.target.value);
                  handleFieldChange("surat_tugas_date", e.target.value);
                }}
                className="rounded-xl border-zinc-200 dark:border-zinc-800 text-xs focus-visible:ring-emerald-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Checklist and Locking Panel Sidebar */}
      <div className="space-y-6">
        {/* Checklist card */}
        <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 p-5 rounded-2xl shadow-xs space-y-4">
          <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-50 border-b pb-2 dark:border-zinc-800 flex items-center gap-1.5">
            <UserCheck className="h-4.5 w-4.5 text-zinc-400" />
            Checklist Kunci Paket
          </h3>

          {isLoadingChecklist ? (
            <div className="flex justify-center p-6">
              <Loader2 className="h-5 w-5 animate-spin text-emerald-600" />
            </div>
          ) : (
            <div className="space-y-3">
              {checklist?.items?.map((item: any) => {
                const isWarning = item.key === "document_readiness_reviewed";

                return (
                  <div key={item.key} className="flex gap-2 items-start text-xs">
                    {item.passed ? (
                      <CheckCircle className="h-4 w-4 shrink-0 text-emerald-650 mt-0.5" />
                    ) : isWarning ? (
                      <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500 mt-0.5" />
                    ) : (
                      <Lock className="h-4 w-4 shrink-0 text-red-500 mt-0.5" />
                    )}
                    <div>
                      <p className={`font-semibold ${item.passed ? "text-zinc-800" : isWarning ? "text-amber-800" : "text-red-800"}`}>
                        {item.label}
                      </p>
                      {item.message && <p className="text-[10px] text-zinc-450 mt-0.5">{item.message}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Action locking button */}
          <Button
            onClick={() => setIsLockConfirmOpen(true)}
            disabled={!isChecklistComplete || lockMutation.isPending}
            className="w-full bg-red-600 hover:bg-red-700 text-white rounded-xl py-2 flex items-center justify-center gap-2 font-bold text-xs shadow-xs"
          >
            <Lock className="h-4 w-4" />
            Kunci & Ajukan Paket
          </Button>
        </div>
      </div>

      {/* Lock Confirmation Dialog */}
      <Dialog open={isLockConfirmOpen} onOpenChange={setIsLockConfirmOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-1.5">
              <Lock className="h-5 w-5 text-red-500" />
              Kunci & Ajukan Paket Lelang?
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-555">
              Setelah dikunci, aset dan dokumen di dalam paket ini <strong>tidak dapat diedit kembali</strong>. Aset terpilih akan dibekukan dari status operasional dinas.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsLockConfirmOpen(false)} className="rounded-xl text-xs">
              Batal
            </Button>
            <Button
              onClick={handleLockSubmit}
              className="bg-red-600 hover:bg-red-750 text-white rounded-xl font-semibold text-xs"
              disabled={lockMutation.isPending}
            >
              {lockMutation.isPending ? "Mengunci..." : "Ya, Kunci & Ajukan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
