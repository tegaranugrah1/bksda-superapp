# Panduan Warna BKSDA SuperApp

Tanggal revisi: **10 November 2026**.
Status: **spesifikasi token untuk penerapan bertahap; sebagian telah diterapkan pada BMN, lihat bagian 9.1**.

Dokumen ini menggantikan panduan awal pada 10 November 2026. Cakupannya aplikasi web operasional, Portal, dan login. `DESIGN.md` di root memuat rancangan mobile tersendiri; jangan menganggap seluruh aturannya otomatis berlaku pada web atau mengubahnya melalui revisi ini.

## 1. Keputusan desain

Gunakan satu fondasi netral, aksen modul yang terbatas, dan warna status yang konsisten. Pisahkan tiga fungsi berikut:

| Lapisan | Fungsi | Keputusan |
| --- | --- | --- |
| Brand global | Login, Portal, identitas aplikasi, kontrol global di luar modul | Forest Green `#1e5433`, mengikuti warna brand yang sudah dipakai source aplikasi. Ini bukan klaim verifikasi pedoman logo resmi kementerian. |
| Identitas modul | Tombol utama, overline, ikon header, pilihan aktif, tautan dan focus ring dalam modul | Biru Kepegawaian, Emerald BMN, Teal Keuangan, Indigo Persuratan, Sky Surat Tugas, Amber DeReporting. |
| Semantik | Sukses, menunggu/peringatan, bahaya/penolakan, informasi dan netral | Mengikuti makna status, disertai teks atau ikon yang jelas; tidak mengikuti aksen modul. |

Portal dan CMS memakai brand Forest Green, dengan Slate sebagai teks dan struktur netral. Ini memperjelas usulan awal yang menempatkan Slate Navy sebagai aksen Portal. `#0f172a` tetap dipakai sebagai teks utama light mode, bukan warna brand terpisah.

Warna modul yang berdekatan, misalnya Emerald/Teal atau Blue/Sky, tidak boleh menjadi satu-satunya pembeda navigasi. Nama modul dan ikon tetap terlihat. Amber DeReporting menyatakan identitas modul, bukan bahwa semua laporan adalah peringatan. Tombol destruktif tetap memakai token danger meskipun berada dalam modul berwarna lain.

### Proporsi dan hierarki

Utamakan kanvas netral, struktur tipografi yang jelas, dan sedikit aksen. **60–30–10 hanya heuristik komposisi**, bukan persentase piksel wajib, standar aksesibilitas, atau jaminan tidak lelah mata. Kebutuhan tugas, kepadatan data, ukuran teks, pencahayaan, dan kontras pasangan warna tetap menentukan keterbacaan.

Aksen boleh dipakai untuk tautan, focus ring, selected state, dan grafik yang relevan, selain header dan tombol. Hindari latar berwarna luas pada setiap baris tabel. Peringatan berulang cukup memakai badge/ikon berlabel pada baris netral; kondisi yang benar-benar membutuhkan perhatian boleh memakai alert dengan hirarki yang jelas.

## 2. Sumber kebenaran token

**Nilai hex eksplisit di dokumen ini adalah sumber acuan.** Nama seperti Blue atau Emerald adalah nama keluarga warna, bukan janji bahwa kelas bawaan `blue-600` atau `emerald-700` selalu menghasilkan hex tersebut.

Source saat revisi memakai Tailwind v4, dengan palet bawaan OKLCH pada `frontend/node_modules/tailwindcss/theme.css`. Rasio hex di dokumen ini tidak otomatis membuktikan kontras kelas Tailwind yang sedang terpasang. Saat implementasi, gunakan token aplikasi eksplisit atau hitung kembali warna computed yang benar-benar dirender. Jangan mengganti palet global Tailwind hanya untuk menyamakan nama kelas dengan tabel ini.

Gunakan namespace **`--ds-*`** dengan nilai warna lengkap, misalnya `--ds-canvas: #f8fafc`. Alias BMN sudah aktif pada scope `[data-module="bmn"]`; jangan menganggap semua token/modul pada dokumen ini sudah dimigrasikan.

