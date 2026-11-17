import api from "@/lib/api";
import type { SuratMasuk } from "./surat-types";

export async function createSuratKeluar(formData: FormData) {
  const res = await api.post("/surat/surat-keluar", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
}

export async function saveSuratMasukQuickPatch(
  item: SuratMasuk,
  overrides: {
    sifat_json: string[];
    disposisi?: SuratMasuk["disposisi"];
  }
): Promise<SuratMasuk> {
  const payload = {
    no_agenda: item.no_agenda,
    no_surat: item.no_surat,
    tanggal_agenda: item.tanggal_agenda,
    tanggal_surat: item.tanggal_surat,
    tanggal_penyelesaian: item.tanggal_penyelesaian,
    indeks: item.indeks,
    kode: item.kode,
    referensi: item.referensi,
    asal_surat: item.asal_surat,
    isi_ringkas: item.isi_ringkas,
    lampiran: item.lampiran,
    catatan: item.catatan,
    sifat_json: overrides.sifat_json,
    disposisi: overrides.disposisi
      ? {
          ...overrides.disposisi,
          diteruskan_json: overrides.disposisi.diteruskan_json || [],
          instruksi_json: overrides.disposisi.instruksi_json || [],
          catatan: overrides.disposisi.catatan || "",
          ka_subbag_tu_id: overrides.disposisi.ka_subbag_tu_id || null,
          kepala_balai_id: overrides.disposisi.kepala_balai_id || null,
        }
      : undefined,
  };

  if (item.id) {
    const res = await api.put(`/surat-masuk/${item.id}`, payload);
    if (res.data?.data) {
      return {
        ...res.data.data,
        sifat_json: overrides.sifat_json,
        ...(overrides.disposisi ? { disposisi: { ...res.data.data.disposisi, ...overrides.disposisi } } : {}),
      };
    }
  }

  return {
    ...item,
    sifat_json: overrides.sifat_json,
    ...(overrides.disposisi ? { disposisi: { ...item.disposisi, ...overrides.disposisi } } : {}),
  };
}
