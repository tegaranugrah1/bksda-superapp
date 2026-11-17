"use client";

import React, { useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import {
  FileText,
  Mail,
  Calendar,
  Award,
  FileCheck2,
  Megaphone,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  Send,
  FileSpreadsheet,
  KeyRound,
  FileBadge,
  PhoneCall,
  ScrollText,
  Scale,
  Gavel,
  BookOpen,
  ClipboardList,
  Handshake,
  Medal,
  Star,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useKepegawaianTabs } from "@/app/kepegawaian/_lib/useKepegawaianTabs";
import { KepegawaianTabContent } from "@/app/kepegawaian/_components/KepegawaianTabContent";
import { useDialogFocusReturn } from "@/components/ui/use-dialog-focus-return";

import { TemplateType } from "./SuratDinasDocument";

export type TemplateCategory =
  | "all"
  | "favorit"
  | "korespondensi"
  | "administrasi"
  | "regulasi"
  | "kemitraan";

export interface TemplateItem {
  id: TemplateType;
  name: string;
  hal: number;
  category: TemplateCategory;
  categoryLabel: string;
  prefix: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  colorClass: string;
  isFavorite?: boolean;
}

export const ALL_TEMPLATES: TemplateItem[] = [
  // 1. Korespondensi
  {
    id: "surat_dinas",
    name: "Surat Dinas",
    isFavorite: true,
    hal: 50,
    category: "korespondensi",
    categoryLabel: "Korespondensi",
    prefix: "S. .../K.18/TU/...",
    description: "Naskah dinas resmi keluar ke instansi eksternal, Pemda, kementerian, atau mitra kerja.",
    icon: Mail,
    colorClass: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900/50",
  },
  {
    id: "nota_dinas",
    name: "Nota Dinas",
    isFavorite: true,
    hal: 39,
    category: "korespondensi",
    categoryLabel: "Korespondensi",
    prefix: "ND. .../K.18/TU/...",
    description: "Komunikasi kedinasan internal vertikal/struktural antar pejabat/unit kerja BKSDA Kaltim.",
    icon: FileText,
    colorClass: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-900/50",
  },
  {
    id: "undangan",
    name: "Surat Undangan Internal",
    hal: 46,
    category: "korespondensi",
    categoryLabel: "Korespondensi",
    prefix: "UN. .../K.18/TU/...",
    description: "Panggilan resmi menghadiri rapat dinas, sosialisasi, atau koordinasi internal BKSDA.",
    icon: Calendar,
    colorClass: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900/50",
  },
  {
    id: "memorandum",
    name: "Memorandum",
    isFavorite: true,
    hal: 42,
    category: "korespondensi",
    categoryLabel: "Korespondensi",
    prefix: "M. .../K.18/TU/...",
    description: "Komunikasi kedinasan internal horizontal antar pejabat yang setingkat di lingkungan instansi.",
    icon: ScrollText,
    colorClass: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900/50",
  },
  {
    id: "surat_pengantar",
    name: "Surat Pengantar",
    hal: 66,
    category: "korespondensi",
    categoryLabel: "Korespondensi",
    prefix: "SP. .../K.18/TU/...",
    description: "Format tabel tanda terima pengiriman berkas, naskah dinas, dokumen fisik, atau barang.",
    icon: Send,
    colorClass: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900/50",
  },

  // 2. Administrasi & Operasional
  {
    id: "surat_keterangan",
    name: "Surat Keterangan",
    hal: 64,
    category: "administrasi",
    categoryLabel: "Administrasi",
    prefix: "SKET. .../K.18/TU/...",
    description: "Keterangan resmi pejabat mengenai status pegawai, fakta dinas, atau hal faktual kedinasan.",
    icon: Award,
    colorClass: "bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-200 dark:border-teal-900/50",
  },
  {
    id: "berita_acara",
    name: "Berita Acara",
    hal: 62,
    category: "administrasi",
    categoryLabel: "Administrasi",
    prefix: "BA. .../K.18/TU/...",
    description: "Bukti formal serah terima BMN, kejadian khusus, hasil pemeriksaan, atau kesepakatan dinas.",
    icon: FileCheck2,
    colorClass: "bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-200 dark:border-teal-900/50",
  },
  {
    id: "pengumuman",
    name: "Pengumuman",
    hal: 68,
    category: "administrasi",
    categoryLabel: "Administrasi",
    prefix: "PG. .../K.18/TU/...",
    description: "Pemberitahuan terbuka kepada pegawai atau masyarakat tentang hal penting yang mendesak.",
    icon: Megaphone,
    colorClass: "bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-200 dark:border-teal-900/50",
  },
  {
    id: "surat_pernyataan",
    name: "Surat Pernyataan",
    hal: 79,
    category: "administrasi",
    categoryLabel: "Administrasi",
    prefix: "SM. .../K.18/TU/...",
    description: "Pernyataan tertulis kebenaran suatu keadaan, kesanggupan, atau kepatuhan fakta kedinasan.",
    icon: FileSpreadsheet,
    colorClass: "bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-200 dark:border-teal-900/50",
  },
  {
    id: "surat_kuasa",
    name: "Surat Kuasa",
    hal: 59,
    category: "administrasi",
    categoryLabel: "Administrasi",
    prefix: "KS. .../K.18/TU/...",
    description: "Pelimpahan wewenang dari pejabat kepada pihak lain untuk bertindak atas namanya.",
    icon: KeyRound,
    colorClass: "bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-200 dark:border-teal-900/50",
  },
  {
    id: "surat_izin",
    name: "Surat Izin (SIMAKSI / Umum)",
    hal: 75,
    category: "administrasi",
    categoryLabel: "Administrasi",
    prefix: "SI. .../K.18/TU/...",
    description: "Izin resmi pejabat kepada pegawai/pihak luar untuk melakukan kegiatan atau melintas kawasan.",
    icon: FileBadge,
    colorClass: "bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-200 dark:border-teal-900/50",
  },
  {
    id: "surat_izin_cuti",
    name: "Surat Izin Cuti Resmi (TTE)",
    hal: 75,
    category: "administrasi",
    categoryLabel: "Izin & Kepegawaian",
    prefix: "SI..../K.18/TU/PEG.11.01/B/...",
    description: "Format resmi naskah penetapan izin cuti PNS Balai KSDA Kaltim bertanda tangan Kepala Balai.",
    icon: FileBadge,
    colorClass: "bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-200 dark:border-teal-900/50",
  },
  {
    id: "surat_panggilan",
    name: "Surat Panggilan",
    hal: 77,
    category: "administrasi",
    categoryLabel: "Administrasi",
    prefix: "SG. .../K.18/TU/...",
    description: "Panggilan dinas resmi kepada pegawai/pihak terkait untuk menghadap guna klarifikasi/pemeriksaan.",
    icon: PhoneCall,
    colorClass: "bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-200 dark:border-teal-900/50",
  },

  // 3. Naskah Regulatif & Telaah
  {
    id: "surat_edaran",
    name: "Surat Edaran",
    hal: 32,
    category: "regulasi",
    categoryLabel: "Regulasi & Kebijakan",
    prefix: "SE. .../K.18/TU/...",
    description: "Pemberitahuan petunjuk teknis atau penegasan pelaksanaan regulasi kehutanan.",
    icon: Scale,
    colorClass: "bg-amber-600/10 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-900/50",
  },
  {
    id: "instruksi",
    name: "Instruksi",
    hal: 30,
    category: "regulasi",
    categoryLabel: "Regulasi & Kebijakan",
    prefix: "INS. .../K.18/TU/...",
    description: "Perintah tertulis Kepala Balai kepada jajaran untuk melaksanakan kebijakan tertentu.",
    icon: Gavel,
    colorClass: "bg-amber-600/10 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-900/50",
  },
  {
    id: "keputusan",
    name: "Keputusan (SK Kepala Balai)",
    hal: 34,
    category: "regulasi",
    categoryLabel: "Regulasi & Kebijakan",
    prefix: "SK. .../K.18/TU/...",
    description: "Penetapan kebijakan resmi Kepala Balai (Menimbang, Mengingat, Memutuskan, Menetapkan).",
    icon: BookOpen,
    colorClass: "bg-amber-600/10 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-900/50",
  },
  {
    id: "telaah_staf",
    name: "Telaah Staf",
    hal: 72,
    category: "regulasi",
    categoryLabel: "Regulasi & Kebijakan",
    prefix: "TS. .../K.18/TU/...",
    description: "Kajian analisis staf berisi persoalan, fakta, analisis, kesimpulan, dan rekomendasi arahan pimpinan.",
    icon: ClipboardList,
    colorClass: "bg-amber-600/10 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-900/50",
  },
  {
    id: "laporan",
    name: "Laporan Kedinasan",
    hal: 70,
    category: "regulasi",
    categoryLabel: "Regulasi & Kebijakan",
    prefix: "LAP. .../K.18/TU/...",
    description: "Laporan pertanggungjawaban resmi pelaksanaan kegiatan tugas kedinasan dan capaian hasil.",
    icon: FileText,
    colorClass: "bg-amber-600/10 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-900/50",
  },

  // 4. Kemitraan & Apresiasi
  {
    id: "perjanjian",
    name: "Perjanjian Kerja Sama (PKS)",
    hal: 54,
    category: "kemitraan",
    categoryLabel: "Kemitraan",
    prefix: "PKS. .../K.18/TU/...",
    description: "Kesepakatan hukum antara BKSDA Kaltim dengan mitra/lembaga/masyarakat dalam negeri.",
    icon: Handshake,
    colorClass: "bg-amber-600/10 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-900/50",
  },
  {
    id: "piagam",
    name: "Piagam Penghargaan",
    hal: 81,
    category: "kemitraan",
    categoryLabel: "Apresiasi",
    prefix: "PGM. .../K.18/TU/...",
    description: "Piagam penghargaan resmi atas jasa, dedikasi, atau prestasi di bidang konservasi alam.",
    icon: Medal,
    colorClass: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-900/50",
  },
  {
    id: "sertifikat",
    name: "Sertifikat",
    hal: 83,
    category: "kemitraan",
    categoryLabel: "Apresiasi",
    prefix: "SRT. .../K.18/TU/...",
    description: "Tanda bukti kelulusan pelatihan, workshop, bimtek, atau partisipasi kegiatan konservasi.",
    icon: Award,
    colorClass: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-900/50",
  },
];

const CATEGORY_KEYS: readonly TemplateCategory[] = [
  "all",
  "favorit",
  "korespondensi",
  "administrasi",
  "regulasi",
  "kemitraan",
];

const CATEGORY_TABS: { id: TemplateCategory; label: string }[] = [
  { id: "all", label: `Semua (${ALL_TEMPLATES.length})` },
  { id: "favorit", label: "⭐ Favorit (3)" },
  { id: "korespondensi", label: `Korespondensi (${ALL_TEMPLATES.filter((t) => t.category === "korespondensi").length})` },
  { id: "administrasi", label: `Administrasi & Tugas (${ALL_TEMPLATES.filter((t) => t.category === "administrasi").length})` },
  { id: "regulasi", label: `Regulatif & Telaah (${ALL_TEMPLATES.filter((t) => t.category === "regulasi").length})` },
  { id: "kemitraan", label: `PKS & Apresiasi (${ALL_TEMPLATES.filter((t) => t.category === "kemitraan").length})` },
];

interface TemplatePickerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectTemplate?: (templateId: string) => void;
}

