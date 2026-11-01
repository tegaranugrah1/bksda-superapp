# Dokumen Perencanaan Agentic E2E Testing BKSDA SuperApp (Antigravity-Driven Autonomous Testing)

> **Status Dokumen**: DRAF PERENCANAAN AGENTIC E2E (Siap Ditinjau & Dievaluasi Pengguna)  
> **Tanggal Pembuatan**: 01 November 2026  
> **Branch Acuan**: `codex/portal-security-pentest` (Strictly Local Commits, Zero Remote Push)  
> **Pondasi Arsitektur**: Mengadopsi paradigma framework `npx e2e` (TesterArmy: Agentic Goal + Deterministic Assertion) yang diintegrasikan langsung dengan kecerdasan AI Antigravity lokal **tanpa memerlukan API Key berbayar pihak ketiga** (OpenAI / Anthropic / Vercel Gateway).  
> **Prinsip Utama**: Ponytail (Zero New Dependency, 100% Offline/Local Engine), Browser Nyata (Chromium lokal), dan Exploratory Bug-Hunting.

---

## 1. Latar Belakang & Paradigma: Mengapa Agentic E2E?

Pengujian E2E tradisional (seperti Playwright biasa) sangat kuat untuk pengujian regresi deterministik, namun memiliki kelemahan:
1. **Selector Rapuh (*Brittle Locators*)**: Jika nama class CSS atau susunan tag HTML sedikit berubah, skrip pengujian bisa gagal (*flaky*) meskipun fungsionalitas aplikasi sebenarnya berjalan normal.
2. **Keterbatasan Skenario Eksplorasi**: Skrip deterministik hanya menguji alur yang ditulis secara kaku baris demi baris oleh developer, sehingga sering kali melewatkan *edge cases* atau perilaku pengguna nyata yang acak di lapangan.

Framework **`npx e2e`** memperkenalkan konsep baru: **Agentic End-to-End Testing**. Alih-alih menulis ratusan baris klik selector, developer memberikan *Goal* dalam bahasa alami (*Natural Language Goal*), dan AI Agent bertindak seperti manusia yang menavigasi, mengeksplorasi, dan menguji antarmuka aplikasi.

### Solusi Tanpa API Key Eksternal (Antigravity Driver)
Biasanya, framework `e2e` memerlukan API key OpenAI/Anthropic untuk menggerakkan botnya. Di lingkungan kita:
* **Antigravity (AI Assistant)** bertindak langsung sebagai **"Otak Kemudi (*AI Driver*)"**.
* **Chromium Lokal (`chrome.exe`)** bertindak sebagai **"Kendaraan Eksekusi Browser Nyata"**.
* **Keuntungan**: **100% Bebas Biaya Token Luar**, tidak perlu memasukkan kredensial API rahasia ke file config, dan mematuhi prinsip *Zero New Dependency*.

---