- Konvensi tema web yang sudah ada adalah class `.dark`; tidak perlu menambah theme provider baru.
- `globals.css` saat ini menyimpan token shadcn seperti `--primary` sebagai channel HSL dan memanggil `hsl(var(--primary))`. **Jangan langsung mengisi token HSL itu dengan hex**, karena formatnya tidak cocok. Gunakan namespace baru atau adapter eksplisit saat migrasi per komponen.
- Jangan menambahkan opacity, gradient, atau overlay lalu memakai rasio warna solid sebagai bukti kontras. Hitung hasil komposit terhadap latar sebenarnya.
- Default aksen di luar modul adalah brand. Dalam modul, resolve alias `--ds-accent-*` dari baris modul aktif. Jangan mengubah warna semantik melalui alias aksen.

## 3. Token fondasi light dan dark

Seluruh nilai dalam tabel adalah warna solid tanpa transparansi.

| Token | Light | Dark | Penggunaan |
| --- | --- | --- | --- |
| `--ds-canvas` | `#f8fafc` | `#09090b` | Latar halaman. |
| `--ds-surface` | `#ffffff` | `#18181b` | Kartu, dialog dan popover. |
| `--ds-surface-raised` | `#ffffff` | `#27272a` | Permukaan bertingkat di atas kartu. |
| `--ds-surface-muted` | `#f1f5f9` | `#27272a` | Area pendukung atau kontrol sekunder. |
| `--ds-fg` | `#0f172a` | `#f8fafc` | Teks utama pada permukaan netral. |
| `--ds-fg-muted` | `#475569` | `#a1a1aa` | Teks pendukung; tetap dibaca, bukan dekorasi. |
| `--ds-border-subtle` | `#e2e8f0` | `#3f3f46` | Pemisah dekoratif; bukan satu-satunya batas input atau indikator state. |
| `--ds-border-control` | `#7c899a` | `#71717a` | Batas kontrol; light diperhalus setelah pemeriksaan Data Aset agar filter berderet tidak terlalu berat. |
| `--ds-secondary-bg` | `#f1f5f9` | `#27272a` | Tombol sekunder. |
| `--ds-secondary-hover` | `#e2e8f0` | `#3f3f46` | Hover tombol sekunder. |
| `--ds-secondary-active` | `#cbd5e1` | `#52525b` | Pressed tombol sekunder. |
| `--ds-secondary-fg` | `#0f172a` | `#f8fafc` | Teks tombol sekunder, termasuk hover/pressed. |
| `--ds-disabled-bg` | `#f1f5f9` | `#27272a` | Kontrol disabled. |
| `--ds-disabled-fg` | `#64748b` | `#71717a` | Teks disabled; wajib disertai atribut disabled yang sesuai. |

Pasangan teks utama/pendukung ditujukan untuk canvas, surface, surface-raised, dan surface-muted. Untuk tombol gunakan foreground tombol, bukan `--ds-fg-muted`. Hindari teks penting berukuran 10px; gunakan ukuran yang nyaman dibaca dan uji pada zoom/viewport pengguna.

## 4. Token brand dan aksen modul

Setiap baris menyediakan nilai untuk alias yang sama. `brand` berlaku pada login, Portal, CMS, dan konteks global; enam baris lainnya berlaku pada modul terkait.

### 4.1 Light mode

`--ds-accent-fg` sama dengan `--ds-accent-solid`. `--ds-accent-on-solid` selalu **`#ffffff`** pada light mode. Kolom soft-border adalah border dekoratif, bukan pengganti border-control atau focus ring.

| Konteks | `--ds-accent-solid` / fg | `--ds-accent-hover` | `--ds-accent-active` | `--ds-accent-soft` | `--ds-accent-soft-border` |
| --- | --- | --- | --- | --- | --- |
| brand | `#1e5433` | `#164227` | `#153e24` | `#edf3ee` | `#dce8dd` |
| kepegawaian | `#2563eb` | `#1d4ed8` | `#1e40af` | `#eff6ff` | `#bfdbfe` |
| bmn | `#047857` | `#065f46` | `#064e3b` | `#ecfdf5` | `#a7f3d0` |
| keuangan | `#0f766e` | `#115e59` | `#134e4a` | `#f0fdfa` | `#99f6e4` |
| persuratan | `#4f46e5` | `#4338ca` | `#3730a3` | `#eef2ff` | `#c7d2fe` |
| surat-tugas | `#0369a1` | `#075985` | `#0c4a6e` | `#f0f9ff` | `#bae6fd` |
| dereporting | `#b45309` | `#92400e` | `#78350f` | `#fffbeb` | `#fde68a` |

