# Tasks — Issue #581: Optimasi Request Storming & Latensi API

> **Issue**: #581
> **Dokumen Terkait**: `requirements.md`, `design.md`

---

## Daftar Tugas

- [ ] **1. Implementasi In-Flight Deduplication & Throttling di `src/lib/api.ts`**:
  - [ ] Implementasikan deduplikasi *in-flight* untuk request `GET` yang identik.
  - [ ] Implementasikan *short-term TTL cache* (3 detik) untuk mencegah burst duplicate GET requests.
  - [ ] Bersihkan cache saat ada mutasi (`POST`, `PUT`, `DELETE`).
- [ ] **2. Optimasi Event Listener di `src/app/portal/page.tsx`**:
  - [ ] Tambahkan throttling minimal 30 detik pada event `focus` dan `visibilitychange`.
  - [ ] Cegah loop re-render pada `authStore.updateUser`.
- [ ] **3. Optimasi `src/lib/auth-store.ts`**:
  - [ ] Tambahkan pengecekan identitas user JSON sebelum broadcast `auth-change`.
- [ ] **4. Validasi & Pengujian**:
  - [ ] Verifikasi pengurangan frekuensi request di log dev server.
  - [ ] Uji responsivitas navigasi tab dan modul portal.
  - [ ] Jalankan ESLint.