## 2. Arsitektur Alur Kerja (Workflow)

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│               ALUR KERJA AGENTIC E2E TESTING (ANTIGRAVITY AS DRIVER)                   │
├──────────────────────────┬─────────────────────────────┬───────────────────────────────┤
│    1. GOAL PERINTAH      │     2. AI AGENT REASONING   │     3. VERIFIKASI BROWSER     │
│   (Bahasa Alami User)    │     (Antigravity Engine)    │      (Chromium Nyata)         │
├──────────────────────────┼─────────────────────────────┼───────────────────────────────┤
│ "Jelajahi alur upload    │ • Baca struktur halaman     │ • Buka http://localhost:3000  │
│  video 120MB, batalkan   │ • Tentukan aksi navigasi    │ • Simulasikan drag-and-drop   │
│  di 50%, lalu cek apakah │ • Identifikasi tombol & form│ • Putus request di tengah part│
│  kuota unit terpotong"   │ • Suntikkan skenario chaos  │ • Catat network XHR / fetch   │
│                          │ • Evaluasi DOM & Invariant  │ • Ambil screenshot bukti DOM  │
└──────────────────────────┴─────────────────────────────┴───────────────────────────────┘
```

1. **Instruksi Goal**: Pengguna memberikan instruksi berbasis tujuan dalam bahasa alami.
2. **Penalaran Agentik (*Agent Reasoning*)**: Antigravity menganalisis state komponen React, struktur DOM, dan alur API, lalu mengemudikan browser secara otonom.
3. **Eksekusi & Pembuktian Nyata**: Seluruh aksi dijalankan di Chromium asli, merekam bukti mutasi DOM, header HTTP, dan responsivitas layout.

---

## 3. Matriks 6 Skenario Uji Agentic (Deep Exploratory Scenarios)

Berikut adalah 6 skenario eksplorasi berbasis tujuan alami yang dirancang untuk membongkar celah tersembunyi pada Modul BKSDA Drive:

| ID Skenario | Nama Skenario Agentic | Natural Language Goal (Tujuan Alami) | Aksi Otonom AI Agent | Invariant & Kriteria Keberhasilan |
|---|---|---|---|---|
| **AGT-E2E-01** | **Upload Resilience & Chaos Network Drop** | *"Unggah berkas video dokumentasi 120MB ke Seksi Berau, putuskan koneksi saat mencapai 50%, lalu lanjutkan setelah jaringan pulih."* | Agent membuka dialog upload, memilih berkas besar, memotong koneksi simulasi di part 3/5, mengamati feedback UI, lalu mengklik tombol resume saat koneksi aktif kembali. | UI tidak freeze, progress bar melanjutkan dari 50% ke 100% tanpa reset ke 0%, dan kuota reservasi backend tidak membengkak dobel. |
| **AGT-E2E-02** | **Public Share Brute-Force UX Lockout** | *"Akses tautan berbagi publik yang terkunci sandi, coba tebak sandi salah sebanyak 5 kali berturut-turut, lalu masukkan sandi yang benar."* | Agent menavigasi ke `/drive/s/[token]`, mencoba input kata sandi acak berulang kali, mengamati respons throttling dan pesan kesalahan, lalu memasukkan sandi sah. | Sistem membatasi laju request (rate limiting), menampilkan peringatan keamanan tanpa merusak layout form, dan sandi benar berhasil membuka unduhan presigned. |
| **AGT-E2E-03** | **Rapid Folder Tree Explorer & Anti-Cycle** | *"Buka modal pemindahan berkas, jelajahi seluruh subfolder secara acak, dan coba pindahkan folder induk ke dalam subfoldernya sendiri."* | Agent membuka `DriveMoveDialog`, mengekspansi dan menciutkan percabangan pohon folder, lalu mencoba mengklik folder turunan terlarang. | Item folder terlarang terkunci disabled di DOM (`aria-disabled="true"`), tombol submit tetap non-aktif, dan struktur siklus sirkular dicegah total. |
| **AGT-E2E-04** | **Mass Selection & Destruction Confirmation Trap** | *"Centang 15 berkas sekaligus, klik hapus massal, klik batal pada dialog konfirmasi, lalu klik hapus permanen."* | Agent memilih berkas menggunakan multi-select checkbox, memicu toolbar aksi massal, menguji pembatalan dialog pencegat (*confirmation dialog*), lalu menyelesaikan aksi. | Berkas tidak terhapus saat dibatalkan; saat dikonfirmasi, seluruh 15 baris hilang dari tabel dan counter kuota terpakai berkurang seketika. |
| **AGT-E2E-05** | **Dynamic Viewport Fluidity & Contrast Audit** | *"Jelajahi explorer Drive sambil mengubah ukuran layar dari desktop 1440px ke ponsel 375px, lalu aktifkan mode gelap."* | Agent merespons perubahan viewport secara dinamis, memeriksa transisi sidebar menjadi drawer hamburger, memeriksa kemunculan bottom action sheet, dan mengukur kontras warna teks. | Zero horizontal scrollbar pada 375px; rasio kontras teks di Dark Mode Zinc memenuhi standar WCAG AA $\ge$ 4.5:1; target sentuh tombol aksi $\ge$ 44px. |
| **AGT-E2E-06** | **Cross-Module Drive to DeReporting Form** | *"Isi formulir laporan publik DeReporting dengan 3 lampiran foto, lalu verifikasi apakah subfolder respons dan Ringkasan_Laporan.txt langsung muncul di Drive."* | Agent mengisi form publik di `/lapor/satwa-liar`, mengunggah foto, submit, lalu berpindah ke `/drive` untuk memeriksa folder laporan yang baru tercipta. | Subfolder berhirarki tanggal & nama pelapor tercipta otomatis; berkas `Ringkasan_Laporan.txt` dapat dibuka di previewer Drive tanpa error. |

---

## 4. Metodologi Pelaksanaan

1. **Infrastruktur Runner**:
   - Skrip runner mandiri: `frontend/tests/drive-agentic.playwright.cjs`.
   - Menggunakan binary Google Chrome yang sudah terinstal di Windows (`C:\Program Files\Google\Chrome\Application\chrome.exe`).
   - Berjalan pada Next.js production build (`http://localhost:3000`) atau mode headless mock terisolasi.
2. **Tracing & Rekaman Bukti Empiris**:
   - Perekaman log interaksi step-by-step.
   - Pengecekan console errors & page errors.
   - Pengambilan snapshot DOM visual untuk setiap transisi status kritis.
3. **Penyimpanan Hasil**:
   - Seluruh hasil eksekusi, log waktu, dan status kelulusan dicatat ke dalam tabel Lembar Rekaman di bawah ini dan disinkronkan ke `docs/progress.md`.

---

## 5. Lembar Rekaman Hasil Pengujian Agentic (Execution Log)

*(Bagian ini akan diisi setelah pengujian dieksekusi berdasarkan persetujuan pengguna)*

| ID Skenario | Target Dimensi | Status Eksekusi | Waktu / Durasi | Keterangan & Bukti Empiris |
|---|---|---|---|---|
| **AGT-E2E-01** | Upload Chaos Resilience | Menunggu Persetujuan | — | Pengujian resumabilitas upload chunk multipart saat terjadi interupsi jaringan. |
| **AGT-E2E-02** | Public Share Lockout UX | Menunggu Persetujuan | — | Pengujian proteksi brute-force kata sandi publik dan rate limiting. |
| **AGT-E2E-03** | Move Tree Anti-Cycle | Menunggu Persetujuan | — | Pengujian navigasi pohon folder dan pencegahan struktur sirkular di DOM. |
| **AGT-E2E-04** | Batch Selection & Trap | Menunggu Persetujuan | — | Pengujian multi-select checkbox dan dialog pencegat hapus permanen. |
| **AGT-E2E-05** | Viewport & Dark Mode | Menunggu Persetujuan | — | Pengujian fluiditas layout 375px $\leftrightarrow$ 1440px dan kepatuhan Zinc WCAG AA. |
| **AGT-E2E-06** | DeReporting Integration | Menunggu Persetujuan | — | Pengujian end-to-end penyerahan form publik ke penyediaan subfolder Drive. |
