"use client";

import { useQuery } from "@tanstack/react-query";
import { Package, Wrench, HandCoins, ShieldAlert, ShieldCheck, TrendingUp, PieChart, BarChart3, Calendar, MapPin } from "lucide-react";
import { api } from "@/lib/api";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { formatRupiah } from "@/app/bmn/_lib/asset-utils";
import { StatCard, LegendItem, QuickLink } from "@/app/bmn/_components/BmnDashboardComponents";
import { motion } from "framer-motion";

interface JenisData { jenis_bmn: string; total: number; total_nilai: number }
interface LokasiData { lokasi_ruang: string; total: number }

interface DashboardData {
  total_asset: number;
  total_asset_value: number;
  asset_by_condition: Record<string, number>;
  asset_by_jenis: JenisData[];
  asset_by_lokasi: LokasiData[];
  recent_transactions: { type: string; id: number; asset: string; tanggal: string; status?: string; borrower?: string; keterangan?: string }[];
  stnk_alerts?: {
    expired: { id: string; nama_barang: string; merk: string; no_polisi: string; tanggal_pajak_stnk: string }[];
    expiring_soon: { id: string; nama_barang: string; merk: string; no_polisi: string; tanggal_pajak_stnk: string }[];
    plat_expired: { id: string; nama_barang: string; merk: string; no_polisi: string; tanggal_ganti_plat: string }[];
  };
}

function AlertItem({ item, label, colorClass, badgeClass }: { item: { id: string; nama_barang: string; merk: string; no_polisi: string }; label: string; colorClass: string; badgeClass: string }) {
  return (
    <motion.div whileHover={{ x: 3 }} transition={{ duration: 0.15, ease: "easeOut" }}>
      <Link href={`/bmn/assets/${item.id}`} className={cn("flex items-center justify-between p-3 rounded-xl transition-colors bg-zinc-50/70 dark:bg-zinc-800/30 border border-zinc-200/60 dark:border-zinc-800 hover:bg-zinc-100/70 dark:hover:bg-zinc-800/60", colorClass)}>
        <div>
          <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">{item.nama_barang} <span className="text-zinc-400">({item.merk})</span></p>
          <p className="text-[10px] text-zinc-500">{item.no_polisi || "Tanpa Polisi"}</p>
        </div>
        <span className={cn("text-[10px] font-bold px-2 py-1 rounded-lg", badgeClass)}>{label}</span>
      </Link>
    </motion.div>
  );
}

function BarProgressRow({ label, count, maxCount, barColor, extra, labelWidth = "w-[140px]" }: { label: string; count: number; maxCount: number; barColor?: string; extra?: React.ReactNode; labelWidth?: string }) {
  const pct = (count / (maxCount || 1)) * 100;
  return (
    <div className="flex items-center gap-2">
      <span className={cn("text-[10px] text-zinc-600 dark:text-zinc-400 truncate shrink-0", labelWidth)}>{label}</span>
      <div className="flex-1 bg-zinc-100 dark:bg-zinc-800 rounded-full h-1.5 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className={cn("h-full rounded-full", barColor || "bg-emerald-500")}
        />
      </div>
      <span className="text-[10px] font-bold text-zinc-700 dark:text-zinc-300 shrink-0 text-right">
        {count} {extra}
      </span>
    </div>
  );
}