### 4.2 Dark mode

Gunakan warna terang untuk teks aksen pada surface gelap. Teks aksen dan tombol memiliki token berbeda: jangan memakai warna light-mode yang gelap untuk teks kecil pada dark mode. `--ds-accent-on-solid` selalu **`#0f172a`** pada dark mode, termasuk untuk tombol brand; jangan memaksakan teks putih pada tombol terang.

| Konteks | `--ds-accent-solid` | `--ds-accent-hover` | `--ds-accent-active` | `--ds-accent-fg` | `--ds-accent-soft` | `--ds-accent-soft-border` |
| --- | --- | --- | --- | --- | --- | --- |
| brand | `#86efac` | `#bbf7d0` | `#dcfce7` | `#86efac` | `#0d281a` | `#24583a` |
| kepegawaian | `#60a5fa` | `#93c5fd` | `#bfdbfe` | `#93c5fd` | `#172554` | `#1e40af` |
| bmn | `#34d399` | `#6ee7b7` | `#a7f3d0` | `#6ee7b7` | `#022c22` | `#065f46` |
| keuangan | `#2dd4bf` | `#5eead4` | `#99f6e4` | `#5eead4` | `#042f2e` | `#115e59` |
| persuratan | `#818cf8` | `#a5b4fc` | `#c7d2fe` | `#a5b4fc` | `#1e1b4b` | `#3730a3` |
| surat-tugas | `#38bdf8` | `#7dd3fc` | `#bae6fd` | `#7dd3fc` | `#082f49` | `#075985` |
| dereporting | `#fbbf24` | `#fcd34d` | `#fde68a` | `#fcd34d` | `#451a03` | `#92400e` |

### 4.3 Aturan penggunaan dan state

| Elemen/state | Token dan perilaku |
| --- | --- |
| Tombol utama | Background solid, teks on-solid; hover/pressed memakai hover/active dengan on-solid yang sama. |
| Teks aksen, overline, ikon bermakna | Accent-fg pada surface standar atau soft. Jangan memakai soft-border sebagai warna teks. |
| Ikon header / pilihan aktif | Background soft, teks/ikon accent-fg. Untuk navigasi tambahkan label, indikator bentuk, dan `aria-current`/`aria-selected` yang sesuai. |
| Tautan | Accent-fg dan underline pada teks inline; jangan hanya mengandalkan beda hue dari teks sekitarnya. |
| Focus keyboard | Ring 2px memakai accent-fg, offset 2px memakai warna permukaan setempat. Ring harus terlihat terhadap area di sekelilingnya; uji juga saat berada pada tombol berwarna. |
| Loading | Warna tombol tetap; teks/spinner menjelaskan proses. Hindari opacity seluruh komponen yang menurunkan keterbacaan. |
| Disabled | Gunakan pasangan disabled dan atribut `disabled`/`aria-disabled` sesuai perilaku kontrol; warna pudar saja tidak menonaktifkan aksi. |
| Aksi destruktif | Gunakan pasangan tombol danger pada bagian 5, tidak mengikuti aksen modul. |

Rasio tabel bagian 6 untuk teks aksen mengasumsikan surface standar, bukan sembarang background hover. Misalnya, tautan light mode yang diletakkan pada permukaan yang lebih gelap dari soft harus dihitung ulang. Border lembut tidak boleh menjadi satu-satunya penanda fokus/selected/input.

## 5. Token semantik universal

Gunakan alias `--ds-status-<status>-bg`, `--ds-status-<status>-fg`, dan `--ds-status-<status>-border`. Status adalah `success`, `warning`, `danger`, `info`, atau `neutral`. Border pada tabel ini bersifat dekoratif; teks dan ikon berlabel membawa informasi status.

| Status | Light bg | Light fg | Light border | Dark bg | Dark fg | Dark border |
| --- | --- | --- | --- | --- | --- | --- |
| success | `#ecfdf5` | `#047857` | `#a7f3d0` | `#022c22` | `#6ee7b7` | `#065f46` |
| warning | `#fffbeb` | `#92400e` | `#fde68a` | `#451a03` | `#fcd34d` | `#92400e` |
| danger | `#fff1f2` | `#be123c` | `#fecdd3` | `#4c0519` | `#fda4af` | `#9f1239` |
| info | `#eff6ff` | `#1d4ed8` | `#bfdbfe` | `#172554` | `#93c5fd` | `#1e40af` |
| neutral | `#f1f5f9` | `#475569` | `#e2e8f0` | `#27272a` | `#d4d4d8` | `#52525b` |

