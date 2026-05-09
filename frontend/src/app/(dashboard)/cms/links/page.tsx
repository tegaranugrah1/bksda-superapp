"use client";

import { LinkIcon } from "lucide-react";
import CrudPageFactory from "../_components/CrudPageFactory";
import type { CrudPageConfig } from "../_components/types";

const config: CrudPageConfig = {
    title: "Kelola Link Terkait",
    subtitle: "Kelola tautan ke situs terkait.",
    icon: LinkIcon,
    accentColor: "sky",
    apiEndpoint: "/cms/admin/links",
    searchPlaceholder: "Cari judul link...",
    columns: [
        { key: "judul", label: "Judul" },
        { key: "url", label: "URL", render: (v) => v ? "🔗 Buka" : "-" },
        { key: "urutan", label: "Urutan", render: (v) => v || "-" },
    ],
    fields: [
        { key: "judul", label: "Judul", type: "text", required: true, maxLength: 255 },
        { key: "url", label: "URL", type: "url", required: true, placeholder: "https://..." },
        { key: "logo", label: "Logo", type: "file", accept: "image/*" },
        { key: "urutan", label: "Urutan", type: "number" },
    ],
};

export default function LinksPage() {
    return <CrudPageFactory config={config} />;
}
