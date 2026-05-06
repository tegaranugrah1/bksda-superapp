# Issue #016 — Frontend — API Client (`lib/api.ts`)

> **Type**: `feature`
> **Labels**: `frontend`, `api`, `architecture`
> **Priority**: 🔴 Critical (gerbang penghubung antara Next.js dan Laravel API)
> **Complexity**: 🟡 Medium (Setup Axios Instance & Interceptors)
> **Recommended AI Model**: Claude Sonnet / Gemini 2.5 Flash / Ollama
> **Dependencies**: Issue #005 (Frontend Scaffold) dan #011 (Backend Auth Controller)

---

## Branch

```
issue/016-frontend-api-client
```

## Deskripsi

Sesuai **Rule 7.2**, tidak boleh ada komponen atau halaman *frontend* yang melakukan panggilan API langsung menggunakan `fetch()` atau memanggil URL *backend* secara *hardcode* berulang kali. Semua request harus melewati satu gerbang utama, yaitu `lib/api.ts`.

**Apa yang dilakukan:**
1. Menginstal pustaka `axios`.
2. Membuat "Axios Instance" yang sudah terkonfigurasi dengan Base URL.
3. Memasang **Request Interceptor** untuk otomatis menyisipkan *Sanctum Bearer Token* ke setiap permintaan.
4. Memasang **Response Interceptor** untuk mendeteksi *Error 401 (Unauthenticated)* secara otomatis agar *user* ditendang (redirect) ke halaman login (Sesuai Rule 7.3).

**Apa yang TIDAK dilakukan:**
- ❌ Tidak membuat komponen UI apa pun. Ini murni pembuatan *library helper*.

---

## Acceptance Criteria

- [ ] Package `axios` telah ditambahkan di `package.json`.
- [ ] File `src/lib/api.ts` berhasil dibuat.
- [ ] API URL menggunakan *environment variable* `NEXT_PUBLIC_API_URL`.
- [ ] Memiliki logika untuk membaca token dari `localStorage`.
- [ ] Jika merespon `401 Unauthorized`, sistem otomatis menghapus token di *storage* dan me-redirect layar ke `/login`.

---

## Langkah Demi Langkah

> 💡 **Untuk junior/AI**: Gunakan pola *Axios Interceptors* di bawah ini. Pastikan kamu paham perbedaan antara *Request Interceptor* (sebelum berangkat ke Laravel) dan *Response Interceptor* (setelah balasan dari Laravel tiba).

### Langkah 1: Install Axios

**Kenapa?** Meskipun Next.js punya fungsi `fetch` bawaan, Axios jauh lebih unggul untuk mengatur *interceptors* (menyelipkan token secara otomatis dan menangkap error secara global) tanpa harus menulis ulang logika `if-else` di setiap halaman.

```bash
cd e:\bksda-superapp\frontend

npm install axios
```

---

### Langkah 2: Setup Variabel Lingkungan (.env)

**Kenapa?** URL Backend bisa berubah-ubah. Di lokal mungkin `localhost:8000`, tapi di *production* mungkin `api.bksda.go.id`. Tidak boleh di-hardcode.

**Path:** `e:\bksda-superapp\frontend\.env.local`

**Buat atau edit file ini (tambahkan di baris paling bawah):**

```env
# Alamat URL Backend Laravel (jangan lupa akhiri tanpa garis miring /)
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

---

### Langkah 3: Buat File `lib/api.ts` (Clean Code)

**Kenapa?** File inilah yang akan selalu di-import oleh semua *hooks* atau *page* saat ingin mengambil data master, inventaris, dsb. Kita menggunakan `localStorage` untuk menyimpan Sanctum Token (karena mode autentikasinya adalah API Token mode).

**Path:** `e:\bksda-superapp\frontend\src\lib\api.ts`

**Buat file baru tersebut, isikan kode ini:**

```typescript
import axios from 'axios';

// 1. Buat Instance Axios dengan Base URL bawaan
export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// 2. REQUEST INTERCEPTOR: Menyelipkan Token
api.interceptors.request.use(
  (config) => {
    // Pastikan kode hanya berjalan di browser (Client-Side), bukan di server Next.js (SSR)
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('bksda_token');
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 3. RESPONSE INTERCEPTOR: Menangani Error 401 & 403 (Sesuai Rule 7.3)
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Tangkap kode HTTP dari error balasan Laravel
    const status = error.response?.status;

    if (status === 401) {
      // 401 Unauthenticated: Token habis / tidak valid. 
      // Hapus token dan tendang user ke halaman login.
      if (typeof window !== 'undefined') {
        localStorage.removeItem('bksda_token');
        localStorage.removeItem('bksda_user'); // (opsional) menghapus identitas profil
        
        // Jangan redirect jika posisinya memang sudah di /login
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }
    } else if (status === 403) {
      // 403 Forbidden: User login, tapi tidak punya hak akses ke modul tertentu
      console.error('Forbidden: Hak akses ditolak.');
      // Untuk 403, cukup log error saja. Frontend UI yang menembak fungsi ini 
      // akan menampilkan Toast/Alert dengan membaca message dari error.
    }

    return Promise.reject(error);
  }
);
```

**Penjelasan Gaya Clean Code:**
- Kita membungkus pengecekan `localStorage` dengan `if (typeof window !== 'undefined')`. Ini karena Next.js juga me-render kode di *Server-Side*. Di server, object `window` dan `localStorage` itu tidak ada (akan menyebabkan *Fatal Error*). Kondisi if tersebut mencegah Next.js menabrak tembok saat pertama kali di-compile.

---

## Troubleshooting

### Q: `npm run dev` error: `Module not found: Can't resolve 'axios'`

