"use client";

import { useKepegawaianTabs } from "../../_lib/useKepegawaianTabs";

import { AnimatePresence } from "framer-motion";
import { KepegawaianTabContent } from "../../_components/KepegawaianTabContent";
import { KepegawaianDialog } from "../../_components/KepegawaianDialog";

import React, { useState, useEffect, useMemo } from "react";
import {
  Calendar,
  Landmark,
  Plus,
  Trash2,
  RefreshCw,
  Search,
  Check,
  CheckSquare,
  Square,
  Building2,
  Phone,
  CreditCard,
  AlertCircle,
  Sparkles,
  Users,
  ShieldCheck,
  Edit2,
  Save,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";

interface HolidayItem {
  id?: number | string;
  tanggal: string;
  tahun: number;
  nama: string;
  is_cuti_bersama: boolean;
  is_custom?: boolean;
}

interface BankTheme {
  border: string;
  bgBadge: string;
  text: string;
  accent: string;
  tag: string;
  iconText: string;
}

const getBankTheme = (bank: string): BankTheme => {
  const b = bank.toUpperCase();
  if (b.includes("BRI")) {
    return {
      border: "border-[var(--ds-accent-soft-border)] ",
      bgBadge: "bg-[var(--ds-accent-soft)]  text-[var(--ds-accent-fg)]  border-[var(--ds-accent-soft-border)] ",
      text: "text-[var(--ds-accent-fg)] ",
      accent: "bg-[var(--ds-accent-solid)] hover:bg-[var(--ds-accent-hover)] text-[var(--ds-accent-on-solid)]",
      tag: "PNS_BRI & PPPK_BRI",
      iconText: "BRI",
    };
  }
  if (b.includes("MANDIRI") || b === "MNDRI") {
    return {
      border: "border-[var(--ds-accent-soft-border)] ",
      bgBadge: "bg-[var(--ds-accent-soft)]  text-[var(--ds-accent-fg)]  border-[var(--ds-accent-soft-border)] ",
      text: "text-[var(--ds-accent-fg)] ",
      accent: "bg-[var(--ds-accent-solid)] hover:bg-[var(--ds-accent-hover)] text-[var(--ds-accent-on-solid)]",
      tag: "PNS_MNDRI & PPPK_MNDRI",
      iconText: "MNDR",
    };
  }
  if (b.includes("BSI")) {
    return {
      border: "border-[var(--ds-status-success-border)] ",
      bgBadge: "bg-[var(--ds-status-success-bg)]  text-[var(--ds-status-success-fg)]  border-[var(--ds-status-success-border)] ",
      text: "text-[var(--ds-status-success-fg)] ",
      accent: "bg-[var(--ds-status-success-fg)] hover:bg-[var(--ds-status-success-fg)] text-[var(--ds-accent-on-solid)]",
      tag: "PNS_BSI & PPPK_BSI",
      iconText: "BSI",
    };
  }
  if (b.includes("KALTIM") || b.includes("BPD")) {
    return {
      border: "border-[var(--ds-status-warning-border)] ",
      bgBadge: "bg-[var(--ds-status-warning-bg)]  text-[var(--ds-status-warning-fg)]  border-[var(--ds-status-warning-border)] ",
      text: "text-[var(--ds-status-warning-fg)] ",
      accent: "bg-[var(--ds-status-warning-fg)] hover:bg-[var(--ds-status-warning-fg)] text-[var(--ds-accent-on-solid)]",
      tag: "PNS_KALTIM & PPPK_KALTIM",
      iconText: "BPD",
    };
  }
  if (b.includes("BNI")) {
    return {
      border: "border-orange-200 dark:border-orange-900/60",
      bgBadge: "bg-orange-50 dark:bg-orange-950/50 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800",
      text: "text-orange-700 dark:text-orange-400",
      accent: "bg-orange-600 hover:bg-orange-700 text-[var(--ds-accent-on-solid)]",
      tag: "PNS_BNI & PPPK_BNI",
      iconText: "BNI",
    };
  }
  if (b.includes("BCA")) {
    return {
      border: "border-[var(--ds-accent-soft-border)] ",
      bgBadge: "bg-[var(--ds-accent-soft)]  text-[var(--ds-accent-fg)]  border-[var(--ds-accent-soft-border)] ",
      text: "text-[var(--ds-accent-fg)] ",
      accent: "bg-[var(--ds-accent-solid)] hover:bg-[var(--ds-accent-hover)] text-[var(--ds-accent-on-solid)]",
      tag: "PNS_BCA & PPPK_BCA",
      iconText: "BCA",
    };
  }
  const clean = b.replace(/[^A-Z0-9]/g, "");
  return {
    border: "border-[var(--ds-accent-soft-border)] ",
    bgBadge: "bg-[var(--ds-accent-soft)]  text-[var(--ds-accent-fg)]  border-[var(--ds-accent-soft-border)] ",
    text: "text-[var(--ds-accent-fg)] ",
    accent: "bg-[var(--ds-accent-solid)] hover:bg-[var(--ds-accent-hover)] text-[var(--ds-accent-on-solid)]",
    tag: `PNS_${clean.slice(0, 5)} & PPPK_${clean.slice(0, 5)}`,
    iconText: clean.slice(0, 4) || "BANK",
  };
};

interface EmployeeBankItem {
  id: number;
  nip: string;
  nama: string;
  jabatan: string;
  golongan: string;
  satuan_kerja: string;
  jenis_pegawai: "PNS" | "PPPK" | "MMP" | string;
  nama_bank: "BRI" | "Mandiri" | string;
  nomor_rekening: string;
  telepon: string;
}

export function MealAllowanceHolidaysTab() {
  const [subTab, setSubTab] = useState<"holidays" | "banks">("holidays");
  const subTabs = useKepegawaianTabs(subTab, "Hari libur dan rekening bank");

  // ==========================================
  // 1. STATE & HANDLERS HARI LIBUR
  // ==========================================
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [holidays, setHolidays] = useState<HolidayItem[]>([]);
  const [loadingHolidays, setLoadingHolidays] = useState<boolean>(false);
  const [holidaysError, setHolidaysError] = useState(false);

  // Form Hari Libur Baru
  const [newDate, setNewDate] = useState<string>("");
  const [newName, setNewName] = useState<string>("");
  const [newIsCutiBersama, setNewIsCutiBersama] = useState<boolean>(false);
  const [isSubmittingHoliday, setIsSubmittingHoliday] = useState<boolean>(false);

  const fetchHolidays = async (yr: number) => {
    setLoadingHolidays(true);
    setHolidaysError(false);
    try {
      const res = await api.get(`/kepegawaian/settings/holidays?year=${yr}`);
      if (res.data?.success) {
        setHolidays(res.data.data.holidays || []);
      }
    } catch (err: any) {
      setHolidaysError(true);
      toast.error(err.response?.data?.message || "Gagal memuat daftar hari libur");
    } finally {
      setLoadingHolidays(false);
    }
  };

  useEffect(() => {
    fetchHolidays(selectedYear);
  }, [selectedYear]);

  const handleAddHoliday = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDate || !newName.trim()) {
      toast.error("Tanggal dan nama hari libur wajib diisi");
      return;
    }

    setIsSubmittingHoliday(true);
    try {
      const res = await api.post("/kepegawaian/settings/holidays", {
        tanggal: newDate,
        nama: newName.trim(),
        is_cuti_bersama: newIsCutiBersama,
      });
      if (res.data?.success) {
        toast.success("Hari libur berhasil disimpan");
        setNewName("");
        setNewDate("");
        setNewIsCutiBersama(false);
        fetchHolidays(selectedYear);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Gagal menyimpan hari libur");
    } finally {
      setIsSubmittingHoliday(false);
    }
  };

  const handleDeleteHoliday = async (id?: number | string) => {
    if (!id) return;
    try {
      const res = await api.delete(`/kepegawaian/settings/holidays/${id}`);
      if (res.data?.success) {
        toast.success("Hari libur kustom berhasil dihapus");
        fetchHolidays(selectedYear);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Gagal menghapus hari libur");
    }
  };

  // ==========================================
  // 2. STATE & HANDLERS REKENING BANK PEGAWAI
  // ==========================================
  const [employees, setEmployees] = useState<EmployeeBankItem[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState<boolean>(false);
  const [employeesError, setEmployeesError] = useState(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [filterBank, setFilterBank] = useState<string>("all");
  const [filterGroup, setFilterGroup] = useState<string>("all");
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<number[]>([]);
  const [isUpdatingBatch, setIsUpdatingBatch] = useState<boolean>(false);

  // Pagination State (10, 20, 50, all)
  const [page, setPage] = useState<number>(1);
  const [perPage, setPerPage] = useState<string>("10");

  // Daftar bank modular yang didaftarkan (default: BRI, Mandiri)
  const [registeredBanks, setRegisteredBanks] = useState<string[]>(["BRI", "Mandiri"]);

  // Modal Tambah Bank Baru
  const [isAddBankModalOpen, setIsAddBankModalOpen] = useState(false);
  const [newBankInput, setNewBankInput] = useState("");

  // Single editing inline modal
  const [editingEmp, setEditingEmp] = useState<EmployeeBankItem | null>(null);
  const [editBank, setEditBank] = useState<string>("BRI");
  const [editRek, setEditRek] = useState<string>("");
  const [editHp, setEditHp] = useState<string>("");

  const fetchRegisteredBanks = async () => {
    try {
      const res = await api.get("/kepegawaian/settings/registered-banks");
      if (res.data?.success && Array.isArray(res.data.data)) {
        setRegisteredBanks(res.data.data.map((b: { nama_bank: string }) => b.nama_bank));
      }
    } catch (err) {
      console.error("Gagal memuat bank terdaftar", err);
    }
  };

  const fetchEmployees = async () => {
    setLoadingEmployees(true);
    setEmployeesError(false);
    try {
      const res = await api.get("/kepegawaian/settings/employee-banks");
      if (res.data?.success) {
        setEmployees(res.data.data.items || []);
      }
    } catch (err: any) {
      setEmployeesError(true);
      toast.error(err.response?.data?.message || "Gagal memuat data pegawai");
    } finally {
      setLoadingEmployees(false);
    }
  };

  useEffect(() => {
    if (subTab === "banks") {
      fetchEmployees();
      fetchRegisteredBanks();
    }
  }, [subTab]);

  // Hitung distribusi bank aktif secara dinamis (BRI, Mandiri, dll)
  const bankStats = useMemo(() => {
    const counts: Record<string, number> = {};
    employees.forEach((emp) => {
      const b = (emp.nama_bank || "BRI").trim().toUpperCase();
      counts[b] = (counts[b] || 0) + 1;
    });
    return counts;
  }, [employees]);

  const handleRemoveRegisteredBank = async (bankName: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const clean = bankName.trim();
    try {
      const res = await api.delete(`/kepegawaian/settings/registered-banks/${encodeURIComponent(clean)}`);
      if (res.data?.success) {
        toast.success(res.data.message || `Bank ${clean} berhasil dihapus.`);
        fetchRegisteredBanks();
        if (filterBank.toUpperCase() === clean.toUpperCase()) {
          setFilterBank("all");
        }
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || `Gagal menghapus bank ${clean}`);
    }
  };

  const [bankModalTab, setBankModalTab] = useState<"add" | "manage">("add");
  const bankTabs = useKepegawaianTabs(bankModalTab, "Pengelolaan bank pembayaran");

  const handleRegisterNewBank = async (bankName: string) => {
    const clean = bankName.trim().toUpperCase();
    if (!clean) {
      toast.error("Nama bank tidak boleh kosong");
      return;
    }
    try {
      const res = await api.post("/kepegawaian/settings/registered-banks", { nama_bank: clean });
      if (res.data?.success) {
        toast.success(res.data.message || `Bank ${clean} berhasil didaftarkan!`);
        setIsAddBankModalOpen(false);
        setNewBankInput("");
        fetchRegisteredBanks();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || `Gagal mendaftarkan bank ${clean}`);
    }
  };

  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      const matchSearch =
        searchQuery === "" ||
        emp.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.nip.includes(searchQuery);

      const empBankUpper = (emp.nama_bank || "BRI").toUpperCase();
      const matchBank =
        filterBank === "all" ||
        empBankUpper === filterBank.toUpperCase() ||
        (filterBank === "Mandiri" && empBankUpper.includes("MANDIRI")) ||
        (filterBank === "BSI" && empBankUpper.includes("BSI"));

      const matchGroup =
        filterGroup === "all" ||
        (filterGroup === "PNS" && emp.jenis_pegawai === "PNS") ||
        (filterGroup === "PPPK" && emp.jenis_pegawai === "PPPK") ||
        (filterGroup === "MMP" && emp.jenis_pegawai === "MMP");

      return matchSearch && matchBank && matchGroup;
    });
  }, [employees, searchQuery, filterBank, filterGroup]);

  // Reset pagination when search query or filters change
  useEffect(() => {
    setPage(1);
  }, [searchQuery, filterBank, filterGroup, perPage]);

  // Pagination calculations
  const totalItems = filteredEmployees.length;
  const totalPages = perPage === "all" ? 1 : Math.max(1, Math.ceil(totalItems / Number(perPage)));
  const safePage = Math.min(page, totalPages);

  const paginatedEmployees = useMemo(() => {
    if (perPage === "all") return filteredEmployees;
    const num = Number(perPage);
    const start = (safePage - 1) * num;
    return filteredEmployees.slice(start, start + num);
  }, [filteredEmployees, safePage, perPage]);

  const startItem = totalItems === 0 ? 0 : perPage === "all" ? 1 : (safePage - 1) * Number(perPage) + 1;
  const endItem = perPage === "all" ? totalItems : Math.min(safePage * Number(perPage), totalItems);

  const visibleIds = useMemo(() => paginatedEmployees.map((e) => e.id), [paginatedEmployees]);
  const isAllVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedEmployeeIds.includes(id));
  const isSomeVisibleSelected = visibleIds.some((id) => selectedEmployeeIds.includes(id)) && !isAllVisibleSelected;

  const handleSelectAllVisible = () => {
    if (isAllVisibleSelected) {
      setSelectedEmployeeIds((prev) => prev.filter((id) => !visibleIds.includes(id)));
    } else {
      setSelectedEmployeeIds((prev) => Array.from(new Set([...prev, ...visibleIds])));
    }
  };

  const handleSelectAllFiltered = () => {
    if (selectedEmployeeIds.length === filteredEmployees.length) {
      setSelectedEmployeeIds([]);
    } else {
      setSelectedEmployeeIds(filteredEmployees.map((e) => e.id));
    }
  };

  const handleSelectAll = handleSelectAllVisible;

  const handleToggleSelect = (id: number) => {
    setSelectedEmployeeIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleBatchUpdateBank = async (bankName: string) => {
    if (selectedEmployeeIds.length === 0) {
      toast.error("Pilih minimal satu pegawai");
      return;
    }

    setIsUpdatingBatch(true);
    try {
      const res = await api.put("/kepegawaian/settings/employee-banks/batch", {
        employee_ids: selectedEmployeeIds,
        nama_bank: bankName,
      });
      if (res.data?.success) {
        toast.success(res.data.message || `Berhasil mengubah ke Bank ${bankName}`);
        setSelectedEmployeeIds([]);
        fetchEmployees();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Gagal memperbarui rekening bank pegawai");
    } finally {
      setIsUpdatingBatch(false);
    }
  };

  const handleSaveSingleEdit = async () => {
    if (!editingEmp) return;
    try {
      const res = await api.put("/kepegawaian/settings/employee-banks/batch", {
        employee_ids: [editingEmp.id],
        nama_bank: editBank,
        nomor_rekening: editRek.trim(),
        telepon: editHp.trim(),
        single_update: true,
      });
      if (res.data?.success) {
        toast.success(`Data ${editingEmp.nama} berhasil diperbarui`);
        setEditingEmp(null);
        fetchEmployees();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Gagal memperbarui data pegawai");
    }
  };

  return (
    <div className="space-y-6">
      {/* Sub Tab Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--ds-border-subtle)] pb-3">
        <div {...subTabs.tabListProps} className="flex max-w-full flex-wrap items-center gap-2 bg-[var(--ds-surface-muted)] p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setSubTab("holidays")}
            {...subTabs.tabProps("holidays")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer ${
              subTab === "holidays"
                ? "bg-[var(--ds-surface)]  text-[var(--ds-accent-fg)]  shadow-2xs"
                : "text-[var(--ds-fg-muted)]  hover:text-[var(--ds-fg)] "
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            Hari Libur Nasional &amp; SKB
          </button>
          <button
            type="button"
            onClick={() => setSubTab("banks")}
            {...subTabs.tabProps("banks")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer ${
              subTab === "banks"
                ? "bg-[var(--ds-surface)]  text-[var(--ds-accent-fg)]  shadow-2xs"
                : "text-[var(--ds-fg-muted)]  hover:text-[var(--ds-fg)] "
            }`}
          >
            <Landmark className="w-3.5 h-3.5" />
            Alokasi Rekening Bank Pegawai
          </button>
        </div>

        <div className="text-xs text-[var(--ds-fg-muted)] flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-[var(--ds-status-success-fg)]" />
          <span>Pengaturan tersinkronisasi otomatis dengan modul Uang Makan</span>
        </div>
      </div>

      {/* ======================================================== */}
      {/* PANEL 1: HARI LIBUR NASIONAL & CUTI BERSAMA              */}
      {/* ======================================================== */}
      <AnimatePresence mode="wait" initial={false}>
      <KepegawaianTabContent key={subTab} panelProps={subTabs.panelProps}>
      {subTab === "holidays" && (
        <div className="space-y-6">
          {/* Header Controls */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Year Selector */}
            <div className="bg-[var(--ds-surface)] border border-[var(--ds-border-subtle)] rounded-2xl p-4 shadow-2xs flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold text-[var(--ds-fg-muted)] uppercase tracking-wider">
                  Pilih Tahun Kalender
                </span>
                <div className="flex items-center gap-2 mt-2">
                  {[2025, 2026, 2027, 2028].map((yr) => (
                    <button
                      key={yr}
                      type="button"
                      onClick={() => setSelectedYear(yr)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                        selectedYear === yr
                          ? "bg-[var(--ds-accent-solid)] text-[var(--ds-accent-on-solid)] shadow-xs"
                          : "bg-[var(--ds-surface-muted)]  text-[var(--ds-fg)]  hover:bg-[var(--ds-surface-muted)]"
                      }`}
                    >
                      {yr}
                    </button>
                  ))}
                  <input
                    type="number"
                    min="2020"
                    max="2050"
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(parseInt(e.target.value) || currentYear)}
                    className="w-20 px-2 py-1 text-xs border border-[var(--ds-border-subtle)] rounded-lg bg-transparent text-[var(--ds-fg)] font-semibold text-center"
                    placeholder="Tahun" aria-label="Tahun"
                  />
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-[var(--ds-border-subtle)] flex items-center justify-between text-xs text-[var(--ds-fg-muted)]">
                <span>Total Hari Libur ({selectedYear}):</span>
                <span className="font-bold text-[var(--ds-fg)] bg-[var(--ds-surface-muted)] px-2 py-0.5 rounded-full">
                  {holidays.length} hari
                </span>
              </div>
            </div>

            {/* Quick Add Form */}
            <div className="md:col-span-2 bg-[var(--ds-surface)] border border-[var(--ds-border-subtle)] rounded-2xl p-4 shadow-2xs">
              <span className="text-xs font-bold text-[var(--ds-fg-muted)] uppercase tracking-wider block mb-2">
                Tambah Hari Libur Nasional / Cuti Bersama Kustom
              </span>
              <form onSubmit={handleAddHoliday} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                <div className="sm:col-span-3">
                  <label className="text-xs font-semibold text-[var(--ds-fg-muted)] block mb-1">
                    Tanggal
                  </label>
                  <input
                    type="date"
                    required
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] text-[var(--ds-fg)] focus:outline-none focus:ring-2 focus:ring-[var(--ds-accent-soft-border)]"
                  />
                </div>

                <div className="sm:col-span-5">
                  <label className="text-xs font-semibold text-[var(--ds-fg-muted)] block mb-1">
                    Nama Hari Libur / SKB
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Misal: Cuti Bersama Tambahan BKSDA"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] text-[var(--ds-fg)] focus:outline-none focus:ring-2 focus:ring-[var(--ds-accent-soft-border)]" aria-label="Misal: Cuti Bersama Tambahan BKSDA"
                  />
                </div>

                <div className="sm:col-span-2 flex items-center h-8">
                  <label className="inline-flex items-center gap-1.5 text-xs text-[var(--ds-fg)] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newIsCutiBersama}
                      onChange={(e) => setNewIsCutiBersama(e.target.checked)}
                      className="rounded border-[var(--ds-border-subtle)] text-[var(--ds-accent-fg)] focus:ring-[var(--ds-accent-soft-border)]" aria-label="Cuti Bersama"
                    />
                    <span className="text-xs">Cuti Bersama</span>
                  </label>
                </div>

                <div className="sm:col-span-2">
                  <button
                    type="submit"
                    disabled={isSubmittingHoliday}
                    className="w-full px-3 py-1.5 bg-[var(--ds-accent-solid)] hover:bg-[var(--ds-accent-hover)] text-[var(--ds-accent-on-solid)] rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Simpan
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Holiday Table */}
          <div className="bg-[var(--ds-surface)] border border-[var(--ds-border-subtle)] rounded-2xl overflow-hidden shadow-2xs">
            <div className="p-4 border-b border-[var(--ds-border-subtle)] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[var(--ds-accent-fg)]" />
                <h3 className="text-sm font-bold text-[var(--ds-fg)]">
                  Daftar Hari Libur Nasional &amp; Cuti Bersama Tahun {selectedYear}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => fetchHolidays(selectedYear)}
                className="p-1.5 text-[var(--ds-fg-muted)] hover:text-[var(--ds-fg)] hover:bg-[var(--ds-surface-muted)] rounded-lg transition"
                title="Refresh"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingHolidays ? "animate-spin" : ""}`} />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-[var(--ds-fg-muted)]">
                <thead className="bg-[var(--ds-surface)] text-[var(--ds-fg-muted)] uppercase tracking-wider font-semibold border-b border-[var(--ds-border-subtle)]">
                  <tr>
                    <th className="py-2.5 px-4 w-12 text-center">No</th>
                    <th className="py-2.5 px-4 w-36">Tanggal</th>
                    <th className="py-2.5 px-4">Nama Hari Libur</th>
                    <th className="py-2.5 px-4 w-40 text-center">Kategori</th>
                    <th className="py-2.5 px-4 w-28 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--ds-border-subtle)]">
                  {loadingHolidays ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-[var(--ds-fg-muted)]">
                        Memuat data hari libur...
                      </td>
                    </tr>
                  ) : holidaysError ? (
                    <tr><td colSpan={5} role="alert" className="p-8 text-center text-[var(--ds-status-danger-fg)]">Gagal memuat hari libur. <button className="kpg-secondary ml-2 rounded-lg px-3 py-2" onClick={() => fetchHolidays(selectedYear)}>Coba lagi</button></td></tr>
                  ) : holidays.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-[var(--ds-fg-muted)]">
                        Belum ada data hari libur untuk tahun {selectedYear}. Anda dapat menambahkannya melalui form di atas.
                      </td>
                    </tr>
                  ) : (
                    holidays.map((h, idx) => {
                      const d = new Date(h.tanggal);
                      const formattedDate = d.toLocaleDateString("id-ID", {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      });

                      return (
                        <tr key={h.tanggal} className="hover:bg-[var(--ds-surface)] transition">
                          <td className="py-2.5 px-4 text-center text-[var(--ds-fg-muted)] font-mono">{idx + 1}</td>
                          <td className="py-2.5 px-4 font-semibold text-[var(--ds-fg)] whitespace-nowrap">
                            {formattedDate}
                          </td>
                          <td className="py-2.5 px-4 text-[var(--ds-fg)]">{h.nama}</td>
                          <td className="py-2.5 px-4 text-center">
                            {h.is_cuti_bersama ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-[var(--ds-status-warning-bg)] text-[var(--ds-status-warning-fg)]">
                                Cuti Bersama
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-[var(--ds-status-danger-bg)] text-[var(--ds-status-danger-fg)]">
                                Libur Nasional
                              </span>
                            )}
                            {h.is_custom && (
                              <span className="ml-1 inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-bold bg-[var(--ds-accent-soft)] text-[var(--ds-accent-fg)]">
                                Kustom
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-4 text-center">
                            {h.id ? (
                              <button
                                type="button"
                                onClick={() => handleDeleteHoliday(h.id)}
                                className="p-1 text-[var(--ds-status-danger-fg)] hover:text-[var(--ds-status-danger-fg)] hover:bg-[var(--ds-status-danger-bg)] rounded transition cursor-pointer"
                                title="Hapus hari libur kustom"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            ) : (
                              <span className="text-xs text-[var(--ds-fg-muted)] italic">Kalender Resmi</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* PANEL 2: ALOKASI REKENING BANK PEGAWAI   */}
      {/* ======================================================== */}
      {subTab === "banks" && (
        <div className="space-y-5">
          {/* Modular Bank Cards - Otomatis Bertambah Setiap Ada Bank Baru */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
            {/* Card 1: Total Pegawai */}
            <div
              onClick={() => setFilterBank("all")}
              className={`bg-[var(--ds-surface)]  border rounded-2xl p-4 shadow-2xs flex flex-col justify-between cursor-pointer transition-colors ${
                filterBank === "all"
                  ? "ring-2 ring-[var(--ds-accent-soft-border)] border-[var(--ds-accent-soft-border)] bg-[var(--ds-accent-soft)] "
                  : "border-[var(--ds-border-subtle)]  hover:border-[var(--ds-border-subtle)]"
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs font-bold text-[var(--ds-fg-muted)] uppercase tracking-wider">
                    Total Pegawai
                  </span>
                  <p className="text-2xl font-black text-[var(--ds-fg)] mt-0.5">
                    {employees.length}
                  </p>
                </div>
                <div className="w-9 h-9 rounded-xl bg-[var(--ds-surface-muted)] flex items-center justify-center text-[var(--ds-fg-muted)] shrink-0">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2 pt-2 border-t border-[var(--ds-border-subtle)] text-xs text-[var(--ds-fg-muted)] flex items-center justify-between">
                <span>Seluruh Pegawai Aktif</span>
                <span className="font-semibold text-[var(--ds-accent-fg)]">Semua</span>
              </div>
            </div>

            {/* Cards 2..N: Modular Dynamic Cards for Each Registered Bank */}
            {registeredBanks.map((b) => {
              const theme = getBankTheme(b);
              const count = bankStats[b.toUpperCase()] || 0;
              const isSelected = filterBank.toUpperCase() === b.toUpperCase();

              return (
                <div
                  key={b}
                  onClick={() => setFilterBank(isSelected ? "all" : b)}
                  className={`bg-[var(--ds-surface)]  border rounded-2xl p-4 shadow-2xs flex flex-col justify-between cursor-pointer transition-colors ${
                    isSelected
                      ? `ring-2 ring-[var(--ds-accent-soft-border)] ${theme.border} bg-[var(--ds-surface)] `
                      : `${theme.border} hover:shadow-xs hover:border-[var(--ds-border-subtle)]`
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className={`text-xs font-bold uppercase tracking-wider ${theme.text}`}>
                        Bank {b}
                      </span>
                      <p className={`text-2xl font-black mt-0.5 ${theme.text}`}>
                        {count}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {count === 0 && (
                        <button
                          type="button"
                          onClick={(e) => handleRemoveRegisteredBank(b, e)}
                          className="w-7 h-7 rounded-lg text-[var(--ds-fg-muted)] hover:text-[var(--ds-status-danger-fg)] hover:bg-[var(--ds-status-danger-bg)] flex items-center justify-center transition cursor-pointer"
                          title={`Hapus Bank ${b} (tidak terpakai / 0 pegawai)`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs border ${theme.bgBadge}`}>
                        {theme.iconText}
                      </div>
                    </div>
                  </div>
                  <div className="mt-2 pt-2 border-t border-[var(--ds-border-subtle)] text-xs text-[var(--ds-fg-muted)] flex items-center justify-between">
                    <span className="truncate pr-1">{theme.tag}</span>
                    <span className="font-bold text-[var(--ds-fg)] shrink-0">
                      {employees.length > 0 ? `${((count / employees.length) * 100).toFixed(0)}%` : "0%"}
                    </span>
                  </div>
                </div>
              );
            })}

            {/* Card Last: Tambah Bank Baru (UI/UX Pro Max) */}
            <button
              type="button"
              onClick={() => setIsAddBankModalOpen(true)}
              className="border-2 border-dashed border-[var(--ds-border-subtle)] hover:border-[var(--ds-accent-soft-border)] bg-[var(--ds-surface)] hover:bg-[var(--ds-accent-soft)] rounded-2xl p-4 flex flex-col items-center justify-center gap-2 text-[var(--ds-fg-muted)] hover:text-[var(--ds-accent-fg)] transition-colors cursor-pointer group min-h-[105px]"
            >
              <div className="w-9 h-9 rounded-xl bg-[var(--ds-surface)] border border-[var(--ds-border-subtle)] flex items-center justify-center group-hover:scale-110 transition-transform shadow-2xs">
                <Plus className="w-4 h-4 text-[var(--ds-accent-fg)]" />
              </div>
              <div className="text-center">
                <span className="text-xs font-bold block">+ Tambah Bank</span>
                <span className="text-xs text-[var(--ds-fg-muted)]">Daftarkan BSI, BNI, dll</span>
              </div>
            </button>
          </div>

          {/* Filtering & Batch Action Bar */}
          <div className="bg-[var(--ds-surface)] border border-[var(--ds-border-subtle)] rounded-2xl p-4 shadow-2xs space-y-3">
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
              {/* Search & Filters */}
              <div className="flex flex-wrap items-center gap-2.5 flex-1">
                <div className="relative flex-1 min-w-[200px] max-w-sm">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ds-fg-muted)]" />
                  <input
                    type="text"
                    placeholder="Cari NIP atau Nama..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] text-[var(--ds-fg)] focus:outline-none focus:ring-2 focus:ring-[var(--ds-accent-soft-border)]" aria-label="Cari NIP atau Nama..."
                  />
                </div>

                <select
                  value={filterGroup}
                  onChange={(e) => setFilterGroup(e.target.value)}
                  className="px-3 py-1.5 text-xs rounded-xl border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] text-[var(--ds-fg)]" aria-label="Filter kelompok pegawai"
                >
                  <option value="all">Semua Status (PNS, PPPK &amp; MMP)</option>
                  <option value="PNS">Hanya PNS</option>
                  <option value="PPPK">Hanya PPPK</option>
                  <option value="MMP">Hanya MMP (Tenaga Lapangan)</option>
                </select>

                <select
                  value={filterBank}
                  onChange={(e) => setFilterBank(e.target.value)}
                  className="px-3 py-1.5 text-xs rounded-xl border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] text-[var(--ds-fg)]" aria-label="Filter bank"
                >
                  <option value="all">Semua Bank ({employees.length})</option>
                  {registeredBanks.map((b) => (
                    <option key={b} value={b}>
                      Bank {b} ({bankStats[b.toUpperCase()] || 0})
                    </option>
                  ))}
                </select>
              </div>

              {/* Refresh button */}
              <button
                type="button"
                onClick={fetchEmployees}
                className="px-3 py-1.5 text-xs rounded-xl border border-[var(--ds-border-subtle)] hover:bg-[var(--ds-surface-muted)] text-[var(--ds-fg)] font-semibold flex items-center justify-center gap-1.5 transition"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingEmployees ? "animate-spin" : ""}`} />
                Segarkan
              </button>
            </div>

            {/* Batch Action Floating Pill when items are selected */}
            {selectedEmployeeIds.length > 0 && (
              <div className="bg-[var(--ds-accent-soft)] border border-[var(--ds-accent-soft-border)] rounded-xl p-3 flex flex-wrap items-center justify-between gap-3   ">
                <div className="flex items-center gap-2 text-xs font-bold text-[var(--ds-accent-fg)]">
                  <span className="w-5 h-5 rounded-full bg-[var(--ds-accent-solid)] text-[var(--ds-accent-on-solid)] flex items-center justify-center text-xs">
                    {selectedEmployeeIds.length}
                  </span>
                  <span>Pegawai Terpilih untuk Batch Update</span>
                  {selectedEmployeeIds.length < filteredEmployees.length && (
                    <button
                      type="button"
                      onClick={handleSelectAllFiltered}
                      className="ml-2 text-xs font-semibold text-[var(--ds-accent-fg)] underline hover:text-[var(--ds-accent-fg)] cursor-pointer"
                    >
                      (Pilih Semua {filteredEmployees.length} Pegawai Terfilter)
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold text-[var(--ds-fg-muted)]">Pindahkan ke:</span>
                  {registeredBanks.map((b) => {
                    const theme = getBankTheme(b);
                    return (
                      <button
                        key={b}
                        type="button"
                        disabled={isUpdatingBatch}
                        onClick={() => handleBatchUpdateBank(b)}
                        className={`px-2.5 py-1 ${theme.accent} rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-xs cursor-pointer disabled:opacity-50`}
                      >
                        {b}
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() => setIsAddBankModalOpen(true)}
                    className="px-2.5 py-1 border border-[var(--ds-border-subtle)] hover:bg-[var(--ds-surface-muted)] text-[var(--ds-fg)] rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    + Bank Lain
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedEmployeeIds([])}
                    className="px-2 py-1 text-xs text-[var(--ds-fg-muted)] hover:text-[var(--ds-fg)] ml-1"
                  >
                    Batal
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Employee Table */}
          <div className="bg-[var(--ds-surface)] border border-[var(--ds-border-subtle)] rounded-2xl overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-[var(--ds-fg-muted)]">
                <thead className="bg-[var(--ds-surface)] text-[var(--ds-fg-muted)] uppercase tracking-wider font-semibold border-b border-[var(--ds-border-subtle)]">
                  <tr>
                    <th className="py-2.5 px-3 w-10 text-center">
                      <button
                        type="button"
                        onClick={handleSelectAllVisible}
                        role="checkbox"
                        aria-checked={isAllVisibleSelected ? true : isSomeVisibleSelected ? "mixed" : false}
                        disabled={loadingEmployees || employeesError}
                        className="text-[var(--ds-fg-muted)] hover:text-[var(--ds-fg)] cursor-pointer"
                        title={isAllVisibleSelected ? "Batalkan pilihan halaman ini" : "Pilih semua di halaman ini"}
                      >
                        {isAllVisibleSelected ? (
                          <CheckSquare className="w-4 h-4 text-[var(--ds-accent-fg)]" />
                        ) : isSomeVisibleSelected ? (
                          <div className="w-4 h-4 rounded border border-[var(--ds-accent-soft-border)] bg-[var(--ds-accent-soft)] flex items-center justify-center">
                            <span className="w-2 h-0.5 bg-[var(--ds-accent-solid)] rounded-full" />
                          </div>
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </button>
                    </th>
                    <th className="py-2.5 px-4">Nama Pegawai &amp; NIP</th>
                    <th className="py-2.5 px-4">Status &amp; Jabatan</th>
                    <th className="py-2.5 px-4 text-center">Bank Pembayaran</th>
                    <th className="py-2.5 px-4">Nomor Rekening</th>
                    <th className="py-2.5 px-4">Nomor HP</th>
                    <th className="py-2.5 px-4 text-center w-24">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--ds-border-subtle)]">
                  {loadingEmployees ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-[var(--ds-fg-muted)]">
                        Memuat data pegawai...
                      </td>
                    </tr>
                  ) : employeesError ? (
                    <tr><td colSpan={7} role="alert" className="p-8 text-center text-[var(--ds-status-danger-fg)]">Gagal memuat alokasi bank pegawai. <button className="kpg-secondary ml-2 rounded-lg px-3 py-2" onClick={fetchEmployees}>Coba lagi</button></td></tr>
                  ) : filteredEmployees.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-[var(--ds-fg-muted)]">
                        Tidak ada data pegawai yang sesuai dengan filter pencarian.
                      </td>
                    </tr>
                  ) : (
                    paginatedEmployees.map((emp) => {
                      const isSelected = selectedEmployeeIds.includes(emp.id);
                      const bankName = (emp.nama_bank || "BRI").trim();
                      const theme = getBankTheme(bankName);

                      return (
                        <tr
                          key={emp.id}
                          className={`hover:bg-[var(--ds-surface)]  transition ${
                            isSelected ? "bg-[var(--ds-accent-soft)] " : ""
                          }`}
                        >
                          <td className="py-2.5 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleToggleSelect(emp.id)}
                              role="checkbox"
                              aria-checked={isSelected}
                              aria-label={`Pilih ${emp.nama}`}
                              className="text-[var(--ds-fg-muted)] hover:text-[var(--ds-accent-fg)] cursor-pointer"
                            >
                              {isSelected ? (
                                <CheckSquare className="w-4 h-4 text-[var(--ds-accent-fg)]" />
                              ) : (
                                <Square className="w-4 h-4 text-[var(--ds-fg-muted)]" />
                              )}
                            </button>
                          </td>
                          <td className="py-2.5 px-4">
                            <p className="font-bold text-[var(--ds-fg)]">{emp.nama}</p>
                            <p className="text-xs font-mono text-[var(--ds-fg-muted)]">{emp.nip}</p>
                          </td>
                          <td className="py-2.5 px-4">
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`px-1.5 py-0.5 rounded text-xs font-extrabold ${
                                  emp.jenis_pegawai === "PPPK"
                                    ? "bg-[var(--ds-accent-soft)] text-[var(--ds-accent-fg)]  "
                                    : emp.jenis_pegawai === "MMP"
                                    ? "bg-[var(--ds-status-warning-bg)] text-[var(--ds-status-warning-fg)]  "
                                    : "bg-[var(--ds-status-success-bg)] text-[var(--ds-status-success-fg)]  "
                                }`}
                              >
                                {emp.jenis_pegawai}
                              </span>
                              <span className="text-xs text-[var(--ds-fg-muted)]">{emp.golongan}</span>
                            </div>
                            <p className="text-xs text-[var(--ds-fg-muted)] truncate max-w-xs mt-0.5">
                              {emp.jabatan}
                            </p>
                          </td>
                          <td className="py-2.5 px-4 text-center">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${theme.bgBadge} ${theme.border} ${theme.text}`}
                            >
                              <Building2 className="w-3 h-3" />
                              {bankName}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 font-mono text-[var(--ds-fg)]">
                            {emp.nomor_rekening && emp.nomor_rekening !== "-" ? (
                              emp.nomor_rekening
                            ) : (
                              <span className="text-[var(--ds-fg-muted)] italic">Belum diatur</span>
                            )}
                          </td>
                          <td className="py-2.5 px-4 text-[var(--ds-fg)]">
                            {emp.telepon && emp.telepon !== "-" ? (
                              emp.telepon
                            ) : (
                              <span className="text-[var(--ds-fg-muted)] italic">Belum diatur</span>
                            )}
                          </td>
                          <td className="py-2.5 px-4 text-center">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingEmp(emp);
                                setEditBank(bankName);
                                setEditRek(emp.nomor_rekening && emp.nomor_rekening !== "-" ? emp.nomor_rekening : "");
                                setEditHp(emp.telepon && emp.telepon !== "-" ? emp.telepon : "");
                              }}
                              className="px-2 py-1 text-[var(--ds-fg-muted)] hover:text-[var(--ds-accent-fg)] hover:bg-[var(--ds-surface-muted)] rounded text-xs font-semibold flex items-center gap-1 mx-auto cursor-pointer transition"
                            >
                              <Edit2 className="w-3 h-3" />
                              Edit
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Footer */}
            <div className="px-5 py-3.5 border-t border-[var(--ds-border-subtle)] flex flex-col sm:flex-row items-center justify-between gap-3 bg-[var(--ds-surface)] text-xs">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[var(--ds-fg-muted)]">Tampilkan:</span>
                  <select
                    value={perPage}
                    onChange={(e) => {
                      setPerPage(e.target.value);
                      setPage(1);
                    }}
                    className="px-2.5 py-1.5 bg-[var(--ds-surface)] border border-[var(--ds-border-subtle)] rounded-xl text-xs font-bold text-[var(--ds-fg)] outline-none focus:ring-2 focus:ring-[var(--ds-accent-soft-border)] focus:border-[var(--ds-accent-soft-border)] cursor-pointer" aria-label="Jumlah per halaman"
                  >
                    <option value="10">10 baris</option>
                    <option value="20">20 baris</option>
                    <option value="50">50 baris</option>
                    <option value="all">Semua ({totalItems})</option>
                  </select>
                </div>
                <p className="text-xs font-bold text-[var(--ds-fg-muted)]">
                  Menampilkan <span className="text-[var(--ds-fg)] font-semibold">{startItem}–{endItem}</span> dari{" "}
                  <span className="text-[var(--ds-fg)] font-semibold">{totalItems}</span> pegawai
                  {perPage !== "all" && totalPages > 1 && (
                    <span> (Halaman {safePage} dari {totalPages})</span>
                  )}
                </p>
              </div>

              {perPage !== "all" && totalPages > 1 && (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setPage(1)}
                    disabled={safePage === 1}
                    className="p-1.5 rounded-lg border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] text-[var(--ds-fg-muted)] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[var(--ds-surface)] transition cursor-pointer"
                    title="Halaman Pertama"
                  >
                    <ChevronsLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={safePage === 1}
                    className="px-3 py-1.5 rounded-xl border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] text-xs font-bold text-[var(--ds-fg)] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[var(--ds-surface)] transition flex items-center gap-1 cursor-pointer"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    <span>Sebelumnya</span>
                  </button>

                  {/* Page Pills */}
                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, idx) => idx + 1)
                      .filter((p) => {
                        if (totalPages <= 7) return true;
                        return p === 1 || p === totalPages || Math.abs(p - safePage) <= 1;
                      })
                      .map((p, idx, arr) => {
                        const showEllipsis = idx > 0 && p - arr[idx - 1] > 1;
                        return (
                          <React.Fragment key={p}>
                            {showEllipsis && (
                              <span className="px-1 text-[var(--ds-fg-muted)] text-xs">...</span>
                            )}
                            <button
                              type="button"
                              onClick={() => setPage(p)}
                              className={`w-7 h-7 rounded-lg text-xs font-bold transition flex items-center justify-center cursor-pointer ${
                                safePage === p
                                  ? "bg-[var(--ds-accent-solid)] text-[var(--ds-accent-on-solid)] shadow-2xs"
                                  : "text-[var(--ds-fg-muted)]  hover:bg-[var(--ds-surface-muted)] "
                              }`}
                            >
                              {p}
                            </button>
                          </React.Fragment>
                        );
                      })}
                  </div>

                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={safePage >= totalPages}
                    className="px-3 py-1.5 rounded-xl border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] text-xs font-bold text-[var(--ds-fg)] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[var(--ds-surface)] transition flex items-center gap-1 cursor-pointer"
                  >
                    <span>Berikutnya</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setPage(totalPages)}
                    disabled={safePage >= totalPages}
                    className="p-1.5 rounded-lg border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] text-[var(--ds-fg-muted)] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[var(--ds-surface)] transition cursor-pointer"
                    title="Halaman Terakhir"
                  >
                    <ChevronsRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}

      {/* ======================================================== */}
      {/* MODAL DAFTARKAN BANK BARU (UI/UX PRO MAX)                */}
      {/* ======================================================== */}
      </KepegawaianTabContent>
      </AnimatePresence>
      {isAddBankModalOpen && (
        <KepegawaianDialog title="Kelola bank pembayaran" onClose={() => setIsAddBankModalOpen(false)} busy={false} className="sm:max-w-lg">
          <div className="w-full p-6 space-y-5 duration-150">
            <div className="flex items-start justify-between pb-3 border-b border-[var(--ds-border-subtle)]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[var(--ds-accent-soft)] text-[var(--ds-accent-fg)] border border-[var(--ds-accent-soft-border)] flex items-center justify-center shrink-0">
                  <Landmark className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-[var(--ds-fg)]">
                    Kelola Opsi Bank Pembayaran
                  </h4>
                  <p className="text-xs text-[var(--ds-fg-muted)] mt-0.5">
                    Daftarkan bank baru atau hapus bank yang tidak dipakai
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddBankModalOpen(false)}
                className="text-[var(--ds-fg-muted)] hover:text-[var(--ds-fg-muted)] p-1 rounded-lg" aria-label="Tutup"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Internal Tabs */}
            <div {...bankTabs.tabListProps} className="flex flex-wrap items-center gap-1 bg-[var(--ds-surface-muted)] p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setBankModalTab("add")}
                {...bankTabs.tabProps("add")}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 ${
                  bankModalTab === "add"
                    ? "bg-[var(--ds-surface)]  text-[var(--ds-accent-fg)] shadow-2xs"
                    : "text-[var(--ds-fg-muted)]  hover:text-[var(--ds-fg)]"
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
                Daftarkan Bank Baru
              </button>
              <button
                type="button"
                onClick={() => setBankModalTab("manage")}
                {...bankTabs.tabProps("manage")}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 ${
                  bankModalTab === "manage"
                    ? "bg-[var(--ds-surface)]  text-[var(--ds-accent-fg)] shadow-2xs"
                    : "text-[var(--ds-fg-muted)]  hover:text-[var(--ds-fg)]"
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                Daftar Bank Terdaftar ({registeredBanks.length})
              </button>
            </div>

            <AnimatePresence mode="wait" initial={false}>
            <KepegawaianTabContent key={bankModalTab} panelProps={bankTabs.panelProps}>
            {bankModalTab === "add" ? (
              <div className="space-y-4">
                {/* Quick Pick Recommendations */}
                <div className="space-y-2">
                  <span className="text-xs font-bold text-[var(--ds-fg-muted)] uppercase tracking-wider block">
                    Pilihan Cepat Bank Terpopuler
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { name: "BSI", desc: "Bank Syariah Indonesia" },
                      { name: "BANKALTIMTARA", desc: "BPD Kaltim Kaltara" },
                      { name: "BNI", desc: "Bank Negara Indonesia" },
                      { name: "BCA", desc: "Bank Central Asia" },
                      { name: "BTN", desc: "Bank Tabungan Negara" },
                    ].map((item) => (
                      <button
                        key={item.name}
                        type="button"
                        onClick={() => setNewBankInput(item.name)}
                        className={`px-3 py-2 rounded-xl border text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                          newBankInput.toUpperCase() === item.name
                            ? "border-[var(--ds-accent-soft-border)] bg-[var(--ds-accent-soft)] text-[var(--ds-accent-fg)]  "
                            : "border-[var(--ds-border-subtle)]  text-[var(--ds-fg)] hover:bg-[var(--ds-surface)]  "
                        }`}
                      >
                        <Building2 className="w-3.5 h-3.5" />
                        <span>{item.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom Input */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[var(--ds-fg)] block">
                    Nama / Singkatan Bank Baru
                  </label>
                  <input
                    type="text"
                    placeholder="Misal: BSI, BANKALTIMTARA, BNI, BCA..."
                    value={newBankInput}
                    onChange={(e) => setNewBankInput(e.target.value.toUpperCase())}
                    className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] text-[var(--ds-fg)] font-bold uppercase focus:ring-2 focus:ring-[var(--ds-accent-soft-border)] focus:border-[var(--ds-accent-soft-border)] outline-none" aria-label="Misal: BSI, BANKALTIMTARA, BNI, BCA..."
                  />
                  <p className="text-xs text-[var(--ds-fg-muted)]">
                    Otomatis membuat sheet presensi terpisah: misal <code className="font-mono text-[var(--ds-accent-fg)]">PNS_{newBankInput || "BSI"}</code> &amp; <code className="font-mono text-[var(--ds-accent-fg)]">Nominatif {newBankInput || "BSI"}</code>.
                  </p>
                </div>

                {/* Actions */}
                <div className="pt-3 border-t border-[var(--ds-border-subtle)] flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setIsAddBankModalOpen(false)}
                    className="px-4 py-2 text-xs font-semibold text-[var(--ds-fg-muted)] hover:bg-[var(--ds-surface-muted)] rounded-xl"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    disabled={!newBankInput.trim()}
                    onClick={() => handleRegisterNewBank(newBankInput)}
                    className="px-4 py-2 bg-[var(--ds-accent-solid)] hover:bg-[var(--ds-accent-hover)] text-[var(--ds-accent-on-solid)] rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Daftarkan Bank
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-[var(--ds-fg-muted)]">
                  Bank yang sedang digunakan oleh pegawai tidak dapat dihapus demi menjaga integritas data presensi dan laporan Excel.
                </p>
                <div className="divide-y divide-[var(--ds-border-subtle)] border border-[var(--ds-border-subtle)] rounded-2xl max-h-64 overflow-y-auto">
                  {registeredBanks.map((b) => {
                    const theme = getBankTheme(b);
                    const count = bankStats[b.toUpperCase()] || 0;
                    const canDelete = count === 0;

                    return (
                      <div
                        key={b}
                        className="p-3 flex items-center justify-between hover:bg-[var(--ds-surface)] transition"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs border ${theme.bgBadge}`}>
                            {theme.iconText}
                          </div>
                          <div>
                            <span className="text-xs font-bold text-[var(--ds-fg)] block">
                              Bank {b}
                            </span>
                            <span className="text-xs text-[var(--ds-fg-muted)]">
                              {theme.tag}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          {count > 0 ? (
                            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-[var(--ds-status-success-bg)] text-[var(--ds-status-success-fg)]">
                              {count} Pegawai Aktif
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-[var(--ds-surface-muted)] text-[var(--ds-fg-muted)]">
                              0 Pegawai
                            </span>
                          )}

                          {canDelete ? (
                            <button
                              type="button"
                              onClick={() => handleRemoveRegisteredBank(b)}
                              className="px-2.5 py-1 text-xs font-bold text-[var(--ds-status-danger-fg)] hover:text-[var(--ds-danger-on-solid)] hover:bg-[var(--ds-danger-solid)] border border-[var(--ds-status-danger-border)] hover:border-[var(--ds-status-danger-border)] rounded-lg transition flex items-center gap-1 cursor-pointer"
                              title="Hapus bank ini dari daftar"
                            >
                              <Trash2 className="w-3 h-3" />
                              Hapus
                            </button>
                          ) : (
                            <span
                              className="text-xs text-[var(--ds-fg-muted)] italic"
                              title="Pindahkan semua pegawai di bank ini terlebih dahulu sebelum menghapus"
                            >
                              Terkunci
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="pt-2 border-t border-[var(--ds-border-subtle)] flex justify-end">
                  <button
                    type="button"
                    onClick={() => setIsAddBankModalOpen(false)}
                    className="px-4 py-2 text-xs font-semibold text-[var(--ds-fg-muted)] hover:bg-[var(--ds-surface-muted)] rounded-xl"
                  >
                    Tutup
                  </button>
                </div>
              </div>
            )}
            </KepegawaianTabContent>
            </AnimatePresence>
          </div>
        </KepegawaianDialog>
      )}

      {/* MODAL EDIT DATA REKENING INDIVIDUAL                      */}
      {/* ======================================================== */}
      {editingEmp && (
        <KepegawaianDialog title="Edit rekening pegawai" onClose={() => setEditingEmp(null)} busy={false} className="sm:max-w-md">
          <div className="w-full p-5 space-y-4 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--ds-border-subtle)]">
              <div>
                <h4 className="text-sm font-bold text-[var(--ds-fg)]">
                  Edit Rekening Pegawai
                </h4>
                <p className="text-xs text-[var(--ds-fg-muted)] mt-0.5">{editingEmp.nama}</p>
              </div>
              <button
                type="button"
                onClick={() => setEditingEmp(null)}
                className="text-[var(--ds-fg-muted)] hover:text-[var(--ds-fg-muted)] p-1" aria-label="Tutup"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-[var(--ds-fg)] block mb-1">
                  Bank Pembayaran Uang Makan
                </label>
                <div className="flex flex-wrap gap-2 mb-2 max-h-32 overflow-y-auto">
                  {registeredBanks.map((b) => (
                    <button
                      key={b}
                      type="button"
                      onClick={() => setEditBank(b)}
                      className={`py-1.5 px-3 rounded-xl border text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                        editBank.toUpperCase() === b.toUpperCase()
                          ? "border-[var(--ds-accent-soft-border)] bg-[var(--ds-accent-soft)] text-[var(--ds-accent-fg)]  "
                          : "border-[var(--ds-border-subtle)]  text-[var(--ds-fg-muted)] hover:bg-[var(--ds-surface)] "
                      }`}
                    >
                      <Building2 className="w-3.5 h-3.5" />
                      {b}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-[var(--ds-fg-muted)] mt-2">
                  Pilih salah satu bank terdaftar di atas. Jika bank yang dituju belum ada, daftarkan terlebih dahulu di tab <strong>Kelola Opsi Bank</strong>.
                </p>
              </div>

              <div>
                <label className="text-xs font-semibold text-[var(--ds-fg)] block mb-1">
                  Nomor Rekening
                </label>
                <div className="relative">
                  <CreditCard className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ds-fg-muted)]" />
                  <input
                    type="text"
                    placeholder="Contoh: 0123-01-000123-50-1"
                    value={editRek}
                    onChange={(e) => setEditRek(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] text-[var(--ds-fg)] font-mono focus:outline-none focus:ring-2 focus:ring-[var(--ds-accent-soft-border)]" aria-label="Nomor Rekening"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-[var(--ds-fg)] block mb-1">
                  Nomor WhatsApp / HP
                </label>
                <div className="relative">
                  <Phone className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ds-fg-muted)]" />
                  <input
                    type="text"
                    placeholder="Contoh: 08123456789"
                    value={editHp}
                    onChange={(e) => setEditHp(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] text-[var(--ds-fg)] focus:outline-none focus:ring-2 focus:ring-[var(--ds-accent-soft-border)]" aria-label="Nomor WhatsApp / HP"
                  />
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-[var(--ds-border-subtle)] flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingEmp(null)}
                className="px-3 py-1.5 text-xs text-[var(--ds-fg-muted)] hover:bg-[var(--ds-surface-muted)] rounded-xl"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveSingleEdit}
                className="px-4 py-1.5 bg-[var(--ds-accent-solid)] hover:bg-[var(--ds-accent-hover)] text-[var(--ds-accent-on-solid)] rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                Simpan Perubahan
              </button>
            </div>
          </div>
        </KepegawaianDialog>
      )}
    </div>
  );
}