export function TemplatePickerModal({ open, onOpenChange, onSelectTemplate }: TemplatePickerModalProps) {
  const reducedMotion = useReducedMotion();
  const [activeCategory, setActiveCategory] = useState<TemplateCategory>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const focusReturn = useDialogFocusReturn();
  const tabs = useKepegawaianTabs(activeCategory, "Filter kategori tata naskah dinas");

  const filteredTemplates = React.useMemo(() => {
    let list = ALL_TEMPLATES.filter((tpl) => {
      const matchCategory =
        activeCategory === "all"
          ? true
          : activeCategory === "favorit"
          ? Boolean(tpl.isFavorite)
          : tpl.category === activeCategory;
      const matchSearch =
        searchQuery.trim() === "" ||
        tpl.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tpl.prefix.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tpl.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCategory && matchSearch;
    });

    if (activeCategory === "all" && searchQuery.trim() === "") {
      list = [...list].sort((a, b) => (b.isFavorite ? 1 : 0) - (a.isFavorite ? 1 : 0));
    }
    return list;
  }, [activeCategory, searchQuery]);

  const handleCardClick = (e: React.MouseEvent, id: string) => {
    if (onSelectTemplate) {
      e.preventDefault();
      onSelectTemplate(id);
      onOpenChange(false);
    } else {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        data-module="persuratan"
        {...focusReturn}
        className="psr-ui max-w-4xl sm:max-w-5xl p-6 bg-[var(--ds-surface)] rounded-3xl shadow-lg border border-slate-200/80 dark:border-zinc-800"
      >
        <DialogHeader className="pb-4 border-b border-slate-200/70 dark:border-zinc-800 sm:pr-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="kpg-support-icon w-10 h-10 rounded-lg bg-[var(--ds-accent-soft)] text-[var(--ds-accent-fg)] border border-[var(--ds-accent-soft-border)] flex items-center justify-center shrink-0">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold text-[var(--ds-fg)] flex items-center gap-2 flex-wrap">
                  Katalog Tata Naskah Dinas Resmi
                  <Badge variant="outline" className="text-xs bg-[var(--ds-accent-soft)] text-[var(--ds-accent-fg)] border-[var(--ds-accent-soft-border)] font-semibold rounded-lg">
                    Permen Kehutanan 1/2025
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-xs text-[var(--ds-fg-muted)] mt-1">
                  20 format baku naskah dinas Kementerian Kehutanan &amp; BKSDA Kalimantan Timur.
                </DialogDescription>
              </div>
            </div>

            <div className="w-full sm:w-64">
              <Input
                placeholder="Cari jenis naskah..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 text-xs rounded-lg"
              />
            </div>
          </div>

          {/* Filter Categories Tabs */}
          <div
            {...tabs.tabListProps}
            className="kpg-pill-tabs flex items-center gap-1 pt-2 p-1 rounded-lg overflow-x-auto"
          >
            {CATEGORY_TABS.map((cat) => {
              const isActive = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  {...tabs.tabProps(cat.id)}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`relative px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer select-none ${
                    isActive
                      ? "text-[var(--ds-accent-on-solid)]"
                      : "text-[var(--ds-fg-muted)] hover:text-[var(--ds-fg)] hover:bg-[var(--ds-surface-muted)]"
                  }`}
                >
                  {isActive && (
                    <motion.span
                      layoutId="activeTemplatePickerTab"
                      className="absolute inset-0 bg-[var(--ds-accent-solid)] rounded-lg"
                      transition={{ type: "spring", stiffness: 420, damping: 32 }}
                    />
                  )}
                  <span className="relative z-10">{cat.label}</span>
                </button>
              );
            })}
          </div>
        </DialogHeader>

        {/* Grid Template Cards */}
        <div {...tabs.panelProps}>
          <KepegawaianTabContent key={activeCategory}>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 py-3 max-h-[60vh] overflow-y-auto pr-1">
            {filteredTemplates.map((tpl) => {
              const Icon = tpl.icon;
              return (
                <motion.div
                  key={tpl.id}
                  whileHover={reducedMotion ? undefined : { y: -2 }}
                  whileTap={reducedMotion ? undefined : { scale: 0.98 }}
                  transition={{ duration: 0.15, ease: "easeOut" }}
                  className="h-full"
                >
                  <Link
                    href={`/surat/keluar/dinas?template=${tpl.id}`}
                    onClick={(e) => handleCardClick(e, tpl.id)}
                    className="kpg-card group relative flex flex-col justify-between p-4 rounded-3xl border border-slate-200/80 dark:border-zinc-800 bg-[var(--ds-surface)] shadow-xs hover:bg-[var(--ds-surface-muted)] hover:border-[var(--ds-accent-soft-border)] transition-all duration-150 text-left h-full"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <div className={`p-2 rounded-lg border ${tpl.colorClass}`}>
                            <Icon className="h-4 w-4" />
                          </div>
                          {tpl.isFavorite && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-300 dark:border-amber-800">
                              <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />
                              Favorit
                            </span>
                          )}
                        </div>
                        <span className="text-xs font-mono text-[var(--ds-fg-muted)] font-semibold">
                          Hal. {tpl.hal}
                        </span>
                      </div>

                      <h3 className="text-sm font-bold text-[var(--ds-fg)] group-hover:text-[var(--ds-accent-fg)] transition-colors">
                        {tpl.name}
                      </h3>

                      <div className="text-xs font-mono text-[var(--ds-fg-muted)] mt-1 mb-2 bg-[var(--ds-surface-muted)] px-2 py-1 rounded-lg inline-block">
                        {tpl.prefix}
                      </div>

                      <p className="text-xs text-[var(--ds-fg-muted)] leading-snug line-clamp-2">
                        {tpl.description}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-200/70 dark:border-zinc-800 text-xs font-semibold text-[var(--ds-accent-fg)]">
                      <span>Buat Dokumen</span>
                      <ArrowRight className="h-3.5 w-3.5 transform group-hover:translate-x-1 transition-transform" />
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
          </KepegawaianTabContent>
        </div>

        {/* Footer Info */}
        <div className="pt-3 border-t border-slate-200/70 dark:border-zinc-800 flex items-center justify-between text-xs text-[var(--ds-fg-muted)]">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-3.5 w-3.5 text-[var(--ds-accent-fg)]" />
            <span>Format baku resmi Balai KSDA Kalimantan Timur</span>
          </div>
          <span className="text-xs">20 Jenis Format Tersedia</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