**Artinya:** Proses `npm install` gagal atau tidak dijalankan di folder yang benar.
**Solusi:** Pastikan kamu berada di dalam folder `frontend/` (bukan root BKSDA) saat menjalankan perintah `npm install axios`.

### Q: Kenapa API selalu mengambil URL `http://localhost:8000/api` padahal di `.env.local` sudah diganti?

**Artinya:** Next.js masih menge-*cache* environment variables versi lama.
**Solusi:** Matikan terminal server Next.js (Tekan `Ctrl+C`), kemudian jalankan ulang `npm run dev`. Environment file hanya dibaca ulang saat server direstart.

### Q: Saat hit API, saya mendapat `Error 422 (Unprocessable Entity)`

**Artinya:** Konfigurasi axios sudah benar dan berhasil sampai ke Laravel, tetapi data (payload) yang kamu kirim tidak lulus validasi *FormRequest* backend.
**Solusi:** Cek kembali struktur JSON / isi formulir yang kamu kirim, pastikan sesuai dengan ekspektasi endpoint tujuan. Axios-mu tidak salah.

---

## Git Workflow (Professional)

### Step 1: Buat Issue di GitHub

```bash
cd e:\bksda-superapp

gh issue create \
  --title "feat: frontend api client interceptor" \
  --body "Setup library Axios dengan sentralisasi header dan auto-redirect 401. Detail di docs/issues/016-frontend-api-client.md" \
  --label "frontend,api,architecture"
```

### Step 2: Buat Branch

```bash
git checkout main
git pull origin main
git checkout -b issue/016-frontend-api-client
```

### Step 3: Kerjakan

Jalankan `npm install`, buat folder `lib` bila belum ada, dan kopas *(copy-paste)* kode API Client. Tambahkan variabel di `.env.local`.

### Step 4: Commit & Push

```bash
cd e:\bksda-superapp
git add frontend/
git commit -m "feat: frontend api client interceptor (#16)"
git push -u origin issue/016-frontend-api-client
```

### Step 5: Buat Pull Request

```bash
gh pr create \
  --title "feat: frontend api client interceptor (#16)" \
  --body "## Summary
Menambahkan sentralisasi Axios instance untuk komunikasi client-server yang stabil.

## Changes
- Menambah package axios.
- File \`src/lib/api.ts\` untuk menampung *interceptors*.
- Ekstraksi token Bearer otomatis dari \`localStorage\`.
- Mekanisme Logout Otomatis jika status 401 terdeteksi.

## Verification
- [x] Linter/Typescript compiler Next.js lolos (tidak ada *any* atau *undefined window* crash).

## Rules Compliance
- [x] Rule 7.2: Semua pemanggilan API menggunakan sentralisasi \`lib/api.ts\`.
- [x] Rule 7.3: Redirection ke login jika state \`401\` otomatis tereksekusi.

Closes #16" \
  --base main
```

### Step 6: Merge & Sync

```bash
gh pr merge --squash --delete-branch
git checkout main
git pull origin main
```

---

## 🤖 AI Prompt

````
## Context

Project: bksda-superapp (monorepo)
Workspace: e:\bksda-superapp\
API Endpoint Login (Issue #011) di Backend sudah ada. Kita harus menyiapkan penghubungnya di Frontend.

## Task

Kerjakan Issue #016 (Frontend — API Client `lib/api.ts`).
Ikuti instruksi PERSIS seperti yang tertulis di file:
`docs/issues/016-frontend-api-client.md`

### Urutan Kerja:
1. Jalankan `gh issue create` dan checkout branch git.
2. Navigasi ke `frontend/` dan instal `axios`.
3. Buat file `.env.local` di folder `frontend/` (jika belum ada), tambahkan `NEXT_PUBLIC_API_URL=http://localhost:8000/api`.
4. Buat file `src/lib/api.ts` dan paste kode persis sesuai dokumen (pastikan kondisi `typeof window !== 'undefined'` ter-copy agar tidak kena SSR Error).
5. Lakukan Git push dan `gh pr create` sesuai panduan Workflow.
````
