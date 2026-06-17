"use client";

import { useCallback, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Archive, ChevronsUpDown, Download, Eye, FileClock, FileText, Handshake, Loader2, Package, Printer, Save, Search, Trash2, UserRound, Wrench } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { useDebounce } from "use-debounce";
import {
  handlePrintUsageAgreement,
  UsageAgreementDocument,
  type UsageAgreementAsset,
  type UsageAgreementParty,
} from "./_components/UsageAgreementDocument";
import {
  handlePrintHandoverAgreement,
  HandoverAgreementDocument,
  type HandoverItem,
  type HandoverParty,
  type HandoverVariant,
  type HandoverWitness,
} from "./_components/HandoverAgreementDocument";

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
  first_party_snapshot?: UsageAgreementParty;
  second_party_snapshot?: UsageAgreementParty & { id?: number; unit?: string | null };
  assets_snapshot?: UsageAgreementAsset[];
  asset_ids?: string[];
  notes?: string | null;
  employee?: Pick<EmployeeOption, "id" | "nama_lengkap" | "nip" | "jabatan" | "pangkat_golongan">;
  generator?: { name: string };
  created_at?: string;
}

interface BmnAssetOption extends UsageAgreementAsset {
  jenis_bmn?: string | null;
}

interface HandoverAgreementHistory {
  id: string;
  document_type: "handover_agreement";
  variant: HandoverVariant;
  title: string;
  number: string;
  document_date: string;
  first_party_snapshot: HandoverParty;
  second_party_snapshot: HandoverParty;
  witness_snapshot?: HandoverWitness | null;
  items_snapshot: HandoverItem[];
  asset_ids?: string[] | null;
  metadata?: { description?: string };
  generator?: { name: string };
}

