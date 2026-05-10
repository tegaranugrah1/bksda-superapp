"use client";

import { AlertOctagon, RefreshCcw } from "lucide-react";

export default function GlobalError({
  _error,
  reset,
}: {
  _error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="id">
      <body>
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 font-sans">
          <div className="text-center space-y-6 max-w-md bg-white p-8 rounded-3xl shadow-xl border border-gray-100">
            <div className="flex justify-center mb-6">
              <div
                className="w-20 h-20 bg-rose-100 text-rose-500 rounded-2xl
                                flex items-center justify-center ring-8 ring-rose-50"
              >
                <AlertOctagon className="w-10 h-10" />
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-black text-gray-900 mb-2">
                Fatal Error
              </h2>
              <p className="text-gray-500 mb-8 text-sm leading-relaxed">
                Terjadi kesalahan sistem yang kritis. Tim teknis kami telah
                mencatat masalah ini.
              </p>

              <button
                onClick={() => reset()}
                className="inline-flex items-center justify-center gap-2
                                    bg-gray-900 hover:bg-black text-white
                                    px-8 py-3 rounded-xl font-bold transition-all
                                    shadow-lg hover:-translate-y-1 w-full"
              >
                <RefreshCcw className="w-5 h-5" />
                Muat Ulang Aplikasi
              </button>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
