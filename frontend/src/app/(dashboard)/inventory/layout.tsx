import { ReactNode } from "react";
import { InventorySidebar } from "./_components/InventorySidebar";

export const metadata = {
    title: "Logistik - BKSDA SuperApp",
    description: "Sistem Pengendalian Inventaris dan Stok Barang Milik Negara",
};

export default function InventoryLayout({ children }: { children: ReactNode }) {
    return (
        <div className="flex h-screen w-full bg-zinc-950 text-zinc-100 overflow-hidden font-sans">
            {/* Memanggil Komponen Sidebar di sisi Kiri */}
            <InventorySidebar />

            {/* Merender isi spesifik setiap Halaman di sisi Kanan */}
            <main className="flex-1 overflow-y-auto relative">{children}</main>
        </div>
    );
}
