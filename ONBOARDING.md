# 🧠 BKSDA SuperApp — Onboarding untuk AI / Developer Baru

> **Baca dokumen ini SEBELUM mengerjakan apapun.**
> Dokumen ini berisi semua konteks yang dibutuhkan untuk memahami project dari nol.

---

## 1. Apa Ini?

**BKSDA SuperApp** adalah sistem informasi terintegrasi untuk Balai Konservasi Sumber Daya Alam (BKSDA) Kalimantan Timur. Satu aplikasi mengelola:

| Modul | Fungsi | Prefix Tabel |
|-------|--------|-------------|
| **CMS** | Website publik (berita, kawasan, galeri) | `cms_*` |
| **BMN** | Barang Milik Negara (aset pemerintah) | `bmn_*` |
| **Inventory** | Inventaris barang habis pakai | `inv_*` |
| **DeReporting** | Pelaporan & monitoring | `dr_*` |
| **Kepegawaian** | Manajemen SDM, Pegawai, Hak Akses IAM | `kpg_*` |
| **Surat Tugas** | Surat tugas pegawai | `st_*` |

---

## 2. Tech Stack

| Layer | Teknologi |
|-------|-----------|
| Frontend | Next.js 16 + React 19 + TypeScript + Tailwind CSS 4 + shadcn/ui |
| Backend | Laravel 11 (PHP 8.2) — Arsitektur Modular (`app/Modules/`) |
| Database | PostgreSQL via Supabase (Connection Pooler port 6543) |
| Storage | Supabase Storage (S3-compatible) via `SupabaseStorageService` |
| Auth | Laravel Sanctum — Bearer Token (7 hari expiry) |
| Deployment | Vercel (Frontend + Backend Serverless) |

---

## 3. Struktur Monorepo

```
e:\bksda-superapp\
├── frontend/              ← Next.js app
│   ├── src/app/           ← Pages (App Router)
│   ├── src/components/    ← UI components (shadcn/ui)
│   └── src/lib/           ← Utilities (api.ts, utils.ts)
│
├── backend/               ← Laravel API
│   ├── app/Modules/       ← Kepegawaian, BMN, Inventory, CMS, DeReporting
│   │   └── {Module}/
│   │       ├── Controllers/
│   │       ├── Models/
│   │       ├── Services/   (jika ada business logic)
│   │       └── routes.php
│   ├── app/Services/      ← SupabaseStorageService
│   ├── config/            ← cors.php, sanctum.php, filesystems.php, logging.php
│   ├── bootstrap/app.php  ← Middleware + Exception handler
│   └── vercel.json        ← Serverless deployment config
│
├── docs/issues/           ← 125 issue specifications (PANDUAN UTAMA!)
│   ├── 001-*.md ... 125-*.md
│   └── Setiap file = 1 task lengkap dengan kode, diagram, dan AI prompt
│
└── ONBOARDING.md          ← File ini
```

---

## 4. Referensi Kode Sumber

