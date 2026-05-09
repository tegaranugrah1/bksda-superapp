import { ReactNode } from "react";
import { InventorySidebar } from "./_components/InventorySidebar";

export const metadata = {
    title: "Logistik - BKSDA SuperApp",
    description: "Sistem Pengendalian Inventaris dan Stok Barang Milik Negara",
};

export default function InventoryLayout({ children }: { children: ReactNode }) {
    return (
        <div className="flex h-screen w-full bg-zinc-50 dark:bg-black text-zinc-900 dark:text-zinc-100 overflow-hidden font-sans">
            <InventorySidebar />
            <main className="flex-1 overflow-y-auto relative bg-zinc-50 dark:bg-black">{children}</main>
        </div>
    );
}
