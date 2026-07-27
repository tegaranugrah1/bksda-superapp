import api from "@/lib/api";
import type { SuratKeluar, SuratMasuk } from "./surat-types";

export async function fetchSuratMasukList(params?: { search?: string; sifat?: string; page?: number }) {
  const res = await api.get("/surat/surat-masuk", { params });
  return res.data;
}

export async function fetchSuratMasukDetail(id: number | string) {
  const res = await api.get(`/surat/surat-masuk/${id}`);
  return res.data;
}

export async function createSuratMasuk(formData: FormData) {
  const res = await api.post("/surat/surat-masuk", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
}

export async function updateSuratMasuk(id: number | string, formData: FormData) {
  const res = await api.post(`/surat/surat-masuk/${id}?_method=PUT`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
}

export async function deleteSuratMasuk(id: number | string) {
  const res = await api.delete(`/surat/surat-masuk/${id}`);
  return res.data;
}

export async function fetchSuratKeluarList(params?: { search?: string; page?: number }) {
  const res = await api.get("/surat/surat-keluar", { params });
  return res.data;
}

export async function fetchSuratKeluarDetail(id: number | string) {
  const res = await api.get(`/surat/surat-keluar/${id}`);
  return res.data;
}

export async function createSuratKeluar(formData: FormData) {
  const res = await api.post("/surat/surat-keluar", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
}

export async function deleteSuratKeluar(id: number | string) {
  const res = await api.delete(`/surat/surat-keluar/${id}`);
  return res.data;
}
