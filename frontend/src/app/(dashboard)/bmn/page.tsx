import { Box, Construction } from "lucide-react";

export default function BmnPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
          BMN & Aset
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Modul aset barang milik negara sedang disiapkan untuk Phase 6.
        </p>
      </div>

      <div className="rounded-2xl border border-zinc-200/80 bg-white/70 p-8 shadow-sm backdrop-blur-xl dark:border-zinc-800/80 dark:bg-zinc-900/70">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400">
            <Box className="h-7 w-7" />
          </div>
          <div className="flex-1">
            <div className="mb-2 flex items-center gap-2">
              <Construction className="h-4 w-4 text-amber-500" />
              <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                Belum Diimplementasi
              </span>
            </div>
            <h2 className="text-lg font-bold text-zinc-900 dark:text-white">
              Ruang kerja BMN siap menerima fitur berikutnya
            </h2>
            <p className="mt-1 text-sm leading-6 text-zinc-500 dark:text-zinc-400">
              Placeholder ini menjaga navigasi modul tetap berada di dashboard shell sampai issue BMN dikerjakan.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