Makna harus mengikuti keadaan sebenarnya. Contoh: cuti disetujui = success; pengajuan menunggu = warning; ditolak atau STNK kedaluwarsa = danger; pemberitahuan nonkritis = info; tidak ada aktivitas = neutral. Pilihan teks dan ikon membedakan menunggu, rusak ringan, dan hampir kedaluwarsa meskipun sama-sama memakai warning. Warna brand BMN yang hijau tidak berarti semua transaksi BMN sukses.

### Tombol destruktif

| Token | Light | Dark |
| --- | --- | --- |
| `--ds-danger-solid` | `#be123c` | `#fb7185` |
| `--ds-danger-hover` | `#9f1239` | `#fda4af` |
| `--ds-danger-active` | `#881337` | `#fecdd3` |
| `--ds-danger-on-solid` | `#ffffff` | `#0f172a` |
| `--ds-danger-focus` | `#be123c` | `#fda4af` |

Untuk validasi input, gunakan border/ikon danger-fg dengan pesan teks; jangan mengandalkan border dekoratif pada tabel badge. Pertahankan affordance keyboard dan semantik kontrol, bukan hanya warna.

## 6. Kontras: metode, hasil, dan batas bukti

Target panduan adalah **WCAG 2.2 AA**. Untuk pasangan yang tercantum:

- Teks normal minimal **4,5:1**.
- Teks besar minimal **3:1**; definisi WCAG adalah 18pt biasa (24 CSS px), atau 14pt bold (sekitar 18,67 CSS px). Teks badge 10–14px bukan teks besar.
- Informasi visual yang diperlukan untuk mengenali kontrol/state dan grafik bermakna minimal **3:1 terhadap warna yang bersebelahan**, dengan pengecualian sesuai kriteria. Tidak semua garis dekoratif wajib 3:1; bila garis menjadi satu-satunya batas input, ia tidak lagi dekoratif.
- Warna tidak menjadi satu-satunya pembawa informasi. Status perlu label/ikon; grafik perlu legenda, label nilai, atau bentuk/pola sesuai kebutuhan.

Perhitungan memakai relative luminance sRGB: normalisasi kanal ke 0–1; kanal <= 0,04045 dibagi 12,92, selebihnya `((kanal + 0,055) / 1,055)^2,4`. Luminance adalah `0,2126 R + 0,7152 G + 0,0722 B`; rasio `(L_terang + 0,05) / (L_gelap + 0,05)`. Nilai disajikan dua desimal, tetapi keputusan lulus memakai hasil penuh, tanpa membulatkan ke ambang.

### 6.1 Pasangan utama

| Konteks | Light: fg di putih / tombol solid dengan teks putih | Dark: teks aksen di surface `#18181b` | Dark: tombol solid dengan teks `#0f172a` |
| --- | --- | --- | --- |
| brand | 8.86:1 | 12.62:1 | 12.71:1 |
| kepegawaian | 5.17:1 | 9.82:1 | 7.02:1 |
| bmn | 5.48:1 | 11.62:1 | 9.29:1 |
| keuangan | 5.47:1 | 11.98:1 | 9.59:1 |
| persuratan | 6.29:1 | 8.89:1 | 5.98:1 |
| surat-tugas | 5.93:1 | 10.63:1 | 8.33:1 |
| dereporting | 5.02:1 | 12.29:1 | 10.69:1 |

Seluruh pasangan di atas memenuhi AA teks normal. Variasi tombol hover/active dan pasangan accent-fg di accent-soft juga harus diverifikasi, bukan hanya state default. Untuk teks aksen pada canvas/surface-raised/surface-muted, hitung ulang terhadap permukaan itu: kelulusan pada surface putih tidak otomatis berlaku pada semua background.

### 6.2 Koreksi panduan awal

