import { BookOpen } from "lucide-react";
import CrudPageFactory from "../_components/CrudPageFactory";
import type { CrudPageConfig } from "../_components/types";

const config: CrudPageConfig = {
    title: "Kelola Buku Publikasi",
    subtitle: "Kelola koleksi buku dan publikasi BKSDA.",
    icon: BookOpen,
    accentColor: "orange",
    apiEndpoint: "/cms/admin/buku",
    searchPlaceholder: "Cari judul buku...",
    columns: [
        { key: "judul", label: "Judul" },
        { key: "penulis", label: "Penulis", render: (v) => v || "-" },
        { key: "tahun_terbit", label: "Tahun" },
        { key: "is_published", label: "Status", render: (v) => v ? "✅ Terbit" : "📝 Draft" },
    ],
    fields: [
        { key: "judul", label: "Judul", type: "text", required: true, maxLength: 255 },
        { key: "penulis", label: "Penulis", type: "text", maxLength: 255 },
        { key: "penerbit", label: "Penerbit", type: "text", maxLength: 255 },
        { key: "tahun_terbit", label: "Tahun Terbit", type: "number" },
        { key: "deskripsi", label: "Deskripsi", type: "textarea" },
        { key: "cover", label: "Cover", type: "file", accept: "image/*" },
        { key: "file", label: "File PDF", type: "file", accept: ".pdf" },
        { key: "is_published", label: "Publikasi", type: "checkbox", placeholder: "Tampilkan di website" },
    ],
};

export default function BukuPage() {
    return <CrudPageFactory config={config} />;
}