export default function BmnDashboardPage() {
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
  const totalAlerts =
    (data?.stnk_alerts?.expired?.length || 0) +
    (data?.stnk_alerts?.expiring_soon?.length || 0) +
    (data?.stnk_alerts?.plat_expired?.length || 0);

  if (isLoading) {
    return (
      <div className="p-6 md:p-8 space-y-6 animate-pulse">
        <div className="h-8 w-64 bg-zinc-200 dark:bg-zinc-800 rounded-lg" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-28 bg-zinc-100 dark:bg-zinc-900 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-5 space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-zinc-900 dark:text-white">Dashboard BMN</h1>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">Ikhtisar pengelolaan Barang Milik Negara BKSDA Kalimantan Timur.</p>
      </div>

      {/* Stat Cards */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="grid grid-cols-2 lg:grid-cols-4 gap-3"
      >
        <StatCard icon={<Package className="w-4 h-4" />} label="Total Aset" value={totalAssets.toLocaleString("id-ID")} color="zinc" sub={`${baik} kondisi baik`} />
        <StatCard icon={<TrendingUp className="w-4 h-4" />} label="Nilai Perolehan" value={formatRupiah(data?.total_asset_value || 0)} color="emerald" sub="Total akumulasi" />
        <StatCard icon={<HandCoins className="w-4 h-4" />} label="Sedang Dipinjam" value="-" color="zinc" sub="Lihat peminjaman" />
        <StatCard icon={<ShieldAlert className="w-4 h-4" />} label="Rusak Berat" value={rusakBerat.toString()} color={rusakBerat > 0 ? "red" : "zinc"} sub={rusakBerat > 0 ? "Perlu perhatian" : "Semua terkendali"} />
      </motion.div>

      {/* 3-Bagian Seimbang: Kondisi Aset (Kiri), Peringatan STNK (Tengah), Distribusi per Jenis BMN (Kanan) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Kolom 1: Kondisi Aset BMN (Segmented Progress Pill Bar - Rekomendasi 2) */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 flex flex-col justify-between h-[350px]">
          {/* Header */}
          <div className="flex items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-emerald-500" />
              <h3 className="text-xs font-bold text-zinc-800 dark:text-zinc-200">Kondisi Aset BMN</h3>
            </div>
            <span className="text-[10px] text-zinc-400 font-semibold">{totalAssets.toLocaleString("id-ID")} Aset</span>
          </div>

          {/* Hero Health Index & Status Pill */}
          <div className="flex items-end justify-between gap-2 pt-1 shrink-0">
            <div>
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Index Kelaikan</span>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-3xl font-black text-zinc-900 dark:text-white tracking-tight leading-none">
                  {baikPct.toFixed(1)}%
                </span>
                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">Siap Operasional</span>
              </div>
            </div>
            <div className="text-right">
              <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-full border border-emerald-200/80 dark:border-emerald-800/60">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Kondisi Prima
              </span>
            </div>
          </div>

          {/* Segmented Progress Pill Bar (Gaya Linear & GitHub Storage) */}
          <div className="space-y-1.5 shrink-0 py-1">
            <div className="h-3.5 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full p-0.5 flex gap-1 overflow-hidden">
              {/* Segment 1: Baik */}
              {baikPct > 0 && (
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${baikPct}%` }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                  className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full min-w-[8px]"
                  title={`Baik: ${baik.toLocaleString("id-ID")} (${baikPct.toFixed(1)}%)`}
                />
              )}
              {/* Segment 2: Rusak Ringan */}
              {rusakRinganPct > 0 && (
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${rusakRinganPct}%` }}
                  transition={{ duration: 0.6, ease: "easeOut", delay: 0.1 }}
                  className="h-full bg-amber-400 rounded-full min-w-[8px]"
                  title={`Rusak Ringan: ${rusakRingan.toLocaleString("id-ID")} (${rusakRinganPct.toFixed(1)}%)`}
                />
              )}
              {/* Segment 3: Rusak Berat */}
              {rusakBeratPct > 0 && (
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${rusakBeratPct}%` }}
                  transition={{ duration: 0.6, ease: "easeOut", delay: 0.2 }}
                  className="h-full bg-rose-500 rounded-full min-w-[8px]"
                  title={`Rusak Berat: ${rusakBerat.toLocaleString("id-ID")} (${rusakBeratPct.toFixed(1)}%)`}
                />
              )}
            </div>
            <div className="flex items-center justify-between text-[10px] text-zinc-400 px-0.5">
              <span>0%</span>
              <span className="font-medium text-emerald-600/80 dark:text-emerald-400/80">Standar Prima ≥ 90%</span>
              <span>100%</span>
            </div>
          </div>

          {/* 3 Detailed Condition Cards */}
          <div className="grid grid-cols-1 gap-2 flex-1 justify-center my-auto">
            {/* Baik */}
            <div className="p-2.5 rounded-xl bg-zinc-50/70 dark:bg-zinc-800/30 border border-zinc-200/60 dark:border-zinc-800 flex items-center justify-between transition-colors hover:bg-zinc-100/70 dark:hover:bg-zinc-800/60">
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0 shadow-sm shadow-emerald-500/30" />
                <div>
                  <span className="block text-xs font-bold text-zinc-800 dark:text-zinc-200 leading-none">Baik (Prima)</span>
                  <span className="block text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5">Siap digunakan untuk operasional</span>
                </div>
              </div>
              <div className="text-right flex items-center gap-2">
                <span className="text-xs font-black text-zinc-800 dark:text-zinc-100">{baik.toLocaleString("id-ID")} Unit</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100/90 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300">
                  {baikPct.toFixed(1)}%
                </span>
              </div>
            </div>

            {/* Rusak Ringan */}
            <div className="p-2.5 rounded-xl bg-zinc-50/70 dark:bg-zinc-800/30 border border-zinc-200/60 dark:border-zinc-800 flex items-center justify-between transition-colors hover:bg-zinc-100/70 dark:hover:bg-zinc-800/60">
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0 shadow-sm shadow-amber-500/30" />
                <div>
                  <span className="block text-xs font-bold text-zinc-800 dark:text-zinc-200 leading-none">Rusak Ringan</span>
                  <span className="block text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5">Perlu perbaikan atau servis berkala</span>
                </div>
              </div>
              <div className="text-right flex items-center gap-2">
                <span className="text-xs font-black text-zinc-800 dark:text-zinc-100">{rusakRingan.toLocaleString("id-ID")} Unit</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-100/90 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300">
                  {rusakRinganPct.toFixed(1)}%
                </span>
              </div>
            </div>

            {/* Rusak Berat */}
            <div className="p-2.5 rounded-xl bg-zinc-50/70 dark:bg-zinc-800/30 border border-zinc-200/60 dark:border-zinc-800 flex items-center justify-between transition-colors hover:bg-zinc-100/70 dark:hover:bg-zinc-800/60">
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0 shadow-sm shadow-rose-500/30" />
                <div>
                  <span className="block text-xs font-bold text-zinc-800 dark:text-zinc-200 leading-none">Rusak Berat</span>
                  <span className="block text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5">Usulan penghapusan / lelang BMN</span>
                </div>
              </div>
              <div className="text-right flex items-center gap-2">
                <span className="text-xs font-black text-zinc-800 dark:text-zinc-100">{rusakBerat.toLocaleString("id-ID")} Unit</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-100/90 dark:bg-rose-900/60 text-rose-800 dark:text-rose-300">
                  {rusakBeratPct.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Kolom 2: Peringatan STNK & Plat Kendaraan (Tengah) */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 flex flex-col h-[350px]">
          <div className="flex items-center justify-between gap-2 mb-3 shrink-0">
            <div className="flex items-center gap-2">
              <ShieldAlert className={cn("w-4 h-4", totalAlerts > 0 ? "text-red-500" : "text-emerald-500")} />
              <h3 className="text-xs font-bold text-zinc-800 dark:text-zinc-200">Peringatan STNK & Plat</h3>
            </div>
            {totalAlerts > 0 ? (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300">
                {totalAlerts} Perlu Perhatian
              </span>
            ) : (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                Terkendali
              </span>
            )}
          </div>

          {totalAlerts > 0 ? (
            <div className="flex-1 overflow-y-auto pr-1 space-y-2 custom-scrollbar">
              {data?.stnk_alerts?.expired.map((v) => (
                <AlertItem key={`exp-${v.id}`} item={v} label={`🚨 Expired (${v.tanggal_pajak_stnk})`} colorClass="border-l-[3px] border-l-red-500" badgeClass="text-red-700 bg-red-100/80 dark:text-red-300 dark:bg-red-950/60" />
              ))}
              {data?.stnk_alerts?.expiring_soon.map((v) => (
                <AlertItem key={`soon-${v.id}`} item={v} label={`⚠️ Pajak ${v.tanggal_pajak_stnk}`} colorClass="border-l-[3px] border-l-amber-500" badgeClass="text-amber-700 bg-amber-100/80 dark:text-amber-300 dark:bg-amber-950/60" />
              ))}
              {data?.stnk_alerts?.plat_expired.map((v) => (
                <AlertItem key={`plat-${v.id}`} item={v} label={`🔄 Ganti Plat (${v.tanggal_ganti_plat})`} colorClass="border-l-[3px] border-l-orange-500" badgeClass="text-orange-700 bg-orange-100/80 dark:text-orange-300 dark:bg-orange-950/60" />
              ))}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-4 bg-emerald-50/40 dark:bg-emerald-950/20 rounded-xl border border-emerald-100 dark:border-emerald-900/30">
              <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-2">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <p className="text-xs font-bold text-emerald-900 dark:text-emerald-200">Semua Pajak & Plat Terkendali</p>
              <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-1 max-w-[200px]">
                Tidak ada kendaraan operasional dinas yang terlambat bayar pajak atau jatuh tempo plat nomor.
              </p>
            </div>
          )}
        </div>

        {/* Kolom 3: Distribusi per Jenis BMN */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 flex flex-col h-[350px]">
          <div className="flex items-center justify-between gap-2 mb-3 shrink-0">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-emerald-500" />
              <h3 className="text-xs font-bold text-zinc-800 dark:text-zinc-200">Distribusi per Jenis BMN</h3>
            </div>
            <span className="text-[10px] text-zinc-400 font-semibold">{data?.asset_by_jenis?.length || 0} Jenis</span>
          </div>

          {data?.asset_by_jenis && data.asset_by_jenis.length > 0 ? (
            <div className="flex-1 overflow-y-auto pr-1 space-y-2.5 custom-scrollbar">
              {data.asset_by_jenis.map((item, i) => (
                <BarProgressRow
                  key={i}
                  label={item.jenis_bmn}
                  count={item.total}
                  maxCount={data.asset_by_jenis[0]?.total || 1}
                  barColor="bg-emerald-500"
                  labelWidth="w-[125px]"
                  extra={<span className="text-zinc-400 font-normal text-[9px]">{formatRupiah(item.total_nilai)}</span>}
                />
              ))}
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-xs text-zinc-400">Belum ada data</p>
            </div>
          )}
        </div>
      </div>

      {/* Bottom: Lokasi, Aktivitas Terbaru, & Akses Cepat (3 Kolom) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Kolom 1: Top Lokasi */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 flex flex-col h-[280px]">
          <div className="flex items-center gap-2 mb-3 shrink-0">
            <MapPin className="w-4 h-4 text-emerald-500" />
            <h3 className="text-xs font-bold text-zinc-800 dark:text-zinc-200">Top Lokasi Ruang</h3>
          </div>
          {data?.asset_by_lokasi && data.asset_by_lokasi.length > 0 ? (
            <div className="flex-1 overflow-y-auto pr-1 space-y-2.5 custom-scrollbar">
              {data.asset_by_lokasi.map((item, i) => (
                <BarProgressRow
                  key={i}
                  label={item.lokasi_ruang}
                  count={item.total}
                  maxCount={data.asset_by_lokasi[0]?.total || 1}
                  barColor="bg-emerald-500"
                  labelWidth="w-[130px]"
                />
              ))}
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-xs text-zinc-400">Belum ada data lokasi</p>
            </div>
          )}
        </div>

        {/* Kolom 2: Aktivitas Terbaru */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 flex flex-col h-[280px]">
          <div className="flex items-center gap-2 mb-3 shrink-0">
            <Calendar className="w-4 h-4 text-emerald-500" />
            <h3 className="text-xs font-bold text-zinc-800 dark:text-zinc-200">Aktivitas Terbaru</h3>
          </div>
          {data?.recent_transactions && data.recent_transactions.length > 0 ? (
            <div className="flex-1 overflow-y-auto pr-1 space-y-2 custom-scrollbar">
              {data.recent_transactions.slice(0, 10).map((tx, i) => (
                <div key={i} className="flex items-center gap-2.5 p-1.5 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                  <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center shrink-0", tx.type === "loan" ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300" : "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600")}>
                    {tx.type === "loan" ? <HandCoins className="w-3.5 h-3.5" /> : <Wrench className="w-3.5 h-3.5" />}
                  </div>
                  <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300 truncate flex-1">{tx.asset || "-"}</p>
                  <span className="text-[10px] text-zinc-400 shrink-0">{tx.tanggal}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-xs text-zinc-400">Belum ada aktivitas</p>
            </div>
          )}
        </div>

        {/* Kolom 3: Akses Cepat */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 flex flex-col h-[280px]">
          <div className="flex items-center gap-2 mb-3 shrink-0">
            <Package className="w-4 h-4 text-emerald-500" />
            <h3 className="text-xs font-bold text-zinc-800 dark:text-zinc-200">Akses Cepat Modul</h3>
          </div>
          <div className="grid grid-cols-2 gap-2 flex-1">
            <QuickLink href="/bmn/assets" label="Data Aset" icon={<Package className="w-4 h-4" />} />
            <QuickLink href="/bmn/loans" label="Peminjaman" icon={<HandCoins className="w-4 h-4" />} />
            <QuickLink href="/bmn/maintenances" label="Pemeliharaan" icon={<Wrench className="w-4 h-4" />} />
            <QuickLink href="/bmn/reports" label="Dokumen / Laporan" icon={<BarChart3 className="w-4 h-4" />} />
          </div>
        </div>
      </div>
    </div>
  );
}
