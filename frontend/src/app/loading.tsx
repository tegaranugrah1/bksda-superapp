/**
 * Global Loading State (Rule 7.9)
 * Ditampilkan Next.js secara otomatis selama proses rendering/fetching page.
 */
import { Loader2 } from "lucide-react";

export default function GlobalLoading() {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-2">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground animate-pulse">
          Memuat aplikasi...
        </p>
      </div>
    </div>
  );
}
