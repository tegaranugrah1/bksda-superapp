"use client";

import { TreePine } from "lucide-react";
import CrudPageFactory from "../_components/CrudPageFactory";
import type { CrudPageConfig } from "../_components/types";

const config: CrudPageConfig = {
    title: "Kelola Tumbuhan & Satwa Liar",
    subtitle: "Data flora dan fauna dilindungi.",
    icon: TreePine,
    accentColor: "lime",
    apiEndpoint: "/cms/admin/tsl",
    searchPlaceholder: "Cari nama species...",
    columns: [
        { key: "nama_lokal", label: "Nama Lokal" },
        { key: "nama_latin", label: "Nama Latin", render: (v) => v || "-" },
        { key: "tipe", label: "Tipe", render: (v) => v === "satwa" ? "🦅 Satwa" : "🌿 Tumbuhan" },
        { key: "status_iucn", label: "Status IUCN" },
        { key: "is_published", label: "Status", render: (v) => v ? "✅ Terbit" : "📝 Draft" },
    ],
    fields: [
        { key: "nama_lokal", label: "Nama Lokal", type: "text", required: true, maxLength: 255 },
        { key: "nama_latin", label: "Nama Latin", type: "text", maxLength: 255 },
        { key: "tipe", label: "Tipe", type: "select", required: true, options: [
            { value: "tumbuhan", label: "Tumbuhan" },
            { value: "satwa", label: "Satwa" },
        ]},
        { key: "status_iucn", label: "Status IUCN", type: "text", placeholder: "CR, EN, VU, NT, LC" },
        { key: "deskripsi", label: "Deskripsi", type: "textarea" },
        { key: "thumbnail", label: "Foto", type: "file", accept: "image/*" },
        { key: "is_published", label: "Publikasi", type: "checkbox", placeholder: "Tampilkan di website" },
    ],
};

export default function TslPage() {
    return <CrudPageFactory config={config} />;
}
