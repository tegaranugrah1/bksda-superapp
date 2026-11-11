"use client";

import { useState, useRef, useEffect, useId } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  ArrowLeft,
  Save,
  Image as ImageIcon,
  X,
  ChevronDown,
  UserPlus,
  ShieldCheck,
  Briefcase,
  UserCheck,
  Upload,
  Trash2,
  ShieldAlert,
} from "lucide-react";
import Image from "next/image";
import { api } from "@/lib/api";
import Link from "next/link";
import { toast } from "sonner";
import { useRole } from "@/hooks/useRole";
import {
  SATUAN_KERJA_OPTIONS as SATUAN_KERJA,
  RESOR_OPTIONS,
  PANGKAT_PNS_OPTIONS,
  PANGKAT_PPPK_OPTIONS,
  JENIS_PEGAWAI_OPTIONS,
  detectJenisFromNipInput,
  buildMmpDefaultJabatan,
  isAutoMmpJabatan,
  type JenisPegawai,
} from "../../_lib";

const CATEGORY_STYLES: Record<
  JenisPegawai,
  {
    icon: typeof ShieldCheck;
    activeCard: string;
    iconBadge: string;
    dot: string;
  }
> = {
  PNS: {
    icon: ShieldCheck,
    activeCard:
      "bg-[var(--ds-accent-soft)]  border-[var(--ds-accent-soft-border)]  ring-2 ring-[var(--ds-accent-soft-border)]",
    iconBadge:
      "bg-[var(--ds-accent-soft)] text-[var(--ds-accent-fg)]   border-[var(--ds-accent-soft-border)] ",
    dot: "bg-[var(--ds-accent-solid)]",
  },
  PPPK: {
    icon: Briefcase,
    activeCard:
      "bg-[var(--ds-status-warning-bg)]  border-[var(--ds-status-warning-border)]  ring-2 ring-[var(--ds-status-warning-border)]",
    iconBadge:
      "bg-[var(--ds-status-warning-bg)] text-[var(--ds-status-warning-fg)]   border-[var(--ds-status-warning-border)] ",
    dot: "bg-[var(--ds-status-warning-fg)]",
  },
  MMP: {
    icon: UserCheck,
    activeCard:
      "bg-[var(--ds-status-success-bg)]  border-[var(--ds-status-success-border)]  ring-2 ring-[var(--ds-status-success-border)]",
    iconBadge:
      "bg-[var(--ds-status-success-bg)] text-[var(--ds-status-success-fg)]   border-[var(--ds-status-success-border)] ",
    dot: "bg-[var(--ds-status-success-fg)]",
  },
};

