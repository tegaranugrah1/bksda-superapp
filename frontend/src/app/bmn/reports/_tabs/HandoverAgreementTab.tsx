"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useDebounce } from "use-debounce";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ChevronsUpDown, Loader2, Printer, Save, Search, UserRound } from "lucide-react";
import {
  handlePrintHandoverAgreement,
  HandoverAgreementDocument,
  type HandoverItem,
  type HandoverParty,
  type HandoverVariant,
  type HandoverWitness,
} from "../_components/HandoverAgreementDocument";
import {
  todayInputValue,
  buildBaNumber,
  formatNip,
  emptyGeneralItem,
  extractDocumentSequence,
  extractDocumentKap,
  employeeToHandoverParty,
  type EmployeeOption,
} from "../_lib/report-utils";
import {
  type HandoverAgreementHistory,
  type BmnAssetOption,
  type EditingDocumentState,
  DEFAULT_HANDOVER_FIRST_PARTY,
  DEFAULT_HANDOVER_WITNESS,
  DEFAULT_HANDOVER_RECEIPT_CLAUSE,
} from "../_lib/types";

export interface HandoverAgreementTabProps {
  formState: ReturnType<typeof useHandoverAgreementFormState>;
  employees: EmployeeOption[];
  loadingEmployees?: boolean;
  canGenerate?: boolean;
  editingDocument?: EditingDocumentState | null;
  onClearEditing?: () => void;
  onRefetchHistory?: () => Promise<void> | void;
}

export function useHandoverAgreementFormState(editingDocument?: EditingDocumentState | null) {
  const editingAppliedRef = useRef<EditingDocumentState | null | undefined>(undefined);
  const initialItem =
    editingDocument && editingDocument.type === "handover"
      ? (editingDocument.item as HandoverAgreementHistory | undefined)
      : undefined;

  const [handoverVariant, setHandoverVariant] = useState<HandoverVariant>(
    initialItem?.variant || "general_goods"
  );
  const [handoverTitle, setHandoverTitle] = useState(
    initialItem?.title ||
      (initialItem?.variant === "vehicle"
        ? "Berita Acara Serah Terima Kendaraan"
        : "Berita Acara Serah Terima Barang")
  );
  const [handoverSequence, setHandoverSequence] = useState(
    editingDocument?.isDuplicate ? "" : (initialItem?.number ? extractDocumentSequence(initialItem.number) : "")
  );
  const [handoverKap, setHandoverKap] = useState(
    (initialItem?.number ? extractDocumentKap(initialItem.number) : null) || (initialItem as any)?.kap || "KAP.03.02"
  );
  const [handoverDate, setHandoverDate] = useState(
    initialItem?.document_date ? initialItem.document_date.split("T")[0] : todayInputValue()
  );
  const [handoverFirstEmployeeId, setHandoverFirstEmployeeId] = useState(
    initialItem?.first_party_employee_id ? String(initialItem.first_party_employee_id) : ""
  );
  const [handoverSecondEmployeeId, setHandoverSecondEmployeeId] = useState(
    initialItem?.second_party_employee_id ? String(initialItem.second_party_employee_id) : ""
  );
  const [handoverFirstPartyType, setHandoverFirstPartyType] = useState<"internal" | "external">(
    initialItem?.first_party_employee_id ? "internal" : (initialItem?.first_party_snapshot?.idType === "NIK" ? "external" : "internal")
  );
  const [handoverSecondPartyType, setHandoverSecondPartyType] = useState<"internal" | "external">(
    initialItem?.second_party_employee_id ? "internal" : (initialItem?.second_party_snapshot?.idType === "NIK" ? "external" : "internal")
  );
  const [handoverFirstParty, setHandoverFirstParty] = useState<HandoverParty>(
    initialItem?.first_party_snapshot
      ? { ...DEFAULT_HANDOVER_FIRST_PARTY, ...initialItem.first_party_snapshot, idType: initialItem.first_party_snapshot.idType || "NIP" }
      : { ...DEFAULT_HANDOVER_FIRST_PARTY, idType: "NIP" }
  );
  const [handoverSecondParty, setHandoverSecondParty] = useState<HandoverParty>(
    initialItem?.second_party_snapshot
      ? { address: "Jl. Teuku Umar Samarinda.", idType: "NIP", ...initialItem.second_party_snapshot }
      : {
          name: "",
          nip: "",
          rank: "",
          position: "",
          address: "Jl. Teuku Umar Samarinda.",
          idType: "NIP",
        }
  );
  const [handoverReceiptClause, setHandoverReceiptClause] = useState(
    initialItem?.metadata?.receipt_clause || DEFAULT_HANDOVER_RECEIPT_CLAUSE
  );
  const [handoverSignerCount, setHandoverSignerCount] = useState<2 | 3>(
    initialItem?.metadata?.signer_count || (initialItem?.witness_snapshot?.name ? 3 : 2)
  );
  const [handoverWitnessEmployeeId, setHandoverWitnessEmployeeId] = useState(
    (initialItem?.metadata as any)?.witness_employee_id ? String((initialItem?.metadata as any).witness_employee_id) : ""
  );
  const [handoverWitness, setHandoverWitness] = useState<HandoverWitness>(
    initialItem?.witness_snapshot
      ? { ...DEFAULT_HANDOVER_WITNESS, ...initialItem.witness_snapshot }
      : DEFAULT_HANDOVER_WITNESS
  );
  const [handoverItems, setHandoverItems] = useState<HandoverItem[]>(
    Array.isArray(initialItem?.items_snapshot) && initialItem!.items_snapshot.length > 0
      ? initialItem!.items_snapshot
      : [emptyGeneralItem()]
  );
  const [selectedVehicleAssetIds, setSelectedVehicleAssetIds] = useState<string[]>(
    Array.isArray(initialItem?.asset_ids) ? initialItem!.asset_ids : []
  );
  const [handoverGeneralDescription, setHandoverGeneralDescription] = useState(
    initialItem?.metadata?.description || ""
  );
  const [handoverVehicleDescription, setHandoverVehicleDescription] = useState(
    initialItem?.variant === "vehicle" && initialItem?.metadata?.description ? initialItem.metadata.description : "kendaraan"
  );
  const [vehicleSearch, setVehicleSearch] = useState("");
  const [openGeneralAssetPicker, setOpenGeneralAssetPicker] = useState(false);
  const [generalAssetSearch, setGeneralAssetSearch] = useState("");
  const [debouncedGeneralAssetSearch] = useDebounce(generalAssetSearch, 300);
  const [savingHandoverAgreement, setSavingHandoverAgreement] = useState(false);

  return {
    editingAppliedRef, debouncedGeneralAssetSearch,
    handoverVariant, setHandoverVariant,
    handoverTitle, setHandoverTitle,
    handoverSequence, setHandoverSequence,
    handoverKap, setHandoverKap,
    handoverDate, setHandoverDate,
    handoverFirstEmployeeId, setHandoverFirstEmployeeId,
    handoverSecondEmployeeId, setHandoverSecondEmployeeId,
    handoverFirstPartyType, setHandoverFirstPartyType,
    handoverSecondPartyType, setHandoverSecondPartyType,
    handoverFirstParty, setHandoverFirstParty,
    handoverSecondParty, setHandoverSecondParty,
    handoverReceiptClause, setHandoverReceiptClause,
    handoverSignerCount, setHandoverSignerCount,
    handoverWitnessEmployeeId, setHandoverWitnessEmployeeId,
    handoverWitness, setHandoverWitness,
    handoverItems, setHandoverItems,
    selectedVehicleAssetIds, setSelectedVehicleAssetIds,
    handoverGeneralDescription, setHandoverGeneralDescription,
    handoverVehicleDescription, setHandoverVehicleDescription,
    vehicleSearch, setVehicleSearch,
    openGeneralAssetPicker, setOpenGeneralAssetPicker,
    generalAssetSearch, setGeneralAssetSearch,
    savingHandoverAgreement, setSavingHandoverAgreement,
  };
}

