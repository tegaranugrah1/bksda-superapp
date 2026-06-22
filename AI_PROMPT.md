# 🤖 AI Prompt Template — BKSDA SuperApp

> **Cara Pakai:** Copy salah satu prompt di bawah ke chat baru.
> Ganti `XXX` dengan nomor issue yang ingin dikerjakan.

---

## Prompt 1: Onboarding (Paste di Awal Chat Baru)

Paste ini SEKALI di awal chat baru agar AI paham konteks:

```
Saya sedang mengerjakan project BKSDA SuperApp.
Baca file ONBOARDING.md di root project untuk memahami arsitektur dan konteks lengkap.
Project ini adalah monorepo (frontend Next.js + backend Laravel) yang di-fork dari e:\superapp-inventory\.
Semua task didokumentasikan di docs/issues/ (125 issue specs).
Rules project ada di file rules.md.
Jika mengerjakan fitur BMN Auction Batches / Paket Dokumen Lelang BMN, gunakan git workflow profesional: jangan buat PR task langsung ke main. Gunakan branch integrasi develop/bmn-auction, buat branch task dari sana, dan arahkan semua task PR ke develop/bmn-auction. Main hanya menerima 1 PR final setelah semua task selesai dan lolos test lokal.
```

---

## Prompt 2: Mengerjakan Issue Spesifik

Setelah onboarding, gunakan prompt ini untuk mengerjakan issue:

```
Kerjakan Issue #XXX.
Baca instruksi lengkap di: docs/issues/XXX-nama-file.md
Referensi kode sumber yang sudah jalan ada di: e:\superapp-inventory\
Ikuti rules.md, gunakan clean code, dan buat kode yang mudah dipahami.
Jalankan git workflow sesuai yang tertulis di issue spec.
Khusus jika issue/task terkait BMN Auction Batches, override base PR menjadi develop/bmn-auction, bukan main.
```

---

## Prompt 3: Melanjutkan dari Phase Tertentu

```
Project BKSDA SuperApp — baca ONBOARDING.md dulu.

STATUS SAAT INI:
- Phase 9 (UI Components): ✅ Selesai (docs/issues/109-115)
- Phase 10 (DevOps): ✅ Selesai (docs/issues/116-125)
- Phase 1 (Project Init): ⏳ Belum mulai

Lanjutkan dari Issue #XXX.
Baca spec di docs/issues/XXX-*.md dan kerjakan step by step.
Referensi kode: e:\superapp-inventory\ (sudah production).
```

---

## Prompt 4: Review / Debug

```
Baca ONBOARDING.md untuk konteks project.
Saya menemukan error: [jelaskan error].
File terkait: [path file].
Cek troubleshooting di docs/issues/ yang relevan.
Referensi kode yang jalan: e:\superapp-inventory\.
```

---

## Prompt 5: Membuat Issue Spec Baru

```
Baca ONBOARDING.md untuk konteks project.
Lihat contoh format issue di docs/issues/116-backend-cors-sanctum-config.md.
Buatkan issue spec untuk: [deskripsi fitur baru].
Format harus sama: deskripsi, acceptance criteria, kode, diagram, troubleshooting, git workflow, AI prompt.
Harus detail, clean code, best practice, dan bisa dipahami AI model murah atau junior programmer.
```

---

## Daftar Issue Specs yang Tersedia

### Phase 9: UI Components (docs only)
| File | Topik |
|------|-------|
| `109-frontend-interactive-kawasan-map.md` | Peta interaktif Leaflet |
| `110-frontend-shadcn-base-components.md` | 23 komponen shadcn/ui |
| `111-frontend-dialog-overlay-guide.md` | Dialog, Sheet, Popover |
| `112-frontend-data-display-guide.md` | Table CRUD + Pagination |
| `113-frontend-form-components-guide.md` | Form patterns |
| `114-frontend-custom-components-guide.md` | EmployeeSelect, RichTextEditor, Toaster |
| `115-frontend-utility-functions.md` | lib/ utilities |

### Phase 10: DevOps & Deployment (docs only)
| File | Topik |
|------|-------|
| `116-backend-cors-sanctum-config.md` | CORS + Sanctum auth |
| `117-backend-logging-error-handling.md` | Audit log + error handler |
| `118-backend-storage-config.md` | Supabase Storage service |
| `119-frontend-nextjs-config.md` | Rewrites, headers, images |
| `120-frontend-error-pages.md` | 404, error, global-error |
| `121-deployment-vercel-frontend.md` | Vercel FE deploy |
| `122-deployment-vercel-backend.md` | Vercel BE serverless |
| `123-deployment-supabase-db-setup.md` | Supabase PostgreSQL |
| `124-seed-data.md` | Database seeders |
| `125-documentation-api-docs-readme.md` | README + API docs |

---

## Prompt 6: Token Habis di Tengah Jalan (RECOVERY)

Jika AI kehabisan token di tengah mengerjakan issue, paste ini ke chat BARU:

```
Saya sedang mengerjakan project BKSDA SuperApp.

PENTING — BACA FILE-FILE INI DULU SEBELUM MELAKUKAN APAPUN:
1. ONBOARDING.md — Konteks arsitektur project.
2. docs/HANDOFF.md — Progress terakhir, issue mana yang sedang/sudah dikerjakan.

AI sebelumnya KEHABISAN TOKEN di tengah mengerjakan task.
Tugasmu:
1. Baca docs/HANDOFF.md untuk tahu posisi terakhir.
2. Cek branch git aktif dengan `git status` dan `git log --oneline -5`.
3. Cek file mana yang sudah diubah dengan `git diff --stat`.
4. Lanjutkan dari titik terakhir, JANGAN mulai ulang dari awal.
5. Setelah selesai, UPDATE docs/HANDOFF.md dengan progress terbaru.
6. Referensi kode production: e:\superapp-inventory\

ATURAN:
- JANGAN ulangi langkah yang sudah selesai (cek HANDOFF.md).
- Jika ragu, tanya saya sebelum mengerjakan.
- Sebelum sesi ini berakhir, WAJIB update docs/HANDOFF.md.
```

---

## Tips Mencegah Kehilangan Progress

| Situasi | Solusi |
|---------|--------|
| Token hampir habis | Minta AI: *"Update HANDOFF.md sekarang sebelum token habis"* |
| AI mulai lambat/repetitif | Itu tanda token menipis — segera minta update HANDOFF.md |
| Mau ganti model AI | Minta AI lama update HANDOFF.md dulu, baru buka chat baru |
| Issue terlalu besar | Pecah jadi sub-task, minta AI commit per langkah |
