"use client";

import { useEffect, useState } from "react";
import { Package, Wrench, HandCoins, ShieldAlert, TrendingUp, PieChart, BarChart3, Calendar, MapPin } from "lucide-react";
import { api } from "@/lib/api";
import Link from "next/link";
import { cn } from "@/lib/utils";

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

const formatCurrency = (val: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", notation: "compact", maximumFractionDigits: 1 }).format(val);

const JENIS_COLORS: Record<string, string> = {
  "ALAT ANGKUTAN BERMOTOR": "bg-blue-500",
  "ALAT BESAR": "bg-emerald-500",
  "TANAH": "bg-amber-500",
  "BANGUNAN DAN GEDUNG": "bg-violet-500",
  "RUMAH NEGARA": "bg-pink-500",
  "MESIN PERALATAN NON TIK": "bg-cyan-500",
  "MESIN PERALATAN KHUSUS TIK": "bg-indigo-500",
  "ALAT PERSENJATAAN": "bg-red-500",
  "BANGUNAN AIR": "bg-teal-500",
};

export default function BmnDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/bmn/dashboard/stats")
      .then((res) => setData(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const totalAssets = data?.total_asset || 0;
  const conditionStats = data?.asset_by_condition || {};
  const baik = conditionStats["Baik"] || 0;
  const rusakRingan = conditionStats["Rusak Ringan"] || 0;
  const rusakBerat = conditionStats["Rusak Berat"] || 0;

  if (loading) {
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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={<Package className="w-4 h-4" />} label="Total Aset" value={totalAssets.toLocaleString("id-ID")} color="blue" sub={`${baik} kondisi baik`} />
        <StatCard icon={<TrendingUp className="w-4 h-4" />} label="Nilai Perolehan" value={formatCurrency(data?.total_asset_value || 0)} color="emerald" sub="Total akumulasi" />
        <StatCard icon={<HandCoins className="w-4 h-4" />} label="Sedang Dipinjam" value="-" color="amber" sub="Lihat peminjaman" />
        <StatCard icon={<ShieldAlert className="w-4 h-4" />} label="Rusak Berat" value={rusakBerat.toString()} color="red" sub="Perlu perhatian" />
      </div>

      {/* STNK Alerts */}
      {data?.stnk_alerts && (data.stnk_alerts.expired.length > 0 || data.stnk_alerts.expiring_soon.length > 0 || data.stnk_alerts.plat_expired.length > 0) && (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <ShieldAlert className="w-5 h-5 text-red-500" />
            <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">Peringatan STNK & Plat Kendaraan</h3>
          </div>
          <div className="space-y-2">
            {data.stnk_alerts.expired.map((v) => (
              <Link key={v.id} href={`/bmn/assets/${v.id}`} className="flex items-center justify-between p-3 rounded-xl bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors">
                <div>
                  <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">{v.nama_barang} <span className="text-zinc-400">({v.merk})</span></p>
                  <p className="text-[10px] text-zinc-500">{v.no_polisi || "Tanpa Polisi"}</p>
                </div>
                <span className="text-[10px] font-bold text-red-700 bg-red-100 px-2 py-1 rounded-lg">🚨 Pajak Expired ({v.tanggal_pajak_stnk})</span>
              </Link>
            ))}
            {data.stnk_alerts.expiring_soon.map((v) => (
              <Link key={v.id} href={`/bmn/assets/${v.id}`} className="flex items-center justify-between p-3 rounded-xl bg-amber-50 dark:bg-amber-500/10 hover:bg-amber-100 dark:hover:bg-amber-500/20 transition-colors">
                <div>
                  <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">{v.nama_barang} <span className="text-zinc-400">({v.merk})</span></p>
                  <p className="text-[10px] text-zinc-500">{v.no_polisi || "Tanpa Polisi"}</p>
                </div>
                <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-1 rounded-lg">⚠️ Pajak {v.tanggal_pajak_stnk}</span>
              </Link>
            ))}
            {data.stnk_alerts.plat_expired.map((v) => (
              <Link key={v.id} href={`/bmn/assets/${v.id}`} className="flex items-center justify-between p-3 rounded-xl bg-orange-50 dark:bg-orange-500/10 hover:bg-orange-100 dark:hover:bg-orange-500/20 transition-colors">
                <div>
                  <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">{v.nama_barang} <span className="text-zinc-400">({v.merk})</span></p>
                  <p className="text-[10px] text-zinc-500">{v.no_polisi || "Tanpa Polisi"}</p>
                </div>
                <span className="text-[10px] font-bold text-orange-700 bg-orange-100 px-2 py-1 rounded-lg">🔄 Ganti Plat ({v.tanggal_ganti_plat})</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Left column: Kondisi + Akses Cepat */}
        <div className="space-y-3">
          {/* Donut Chart - Kondisi */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3">
            <div className="flex items-center gap-2 mb-2">
              <PieChart className="w-3.5 h-3.5 text-emerald-500" />
              <h3 className="text-[10px] font-bold text-zinc-700 dark:text-zinc-300 uppercase">Kondisi</h3>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative w-14 h-14 shrink-0">
                <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                  <circle cx="18" cy="18" r="15.9" fill="none" stroke="currentColor" strokeWidth="4" className="text-zinc-200 dark:text-zinc-800" />
                  {totalAssets > 0 && (
                    <>
                      <circle cx="18" cy="18" r="15.9" fill="none" stroke="#10b981" strokeWidth="4"
                        strokeDasharray={`${(baik / totalAssets) * 100} ${100 - (baik / totalAssets) * 100}`} strokeDashoffset="0" />
                      <circle cx="18" cy="18" r="15.9" fill="none" stroke="#f59e0b" strokeWidth="4"
                        strokeDasharray={`${(rusakRingan / totalAssets) * 100} ${100 - (rusakRingan / totalAssets) * 100}`} strokeDashoffset={`${-((baik / totalAssets) * 100)}`} />
                      <circle cx="18" cy="18" r="15.9" fill="none" stroke="#ef4444" strokeWidth="4"
                        strokeDasharray={`${(rusakBerat / totalAssets) * 100} ${100 - (rusakBerat / totalAssets) * 100}`} strokeDashoffset={`${-(((baik + rusakRingan) / totalAssets) * 100)}`} />
                    </>
                  )}
                </svg>
              </div>
              <div className="space-y-1 flex-1">
                <LegendItem color="bg-emerald-500" label="Baik" count={baik} pct={totalAssets > 0 ? Math.round((baik / totalAssets) * 100) : 0} />
                <LegendItem color="bg-amber-500" label="R. Ringan" count={rusakRingan} pct={totalAssets > 0 ? Math.round((rusakRingan / totalAssets) * 100) : 0} />
                <LegendItem color="bg-red-500" label="R. Berat" count={rusakBerat} pct={totalAssets > 0 ? Math.round((rusakBerat / totalAssets) * 100) : 0} />
              </div>
            </div>
          </div>

          {/* Akses Cepat */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3">
            <h3 className="text-[10px] font-bold text-zinc-700 dark:text-zinc-300 uppercase mb-2">Akses Cepat</h3>
            <div className="grid grid-cols-2 gap-1.5">
              <QuickLink href="/bmn/assets" label="Data Aset" icon={<Package className="w-3.5 h-3.5" />} />
              <QuickLink href="/bmn/loans" label="Peminjaman" icon={<HandCoins className="w-3.5 h-3.5" />} />
              <QuickLink href="/bmn/maintenances" label="Pemeliharaan" icon={<Wrench className="w-3.5 h-3.5" />} />
              <QuickLink href="/bmn/reports" label="Laporan" icon={<BarChart3 className="w-3.5 h-3.5" />} />
            </div>
          </div>
        </div>

        {/* Right: Jenis BMN (3 cols) */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 lg:col-span-3">
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 className="w-3.5 h-3.5 text-blue-500" />
            <h3 className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Distribusi per Jenis BMN</h3>
          </div>
          {data?.asset_by_jenis && data.asset_by_jenis.length > 0 ? (
            <div className="space-y-2">
              {data.asset_by_jenis.map((item, i) => {
                const maxCount = data.asset_by_jenis[0]?.total || 1;
                const pct = (item.total / maxCount) * 100;
                const color = JENIS_COLORS[item.jenis_bmn] || "bg-slate-400";
                return (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-[10px] text-zinc-600 dark:text-zinc-400 truncate w-[160px] shrink-0">{item.jenis_bmn}</span>
                    <div className="flex-1 bg-zinc-100 dark:bg-zinc-800 rounded-full h-1.5">
                      <div className={cn("h-full rounded-full", color)} style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-[10px] font-bold text-zinc-700 dark:text-zinc-300 shrink-0 w-20 text-right">{item.total} <span className="text-zinc-400 font-normal">{formatCurrency(item.total_nilai)}</span></span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-zinc-400 text-center py-4">Belum ada data</p>
          )}
        </div>
      </div>

      {/* Bottom: Lokasi + Aktivitas full width 1x2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Lokasi */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <MapPin className="w-3.5 h-3.5 text-violet-500" />
            <h3 className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Top Lokasi</h3>
          </div>
          {data?.asset_by_lokasi && data.asset_by_lokasi.length > 0 ? (
            <div className="space-y-2">
              {data.asset_by_lokasi.map((item, i) => {
                const maxCount = data.asset_by_lokasi[0]?.total || 1;
                const pct = (item.total / maxCount) * 100;
                return (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-[10px] text-zinc-600 dark:text-zinc-400 truncate w-[140px] shrink-0">{item.lokasi_ruang}</span>
                    <div className="flex-1 bg-zinc-100 dark:bg-zinc-800 rounded-full h-1.5">
                      <div className="h-full bg-violet-500 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-[10px] font-bold text-zinc-700 dark:text-zinc-300 w-8 text-right">{item.total}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-zinc-400 text-center py-4">Belum ada data</p>
          )}
        </div>

        {/* Aktivitas */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="w-3.5 h-3.5 text-violet-500" />
            <h3 className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Aktivitas Terbaru</h3>
          </div>
          {data?.recent_transactions && data.recent_transactions.length > 0 ? (
            <div className="space-y-2">
              {data.recent_transactions.slice(0, 6).map((tx, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className={cn("w-6 h-6 rounded flex items-center justify-center shrink-0", tx.type === "loan" ? "bg-amber-50 dark:bg-amber-500/10 text-amber-600" : "bg-blue-50 dark:bg-blue-500/10 text-blue-600")}>
                    {tx.type === "loan" ? <HandCoins className="w-3 h-3" /> : <Wrench className="w-3 h-3" />}
                  </div>
                  <p className="text-[10px] font-medium text-zinc-700 dark:text-zinc-300 truncate flex-1">{tx.asset || "-"}</p>
                  <span className="text-[9px] text-zinc-400 shrink-0">{tx.tanggal}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-zinc-400 text-center py-4">Belum ada aktivitas</p>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color, sub }: { icon: React.ReactNode; label: string; value: string; color: string; sub: string }) {
  const colors: Record<string, { iconBg: string; text: string }> = {
    blue: { iconBg: "bg-blue-100 dark:bg-blue-500/10", text: "text-blue-600" },
    emerald: { iconBg: "bg-emerald-100 dark:bg-emerald-500/10", text: "text-emerald-600" },
    amber: { iconBg: "bg-amber-100 dark:bg-amber-500/10", text: "text-amber-600" },
    red: { iconBg: "bg-red-100 dark:bg-red-500/10", text: "text-red-600" },
  };
  const c = colors[color] || colors.blue;
  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 hover:shadow-sm transition-shadow">
      <div className="flex items-center gap-2 mb-2">
        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", c.iconBg, c.text)}>{icon}</div>
        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide">{label}</span>
      </div>
      <p className="text-xl font-bold text-zinc-900 dark:text-white">{value}</p>
      <p className="text-[10px] text-zinc-400 mt-0.5">{sub}</p>
    </div>
  );
}

function LegendItem({ color, label, count, pct }: { color: string; label: string; count: number; pct: number }) {
  return (
    <div className="flex items-center gap-3">
      <div className={cn("w-3 h-3 rounded-full shrink-0", color)} />
      <span className="text-xs text-zinc-600 dark:text-zinc-400 flex-1">{label}</span>
      <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">{count}</span>
      <span className="text-[10px] text-zinc-400 w-8 text-right">{pct}%</span>
    </div>
  );
}

function QuickLink({ href, label, icon }: { href: string; label: string; icon: React.ReactNode }) {
  return (
    <Link href={href} className="flex items-center gap-2 p-2.5 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-700 rounded-lg hover:border-emerald-300 dark:hover:border-emerald-500/30 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-all group">
      <div className="text-zinc-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">{icon}</div>
      <span className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-300 group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">{label}</span>
    </Link>
  );
}
