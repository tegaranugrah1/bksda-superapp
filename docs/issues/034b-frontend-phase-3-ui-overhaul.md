# Issue Spec: Phase 3 UI Overhaul (Kepegawaian Module)

## 1. Deskripsi Singkat
Melakukan perombakan (overhaul) antarmuka pengguna (UI) untuk Modul Kepegawaian (Phase 3) agar setara dengan standar estetika premium dan *glassmorphism* yang ada di `superapp-inventory`. Fokus utama adalah mempercantik tampilan Admin Layout (Sidebar, Topbar), Portal Hub, Employee List, dan Employee Create Form.

## 2. Acceptance Criteria
- [ ] **Admin Layout (Sidebar & Topbar)** memiliki efek *glassmorphism* yang elegan, *active state* yang jelas, dan animasi hover yang mulus.
- [ ] **Portal Dashboard (`/page.tsx`)** menampilkan grid modul dengan desain kartu (card) yang interaktif, gradien warna halus, dan animasi masuk (staggered entrance).
- [ ] **Employee List (`/kepegawaian/page.tsx`)** memiliki tabel data bergaya premium dengan *sticky header*, efek hover pada baris, dan komponen badge untuk status aktif/non-aktif.
- [ ] **Employee Create Form (`/kepegawaian/create/page.tsx`)** menggunakan layout *split-screen* atau *card-based* yang rapi, *input field* dengan *focus ring* yang menarik, dan area *drag-and-drop* atau preview gambar foto profil yang cantik.
- [ ] Semua komponen tetap mematuhi prinsip *Clean Code* (mudah dibaca, dikelola, dan ramah AI murah/Junior Developer).
- [ ] Tidak ada warning linting atau typescript setelah perombakan.

## 3. Scope Perubahan (Files)
- `frontend/src/app/(dashboard)/layout.tsx`
- `frontend/src/components/layout/sidebar.tsx`
- `frontend/src/components/layout/topbar.tsx`
- `frontend/src/app/(dashboard)/page.tsx`
- `frontend/src/app/(dashboard)/kepegawaian/page.tsx`
- `frontend/src/app/(dashboard)/kepegawaian/create/page.tsx`

## 4. Troubleshooting & Best Practices
- **Hydration Errors:** Pastikan komponen yang menggunakan status otentikasi sisi klien (seperti nama pengguna di Topbar) melakukan *render* dengan benar tanpa bentrok dengan server render.
- **Tailwind v4 Canonical Classes:** Gunakan kelas Tailwind v4 (seperti `bg-linear-to-*` alih-alih `bg-gradient-to-*`) untuk menghindari warning.
- **Konsistensi Warna:** Gunakan skema warna bawaan `zinc`, `emerald`, dan warna spesifik brand yang telah ditetapkan di `globals.css`.

## 5. Git Workflow
```bash
git checkout -b issue/034b-frontend-phase-3-ui-overhaul
# Kerjakan perubahan
npm run lint && npm run build
git add .
git commit -m "refactor: phase 3 ui overhaul for kepegawaian module (#034b)"
git push -u origin issue/034b-frontend-phase-3-ui-overhaul
gh pr create --title "refactor: phase 3 ui overhaul for kepegawaian module (#034b)" --base main
```

## 6. Prompt untuk AI
> "Kerjakan issue 034b. Rombak tampilan antarmuka (UI) untuk modul Kepegawaian (Admin Layout, Portal, Daftar Pegawai, dan Form Tambah Pegawai) agar terlihat sangat premium dengan sentuhan *glassmorphism* sesuai spesifikasi referensi `superapp-inventory`. Pertahankan kode yang *clean* dan mudah dibaca. Jalankan `npm run lint` dan perbaiki semua peringatan sebelum push."
