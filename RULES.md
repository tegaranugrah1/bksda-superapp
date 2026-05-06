# BKSDA SuperApp — Project Rules

> Semua development **wajib** mengikuti aturan ini tanpa pengecualian.
> File ini adalah single source of truth untuk coding standards.

---

## 1. Security Rules

| # | Rule |
|---|------|
| 1.1 | Semua endpoint **wajib** `auth:sanctum`, kecuali yang **eksplisit public** |
| 1.2 | Endpoint public hanya boleh: login, public form submit, tracking status, master data read-only |
| 1.3 | Jangan pernah gunakan `$guarded = []` — harus pakai `$fillable` |
| 1.4 | Selalu sanitasi input user di controller sebelum `create()`/`update()` |
| 1.5 | Password harus di-hash via `casts` (`'password' => 'hashed'`) |
| 1.6 | Token Sanctum wajib diterapkan di semua modul |
| 1.7 | Jangan expose stack trace / error detail di production (`APP_DEBUG=false`) |

---

## 2. Access Control Rules

| # | Rule |
|---|------|
| 2.1 | User hanya boleh akses modul yang ada di `access_modules` |
| 2.2 | Validasi `access_modules` harus dilakukan di **middleware level**, bukan di frontend saja |
| 2.3 | Role `super_admin` boleh akses semua modul |
| 2.4 | Setiap user harus punya minimal 1 default module |
| 2.5 | Operasi CRUD pada master data hanya boleh dilakukan oleh `admin` atau `super_admin` |

---

## 3. Database Rules

| # | Rule |
|---|------|
| 3.1 | Semua list endpoint **wajib pagination** — jangan `Model::all()` |
| 3.2 | Gunakan eager loading untuk mencegah N+1 query |
| 3.3 | Foreign key harus di-index di migration |
| 3.4 | Hindari `SELECT *` — gunakan `->select()` di query berat |
| 3.5 | Semua write operation harus di-log: `user_id`, `timestamp`, `action` |
| 3.6 | Model yang punya relasi **wajib soft delete** |
| 3.7 | Nama tabel module harus ber-prefix: `kpg_`, `st_`, `bmn_`, `inv_`, `dr_`, `cms_` |
| 3.8 | Multi-step write operation **wajib** pakai `DB::transaction()` untuk data consistency |
| 3.9 | Setiap migration harus bisa di-rollback (`down()` method wajib ada) |

---

## 4. File Upload Rules

| # | Rule |
|---|------|
| 4.1 | Validasi file type secara strict (MIME + extension) |
| 4.2 | Batasi ukuran file (max 10 MB default, configurable) |
| 4.3 | Generate nama file unik (UUID/hash), jangan pakai nama asli |
| 4.4 | Simpan upload di **private storage** (`storage/app/private/`) |
| 4.5 | Akses file lewat signed URL atau endpoint dengan auth check |
| 4.6 | Log IP uploader untuk file dari public form |

---

## 5. API Response Rules

| # | Rule |
|---|------|
| 5.1 | Format response konsisten: `{ data, message?, meta? }` |
| 5.2 | Error response: `{ error, message, code? }` |
| 5.3 | List endpoint wajib return `meta` pagination: `{ current_page, last_page, per_page, total }` |
| 5.4 | HTTP status code harus sesuai: `200` OK, `201` Created, `422` Validation, `403` Forbidden, `404` Not Found |
| 5.5 | Jangan return data sensitif (password, token, internal ID yang tidak perlu) |
| 5.6 | Response wajib lewat **API Resource** (`JsonResource` / `ResourceCollection`), jangan return model langsung |
| 5.7 | Custom **Exception Handler** untuk error format yang konsisten di seluruh API |

---

## 6. Module-Specific Rules

### 6.1 Kepegawaian Module
- Employee data bersifat **global** (dipakai oleh semua modul)
- Tidak boleh hard-delete employee yang masih punya record aktif
- Employee harus support status `is_active`
- User–Employee linked via `username` ↔ `nip`
- Tabel prefix: `kpg_`
- API prefix: `/api/kepegawaian/`

### 6.2 Surat Tugas Module
- Surat tugas bisa dibuat oleh admin atau submit publik
- Setiap ST harus referensi `employee_id` (siapa yang ditugaskan)
- Support soft delete & restore
- Tabel prefix: `st_`
- API prefix: `/api/surat-tugas/`

### 6.3 BMN Module (Barang Milik Negara)
- Setiap asset harus punya `kode_barang` yang **unik**
- Perubahan status asset harus buat **history record** (`AssetUpdate`)
- Peminjaman (`AssetLoan`) wajib referensi `employee_id`
- Pengembalian harus update status dan close loan record
- Penghapusan asset hanya **soft delete**
- Photo upload harus validasi file type (`jpg`, `png`, `webp`) dan max size

### 6.4 Inventory Module
- Setiap perpindahan stok **wajib** buat `StockTransaction` record
- Stok **tidak boleh** di bawah 0 (validasi sebelum `stockOut`)
- Peminjaman harus referensi `employee_id` (siapa yang pinjam)
- Import data harus validasi format kolom sebelum insert

### 6.5 DeReporting Module
- Public upload endpoint (laporan eksternal) harus:
  - Rate limiting (max 10 request/menit per IP)
  - Validasi file type strict
  - Log IP address pengirim
- Internal report wajib attach `user_id` sebagai uploader
- Master data (Tahun, Bidang, Jenis, dll.) read endpoint boleh public, tapi write **harus auth**
- File laporan disimpan di private storage, akses via signed URL

