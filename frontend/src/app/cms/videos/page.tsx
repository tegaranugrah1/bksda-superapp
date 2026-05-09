"use client";

import { Video } from "lucide-react";
import CrudPageFactory from "../_components/CrudPageFactory";
import type { CrudPageConfig } from "../_components/types";

const config: CrudPageConfig = {
    title: "Kelola Galeri Video",
    subtitle: "Kelola koleksi video kegiatan dan宣传.",
    icon: Video,
    accentColor: "violet",
    apiEndpoint: "/cms/admin/videos",
    searchPlaceholder: "Cari judul video...",
    columns: [
        { key: "judul", label: "Judul" },
        { key: "youtube_url", label: "YouTube URL", render: (v) => v ? "✅ Ada" : "-" },
        { key: "is_published", label: "Status", render: (v) => v ? "✅ Terbit" : "📝 Draft" },
    ],
    fields: [
        { key: "judul", label: "Judul", type: "text", required: true, maxLength: 255 },
        { key: "deskripsi", label: "Deskripsi", type: "textarea" },
        { key: "youtube_url", label: "YouTube URL", type: "url", placeholder: "https://youtube.com/watch?v=..." },
        { key: "thumbnail", label: "Thumbnail", type: "file", accept: "image/*" },
        { key: "is_published", label: "Publikasi", type: "checkbox", placeholder: "Tampilkan di website" },
    ],
};

export default function VideosPage() {
    return <CrudPageFactory config={config} />;
}