- Sky `#0369a1` terhadap putih adalah **5,93:1**, menggantikan angka awal 5,22:1.
- Slate `#0f172a` terhadap putih adalah **17,85:1**, menggantikan angka awal 16,1:1. Ini juga memenuhi AAA untuk pasangan teks tersebut, bukan klaim AAA seluruh aplikasi.
- Emerald `#10b981` terhadap putih adalah **2,54:1**; `#059669` adalah **3,77:1**; `#047857` adalah **5,48:1**. Kekurangan kontras berlaku pada pasangan dan penggunaan tertentu, bukan berarti keluarga hijau buruk secara umum. Warna terang dapat sesuai pada background gelap atau sebagai dekorasi yang tidak membawa informasi.
- Blue `#2563eb` dan Emerald `#047857` sama-sama memenuhi AA terhadap putih, tetapi tidak berarti ketajaman atau kenyamanan visualnya setara persis. Klaim berbasis panjang gelombang atau jaminan anti-fatigue tidak dipakai sebagai dasar keputusan desain ini.

**Batas bukti:** perhitungan token bukan sertifikasi aksesibilitas aplikasi. Belum menguji seluruh computed style, gradient, opacity, ukuran font, focus state, chart, dan kombinasi komponen di browser aktual. Dark mode wajib dinilai tersendiri; jangan menyalin hasil light mode.

### 6.3 Verifikasi revisi dokumentasi

Pada 10 November 2026, pemeriksaan numerik membaca langsung tabel token dokumen dan meluluskan **180 pemeriksaan pasangan**: teks fondasi pada empat permukaan netral, state tombol sekunder, batas kontrol, tombol aksen default/hover/active, teks aksen pada surface dan soft, focus ring pada permukaan netral, badge status, serta tombol/focus destruktif. Seluruh **21 angka rasio** pada tabel bagian 6.1 cocok dengan perhitungan ulang.

Rasio terkecil yang diuji untuk teks normal adalah **4,749275:1**; untuk batas kontrol/focus yang diuji adalah **3,081918:1**. Pemeriksaan tidak memakai pembulatan untuk menentukan kelulusan. Pasangan disabled dan border dekoratif tidak diklaim memenuhi ambang teks/kontrol aktif. Hasil ini hanya verifikasi nilai solid pada dokumen, bukan tes aplikasi atau pemeriksaan browser.

## 7. Contoh implementasi token

Contoh berikut menunjukkan pola variabel penuh yang kompatibel dengan hex dan class `.dark`. Cakupan source yang benar-benar diterapkan dicatat pada bagian 9.1. Untuk modul lain, gunakan nilai tabel bagian 4; jangan membuat nama kelas Tailwind dinamis yang tidak dapat ditemukan compiler.

```css
/* Contoh terlokalisasi pada root modul BMN. */
[data-module="bmn"] {
  --ds-surface: #ffffff;
  --ds-fg: #0f172a;
  --ds-fg-muted: #475569;
  --ds-accent-solid: #047857;
  --ds-accent-hover: #065f46;
  --ds-accent-active: #064e3b;
  --ds-accent-on-solid: #ffffff;
  --ds-accent-fg: #047857;
  --ds-accent-soft: #ecfdf5;
  --ds-accent-soft-border: #a7f3d0;
}

.dark[data-module="bmn"],
.dark [data-module="bmn"] {
  --ds-surface: #18181b;
  --ds-fg: #f8fafc;
  --ds-fg-muted: #a1a1aa;
  --ds-accent-solid: #34d399;
  --ds-accent-hover: #6ee7b7;
  --ds-accent-active: #a7f3d0;
  --ds-accent-on-solid: #0f172a;
  --ds-accent-fg: #6ee7b7;
  --ds-accent-soft: #022c22;
  --ds-accent-soft-border: #065f46;
}
```

Contoh class statis pada tombol setelah token yang diperlukan tersedia:

```tsx
<button
  type="button"
  className="rounded-xl px-4 py-2.5 text-sm font-medium bg-[var(--ds-accent-solid)] text-[color:var(--ds-accent-on-solid)] hover:bg-[var(--ds-accent-hover)] active:bg-[var(--ds-accent-active)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ds-accent-fg)]"
>
  Simpan perubahan
</button>
```

Focus offset di contoh mengasumsikan background sekitar adalah surface. Uji outline terhadap surface aktual; gunakan adapter/komponen tombol yang sudah ada saat implementasi, bukan membuat sistem tombol paralel. Token disabled/loading, status semantik, dan aksesibilitas komponen tetap dipasang sesuai kebutuhan; cuplikan ini tidak mengklaim menutup seluruh state.