### 6.6 CMS Module
- Content harus punya `slug` untuk SEO-friendly URL
- Image upload ke Supabase Storage bucket `cms`
- Admin endpoint wajib `auth:sanctum` + `role:admin,super_admin`
- Public endpoint untuk read-only (tanpa auth)

---

## 7. Frontend Rules

| # | Rule |
|---|------|
| 7.1 | **Tidak boleh** ada business logic di frontend — hanya presentasi & validasi form |
| 7.2 | Semua API call harus lewat `lib/api.ts` (axios instance dengan token interceptor) |
| 7.3 | Semua halaman admin harus cek auth state — redirect ke login jika tidak ada token |
| 7.4 | Form validation harus ada di **kedua sisi** (frontend + backend) |
| 7.5 | Gunakan `useMemo` / `useCallback` untuk menghindari re-render yang tidak perlu |
| 7.6 | Semua list view harus pagination — jangan render semua data sekaligus |
| 7.7 | **Dilarang** pakai type `any` — semua harus typed eksplisit |
| 7.8 | Default **Server Component** — hanya tambah `"use client"` jika butuh interactivity (state, event, hooks) |
| 7.9 | Setiap route folder **wajib** ada `loading.tsx` untuk skeleton/loading state |
| 7.10 | Semua gambar wajib pakai `<Image>` dari `next/image`, bukan `<img>` |
| 7.11 | Logik reusable harus di-extract ke custom hook `hooks/useXxx.ts` |
| 7.12 | Semua halaman CMS public di dalam route group `(website)/`, hanya landing di root |

---

## 8. Architecture Rules

| # | Rule |
|---|------|
| 8.1 | Semua fitur baru **wajib** ikuti struktur modular (`app/Modules/{ModuleName}/`) |
| 8.2 | Setiap modul harus punya: `Controllers/`, `Models/`, `Routes/`, `Migrations/`, `Requests/`, `Resources/`, `ServiceProvider` |
| 8.3 | Route module di-register via `ServiceProvider` dengan prefix `api/{module-name}` |
| 8.4 | Jangan letakkan logic di route file — gunakan Controller |
| 8.5 | Service class untuk business logic kompleks (contoh: `InventoryService`) |
| 8.6 | Seeding data test di `Database/Seeders/` dalam modul masing-masing |
| 8.7 | Auth (login/logout/me) **bukan modul** — ditangani langsung di `app/Http/Controllers/` |
| 8.8 | Controller harus **thin** — hanya: validate (FormRequest) → call service → return resource |
| 8.9 | Setiap endpoint POST/PUT/PATCH **wajib** pakai `FormRequest` class untuk validasi |
| 8.10 | Semua response **wajib** lewat `API Resource` class (`JsonResource`) |
| 8.11 | Status values **wajib** pakai **PHP Enum** (PHP 8.3), bukan magic string |
| 8.12 | Semua method harus punya **return type hint** (`: JsonResponse`, `: void`, `: Collection`) |
| 8.13 | Semua method dan class harus punya **PHPDoc** untuk method kompleks |

---

## 9. Development Workflow Rules

| # | Rule |
|---|------|
| 9.1 | Prioritaskan **keamanan** di atas kecepatan |
| 9.2 | Minimalisir database load |
| 9.3 | Hindari cloud cost yang tidak perlu |
| 9.4 | Setiap PR harus review security checklist |
| 9.5 | Naming convention: `snake_case` untuk DB column, `camelCase` untuk JS/TS variable |
| 9.6 | Git workflow: issue → branch → work → commit → PR → merge → delete branch |
| 9.7 | Commit message format: `{type}: {message} (#{issue_number})` |
| 9.8 | Types: `feat`, `fix`, `chore`, `docs`, `refactor`, `test` |
| 9.9 | **Backend formatting**: wajib pakai **Laravel Pint** (`./vendor/bin/pint`) sebelum commit |
| 9.10 | **Frontend formatting**: wajib pakai **ESLint** + **Prettier** — auto format on save |
| 9.11 | **Dilarang hardcode string** untuk status/label/option — pakai Enum (BE) atau `constants.ts` (FE) |
| 9.12 | Setiap PR harus memastikan **no lint errors** dan **no TypeScript errors** |

---

## 10. Infrastructure Rules

| # | Rule |
|---|------|
| 10.1 | **Development lokal**: `php artisan serve` (BE) + `npm run dev` (FE) — BUKAN Docker |
| 10.2 | **Docker hanya untuk database**: PostgreSQL 15 via `docker compose up -d` |
| 10.3 | **Deployment Phase 1**: Supabase (DB) + Vercel (FE deploy) + Vercel (BE deploy) |
| 10.4 | **Deployment Phase 2** (kedepannya): VPS sendiri dengan Docker Compose full |
| 10.5 | Frontend dan Backend di-deploy sebagai **2 project Vercel terpisah** |
| 10.6 | Environment variables **tidak boleh hardcode** — selalu dari `.env` |
| 10.7 | File storage production menggunakan **Supabase Storage** (S3-compatible) |

---

## 11. AI Model Usage Rules

| # | Rule |
|---|------|
| 11.1 | Setiap issue MD harus punya section `🤖 AI Prompt` untuk model switching |
| 11.2 | Sebelum pindah AI model: **commit & push** dulu |
| 11.3 | Jangan pindah model di tengah issue — selesaikan atau commit WIP |
| 11.4 | Wajib update `docs/HANDOFF.md` saat mulai & selesai mengerjakan issue |
| 11.5 | Model murah (Flash/Kimi/Ollama) untuk task simple, model mahal (Opus) untuk task complex |
| 11.6 | Jika token habis: commit WIP → update HANDOFF.md → gunakan Recovery Prompt |
