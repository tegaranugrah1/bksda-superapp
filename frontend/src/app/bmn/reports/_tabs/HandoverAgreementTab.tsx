"use client";

import { useMemo, useState } from "react";
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
  employees: EmployeeOption[];
  loadingEmployees?: boolean;
  canGenerate?: boolean;
  editingDocument?: EditingDocumentState | null;
  onClearEditing?: () => void;
  onRefetchHistory?: () => Promise<void> | void;
}

export function HandoverAgreementTab({
  employees,
  loadingEmployees = false,
  canGenerate = true,
  editingDocument,
  onClearEditing,
  onRefetchHistory,
}: HandoverAgreementTabProps) {
  const [handoverVariant, setHandoverVariant] = useState<HandoverVariant>("general_goods");
  const [handoverTitle, setHandoverTitle] = useState("Berita Acara Serah Terima Barang");
  const [handoverSequence, setHandoverSequence] = useState("");
  const [handoverKap, setHandoverKap] = useState("KAP.03.02");
  const [handoverDate, setHandoverDate] = useState(todayInputValue());
  const [handoverFirstEmployeeId, setHandoverFirstEmployeeId] = useState("");
  const [handoverSecondEmployeeId, setHandoverSecondEmployeeId] = useState("");
  const [handoverFirstPartyType, setHandoverFirstPartyType] = useState<"internal" | "external">("internal");
  const [handoverSecondPartyType, setHandoverSecondPartyType] = useState<"internal" | "external">("internal");
  const [handoverFirstParty, setHandoverFirstParty] = useState<HandoverParty>({
    ...DEFAULT_HANDOVER_FIRST_PARTY,
    idType: "NIP",
  });
  const [handoverSecondParty, setHandoverSecondParty] = useState<HandoverParty>({
    name: "",
    nip: "",
    rank: "",
    position: "",
    address: "Jl. Teuku Umar Samarinda.",
    idType: "NIP",
  });
  const [handoverReceiptClause, setHandoverReceiptClause] = useState(DEFAULT_HANDOVER_RECEIPT_CLAUSE);
  const [handoverSignerCount, setHandoverSignerCount] = useState<2 | 3>(2);
  const [handoverWitnessEmployeeId, setHandoverWitnessEmployeeId] = useState("");
  const [handoverWitness, setHandoverWitness] = useState<HandoverWitness>(DEFAULT_HANDOVER_WITNESS);
  const [handoverItems, setHandoverItems] = useState<HandoverItem[]>([emptyGeneralItem()]);
  const [selectedVehicleAssetIds, setSelectedVehicleAssetIds] = useState<string[]>([]);
  const [handoverGeneralDescription, setHandoverGeneralDescription] = useState("");
  const [handoverVehicleDescription, setHandoverVehicleDescription] = useState("kendaraan");
  const [vehicleSearch, setVehicleSearch] = useState("");
  const [openGeneralAssetPicker, setOpenGeneralAssetPicker] = useState(false);
  const [generalAssetSearch, setGeneralAssetSearch] = useState("");
  const [debouncedGeneralAssetSearch] = useDebounce(generalAssetSearch, 300);
  const [savingHandoverAgreement, setSavingHandoverAgreement] = useState(false);

  const { data: vehicleAssets = [], isLoading: loadingVehicleAssets } = useQuery<BmnAssetOption[]>({
    queryKey: ["bmn-report-vehicle-assets"],
    queryFn: async () => {
      const response = await api.get("/bmn/assets", {
        params: { jenis_bmn: "ALAT ANGKUTAN BERMOTOR", per_page: 500 },
      });
      return response.data.data || [];
    },
  });

  const { data: generalAssetOptions = [], isLoading: loadingGeneralAssetOptions } = useQuery<BmnAssetOption[]>({
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
        name: employee.nama_lengkap,
        nip: formatNip(employee.nip),
        position: employee.jabatan || "-",
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

      if (editingDocument && editingDocument.type === "handover") {
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
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <div>
          <h2 className="text-base font-bold text-zinc-900 dark:text-white">Generate BA Serah Terima</h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">{fullHandoverNumber}</p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button
            variant="outline"
            className="rounded-xl gap-2"
            onClick={saveHandoverAgreement}
            disabled={savingHandoverAgreement || !canGenerate}
          >
            {savingHandoverAgreement ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {editingDocument?.type === "handover"
              ? handoverSequence.trim()
                ? "Simpan Perubahan"
                : "Simpan Perubahan (Draf)"
              : !handoverSequence.trim()
              ? "Simpan Draf"
              : "Simpan Riwayat"}
          </Button>
          <Button
            className="rounded-xl gap-2 bg-emerald-600 hover:bg-emerald-500"
            onClick={() => handlePrintHandoverAgreement()}
          >
            <Printer className="w-4 h-4" />
            Cetak
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mb-4">
          <h3 className="text-sm font-bold text-zinc-900 dark:text-white">1. Tipe Serah Terima</h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
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
              onClick={() => handleHandoverVariantChange(variant)}
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
                <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">
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
                  className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/10 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                />
              </label>
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
            <h3 className="mb-4 text-sm font-bold text-zinc-900 dark:text-white">4. Para Pihak</h3>
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
                <div key={role} className="rounded-xl border border-zinc-200 p-3 dark:border-zinc-800">
                  <div className="mb-2.5 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-700 dark:text-zinc-200">
                      <UserRound className="w-3.5 h-3.5" /> {label}
                    </div>
                    <div className="flex rounded-lg border border-zinc-200 p-0.5 bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800">
                      <button
                        type="button"
                        onClick={() => {
                          setPartyType("internal");
                          setParty({ ...party, idType: "NIP" });
                        }}
                        className={`px-2 py-0.5 rounded-md text-[11px] font-semibold transition ${
                          partyType === "internal"
                            ? "bg-white text-emerald-700 shadow-xs dark:bg-zinc-900 dark:text-emerald-400"
                            : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300"
                        }`}
                      >
                        Pegawai (NIP)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setPartyType("external");
                          setParty({ ...party, idType: "NIK" });
                        }}
                        className={`px-2 py-0.5 rounded-md text-[11px] font-semibold transition ${
                          partyType === "external"
                            ? "bg-white text-emerald-700 shadow-xs dark:bg-zinc-900 dark:text-emerald-400"
                            : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300"
                        }`}
                      >
                        Pihak Luar (NIK)
                      </button>
                    </div>
                  </div>

                  {partyType === "internal" && (
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
                  )}

                  <input
                    value={party.name}
                    onChange={(event) => setParty({ ...party, name: event.target.value })}
                    placeholder="Nama"
                    className="mb-2 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                  />
                  <input
                    value={party.nip || ""}
                    onChange={(event) => setParty({ ...party, nip: event.target.value })}
                    placeholder={partyType === "external" ? "NIK" : "NIP"}
                    className="mb-2 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                  />
                  <input
                    value={party.position || ""}
                    onChange={(event) => setParty({ ...party, position: event.target.value })}
                    placeholder={partyType === "external" ? "Jabatan / Pekerjaan" : "Jabatan"}
                    className="mb-2 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                  />
                  <input
                    value={party.address || ""}
                    onChange={(event) => setParty({ ...party, address: event.target.value })}
                    placeholder="Alamat"
                    className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-white">5. Klausul Tanggung Jawab</h3>
              <button
                type="button"
                onClick={() => setHandoverReceiptClause(DEFAULT_HANDOVER_RECEIPT_CLAUSE)}
                className="text-[11px] font-semibold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
              >
                Reset Default
              </button>
            </div>
            <p className="text-xs text-zinc-500 mb-2 dark:text-zinc-400">
              Klausul penerimaan dan tanggung jawab barang (kata PIHAK KESATU & KEDUA otomatis dicetak tebal).
            </p>
            <textarea
              value={handoverReceiptClause}
              onChange={(event) => setHandoverReceiptClause(event.target.value)}
              rows={4}
              className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs leading-relaxed outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/10 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
            />
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-white">6. Konfigurasi Tanda Tangan</h3>
              <div className="flex rounded-lg border border-zinc-200 p-0.5 bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800">
                <button
                  type="button"
                  onClick={() => setHandoverSignerCount(2)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition ${
                    handoverSignerCount === 2
                      ? "bg-white text-emerald-700 shadow-xs dark:bg-zinc-900 dark:text-emerald-400"
                      : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300"
                  }`}
                >
                  2 TTD
                </button>
                <button
                  type="button"
                  onClick={() => setHandoverSignerCount(3)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition ${
                    handoverSignerCount === 3
                      ? "bg-white text-emerald-700 shadow-xs dark:bg-zinc-900 dark:text-emerald-400"
                      : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300"
                  }`}
                >
                  3 TTD (+ Mengetahui)
                </button>
              </div>
            </div>

            {handoverSignerCount === 3 && (
              <div className="space-y-2.5 rounded-xl border border-zinc-200 p-3 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/30">
                <div className="text-xs font-bold text-zinc-700 dark:text-zinc-200">Penandatangan Mengetahui</div>
                <select
                  value={handoverWitnessEmployeeId}
                  onChange={(event) => handleHandoverWitnessEmployeeChange(event.target.value)}
                  disabled={loadingEmployees}
                  className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                >
                  <option value="">Pilih dari daftar pegawai (opsional)</option>
                  {employees.map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.nama_lengkap} - {employee.nip}
                    </option>
                  ))}
                </select>
                <input
                  value={handoverWitness?.name || ""}
                  onChange={(event) => setHandoverWitness({ ...handoverWitness, name: event.target.value })}
                  placeholder="Nama Penandatangan Mengetahui"
                  className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                />
                <input
                  value={handoverWitness?.nip || ""}
                  onChange={(event) => setHandoverWitness({ ...handoverWitness, nip: event.target.value })}
                  placeholder="NIP Penandatangan Mengetahui"
                  className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                />
                <input
                  value={handoverWitness?.position || ""}
                  onChange={(event) => setHandoverWitness({ ...handoverWitness, position: event.target.value })}
                  placeholder="Jabatan Mengetahui (contoh: KEPALA BALAI,)"
                  className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                />
              </div>
            )}
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
                        <tr>
                          <td colSpan={7} className="px-3 py-8 text-center text-zinc-500">
                            {loadingVehicleAssets
                              ? "Memuat kendaraan..."
                              : "Tidak ada kendaraan yang sesuai pencarian."}
                          </td>
                        </tr>
                      ) : (
                        filteredVehicleAssets.map((asset) => (
                          <tr key={asset.id} className="text-zinc-700 dark:text-zinc-200">
                            <td className="px-2 py-2">
                              <input
                                type="checkbox"
                                checked={selectedVehicleAssetIds.includes(asset.id)}
                                onChange={() => toggleVehicleAsset(asset.id)}
                              />
                            </td>
                            <td className="px-3 py-2 font-semibold truncate" title={asset.nama_barang}>
                              {asset.nama_barang}
                            </td>
                            <td
                              className="px-3 py-2 text-zinc-500 truncate"
                              title={asset.merk_tipe || asset.merk || "-"}
                            >
                              {asset.merk_tipe || asset.merk || "-"}
                            </td>
                            <td className="px-2 py-2 text-zinc-500">{asset.nup || "-"}</td>
                            <td className="px-2 py-2 text-zinc-500 truncate" title={asset.no_polisi || "-"}>
                              {asset.no_polisi || "-"}
                            </td>
                            <td className="px-2 py-2 text-zinc-500 truncate" title={asset.no_mesin || "-"}>
                              {asset.no_mesin || "-"}
                            </td>
                            <td className="px-2 py-2 text-zinc-500 truncate" title={asset.no_rangka || "-"}>
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
                <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-950">
                  <div className="mb-2 text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                    Tambah dari data BMN
                  </div>
                  <Popover open={openGeneralAssetPicker} onOpenChange={setOpenGeneralAssetPicker}>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        className="h-11 w-full justify-between rounded-lg bg-white px-3 text-left text-xs font-normal dark:bg-zinc-900"
                        disabled={loadingGeneralAssetOptions}
                      >
                        <span className="flex items-center gap-2 truncate text-zinc-600 dark:text-zinc-300">
                          <Search className="h-4 w-4 shrink-0 text-zinc-400" />
                          {loadingGeneralAssetOptions ? (
                            <span className="text-zinc-500">Memuat barang BMN...</span>
                          ) : selectedGeneralAssetIds.size > 0 ? (
                            <span>
                              <strong className="text-emerald-600 dark:text-emerald-400">
                                {selectedGeneralAssetIds.size} barang BMN terpilih
                              </strong>{" "}
                              (klik untuk cari & tambah lagi)
                            </span>
                          ) : (
                            <span className="text-zinc-500">Cari nama barang, merk, atau NUP...</span>
                          )}
                        </span>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[min(680px,95vw)] p-0 shadow-xl" align="start">
                      <div className="flex max-h-125 flex-col">
                        <div className="flex items-center border-b px-3 py-2.5">
                          <Search className="mr-2 h-4 w-4 shrink-0 text-zinc-400" />
                          <Input
                            className="h-9 border-0 bg-transparent px-0 text-sm shadow-none outline-none focus-visible:ring-0"
                            placeholder="Ketik nama barang, merk/tipe, atau NUP..."
                            value={generalAssetSearch}
                            onChange={(event) => setGeneralAssetSearch(event.target.value)}
                            autoFocus
                          />
                          {generalAssetSearch && (
                            <button
                              type="button"
                              onClick={() => setGeneralAssetSearch("")}
                              className="ml-2 text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                            >
                              Hapus
                            </button>
                          )}
                        </div>

                        {!loadingGeneralAssetOptions && generalAssetOptions.length > 0 && (
                          <div className="flex items-center justify-between border-b border-zinc-100 bg-zinc-50/80 px-3 py-2 text-xs text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/60">
                            <span>
                              Ditemukan <strong>{generalAssetOptions.length}</strong> barang
                            </span>
                            <button
                              type="button"
                              onClick={toggleAllVisibleGeneralAssets}
                              className="font-semibold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300"
                            >
                              {generalAssetOptions.every((a) => selectedGeneralAssetIds.has(a.id))
                                ? "Batalkan Semua Hasil Ini"
                                : "Pilih Semua Hasil Ini"}
                            </button>
                          </div>
                        )}

                        <div className="flex-1 overflow-y-auto p-1.5 divide-y divide-zinc-100 dark:divide-zinc-800/60 max-h-85">
                          {loadingGeneralAssetOptions && (
                            <div className="py-8 text-center text-sm text-zinc-500">
                              <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin text-emerald-600" />
                              Mencari data BMN...
                            </div>
                          )}
                          {!loadingGeneralAssetOptions && generalAssetOptions.length === 0 && (
                            <div className="py-8 text-center text-sm text-zinc-400">
                              Tidak ada aset yang sesuai kata kunci pencarian.
                            </div>
                          )}
                          {!loadingGeneralAssetOptions &&
                            generalAssetOptions.map((asset) => {
                              const isSelected = selectedGeneralAssetIds.has(asset.id);
                              const merkTipe = asset.merk_tipe || asset.merk || asset.tipe || "-";
                              return (
                                <div
                                  key={asset.id}
                                  onClick={() => toggleGeneralAssetItem(asset)}
                                  className={`flex cursor-pointer items-start gap-3 rounded-lg p-2.5 transition select-none ${
                                    isSelected
                                      ? "bg-emerald-50/80 dark:bg-emerald-950/30"
                                      : "hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => {}}
                                    className="mt-0.5 h-4 w-4 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500 dark:border-zinc-700 dark:bg-zinc-900"
                                  />
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-start justify-between gap-2">
                                      <span
                                        className={`block text-xs font-bold leading-tight ${
                                          isSelected
                                            ? "text-emerald-900 dark:text-emerald-200"
                                            : "text-zinc-900 dark:text-zinc-100"
                                        }`}
                                      >
                                        {asset.nama_barang}
                                      </span>
                                      {isSelected && (
                                        <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300">
                                          ✓ Dipilih
                                        </span>
                                      )}
                                    </div>
                                    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-zinc-500 dark:text-zinc-400">
                                      <span>
                                        Merk/Tipe:{" "}
                                        <b className="font-semibold text-zinc-700 dark:text-zinc-200">{merkTipe}</b>
                                      </span>
                                      <span>
                                        NUP:{" "}
                                        <b className="font-semibold text-emerald-600 dark:text-emerald-400">
                                          {asset.nup || "-"}
                                        </b>
                                      </span>
                                      {asset.kode_barang && (
                                        <span className="text-zinc-400 dark:text-zinc-500">
                                          Kode: {asset.kode_barang}
                                        </span>
                                      )}
                                      {asset.kondisi && (
                                        <span
                                          className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium ${
                                            /baik/i.test(asset.kondisi)
                                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                              : /rusak berat/i.test(asset.kondisi)
                                              ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                                              : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                                          }`}
                                        >
                                          {asset.kondisi}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                        </div>

                        <div className="flex items-center justify-between border-t border-zinc-200 bg-zinc-50/90 px-3 py-2 text-xs dark:border-zinc-800 dark:bg-zinc-950">
                          <span className="text-zinc-600 dark:text-zinc-300">
                            Total terpilih:{" "}
                            <strong className="font-bold text-emerald-600 dark:text-emerald-400">
                              {selectedGeneralAssetIds.size}
                            </strong>{" "}
                            barang
                          </span>
                          <Button
                            type="button"
                            size="sm"
                            className="h-8 rounded-lg bg-emerald-600 px-3 text-xs font-semibold text-white hover:bg-emerald-700"
                            onClick={() => setOpenGeneralAssetPicker(false)}
                          >
                            Selesai
                          </Button>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
                  <table className="w-full table-fixed text-left text-xs">
                    <thead className="bg-zinc-50 text-zinc-500 dark:bg-zinc-950 dark:text-zinc-400">
                      <tr>
                        <th className="w-40 px-3 py-2">Nama Barang</th>
                        <th className="w-32 px-2 py-2">Merk / Tipe</th>
                        <th className="w-24 px-2 py-2">Jumlah</th>
                        <th className="w-16 px-2 py-2">NUP</th>
                        <th className="w-14 px-2 py-2">Sumber</th>
                        <th className="w-16 px-3 py-2 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                      {handoverItems.map((item, index) => (
                        <tr key={index}>
                          <td className="px-3 py-2">
                            <input
                              value={item.name || ""}
                              onChange={(event) => updateHandoverItem(index, "name", event.target.value)}
                              placeholder="Nama barang"
                              className="w-full rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-xs dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                            />
                          </td>
                          <td className="px-2 py-2">
                            <input
                              value={item.merk_tipe || ""}
                              onChange={(event) => updateHandoverItem(index, "merk_tipe", event.target.value)}
                              placeholder="Merk / Tipe"
                              className="w-full rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-xs dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                            />
                          </td>
                          <td className="px-2 py-2">
                            <input
                              type="text"
                              value={item.quantity ?? ""}
                              onChange={(event) => updateHandoverItem(index, "quantity", event.target.value)}
                              placeholder="Contoh: 1 Box"
                              className="w-full rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-xs dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                            />
                          </td>
                          <td className="px-2 py-2">
                            <input
                              value={item.nup || ""}
                              onChange={(event) => updateHandoverItem(index, "nup", event.target.value)}
                              placeholder="-"
                              className="w-full rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-xs dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                            />
                          </td>
                          <td className="px-2 py-2 text-zinc-500">{item.asset_id ? "BMN" : "Manual"}</td>
                          <td className="px-3 py-2 text-right">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-7 rounded-lg border-rose-200 px-2 text-xs text-rose-600 hover:bg-rose-50"
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