export default function EmployeeCreatePage() {
  const router = useRouter();
  const reducedMotion = useReducedMotion();
  const queryClient = useQueryClient();
  const { canWrite } = useRole();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [jenisPegawai, setJenisPegawai] = useState<JenisPegawai>("PNS");

  const [formData, setFormData] = useState({
    nip: "",
    nama_lengkap: "",
    jabatan: "",
    pangkat_golongan: "",
    satuan_kerja: "",
    resor: "",
    is_active: "1",
  });

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const handleJenisChange = (nextJenis: JenisPegawai) => {
    setJenisPegawai(nextJenis);
    setFormData((prev) => {
      if (nextJenis === "MMP") {
        return {
          ...prev,
          nip: "",
          pangkat_golongan: "",
          jabatan: isAutoMmpJabatan(prev.jabatan)
            ? buildMmpDefaultJabatan(prev.satuan_kerja)
            : prev.jabatan,
        };
      }

      const validPangkat =
        nextJenis === "PPPK" ? PANGKAT_PPPK_OPTIONS : PANGKAT_PNS_OPTIONS;
      return {
        ...prev,
        pangkat_golongan: validPangkat.includes(prev.pangkat_golongan)
          ? prev.pangkat_golongan
          : "",
        jabatan: isAutoMmpJabatan(prev.jabatan) ? "" : prev.jabatan,
      };
    });
  };

  const handleNipChange = (val: string) => {
    const detected = detectJenisFromNipInput(val);
    if (detected === "MMP") {
      handleJenisChange("MMP");
      return;
    }
    if (detected && detected !== jenisPegawai) {
      setJenisPegawai(detected);
      const validPangkat =
        detected === "PPPK" ? PANGKAT_PPPK_OPTIONS : PANGKAT_PNS_OPTIONS;
      setFormData((prev) => ({
        ...prev,
        nip: val,
        pangkat_golongan: validPangkat.includes(prev.pangkat_golongan)
          ? prev.pangkat_golongan
          : "",
      }));
      return;
    }
    setFormData((prev) => ({ ...prev, nip: val }));
  };

  const handleSatkerChange = (val: string) => {
    const isBalai = val.toLowerCase().includes("balai") || (val.toLowerCase().includes("samarinda") && !val.toLowerCase().includes("wilayah ii") && !val.toLowerCase().includes("skw ii") && !val.toLowerCase().includes("resor 05"));
    setFormData((prev) => ({
      ...prev,
      satuan_kerja: val,
      resor: isBalai ? "" : prev.resor,
      jabatan:
        jenisPegawai === "MMP" && isAutoMmpJabatan(prev.jabatan)
          ? buildMmpDefaultJabatan(val)
          : prev.jabatan,
    }));
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!validTypes.includes(file.type)) {
      setErrorMsg("Gagal: Format foto wajib berupa JPG, PNG, atau WEBP.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setErrorMsg("Gagal: Ukuran foto melampaui batas maksimal 10 MB.");
      return;
    }

    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setErrorMsg(null);
    setPhotoFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const clearPhoto = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPhotoFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = new FormData();
      payload.append("jenis_pegawai", jenisPegawai);
      if (jenisPegawai !== "MMP") {
        payload.append("nip", formData.nip.trim());
      }
      payload.append("nama_lengkap", formData.nama_lengkap.trim());
      if (formData.jabatan.trim()) payload.append("jabatan", formData.jabatan.trim());
      if (jenisPegawai !== "MMP" && formData.pangkat_golongan) {
        payload.append("pangkat_golongan", formData.pangkat_golongan);
      }
      if (formData.satuan_kerja) payload.append("satuan_kerja", formData.satuan_kerja);
      if (formData.resor) payload.append("resor", formData.resor);
      payload.append("is_active", formData.is_active);

      if (photoFile) {
        payload.append("foto", photoFile);
      }

      const { data } = await api.post("/kepegawaian/employees", payload);
      return data;
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      queryClient.invalidateQueries({ queryKey: ["kepegawaian-dashboard-stats"] });
      const createdNip = res?.data?.nip;
      toast.success(
        createdNip
          ? `Pegawai berhasil ditambahkan! Username: ${createdNip}`
          : "Pegawai berhasil ditambahkan!"
      );
      router.push("/kepegawaian/employees");
    },
    onError: (error: { response?: { data?: { message?: string } } }) => {
      setErrorMsg(
        error.response?.data?.message || "Koneksi terputus. Gagal menyimpan data ke server."
      );
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canWrite) return;
    mutation.mutate();
  };

  if (!canWrite) {
    return (
      <div data-module="kepegawaian" className="kpg-ui p-5 md:p-7">
        <div className="bg-[var(--ds-surface)] border border-[var(--ds-border-subtle)] rounded-2xl p-8 text-center space-y-4 shadow-2xs">
          <div className="w-12 h-12 rounded-2xl bg-[var(--ds-status-danger-bg)] text-[var(--ds-status-danger-fg)] border border-[var(--ds-status-danger-border)] flex items-center justify-center mx-auto">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-[var(--ds-fg)]">
              Akses Terbatas
            </h2>
            <p className="text-xs text-[var(--ds-fg-muted)] mt-1">
              Hanya Administrator Kepegawaian yang memiliki izin untuk menambahkan data personil baru.
            </p>
          </div>
          <Link
            href="/kepegawaian/employees"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--ds-fg)] text-[var(--ds-accent-on-solid)] text-xs font-bold"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Daftar Pegawai</span>
          </Link>
        </div>
      </div>
    );
  }

  const activePangkatOptions =
    jenisPegawai === "PPPK" ? PANGKAT_PPPK_OPTIONS : PANGKAT_PNS_OPTIONS;

  return (
    <div data-module="kepegawaian" className="kpg-ui w-full p-5 md:p-7 space-y-5 text-[var(--ds-fg)]">
      {/* 1. Unified Clean Enterprise Header Bar */}
      <div className="bg-[var(--ds-surface)] border border-[var(--ds-border-subtle)] rounded-2xl p-4 md:px-6 md:py-4 shadow-2xs flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-[var(--ds-accent-soft)] text-[var(--ds-accent-fg)] border border-[var(--ds-accent-soft-border)] flex items-center justify-center shrink-0">
            <UserPlus className="w-5 h-5" />
          </div>
          <div>

            <h1 className="text-xl md:text-2xl font-bold text-[var(--ds-fg)] tracking-tight">
              Tambah Pegawai Baru
            </h1>
            <p className="text-xs text-[var(--ds-fg-muted)] mt-0.5">
              Input data personil PNS, PPPK (P3K), atau Masyarakat Mitra Polhut (MMP).
            </p>
          </div>
        </div>

        <Link
          href="/kepegawaian/employees"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl kpg-secondary text-[var(--ds-fg)] text-xs font-bold transition-colors shrink-0 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Daftar</span>
        </Link>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-[var(--ds-status-danger-bg)] border border-[var(--ds-status-danger-border)] text-[var(--ds-status-danger-fg)] text-xs font-semibold flex items-center justify-between gap-3">
          <span>{errorMsg}</span>
          <button
            type="button"
            onClick={() => setErrorMsg(null)}
            className="p-1 rounded-lg hover:bg-[var(--ds-status-danger-bg)] cursor-pointer" aria-label="Tutup"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 2. Form Layout: Left (Pas Foto Card) + Right (Biodata Card) */}
      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start"
      >
        {/* Left Card: Pas Foto (4 cols) */}
        <div className="lg:col-span-4 bg-[var(--ds-surface)] border border-[var(--ds-border-subtle)] rounded-2xl p-5 shadow-2xs flex flex-col items-center text-center space-y-4">
          <div className="w-full flex items-center justify-between border-b border-[var(--ds-border-subtle)] pb-3">
            <div className="text-left">
              <h3 className="text-xs font-bold text-[var(--ds-fg)] uppercase tracking-wider">
                Pas Foto Pegawai
              </h3>
              <p className="text-xs text-[var(--ds-fg-muted)]">
                Opsional • JPG, PNG, WEBP (Maks 10 MB)
              </p>
            </div>
            <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-[var(--ds-surface-muted)] text-[var(--ds-fg-muted)]">
              Rasio 3:4
            </span>
          </div>

          {previewUrl ? (
            <motion.div
              initial={{ opacity: reducedMotion ? 1 : 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: reducedMotion ? 0 : 0.15, ease: "easeOut" }}
              className="w-full space-y-3"
            >
              <div className="relative aspect-3/4 w-full max-w-[210px] mx-auto rounded-2xl overflow-hidden border border-[var(--ds-border-subtle)] shadow-sm">
                <Image src={previewUrl} alt="Preview Foto Pegawai" fill className="object-cover" unoptimized />
              </div>
              <div className="flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl kpg-secondary text-[var(--ds-fg)] text-xs font-bold transition-colors cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Ganti Foto</span>
                </button>
                <button
                  type="button"
                  onClick={clearPhoto}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[var(--ds-status-danger-bg)] hover:bg-[var(--ds-status-danger-bg)] text-[var(--ds-status-danger-fg)] border border-[var(--ds-status-danger-border)] text-xs font-bold transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Hapus</span>
                </button>
              </div>
            </motion.div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="aspect-3/4 w-full max-w-[210px] mx-auto rounded-2xl border-2 border-dashed border-[var(--ds-border-subtle)] hover:border-[var(--ds-accent-soft-border)] hover:bg-[var(--ds-accent-soft)] flex flex-col items-center justify-center gap-3 p-4 cursor-pointer transition-colors group"
            >
              <div className="w-12 h-12 rounded-2xl bg-[var(--ds-surface-muted)] flex items-center justify-center group-hover:bg-[var(--ds-accent-soft)] transition-colors">
                <ImageIcon className="w-6 h-6 text-[var(--ds-fg-muted)] group-hover:text-[var(--ds-accent-fg)] transition-colors" />
              </div>
              <div>
                <p className="text-xs font-bold text-[var(--ds-fg)] group-hover:text-[var(--ds-accent-fg)] transition-colors">
                  Klik untuk Unggah Foto
                </p>
                <p className="text-xs text-[var(--ds-fg-muted)] mt-0.5">
                  Tersimpan otomatis ke penyimpanan S3 / RustFS
                </p>
              </div>
            </button>
          )}

          <input
            type="file"
            ref={fileInputRef}
            onChange={handlePhotoChange}
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
          />
        </div>

        {/* Right Card: Form Biodata & Penempatan (8 cols) */}
        <div className="lg:col-span-8 bg-[var(--ds-surface)] border border-[var(--ds-border-subtle)] rounded-2xl p-5 md:p-6 shadow-2xs space-y-6">
          {/* Kategori / Jenis Pegawai */}
          <div className="space-y-2.5">
            <label className="block text-xs font-bold text-[var(--ds-fg-muted)] uppercase tracking-wider">
              Kategori / Jenis Pegawai <span className="text-[var(--ds-status-danger-fg)]">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {JENIS_PEGAWAI_OPTIONS.map((opt) => {
                const isSelected = jenisPegawai === opt.value;
                const style = CATEGORY_STYLES[opt.value];
                const Icon = style.icon;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    aria-pressed={isSelected}

                    onClick={() => handleJenisChange(opt.value)}
                    className={`flex flex-col items-start p-3.5 rounded-xl border text-left transition-colors cursor-pointer ${
                      isSelected
                        ? style.activeCard
                        : "bg-[var(--ds-surface)]  border-[var(--ds-border-subtle)]  hover:border-[var(--ds-border-subtle)] "
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-1.5">
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-7 h-7 rounded-lg border flex items-center justify-center shrink-0 ${style.iconBadge}`}
                        >
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-xs font-bold text-[var(--ds-fg)]">
                          {opt.label}
                        </span>
                      </div>
                      <span
                        className={`w-2.5 h-2.5 rounded-full ${
                          isSelected ? style.dot : "bg-[var(--ds-surface-muted)] "
                        }`}
                      />
                    </div>
                    <span className="text-xs text-[var(--ds-fg-muted)] leading-snug">
                      {opt.desc}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <AnimatePresence initial={false}>
            {jenisPegawai === "MMP" && (
              <motion.div
                key="mmp-banner"
                initial={{ opacity: 0, height: 0, y: -6 }}
                animate={{ opacity: 1, height: "auto", y: 0 }}
                exit={{ opacity: 0, height: 0, y: -6 }}
                transition={{ duration: reducedMotion ? 0 : 0.15, ease: "easeInOut" }}
                className="overflow-hidden"
              >
                <div className="px-4 py-3 rounded-xl bg-[var(--ds-status-success-bg)] border border-[var(--ds-status-success-border)] text-[var(--ds-status-success-fg)] text-xs font-medium">
                  Personil <strong>MMP (Masyarakat Mitra Polhut)</strong> tidak memiliki NIP resmi ASN.
                  Sistem akan otomatis menerbitkan kode internal unik (contoh:{" "}
                  <code className="px-1.5 py-0.5 rounded bg-[var(--ds-status-success-bg)] font-mono font-bold">
                    MMP-xxx
                  </code>
                  ) yang sekaligus berfungsi sebagai <strong>Username Login Portal</strong>.
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Fields Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <AnimatePresence initial={false}>
              {jenisPegawai !== "MMP" && (
                <motion.div
                  key="nip-field"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: reducedMotion ? 0 : 0.15, ease: "easeInOut" }}
                  className="overflow-hidden"
                >
                  <InputGroup
                    label={jenisPegawai === "PPPK" ? "NIPPPK" : "NIP"}
                    value={formData.nip}
                    onChange={handleNipChange}
                    placeholder={
                      jenisPegawai === "PPPK"
                        ? "Contoh: 19930425 202421 2 053"
                        : "Contoh: 19800101 200501 1 001"
                    }
                    required
                  />
                </motion.div>
              )}
            </AnimatePresence>

            <div className={jenisPegawai === "MMP" ? "md:col-span-2" : ""}>
              <InputGroup
                label="Nama Lengkap (beserta gelar)"
                value={formData.nama_lengkap}
                onChange={(v: string) => setFormData({ ...formData, nama_lengkap: v })}
                placeholder="Contoh: Budi Santoso, S.Hut."
                required
              />
            </div>

            <div className={jenisPegawai === "MMP" ? "md:col-span-2" : ""}>
              <InputGroup
                label="Jabatan"
                value={formData.jabatan}
                onChange={(v: string) => setFormData({ ...formData, jabatan: v })}
                placeholder={
                  jenisPegawai === "MMP"
                    ? "Contoh: MMP Resor KSDA Wilayah..."
                    : "Contoh: Polisi Kehutanan Ahli Pertama"
                }
              />
            </div>

            <AnimatePresence initial={false}>
              {jenisPegawai !== "MMP" && (
                <motion.div
                  key="pangkat-field"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: reducedMotion ? 0 : 0.15, ease: "easeInOut" }}
                  className="overflow-hidden"
                >
                  <SelectGroup
                    label={
                      jenisPegawai === "PPPK"
                        ? "Golongan PPPK"
                        : "Pangkat / Golongan PNS"
                    }
                    value={formData.pangkat_golongan}
                    onChange={(v: string) => setFormData({ ...formData, pangkat_golongan: v })}
                    options={activePangkatOptions}
                    placeholder={
                      jenisPegawai === "PPPK"
                        ? "Pilih Golongan PPPK (I–XVII)"
                        : "Pilih Pangkat/Golongan PNS (I/a–IV/e)"
                    }
                  />
                </motion.div>
              )}
            </AnimatePresence>

            <div className="md:col-span-2">
              <SelectGroup
                label="Penempatan Satuan Kerja"
                value={formData.satuan_kerja}
                onChange={handleSatkerChange}
                options={SATUAN_KERJA}
                placeholder="Pilih Penempatan Satuan Kerja..."
              />
            </div>

            {(() => {
              const satker = (formData.satuan_kerja || "").toLowerCase();
              const isBalai = satker.includes("balai") || (satker.includes("samarinda") && !satker.includes("wilayah ii") && !satker.includes("skw ii") && !satker.includes("resor 05"));
              let availableResors = RESOR_OPTIONS;
              if (satker.includes("wilayah iii") || satker.includes("skw iii") || satker.includes("balikpapan") || satker.includes("seksi 3") || satker.includes("seksi iii")) {
                availableResors = RESOR_OPTIONS.filter((r) => r.skw === "SKW_3");
              } else if (satker.includes("wilayah ii") || satker.includes("skw ii") || satker.includes("tenggarong") || satker.includes("seksi 2") || satker.includes("seksi ii")) {
                availableResors = RESOR_OPTIONS.filter((r) => r.skw === "SKW_2");
              } else if (satker.includes("wilayah i") || satker.includes("skw i") || satker.includes("berau") || satker.includes("seksi 1") || satker.includes("seksi i")) {
                availableResors = RESOR_OPTIONS.filter((r) => r.skw === "SKW_1");
              }

              return (
                <div data-module="kepegawaian" className="kpg-ui md:col-span-2">
                  <label className="block text-xs font-bold text-[var(--ds-fg-muted)] uppercase tracking-wider mb-1.5">
                    Resor Penempatan Lapangan
                  </label>
                  <div className="relative">
                    <select
                      disabled={isBalai}
                      value={isBalai ? "" : formData.resor}
                      onChange={(e) => setFormData({ ...formData, resor: e.target.value })}
                      className={`w-full px-4 py-3 rounded-xl border outline-none text-xs font-semibold appearance-none cursor-pointer transition-colors ${
                        isBalai
                          ? "bg-[var(--ds-surface-muted)]  border-[var(--ds-border-subtle)]  text-[var(--ds-fg-muted)]  cursor-not-allowed"
                          : "bg-[var(--ds-surface)]  border-[var(--ds-border-subtle)]  text-[var(--ds-fg)]  focus:border-[var(--ds-accent-soft-border)] focus:bg-white "
                      }`}
                    >
                      {isBalai ? (
                        <option value="">Pegawai Balai (Bukan Resor Lapangan)</option>
                      ) : (
                        <>
                          <option value="">Kantor Seksi Wilayah (Bukan Resor)</option>
                          {availableResors.map((opt) => (
                            <option key={opt.code} value={opt.code}>
                              {opt.name}
                            </option>
                          ))}
                        </>
                      )}
                    </select>
                    <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--ds-fg-muted)] pointer-events-none" />
                  </div>
                </div>
              );
            })()}

            {/* Status Kepegawaian (Clean 2-button Segmented Toggle) */}
            <div className="md:col-span-2 space-y-1.5">
              <label className="block text-xs font-bold text-[var(--ds-fg-muted)] uppercase tracking-wider">
                Status Kepegawaian
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, is_active: "1" })}
                  aria-pressed={formData.is_active === "1"}
                  className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border text-xs font-bold transition-colors cursor-pointer ${
                    formData.is_active === "1"
                      ? "bg-[var(--ds-status-success-bg)]  border-[var(--ds-status-success-border)] text-[var(--ds-status-success-fg)] "
                      : "bg-[var(--ds-surface)]  border-[var(--ds-border-subtle)]  text-[var(--ds-fg-muted)]  hover:border-[var(--ds-border-subtle)]"
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-[var(--ds-status-success-fg)]" />
                  <span>Pegawai Aktif</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, is_active: "0" })}
                  aria-pressed={formData.is_active === "0"}
                  className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border text-xs font-bold transition-colors cursor-pointer ${
                    formData.is_active === "0"
                      ? "bg-[var(--ds-status-danger-bg)]  border-[var(--ds-status-danger-border)] text-[var(--ds-status-danger-fg)] "
                      : "bg-[var(--ds-surface)]  border-[var(--ds-border-subtle)]  text-[var(--ds-fg-muted)]  hover:border-[var(--ds-border-subtle)]"
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-[var(--ds-danger-solid)]" />
                  <span>Non-Aktif</span>
                </button>
              </div>
            </div>
          </div>

          {/* Action Footer */}
          <div className="pt-4 border-t border-[var(--ds-border-subtle)] flex flex-col xl:flex-row xl:items-center justify-between gap-3">
            <p className="text-xs font-medium text-[var(--ds-fg-muted)]">
              Kolom bertanda <span className="text-[var(--ds-status-danger-fg)] font-bold">*</span> wajib diisi.
            </p>
            <div className="flex items-center gap-2.5">
              <Link
                href="/kepegawaian/employees"
                className="px-4 py-2.5 rounded-xl kpg-secondary text-[var(--ds-fg)] text-xs font-bold transition-colors cursor-pointer"
              >
                Batal
              </Link>
              <button
                type="submit"
                disabled={mutation.isPending}
                className="inline-flex items-center gap-2 bg-[var(--ds-accent-solid)] hover:bg-[var(--ds-accent-hover)] text-[var(--ds-accent-on-solid)] px-5 py-2.5 rounded-xl text-xs font-bold transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>{mutation.isPending ? "Menyimpan..." : "Simpan Pegawai"}</span>
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}