Project ini di-fork dari **`e:\superapp-inventory\`** yang sudah berjalan di production. Jika butuh referensi kode yang sudah jalan:

```
e:\superapp-inventory\
├── frontend/    ← Next.js yang sudah production (superapp-inventory.vercel.app)
└── backend/     ← Laravel yang sudah production (superapp-backend-dun.vercel.app)
```

**ATURAN:** Copy kode dari `superapp-inventory`, lalu sesuaikan:
- URL/domain: `superapp-inventory` → `bksda-superapp`
- Supabase project ID (jika berbeda)
- Nama project di `vercel.json`

---

## 5. Cara Kerja: Issue-Driven Development

Semua pekerjaan diatur via **125 issue specs** di `docs/issues/`. Setiap file berisi:

1. **Deskripsi** — Apa dan mengapa
2. **Acceptance Criteria** — Checklist "selesai"
3. **Kode lengkap** — Copy-paste ready
4. **Diagram** — Alur visual
5. **Troubleshooting** — Error yang sering muncul
6. **Git workflow** — Branch name, commit message, PR template
7. **AI Prompt** — Prompt untuk AI mengerjakan issue tersebut

### Fase-Fase Project

| Phase | Issue Range | Status | Deskripsi |
|-------|------------|--------|-----------|
| 1 | #001–#008 | ✅ Done | Project Init & Foundation (DB, Docker, IDE Helper) |
| 2 | #009–#021 | ✅ Done | IAM & Auth (Sanctum, Roles, Login UI) |
| 3 | #022–#034 | ✅ Done | Kepegawaian Module (Pegawai CRUD, Admin Layout, IAM) |
| 4 | #035–#045 | ✅ Done | Surat Tugas Module |
| 5 | #046–#059 | ✅ Done | Inventory Module |
| 6 | #060–#076 | ✅ Done | BMN Module |
| 7 | #077–#090 | 📋 Spec | DeReporting Module |
| 8 | #091–#108 | 📋 Spec | CMS Module (Public Web & Admin) |
| 9 | #109–#115 | ✅ Done | UI Components & Utilities |
| 10 | #116–#125 | ✅ Done | DevOps & Deployment |

> **Phase 1–3, 9, 10 sudah selesai.** Phase 4–8 belum diimplementasi.

### 🎨 PENTING: Standar Kualitas Frontend (UI Overhaul)
Setiap kali sebuah Phase (misalnya Phase 2, Phase 3, dst) selesai dikerjakan berdasarkan urutan Issue-nya, **WAJIB** melakukan pengecekan ulang terhadap *Frontend* referensi di `e:\superapp-inventory\`. 

Jika UI yang dihasilkan dari instruksi Issue masih terlalu "basic", kita akan membuat **Issue baru terpisah** (contoh: *Issue Phase 1 FE Overhaul*) yang khusus berfokus untuk merombak tampilan UI agar sebagus dan semewah versi `superapp-inventory`. 

Dalam melakukan *UI Overhaul*, aturan ini mutlak:
1. Tampilan harus sama premium/bagusnya dengan `superapp-inventory`.
2. **TETAP** mempertahankan *Best Practices* dan *Clean Code* aplikasi ini (tidak asal *copy-paste* kode kotor).
3. Kode harus tetap mudah dipahami oleh *Junior Developer* dan AI model yang lebih ringan.

### ✅ MANDATORY: End-of-Phase Checklist

Setiap kali **satu Phase selesai**, AI **WAJIB** melakukan semua langkah berikut **SEBELUM** melanjutkan ke Phase berikutnya:

| # | Langkah | Detail |
|---|---------|--------|
| 1 | **IDE Warning Check** | Jalankan `npm run lint`, `npm run build`, dan periksa PHP warnings. **HARUS 0 error/warning.** Jika ada, perbaiki dulu. |
| 2 | **UI Comparison** | Bandingkan tampilan frontend dengan referensi `e:\superapp-inventory\`. Jika masih *basic*, buat Issue "Phase X UI Overhaul". |
| 3 | **GitHub Issues** | Pastikan SEMUA issue di Phase tersebut sudah ada di GitHub dan berstatus **CLOSED**. |
| 4 | **GitHub PRs** | Setiap issue HARUS punya branch → PR → merge. **DILARANG** commit langsung ke main tanpa PR. |
| 5 | **Update HANDOFF.md** | Catat progress terakhir, timestamp, model, dan issue selanjutnya. |
| 6 | **Update ONBOARDING.md** | Update tabel Phase Status dari `📋 Spec` menjadi `✅ Done`. |
| 7 | **Push ke GitHub** | Commit dan push semua perubahan dokumentasi. |

> ⚠️ **JIKA ADA LANGKAH YANG TERLEWAT, PHASE BELUM DIANGGAP SELESAI!**

---

## 6. Rules Project (WAJIB DIIKUTI)

File rules lengkap ada di workspace (`rules.md`), ringkasan kunci:

| Rule | Detail |
|------|--------|
| **Auth** | Semua endpoint WAJIB `auth:sanctum`, kecuali yang eksplisit public |
| **Model** | Gunakan `$fillable`, BUKAN `$guarded = []` |
| **Pagination** | Semua list endpoint WAJIB pagination — DILARANG `Model::all()` |
| **Response** | Format: `{ data, message?, meta? }` untuk sukses, `{ error, message }` untuk gagal |
| **File Upload** | Nama unik (UUID), simpan di private storage, akses via signed URL |
| **Frontend** | Semua API call via `lib/api.ts`, tidak boleh ada business logic di frontend |
| **Modular** | Setiap fitur di `app/Modules/{Nama}/` dengan Controllers, Models, routes.php |

---

## 7. Environment Variables Kunci

### Backend (.env)

| Variable | Dev Value | Prod Value |
|----------|-----------|------------|
| `APP_DEBUG` | `true` | **`false`** |
| `DB_CONNECTION` | `pgsql` | `pgsql` |
| `DB_PORT` | `5432` | `6543` (pooler!) |
| `SESSION_DRIVER` | `database` | `array` (Vercel!) |
| `LOG_CHANNEL` | `stack` | `stderr` (Vercel!) |
| `FRONTEND_URL` | `http://localhost:3000` | `https://bksda-superapp.vercel.app` |

### Frontend (.env.local)

| Variable | Dev Value | Prod Value |
|----------|-----------|------------|
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000` | `https://backend-bksda.vercel.app` |
| `NEXT_PUBLIC_STORAGE_URL` | — | `https://xxx.supabase.co/storage/v1/object/public/cms` |

---

## 8. Cara Mulai Mengerjakan Issue

**PENTING**: Jika kamu akan mengerjakan fitur/bug baru di luar flow utama (Phase 1-125) yang belum ada tiket isunya, kamu **WAJIB** membuat issue terlebih dahulu di GitHub!

```bash
# 0. Buat Issue di GitHub (jika belum ada)
gh issue create --title "nama fitur/bug" --body "deskripsi spec"

# 1. Baca issue spec (jika sudah ada)
# Gunakan view_file atau command lain yang spesifik

# 2. Buat branch
git checkout -b issue/XXX-nama-issue

# 3. Kerjakan sesuai spec & periksa IDE warnings

# 4. MINTA KONFIRMASI KE USER SEBELUM LANJUT! (Kecuali Issue Utama Phase 1-125)
# Tunggu user bilang "Lanjutkan" atau "Oke".

# 5. Commit + Push (Setelah dikonfirmasi)
git commit -m "feat(module): deskripsi singkat (#XXX)"
git push -u origin issue/XXX-nama-issue

# 6. Buat PR & Merge
gh pr create --title "feat(module): deskripsi (#XXX)" --base main
gh pr merge <PR_NUMBER> --merge --delete-branch
```

---

## 9. File Penting yang Harus Dibaca Pertama

Jika waktu terbatas, baca 5 file ini:

1. `docs/issues/116-backend-cors-sanctum-config.md` — Fondasi keamanan
2. `docs/issues/119-frontend-nextjs-config.md` — Fondasi frontend
3. `docs/issues/122-deployment-vercel-backend.md` — Cara deploy backend
4. `docs/issues/123-deployment-supabase-db-setup.md` — Setup database
5. `docs/issues/125-documentation-api-docs-readme.md` — Daftar API endpoint
