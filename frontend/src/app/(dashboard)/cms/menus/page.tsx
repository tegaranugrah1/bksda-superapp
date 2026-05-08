import { Navigation } from "lucide-react";
import CrudPageFactory from "../_components/CrudPageFactory";
import type { CrudPageConfig } from "../_components/types";

const config: CrudPageConfig = {
    title: "Menu Navigasi",
    subtitle: "Kelola menu header dan footer website publik BKSDA.",
    icon: Navigation,
    accentColor: "teal",
    apiEndpoint: "/cms/admin/menus",
    searchPlaceholder: "Cari label menu...",
    columns: [
        { key: "label", label: "Label Menu" },
        { key: "url", label: "URL Tujuan", render: (v) => <span className="text-xs text-teal-400 font-mono">{String(v)}</span> },
        { key: "posisi", label: "Posisi", render: (v) => v === "header" ? "🔝 Header" : "🔻 Footer" },
        { key: "urutan", label: "Urutan" },
        { key: "is_active", label: "Aktif", render: (v) => v ? "✅" : "❌" },
    ],
    fields: [
        { key: "label", label: "Label Menu", type: "text", required: true, maxLength: 100, placeholder: "Beranda" },
        { key: "url", label: "URL Tujuan", type: "url", required: true, placeholder: "/profil/visi-misi" },
        { key: "posisi", label: "Posisi", type: "select", options: [{ value: "header", label: "Header" }, { value: "footer", label: "Footer" }] },
        { key: "urutan", label: "Urutan", type: "number" },
        { key: "is_active", label: "Aktif", type: "checkbox", placeholder: "Tampilkan menu ini" },
    ],
};

export default function MenusPage() {
    return <CrudPageFactory config={config} />;
}