interface InputGroupProps {
  label: string;
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  required?: boolean;
}

function InputGroup({ label, value, onChange, placeholder, required = false }: InputGroupProps) {
  const id = useId();
  return (
    <div  className="space-y-1.5">
      <label htmlFor={id} className="block text-xs font-bold text-[var(--ds-fg-muted)] uppercase tracking-wider">
        {label} {required && <span className="text-[var(--ds-status-danger-fg)]">*</span>}
      </label>
      <input
        id={id}
        required={required}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--ds-surface)] border border-[var(--ds-border-subtle)] focus:ring-2 focus:ring-[var(--ds-accent-soft-border)] focus:border-[var(--ds-accent-soft-border)] outline-none transition-colors font-semibold text-xs text-[var(--ds-fg)]"
        placeholder={placeholder}
      />
    </div>
  );
}

function SelectGroup({
  label,
  value,
  onChange,
  options,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (val: string) => void;
  options: string[];
  placeholder?: string;
}) {
  const id = useId();
  return (
    <div  className="space-y-1.5">
      <label htmlFor={id} className="block text-xs font-bold text-[var(--ds-fg-muted)] uppercase tracking-wider">
        {label}
      </label>
      <div className="relative">
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--ds-surface)] border border-[var(--ds-border-subtle)] focus:ring-2 focus:ring-[var(--ds-accent-soft-border)] focus:border-[var(--ds-accent-soft-border)] outline-none transition-colors font-semibold text-xs text-[var(--ds-fg)] appearance-none cursor-pointer"
        >
          <option value="">{placeholder || "Pilih..."}</option>
          {options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
        <div className="absolute inset-y-0 right-3.5 flex items-center pointer-events-none">
          <ChevronDown className="w-4 h-4 text-[var(--ds-fg-muted)]" />
        </div>
      </div>
    </div>
  );
}
