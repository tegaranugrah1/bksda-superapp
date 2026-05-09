"use client";

import { Tag } from "lucide-react";
import CrudPageFactory from "../_components/CrudPageFactory";
import type { CrudPageConfig } from "../_components/types";

const config: CrudPageConfig = {
    title: "Kelola Kategori",
    subtitle: "Kelola kategori berita dan konten.",
    icon: Tag,
    accentColor: "indigo",
    apiEndpoint: "/cms/admin/categories",
    searchPlaceholder: "Cari nama kategori...",
    columns: [
        { key: "nama", label: "Nama" },
        { key: "slug", label: "Slug", render: (v) => v || "-" },
        { key: "tipe", label: "Tipe" },
        { key: "urutan", label: "Urutan", render: (v) => v || "-" },
    ],
    fields: [
        { key: "nama", label: "Nama", type: "text", required: true, maxLength: 100 },
        { key: "slug", label: "Slug", type: "text", maxLength: 100 },
        { key: "tipe", label: "Tipe", type: "select", options: [
            { value: "berita", label: "Berita" },
            { value: "galeri", label: "Galeri" },
            { value: "publikasi", label: "Publikasi" },
        ]},
        { key: "urutan", label: "Urutan", type: "number" },
    ],
};

export default function CategoriesPage() {
    return <CrudPageFactory config={config} />;
}