const DEFAULT_FIRST_PARTY: UsageAgreementParty = {
  name: "M. Ari Wibawanto, S.Hut., M.Sc.",
  nip: "19740514 199903 1 001",
  rank: "Pembina Tingkat I (IV/b)",
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

function employeeToHandoverParty(employee?: EmployeeOption | null): HandoverParty {
  return {
    name: employee?.nama_lengkap || "",
    nip: employee?.nip || "",
    rank: employee?.pangkat_golongan || "",
    position: employee?.jabatan || "",
    address: "Jl. Teuku Umar Samarinda.",
  };
}

function emptyGeneralItem(): HandoverItem {
  return { name: "", quantity: 1, nup: "" };
}

const DEFAULT_HANDOVER_FIRST_PARTY: HandoverParty = {
  name: "Dheny Mardiono, S.Hut., M.Sc.",
  nip: "19750314 199903 1 004",
  position: "Kepala Sub Bagian Tata Usaha",
  address: "Jl. Teuku Umar Samarinda.",
};

export default function BmnReportsPage() {
  const confirm = useConfirm();
  const [loadingAsset, setLoadingAsset] = useState(false);
  const [loadingLoan, setLoadingLoan] = useState(false);
  const [loadingMaintenance, setLoadingMaintenance] = useState(false);
  const [activeTab, setActiveTab] = useState<"exports" | "documents" | "history">("exports");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [assets, setAssets] = useState<UsageAgreementAsset[]>([]);
  const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>([]);
  const [history, setHistory] = useState<UsageAgreementHistory[]>([]);
  const [selectedHistoryAgreement, setSelectedHistoryAgreement] = useState<UsageAgreementHistory | null>(null);
  const [historyEmployeeFilter, setHistoryEmployeeFilter] = useState("");
  const [historySearch, setHistorySearch] = useState("");
  const [loadingUsageData, setLoadingUsageData] = useState(false);
  const [savingUsageAgreement, setSavingUsageAgreement] = useState(false);
  const [activeDocumentType, setActiveDocumentType] = useState<"usage" | "handover">("usage");
  const [baSequence, setBaSequence] = useState("");
  const [kap, setKap] = useState("KAP.03.02");
  const [documentDate, setDocumentDate] = useState(todayInputValue());
  const [firstPartyEmployeeId, setFirstPartyEmployeeId] = useState("");
  const [firstParty, setFirstParty] = useState<UsageAgreementParty>(DEFAULT_FIRST_PARTY);
  const [notes, setNotes] = useState("Sehingga tanggung jawab atas penggunaan, pengamanan, dan pemeliharaan yang dibebankan pada DIPA satuan kerja berada pada PIHAK KEDUA.");
  const [handoverVariant, setHandoverVariant] = useState<HandoverVariant>("general_goods");
  const [handoverTitle, setHandoverTitle] = useState("Berita Acara Serah Terima Barang");
  const [handoverSequence, setHandoverSequence] = useState("");
  const [handoverKap, setHandoverKap] = useState("KAP.03.02");
  const [handoverDate, setHandoverDate] = useState(todayInputValue());
  const [handoverFirstEmployeeId, setHandoverFirstEmployeeId] = useState("");
  const [handoverSecondEmployeeId, setHandoverSecondEmployeeId] = useState("");
  const [handoverFirstParty, setHandoverFirstParty] = useState<HandoverParty>(DEFAULT_HANDOVER_FIRST_PARTY);
  const [handoverSecondParty, setHandoverSecondParty] = useState<HandoverParty>({ name: "", nip: "", rank: "", position: "", address: "Jl. Teuku Umar Samarinda." });
  const [handoverItems, setHandoverItems] = useState<HandoverItem[]>([emptyGeneralItem()]);
  const [openGeneralAssetPicker, setOpenGeneralAssetPicker] = useState(false);
  const [generalAssetSearch, setGeneralAssetSearch] = useState("");
  const [debouncedGeneralAssetSearch] = useDebounce(generalAssetSearch, 300);
  const [selectedVehicleAssetIds, setSelectedVehicleAssetIds] = useState<string[]>([]);
  const [vehicleSearch, setVehicleSearch] = useState("");
  const [handoverGeneralDescription, setHandoverGeneralDescription] = useState("");
  const [handoverVehicleDescription, setHandoverVehicleDescription] = useState("kendaraan");
  const [savingHandoverAgreement, setSavingHandoverAgreement] = useState(false);
  const [selectedHandoverAgreement, setSelectedHandoverAgreement] = useState<HandoverAgreementHistory | null>(null);

  const { data: employees = [], isLoading: loadingEmployees } = useQuery<EmployeeOption[]>({
    queryKey: ["bmn-usage-employees"],
    queryFn: async () => {
      const response = await api.get("/kepegawaian/employees", { params: { is_active: true, per_page: 300 } });
      return response.data.data || [];
    },
  });

  const {
    data: allHistory = [],
    isLoading: loadingAllHistory,
    refetch: refetchAllHistory,
  } = useQuery<UsageAgreementHistory[]>({
    queryKey: ["bmn-usage-agreements", historyEmployeeFilter],
    queryFn: async () => {
      const response = await api.get("/bmn/usage-agreements", {
        params: {
          ...(historyEmployeeFilter ? { employee_id: historyEmployeeFilter } : {}),
          per_page: 100,
        },
      });
      return response.data.data || [];
    },
  });

  const {
    data: handoverHistory = [],
    isLoading: loadingHandoverHistory,
    refetch: refetchHandoverHistory,
  } = useQuery<HandoverAgreementHistory[]>({
    queryKey: ["bmn-handover-agreements", historyEmployeeFilter],
    queryFn: async () => {
      const response = await api.get("/bmn/handover-agreements", {
        params: {
          ...(historyEmployeeFilter ? { employee_id: historyEmployeeFilter } : {}),
          per_page: 100,
        },
      });
      return response.data.data || [];
    },
  });

  const { data: vehicleAssetOptions = [], isLoading: loadingVehicleAssets } = useQuery<BmnAssetOption[]>({
    queryKey: ["bmn-report-vehicle-assets"],
    queryFn: async () => {
      const response = await api.get("/bmn/assets", {
        params: {
          jenis_bmn: "ALAT ANGKUTAN BERMOTOR",
          per_page: 500,
        },
      });
      return response.data.data || [];
    },
  });

  const { data: generalAssetOptions = [], isLoading: loadingGeneralAssetOptions } = useQuery<BmnAssetOption[]>({
    queryKey: ["bmn-report-general-asset-options", debouncedGeneralAssetSearch],
    queryFn: async () => {
      const params: Record<string, string | number> = { page: 1, per_page: 30 };
      if (debouncedGeneralAssetSearch.trim()) {
        params.search = debouncedGeneralAssetSearch.trim();
      }
      const response = await api.get("/bmn/assets", { params });
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

  const filteredAllHistory = useMemo(() => {
    const needle = historySearch.trim().toLocaleLowerCase("id-ID");
    if (!needle) return allHistory;

    return allHistory.filter((item) => {
      const searchable = [
        item.number,
        item.second_party_snapshot?.name,
        item.second_party_snapshot?.nip,
        item.employee?.nama_lengkap,
        item.employee?.nip,
        item.generator?.name,
        item.document_date,
      ].filter(Boolean).join(" ").toLocaleLowerCase("id-ID");

      return searchable.includes(needle);
    });
  }, [allHistory, historySearch]);

  const filteredHandoverHistory = useMemo(() => {
    const needle = historySearch.trim().toLocaleLowerCase("id-ID");
    if (!needle) return handoverHistory;

    return handoverHistory.filter((item) => {
      const searchable = [
        item.number,
        item.title,
        item.first_party_snapshot?.name,
        item.first_party_snapshot?.nip,
        item.second_party_snapshot?.name,
        item.second_party_snapshot?.nip,
        item.generator?.name,
        item.document_date,
      ].filter(Boolean).join(" ").toLocaleLowerCase("id-ID");

      return searchable.includes(needle);
    });
  }, [handoverHistory, historySearch]);

  const selectedGeneralAssetIds = useMemo(
    () => new Set(handoverItems.map((item) => item.asset_id).filter(Boolean)),
    [handoverItems],
  );

  const vehicleAssets = useMemo(() => (
    vehicleAssetOptions.filter((asset) => String(asset.jenis_bmn || "").trim().toLocaleUpperCase("id-ID") === "ALAT ANGKUTAN BERMOTOR")
  ), [vehicleAssetOptions]);

  const selectedVehicleAssets = useMemo(
    () => vehicleAssets.filter((asset) => selectedVehicleAssetIds.includes(asset.id)),
    [selectedVehicleAssetIds, vehicleAssets],
  );

  const filteredVehicleAssets = useMemo(() => {
    const needle = vehicleSearch.trim().toLocaleLowerCase("id-ID");
    if (!needle) return vehicleAssets;

    return vehicleAssets.filter((asset) => [
      asset.nama_barang,
      asset.merk_tipe,
      asset.merk,
      asset.no_polisi,
    ].filter(Boolean).join(" ").toLocaleLowerCase("id-ID").includes(needle));
  }, [vehicleAssets, vehicleSearch]);

  const handoverVehicleItems = useMemo<HandoverItem[]>(() => selectedVehicleAssets.map((asset) => ({
    name: asset.nama_barang,
    vehicle_type: asset.nama_barang,
    merk_tipe: asset.merk_tipe || asset.merk || "-",
    no_polisi: asset.no_polisi || "-",
    no_mesin: asset.no_mesin || "-",
    no_rangka: asset.no_rangka || "-",
    nup: asset.nup || "",
  })), [selectedVehicleAssets]);

  const handoverDocumentItems = useMemo(
    () => handoverVariant === "vehicle" ? handoverVehicleItems : handoverItems,
    [handoverItems, handoverVariant, handoverVehicleItems],
  );

  const fullHandoverNumber = useMemo(
    () => buildBaNumber(handoverSequence, handoverKap, handoverDate),
    [handoverDate, handoverKap, handoverSequence],
  );

  const activeHandoverDescription = handoverVariant === "vehicle"
    ? handoverVehicleDescription
    : handoverGeneralDescription;

  const recentEmployeeHistory = useMemo(
    () => history.slice(0, 5),
    [history],
  );

  const loadUsageData = useCallback(async (employeeId: string) => {
    if (!employeeId) {
      setAssets([]);
      setSelectedAssetIds([]);
      setHistory([]);
      setSelectedHistoryAgreement(null);
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
      const nextHistory = historyResponse.data.data || [];
      setHistory(nextHistory);
      setSelectedHistoryAgreement((current) =>
        current && nextHistory.some((item: UsageAgreementHistory) => item.id === current.id) ? current : null,
      );
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

  const handleHistoryEmployeeFilterChange = (employeeId: string) => {
    setHistoryEmployeeFilter(employeeId);
    setSelectedHistoryAgreement(null);
  };

  const handleFirstPartyEmployeeChange = (employeeId: string) => {
    setFirstPartyEmployeeId(employeeId);
    if (!employeeId) {
      setFirstParty(DEFAULT_FIRST_PARTY);
      return;
    }

    const employee = employees.find((item) => String(item.id) === employeeId);
    if (!employee) return;
    setFirstParty({
      name: employee.nama_lengkap,
      nip: employee.nip,
      rank: employee.pangkat_golongan || "",
      position: employee.jabatan || "",
    });
  };

  const handleHandoverPartyEmployeeChange = (role: "first" | "second", employeeId: string) => {
    const employee = employees.find((item) => String(item.id) === employeeId);
    if (role === "first") {
      setHandoverFirstEmployeeId(employeeId);
      setHandoverFirstParty(employeeId ? employeeToHandoverParty(employee) : DEFAULT_HANDOVER_FIRST_PARTY);
      return;
    }

    setHandoverSecondEmployeeId(employeeId);
    setHandoverSecondParty(employeeToHandoverParty(employee));
  };

  const updateHandoverItem = (index: number, key: keyof HandoverItem, value: string | number) => {
    setHandoverItems((current) => current.map((item, itemIndex) => (
      itemIndex === index ? { ...item, [key]: value } : item
    )));
  };

  const addHandoverItem = () => {
    setHandoverItems((current) => [...current, emptyGeneralItem()]);
  };

  const addGeneralAssetItemFromAsset = (asset: UsageAgreementAsset) => {
    if (handoverItems.some((item) => item.asset_id === asset.id)) {
      toast.error("Barang BMN sudah dipilih.");
      return;
    }

    setHandoverItems((current) => [
      ...current.filter((item) => String(item.name || "").trim() !== ""),
      {
        asset_id: asset.id,
        name: asset.nama_barang,
        quantity: 1,
        nup: asset.nup || "",
      },
    ]);
    setOpenGeneralAssetPicker(false);
    setGeneralAssetSearch("");
    toast.success("Barang BMN ditambahkan.");
  };

  const removeHandoverItem = (index: number) => {
    setHandoverItems((current) => current.length === 1 ? current : current.filter((_, itemIndex) => itemIndex !== index));
  };

  const toggleVehicleAsset = (assetId: string) => {
    setSelectedVehicleAssetIds((current) =>
      current.includes(assetId)
        ? current.filter((id) => id !== assetId)
        : [...current, assetId],
    );
  };

  const viewHistoryAgreement = (agreement: UsageAgreementHistory) => {
    setSelectedHistoryAgreement(agreement);
  };

  const printHistoryAgreement = (agreement: UsageAgreementHistory) => {
    setSelectedHistoryAgreement(agreement);
    setActiveTab("history");
    window.setTimeout(() => handlePrintUsageAgreement("ba-pemakaian-history-print-root"), 100);
  };

  const printHandoverHistoryAgreement = (agreement: HandoverAgreementHistory) => {
    setSelectedHandoverAgreement(agreement);
    setActiveTab("history");
    window.setTimeout(() => handlePrintHandoverAgreement("ba-serah-terima-history-print-root"), 100);
  };

  const deleteHistoryAgreement = async (agreement: UsageAgreementHistory) => {
    const ok = await confirm({
      title: "Hapus Riwayat BA?",
      description: `Riwayat ${agreement.number} akan dihapus permanen dari daftar BA Pemakaian.`,
      confirmText: "Ya, Hapus",
      variant: "danger",
    });
    if (!ok) return;

    try {
      await api.delete(`/bmn/usage-agreements/${agreement.id}`);
      toast.success("Riwayat BA Pemakaian dihapus.");
      setSelectedHistoryAgreement((current) => current?.id === agreement.id ? null : current);
      if (selectedEmployeeId) {
        await loadUsageData(selectedEmployeeId);
      }
      await refetchAllHistory();
    } catch {
      toast.error("Gagal menghapus riwayat BA.");
    }
  };

  const deleteHandoverHistoryAgreement = async (agreement: HandoverAgreementHistory) => {
    const ok = await confirm({
      title: "Hapus Riwayat BA Serah Terima?",
      description: `Riwayat ${agreement.number} akan dihapus permanen.`,
      confirmText: "Ya, Hapus",
      variant: "danger",
    });
    if (!ok) return;

    try {
      await api.delete(`/bmn/handover-agreements/${agreement.id}`);
      toast.success("Riwayat BA Serah Terima dihapus.");
      setSelectedHandoverAgreement((current) => current?.id === agreement.id ? null : current);
      await refetchHandoverHistory();
    } catch {
      toast.error("Gagal menghapus riwayat BA Serah Terima.");
    }
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
      await refetchAllHistory();
    } catch {
      toast.error("Gagal menyimpan riwayat BA Pemakaian.");
    } finally {
      setSavingUsageAgreement(false);
    }
  };

  const saveHandoverAgreement = async () => {
    const validGeneralItems = handoverItems.filter((item) => String(item.name || "").trim() !== "");
    if (!handoverTitle.trim()) {
      toast.error("Judul BA Serah Terima wajib diisi.");
      return;
    }
    if (!handoverFirstParty.name.trim() || !handoverSecondParty.name.trim()) {
      toast.error("Pihak Kesatu dan Pihak Kedua wajib diisi.");
      return;
    }
    if (handoverVariant === "general_goods" && validGeneralItems.length === 0) {
      toast.error("Tambahkan minimal satu barang umum.");
      return;
    }
    if (handoverVariant === "vehicle" && selectedVehicleAssetIds.length === 0) {
      toast.error("Pilih minimal satu kendaraan dari data BMN.");
      return;
    }

    setSavingHandoverAgreement(true);
    try {
      await api.post("/bmn/handover-agreements", {
        variant: handoverVariant,
        title: handoverTitle,
        number: fullHandoverNumber,
        kap: handoverKap,
        document_date: handoverDate,
        first_party_employee_id: handoverFirstEmployeeId || null,
        second_party_employee_id: handoverSecondEmployeeId || null,
        first_party: handoverFirstParty,
        second_party: handoverSecondParty,
        witness: null,
        items: handoverVariant === "general_goods" ? validGeneralItems : [],
        asset_ids: handoverVariant === "vehicle" ? selectedVehicleAssetIds : [],
        metadata: { description: activeHandoverDescription },
      });
      toast.success("Riwayat BA Serah Terima berhasil disimpan.");
      await refetchHandoverHistory();
    } catch {
      toast.error("Gagal menyimpan riwayat BA Serah Terima.");
    } finally {
      setSavingHandoverAgreement(false);
    }
  };

  const duplicateHandoverAgreement = (agreement: HandoverAgreementHistory) => {
    setActiveTab("documents");
    setActiveDocumentType("handover");
    setHandoverVariant(agreement.variant);
    setHandoverTitle(agreement.title);
    setHandoverSequence("");
    setHandoverKap("KAP.03.02");
    setHandoverDate(todayInputValue());
    setHandoverFirstParty(agreement.first_party_snapshot);
    setHandoverSecondParty(agreement.second_party_snapshot);
    setHandoverItems(agreement.variant === "general_goods" ? agreement.items_snapshot : [emptyGeneralItem()]);
    setSelectedVehicleAssetIds(agreement.variant === "vehicle" ? agreement.asset_ids || [] : []);
    if (agreement.variant === "vehicle") {
      setHandoverVehicleDescription(agreement.metadata?.description || "kendaraan");
      setHandoverGeneralDescription("");
    } else {
      setHandoverGeneralDescription(agreement.metadata?.description || "");
      setHandoverVehicleDescription("kendaraan");
    }
    toast.info("Arsip BA Serah Terima disalin sebagai dokumen baru. Nomor dan tanggal silakan disesuaikan.");
  };

  const duplicateHistoryAgreement = async (agreement: UsageAgreementHistory) => {
    setActiveTab("documents");
    const employeeId = agreement.second_party_snapshot?.id;
    if (employeeId) {
      setSelectedEmployeeId(String(employeeId));
      await loadUsageData(String(employeeId));
    }
    setBaSequence("");
    setKap("KAP.03.02");
    setDocumentDate(todayInputValue());
    setFirstPartyEmployeeId("");
    setFirstParty(agreement.first_party_snapshot || DEFAULT_FIRST_PARTY);
    setSelectedAssetIds(agreement.asset_ids || []);
    setNotes(agreement.notes || "Sehingga tanggung jawab atas penggunaan, pengamanan, dan pemeliharaan yang dibebankan pada DIPA satuan kerja berada pada PIHAK KEDUA.");
    toast.info("Data arsip disalin sebagai BA baru. Nomor dan tanggal silakan disesuaikan.");
  };

  const reports = [
    { title: "Katalog Aset BMN", desc: "Rekapitulasi seluruh aset beserta nilai perolehan.", icon: <Package className="w-6 h-6" />, color: "emerald", loading: loadingAsset, buttonLabel: "Unduh Excel", buttonIcon: Download, action: () => executeDownload("/bmn/assets/export", "Katalog_Aset_BMN.xlsx", setLoadingAsset) },
    { title: "Riwayat Peminjaman", desc: "Catatan historis serah-terima aset kepada pegawai.", icon: <Handshake className="w-6 h-6" />, color: "amber", loading: loadingLoan, buttonLabel: "Unduh Excel", buttonIcon: Download, action: () => executeDownload("/bmn/loans/export", "Peminjaman_BMN.xlsx", setLoadingLoan) },
    { title: "Biaya Pemeliharaan", desc: "Rekap pengeluaran dana untuk servis dan perbaikan.", icon: <Wrench className="w-6 h-6" />, color: "blue", loading: loadingMaintenance, buttonLabel: "Unduh Excel", buttonIcon: Download, action: () => executeDownload("/bmn/maintenances/export", "Pemeliharaan_BMN.xlsx", setLoadingMaintenance) },
  ];

  const tabs = [
    { id: "exports", label: "Export Laporan", icon: Download },
    { id: "documents", label: "Generate Dokumen", icon: Archive },
    { id: "history", label: "Riwayat Dokumen", icon: FileClock },
  ] as const;

  const colorMap: Record<string, { iconBg: string; iconText: string; btnBg: string }> = {
    emerald: { iconBg: "bg-emerald-50 dark:bg-emerald-500/10", iconText: "text-emerald-600", btnBg: "bg-emerald-600 hover:bg-emerald-500" },
    amber: { iconBg: "bg-amber-50 dark:bg-amber-500/10", iconText: "text-amber-600", btnBg: "bg-amber-600 hover:bg-amber-500" },
    blue: { iconBg: "bg-blue-50 dark:bg-blue-500/10", iconText: "text-blue-600", btnBg: "bg-blue-600 hover:bg-blue-500" },
    violet: { iconBg: "bg-violet-50 dark:bg-violet-500/10", iconText: "text-violet-600", btnBg: "bg-violet-600 hover:bg-violet-500" },
  };

  return (
    <div className="p-6 md:p-10 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
            <FileText className="w-6 h-6 text-emerald-500" /> Laporan
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">Export laporan dan generate dokumen BMN dari satu workspace.</p>
        </div>
      </div>

      <div className="inline-flex max-w-full overflow-x-auto rounded-2xl border border-zinc-200 bg-white p-1 dark:border-zinc-800 dark:bg-zinc-900">
        {tabs.map((tab) => {
          const TabIcon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex h-11 items-center gap-2 rounded-xl px-4 text-sm font-semibold transition ${
                active
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
              }`}
            >
              <TabIcon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === "exports" && (
        <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {reports.map((report) => {
            const c = colorMap[report.color] || colorMap.emerald;
            const ButtonIcon = report.buttonIcon;
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
                  {report.loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ButtonIcon className="w-4 h-4 mr-2" />}
                  {report.buttonLabel}
                </Button>
              </div>
            );
          })}
        </section>
      )}

      {activeTab === "documents" && (
        <section className="grid grid-cols-1 xl:grid-cols-[280px_minmax(0,1fr)] gap-5">
          <aside className="rounded-2xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="px-2 pb-3">
              <p className="text-xs font-bold uppercase tracking-wide text-zinc-400">Jenis Dokumen</p>
            </div>
            <button
              type="button"
              onClick={() => setActiveDocumentType("usage")}
              className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left transition ${
                activeDocumentType === "usage"
                  ? "border-emerald-200 bg-emerald-50 dark:border-emerald-500/20 dark:bg-emerald-500/10"
                  : "border-transparent hover:bg-zinc-50 dark:hover:bg-zinc-800"
              }`}
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-emerald-600 shadow-sm dark:bg-zinc-950">
                <Archive className="w-5 h-5" />
              </span>
              <span>
                <span className="block text-sm font-bold text-zinc-900 dark:text-white">BA Pemakaian BMN</span>
                <span className="mt-0.5 block text-xs text-zinc-500 dark:text-zinc-400">Generate berita acara pemakaian per pegawai.</span>
              </span>
            </button>
            <button
              type="button"
              onClick={() => setActiveDocumentType("handover")}
              className={`mt-2 flex w-full items-start gap-3 rounded-xl border p-3 text-left transition ${
                activeDocumentType === "handover"
                  ? "border-emerald-200 bg-emerald-50 dark:border-emerald-500/20 dark:bg-emerald-500/10"
                  : "border-transparent hover:bg-zinc-50 dark:hover:bg-zinc-800"
              }`}
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-emerald-600 shadow-sm dark:bg-zinc-950">
                <Handshake className="w-5 h-5" />
              </span>
              <span>
                <span className="block text-sm font-bold text-zinc-900 dark:text-white">BA Serah Terima</span>
                <span className="mt-0.5 block text-xs text-zinc-500 dark:text-zinc-400">Dua versi: barang umum manual atau kendaraan BMN.</span>
              </span>
            </button>
          </aside>

          <div className="space-y-5">
            {activeDocumentType === "usage" && (
              <>
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
              <div>
                <h2 className="text-base font-bold text-zinc-900 dark:text-white">Generate BA Pemakaian BMN</h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">{selectedEmployee ? fullBaNumber : "Pilih pegawai untuk mulai membuat dokumen."}</p>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-2">
                <Button variant="outline" className="rounded-xl gap-2" onClick={saveUsageAgreement} disabled={savingUsageAgreement || !selectedEmployee}>
                  {savingUsageAgreement ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Simpan Riwayat
                </Button>
                <Button className="rounded-xl gap-2 bg-emerald-600 hover:bg-emerald-500" onClick={() => handlePrintUsageAgreement()} disabled={!selectedEmployee}>
                  <Printer className="w-4 h-4" />
                  Cetak
                </Button>
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-white">1. Pilih Pegawai</h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">Aset dan riwayat BA akan dimuat otomatis dari pegawai terpilih.</p>
                </div>
                {loadingUsageData && <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />}
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
                  <Archive className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Belum ada dokumen yang dibuat</h3>
                <p className="mx-auto mt-1 max-w-md text-xs text-zinc-500 dark:text-zinc-400">
                  Pilih pegawai terlebih dahulu. Setelah itu kamu bisa memilih aset, melengkapi nomor BA, lalu preview dan cetak dokumen.
                </p>
              </div>
            ) : (
              <>
                <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-bold text-zinc-900 dark:text-white">BA Terakhir Pegawai Ini</h3>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">Gunakan arsip lama sebagai referensi, cetak ulang, atau duplikasi sebagai BA baru.</p>
                    </div>
                    {loadingUsageData && <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />}
                  </div>
                  {recentEmployeeHistory.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-zinc-200 px-4 py-5 text-center text-xs text-zinc-500 dark:border-zinc-800">
                      Belum ada BA Pemakaian yang pernah digenerate untuk pegawai ini.
                    </div>
                  ) : (
                    <div className="overflow-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
                      <table className="w-full min-w-[720px] text-left text-xs">
                        <thead className="bg-zinc-50 text-zinc-500 dark:bg-zinc-950 dark:text-zinc-400">
                          <tr>
                            <th className="px-3 py-2">Nomor</th>
                            <th className="px-3 py-2">Tanggal</th>
                            <th className="px-3 py-2">Aset</th>
                            <th className="px-3 py-2">Pembuat</th>
                            <th className="px-3 py-2 text-right">Aksi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                          {recentEmployeeHistory.map((item) => (
                            <tr key={item.id} className="text-zinc-700 dark:text-zinc-200">
                              <td className="px-3 py-2 font-semibold">{item.number}</td>
                              <td className="px-3 py-2 text-zinc-500">{formatDate(item.document_date)}</td>
                              <td className="px-3 py-2 text-zinc-500">{item.assets_snapshot?.length || 0} aset</td>
                              <td className="px-3 py-2 text-zinc-500">{item.generator?.name || "-"}</td>
                              <td className="px-3 py-2">
                                <div className="flex justify-end gap-2">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="h-8 rounded-lg px-2 text-xs"
                                    onClick={() => {
                                      setActiveTab("history");
                                      viewHistoryAgreement(item);
                                    }}
                                  >
                                    <Eye className="mr-1 h-3.5 w-3.5" />
                                    Lihat
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="h-8 rounded-lg px-2 text-xs"
                                    onClick={() => printHistoryAgreement(item)}
                                  >
                                    <Printer className="mr-1 h-3.5 w-3.5" />
                                    Cetak
                                  </Button>
                                  <Button
                                    type="button"
                                    size="sm"
                                    className="h-8 rounded-lg bg-emerald-600 px-2 text-xs hover:bg-emerald-500"
                                    onClick={() => duplicateHistoryAgreement(item)}
                                  >
                                    <FileText className="mr-1 h-3.5 w-3.5" />
                                    Duplikasi
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="h-8 rounded-lg border-rose-200 px-2 text-xs text-rose-600 hover:bg-rose-50"
                                    onClick={() => deleteHistoryAgreement(item)}
                                  >
                                    <Trash2 className="mr-1 h-3.5 w-3.5" />
                                    Hapus
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-zinc-900 dark:text-white">2. Pilih Aset Dipakai</h3>
                      <p className="text-xs text-zinc-500">{selectedAssets.length} dari {assets.length} aset dipilih</p>
                    </div>
                  </div>
                  <div className="max-h-96 overflow-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
                    <table className="w-full min-w-[640px] text-left text-xs">
                      <thead className="sticky top-0 bg-zinc-50 text-zinc-500 dark:bg-zinc-950 dark:text-zinc-400">
                        <tr>
                          <th className="w-10 px-3 py-2"></th>
                          <th className="px-3 py-2">Barang</th>
                          <th className="px-3 py-2">Kode</th>
                          <th className="px-3 py-2">NUP</th>
                          <th className="px-3 py-2">Kondisi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                        {assets.length === 0 ? (
                          <tr><td colSpan={5} className="px-3 py-6 text-center text-zinc-500">Belum ada aset BMN yang terhubung dengan pegawai ini.</td></tr>
                        ) : assets.map((asset) => (
                          <tr key={asset.id} className="text-zinc-700 dark:text-zinc-200">
                            <td className="px-3 py-2">
                              <input
                                type="checkbox"
                                checked={selectedAssetIds.includes(asset.id)}
                                onChange={() => toggleAsset(asset.id)}
                              />
                            </td>
                            <td className="px-3 py-2 font-semibold">{asset.nama_barang}</td>
                            <td className="px-3 py-2 text-zinc-500">{asset.kode_barang}</td>
                            <td className="px-3 py-2 text-zinc-500">{asset.nup}</td>
                            <td className="px-3 py-2 text-zinc-500">{asset.kondisi || "-"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-[380px_minmax(0,1fr)] gap-5">
                  <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
                    <h3 className="mb-4 text-sm font-bold text-zinc-900 dark:text-white">3. Detail BA</h3>
                    <div className="space-y-3">
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
                        <select
                          value={firstPartyEmployeeId}
                          onChange={(event) => handleFirstPartyEmployeeChange(event.target.value)}
                          disabled={loadingEmployees}
                          className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                        >
                          <option value="">Default Kepala Balai - M. Ari Wibawanto</option>
                          {employees.map((employee) => (
                            <option key={employee.id} value={employee.id}>
                              {employee.nama_lengkap} - {employee.nip}
                            </option>
                          ))}
                        </select>
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

                  <div className="min-w-0 rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
                    <div className="mb-4 flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-bold text-zinc-900 dark:text-white">4. Preview Dokumen</h3>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">{fullBaNumber}</p>
                      </div>
                    </div>
                    <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-zinc-100 p-4 dark:border-zinc-800 dark:bg-zinc-950">
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
            )}

            {activeDocumentType === "handover" && (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
                  <div>
                    <h2 className="text-base font-bold text-zinc-900 dark:text-white">Generate BA Serah Terima</h2>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">{fullHandoverNumber}</p>
                  </div>
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <Button variant="outline" className="rounded-xl gap-2" onClick={saveHandoverAgreement} disabled={savingHandoverAgreement}>
                      {savingHandoverAgreement ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      Simpan Riwayat
                    </Button>
                    <Button className="rounded-xl gap-2 bg-emerald-600 hover:bg-emerald-500" onClick={() => handlePrintHandoverAgreement()}>
                      <Printer className="w-4 h-4" />
                      Cetak
                    </Button>
                  </div>
                </div>

                <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
                  <div className="mb-4">
                    <h3 className="text-sm font-bold text-zinc-900 dark:text-white">1. Tipe Serah Terima</h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">Barang umum bisa ditambah manual. Kendaraan wajib dipilih dari data BMN.</p>
                  </div>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    {([
                      ["general_goods", "Barang Umum", "Pilih dari data BMN atau input manual jika belum tercatat."],
                      ["vehicle", "Kendaraan", "Pilih kendaraan dari katalog BMN, tanpa input manual."],
                    ] as const).map(([variant, label, description]) => (
                      <button
                        key={variant}
                        type="button"
                        onClick={() => setHandoverVariant(variant)}
                        className={`rounded-xl border p-4 text-left transition ${
                          handoverVariant === variant
                            ? "border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-100"
                            : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200"
                        }`}
                      >
                        <span className="block text-sm font-bold">{label}</span>
                        <span className="mt-1 block text-xs text-zinc-500 dark:text-zinc-400">{description}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 2xl:grid-cols-[430px_minmax(0,1fr)] gap-5">
                  <div className="order-3 space-y-5">
                    <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
                      <h3 className="mb-4 text-sm font-bold text-zinc-900 dark:text-white">3. Detail Dokumen</h3>
                      <div className="space-y-3">
                        <label className="block">
                          <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">Judul BA</span>
                          <input
                            value={handoverTitle}
                            onChange={(event) => setHandoverTitle(event.target.value)}
                            className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/10 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                          />
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                          <label className="block">
                            <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">Nomor BA</span>
                            <input
                              value={handoverSequence}
                              onChange={(event) => setHandoverSequence(event.target.value)}
                              placeholder="contoh: 129"
                              className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/10 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                            />
                          </label>
                          <label className="block">
                            <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">KAP</span>
                            <input
                              value={handoverKap}
                              onChange={(event) => setHandoverKap(event.target.value)}
                              className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/10 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                            />
                          </label>
                        </div>
                        <label className="block">
                          <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">Tanggal Dokumen</span>
                          <input
                            type="date"
                            value={handoverDate}
                            onChange={(event) => setHandoverDate(event.target.value)}
                            className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/10 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                          />
                        </label>
                        <label className="block">
                          <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">Jenis Barang Pada Kalimat BA</span>
                          <textarea
                            value={activeHandoverDescription}
                            onChange={(event) => {
                              if (handoverVariant === "vehicle") {
                                setHandoverVehicleDescription(event.target.value);
                                return;
                              }
                              setHandoverGeneralDescription(event.target.value);
                            }}
                            rows={3}
                            placeholder={handoverVariant === "vehicle" ? "contoh: kendaraan roda dua" : "contoh: perlengkapan kebakaran"}
                            className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/10 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                          />
                        </label>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
                      <h3 className="mb-4 text-sm font-bold text-zinc-900 dark:text-white">4. Para Pihak</h3>
                      <div className="space-y-4">
                        {([
                          ["first", "Pihak Kesatu", handoverFirstEmployeeId, handoverFirstParty, setHandoverFirstParty],
                          ["second", "Pihak Kedua", handoverSecondEmployeeId, handoverSecondParty, setHandoverSecondParty],
                        ] as const).map(([role, label, employeeId, party, setParty]) => (
                          <div key={role} className="rounded-xl border border-zinc-200 p-3 dark:border-zinc-800">
                            <div className="mb-2 flex items-center gap-2 text-xs font-bold text-zinc-700 dark:text-zinc-200">
                              <UserRound className="w-3.5 h-3.5" /> {label}
                            </div>
                            <select
                              value={employeeId}
                              onChange={(event) => handleHandoverPartyEmployeeChange(role, event.target.value)}
                              disabled={loadingEmployees}
                              className="mb-2 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                            >
                              <option value="">Pilih pegawai</option>
                              {employees.map((employee) => (
                                <option key={employee.id} value={employee.id}>
                                  {employee.nama_lengkap} - {employee.nip}
                                </option>
                              ))}
                            </select>
                            <input value={party.name} onChange={(event) => setParty({ ...party, name: event.target.value })} placeholder="Nama" className="mb-2 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100" />
                            <input value={party.nip || ""} onChange={(event) => setParty({ ...party, nip: event.target.value })} placeholder="NIP" className="mb-2 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100" />
                            <input value={party.position || ""} onChange={(event) => setParty({ ...party, position: event.target.value })} placeholder="Jabatan" className="mb-2 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100" />
                            <input value={party.address || ""} onChange={(event) => setParty({ ...party, address: event.target.value })} placeholder="Alamat" className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100" />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="contents">
                    <div className="order-2 rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900 2xl:col-span-2">
                      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <h3 className="text-sm font-bold text-zinc-900 dark:text-white">2. Barang Diserahterimakan</h3>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400">
                            {handoverVariant === "vehicle"
                              ? `${selectedVehicleAssetIds.length} dari ${vehicleAssets.length} kendaraan dipilih`
                              : `${handoverItems.filter((item) => String(item.name || "").trim()).length} barang terisi`}
                          </p>
                        </div>
                        {handoverVariant === "general_goods" && (
                          <Button type="button" variant="outline" size="sm" className="rounded-lg" onClick={addHandoverItem}>
                            Tambah Barang
                          </Button>
                        )}
                      </div>

                      {handoverVariant === "vehicle" ? (
                        <div className="space-y-3">
                          <div className="relative">
                            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                            <input
                              value={vehicleSearch}
                              onChange={(event) => setVehicleSearch(event.target.value)}
                              placeholder="Cari kendaraan, merk, atau no polisi..."
                              className="h-10 w-full rounded-xl border border-zinc-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/10 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                            />
                          </div>
                          <div className="max-h-96 overflow-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
                            <table className="w-full table-fixed text-left text-xs">
                              <thead className="sticky top-0 bg-zinc-50 text-zinc-500 dark:bg-zinc-950 dark:text-zinc-400">
                                <tr>
                                  <th className="w-10 px-2 py-2"></th>
                                  <th className="px-3 py-2">Kendaraan</th>
                                  <th className="px-3 py-2">Merk/Tipe</th>
                                  <th className="w-16 px-2 py-2">NUP</th>
                                  <th className="w-24 px-2 py-2">No. Polisi</th>
                                  <th className="w-24 px-2 py-2">No. Mesin</th>
                                  <th className="w-28 px-2 py-2">No. Rangka</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                                {filteredVehicleAssets.length === 0 ? (
                                  <tr><td colSpan={7} className="px-3 py-8 text-center text-zinc-500">{loadingVehicleAssets ? "Memuat kendaraan..." : "Tidak ada kendaraan yang sesuai pencarian."}</td></tr>
                                ) : filteredVehicleAssets.map((asset) => (
                                  <tr key={asset.id} className="text-zinc-700 dark:text-zinc-200">
                                    <td className="px-2 py-2">
                                      <input type="checkbox" checked={selectedVehicleAssetIds.includes(asset.id)} onChange={() => toggleVehicleAsset(asset.id)} />
                                    </td>
                                    <td className="px-3 py-2 font-semibold truncate" title={asset.nama_barang}>{asset.nama_barang}</td>
                                    <td className="px-3 py-2 text-zinc-500 truncate" title={asset.merk_tipe || asset.merk || "-"}>{asset.merk_tipe || asset.merk || "-"}</td>
                                    <td className="px-2 py-2 text-zinc-500">{asset.nup || "-"}</td>
                                    <td className="px-2 py-2 text-zinc-500 truncate" title={asset.no_polisi || "-"}>{asset.no_polisi || "-"}</td>
                                    <td className="px-2 py-2 text-zinc-500 truncate" title={asset.no_mesin || "-"}>{asset.no_mesin || "-"}</td>
                                    <td className="px-2 py-2 text-zinc-500 truncate" title={asset.no_rangka || "-"}>{asset.no_rangka || "-"}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-950">
                            <div className="mb-2 text-xs font-semibold text-zinc-600 dark:text-zinc-300">Tambah dari data BMN</div>
                            <Popover open={openGeneralAssetPicker} onOpenChange={setOpenGeneralAssetPicker}>
                              <PopoverTrigger asChild>
                                <Button
                                  type="button"
                                  variant="outline"
                                  className="h-11 w-full justify-between rounded-lg bg-white px-3 text-left text-xs font-normal dark:bg-zinc-900"
                                  disabled={loadingGeneralAssetOptions}
                                >
                                  <span className="truncate text-zinc-500">
                                    <Search className="mr-2 inline h-4 w-4" />
                                    {loadingGeneralAssetOptions ? "Memuat barang BMN..." : "Cari nama barang atau NUP..."}
                                  </span>
                                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-[min(620px,90vw)] p-0" align="start">
                                <div className="flex max-h-[420px] flex-col">
                                  <div className="flex items-center border-b px-3 py-2">
                                    <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                                    <Input
                                      className="h-10 border-0 bg-transparent px-0 text-sm shadow-none outline-none focus-visible:ring-0"
                                      placeholder="Ketik untuk mencari..."
                                      value={generalAssetSearch}
                                      onChange={(event) => setGeneralAssetSearch(event.target.value)}
                                      autoFocus
                                    />
                                  </div>
                                  <div className="flex-1 overflow-y-auto p-1">
                                    {loadingGeneralAssetOptions && (
                                      <div className="py-6 text-center text-sm text-zinc-500">
                                        <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin text-emerald-600" />
                                        Memuat...
                                      </div>
                                    )}
                                    {!loadingGeneralAssetOptions && generalAssetOptions.length === 0 && (
                                      <div className="py-6 text-center text-sm text-zinc-400">Tidak ada aset ditemukan.</div>
                                    )}
                                    {!loadingGeneralAssetOptions && generalAssetOptions.map((asset) => {
                                      const alreadySelected = selectedGeneralAssetIds.has(asset.id);
                                      return (
                                        <button
                                          key={asset.id}
                                          type="button"
                                          disabled={alreadySelected}
                                          onClick={() => addGeneralAssetItemFromAsset(asset)}
                                          className={`flex w-full items-start justify-between gap-3 rounded-lg p-3 text-left transition ${
                                            alreadySelected
                                              ? "cursor-not-allowed bg-zinc-50 text-zinc-400 opacity-60 dark:bg-zinc-900"
                                              : "hover:bg-emerald-50 dark:hover:bg-emerald-500/10"
                                          }`}
                                        >
                                          <span className="min-w-0">
                                            <span className={`block truncate text-sm font-bold ${alreadySelected ? "text-zinc-400" : "text-zinc-900 dark:text-zinc-100"}`}>
                                              {asset.nama_barang}
                                            </span>
                                            <span className="mt-1 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                                              <span>NUP <b className={alreadySelected ? "text-zinc-400" : "text-emerald-600"}>{asset.nup || "-"}</b></span>
                                              {alreadySelected && <span className="rounded-full bg-zinc-200 px-2 py-0.5 text-[10px] font-semibold text-zinc-500 dark:bg-zinc-800">Sudah dipilih</span>}
                                            </span>
                                          </span>
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              </PopoverContent>
                            </Popover>
                          </div>

                          <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
                            <table className="w-full table-fixed text-left text-xs">
                              <thead className="bg-zinc-50 text-zinc-500 dark:bg-zinc-950 dark:text-zinc-400">
                                <tr>
                                  <th className="px-3 py-2">Nama Barang</th>
                                  <th className="w-20 px-2 py-2">Jumlah</th>
                                  <th className="w-20 px-2 py-2">NUP</th>
                                  <th className="w-16 px-2 py-2">Sumber</th>
                                  <th className="w-20 px-3 py-2 text-right">Aksi</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                                {handoverItems.map((item, index) => (
                                  <tr key={index}>
                                    <td className="px-3 py-2">
                                      <input value={item.name || ""} onChange={(event) => updateHandoverItem(index, "name", event.target.value)} placeholder="Nama barang" className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100" />
                                    </td>
                                    <td className="px-2 py-2">
                                      <input type="number" min={1} value={item.quantity || 1} onChange={(event) => updateHandoverItem(index, "quantity", Number(event.target.value) || 1)} className="w-full rounded-lg border border-zinc-200 bg-white px-2 py-2 text-xs dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100" />
                                    </td>
                                    <td className="px-2 py-2">
                                      <input value={item.nup || ""} onChange={(event) => updateHandoverItem(index, "nup", event.target.value)} placeholder="-" className="w-full rounded-lg border border-zinc-200 bg-white px-2 py-2 text-xs dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100" />
                                    </td>
                                    <td className="px-2 py-2 text-zinc-500">{item.asset_id ? "BMN" : "Manual"}</td>
                                    <td className="px-3 py-2 text-right">
                                      <Button type="button" variant="outline" size="sm" className="h-8 rounded-lg border-rose-200 px-2 text-xs text-rose-600 hover:bg-rose-50" onClick={() => removeHandoverItem(index)} disabled={handoverItems.length === 1}>
                                        Hapus
                                      </Button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="order-5 min-w-0 rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
                      <div className="mb-4">
                        <h3 className="text-sm font-bold text-zinc-900 dark:text-white">5. Preview Dokumen</h3>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">{fullHandoverNumber}</p>
                      </div>
                      <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-zinc-100 p-4 dark:border-zinc-800 dark:bg-zinc-950">
                        <HandoverAgreementDocument
                          number={fullHandoverNumber}
                          title={handoverTitle}
                          variant={handoverVariant}
                          documentDate={handoverDate}
                          firstParty={handoverFirstParty}
                          secondParty={handoverSecondParty}
                          items={handoverDocumentItems}
                          description={activeHandoverDescription}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </section>
      )}

      {activeTab === "history" && (
        <section className="space-y-4">
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10">
                <FileClock className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-zinc-900 dark:text-white">Riwayat Dokumen</h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">Semua BA Pemakaian dan BA Serah Terima yang pernah digenerate, dengan filter pegawai dan pencarian.</p>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(260px,360px)]">
              <input
                value={historySearch}
                onChange={(event) => setHistorySearch(event.target.value)}
                placeholder="Cari nomor BA, nama pegawai, NIP, atau pembuat..."
                className="h-12 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/10 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
              />
              <select
                value={historyEmployeeFilter}
                onChange={(event) => handleHistoryEmployeeFilterChange(event.target.value)}
                disabled={loadingEmployees}
                className="h-12 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/10 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
              >
                <option value="">{loadingEmployees ? "Memuat pegawai..." : "Semua pegawai"}</option>
                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.nama_lengkap} - {employee.nip}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Daftar BA Pemakaian</h3>
                <p className="text-xs text-zinc-500">{filteredAllHistory.length} dari {allHistory.length} dokumen</p>
              </div>
              {loadingAllHistory && <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />}
            </div>
            <div className="max-h-96 overflow-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
              <table className="w-full min-w-[760px] text-left text-xs">
                <thead className="sticky top-0 bg-zinc-50 text-zinc-500 dark:bg-zinc-950 dark:text-zinc-400">
                  <tr>
                    <th className="px-3 py-2">Nomor</th>
                    <th className="px-3 py-2">Tanggal</th>
                    <th className="px-3 py-2">Pegawai</th>
                    <th className="px-3 py-2">Aset</th>
                    <th className="px-3 py-2">Pembuat</th>
                    <th className="px-3 py-2 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {filteredAllHistory.length === 0 ? (
                    <tr><td colSpan={6} className="px-3 py-8 text-center text-zinc-500">Belum ada riwayat BA yang sesuai filter.</td></tr>
                  ) : filteredAllHistory.map((item) => (
                    <tr
                      key={item.id}
                      className={`text-zinc-700 dark:text-zinc-200 ${selectedHistoryAgreement?.id === item.id ? "bg-emerald-50/70 dark:bg-emerald-500/10" : ""}`}
                    >
                      <td className="px-3 py-2 font-semibold">{item.number}</td>
                      <td className="px-3 py-2 text-zinc-500">{formatDate(item.document_date)}</td>
                      <td className="px-3 py-2 text-zinc-500">{item.second_party_snapshot?.name || item.employee?.nama_lengkap || "-"}</td>
                      <td className="px-3 py-2 text-zinc-500">{item.assets_snapshot?.length || 0} aset</td>
                      <td className="px-3 py-2 text-zinc-500">{item.generator?.name || "-"}</td>
                      <td className="px-3 py-2">
                        <div className="flex justify-end gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8 rounded-lg px-2 text-xs"
                            onClick={() => viewHistoryAgreement(item)}
                          >
                            <Eye className="mr-1 h-3.5 w-3.5" />
                            Lihat
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            className="h-8 rounded-lg bg-emerald-600 px-2 text-xs hover:bg-emerald-500"
                            onClick={() => printHistoryAgreement(item)}
                          >
                            <Printer className="mr-1 h-3.5 w-3.5" />
                            Cetak
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8 rounded-lg border-rose-200 px-2 text-xs text-rose-600 hover:bg-rose-50"
                            onClick={() => deleteHistoryAgreement(item)}
                          >
                            <Trash2 className="mr-1 h-3.5 w-3.5" />
                            Hapus
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Daftar BA Serah Terima</h3>
                <p className="text-xs text-zinc-500">{filteredHandoverHistory.length} dari {handoverHistory.length} dokumen</p>
              </div>
              {loadingHandoverHistory && <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />}
            </div>
            <div className="max-h-96 overflow-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
              <table className="w-full min-w-[900px] text-left text-xs">
                <thead className="sticky top-0 bg-zinc-50 text-zinc-500 dark:bg-zinc-950 dark:text-zinc-400">
                  <tr>
                    <th className="px-3 py-2">Nomor</th>
                    <th className="px-3 py-2">Tanggal</th>
                    <th className="px-3 py-2">Jenis</th>
                    <th className="px-3 py-2">Pihak Kesatu</th>
                    <th className="px-3 py-2">Pihak Kedua</th>
                    <th className="px-3 py-2">Barang</th>
                    <th className="px-3 py-2 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {filteredHandoverHistory.length === 0 ? (
                    <tr><td colSpan={7} className="px-3 py-8 text-center text-zinc-500">Belum ada riwayat BA Serah Terima yang sesuai filter.</td></tr>
                  ) : filteredHandoverHistory.map((item) => (
                    <tr
                      key={item.id}
                      className={`text-zinc-700 dark:text-zinc-200 ${selectedHandoverAgreement?.id === item.id ? "bg-emerald-50/70 dark:bg-emerald-500/10" : ""}`}
                    >
                      <td className="px-3 py-2 font-semibold">{item.number}</td>
                      <td className="px-3 py-2 text-zinc-500">{formatDate(item.document_date)}</td>
                      <td className="px-3 py-2 text-zinc-500">{item.variant === "vehicle" ? "Kendaraan" : "Barang umum"}</td>
                      <td className="px-3 py-2 text-zinc-500">{item.first_party_snapshot?.name || "-"}</td>
                      <td className="px-3 py-2 text-zinc-500">{item.second_party_snapshot?.name || "-"}</td>
                      <td className="px-3 py-2 text-zinc-500">{item.items_snapshot?.length || 0} item</td>
                      <td className="px-3 py-2">
                        <div className="flex justify-end gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8 rounded-lg px-2 text-xs"
                            onClick={() => setSelectedHandoverAgreement(item)}
                          >
                            <Eye className="mr-1 h-3.5 w-3.5" />
                            Lihat
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            className="h-8 rounded-lg bg-emerald-600 px-2 text-xs hover:bg-emerald-500"
                            onClick={() => printHandoverHistoryAgreement(item)}
                          >
                            <Printer className="mr-1 h-3.5 w-3.5" />
                            Cetak
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8 rounded-lg px-2 text-xs"
                            onClick={() => duplicateHandoverAgreement(item)}
                          >
                            <FileText className="mr-1 h-3.5 w-3.5" />
                            Duplikasi
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8 rounded-lg border-rose-200 px-2 text-xs text-rose-600 hover:bg-rose-50"
                            onClick={() => deleteHandoverHistoryAgreement(item)}
                          >
                            <Trash2 className="mr-1 h-3.5 w-3.5" />
                            Hapus
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
                  secondParty={selectedHistoryAgreement.second_party_snapshot || { name: "", nip: "", rank: "", position: "" }}
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
                />
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