Popovers/dialog yang dirender melalui portal dapat keluar dari root modul. Saat implementasi, pastikan token konteks modul diteruskan ke portal container atau komponen tersebut. Jangan menganggap inheritance dari `[data-module]` selalu tersedia pada `document.body`.

## 8. Grafik dan data operasional

Grafik kondisi aset memakai success/warning/danger sesuai makna data, bukan seluruhnya aksen BMN. Grafik distribusi kategori memakai warna kategori yang konsisten; kategori tidak otomatis berarti status. Jangan memaksa satu aksen untuk semua kategori bila menghilangkan keterbedaan.

Tampilkan label, nilai, dan legenda. Jangan mengandalkan merah/hijau saja. Untuk grafik bermakna, periksa kontras dengan background dan segmen tetangga; gunakan pemisah, pola, atau label jika diperlukan. Warna lebih cerah yang gagal untuk teks kecil masih dapat dipakai sebagai dekorasi; penggunaan pada data bermakna tetap mengikuti persyaratan grafik. Rasio 60–30–10 tidak membatasi kebutuhan semantik atau membenarkan data yang tidak terbaca.

## 9. Checklist penerapan bertahap

- [ ] Pengguna menginstruksikan modul/komponen yang akan diubah; revisi dokumen ini belum memberi instruksi mengubah source aplikasi.
- [ ] Petakan brand, aksen modul, semantik, dan semua portal/dialog; tetapkan token tanpa merusak format HSL shadcn yang ada.
- [ ] Terapkan light dan dark beserta default, hover, pressed, focus, selected, loading, dan disabled. Hindari string kelas dinamis dan placeholder yang bukan nilai CSS.
- [ ] Uji teks utama/pendukung di setiap surface, tombol pada semua state, badge semantik, tautan, input, focus ring, dan grafik; nilai pasangan warna dari hasil computed/komposit aktual.
- [ ] Periksa navigasi keyboard, label/ikon status, zoom dan viewport kecil; warna bukan satu-satunya penanda.
- [ ] Periksa tema dan token pada komponen Radix yang dipindahkan melalui portal.
- [ ] Dokumentasikan komponen yang sudah dimigrasikan dan yang masih memakai warna lama; jangan menyatakan seluruh modul sudah seragam berdasarkan satu halaman.
- [ ] Jalankan typecheck/lint/regresi relevan ketika source diubah. Revisi dokumentasi saja tidak memerlukan tes aplikasi ulang dan tidak boleh dilaporkan sebagai kelulusan UI aktual.

### 9.1 Penerapan Data Aset BMN — 10 November 2026

Panduan khusus untuk pekerjaan visual modul BMN berikutnya: [Panduan Visual Modul BMN](bmn-ui-ux-modernization/visual-guidelines.md). Gunakan aturan border halus dan state di sana; detail token lengkap tetap bersumber dari dokumen ini.

