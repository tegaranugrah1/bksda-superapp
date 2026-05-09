"use client";

import { Image } from "lucide-react";
import CrudPageFactory from "../_components/CrudPageFactory";
import type { CrudPageConfig } from "../_components/types";

const config: CrudPageConfig = {
    title: "Kelola Poster",
    subtitle: "Kelola koleksi poster kampanye.",
    icon: Image,
    accentColor: "fuchsia",
    apiEndpoint: "/cms/admin/poster",
    searchPlaceholder: "Cari judul poster...",
    columns: [
        { key: "judul", label: "Judul" },
        { key: "is_published", label: "Status", render: (v) => v ? "✅ Terbit" : "📝 Draft" },
    ],
    fields: [
        { key: "judul", label: "Judul", type: "text", required: true, maxLength: 255 },
        { key: "deskripsi", label: "Deskripsi", type: "textarea" },
        { key: "file", label: "File Poster", type: "file", accept: "image/*" },
        { key: "thumbnail", label: "Thumbnail", type: "file", accept: "image/*" },
        { key: "is_published", label: "Publikasi", type: "checkbox", placeholder: "Tampilkan di website" },
    ],
};

export default function PosterPage() {
    return <CrudPageFactory config={config} />;
}
