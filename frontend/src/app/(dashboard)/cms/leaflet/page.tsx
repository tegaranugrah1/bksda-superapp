import { FileImage } from "lucide-react";
import CrudPageFactory from "../_components/CrudPageFactory";
import type { CrudPageConfig } from "../_components/types";

const config: CrudPageConfig = {
    title: "Kelola Leaflet",
    subtitle: "Kelola koleksi leaflet edukasi.",
    icon: FileImage,
    accentColor: "pink",
    apiEndpoint: "/cms/admin/leaflet",
    searchPlaceholder: "Cari judul leaflet...",
    columns: [
        { key: "judul", label: "Judul" },
        { key: "is_published", label: "Status", render: (v) => v ? "✅ Terbit" : "📝 Draft" },
    ],
    fields: [
        { key: "judul", label: "Judul", type: "text", required: true, maxLength: 255 },
        { key: "deskripsi", label: "Deskripsi", type: "textarea" },
        { key: "file", label: "File Leaflet", type: "file", accept: ".pdf,image/*" },
        { key: "thumbnail", label: "Thumbnail", type: "file", accept: "image/*" },
        { key: "is_published", label: "Publikasi", type: "checkbox", placeholder: "Tampilkan di website" },
    ],
};

export default function LeafletPage() {
    return <CrudPageFactory config={config} />;
}
