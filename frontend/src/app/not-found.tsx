"use client";

import Link from "next/link";
import { AlertTriangle, Home } from "lucide-react";

export default function NotFound() {
    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
            <div className="text-center space-y-6 max-w-md bg-white p-8 rounded-3xl shadow-xl border border-gray-100 relative overflow-hidden">

                <div className="absolute -top-24 -right-24 w-48 h-48 bg-amber-100 rounded-full blur-3xl opacity-50 pointer-events-none" />
                <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-emerald-100 rounded-full blur-3xl opacity-50 pointer-events-none" />

                <div className="relative z-10 flex justify-center mb-6">
                    <div className="w-24 h-24 bg-amber-100 text-amber-500 rounded-full flex items-center justify-center ring-8 ring-amber-50">
                        <AlertTriangle className="w-12 h-12" />
                    </div>
                </div>

                <div className="relative z-10">
                    <h1 className="text-4xl font-black text-gray-900 mb-2">404</h1>
                    <h2 className="text-xl font-bold text-gray-700 mb-4 uppercase tracking-widest">
                        Halaman Tidak Ditemukan
                    </h2>
                    <p className="text-gray-500 mb-8 leading-relaxed">
                        Maaf, halaman yang Anda cari mungkin telah dipindahkan,
                        dihapus, atau memang tidak pernah ada.
                    </p>

                    <Link
                        href="/"
                        className="inline-flex items-center justify-center gap-2
                            bg-emerald-600 hover:bg-emerald-700 text-white
                            px-8 py-3 rounded-xl font-bold transition-all
                            shadow-lg shadow-emerald-200/50 hover:-translate-y-1 w-full"
                    >
                        <Home className="w-5 h-5" />
                        Kembali ke Beranda
                    </Link>
                </div>
            </div>
        </div>
    );
}
