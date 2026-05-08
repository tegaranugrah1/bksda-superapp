import { Camera } from "lucide-react";
import CrudPageFactory from "../_components/CrudPageFactory";
import type { CrudPageConfig } from "../_components/types";

const config: CrudPageConfig = {
    title: "Kelola Galeri Foto",
    subtitle: "Kelola koleksi foto kegiatan dan kawasan.",
    icon: Camera,
    accentColor: "amber",
    apiEndpoint: "/cms/admin/photos",
    searchPlaceholder: "Cari judul foto...",
    columns: [
        { key: "judul", label: "Judul" },
        { key: "album", label: "Album", render: (v) => v || "-" },
        { key: "is_published", label: "Status", render: (v) => v ? "✅ Terbit" : "📝 Draft" },
    ],
    fields: [
        { key: "judul", label: "Judul", type: "text", required: true, maxLength: 255 },
        { key: "deskripsi", label: "Deskripsi", type: "textarea" },
        { key: "album", label: "Album", type: "text", placeholder: "Nama album foto" },
        { key: "file", label: "File Foto", type: "file", accept: "image/*" },
        { key: "is_published", label: "Publikasi", type: "checkbox", placeholder: "Tampilkan di website" },
    ],
};

export default function PhotosPage() {
    return <CrudPageFactory config={config} />;
}
