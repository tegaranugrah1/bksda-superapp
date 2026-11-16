"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useId, useState } from "react";
import { useAdminInboxLive } from "@/hooks/useAdminInboxLive";
import {
  Package,
  Wrench,
  HandCoins,
  ShieldAlert,
  ShieldCheck,
  TrendingUp,
  BarChart3,
  Calendar,
  MapPin,
  AlertTriangle,
  Car,
  FileText,
  ChevronRight,
  ArrowRight,
  Activity,
  Laptop,
} from "lucide-react";
import { api } from "@/lib/api";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { formatRupiah } from "@/app/bmn/_lib/asset-utils";
import { useRole } from "@/hooks/useRole";
import { motion } from "framer-motion";

interface JenisData { jenis_bmn: string; total: number; total_nilai: number }
interface LokasiData { lokasi_ruang: string; total: number }

const quickActions = [
  { href: "/bmn/assets", label: "Data Aset", description: "Master inventaris", icon: Package, permission: "bmn.view" },
  { href: "/bmn/loans", label: "Peminjaman", description: "Pinjam pakai unit", icon: HandCoins, permission: "bmn.view" },
  { href: "/bmn/maintenances", label: "Pemeliharaan", description: "Servis & perawatan", icon: Wrench, permission: "bmn.view" },
  { href: "/bmn/reports", label: "Dokumen / Laporan", description: "BAST, DBR & KIB", icon: FileText, permission: "bmn.document.history.view" },
];

interface DashboardData {
  total_asset: number;
  total_asset_value: number;
  active_loans_count?: number;
  overdue_loans?: { id: string; asset_id: string; asset: string | null; borrower: string | null; due_date: string | null }[];
  asset_by_condition: Record<string, number>;
  asset_by_jenis: JenisData[];
  asset_by_lokasi: LokasiData[];
  recent_transactions: { type: string; id: number | string; asset: string; tanggal: string; status?: string; borrower?: string; keterangan?: string }[];
  stnk_alerts?: {
    expired: { id: string; nama_barang: string; merk: string; no_polisi: string; tanggal_pajak_stnk: string }[];
    expiring_soon: { id: string; nama_barang: string; merk: string; no_polisi: string; tanggal_pajak_stnk: string }[];
    plat_expired: { id: string; nama_barang: string; merk: string; no_polisi: string; tanggal_ganti_plat: string }[];
    plat_expiring_soon?: { id: string; nama_barang: string; merk: string; no_polisi: string; tanggal_ganti_plat: string }[];
  };
}