- `globals.css` menyediakan token fondasi, sekunder/disabled, semantik status dan danger light/dark dalam scope BMN. Aksen dashboard tetap. Halaman Data Aset memakai CSS terlokalisasi `frontend/src/app/bmn/assets/assets.css` melalui class `bmn-assets-ui`; modul lain tidak mendapat override global.
- **Border normal Data Aset:** Search/NUP/select memakai border-subtle (`#e2e8f0` light, `#3f3f46` dark); Export/Impor memakai secondary dengan border transparan. Pengguna menilai bahkan versi antara `#7c899a` masih terlalu menonjol. Hover secondary memakai soft-border dan perubahan background; fokus tetap outline accent 2px dengan offset 2px. Teks, ikon, panah select dan affordance input tetap terlihat. Border halus ini bersifat dekoratif dan **tidak diklaim mencapai kontras 3:1**.
- Token border-control tetap tersedia untuk konteks yang memerlukan batas tegas: light `#7c899a`, dark `#71717a`. Kontras solid token light terhadap putih **3,56:1**, canvas **3,40:1**, dan secondary **3,25:1**; angka ini bukan rasio border normal Data Aset setelah penyempurnaan terakhir. Penilaian seluruh halaman tidak dapat disimpulkan dari tes pasangan token.
- Tambah Aset memakai pasangan accent-solid/on-solid; Export/Impor/Reset/Batal memakai secondary. Pilihan baris dan toolbar seleksi memakai accent-soft dengan checkbox/aria-selected; warna merah hanya untuk aksi destruktif atau status danger. Status Baik=success, Rusak Ringan=warning, Rusak Berat= danger, nilai tidak dikenal=neutral; pinjaman=info. Badge STNK memakai warning/danger sesuai label.
- Metadata dan judul kolom memakai foreground muted yang tetap terbaca. Warna tag kategori buatan pengguna dipertahankan sebagai taksonomi, bukan diubah menjadi status sukses atau bahaya.
- Pada grid, kode barang/NUP aktif memakai accent-fg semibold; NUP Lama yang terisi memakai foreground-muted normal agar tidak mengalahkan identitas aktif. Nama aset dan nilai perolehan tetap foreground utama; pengguna/lokasi/merk menjadi metadata. Kepadatan kartu serta preview mengikuti panduan khusus BMN yang ditautkan di atas.
- Popover Export/filter tag dan dialog Impor membawa `data-module="bmn"` sendiri karena dipindahkan ke body melalui portal; token surface/foreground tetap mengikuti tema. Detail aset dicakup pada 9.2; form create dan isi dialog pengelolaan tag bersama belum dimigrasikan menyeluruh lewat pekerjaan ini.
- Aturan hover/kecepatan berada di [pedoman animasi, bagian Data Aset](animate-ui-motion-guidelines.md#data-aset-bmn). Warna state tidak boleh tergantung animasi: row hover/fokus 150ms tanpa lift, selected state persisten, dan aksi tabel selalu terlihat.

### 9.2 Penerapan detail aset BMN — 10 November 2026

- Root detail dan portal preview memakai `data-module="bmn"` serta `bmn-assets-ui bmn-detail-ui`. Token lengkap di atas dipakai ulang, tanpa dependency atau token global baru. Tambahan CSS khusus detail terlokalisasi dalam `assets/[id]/detail.css`.
- Edit/Simpan: accent-solid/on-solid, termasuk teks gelap pada aksen terang dark mode. Batal/unduh/verifikasi/preview: secondary dengan border normal transparan. Hapus: danger. Input/select: border-subtle; fokus accent 2px/offset 2px, fokus hapus danger. Metadata minimal 12px dengan fg-muted, nilai utama fg. Plat kendaraan mempertahankan hitam/putih sebagai representasi benda, bukan label semantik.
- Kondisi Baik/Rusak Ringan/Rusak Berat: success/warning/danger; kosong/tidak dikenal: neutral. Status BMN `Aktif` memakai success, nilai lain neutral; status kosong tidak diasumsikan aktif. Pinjaman info, tanggal STNK memakai semantik existing dengan pasangan light/dark. Tag kategori mempertahankan taksonominya.
- Foto tidak ditutupi gradient gelap satu bidang; caption/label memakai surface/foreground solid per tema. Dialog object-contain membawa tokennya sendiri. Thumbnail dan foto utama tidak zoom/pulse saat idle; kartu pasif tidak berubah elevasi saat hover. Kontrol/baris150ms, indikator tab detail berupa garis bawah accent-fg2px dengan spring420/32 serta surface-muted pada tab aktif (mengikuti inbox Surat Tugas), konten Dialog150ms; lihat pedoman animasi untuk batas reduced motion.
- Browser mengonfirmasi tombol primary light `#047857/#ffffff`, dark `#34d399/#0f172a`, preview dark `#18181b/#f8fafc`, keyboard/focus-return, enam tab dan viewport 359/390/767/768/1024/1920px tanpa overflow halaman. Fixture detail memeriksa status/form/izin/loading/error/fallback foto/navigasi dokumen. Pemeriksaan ini bukan sertifikasi seluruh BMN atau bukti browser untuk semua data dummy; tidak menguji ulang reduced motion browser sesuai pilihan pengguna.

## 10. Rujukan

- [W3C — WCAG 2.2, Contrast Minimum](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html): ambang teks dan definisi teks besar.
- [W3C — WCAG 2.2, Non-text Contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html): kontrol/state/grafik bermakna dan pengecualian border dekoratif.
- [W3C — WCAG 2.2, Use of Color](https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html): informasi tidak hanya melalui warna.
- Source lokal yang dibaca: `frontend/src/app/globals.css`, `frontend/src/components/ui/button.tsx`, `frontend/package.json`, dan palet paket Tailwind yang sudah terpasang. Source tersebut merupakan bukti keadaan saat revisi, bukan bagian yang diubah melalui dokumen ini.
