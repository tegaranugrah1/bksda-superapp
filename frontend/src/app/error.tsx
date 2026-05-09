"use client";

import { useEffect } from "react";
import { AlertOctagon, RefreshCcw } from "lucide-react";

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {

    useEffect(() => {
        console.error("Application Error:", error);
    }, [error]);

    return (
        <div className="min-h-[70vh] flex flex-col items-center justify-center p-4">
            <div className="text-center space-y-6 max-w-md bg-white p-8 rounded-3xl shadow-xl border border-gray-100">

                <div className="flex justify-center mb-6">
                    <div className="w-20 h-20 bg-rose-100 text-rose-500 rounded-2xl
                        flex items-center justify-center ring-8 ring-rose-50 rotate-12">
                        <AlertOctagon className="w-10 h-10" />
                    </div>
                </div>

                <div>
                    <h2 className="text-2xl font-black text-gray-900 mb-2">
                        Terjadi Kesalahan!
                    </h2>
                    <p className="text-gray-500 mb-8 text-sm leading-relaxed">
                        Sistem mendapati masalah teknis saat memproses permintaan Anda.
                        Silakan coba muat ulang halaman.
                    </p>

                    <button
                        onClick={() => reset()}
                        className="inline-flex items-center justify-center gap-2
                            bg-rose-600 hover:bg-rose-700 text-white
                            px-8 py-3 rounded-xl font-bold transition-all
                            shadow-lg shadow-rose-200/50 hover:-translate-y-1 w-full"
                    >
                        <RefreshCcw className="w-5 h-5" />
                        Coba Lagi (Muat Ulang)
                    </button>
                </div>
            </div>
        </div>
    );
}