export function HandoverAgreementTab({
  formState,
  employees,
  loadingEmployees = false,
  canGenerate = true,
  editingDocument,
  onClearEditing,
  onRefetchHistory,
}: HandoverAgreementTabProps) {
  const {
    editingAppliedRef, debouncedGeneralAssetSearch,
    handoverVariant, setHandoverVariant,
    handoverTitle, setHandoverTitle,
    handoverSequence, setHandoverSequence,
    handoverKap, setHandoverKap,
    handoverDate, setHandoverDate,
    handoverFirstEmployeeId, setHandoverFirstEmployeeId,
    handoverSecondEmployeeId, setHandoverSecondEmployeeId,
    handoverFirstPartyType, setHandoverFirstPartyType,
    handoverSecondPartyType, setHandoverSecondPartyType,
    handoverFirstParty, setHandoverFirstParty,
    handoverSecondParty, setHandoverSecondParty,
    handoverReceiptClause, setHandoverReceiptClause,
    handoverSignerCount, setHandoverSignerCount,
    handoverWitnessEmployeeId, setHandoverWitnessEmployeeId,
    handoverWitness, setHandoverWitness,
    handoverItems, setHandoverItems,
    selectedVehicleAssetIds, setSelectedVehicleAssetIds,
    handoverGeneralDescription, setHandoverGeneralDescription,
    handoverVehicleDescription, setHandoverVehicleDescription,
    vehicleSearch, setVehicleSearch,
    openGeneralAssetPicker, setOpenGeneralAssetPicker,
    generalAssetSearch, setGeneralAssetSearch,
    savingHandoverAgreement, setSavingHandoverAgreement,
  } = formState;

  const applyDataToForm = (item: HandoverAgreementHistory, isDuplicate = false) => {
    setHandoverVariant(item.variant || "general_goods");
    setHandoverTitle(
      item.title ||
        (item.variant === "vehicle"
          ? "Berita Acara Serah Terima Kendaraan"
          : "Berita Acara Serah Terima Barang")
    );
    setHandoverSequence(isDuplicate ? "" : extractDocumentSequence(item.number));
    setHandoverKap(extractDocumentKap(item.number) || (item as any).kap || "KAP.03.02");
    if (item.document_date) {
      setHandoverDate(item.document_date.split("T")[0]);
    }
    setHandoverFirstEmployeeId(item.first_party_employee_id ? String(item.first_party_employee_id) : "");
    setHandoverSecondEmployeeId(item.second_party_employee_id ? String(item.second_party_employee_id) : "");
    setHandoverFirstPartyType(item.first_party_employee_id ? "internal" : "external");
    setHandoverSecondPartyType(item.second_party_employee_id ? "internal" : "external");

    if (item.first_party_snapshot) {
      setHandoverFirstParty({
        ...DEFAULT_HANDOVER_FIRST_PARTY,
        ...item.first_party_snapshot,
        idType: item.first_party_snapshot.idType || "NIP",
      });
    }
    if (item.second_party_snapshot) {
      setHandoverSecondParty({
        address: "Jl. Teuku Umar Samarinda.",
        idType: "NIP",
        ...item.second_party_snapshot,
      });
    }
    setHandoverReceiptClause(item.metadata?.receipt_clause || DEFAULT_HANDOVER_RECEIPT_CLAUSE);
    const signerCount = item.metadata?.signer_count || (item.witness_snapshot?.name ? 3 : 2);
    setHandoverSignerCount(signerCount);
    if (item.witness_snapshot) {
      setHandoverWitness({
        ...DEFAULT_HANDOVER_WITNESS,
        ...item.witness_snapshot,
      });
    }
    if ((item.metadata as any)?.witness_employee_id) {
      setHandoverWitnessEmployeeId(String((item.metadata as any).witness_employee_id));
    }
    if (item.variant === "vehicle") {
      setSelectedVehicleAssetIds(Array.isArray(item.asset_ids) ? item.asset_ids : []);
      setHandoverVehicleDescription(item.metadata?.description || "kendaraan");
    } else {
      setHandoverItems(
        Array.isArray(item.items_snapshot) && item.items_snapshot.length > 0
          ? item.items_snapshot
          : [emptyGeneralItem()]
      );
      setHandoverGeneralDescription(item.metadata?.description || "");
    }
  };

  const resetForm = () => {
    setHandoverVariant("general_goods");
    setHandoverTitle("Berita Acara Serah Terima Barang");
    setHandoverSequence("");
    setHandoverKap("KAP.03.02");
    setHandoverDate(todayInputValue());
    setHandoverFirstEmployeeId("");
    setHandoverSecondEmployeeId("");
    setHandoverFirstPartyType("internal");
    setHandoverSecondPartyType("internal");
    setHandoverFirstParty({ ...DEFAULT_HANDOVER_FIRST_PARTY, idType: "NIP" });
    setHandoverSecondParty({
      name: "",
      nip: "",
      rank: "",
      position: "",
      address: "Jl. Teuku Umar Samarinda.",
      idType: "NIP",
    });
    setHandoverReceiptClause(DEFAULT_HANDOVER_RECEIPT_CLAUSE);
    setHandoverSignerCount(2);
    setHandoverWitnessEmployeeId("");
    setHandoverWitness(DEFAULT_HANDOVER_WITNESS);
    setHandoverItems([emptyGeneralItem()]);
    setSelectedVehicleAssetIds([]);
    setHandoverGeneralDescription("");
    setHandoverVehicleDescription("kendaraan");
  };

  // History resources include full snapshots; synchronize edit mode once, without refetch overwriting a draft.

  useEffect(() => {
    if (editingAppliedRef.current === editingDocument) return;
    editingAppliedRef.current = editingDocument;
    if (editingDocument && editingDocument.type === "handover" && editingDocument.item) {
      applyDataToForm(editingDocument.item as HandoverAgreementHistory, Boolean(editingDocument.isDuplicate));
    } else if (!editingDocument) {
      resetForm();
    }
  }, [editingDocument, editingAppliedRef]);

  const { data: vehicleAssets = [], isLoading: loadingVehicleAssets, isError: vehicleAssetsError, refetch: refetchVehicleAssets } = useQuery<BmnAssetOption[]>({
    queryKey: ["bmn-report-vehicle-assets"],
    queryFn: async () => {
      const response = await api.get("/bmn/assets", {
        params: { jenis_bmn: "ALAT ANGKUTAN BERMOTOR", per_page: 500 },
      });
      return response.data.data || [];
    },
  });

  const { data: generalAssetOptions = [], isLoading: loadingGeneralAssetOptions, isError: generalAssetsError, refetch: refetchGeneralAssets } = useQuery<BmnAssetOption[]>({
    queryKey: ["bmn-report-general-asset-options", debouncedGeneralAssetSearch],
    queryFn: async () => {
      const params: Record<string, string | number> = { page: 1, per_page: 50 };
      if (debouncedGeneralAssetSearch.trim()) {
        params.search = debouncedGeneralAssetSearch.trim();
      }
      const response = await api.get("/bmn/assets", { params });
      return response.data.data || [];
    },
  });

  const selectedVehicleAssets = useMemo(
    () => vehicleAssets.filter((asset) => selectedVehicleAssetIds.includes(asset.id)),
    [vehicleAssets, selectedVehicleAssetIds]
  );

  const filteredVehicleAssets = useMemo(() => {
    const needle = vehicleSearch.trim().toLocaleLowerCase("id-ID");
    if (!needle) return vehicleAssets;

    return vehicleAssets.filter((asset) =>
      [asset.nama_barang, asset.merk_tipe, asset.merk, asset.no_polisi]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase("id-ID")
        .includes(needle)
    );
  }, [vehicleAssets, vehicleSearch]);

  const handoverVehicleItems = useMemo<HandoverItem[]>(
    () =>
      selectedVehicleAssets.map((asset) => ({
        asset_id: asset.id,
        name: asset.nama_barang,
        vehicle_type: asset.nama_barang,
        merk_tipe: asset.merk_tipe || asset.merk || "-",
        no_polisi: asset.no_polisi || "-",
        no_mesin: asset.no_mesin || "-",
        no_rangka: asset.no_rangka || "-",
        nup: asset.nup || "",
        foto_depan_url: asset.foto_depan_url,
        foto_belakang_url: asset.foto_belakang_url,
        foto_kiri_url: asset.foto_kiri_url,
        foto_kanan_url: asset.foto_kanan_url,
        foto_geotag_url: asset.foto_geotag_url,
        foto_url: asset.foto_url,
        photos: asset.photos,
      })),
    [selectedVehicleAssets]
  );

  const handoverDocumentItems = useMemo(
    () => (handoverVariant === "vehicle" ? handoverVehicleItems : handoverItems),
    [handoverItems, handoverVariant, handoverVehicleItems]
  );

  const fullHandoverNumber = useMemo(
    () => buildBaNumber(handoverSequence, handoverKap, handoverDate),
    [handoverDate, handoverKap, handoverSequence]
  );

  const activeHandoverDescription =
    handoverVariant === "vehicle" ? handoverVehicleDescription : handoverGeneralDescription;

  const selectedGeneralAssetIds = useMemo(
    () => new Set(handoverItems.map((item) => item.asset_id).filter(Boolean)),
    [handoverItems]
  );

  const handleHandoverVariantChange = (variant: HandoverVariant) => {
    setHandoverVariant(variant);
    if (variant === "vehicle") {
      setHandoverTitle("Berita Acara Serah Terima Kendaraan");
      setHandoverVehicleDescription("kendaraan");
    } else {
      setHandoverTitle("Berita Acara Serah Terima Barang");
      setHandoverGeneralDescription("");
    }
  };

  const handleHandoverPartyEmployeeChange = (role: "first" | "second", employeeId: string) => {
    const employee = employees.find((item) => String(item.id) === employeeId) || null;
    if (role === "first") {
      setHandoverFirstEmployeeId(employeeId);
      setHandoverFirstParty(
        employee
          ? { ...employeeToHandoverParty(employee), idType: "NIP" }
          : { ...DEFAULT_HANDOVER_FIRST_PARTY, idType: "NIP" }
      );
    } else {
      setHandoverSecondEmployeeId(employeeId);
      setHandoverSecondParty(
        employee
          ? { ...employeeToHandoverParty(employee), idType: "NIP" }
          : { name: "", nip: "", rank: "", position: "", address: "Jl. Teuku Umar Samarinda.", idType: "NIP" }
      );
    }
  };

  const handleHandoverWitnessEmployeeChange = (employeeId: string) => {
    setHandoverWitnessEmployeeId(employeeId);
    const employee = employees.find((item) => String(item.id) === employeeId) || null;
    if (employee) {
      setHandoverWitness({
        name: employee.nama_lengkap || employee.name || "",
        nip: formatNip(employee.nip),
        position: employee.jabatan || employee.position || "-",
        label: "Mengetahui,",
      });
    } else {
      setHandoverWitness(DEFAULT_HANDOVER_WITNESS);
    }
  };

  const toggleVehicleAsset = (assetId: string) => {
    setSelectedVehicleAssetIds((current) =>
      current.includes(assetId) ? current.filter((id) => id !== assetId) : [...current, assetId]
    );
  };

  const addHandoverItem = () => {
    setHandoverItems((current) => [...current, emptyGeneralItem()]);
  };

  const updateHandoverItem = (index: number, key: keyof HandoverItem, value: any) => {
    setHandoverItems((current) =>
      current.map((item, itemIndex) => (itemIndex === index ? { ...item, [key]: value } : item))
    );
  };

  const removeHandoverItem = (index: number) => {
    setHandoverItems((current) => {
      if (current.length === 1) return current;
      return current.filter((_, itemIndex) => itemIndex !== index);
    });
  };

  const toggleGeneralAssetItem = (asset: BmnAssetOption) => {
    setHandoverItems((prev) => {
      const isAlreadySelected = prev.some((it) => it.asset_id === asset.id);
      if (isAlreadySelected) {
        const next = prev.filter((it) => it.asset_id !== asset.id);
        return next.length > 0 ? next : [emptyGeneralItem()];
      } else {
        const newItem: HandoverItem = {
          asset_id: asset.id,
          name: asset.nama_barang,
          merk_tipe: asset.merk_tipe || asset.merk || asset.tipe || "",
          quantity: 1,
          nup: asset.nup || "",
        };
        const cleaned = prev.filter(
          (it) => it.asset_id || (it.name && it.name.trim() !== "") || (it.merk_tipe && it.merk_tipe.trim() !== "")
        );
        return [...cleaned, newItem];
      }
    });
  };

  const toggleAllVisibleGeneralAssets = () => {
    if (generalAssetOptions.length === 0) return;
    const allSelected = generalAssetOptions.every((a) => selectedGeneralAssetIds.has(a.id));
    if (allSelected) {
      const visibleIds = new Set(generalAssetOptions.map((a) => a.id));
      setHandoverItems((prev) => {
        const next = prev.filter((it) => !it.asset_id || !visibleIds.has(it.asset_id));
        return next.length > 0 ? next : [emptyGeneralItem()];
      });
    } else {
      const newItems: HandoverItem[] = generalAssetOptions
        .filter((a) => !selectedGeneralAssetIds.has(a.id))
        .map((a) => ({
          asset_id: a.id,
          name: a.nama_barang,
          merk_tipe: a.merk_tipe || a.merk || a.tipe || "",
          quantity: 1,
          nup: a.nup || "",
        }));
      setHandoverItems((prev) => {
        const cleaned = prev.filter(
          (it) => it.asset_id || (it.name && it.name.trim() !== "") || (it.merk_tipe && it.merk_tipe.trim() !== "")
        );
        return [...cleaned, ...newItems];
      });
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

    const isDraft = !handoverSequence.trim();
    const docStatus = isDraft ? "draft" : "published";

    setSavingHandoverAgreement(true);
    try {
      const payload = {
        variant: handoverVariant,
        title: handoverTitle,
        number: fullHandoverNumber,
        status: docStatus,
        kap: handoverKap,
        document_date: handoverDate,
        first_party_employee_id: handoverFirstEmployeeId || null,
        second_party_employee_id: handoverSecondEmployeeId || null,
        first_party: handoverFirstParty,
        second_party: handoverSecondParty,
        witness: handoverSignerCount === 3 ? handoverWitness : null,
        items: handoverVariant === "general_goods" ? validGeneralItems : [],
        asset_ids: handoverVariant === "vehicle" ? selectedVehicleAssetIds : [],
        metadata: {
          description: activeHandoverDescription,
          receipt_clause: handoverReceiptClause,
          signer_count: handoverSignerCount,
        },
      };

      if (editingDocument && editingDocument.type === "handover" && editingDocument.id && !editingDocument.isDuplicate) {
        await api.put(`/bmn/handover-agreements/${editingDocument.id}`, payload);
        toast.success(
          isDraft ? "Draf BA Serah Terima berhasil diperbarui." : "Perubahan BA Serah Terima berhasil disimpan."
        );
        if (onClearEditing) onClearEditing();
      } else {
        await api.post("/bmn/handover-agreements", payload);
        toast.success(
          isDraft ? "Draf BA Serah Terima berhasil disimpan." : "Riwayat BA Serah Terima berhasil disimpan."
        );
        if (onClearEditing) onClearEditing();
      }
      if (onRefetchHistory) {
        await onRefetchHistory();
      }
    } catch {
      toast.error("Gagal menyimpan riwayat BA Serah Terima.");
    } finally {
      setSavingHandoverAgreement(false);
    }
  };

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] p-5">
        <div>
          <h2 className="text-base font-bold text-[var(--ds-fg)]">Generate BA Serah Terima</h2>
          <p className="text-xs text-[var(--ds-fg-muted)]">{fullHandoverNumber}</p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button
            variant="outline"
            className="rounded-xl gap-2"
            onClick={saveHandoverAgreement}
            disabled={savingHandoverAgreement || !canGenerate}
          >
            {savingHandoverAgreement ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {editingDocument?.type === "handover" && !editingDocument.isDuplicate
              ? handoverSequence.trim()
                ? "Simpan Perubahan"
                : "Simpan Perubahan (Draf)"
              : !handoverSequence.trim()
              ? "Simpan Draf"
              : "Simpan Riwayat"}
          </Button>
          <Button
            className="rounded-xl gap-2"
            onClick={() => handlePrintHandoverAgreement()}
          >
            <Printer className="w-4 h-4" />
            Cetak
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] p-5">
        <div className="mb-4">
          <h3 className="text-sm font-bold text-[var(--ds-fg)]">1. Tipe Serah Terima</h3>
          <p className="text-xs text-[var(--ds-fg-muted)]">
            Barang umum bisa ditambah manual. Kendaraan wajib dipilih dari data BMN.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {([
            ["general_goods", "Barang Umum", "Pilih dari data BMN atau input manual jika belum tercatat."],
            ["vehicle", "Kendaraan", "Pilih kendaraan dari katalog BMN, tanpa input manual."],
          ] as const).map(([variant, label, description]) => (
            <button
              key={variant}
              type="button"
              aria-pressed={handoverVariant === variant}
              onClick={() => handleHandoverVariantChange(variant)}
              className={`rounded-xl border p-4 text-left transition-colors duration-150 ease-out ${
                handoverVariant === variant
                  ? "border-[var(--ds-accent-soft-border)] bg-[var(--ds-accent-soft)] text-[var(--ds-accent-fg)]   "
                  : "border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] text-[var(--ds-fg-secondary)] hover:bg-[var(--ds-surface-muted)]   "
              }`}
            >
              <span className="block text-sm font-bold">{label}</span>
              <span className="mt-1 block text-xs text-[var(--ds-fg-muted)]">{description}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 2xl:grid-cols-[430px_minmax(0,1fr)] gap-5">
        <div className="order-3 space-y-5">
          <div className="rounded-2xl border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] p-5">
            <h3 className="mb-4 text-sm font-bold text-[var(--ds-fg)]">3. Detail Dokumen</h3>
            <div className="space-y-3">
              <label className="block">
                <span className="text-xs font-semibold text-[var(--ds-fg-secondary)]">Judul BA</span>
                <input
                  value={handoverTitle}
                  onChange={(event) => setHandoverTitle(event.target.value)}
                  className="mt-1 w-full rounded-xl border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] px-3 py-2 text-sm outline-none"
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-xs font-semibold text-[var(--ds-fg-secondary)]">Nomor BA</span>
                  <input
                    value={handoverSequence}
                    onChange={(event) => setHandoverSequence(event.target.value)}
                    placeholder="contoh: 129"
                    className="mt-1 w-full rounded-xl border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] px-3 py-2 text-sm outline-none"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-semibold text-[var(--ds-fg-secondary)]">KAP</span>
                  <input
                    value={handoverKap}
                    onChange={(event) => setHandoverKap(event.target.value)}
                    className="mt-1 w-full rounded-xl border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] px-3 py-2 text-sm outline-none"
                  />
                </label>
              </div>
              <label className="block">
                <span className="text-xs font-semibold text-[var(--ds-fg-secondary)]">Tanggal Dokumen</span>
                <input
                  type="date"
                  value={handoverDate}
                  onChange={(event) => setHandoverDate(event.target.value)}
                  className="mt-1 w-full rounded-xl border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] px-3 py-2 text-sm outline-none"
                />
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-[var(--ds-fg-secondary)]">
                  Jenis Barang Pada Kalimat BA
                </span>
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
                  placeholder={
                    handoverVariant === "vehicle" ? "contoh: kendaraan roda dua" : "contoh: perlengkapan kebakaran"
                  }
                  className="mt-1 w-full rounded-xl border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] px-3 py-2 text-sm outline-none"
                />
              </label>
            </div>
          </div>

          <div className="rounded-2xl border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] p-5">
            <h3 className="mb-4 text-sm font-bold text-[var(--ds-fg)]">4. Para Pihak</h3>
            <div className="space-y-4">
              {([
                [
                  "first",
                  "Pihak Kesatu",
                  handoverFirstEmployeeId,
                  handoverFirstParty,
                  setHandoverFirstParty,
                  handoverFirstPartyType,
                  setHandoverFirstPartyType,
                ],
                [
                  "second",
                  "Pihak Kedua",
                  handoverSecondEmployeeId,
                  handoverSecondParty,
                  setHandoverSecondParty,
                  handoverSecondPartyType,
                  setHandoverSecondPartyType,
                ],
              ] as const).map(([role, label, employeeId, party, setParty, partyType, setPartyType]) => (
                <div key={role} className="rounded-xl border border-[var(--ds-border-subtle)] p-3">
                  <div className="mb-2.5 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--ds-fg-secondary)]">
                      <UserRound className="w-3.5 h-3.5" /> {label}
                    </div>
                    <div className="flex flex-wrap rounded-lg border border-[var(--ds-border-subtle)] p-0.5 bg-[var(--ds-surface-muted)]">
                      <button
                        type="button"
                        aria-pressed={partyType === "internal"}
                        onClick={() => {
                          setPartyType("internal");
                          setParty({ ...party, idType: "NIP" });
                        }}
                        className={`px-2 py-0.5 rounded-md text-xs font-semibold transition-colors duration-150 ease-out ${
                          partyType === "internal"
                            ? "bg-[var(--ds-surface)] text-[var(--ds-accent-fg)] shadow-xs  "
                            : "text-[var(--ds-fg-muted)] hover:text-[var(--ds-fg)] "
                        }`}
                      >
                        Pegawai (NIP)
                      </button>
                      <button
                        type="button"
                        aria-pressed={partyType === "external"}
                        onClick={() => {
                          setPartyType("external");
                          setParty({ ...party, idType: "NIK" });
                        }}
                        className={`px-2 py-0.5 rounded-md text-xs font-semibold transition-colors duration-150 ease-out ${
                          partyType === "external"
                            ? "bg-[var(--ds-surface)] text-[var(--ds-accent-fg)] shadow-xs  "
                            : "text-[var(--ds-fg-muted)] hover:text-[var(--ds-fg)] "
                        }`}
                      >
                        Pihak Luar (NIK)
                      </button>
                    </div>
                  </div>

                  {partyType === "internal" && (
                    <select
                      aria-label={`Pegawai ${label}`}
                    value={employeeId}
                      onChange={(event) => handleHandoverPartyEmployeeChange(role, event.target.value)}
                      disabled={loadingEmployees}
                      className="mb-2 w-full rounded-lg border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] px-3 py-2 text-xs"
                    >
                      <option value="">
                        {loadingEmployees
                          ? "Memuat daftar pegawai..."
                          : employees.length === 0
                          ? "(Tidak ada data pegawai)"
                          : "Pilih pegawai"}
                      </option>
                      {employees.map((employee) => (
                        <option key={employee.id} value={employee.id}>
                          {employee.nama_lengkap || employee.name} - {formatNip(employee.nip)}
                        </option>
                      ))}
                    </select>
                  )}

                  <input
                    aria-label={`Nama ${label}`}
                    value={party.name}
                    onChange={(event) => setParty({ ...party, name: event.target.value })}
                    placeholder="Nama"
                    className="mb-2 w-full rounded-lg border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] px-3 py-2 text-xs"
                  />
                  <input
                    aria-label={`Identitas ${label}`}
                    value={party.nip || ""}
                    onChange={(event) => setParty({ ...party, nip: event.target.value })}
                    placeholder={partyType === "external" ? "NIK" : "NIP"}
                    className="mb-2 w-full rounded-lg border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] px-3 py-2 text-xs"
                  />
                  <input
                    aria-label={`Jabatan ${label}`}
                    value={party.position || ""}
                    onChange={(event) => setParty({ ...party, position: event.target.value })}
                    placeholder={partyType === "external" ? "Jabatan / Pekerjaan" : "Jabatan"}
                    className="mb-2 w-full rounded-lg border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] px-3 py-2 text-xs"
                  />
                  <input
                    aria-label={`Alamat ${label}`}
                    value={party.address || ""}
                    onChange={(event) => setParty({ ...party, address: event.target.value })}
                    placeholder="Alamat"
                    className="w-full rounded-lg border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] px-3 py-2 text-xs"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] p-5">
            <div className="mb-3 flex flex-wrap gap-2 items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-[var(--ds-fg)]">5. Klausul Tanggung Jawab</h3>
              <button
                type="button"
                onClick={() => setHandoverReceiptClause(DEFAULT_HANDOVER_RECEIPT_CLAUSE)}
                className="text-xs font-semibold text-[var(--ds-accent-fg)] hover:text-[var(--ds-accent-fg)]"
              >
                Reset Default
              </button>
            </div>
            <p className="text-xs text-[var(--ds-fg-muted)] mb-2">
              Klausul penerimaan dan tanggung jawab barang (kata PIHAK KESATU & KEDUA otomatis dicetak tebal).
            </p>
            <textarea
              aria-label="Klausul tanggung jawab"
                  value={handoverReceiptClause}
              onChange={(event) => setHandoverReceiptClause(event.target.value)}
              rows={4}
              className="w-full rounded-xl border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] px-3 py-2 text-xs leading-relaxed outline-none"
            />
          </div>

          <div className="rounded-2xl border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] p-5">
            <div className="mb-3 flex flex-wrap gap-2 items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-[var(--ds-fg)]">6. Konfigurasi Tanda Tangan</h3>
              <div className="flex flex-wrap rounded-lg border border-[var(--ds-border-subtle)] p-0.5 bg-[var(--ds-surface-muted)]">
                <button
                  type="button"
                  aria-pressed={handoverSignerCount === 2}
                  onClick={() => setHandoverSignerCount(2)}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors duration-150 ease-out ${
                    handoverSignerCount === 2
                      ? "bg-[var(--ds-surface)] text-[var(--ds-accent-fg)] shadow-xs  "
                      : "text-[var(--ds-fg-muted)] hover:text-[var(--ds-fg)] "
                  }`}
                >
                  2 TTD
                </button>
                <button
                  type="button"
                  aria-pressed={handoverSignerCount === 3}
                  onClick={() => setHandoverSignerCount(3)}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors duration-150 ease-out ${
                    handoverSignerCount === 3
                      ? "bg-[var(--ds-surface)] text-[var(--ds-accent-fg)] shadow-xs  "
                      : "text-[var(--ds-fg-muted)] hover:text-[var(--ds-fg)] "
                  }`}
                >
                  3 TTD (+ Mengetahui)
                </button>
              </div>
            </div>

            {handoverSignerCount === 3 && (
              <div className="space-y-2.5 rounded-xl border border-[var(--ds-border-subtle)] p-3 bg-[var(--ds-surface-muted)]">
                <div className="text-xs font-bold text-[var(--ds-fg-secondary)]">Penandatangan Mengetahui</div>
                <select
                  aria-label="Pilih penandatangan mengetahui"
                  value={handoverWitnessEmployeeId}
                  onChange={(event) => handleHandoverWitnessEmployeeChange(event.target.value)}
                  disabled={loadingEmployees}
                  className="w-full rounded-lg border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] px-3 py-2 text-xs"
                >
                  <option value="">
                    {loadingEmployees
                      ? "Memuat daftar pegawai..."
                      : employees.length === 0
                      ? "(Tidak ada data pegawai)"
                      : "Pilih dari daftar pegawai (opsional)"}
                  </option>
                  {employees.map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.nama_lengkap || employee.name} - {formatNip(employee.nip)}
                    </option>
                  ))}
                </select>
                <input
                  aria-label="Nama penandatangan mengetahui"
                  value={handoverWitness?.name || ""}
                  onChange={(event) => setHandoverWitness({ ...handoverWitness, name: event.target.value })}
                  placeholder="Nama Penandatangan Mengetahui"
                  className="w-full rounded-lg border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] px-3 py-2 text-xs"
                />
                <input
                  aria-label="NIP penandatangan mengetahui"
                  value={handoverWitness?.nip || ""}
                  onChange={(event) => setHandoverWitness({ ...handoverWitness, nip: event.target.value })}
                  placeholder="NIP Penandatangan Mengetahui"
                  className="w-full rounded-lg border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] px-3 py-2 text-xs"
                />
                <input
                  aria-label="Jabatan penandatangan mengetahui"
                  value={handoverWitness?.position || ""}
                  onChange={(event) => setHandoverWitness({ ...handoverWitness, position: event.target.value })}
                  placeholder="Jabatan Mengetahui (contoh: KEPALA BALAI,)"
                  className="w-full rounded-lg border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] px-3 py-2 text-xs"
                />
              </div>
            )}
          </div>
        </div>

        <div className="contents">
          <div className="order-2 rounded-2xl border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] p-5 2xl:col-span-2">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-[var(--ds-fg)]">2. Barang Diserahterimakan</h3>
                <p className="text-xs text-[var(--ds-fg-muted)]">
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
                {vehicleAssetsError && <div role="alert" className="text-sm text-[var(--ds-status-danger-fg)]">Daftar kendaraan gagal dimuat. <Button variant="outline" onClick={() => refetchVehicleAssets()}>Coba lagi</Button></div>}
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--ds-fg-muted)]" />
                  <input
                    aria-label="Cari kendaraan"
                  value={vehicleSearch}
                    onChange={(event) => setVehicleSearch(event.target.value)}
                    placeholder="Cari kendaraan, merk, atau no polisi..."
                    className="h-10 w-full rounded-xl border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] pl-9 pr-3 text-sm outline-none"
                  />
                </div>
                <div className="max-h-96 overflow-auto rounded-xl border border-[var(--ds-border-subtle)]">
                  <table className={`${filteredVehicleAssets.length > 0 ? "bmn-wide-table" : ""} w-full table-fixed text-left text-xs`}>
                    <thead className="sticky top-0 bg-[var(--ds-surface-muted)] text-[var(--ds-fg-muted)]">
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
                    <tbody className="divide-y divide-[var(--ds-border-subtle)]">
                      {filteredVehicleAssets.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-3 py-8 text-center text-[var(--ds-fg-muted)]">
                            {loadingVehicleAssets
                              ? "Memuat kendaraan..."
                              : "Tidak ada kendaraan yang sesuai pencarian."}
                          </td>
                        </tr>
                      ) : (
                        filteredVehicleAssets.map((asset) => (
                          <tr key={asset.id} aria-selected={selectedVehicleAssetIds.includes(asset.id)} className="bmn-table-row text-[var(--ds-fg-secondary)]">
                            <td className="px-2 py-2">
                              <input
                                type="checkbox"
                                aria-label={`Pilih kendaraan ${asset.nama_barang} NUP ${asset.nup || "-"}`}
                                checked={selectedVehicleAssetIds.includes(asset.id)}
                                onChange={() => toggleVehicleAsset(asset.id)}
                              />
                            </td>
                            <td className="px-3 py-2 font-semibold truncate" title={asset.nama_barang}>
                              {asset.nama_barang}
                            </td>
                            <td
                              className="px-3 py-2 text-[var(--ds-fg-muted)] truncate"
                              title={asset.merk_tipe || asset.merk || "-"}
                            >
                              {asset.merk_tipe || asset.merk || "-"}
                            </td>
                            <td className="px-2 py-2 text-[var(--ds-fg-muted)]">{asset.nup || "-"}</td>
                            <td className="px-2 py-2 text-[var(--ds-fg-muted)] truncate" title={asset.no_polisi || "-"}>
                              {asset.no_polisi || "-"}
                            </td>
                            <td className="px-2 py-2 text-[var(--ds-fg-muted)] truncate" title={asset.no_mesin || "-"}>
                              {asset.no_mesin || "-"}
                            </td>
                            <td className="px-2 py-2 text-[var(--ds-fg-muted)] truncate" title={asset.no_rangka || "-"}>
                              {asset.no_rangka || "-"}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="rounded-xl border border-[var(--ds-border-subtle)] bg-[var(--ds-surface-muted)] p-3">
                  <div className="mb-2 text-xs font-semibold text-[var(--ds-fg-secondary)]">
                    Tambah dari data BMN
                  </div>
                  <Popover open={openGeneralAssetPicker} onOpenChange={setOpenGeneralAssetPicker}>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        className="h-11 w-full justify-between rounded-lg bg-[var(--ds-surface)] px-3 text-left text-xs font-normal"
                        disabled={loadingGeneralAssetOptions}
                      >
                        <span className="flex items-center gap-2 truncate text-[var(--ds-fg-secondary)]">
                          <Search className="h-4 w-4 shrink-0 text-[var(--ds-fg-muted)]" />
                          {loadingGeneralAssetOptions ? (
                            <span className="text-[var(--ds-fg-muted)]">Memuat barang BMN...</span>
                          ) : selectedGeneralAssetIds.size > 0 ? (
                            <span>
                              <strong className="text-[var(--ds-accent-fg)]">
                                {selectedGeneralAssetIds.size} barang BMN terpilih
                              </strong>{" "}
                              (klik untuk cari & tambah lagi)
                            </span>
                          ) : (
                            <span className="text-[var(--ds-fg-muted)]">Cari nama barang, merk, atau NUP...</span>
                          )}
                        </span>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent data-module="bmn" aria-label="Pilih barang dari data BMN" className="bmn-assets-ui bmn-standard-ui bmn-popover w-[680px] max-w-[calc(100vw-2rem)] p-0" align="start">
                      <div className="flex max-h-125 flex-col">
                        <div className="flex items-center border-b px-3 py-2.5">
                          <Search className="mr-2 h-4 w-4 shrink-0 text-[var(--ds-fg-muted)]" />
                          <Input
                            className="h-9 border-0 bg-transparent px-0 text-sm shadow-none outline-none"
                            placeholder="Ketik nama barang, merk/tipe, atau NUP..."
                            aria-label="Cari barang BMN"
                  value={generalAssetSearch}
                            onChange={(event) => setGeneralAssetSearch(event.target.value)}
                            autoFocus
                          />
                          {generalAssetSearch && (
                            <button
                              type="button"
                              aria-label="Bersihkan pencarian barang"
                              onClick={() => setGeneralAssetSearch("")}
                              className="ml-2 text-xs text-[var(--ds-fg-muted)] hover:text-[var(--ds-fg-secondary)]"
                            >
                              Hapus
                            </button>
                          )}
                        </div>

                        {!loadingGeneralAssetOptions && generalAssetOptions.length > 0 && (
                          <div className="flex items-center justify-between border-b border-[var(--ds-border-subtle)] bg-[var(--ds-surface-muted)] px-3 py-2 text-xs text-[var(--ds-fg-muted)]">
                            <span>
                              Ditemukan <strong>{generalAssetOptions.length}</strong> barang
                            </span>
                            <button
                              type="button"
                              onClick={toggleAllVisibleGeneralAssets}
                              className="font-semibold text-[var(--ds-accent-fg)] hover:text-[var(--ds-accent-fg)]"
                            >
                              {generalAssetOptions.every((a) => selectedGeneralAssetIds.has(a.id))
                                ? "Batalkan Semua Hasil Ini"
                                : "Pilih Semua Hasil Ini"}
                            </button>
                          </div>
                        )}

                        <div className="flex-1 overflow-y-auto p-1.5 divide-y divide-[var(--ds-border-subtle)] max-h-85">
                          {loadingGeneralAssetOptions && (
                            <div className="py-8 text-center text-sm text-[var(--ds-fg-muted)]">
                              <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin text-[var(--ds-accent-fg)]" />
                              Mencari data BMN...
                            </div>
                          )}
                          {generalAssetsError && <div role="alert" className="p-4 text-sm text-[var(--ds-status-danger-fg)]">Daftar barang BMN gagal dimuat. <Button variant="outline" className="mt-2" onClick={() => refetchGeneralAssets()}>Coba lagi</Button></div>}
                          {!loadingGeneralAssetOptions && !generalAssetsError && generalAssetOptions.length === 0 && (
                            <div className="py-8 text-center text-sm text-[var(--ds-fg-muted)]">
                              Tidak ada aset yang sesuai kata kunci pencarian.
                            </div>
                          )}
                          {!loadingGeneralAssetOptions &&
                            generalAssetOptions.map((asset) => {
                              const isSelected = selectedGeneralAssetIds.has(asset.id);
                              const merkTipe = asset.merk_tipe || asset.merk || asset.tipe || "-";
                              return (
                                <label
                                  key={asset.id}
                                  data-selected={isSelected}
                                  className={`bmn-choice-card flex cursor-pointer items-start gap-3 rounded-lg p-2.5 select-none ${
                                    isSelected
                                      ? "bg-[var(--ds-accent-soft)] "
                                      : "hover:bg-[var(--ds-surface-muted)] "
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    aria-label={`Pilih ${asset.nama_barang} NUP ${asset.nup || "-"}`}
                                    checked={isSelected}
                                    onChange={() => toggleGeneralAssetItem(asset)}
                                    className="mt-0.5 h-4 w-4 rounded border-[var(--ds-border-subtle)] text-[var(--ds-accent-fg)]"
                                  />
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-start justify-between gap-2">
                                      <span
                                        className={`block text-xs font-bold leading-tight ${
                                          isSelected
                                            ? "text-[var(--ds-accent-fg)] "
                                            : "text-[var(--ds-fg)] "
                                        }`}
                                      >
                                        {asset.nama_barang}
                                      </span>
                                      {isSelected && (
                                        <span className="shrink-0 rounded-full bg-[var(--ds-accent-soft)] px-2 py-0.5 text-xs font-semibold text-[var(--ds-accent-fg)]">
                                          ✓ Dipilih
                                        </span>
                                      )}
                                    </div>
                                    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--ds-fg-muted)]">
                                      <span>
                                        Merk/Tipe:{" "}
                                        <b className="font-semibold text-[var(--ds-fg-secondary)]">{merkTipe}</b>
                                      </span>
                                      <span>
                                        NUP:{" "}
                                        <b className="font-semibold text-[var(--ds-accent-fg)]">
                                          {asset.nup || "-"}
                                        </b>
                                      </span>
                                      {asset.kode_barang && (
                                        <span className="text-[var(--ds-fg-muted)]">
                                          Kode: {asset.kode_barang}
                                        </span>
                                      )}
                                      {asset.kondisi && (
                                        <span
                                          data-status={asset.kondisi.trim().toLowerCase() === "baik" ? "success" : asset.kondisi.trim().toLowerCase() === "rusak berat" ? "danger" : asset.kondisi.trim().toLowerCase() === "rusak ringan" ? "warning" : "neutral"}
                                          className="inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium"
                                        >
                                          {asset.kondisi}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </label>
                              );
                            })}
                        </div>

                        <div className="flex items-center justify-between border-t border-[var(--ds-border-subtle)] bg-[var(--ds-surface-muted)] px-3 py-2 text-xs">
                          <span className="text-[var(--ds-fg-secondary)]">
                            Total terpilih:{" "}
                            <strong className="font-bold text-[var(--ds-accent-fg)]">
                              {selectedGeneralAssetIds.size}
                            </strong>{" "}
                            barang
                          </span>
                          <Button
                            type="button"
                            size="sm"
                            className="h-8 rounded-lg bg-[var(--ds-accent-soft)] px-3 text-xs font-semibold text-white hover:bg-[var(--ds-accent-soft)]"
                            onClick={() => setOpenGeneralAssetPicker(false)}
                          >
                            Selesai
                          </Button>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="overflow-x-auto rounded-xl border border-[var(--ds-border-subtle)]">
                  <table className="bmn-wide-table w-full table-fixed text-left text-xs">
                    <thead className="bg-[var(--ds-surface-muted)] text-[var(--ds-fg-muted)]">
                      <tr>
                        <th className="w-40 px-3 py-2">Nama Barang</th>
                        <th className="w-32 px-2 py-2">Merk / Tipe</th>
                        <th className="w-24 px-2 py-2">Jumlah</th>
                        <th className="w-16 px-2 py-2">NUP</th>
                        <th className="w-14 px-2 py-2">Sumber</th>
                        <th className="w-16 px-3 py-2 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--ds-border-subtle)]">
                      {handoverItems.map((item, index) => (
                        <tr key={index}>
                          <td className="px-3 py-2">
                            <input
                              value={item.name || ""}
                              onChange={(event) => updateHandoverItem(index, "name", event.target.value)}
                              placeholder="Nama barang"
                              className="w-full rounded-lg border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] px-2 py-1.5 text-xs"
                            />
                          </td>
                          <td className="px-2 py-2">
                            <input
                              value={item.merk_tipe || ""}
                              onChange={(event) => updateHandoverItem(index, "merk_tipe", event.target.value)}
                              placeholder="Merk / Tipe"
                              className="w-full rounded-lg border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] px-2 py-1.5 text-xs"
                            />
                          </td>
                          <td className="px-2 py-2">
                            <input
                              type="text"
                              value={item.quantity ?? ""}
                              onChange={(event) => updateHandoverItem(index, "quantity", event.target.value)}
                              placeholder="Contoh: 1 Box"
                              className="w-full rounded-lg border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] px-2 py-1.5 text-xs"
                            />
                          </td>
                          <td className="px-2 py-2">
                            <input
                              value={item.nup || ""}
                              onChange={(event) => updateHandoverItem(index, "nup", event.target.value)}
                              placeholder="-"
                              className="w-full rounded-lg border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] px-2 py-1.5 text-xs"
                            />
                          </td>
                          <td className="px-2 py-2 text-[var(--ds-fg-muted)]">{item.asset_id ? "BMN" : "Manual"}</td>
                          <td className="px-3 py-2 text-right">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="bmn-icon-danger h-7 rounded-lg px-2 text-xs"
                              onClick={() => removeHandoverItem(index)}
                              disabled={handoverItems.length === 1}
                            >
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

          <div className="order-5 min-w-0 rounded-2xl border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] p-5">
            <div className="mb-4">
              <h3 className="text-sm font-bold text-[var(--ds-fg)]">5. Preview Dokumen</h3>
              <p className="text-xs text-[var(--ds-fg-muted)]">{fullHandoverNumber}</p>
            </div>
            <div className="overflow-x-auto rounded-xl border border-[var(--ds-border-subtle)] bg-[var(--ds-surface-muted)] p-4">
              <HandoverAgreementDocument
                number={fullHandoverNumber}
                title={handoverTitle}
                variant={handoverVariant}
                documentDate={handoverDate}
                firstParty={handoverFirstParty}
                secondParty={handoverSecondParty}
                items={handoverDocumentItems}
                description={activeHandoverDescription}
                receiptClause={handoverReceiptClause}
                signerCount={handoverSignerCount}
                witness={handoverWitness}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
