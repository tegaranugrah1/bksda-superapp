"use client";

import React, { useState } from "react";
import Link from "next/link";
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
  CheckCircle2,
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

import { TemplateType } from "./SuratDinasDocument";

export type TemplateCategory =
  | "all"
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
}

export const ALL_TEMPLATES: TemplateItem[] = [
  // 1. Korespondensi
  {
    id: "surat_dinas",
    name: "Surat Dinas",
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
    colorClass: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-900/50",
  },
  {
    id: "memorandum",
    name: "Memorandum",
    hal: 42,
    category: "korespondensi",
    categoryLabel: "Korespondensi",
    prefix: "M. .../K.18/TU/...",
    description: "Komunikasi kedinasan internal horizontal antar pejabat yang setingkat di lingkungan instansi.",
    icon: ScrollText,
    colorClass: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-900/50",
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
    colorClass: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-200 dark:border-sky-900/50",
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
    colorClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/50",
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
    colorClass: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900/50",
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
    colorClass: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-900/50",
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
    colorClass: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-200 dark:border-yellow-900/50",
  },
  {
    id: "surat_izin",
    name: "Surat Izin",
    hal: 75,
    category: "administrasi",
    categoryLabel: "Administrasi",
    prefix: "SI. .../K.18/TU/...",
    description: "Izin resmi pejabat kepada pegawai/pihak luar untuk melakukan kegiatan atau melintas kawasan.",
    icon: FileBadge,
    colorClass: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-200 dark:border-cyan-900/50",
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
    colorClass: "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-200 dark:border-violet-900/50",
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
    colorClass: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-900/50",
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
    colorClass: "bg-emerald-600/10 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-900/50",
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
    colorClass: "bg-blue-600/10 text-blue-700 dark:text-blue-400 border-blue-300 dark:border-blue-900/50",
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
    colorClass: "bg-zinc-500/10 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800",
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
    colorClass: "bg-teal-600/10 text-teal-700 dark:text-teal-400 border-teal-300 dark:border-teal-900/50",
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
    colorClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/50",
  },
];

const CATEGORY_TABS: { id: TemplateCategory; label: string; activeClass: string }[] = [
  { id: "all", label: `Semua (${ALL_TEMPLATES.length})`, activeClass: "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900" },
  { id: "korespondensi", label: `Korespondensi (${ALL_TEMPLATES.filter((t) => t.category === "korespondensi").length})`, activeClass: "bg-blue-600 text-white" },
  { id: "administrasi", label: `Administrasi & Tugas (${ALL_TEMPLATES.filter((t) => t.category === "administrasi").length})`, activeClass: "bg-emerald-600 text-white" },
  { id: "regulasi", label: `Regulatif & Telaah (${ALL_TEMPLATES.filter((t) => t.category === "regulasi").length})`, activeClass: "bg-amber-600 text-white" },
  { id: "kemitraan", label: `PKS & Apresiasi (${ALL_TEMPLATES.filter((t) => t.category === "kemitraan").length})`, activeClass: "bg-teal-600 text-white" },
];

interface TemplatePickerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectTemplate?: (templateId: string) => void;
}

export function TemplatePickerModal({ open, onOpenChange, onSelectTemplate }: TemplatePickerModalProps) {
  const [activeCategory, setActiveCategory] = useState<TemplateCategory>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredTemplates = ALL_TEMPLATES.filter((tpl) => {
    const matchCategory = activeCategory === "all" || tpl.category === activeCategory;
    const matchSearch =
      searchQuery.trim() === "" ||
      tpl.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tpl.prefix.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tpl.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCategory && matchSearch;
  });

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
      <DialogContent className="max-w-4xl sm:max-w-5xl p-6 bg-white dark:bg-zinc-950 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800">
        <DialogHeader className="pb-3 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
                  Katalog Tata Naskah Dinas Resmi
                  <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-400 font-semibold">
                    Permen Kehutanan 1/2025
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  20 format baku naskah dinas Kementerian Kehutanan & BKSDA Kalimantan Timur.
                </DialogDescription>
              </div>
            </div>

            <div className="w-full sm:w-64">
              <Input
                placeholder="Cari jenis naskah..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 text-xs bg-zinc-50 dark:bg-zinc-900"
              />
            </div>
          </div>

          {/* Filter Categories Tabs */}
          <div className="flex items-center gap-1.5 pt-3 overflow-x-auto">
            {CATEGORY_TABS.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(cat.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                  activeCategory === cat.id
                    ? cat.activeClass
                    : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </DialogHeader>

        {/* Grid Template Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 py-3 max-h-[60vh] overflow-y-auto pr-1">
          {filteredTemplates.map((tpl) => {
            const Icon = tpl.icon;
            return (
              <Link
                key={tpl.id}
                href={`/surat/keluar/dinas?template=${tpl.id}`}
                onClick={(e) => handleCardClick(e, tpl.id)}
                className="group relative flex flex-col justify-between p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white hover:bg-zinc-50 dark:bg-zinc-900/60 dark:hover:bg-zinc-900 hover:border-emerald-500/60 dark:hover:border-emerald-500/60 hover:shadow-md transition-all duration-200 text-left"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className={`p-1.5 rounded-lg border ${tpl.colorClass}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <span className="text-[10px] font-mono text-zinc-400 font-semibold">
                      Hal. {tpl.hal}
                    </span>
                  </div>

                  <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                    {tpl.name}
                  </h3>

                  <div className="text-[9.5px] font-mono text-zinc-500 dark:text-zinc-400 mt-1 mb-1.5 bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded inline-block">
                    {tpl.prefix}
                  </div>

                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-snug line-clamp-2">
                    {tpl.description}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-2.5 mt-2.5 border-t border-zinc-100 dark:border-zinc-800 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                  <span>Buat Dokumen</span>
                  <ArrowRight className="h-3.5 w-3.5 transform group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            );
          })}
        </div>

        {/* Footer Info */}
        <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-[11px] text-zinc-400">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
            <span>Format baku resmi Balai KSDA Kalimantan Timur</span>
          </div>
          <span className="text-[10.5px]">20 Jenis Format Tersedia</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
