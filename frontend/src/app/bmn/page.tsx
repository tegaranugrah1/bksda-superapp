"use client";

import { useEffect, useState } from "react";
import { Package, Wrench, HandCoins, ShieldAlert, TrendingUp, PieChart, BarChart3, ChevronRight, Calendar } from "lucide-react";
import { api } from "@/lib/api";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface DashboardData {
  total_asset: number;
  total_asset_value: number;
  asset_by_condition: Record<string, number>;
  asset_by_category: { kode_barang: string; total: number }[];
  recent_transactions: { type: string; id: number; asset: string; tanggal: string; status?: string; borrower?: string; keterangan?: string }[];
}

const formatCurrency = (val: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", notation: "compact", maximumFractionDigits: 1 }).format(val);

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

  const conditionBars = [
    { label: "Baik", count: baik, color: "bg-emerald-500", pct: totalAssets > 0 ? (baik / totalAssets) * 100 : 0 },
    { label: "Rusak Ringan", count: rusakRingan, color: "bg-amber-400", pct: totalAssets > 0 ? (rusakRingan / totalAssets) * 100 : 0 },
    { label: "Rusak Berat", count: rusakBerat, color: "bg-red-500", pct: totalAssets > 0 ? (rusakBerat / totalAssets) * 100 : 0 },
  ];

  if (loading) {
    return (
      <div className="p-6 md:p-8 space-y-6 animate-pulse">
        <div className="h-8 w-64 bg-slate-200 rounded-lg" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-28 bg-slate-100 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard BMN</h1>
        <p className="text-sm text-slate-500 mt-1">Ikhtisar pengelolaan Barang Milik Negara BKSDA Kalimantan Timur.</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={<Package className="w-5 h-5" />} label="Total Aset" value={totalAssets.toLocaleString("id-ID")} color="blue" sub={`${baik} kondisi baik`} />
        <StatCard icon={<TrendingUp className="w-5 h-5" />} label="Nilai Perolehan" value={formatCurrency(data?.total_asset_value || 0)} color="emerald" sub="Total akumulasi" />
        <StatCard icon={<HandCoins className="w-5 h-5" />} label="Sedang Dipinjam" value="-" color="amber" sub="Lihat peminjaman" />
        <StatCard icon={<ShieldAlert className="w-5 h-5" />} label="Rusak Berat" value={rusakBerat.toString()} color="red" sub="Perlu perhatian" />
      </div>

      {/* Middle Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Condition Distribution */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-5">
            <PieChart className="w-4 h-4 text-emerald-500" />
            <h3 className="text-sm font-bold text-slate-700">Kondisi Aset</h3>
          </div>
          <div className="space-y-4">
            {conditionBars.map((bar) => (
              <div key={bar.label} className="space-y-1.5">
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-slate-600">{bar.label}</span>
                  <span className="text-slate-900 font-bold">{bar.count} ({Math.round(bar.pct)}%)</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div className={cn("h-full rounded-full transition-all", bar.color)} style={{ width: `${bar.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
          <Link href="/bmn/assets" className="flex items-center justify-center gap-1 mt-5 text-xs font-semibold text-blue-600 hover:text-blue-700">
            Lihat Semua Aset <ChevronRight className="w-3 h-3" />
          </Link>
        </div>

        {/* Category Distribution */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-5">
            <BarChart3 className="w-4 h-4 text-blue-500" />
            <h3 className="text-sm font-bold text-slate-700">Top Kategori</h3>
          </div>
          {data?.asset_by_category && data.asset_by_category.length > 0 ? (
            <div className="space-y-3">
              {data.asset_by_category.slice(0, 6).map((cat, i) => {
                const maxCount = data.asset_by_category[0]?.total || 1;
                const pct = (cat.total / maxCount) * 100;
                return (
                  <div key={i} className="space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-600 truncate max-w-[180px]">{cat.kode_barang}</span>
                      <span className="text-slate-900 font-bold">{cat.total}</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-1.5">
                      <div className="h-full bg-blue-500 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-slate-400 text-center py-8">Belum ada data kategori</p>
          )}
        </div>

        {/* Recent Activity */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-5">
            <Calendar className="w-4 h-4 text-violet-500" />
            <h3 className="text-sm font-bold text-slate-700">Aktivitas Terbaru</h3>
          </div>
          {data?.recent_transactions && data.recent_transactions.length > 0 ? (
            <div className="space-y-3">
              {data.recent_transactions.slice(0, 6).map((tx, i) => (
                <div key={i} className="flex items-start gap-3 p-2 rounded-lg hover:bg-slate-50 transition-colors">
                  <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", tx.type === "loan" ? "bg-amber-50 text-amber-600" : "bg-blue-50 text-blue-600")}>
                    {tx.type === "loan" ? <HandCoins className="w-4 h-4" /> : <Wrench className="w-4 h-4" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-slate-800 truncate">{tx.asset || "-"}</p>
                    <p className="text-[10px] text-slate-400">{tx.tanggal} • {tx.type === "loan" ? (tx.borrower || tx.status) : tx.keterangan}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-400 text-center py-8">Belum ada aktivitas</p>
          )}
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <QuickLink href="/bmn/assets" label="Data Aset" icon={<Package className="w-5 h-5" />} />
        <QuickLink href="/bmn/loans" label="Peminjaman" icon={<HandCoins className="w-5 h-5" />} />
        <QuickLink href="/bmn/maintenances" label="Pemeliharaan" icon={<Wrench className="w-5 h-5" />} />
        <QuickLink href="/bmn/reports" label="Laporan" icon={<BarChart3 className="w-5 h-5" />} />
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color, sub }: { icon: React.ReactNode; label: string; value: string; color: string; sub: string }) {
  const colors: Record<string, { bg: string; text: string; iconBg: string }> = {
    blue: { bg: "bg-blue-50", text: "text-blue-600", iconBg: "bg-blue-100" },
    emerald: { bg: "bg-emerald-50", text: "text-emerald-600", iconBg: "bg-emerald-100" },
    amber: { bg: "bg-amber-50", text: "text-amber-600", iconBg: "bg-amber-100" },
    red: { bg: "bg-red-50", text: "text-red-600", iconBg: "bg-red-100" },
  };
  const c = colors[color] || colors.blue;
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 hover:shadow-md transition-shadow">
      <div className="flex items-center gap-3 mb-3">
        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", c.iconBg, c.text)}>{icon}</div>
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">{label}</span>
      </div>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      <p className="text-[11px] text-slate-400 mt-1">{sub}</p>
    </div>
  );
}

function QuickLink({ href, label, icon }: { href: string; label: string; icon: React.ReactNode }) {
  return (
    <Link href={href} className="flex items-center gap-3 p-4 bg-white border border-slate-200 rounded-xl hover:border-emerald-300 hover:shadow-sm transition-all group">
      <div className="text-slate-400 group-hover:text-emerald-600 transition-colors">{icon}</div>
      <span className="text-sm font-semibold text-slate-700 group-hover:text-emerald-700 transition-colors">{label}</span>
    </Link>
  );
}
