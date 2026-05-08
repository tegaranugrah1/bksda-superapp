import { MapPin } from "lucide-react";
import CrudPageFactory from "../_components/CrudPageFactory";
import type { CrudPageConfig } from "../_components/types";

const config: CrudPageConfig = {
  title: "Kelola Kawasan Konservasi",
  subtitle: "Data kawasan hutan lindung, cagar alam, dan suaka margasatwa.",
  icon: MapPin,
  accentColor: "teal",
  apiEndpoint: "/cms/admin/kawasan",
  searchPlaceholder: "Cari nama kawasan...",
  columns: [
    { key: "nama", label: "Nama Kawasan" },
    {
      key: "tipe_kawasan",
      label: "Tipe",
      render: (v) => (v ? String(v) : "-"),
    },
    {
      key: "luas_ha",
      label: "Luas (Ha)",
      render: (v) => (v ? `${Number(v).toLocaleString()} Ha` : "-"),
    },
    {
      key: "is_published",
      label: "Status",
      render: (v) => (v ? "✅ Terbit" : "📝 Draft"),
    },
  ],
  fields: [
    {
      key: "nama",
      label: "Nama Kawasan",
      type: "text",
      required: true,
      maxLength: 255,
    },
    {
      key: "tipe_kawasan",
      label: "Tipe Kawasan",
      type: "text",
      placeholder: "Cagar Alam / Suaka Margasatwa",
    },
    { key: "deskripsi", label: "Deskripsi", type: "textarea", required: true },
    { key: "luas_ha", label: "Luas (Hektar)", type: "number" },
    {
      key: "latitude",
      label: "Latitude",
      type: "text",
      placeholder: "-6.1234567",
    },
    {
      key: "longitude",
      label: "Longitude",
      type: "text",
      placeholder: "106.1234567",
    },
    {
      key: "thumbnail",
      label: "Foto Kawasan",
      type: "file",
      accept: "image/*",
    },
    {
      key: "is_published",
      label: "Publikasi",
      type: "checkbox",
      placeholder: "Tampilkan di website publik",
    },
  ],
};

export default function KawasanPage() {
  return <CrudPageFactory config={config} />;
}
