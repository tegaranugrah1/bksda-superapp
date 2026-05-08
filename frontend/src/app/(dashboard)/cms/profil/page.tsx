import { Building2 } from "lucide-react";
import CrudPageFactory from "../_components/CrudPageFactory";
import type { CrudPageConfig } from "../_components/types";

const config: CrudPageConfig = {
    title: "Kelola Profil",
    subtitle: "Kelola profil organisasi BKSDA.",
    icon: Building2,
    accentColor: "cyan",
    apiEndpoint: "/cms/admin/profil",
    searchPlaceholder: "Cari judul profil...",
    columns: [
        { key: "judul", label: "Judul" },
        { key: "urutan", label: "Urutan", render: (v) => v || "-" },
        { key: "is_published", label: "Status", render: (v) => v ? "✅ Terbit" : "📝 Draft" },
    ],
    fields: [
        { key: "judul", label: "Judul", type: "text", required: true, maxLength: 255 },
        { key: "konten", label: "Konten", type: "textarea", required: true },
        { key: "thumbnail", label: "Foto", type: "file", accept: "image/*" },
        { key: "urutan", label: "Urutan", type: "number" },
        { key: "is_published", label: "Publikasi", type: "checkbox", placeholder: "Tampilkan di website" },
    ],
};

export default function ProfilPage() {
    return <CrudPageFactory config={config} />;
}
