import { Scale } from "lucide-react";
import CrudPageFactory from "../_components/CrudPageFactory";
import type { CrudPageConfig } from "../_components/types";

const config: CrudPageConfig = {
    title: "Kelola Regulasi",
    subtitle: "Kelola dokumen regulasi dan peraturan.",
    icon: Scale,
    accentColor: "red",
    apiEndpoint: "/cms/admin/regulasi",
    searchPlaceholder: "Cari judul regulasi...",
    columns: [
        { key: "judul", label: "Judul" },
        { key: "nomor", label: "Nomor", render: (v) => v || "-" },
        { key: "tahun", label: "Tahun" },
        { key: "is_published", label: "Status", render: (v) => v ? "✅ Terbit" : "📝 Draft" },
    ],
    fields: [
        { key: "judul", label: "Judul", type: "text", required: true, maxLength: 255 },
        { key: "nomor", label: "Nomor", type: "text", maxLength: 100 },
        { key: "tahun", label: "Tahun", type: "number" },
        { key: "deskripsi", label: "Deskripsi", type: "textarea" },
        { key: "file", label: "File PDF", type: "file", accept: ".pdf" },
        { key: "is_published", label: "Publikasi", type: "checkbox", placeholder: "Tampilkan di website" },
    ],
};

export default function RegulasiPage() {
    return <CrudPageFactory config={config} />;
}
