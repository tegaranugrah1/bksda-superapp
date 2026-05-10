"use client";

import {
  CarFront,
  Handshake,
  ShieldAlert,
  Wallet,
  TrendingUp,
  AlertTriangle,
  Archive,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

const formatRupiah = (angka: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(angka);

const mockStats = {
  total_aset: 1245,
  total_nilai_buku: 45670000000,
  aset_dipinjam: 84,
  aset_rusak: 12,
};

const mockChartData = [
  { name: "Baik", total: 1100, color: "#10b981" },
  { name: "Rusak Ringan", total: 133, color: "#f59e0b" },
  { name: "Rusak Berat", total: 12, color: "#ef4444" },
];

export default function BmnDashboardPage() {
  return (
    <div className="p-6 md:p-10 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div>
        <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
          <Wallet className="w-8 h-8 text-emerald-500" />
          Pusat Analitik Kekayaan Negara
        </h1>
        <p className="text-zinc-400 mt-2 font-medium">
          Ringkasan valuasi dan mobilitas Barang Milik Negara (BMN) BKSDA.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-linear-to-br from-emerald-900/40 to-zinc-950 border border-emerald-500/20 p-6 rounded-3xl shadow-2xl relative overflow-hidden group hover:border-emerald-500/50 transition-all duration-500">
          <div className="absolute -right-6 -top-6 bg-emerald-500/10 p-6 rounded-full group-hover:scale-110 transition-transform duration-500">
            <TrendingUp className="w-12 h-12 text-emerald-500/50" />
          </div>
          <p className="text-sm font-bold text-emerald-400 uppercase tracking-widest mb-1">
            Total Nilai Buku
          </p>
          <h2 className="text-3xl font-black text-white tracking-tight">
            {formatRupiah(mockStats.total_nilai_buku)}
          </h2>
        </div>

        <div className="bg-zinc-950/50 border border-zinc-800 p-6 rounded-3xl shadow-xl hover:bg-zinc-900 transition-colors">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-semibold text-zinc-500 mb-1">
                Jumlah Fisik Aset
              </p>
              <h2 className="text-3xl font-black text-zinc-100">
                {mockStats.total_aset}{" "}
                <span className="text-base font-normal text-zinc-600">
                  Unit
                </span>
              </h2>
            </div>
            <div className="bg-blue-500/10 p-3 rounded-2xl">
              <CarFront className="w-6 h-6 text-blue-500" />
            </div>
          </div>
        </div>

        <div className="bg-zinc-950/50 border border-zinc-800 p-6 rounded-3xl shadow-xl hover:bg-zinc-900 transition-colors">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-semibold text-zinc-500 mb-1">
                Sedang Dipinjam
              </p>
              <h2 className="text-3xl font-black text-amber-500">
                {mockStats.aset_dipinjam}{" "}
                <span className="text-base font-normal text-zinc-600">
                  Unit
                </span>
              </h2>
            </div>
            <div className="bg-amber-500/10 p-3 rounded-2xl">
              <Handshake className="w-6 h-6 text-amber-500" />
            </div>
          </div>
        </div>

        <div className="bg-red-950/20 border border-red-500/20 p-6 rounded-3xl shadow-xl hover:bg-red-900/30 transition-colors">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-semibold text-red-400/80 mb-1">
                Kritis / Rusak Berat
              </p>
              <h2 className="text-3xl font-black text-red-500">
                {mockStats.aset_rusak}{" "}
                <span className="text-base font-normal text-red-500/50">
                  Unit
                </span>
              </h2>
            </div>
            <div className="bg-red-500/20 p-3 rounded-2xl animate-pulse">
              <ShieldAlert className="w-6 h-6 text-red-500" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-zinc-950/50 border border-zinc-800 p-6 rounded-3xl shadow-2xl">
          <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-zinc-400" /> Rasio Kondisi
            Fisik BMN
          </h3>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={mockChartData}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <XAxis
                  dataKey="name"
                  stroke="#52525b"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="#52525b"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  cursor={{ fill: "#27272a", opacity: 0.4 }}
                  contentStyle={{
                    backgroundColor: "#09090b",
                    borderColor: "#27272a",
                    borderRadius: "12px",
                    fontWeight: "bold",
                  }}
                  itemStyle={{ color: "#fff" }}
                />
                <Bar dataKey="total" radius={[6, 6, 0, 0]}>
                  {mockChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl shadow-xl flex flex-col justify-center text-center">
          <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-zinc-950">
            <Archive className="w-8 h-8 text-zinc-400" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">
            Audit Kesiapan BPK
          </h3>
          <p className="text-sm text-zinc-400 mb-6">
            Pastikan seluruh data aset dimutakhirkan setiap akhir semester untuk
            menghindari temuan auditor.
          </p>
          <button className="w-full py-3 bg-white text-black font-bold rounded-xl hover:bg-zinc-200 transition-colors">
            Buka Laporan Semester
          </button>
        </div>
      </div>
    </div>
  );
}