function KpiCard({
  label,
  value,
  unit,
  sub,
  icon,
  footerLeft,
  footerRight,
  color = "emerald",
}: {
  label: string;
  value: string;
  unit?: string;
  sub: React.ReactNode;
  icon: React.ReactNode;
  footerLeft: React.ReactNode;
  footerRight: React.ReactNode;
  color?: "emerald" | "teal" | "slate" | "rose";
}) {
  const colorStyles = {
    emerald: {
      badge: "bg-[var(--ds-accent-soft)] text-[var(--ds-accent-fg)] border-[var(--ds-accent-soft-border)]",
      iconBox: "bg-[var(--ds-accent-soft)] border-[var(--ds-accent-soft-border)] text-[var(--ds-accent-fg)]",
      rightText: "text-[var(--ds-accent-fg)]",
      labelColor: "text-[var(--ds-fg-muted)]",
    },
    teal: {
      badge: "bg-[var(--ds-accent-soft)] text-[var(--ds-accent-fg)] border-[var(--ds-accent-soft-border)]",
      iconBox: "bg-[var(--ds-accent-soft)] border-[var(--ds-accent-soft-border)] text-[var(--ds-accent-fg)]",
      rightText: "text-[var(--ds-accent-fg)]",
      labelColor: "text-[var(--ds-fg-muted)]",
    },
    slate: {
      badge: "bg-[var(--ds-surface-muted)] text-[var(--ds-fg-muted)] border-slate-200/80 dark:border-zinc-800",
      iconBox: "bg-[var(--ds-surface-muted)] border-slate-200/80 dark:border-zinc-800 text-[var(--ds-fg-muted)]",
      rightText: "text-[var(--ds-accent-fg)]",
      labelColor: "text-[var(--ds-fg-muted)]",
    },
    rose: {
      badge: "bg-[var(--ds-status-danger-bg)] text-[var(--ds-status-danger-fg)] border-[var(--ds-status-danger-border)]",
      iconBox: "bg-[var(--ds-status-danger-bg)] border-[var(--ds-status-danger-border)] text-[var(--ds-status-danger-fg)]",
      rightText: "text-[var(--ds-status-danger-fg)]",
      labelColor: "text-[var(--ds-status-danger-fg)]",
    },
  };

  const style = colorStyles[color];

  return (
    <div
      className={cn(
        "bmn-metric-card relative overflow-hidden bg-[var(--ds-surface)] border rounded-3xl p-4 shadow-xs transition-colors",
        color === "rose"
          ? "border-[var(--ds-status-danger-border)] hover:border-rose-300 dark:hover:border-rose-700"
          : "border-slate-200/80 dark:border-zinc-800 hover:border-[var(--ds-accent-soft-border)]"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="overflow-hidden">
          <span className={cn("text-xs font-bold tracking-wider uppercase", style.labelColor)}>
            {label}
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            <h3
              className={cn(
                "font-extrabold tracking-tight truncate tabular-nums",
                label === "NILAI PEROLEHAN" ? "text-xl xl:text-2xl" : "text-2xl",
                color === "rose" ? "text-[var(--ds-status-danger-fg)]" : "text-[var(--ds-fg)]"
              )}
            >
              {value}
            </h3>
            {unit && (
              <span className={cn("text-xs font-semibold px-2 py-1 rounded-full border shrink-0", style.badge)}>
                {unit}
              </span>
            )}
          </div>
          <div className="text-xs text-[var(--ds-fg-muted)] mt-1 font-medium flex items-center gap-2">
            {sub}
          </div>
        </div>
        <div className={cn("w-11 h-11 shrink-0 rounded-lg border flex items-center justify-center", style.iconBox)}>
          {icon}
        </div>
      </div>
      <div className="mt-4 pt-3 border-t border-slate-200/70 dark:border-zinc-800 flex items-center justify-between text-xs text-[var(--ds-fg-muted)] font-medium">
        <span>{footerLeft}</span>
        <span className={cn("font-semibold", style.rightText)}>{footerRight}</span>
      </div>
    </div>
  );
}

export default function BmnDashboardPage() {
  const queryClient = useQueryClient();
  const { hasPermission } = useRole();
  const canViewReports = hasPermission("bmn.document.history.view");
  const visibleQuickActions = quickActions.filter((item) => hasPermission(item.permission));
  useAdminInboxLive("bmn", () => {
    void queryClient.invalidateQueries({ queryKey: ["bmn-dashboard-stats"] });
  });
  const highlightId = useId();
  const [hoveredAction, setHoveredAction] = useState<string | null>(null);
  const [focusedAction, setFocusedAction] = useState<string | null>(null);
  const highlightedAction = focusedAction ?? hoveredAction;
  const { data, isLoading } = useQuery<DashboardData>({
    queryKey: ["bmn-dashboard-stats"],
    queryFn: async () => (await api.get("/bmn/dashboard/stats")).data,
  });

  const totalAssets = data?.total_asset || 0;
  const conditionStats = data?.asset_by_condition || {};
  const baik = conditionStats["Baik"] || 0;
  const rusakRingan = conditionStats["Rusak Ringan"] || 0;
  const rusakBerat = conditionStats["Rusak Berat"] || 0;
  const baikPct = totalAssets > 0 ? (baik / totalAssets) * 100 : 0;
  const rusakRinganPct = totalAssets > 0 ? (rusakRingan / totalAssets) * 100 : 0;
  const rusakBeratPct = totalAssets > 0 ? (rusakBerat / totalAssets) * 100 : 0;
  const activeLoans = data?.active_loans_count ?? 0;
  const totalAlerts =
    (data?.stnk_alerts?.expired?.length || 0) +
    (data?.stnk_alerts?.expiring_soon?.length || 0) +
    (data?.stnk_alerts?.plat_expired?.length || 0) +
    (data?.stnk_alerts?.plat_expiring_soon?.length || 0) +
    (data?.overdue_loans?.length || 0);

  if (isLoading) {
    return (
      <div className="p-6 md:p-8 space-y-6 animate-pulse motion-reduce:animate-none max-w-[1600px] mx-auto" role="status" aria-label="Memuat dashboard BMN">
        <div className="h-20 bg-[var(--ds-surface-muted)] rounded-3xl" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-32 bg-[var(--ds-surface-muted)] rounded-3xl" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {[1, 2, 3].map(i => <div key={i} className="lg:col-span-4 h-96 bg-[var(--ds-surface-muted)] rounded-3xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div data-module="bmn" className="bmn-dashboard-enter max-w-[1600px] w-full mx-auto p-4 sm:p-6 space-y-6 font-sans">
      {/* 1. Unified Clean Enterprise Header Bar (Patokan: Dashboard Kepegawaian) */}
      <div className="bg-[var(--ds-surface)] border border-slate-200/80 dark:border-zinc-800 rounded-3xl p-4 md:px-6 md:py-4 shadow-xs flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-[var(--ds-accent-soft)] text-[var(--ds-accent-fg)] border border-[var(--ds-accent-soft-border)] flex items-center justify-center shrink-0">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-[var(--ds-fg)] tracking-tight">
              Dashboard BMN
            </h1>
            <p className="text-xs text-[var(--ds-fg-muted)] mt-1">
              Ikhtisar pengelolaan Barang Milik Negara BKSDA Kalimantan Timur.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <Link
            href="/bmn/assets"
            className="bmn-motion-action bmn-hover-link flex items-center gap-2 px-4 py-2 bg-[var(--ds-surface-raised)] hover:bg-[var(--ds-surface-muted)] border border-[var(--ds-border-subtle)] hover:border-[var(--ds-border-control)] text-[var(--ds-secondary-fg)] font-bold text-xs rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            <Package className="w-4 h-4 text-[var(--ds-accent-fg)]" />
            <span>Daftar Aset</span>
          </Link>
          <Link
            href="/bmn/loans"
            className="bmn-motion-action bmn-hover-link flex items-center gap-2 px-4 py-2 bg-[var(--ds-accent-solid)] hover:bg-[var(--ds-accent-hover)] active:bg-[var(--ds-accent-active)] text-[color:var(--ds-accent-on-solid)] font-bold text-xs rounded-lg transition-colors cursor-pointer shadow-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ds-accent-fg)]"
          >
            <HandCoins className="w-4 h-4" />
            <span>Peminjaman Aset</span>
          </Link>
        </div>
      </div>

      {/* TOP KPI SUMMARY CARDS */}
      <section
        aria-label="Ringkasan Utama Aset"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {/* Card 1: TOTAL ASET */}
        <KpiCard
          label="TOTAL ASET"
          value={totalAssets.toLocaleString("id-ID")}
          unit="Unit"
          sub={
            <>
              <span className="w-2 h-2 rounded-full bg-[var(--ds-accent-solid)]" />
              <span>{baik.toLocaleString("id-ID")} kondisi baik</span>
            </>
          }
          icon={<Package className="w-5 h-5" />}
          footerLeft="Tercatat aktif di SIMAK-BMN"
          footerRight={totalAssets > 0 ? `${baikPct.toFixed(1)}% berkondisi baik` : "Belum Ada Data"}
          color="emerald"
        />

        {/* Card 2: NILAI PEROLEHAN */}
        <KpiCard
          label="NILAI PEROLEHAN"
          value={formatRupiah(data?.total_asset_value || 0)}
          sub={
            <>
              <span className="w-2 h-2 rounded-full bg-[var(--ds-accent-solid)]" />
              <span>Total akumulasi</span>
            </>
          }
          icon={<TrendingUp className="w-5 h-5" />}
          footerLeft="Akumulasi nilai perolehan"
          footerRight={`${data?.asset_by_jenis?.length || 0} Kategori BMN`}
          color="teal"
        />

        {/* Card 3: SEDANG DIPINJAM */}
        <KpiCard
          label="SEDANG DIPINJAM"
          value={activeLoans > 0 ? activeLoans.toLocaleString("id-ID") : "-"}
          unit={activeLoans > 0 ? "Unit Aktif" : "Nol Pinjaman"}
          sub={
            <Link href="/bmn/loans" className="text-xs text-[var(--ds-accent-fg)] hover:underline font-semibold flex items-center gap-1">
              Lihat peminjaman
              <ChevronRight className="w-4 h-4" />
            </Link>
          }
          icon={<HandCoins className="w-5 h-5" />}
          footerLeft={activeLoans > 0 ? "Unit keluar balai" : "Semua unit standby di balai"}
          footerRight={activeLoans > 0 ? `${activeLoans} Sedang Dipinjam` : "Tersedia 100%"}
          color={activeLoans > 0 ? "emerald" : "slate"}
        />

        {/* Card 4: RUSAK BERAT */}
        <KpiCard
          label="RUSAK BERAT"
          value={rusakBerat.toLocaleString("id-ID")}
          unit="Unit"
          sub={
            <span className="text-xs text-[var(--ds-status-danger-fg)] font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-[var(--ds-status-danger-fg)] shrink-0" />
              Perlu perhatian
            </span>
          }
          icon={<ShieldAlert className="w-5 h-5" />}
          footerLeft="Menunggu usulan lelang"
          footerRight={rusakBerat > 0 ? `${rusakBeratPct.toFixed(1)}% dari Total` : "Nol Rusak"}
          color="rose"
        />
      </section>

      {/* BENTO GRID ROW 1: Kondisi Aset, Peringatan STNK, & Distribusi per Jenis */}
      <section aria-label="Grafik Kondisi dan Peringatan Aset" className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Card: Kondisi Aset BMN (Col 4) */}
        <div className="lg:col-span-4 bg-[var(--ds-surface)] border border-slate-200/80 dark:border-zinc-800 rounded-3xl p-4 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-200/70 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-[var(--ds-accent-soft)] rounded-lg text-[var(--ds-accent-fg)]">
                  <BarChart3 className="w-4 h-4" />
                </div>
                <h2 className="font-bold text-[var(--ds-fg)] text-sm tracking-tight">Kondisi Aset BMN</h2>
              </div>
              <span className="text-xs text-[var(--ds-fg-muted)] font-semibold tabular-nums">{totalAssets.toLocaleString("id-ID")} Aset</span>
            </div>

            {/* Persentase aset berkondisi baik */}
            <div className="mt-4">
              <p className="text-xs font-bold tracking-wider text-[var(--ds-fg-muted)] uppercase">Aset berkondisi baik</p>
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 mt-1">
                <span className="text-2xl font-extrabold text-[var(--ds-fg)] tracking-tight tabular-nums">
                  {totalAssets > 0 ? `${baikPct.toFixed(1)}%` : "—"}
                </span>
                <span className="text-xs font-semibold text-[var(--ds-fg-muted)] tabular-nums">
                  {baik.toLocaleString("id-ID")} dari {totalAssets.toLocaleString("id-ID")} unit
                </span>
              </div>
            </div>

            {/* Multi-segment Progress Bar */}
            <div className="mt-4 space-y-2">
              <div className="bmn-chart-enter h-3 w-full bg-[var(--ds-surface-muted)] rounded-full overflow-hidden flex">
                {baikPct > 0 && (
                  <motion.div
                    layout="size"
                    initial={false}
                    style={{ width: `${baikPct}%`, originX: 0 }}
                    transition={{ layout: { duration: 0.6, ease: "easeOut" } }}
                    className="bg-[var(--ds-accent-solid)] h-full"
                    title={`Baik: ${baikPct.toFixed(1)}%`}
                  />
                )}
                {rusakRinganPct > 0 && (
                  <motion.div
                    layout="size"
                    initial={false}
                    style={{ width: `${rusakRinganPct}%`, originX: 0 }}
                    transition={{ layout: { duration: 0.6, ease: "easeOut" } }}
                    className="bg-amber-400 h-full"
                    title={`Rusak Ringan: ${rusakRinganPct.toFixed(1)}%`}
                  />
                )}
                {rusakBeratPct > 0 && (
                  <motion.div
                    layout="size"
                    initial={false}
                    style={{ width: `${rusakBeratPct}%`, originX: 0 }}
                    transition={{ layout: { duration: 0.6, ease: "easeOut" } }}
                    className="bg-rose-500 h-full"
                    title={`Rusak Berat: ${rusakBeratPct.toFixed(1)}%`}
                  />
                )}
              </div>
              <div className="flex justify-between text-xs text-[var(--ds-fg-muted)] font-medium">
                <span>0%</span>
                <span className="text-[var(--ds-fg-muted)] font-semibold">Distribusi kondisi aset</span>
                <span>100%</span>
              </div>
            </div>

            {/* Condition Details List */}
            <div className="mt-6 space-y-3">
              {/* Baik */}
              <div className="p-3 rounded-lg bg-[var(--ds-surface-muted)] border border-slate-200/80 dark:border-zinc-800 flex items-center justify-between hover:bg-[var(--ds-accent-soft)] transition-colors">
                <div className="flex items-center gap-3">
                  <span className="w-3 h-3 rounded-full bg-[var(--ds-accent-solid)] shrink-0" />
                  <div>
                    <h4 className="text-xs font-bold text-[var(--ds-fg)]">Baik</h4>
                    <p className="text-xs text-[var(--ds-fg-muted)]">Siap digunakan untuk operasional</p>
                  </div>
                </div>
                <div className="text-right flex items-center gap-2">
                  <span className="text-xs font-extrabold text-[var(--ds-fg)] tabular-nums">{baik.toLocaleString("id-ID")} Unit</span>
                  <span className="text-xs font-bold px-2 py-1 rounded-lg bg-[var(--ds-accent-soft)] text-[var(--ds-accent-fg)] border border-[var(--ds-accent-soft-border)] tabular-nums">
                    {baikPct.toFixed(1)}%
                  </span>
                </div>
              </div>

              {/* Rusak Ringan */}
              <div className="p-3 rounded-lg bg-[var(--ds-surface-muted)] border border-slate-200/80 dark:border-zinc-800 flex items-center justify-between hover:bg-[var(--ds-status-warning-bg)] transition-colors">
                <div className="flex items-center gap-3">
                  <span className="w-3 h-3 rounded-full bg-amber-400 shrink-0" />
                  <div>
                    <h4 className="text-xs font-bold text-[var(--ds-fg)]">Rusak Ringan</h4>
                    <p className="text-xs text-[var(--ds-fg-muted)]">Perlu perbaikan atau servis berkala</p>
                  </div>
                </div>
                <div className="text-right flex items-center gap-2">
                  <span className="text-xs font-extrabold text-[var(--ds-fg)] tabular-nums">{rusakRingan.toLocaleString("id-ID")} Unit</span>
                  <span className="text-xs font-bold px-2 py-1 rounded-lg bg-[var(--ds-status-warning-bg)] text-[var(--ds-status-warning-fg)] border border-[var(--ds-status-warning-border)] tabular-nums">
                    {rusakRinganPct.toFixed(1)}%
                  </span>
                </div>
              </div>

              {/* Rusak Berat */}
              <div className="p-3 rounded-lg bg-[var(--ds-surface-muted)] border border-slate-200/80 dark:border-zinc-800 flex items-center justify-between hover:bg-[var(--ds-status-danger-bg)] transition-colors">
                <div className="flex items-center gap-3">
                  <span className="w-3 h-3 rounded-full bg-rose-500 shrink-0" />
                  <div>
                    <h4 className="text-xs font-bold text-[var(--ds-fg)]">Rusak Berat</h4>
                    <p className="text-xs text-[var(--ds-fg-muted)]">Usulan penghapusan / lelang BMN</p>
                  </div>
                </div>
                <div className="text-right flex items-center gap-2">
                  <span className="text-xs font-extrabold text-[var(--ds-fg)] tabular-nums">{rusakBerat.toLocaleString("id-ID")} Unit</span>
                  <span className="text-xs font-bold px-2 py-1 rounded-lg bg-[var(--ds-status-danger-bg)] text-[var(--ds-status-danger-fg)] border border-[var(--ds-status-danger-border)] tabular-nums">
                    {rusakBeratPct.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-200/70 dark:border-zinc-800 flex items-center justify-between text-xs text-[var(--ds-fg-muted)] font-medium">
            <span>Kategori Kemenkeu</span>
            <Link href="/bmn/reports" className="text-[var(--ds-accent-fg)] hover:underline font-semibold">
              Unduh Laporan Mutasi
            </Link>
          </div>
        </div>

        {/* Card: Peringatan STNK & Plat (Col 4) */}
        <div className="lg:col-span-4 bg-[var(--ds-surface)] border border-slate-200/80 dark:border-zinc-800 rounded-3xl p-4 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-200/70 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-[var(--ds-status-danger-bg)] rounded-lg text-[var(--ds-status-danger-fg)]">
                  <ShieldAlert className="w-4 h-4" />
                </div>
                <h2 className="font-bold text-[var(--ds-fg)] text-sm tracking-tight">Peringatan STNK & Plat</h2>
              </div>
              {totalAlerts > 0 ? (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-bold bg-[var(--ds-status-danger-bg)] text-[var(--ds-status-danger-fg)] border border-[var(--ds-status-danger-border)] tabular-nums">
                  {totalAlerts} Perlu Perhatian
                </span>
              ) : (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-bold bg-[var(--ds-accent-soft)] text-[var(--ds-accent-fg)] border border-[var(--ds-accent-soft-border)]">
                  Terkendali
                </span>
              )}
            </div>

            {/* Vehicle Warnings Scrollable List */}
            <div className="mt-4 space-y-3 max-h-[340px] overflow-y-auto p-1 pt-2 custom-scrollbar">
              {totalAlerts > 0 ? (
                <>
                  {data?.stnk_alerts?.expired.map((v) => (
                    <div key={`exp-${v.id}`}>
                      <Link
                        href={`/bmn/assets/${v.id}`}
                        className="bmn-motion-action bmn-hover-link p-3 bg-[var(--ds-surface-muted)] border border-slate-200/80 dark:border-zinc-800 rounded-lg flex items-center justify-between hover:bg-[var(--ds-status-danger-bg)] hover:border-[var(--ds-status-danger-border)] transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-[var(--ds-surface)] border border-slate-200/80 dark:border-zinc-800 text-[var(--ds-fg-muted)] flex items-center justify-center font-bold text-xs shrink-0">
                            <Car className="w-4 h-4" />
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-[var(--ds-fg)]">
                              {v.nama_barang} <span className="font-normal text-[var(--ds-fg-muted)]">({v.merk})</span>
                            </h4>
                            <p className="text-xs font-mono font-bold text-[var(--ds-fg-secondary)] mt-1">
                              {v.no_polisi || "Tanpa Polisi"}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-[var(--ds-status-danger-bg)] text-[var(--ds-status-danger-fg)] border border-[var(--ds-status-danger-border)] text-xs font-bold">
                            <AlertTriangle className="w-3 h-3" />
                            Expired
                          </span>
                          <p className="text-xs text-[var(--ds-fg-muted)] mt-1 font-mono tabular-nums">{v.tanggal_pajak_stnk}</p>
                        </div>
                      </Link>
                    </div>
                  ))}

                  {data?.stnk_alerts?.expiring_soon.map((v) => (
                    <div key={`soon-${v.id}`}>
                      <Link
                        href={`/bmn/assets/${v.id}`}
                        className="bmn-motion-action bmn-hover-link p-3 bg-[var(--ds-surface-muted)] border border-slate-200/80 dark:border-zinc-800 rounded-lg flex items-center justify-between hover:bg-[var(--ds-status-warning-bg)] hover:border-[var(--ds-status-warning-border)] transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-[var(--ds-surface)] border border-slate-200/80 dark:border-zinc-800 text-[var(--ds-fg-muted)] flex items-center justify-center font-bold text-xs shrink-0">
                            <Car className="w-4 h-4" />
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-[var(--ds-fg)]">
                              {v.nama_barang} <span className="font-normal text-[var(--ds-fg-muted)]">({v.merk})</span>
                            </h4>
                            <p className="text-xs font-mono font-bold text-[var(--ds-accent-fg)] mt-1">
                              {v.no_polisi || "Tanpa Polisi"}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-[var(--ds-status-warning-bg)] text-[var(--ds-status-warning-fg)] border border-[var(--ds-status-warning-border)] text-xs font-bold">
                            <AlertTriangle className="w-3 h-3" />
                            Pajak Dekat
                          </span>
                          <p className="text-xs text-[var(--ds-fg-muted)] mt-1 font-mono tabular-nums">{v.tanggal_pajak_stnk}</p>
                        </div>
                      </Link>
                    </div>
                  ))}

                  {data?.stnk_alerts?.plat_expired.map((v) => (
                    <div key={`plat-${v.id}`}>
                      <Link
                        href={`/bmn/assets/${v.id}`}
                        className="bmn-motion-action bmn-hover-link p-3 bg-[var(--ds-surface-muted)] border border-slate-200/80 dark:border-zinc-800 rounded-lg flex items-center justify-between hover:bg-[var(--ds-status-danger-bg)] hover:border-[var(--ds-status-danger-border)] transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-[var(--ds-surface)] border border-slate-200/80 dark:border-zinc-800 text-[var(--ds-fg-muted)] flex items-center justify-center font-bold text-xs shrink-0">
                            <Car className="w-4 h-4" />
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-[var(--ds-fg)]">
                              {v.nama_barang} <span className="font-normal text-[var(--ds-fg-muted)]">({v.merk})</span>
                            </h4>
                            <p className="text-xs font-mono font-bold text-[var(--ds-accent-fg)] mt-1">
                              {v.no_polisi || "Tanpa Polisi"}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-[var(--ds-status-danger-bg)] text-[var(--ds-status-danger-fg)] border border-[var(--ds-status-danger-border)] text-xs font-bold">
                            Ganti Plat
                          </span>
                          <p className="text-xs text-[var(--ds-fg-muted)] mt-1 font-mono tabular-nums">{v.tanggal_ganti_plat}</p>
                        </div>
                      </Link>
                    </div>
                  ))}
                  {(data?.stnk_alerts?.plat_expiring_soon || []).map((v) => (
                    <div key={`plat-soon-${v.id}`}>
                      <Link
                        href={`/bmn/assets/${v.id}`}
                        className="bmn-motion-action bmn-hover-link p-3 bg-[var(--ds-surface-muted)] border border-slate-200/80 dark:border-zinc-800 rounded-lg flex items-center justify-between hover:bg-[var(--ds-status-warning-bg)] hover:border-[var(--ds-status-warning-border)] transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-[var(--ds-surface)] border border-slate-200/80 dark:border-zinc-800 text-[var(--ds-fg-muted)] flex items-center justify-center font-bold text-xs shrink-0">
                            <Car className="w-4 h-4" />
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-[var(--ds-fg)]">
                              {v.nama_barang} <span className="font-normal text-[var(--ds-fg-muted)]">({v.merk})</span>
                            </h4>
                            <p className="text-xs font-mono font-bold text-[var(--ds-accent-fg)] mt-1">
                              {v.no_polisi || "Tanpa Polisi"}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-[var(--ds-status-warning-bg)] text-[var(--ds-status-warning-fg)] border border-[var(--ds-status-warning-border)] text-xs font-bold">
                            Plat Dekat
                          </span>
                          <p className="text-xs text-[var(--ds-fg-muted)] mt-1 font-mono tabular-nums">{v.tanggal_ganti_plat}</p>
                        </div>
                      </Link>
                    </div>
                  ))}
                  {(data?.overdue_loans || []).map((loan) => (
                    <div key={`loan-overdue-${loan.id}`}>
                      <Link
                        href="/bmn/loans"
                        className="bmn-motion-action bmn-hover-link p-3 bg-[var(--ds-status-danger-bg)] border border-[var(--ds-status-danger-border)] rounded-lg flex items-center justify-between transition-colors"
                      >
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-[var(--ds-fg)] truncate">
                            {loan.asset || "Pinjaman BMN"}
                          </h4>
                          <p className="text-xs text-[var(--ds-fg-muted)] truncate mt-1">
                            {loan.borrower || "Pegawai"}
                          </p>
                        </div>
                        <div className="text-right shrink-0 ml-2">
                          <span className="inline-flex items-center px-2 py-1 rounded-lg bg-[var(--ds-surface)] text-[var(--ds-status-danger-fg)] border border-[var(--ds-status-danger-border)] text-xs font-bold">
                            Terlambat
                          </span>
                          {loan.due_date && <p className="text-xs text-[var(--ds-fg-muted)] mt-1 font-mono tabular-nums">{loan.due_date}</p>}
                        </div>
                      </Link>
                    </div>
                  ))}
                </>
              ) : (
                <div className="p-8 text-center flex flex-col items-center justify-center bg-[var(--ds-accent-soft)] rounded-lg border border-[var(--ds-accent-soft-border)]">
                  <div className="w-10 h-10 rounded-full bg-[var(--ds-surface)] flex items-center justify-center text-[var(--ds-accent-fg)] mb-2">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-bold text-[var(--ds-fg)]">Semua Pajak & Plat Terkendali</p>
                  <p className="text-xs text-[var(--ds-fg-muted)] mt-1 max-w-[200px]">
                    Tidak ada kendaraan operasional yang terlambat bayar pajak.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-200/70 dark:border-zinc-800 flex items-center justify-between text-xs font-medium">
            <span className="text-[var(--ds-fg-muted)]">
              {totalAlerts > 0 ? `${totalAlerts} kendaraan perlu perhatian` : "Semua unit aman"}
            </span>
            <Link
              href="/bmn/assets"
              className="text-[var(--ds-status-danger-fg)] hover:underline font-semibold inline-flex items-center gap-1"
            >
              Proses Perpanjangan STNK
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Card: Distribusi per Jenis BMN (Col 4) */}
        <div className="lg:col-span-4 bg-[var(--ds-surface)] border border-slate-200/80 dark:border-zinc-800 rounded-3xl p-4 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-200/70 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-[var(--ds-accent-soft)] rounded-lg text-[var(--ds-accent-fg)]">
                  <BarChart3 className="w-4 h-4" />
                </div>
                <h2 className="font-bold text-[var(--ds-fg)] text-sm tracking-tight">Distribusi per Jenis BMN</h2>
              </div>
              <span className="text-xs text-[var(--ds-fg-muted)] font-semibold tabular-nums">
                {data?.asset_by_jenis?.length || 0} Jenis
              </span>
            </div>

            {/* Breakdown list with inline progress meters */}
            <div className="mt-4 space-y-3 max-h-[340px] overflow-y-auto pr-1 custom-scrollbar">
              {data?.asset_by_jenis && data.asset_by_jenis.length > 0 ? (
                data.asset_by_jenis.map((item, i) => {
                  const maxCount = data.asset_by_jenis[0]?.total || 1;
                  const pct = (item.total / maxCount) * 100;
                  return (
                    <div key={i} className="group">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-semibold text-[var(--ds-fg-secondary)] truncate max-w-[150px]" title={item.jenis_bmn}>
                          {item.jenis_bmn}
                        </span>
                        <div className="text-right">
                          <span className="font-extrabold text-[var(--ds-fg)] tabular-nums">{item.total}</span>
                          <span className="text-xs text-[var(--ds-fg-muted)] ml-2 tabular-nums">
                            {formatRupiah(item.total_nilai)}
                          </span>
                        </div>
                      </div>
                      <div className="bmn-chart-enter h-2 w-full bg-[var(--ds-surface-muted)] rounded-full overflow-hidden">
                        <motion.div
                          initial={false}
                          animate={{ scaleX: pct / 100 }}
                          transition={{ duration: 0.6, ease: "easeOut" }}
                          style={{ originX: 0 }}
                          className="bg-[var(--ds-accent-solid)] h-full w-full rounded-full"
                        />
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-xs text-[var(--ds-fg-muted)] text-center py-8">Belum ada data</p>
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-200/70 dark:border-zinc-800 flex items-center justify-between text-xs text-[var(--ds-fg-muted)] font-medium">
            <span>Total Valuasi: <strong className="text-[var(--ds-fg)] tabular-nums">{formatRupiah(data?.total_asset_value || 0)}</strong></span>
            {canViewReports && (
              <Link href="/bmn/reports" className="text-[var(--ds-accent-fg)] hover:underline font-semibold">
                Lihat Rincian Akun
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* BENTO GRID ROW 2: Top Lokasi Ruang, Aktivitas Terbaru, & Akses Cepat Modul */}
      <section aria-label="Lokasi Ruang, Aktivitas dan Akses Cepat" className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Card: Top Lokasi Ruang (Col 4) */}
        <div className="lg:col-span-4 bg-[var(--ds-surface)] border border-slate-200/80 dark:border-zinc-800 rounded-3xl p-4 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-200/70 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-[var(--ds-accent-soft)] rounded-lg text-[var(--ds-accent-fg)]">
                  <MapPin className="w-4 h-4" />
                </div>
                <h2 className="font-bold text-[var(--ds-fg)] text-sm tracking-tight">Top Lokasi Ruang</h2>
              </div>
              <span className="text-xs font-semibold text-[var(--ds-accent-fg)] bg-[var(--ds-accent-soft)] border border-[var(--ds-accent-soft-border)] px-2 py-1 rounded-lg">
                Prioritas
              </span>
            </div>

            {/* Horizontal Location Bars */}
            <div className="mt-4 space-y-3 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
              {data?.asset_by_lokasi && data.asset_by_lokasi.length > 0 ? (
                data.asset_by_lokasi.map((item, i) => {
                  const maxLoc = data.asset_by_lokasi[0]?.total || 1;
                  const locPct = (item.total / maxLoc) * 100;
                  return (
                    <div key={i}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-[var(--ds-fg-secondary)] font-medium truncate max-w-[200px]" title={item.lokasi_ruang}>
                          {item.lokasi_ruang}
                        </span>
                        <span className="font-extrabold text-[var(--ds-fg)] tabular-nums">
                          {item.total.toLocaleString("id-ID")} <span className="text-xs font-normal text-[var(--ds-fg-muted)]">Unit</span>
                        </span>
                      </div>
                      <div className="bmn-chart-enter h-2 w-full bg-[var(--ds-surface-muted)] rounded-full overflow-hidden">
                        <motion.div
                          initial={false}
                          animate={{ scaleX: locPct / 100 }}
                          transition={{ duration: 0.6, ease: "easeOut" }}
                          style={{ originX: 0 }}
                          className="bg-[var(--ds-accent-solid)] h-full w-full rounded-full"
                        />
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-xs text-[var(--ds-fg-muted)] text-center py-8">Belum ada data lokasi</p>
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-200/70 dark:border-zinc-800 flex items-center justify-between text-xs text-[var(--ds-fg-muted)] font-medium">
            <span>Distribusi per Ruang Kerja</span>
            <Link href="/bmn/assets" className="text-[var(--ds-accent-fg)] hover:underline font-semibold">
              Lihat Semua Lokasi
            </Link>
          </div>
        </div>

        {/* Card: Aktivitas Terbaru (Col 4) */}
        <div className="lg:col-span-4 bg-[var(--ds-surface)] border border-slate-200/80 dark:border-zinc-800 rounded-3xl p-4 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-200/70 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-[var(--ds-accent-soft)] rounded-lg text-[var(--ds-accent-fg)]">
                  <Calendar className="w-4 h-4" />
                </div>
                <h2 className="font-bold text-[var(--ds-fg)] text-sm tracking-tight">Aktivitas Terbaru</h2>
              </div>
              <Link href="/bmn/reports" className="text-xs text-[var(--ds-accent-fg)] font-semibold cursor-pointer hover:underline">
                Semua Log
              </Link>
            </div>

            {/* Activity List */}
            <div className="mt-4 space-y-3 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
              {data?.recent_transactions && data.recent_transactions.length > 0 ? (
                <>
                  {data.recent_transactions.slice(0, 5).map((tx, i) => (
                    <div
                      key={i}
                      className="flex items-start justify-between p-3 rounded-lg border border-slate-200/80 dark:border-zinc-800 bg-[var(--ds-surface-muted)] hover:bg-[var(--ds-accent-soft)] transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-[var(--ds-accent-soft)] text-[var(--ds-accent-fg)] border border-[var(--ds-accent-soft-border)] flex items-center justify-center shrink-0">
                          {tx.type === "loan" ? (
                            <HandCoins className="w-4 h-4" />
                          ) : tx.type === "maintenance" ? (
                            <Wrench className="w-4 h-4" />
                          ) : (
                            <Laptop className="w-4 h-4" />
                          )}
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-[var(--ds-fg)] truncate max-w-[140px]">
                            {tx.asset || "Aset BMN"}
                          </h4>
                          <p className="text-xs text-[var(--ds-fg-muted)]">
                            {tx.type === "loan"
                              ? `Dipinjam: ${tx.borrower || "Pegawai"}`
                              : tx.keterangan || "Pencatatan mutasi aset perangkat TI"}
                          </p>
                        </div>
                      </div>
                      <span className="text-xs font-mono font-medium text-[var(--ds-fg-muted)] bg-[var(--ds-surface)] px-2 py-1 rounded-lg border border-slate-200/80 dark:border-zinc-800 shrink-0 tabular-nums">
                        {tx.tanggal}
                      </span>
                    </div>
                  ))}
                  <div className="p-3 rounded-lg border border-dashed border-slate-200/80 dark:border-zinc-800 text-center py-4">
                    <p className="text-xs text-[var(--ds-fg-muted)] font-medium">
                      Menampilkan {Math.min(data.recent_transactions.length, 5)} transaksi inventaris terakhir
                    </p>
                  </div>
                </>
              ) : (
                <div className="p-8 rounded-lg border border-dashed border-slate-200/80 dark:border-zinc-800 text-center">
                  <p className="text-xs text-[var(--ds-fg-muted)]">Belum ada aktivitas tercatat</p>
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-200/70 dark:border-zinc-800 flex items-center justify-between text-xs text-[var(--ds-fg-muted)] font-medium">
            <span>Audit trail otomatis aktif</span>
            {canViewReports && (
              <Link href="/bmn/reports" className="text-[var(--ds-accent-fg)] font-semibold cursor-pointer hover:underline">
                Buka Log Audit
              </Link>
            )}
          </div>
        </div>

        {/* Card: Akses Cepat Modul (Col 4) */}
        <div className="lg:col-span-4 bg-[var(--ds-surface)] border border-slate-200/80 dark:border-zinc-800 rounded-3xl p-4 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-200/70 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-[var(--ds-accent-soft)] rounded-lg text-[var(--ds-accent-fg)]">
                  <Activity className="w-4 h-4" />
                </div>
                <h2 className="font-bold text-[var(--ds-fg)] text-sm tracking-tight">Akses Cepat Modul</h2>
              </div>
              <span className="text-xs text-[var(--ds-fg-muted)] font-medium">Pintasan SIMAK</span>
            </div>

            {/* Shared highlight follows pointer or keyboard focus. */}
            <div
              className="mt-4 grid grid-cols-2 gap-3"
              onMouseLeave={() => setHoveredAction(null)}
              onBlur={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget)) setFocusedAction(null);
              }}
            >
              {visibleQuickActions.map(({ href, label, description, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  onMouseEnter={() => setHoveredAction(href)}
                  onFocus={() => setFocusedAction(href)}
                  className="bmn-motion-action relative isolate group p-4 bg-[var(--ds-surface-muted)] border border-slate-200/80 dark:border-zinc-800 rounded-lg flex flex-col items-start gap-3"
                >
                  {highlightedAction === href && (
                    <motion.span
                      aria-hidden="true"
                      layoutId={`${highlightId}-quick-action`}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ layout: { type: "spring", stiffness: 500, damping: 40 }, opacity: { duration: 0.12 } }}
                      className="pointer-events-none absolute inset-0 rounded-lg bg-[var(--ds-accent-soft)] border border-[var(--ds-accent-soft-border)]"
                    />
                  )}
                  <div className="relative z-10 w-9 h-9 rounded-lg bg-[var(--ds-surface)] border border-slate-200/80 dark:border-zinc-800 text-[var(--ds-accent-fg)] flex items-center justify-center shadow-xs group-hover:bg-[var(--ds-accent-solid)] group-focus-visible:bg-[var(--ds-accent-solid)] group-hover:text-[var(--ds-accent-on-solid)] group-focus-visible:text-[var(--ds-accent-on-solid)] transition-colors motion-reduce:transition-none">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="relative z-10">
                    <span className="text-xs font-bold text-[var(--ds-fg)] block">{label}</span>
                    <span className="text-xs text-[var(--ds-fg-muted)]">{description}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-200/70 dark:border-zinc-800 flex items-center justify-between text-xs text-[var(--ds-fg-muted)] font-medium">
            <span>KemenLHK Satker 289053</span>
            <span className="text-[var(--ds-accent-fg)] font-semibold">BKSDA KALTIM</span>
          </div>
        </div>
      </section>
    </div>
  );
}
