import { UserCircle } from "lucide-react";
import CrudPageFactory from "../_components/CrudPageFactory";
import type { CrudPageConfig } from "../_components/types";

const config: CrudPageConfig = {
    title: "Kelola Kepala BKSDA",
    subtitle: "Kelola data kepala BKSDA dan sambutannya.",
    icon: UserCircle,
    accentColor: "emerald",
    apiEndpoint: "/cms/admin/kepala",
    searchPlaceholder: "Cari nama kepala...",
    columns: [
        { key: "nama", label: "Nama" },
        { key: "nip", label: "NIP", render: (v) => v || "-" },
        { key: "jabatan", label: "Jabatan" },
        { key: "is_active", label: "Status", render: (v) => v ? "✅ Aktif" : "❌ Tidak Aktif" },
    ],
    fields: [
        { key: "nama", label: "Nama", type: "text", required: true, maxLength: 255 },
        { key: "nip", label: "NIP", type: "text", maxLength: 50 },
        { key: "jabatan", label: "Jabatan", type: "text", maxLength: 255 },
        { key: "sambutan", label: "Sambutan", type: "textarea" },
        { key: "foto", label: "Foto", type: "file", accept: "image/*" },
        { key: "is_active", label: "Aktif", type: "checkbox", placeholder: "Jadikan kepala aktif" },
    ],
};

export default function KepalaPage() {
    return <CrudPageFactory config={config} />;
}
