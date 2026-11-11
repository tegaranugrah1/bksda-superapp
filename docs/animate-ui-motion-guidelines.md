# Pedoman Animate UI dan Motion BKSDA SuperApp

Revisi: **11 November 2026**. Acuan warna: [DESIGN_SYSTEM_COLORS.md](DESIGN_SYSTEM_COLORS.md).

Ringkasan aturan khusus modul: [Panduan Visual Modul BMN](bmn-ui-ux-modernization/visual-guidelines.md).

## 1. Status dan ruang lingkup

Pedoman ini membedakan feedback kartu informasi dan navigasi, menjaga angka tetap terbaca, membatasi pulse untuk loading, dan menghindari klaim jaminan 60fps. Targetnya adalah aplikasi operasional: data mudah dibaca, navigasi jelas, serta feedback cepat. Animasi tidak membuktikan data sinkron, valid, atau sudah diaudit.

**Implementasi saat revisi:** pola Animate UI digunakan melalui `framer-motion` yang sudah terpasang. Paket `@animate-ui/react` belum dipasang dan tidak diperlukan untuk perubahan ini. Jangan mengimpor API paket itu seolah sudah tersedia. Istilah Animate UI di sini menjelaskan referensi pola interaksi, bukan klaim penggunaan seluruh komponen resmi.

Penerapan mencakup dashboard BMN, kebijakan MotionConfig di layout BMN, serta Data Aset dan kontrol terkait. CSS dashboard dibatasi oleh `[data-module="bmn"]`; CSS Data Aset dibatasi oleh `bmn-assets-ui`, termasuk pada portal terkait. Modul lain tidak dimigrasikan melalui pekerjaan ini.

## 2. Prinsip gerak

- Gerak menjelaskan aksi, perubahan data, atau perpindahan konteks; jangan memberi kesan dapat diklik pada kartu informasi pasif.
- Nilai akhir dan teks harus langsung terbaca. Sesuai permintaan pengguna agar pembukaan terasa seperti Kepegawaian, dashboard boleh mempunyai satu entrance singkat dan reveal grafik, tanpa count-up angka, stagger panjang, atau konten tersembunyi sambil menunggu animasi.
- Interaksi utama adalah highlight yang berpindah antar pintasan. Dashboard masuk selama 280ms dari opacity 0.85 dan offset 6px; grafik memakai reveal 600ms ease-out seperti grafik Personil Kepegawaian. Kartu KPI boleh mendapat hover depth 2px, tetapi tidak diberi cursor pointer, aksi klik palsu, atau efek pressed bila memang bukan kontrol.
- Utamakan CSS untuk warna/feedback tekan dan library yang sudah ada untuk shared layout serta data dinamis. Tidak menambah dependency, request API, timer polling, atau observer untuk dekorasi.
- Transform/opacity umumnya lebih murah daripada perubahan layout per frame, tetapi **bukan jaminan GPU atau 60fps**. Klaim performa memerlukan pengukuran pada perangkat dan data representatif.
- Semua kontrol tetap mempunyai label, fokus keyboard, target sentuh yang memadai, dan semantik aslinya. Animasi tidak menggantikan feedback sukses/error atau kontrol akses.

## 3. Resep dan timing

| Pola | Penerapan BMN | Timing | Reduced motion |
| --- | --- | --- | --- |
| Pembukaan dashboard | Satu entrance setelah data pertama tersedia, tidak diputar ulang saat hover/rerender biasa | 280ms, offset Y 6px, opacity 0.85 ke 1 | Tanpa entrance; konten langsung pada posisi akhirnya. |
| Reveal grafik awal | Mask membuka batang/segmen; data width dan label sudah bernilai akhir | Clip-path 600ms, ease-out | Tanpa reveal; grafik langsung terlihat penuh. |
| Hover kartu KPI | Kedalaman visual pada kartu informasi, bukan aksi baru | Offset Y -2px, border ringan dan shadow, 150ms | Tidak bergeser atau menganimasikan shadow. |
| Shared highlight | Pintasan Data Aset/Peminjaman/Pemeliharaan/Laporan; bergerak saat hover atau fokus | Layout spring stiffness 500, damping 40; opacity 120ms | Posisi berpindah langsung, tanpa perjalanan spatial; opacity tetap singkat. |
| Feedback navigasi | Tautan header dan baris kendaraan (`bmn-hover-link`) | CSS 150ms; hover Y -3px pada pointer yang mendukung hover, pressed scale 0.98; border kendaraan mengikuti warna peringatan | Tidak bergeser atau scale; warna/fokus tetap menunjukkan state secara langsung. |
| Feedback pintasan | Akses Cepat Modul tetap memakai efek sebelumnya | CSS 140ms, hover Y -1px dan pressed scale 0.98; shared highlight tetap seperti baris di atas | Tanpa pergeseran/scale; warna dan fokus tetap ada. |
| Navigasi sidebar/tab | Indikator aktif yang sudah ada di BMN, Pengaturan dan Laporan | Spring existing stiffness 450, damping 35 | MotionConfig menonaktifkan animasi layout/transform; indikator state tetap ada. |
| Perpindahan halaman BMN | Keluar halaman lama dengan opacity; halaman tujuan langsung terbaca | Fade 120ms, tanpa slide halaman atau entrance KPI tambahan | Opacity tetap singkat; tanpa perpindahan spatial. |
| Grafik distribusi | Panjang batang berubah mengikuti nilai baru | ScaleX 600ms, easeOut | Transform langsung ke nilai akhir. |
| Grafik kondisi bersegmen | Persentase aktual menjadi width statis; perubahan ukuran melalui FLIP/layout | Layout 600ms, easeOut | Layout animation dinonaktifkan; ukuran akhir langsung berlaku. |
| Loading dashboard | Skeleton berlabel Memuat dashboard BMN | Pulse CSS hanya selama loading | Pulse dihentikan; skeleton dan label status tetap terlihat. |

Spring ditentukan oleh stiffness/damping, bukan janji selesai tepat pada durasi tertentu. Hindari overshoot/bounce yang mengubah keterbacaan data. Jangan menambahkan delay 0.6–0.8 detik pada setiap baris atau segmen.

### Data Aset BMN

| Elemen | Kecepatan dan hover | Aturan penerapan |
| --- | --- | --- |
| Pembukaan halaman | 280ms, easing `[0.16, 1, 0.3, 1]`, offset 6px dari opacity 0.85 | Satu entrance; filter/pagination tidak memutar ulang pembukaan seluruh halaman. |
| Tombol header Export/Impor | Warna/border 150ms ease-out, lift 2px pada hover selama 150ms dengan easing yang sama seperti entrance | Class `bmn-lift`; berbeda dari lift 3px pada navigasi dashboard. Bukan untuk baris tabel. |
| Baris tabel | Background 150ms ease-out saat hover atau focus-within | **Tanpa translate/scale/stagger**, agar kolom dan angka tidak bergeser. Selected state memakai accent-soft, checkbox dan aria-selected; mengalahkan hover biasa. |
| Detail/hapus/tag/pagination/filter | Warna/border 150ms ease-out; fokus outline 2px, offset 2px | Aksi tabel selalu terlihat, bukan hanya ketika mouse masuk. Warna danger dipertahankan pada aksi hapus. |
| Filter kondisi | Shared highlight spring 500/40; `initial=false`, layoutId useId per instance | Tombol filter memakai aria-pressed; label on-solid mengikuti light/dark. Bukan role tabs karena bukan panel tab. |
| Popover Export/filter tag dan dialog Impor | Animasi buka/tutup existing, durasi 150ms ease-out | Gunakan primitive aksesibel existing; Escape memulihkan fokus. Scope token/style dipasang pada konten portal. |
| Loading | Pulse/spinner hanya selama permintaan; tabel memakai aria-busy | Tidak menyamarkan seluruh tabel saat refetch. Angka dan aksi tidak masuk bergiliran. |
| Grid dan pergantian view | Layout langsung berganti; feedback kontrol 150ms, tanpa stagger/lift kartu | Hanya view aktif dirender; pertahankan query, filter, seleksi dan pagination. Skeleton saat preferensi belum siap. |
| Preview foto grid | Dialog existing 150ms ease-out, satu gambar object-contain | Foto/judul/checkbox/Detail terpisah. Escape/focus trap/return; fallback foto kosong/rusak. |

Tempo grafik **600ms** hanya untuk grafik dashboard (Kondisi Aset/Distribusi/Top Lokasi), bukan durasi hover tabel atau filter Data Aset. Efek Akses Cepat Modul dashboard tetap 140ms dan shared highlight existing.

Grid otomatis <768px, tabel default >=768px, dengan preferensi tersimpan terpisah. Kartu vertikal mobile dua kolom mulai 360px (satu di bawahnya). Grid desktop dipadatkan: 3 kolom mulai 1024px, 4 pada 1280px, 5 pada 1440px, 6 pada 1920px; foto desktop setinggi 144px dan gap teks 6px. Mobile tetap rasio foto 4:3/gap 8px. Hierarki kode/NUP aktif dan NUP Lama mengikuti [panduan visual BMN](bmn-ui-ux-modernization/visual-guidelines.md#grid-data-aset-dan-preview-foto).

CSS Data Aset ada pada `frontend/src/app/bmn/assets/assets.css`. Saat reduce, scope ini meniadakan animasi/transisi CSS dan transform tombol/tautan; provider BMN mengurangi shared-layout Motion. Pulse/spinner berhenti, tetapi label loading/status tetap tersedia. Aturan ini tidak menyentuh animasi modul lain. Uji ulang emulasi reduced motion diserahkan kepada pengguna sesuai arahan sesi ini; jangan mengklaim verifikasi browser reduce terbaru hanya dari inspeksi source.

**Hasil penerapan Data Aset, 10 November 2026:** hover baris di browser terukur 150ms dengan transform none, aksi tabel opacity 1, fokus aksi hapus mendapat outline solid danger. Seleksi/batal, filter kondisi/tag, pagination, pencarian kosong/reset, Escape/focus-return Export dan dialog Impor tanpa upload diperiksa. Light/dark dan viewport 390×844 diperiksa; tidak ada luapan horizontal halaman, tabel tetap scroll internal dan fokus keyboard dapat mencapai aksi di sisi kanan. Border normal diperhalus mengikuti feedback pengguna: input/select memakai subtle, Export/Impor border transparan. Fixture source aktual menguji status, pagination meta, filter, seleksi/cancel, batas 2.000, read-only/loading/empty dan kontras pasangan token solid. Reduced motion terbaru tidak diuji di browser; tidak ada operasi simpan/hapus/upload terhadap aset untuk pengujian ini.

## 4. Reduced motion: library dan CSS berbeda

Layout BMN membungkus kontennya dengan:

```tsx
<MotionConfig reducedMotion="user">
  {children}
</MotionConfig>
```

MotionConfig mengikuti preferensi perangkat untuk komponen Motion di bawahnya. Transform dan layout animation dikurangi; opacity/backgroundColor masih dapat bertransisi. **Width, height, CSS animation, dan Web Animations API tidak otomatis dinonaktifkan oleh provider ini.** Jangan menganggap satu provider menyelesaikan semua jalur gerak.

Karena itu, dashboard menggunakan:

- `initial={false}` pada grafik: nilai awal sudah merupakan nilai akhir.
- `scaleX` pada batang distribusi dan `layout="size"` pada segmen kondisi, bukan tween `width` dari nol per frame.
- `motion-reduce:animate-none` pada skeleton.
- CSS `prefers-reduced-motion: no-preference` untuk entrance/reveal, hover dan scale saat ditekan. Saat reduce, entrance/reveal dihapus dan `.bmn-motion-action`/`.bmn-metric-card` berganti state tanpa transisi spatial.

Jangan memakai aturan global `* { animation-duration: 0.01ms !important; }`: perubahan seperti itu memengaruhi komponen lain, tidak membuktikan gerak spatial hilang, dan dapat merusak feedback. Gunakan fallback per pola. Theme Toggler global sudah memeriksa media preference dan dukungan View Transitions; jangan memasang implementasi tema kedua di dashboard.

## 5. Highlight untuk mouse, keyboard, dan sentuh

Gunakan tautan asli untuk navigasi, bukan `div` yang dapat diklik atau tombol di dalam tautan. Pada dashboard, empat pintasan dipetakan dari satu array agar perilakunya sama.

**Akses Cepat Modul dipertahankan atas pilihan pengguna.** Jangan menerapkan `bmn-hover-link` pada empat pintasan tersebut: shared highlight, spring 500/40, fade 120ms, hover 1px dan feedback CSS 140ms tetap berlaku. Hover yang lebih tegas hanya untuk tautan header/baris kendaraan: naik 3px selama 150ms. Border kendaraan mengikuti semantik peringatannya (rose/amber/orange). KPI tetap 2px/150ms, dengan border lebih ringan dan shadow, tanpa pressed atau cursor pointer. Sediakan padding pada daftar bergulir agar lift dan outline tidak terpotong.

Aturan state:

1. Hover menunjuk satu pintasan.
2. Fokus keyboard mengambil prioritas atas hover sehingga pointer tidak memindahkan penanda dari kontrol yang sedang digunakan lewat keyboard.
3. Pointer meninggalkan grid menghapus hover, tetapi mempertahankan feedback untuk fokus yang masih di dalam grid.
4. Fokus berpindah ke elemen lain dalam grid tetap ditandai; fokus keluar grid menghapus penanda fokus.
5. `layoutId` berasal dari `useId()` per instance, bukan konstanta global yang berpotensi bertabrakan.
6. Highlight memiliki `aria-hidden` dan `pointer-events-none`; nama dan hit area tautan tidak berubah.
7. Hover bukan syarat mengakses informasi. Layar sentuh mendapat feedback pressed; keyboard mendapat outline focus-visible. Jangan memakai `aria-selected` untuk sekadar hover pada tautan navigasi.

Contoh inti (state dan handler aktual lihat source dashboard):

```tsx
const highlightId = useId();
const [hoveredAction, setHoveredAction] = useState<string | null>(null);
const [focusedAction, setFocusedAction] = useState<string | null>(null);
const highlightedAction = focusedAction ?? hoveredAction;

// Di dalam tautan aktif/fokus, bukan membungkus label dengan kontrol baru.
<motion.span
  aria-hidden="true"
  layoutId={`${highlightId}-quick-action`}
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  transition={{
    layout: { type: "spring", stiffness: 500, damping: 40 },
    opacity: { duration: 0.12 },
  }}
  className="pointer-events-none absolute inset-0 rounded-xl bg-[var(--ds-accent-soft)] border border-[var(--ds-accent-soft-border)]"
/>
```

Contoh ini bukan komponen tabs. Jika membuat tabs sebenarnya, reuse komponen aksesibel yang sudah tersedia agar role, selected state, dan navigasi panah tidak hilang.

## 6. Grafik, angka, dan loading

Angka KPI tidak dihitung dari nol untuk hiburan. Nilai terbaru ditampilkan segera; bar baru mengikuti data tanpa menunda label. Pada pembukaan normal, class `bmn-chart-enter` membuka mask dari kiri selama 600ms dengan ease-out, mengikuti tempo grafik Personil Kepegawaian untuk Kondisi Aset BMN, Distribusi per Jenis BMN dan Top Lokasi Ruang, sementara ukuran data sebenarnya sudah tetap. Dalam reduced motion mask/reveal tidak berjalan. Warna kondisi Baik/Rusak Ringan/Rusak Berat tetap semantik, bukan semuanya aksen BMN.

Contoh batang distribusi:

```tsx
<motion.div
  initial={false}
  animate={{ scaleX: proportion }}
  transition={{ duration: 0.6, ease: "easeOut" }}
  style={{ originX: 0 }}
  className="h-full w-full rounded-full bg-[var(--ds-accent-solid)]"
/>
```

`proportion` adalah rasio data 0–1. Label jumlah/persentase harus tetap tersedia di luar batang; grafik bukan satu-satunya penyampai informasi. Untuk segmen kondisi, width statis tetap dihitung dari persentase. Motion menginterpolasi transform layout ketika data berubah; bukan menulis width pada tiap frame.

Data kosong tidak boleh terlihat seperti sedang diproses selamanya. Skeleton hanya untuk permintaan yang benar-benar loading. Jangan memakai pulse untuk menandai semua status pending atau badge yang tidak menunjukkan aktivitas real-time. Polling/refetch yang tidak mengubah data tidak perlu memutar ulang animasi.

## 7. Inventaris pemeriksaan BMN

| Area/source | Keadaan saat revisi | Status cakupan |
| --- | --- | --- |
| `frontend/src/app/bmn/page.tsx` | Satu entrance dashboard dan reveal grafik singkat; hover KPI tanpa aksi palsu; menghapus entrance KPI terpisah dan chart width dari nol; highlight pintasan serta feedback aksi | Diubah pada pekerjaan ini. |
| `frontend/src/app/bmn/layout.tsx` | Menambah MotionConfig user, mempertahankan indikator sidebar, menyederhanakan transisi halaman menjadi opacity | Diubah sebagai konteks bersama BMN. |
| `frontend/src/app/bmn/assets/page.tsx` dan `assets/assets.css` | Entrance 280ms, hover 150ms, filter shared highlight, aksi tabel terlihat, selected state dan status semantik | Penerapan Data Aset. |
| `frontend/src/app/bmn/assets/[id]/page.tsx`, `detail.css`, `DetailSection`, `PhotoGallery` | Kontrol/baris150ms, tab underline spring420/32, pergantian isi glide160ms, Dialog aksesibel150ms; menghapus zoom foto 500ms, pulse statis dan hover shadow kartu informasi | Penerapan detail aset; navigasi foto/dokumen existing dipertahankan. |
| `AssetImportDialog`, `AssetTagsList`, `TagFilterCombobox` | Kontrol keyboard asli; Export/tag popover serta Impor mengikuti token dan portal scope | Penerapan kontrol yang dipakai Data Aset. Dialog pengelolaan tag bersama belum dimigrasikan seluruhnya. |
| `frontend/src/app/globals.css` | Entrance, reveal, hover KPI dan aksi scoped BMN, masing-masing dengan jalur reduced motion | Diubah pada pekerjaan ini. |
| `frontend/src/app/bmn/settings/page.tsx` | Sudah mempunyai indikator tab shared layout dan perpindahan panel | Ditelusuri; isi halaman tidak dimigrasikan ulang. |
| `frontend/src/app/bmn/reports/page.tsx` | Sudah mempunyai shared indicator dan AnimatePresence panel | Ditelusuri; isi halaman tidak dimigrasikan ulang. |
| `frontend/src/components/ui/theme-toggler.tsx` | View Transitions native dengan media preference/fallback | Ditelusuri; tidak diubah. |
| Halaman BMN lain, drawer CSS, ikon tema global, dan modul di luar BMN | Mungkin mempunyai transisi CSS/library tersendiri | Bukan klaim audit menyeluruh atau migrasi semua animasi. |

Provider BMN tidak otomatis menjangkau konten React yang dibuat di luar pohonnya. Portal mempertahankan React context bila dibuat sebagai descendant, tetapi token CSS modul dapat hilang jika node berpindah ke body; lihat pedoman warna. Verifikasi keduanya pada dialog/popover yang diubah kelak.

## 8. Verifikasi dan kriteria penerimaan

Pemeriksaan otomatis yang tersedia:

```powershell
node frontend/tests/bmn-dashboard-motion.cjs
node frontend/tests/bmn-assets-ui.cjs
node frontend/tests/bmn-asset-grid.cjs
node frontend/node_modules/typescript/bin/tsc -p frontend/tsconfig.json --noEmit --incremental false
# Jalankan dari direktori frontend:
node node_modules/eslint/bin/eslint.js src/app/bmn/page.tsx src/app/bmn/layout.tsx tests/bmn-dashboard-motion.cjs --max-warnings=0
```

Fixture memuat source dashboard aktual dengan query dummy dan module allowlist, tanpa API/akun/database. Ia menguji chart first paint, rasio segmen/batang, empat tujuan navigasi, prioritas fokus atas hover, cleanup blur/mouseleave, ID per instance, loading dan data kosong. Fixture ini tidak mengukur frame rate atau membuktikan perilaku media query OS di browser.

Checklist browser saat melakukan perubahan motion:

- [ ] Halaman tampil dengan angka final tanpa menunggu entrance atau hitungan dari nol.
- [ ] Hover/fokus berpindah antar pintasan, penanda tidak tersangkut setelah keluar, dan outline fokus tetap terlihat.
- [ ] Tab/Shift+Tab serta klik tautan tetap menuju tujuan yang benar, tanpa kontrol interaktif bersarang.
- [ ] Tema light/dark mempertahankan warna dan kontras yang ditetapkan pedoman warna.
- [ ] Uji viewport sempit: target tidak tumpang tindih, teks tidak terpotong, dan scroll tetap bisa dipakai. Emulasi viewport bukan bukti sentuhan perangkat fisik.
- [ ] Pada preferensi reduced motion, shared highlight berpindah tanpa perjalanan spatial, grafik langsung bernilai akhir, pressed tidak scale, dan skeleton tidak pulse.
- [ ] Jika menguji update data, gunakan fixture terisolasi; jangan mengubah aset operasional untuk memicu animasi.
- [ ] Catat apa yang diuji di browser versus fixture/source; jangan mengklaim seluruh BMN atau 60fps berdasarkan typecheck/screenshot statis.

Hasil run yang benar-benar dilakukan dicatat di `progress.md`. Checklist di atas adalah kriteria untuk perubahan berikutnya, bukan pernyataan bahwa seluruh perangkat dan mode sudah diuji.

### Hasil verifikasi awal 10 November 2026 (sebelum penyempurnaan hover/grafik)

- **Browser normal:** CSS dashboard memuat entrance 280ms dan reveal grafik; hover KPI terukur translateY(-2px), cursor tetap biasa. Tab antar pintasan mempertahankan outline dan highlight; keluar dari grid menghapus highlight. Enter pada Peminjaman membuka `/bmn/loans`, lalu kembali ke dashboard berhasil.
- **Reduced motion aktual:** setelah pengguna memilih emulasi `prefers-reduced-motion: reduce`, browser membaca media query `true`, entrance/reveal `none`, transform KPI `none`, serta transisi aksi/KPI `0s`. Nilai 1.633 aset tetap tampil. Ini membuktikan fallback CSS; interaksi shared-layout saat reduce ditinjau melalui provider/source dan fixture, bukan rekaman gerak browser. Input otomatis pada tab dengan DevTools sempat timeout; uji keyboard normal dilanjutkan pada tab baru di browser yang sama.
- **Visual:** tema terang dan gelap diperiksa; viewport 390×844 tidak meluap horizontal dan pintasan terukur 133×120px. Ini emulasi viewport, bukan tes sentuh perangkat fisik. Tema terang, viewport semula, dan No emulation dipulihkan setelah pengujian.
- **Otomatis:** fixture dashboard, TypeScript frontend noEmit, ESLint file terkait, serta `git diff --check` lulus. Loading, data kosong, rasio grafik dan pembaruan state diuji dengan data terisolasi. Tidak mengubah data aset operasional untuk memicu animasi dan tidak mengukur FPS.

Bukti visual berada di direktori visualisasi chat: `bmn-motion-reduced.png`, `bmn-motion-focus-light.png`, `bmn-motion-focus-dark.png`, dan `bmn-motion-mobile.png`. Screenshot statis mendukung pemeriksaan tampilan/fokus; perilaku gerak dinilai dari pemeriksaan runtime di atas.

### Penyempurnaan hover dan tempo grafik — 10 November 2026

- Hover kendaraan terukur translateY(-3px)/150ms dengan perubahan border; KPI -2px/150ms dengan cursor auto. Light/dark diperiksa; explicit dark:hover diperlukan agar border bawaan dark tidak menutupi feedback KPI. Padding daftar menjaga jarak atas baris pertama 5px saat hover. Navigasi detail kendaraan dan kembali ke dashboard berhasil tanpa mengubah data.
- Seluruh 20 track grafik pada data lokal (Kondisi Aset BMN, Distribusi per Jenis BMN dan Top Lokasi Ruang) membaca animation-duration 0.6s dan easing ease-out. Transisi pembaruan grafik memakai 600ms/easeOut juga, mengikuti tempo grafik Personil Kepegawaian. Angka tetap bernilai akhir; tidak menambahkan count-up atau delay bertingkat.
- Pintasan terkonfirmasi tidak mendapat class hover yang lebih kuat, tetap 140ms; Tab ke Peminjaman menampilkan satu highlight dan outline solid. Fixture state hover/fokus, loading dan data nol tetap lulus; TypeScript frontend, ESLint terkait dan diff check juga lulus. Tema light dipulihkan setelah pengujian.
- **Reduced motion tidak diuji ulang pada revisi ini sesuai arahan pengguna; pengguna menguji sendiri.** Guard media query dan MotionConfig dipertahankan: gerak hover/reveal hanya untuk no-preference dan transisi CSS menjadi 0ms saat reduce. Hasil reduced motion pada subbagian sebelumnya adalah bukti revisi awal, bukan klaim pengujian revisi terbaru.

Bukti visual tambahan: `bmn-hover-refined-light.png` dan `bmn-hover-refined-dark.png` di direktori visualisasi chat. Tidak mengukur FPS atau menguji pembaruan grafik menggunakan aset operasional.

## 9. Referensi resmi

- [Animate UI — Highlight](https://animate-ui.com/docs/primitives/animate-ui/highlight): referensi perilaku background yang berpindah antar item.
- [Animate UI — Paket React](https://animate-ui.com/docs/react): API paket resmi berbeda dari adaptasi lokal; pemasangan baru bukan bagian pekerjaan ini.
- [Motion — Accessibility](https://motion.dev/docs/react-accessibility): MotionConfig, reduced motion, dan alternatif gerak.

Tidak perlu menambahkan animasi ke setiap komponen agar tampak konsisten. Konsistensi adalah pola feedback dan state yang dapat dipahami, bukan jumlah efek.

## Animasi di dalam tab — acuan untuk implementasi berikutnya

**Pola ini adalah standar animasi isi tab untuk tampilan serupa ke depan**, dengan acuan inbox Surat Tugas dan implementasi detail aset BMN. Terapkan ketika pemilihan tab mengganti kelompok formulir, daftar, atau informasi di area isi yang sama. Ini berbeda dari animasi indikator tab, pembukaan halaman, hover, dan grafik dashboard.

- Gunakan Motion existing: `AnimatePresence mode="wait" initial={false}` dan satu `motion.div key={activeTab}` untuk kelompok isi. Konten lama memudar sambil naik 8px, kemudian konten baru masuk dari bawah 8px sambil menjadi jelas; **160ms easeOut per fase**, sekitar 320ms untuk keluar dan masuk. Jangan menumpuk fade per kotak atau stagger per baris.
- Saat halaman pertama dibuka, isi langsung tampil. Ganti key hanya saat tab berganti; mengetik, refetch, dan rerender biasa tidak mengulang animasi. Simpan draft pada induk agar perpindahan tidak membuang perubahan formulir.
- Reduced motion: posisi tetap y0, opacity1 dan durasi0. Pertahankan hubungan tab/panel, navigasi keyboard dan fokus; pergantian cepat harus berakhir pada tab terakhir yang dipilih.
- Indikator tab adalah efek terpisah: bila memakai pola garis bawah seperti inbox/detail BMN, gunakan garis2px dengan spring420/32 dan ID per instance. Warna tetap mengikuti token modul masing-masing.

Untuk pekerjaan baru yang memiliki perpindahan isi tab serupa, gunakan pola ini sebagai acuan; tidak perlu menambahkan dependency atau menyalin animasi dashboard. Catatan ini tidak memigrasikan halaman lain secara otomatis.

## Detail aset BMN

- Reuse `assets.css` melalui scope `bmn-assets-ui bmn-detail-ui`; CSS tambahan khusus detail tidak mengubah efek Akses Cepat Modul dashboard.
- Kontrol dan perubahan warna baris: **150ms ease-out**, tanpa lift/scale kartu atau foto. Hapus zoom hero 500ms serta pulse penanda foto statis; pulse hanya untuk proses unggah yang benar-benar berlangsung. Kelompok formulir berganti dengan pola inbox Surat Tugas di bawah; kartu/baris tidak diberi animasi terpisah.
- Tab mengikuti acuan `kepegawaian/surat-tugas/inbox/_components/GmailStatusTabs.tsx`: **garis bawah2px** yang berpindah dengan spring **stiffness420, damping32**, ID per instance dari useId dan `initial={false}`. Aktif memakai accent-fg Emerald dan surface-muted, bukan pill hijau penuh. State aktif/fokus tetap jelas, dengan roving focus dan ArrowLeft/Right/Home/End; padding4px tablist menjaga outline.
- Isi mengikuti pola `kepegawaian/surat-tugas/inbox/page.tsx`: `AnimatePresence mode="wait" initial={false}` dengan satu `motion.div key={activeTab}` berisi semua kelompok formulir. Konten lama opacity1→0 dan y0→-8px, lalu konten baru opacity0→1 dan y8→0px, **160ms easeOut per fase** (sekitar320ms untuk keluar+masuk). Tanpa delay/stagger baris; pada kunjungan pertama konten langsung tampil. Pemilihan terbaru harus tetap menang saat pengguna berganti tab berulang.
- Wrapper tabpanel aksesibel tetap, yang berganti adalah kelompok isi di dalamnya. State draft tetap di induk sehingga nilai tidak hilang setelah pindah tab. Rerender biasa pada key sama tidak memutar ulang glide. Fade CSS150ms per kotak dari percobaan sebelumnya dihapus agar tidak bertumpuk. Gunakan Motion yang sudah terpasang, tanpa timer/dependency baru.
- `useReducedMotion` mengubah initial/exit menjadi opacity1/y0 dan durasi0, termasuk durasi indikator0; MotionConfig BMN dan fallback CSS reduce existing tetap. Uji browser reduce tetap mandiri pengguna sesuai arahan sebelumnya; fixture memeriksa cabang reduce, bukan mengklaim emulasi browser.
- Konten preview: **150ms ease-out** memakai Dialog existing; backdrop tetap timing primitive existing. Hindari lightbox custom yang memasang listener keyboard global dan menulis overflow body manual. Focus trap, Escape dan scroll lock ditangani primitive; pengembalian fokus memakai ref tombol pembuka karena preview juga dapat dibuka secara imperatif dari hero.
- Tombol prev/next dan panah kiri/kanan mempertahankan navigasi beberapa foto serta halaman dokumen. Gambar object-contain tidak dianimasikan; status gambar gagal mengganti gambar tanpa retry otomatis. Aksi thumbnail selalu terlihat, termasuk pada perangkat tanpa hover.
- MotionConfig BMN reducedMotion=user dan media query reduce terlokalisasi tetap dipakai; CSS reduce meniadakan transisi/animasi. Uji browser reduced motion revisi ini diserahkan kepada pengguna sesuai arahan sebelumnya.
- Browser normal: focus trap Tab/Shift+Tab, Escape dan focus-return dari hero/thumbnail; keenam tab mobile, edit-batal, light/dark dan lebar 359–1920px diperiksa. Konten Dialog terukur 0,15s; foto statis transform none/transition 0s, tanpa pulse idle. Fixture `node frontend/tests/bmn-detail-ui.cjs` menguji cabang status/form/tab, izin baca, loading/error, navigasi foto/dokumen serta fallback gambar; tidak mengukur FPS, sentuh fisik atau media query OS.

Area unggah foto kosong pada detail memakai perubahan background/border/teks150ms ease-out saat hover atau focus-visible, tanpa transform. Cursor pointer hanya untuk tombol enabled; disabled tetap cursor default. Efek pada wrapper ditangani CSS :has terhadap tombol yang aktif; fallback reduced motion scoped existing tetap menghapus durasi transisi.


## Sidebar BMN lanjutan — penerapan bertahap

Peminjaman (termasuk wizard/katalog/dialog), Pemeliharaan, Import Review (daftar/detail) dan Aset Dihapus kini memakai `.bmn-assets-ui.bmn-standard-ui`, termasuk scope tersendiri pada portal. Kontrol enabled memakai pointer, disabled default; feedback150ms ease-out. Tabel hanya berubah background pada hover/focus-within; kartu katalog tidak lift/zoom. Entrance tunggal halaman280ms, tanpa replay pada filter/refetch. Status memakai token semantik light/dark, seleksi memakai Emerald, hapus memakai danger. Input/secondary mengikuti border halus BMN.

Pergantian langkah wizard memakai **animasi di dalam tab** melalui `BmnTabContent`:160ms per fase, presence wait/initial=false, opacity/y8, reduced motion durasi0; draft tetap di induk. Filter summary Import Review adalah tombol aria-pressed, memakai feedback warna150ms tanpa animasi panel data. GET filter mempertahankan panel/input agar fokus ketik tidak hilang; aksi mutasi disabled selama fetching. Aset Dihapus membersihkan pilihan dan konfirmasi saat pencarian/halaman/jumlah berubah agar target aksi tetap terlihat.

Status audit seluruh menu dan batas bukti browser/fixture dicatat pada [audit sidebar lanjutan](bmn-ui-ux-modernization/remaining-sidebar-audit.md). Catatan tahap awal ini telah dilengkapi penutupan seluruh8 menu pada11 November2026 di matriks tersebut. Uji browser reduced motion tetap oleh pengguna; fallback source/fixture diperiksa. Seluruh perubahan sidebar disimpan dalam commit lokal, tanpa push atau deploy.


### Pengaturan Master BMN

Tiga tab memakai pola **animasi di dalam tab**160ms per fase lewat BmnTabContent; underline2px spring420/32 adalah efek terpisah, dengan ID per instance dan durasi0 saat reduced motion. Panah/Home/End mempertahankan fokus pada tab. Form tambah/edit dan konfirmasi hapus menggunakan Dialog existing150ms dengan scope BMN serta pengembalian fokus eksplisit ke pemicu. Swatch warna, aksi ikon, pencarian dan pagination memberi feedback150ms, tanpa lift/scale/stagger. Kartu statistik tidak diberi pointer atau hover gerak. Tidak ada animasi tambahan saat memilih Main/Sub Tag atau unit kerja manual.


### Dokumen & Laporan BMN: state di luar subtree animasi

Pola final tetap **animasi di dalam tab**:160ms keluar lalu160ms masuk (wait,initial=false,y8,easeOut), reduced motion0, underline spring420/32 per instance. Form laporan memindahkan state ke halaman induk dengan hook per form yang diekspor dari file existing. Jangan menaruh draft di subtree keyed yang dibongkar saat perpindahan. Effect pemilihan pegawai dijadikan handler perubahan pilihan agar remount tidak menghapus override manual; sinkronisasi mode edit dijaga ref di pemilik state. Resource riwayat lengkap dipakai kembali, tanpa refetch detail yang menimpa draft. Tidak menambah cache persisten/generic store/dependency.

Pemilih barang, unggah KTP dan kontrol form150ms, tanpa lift/zoom/stagger. Hover picker terbukti150ms di browser; Tab mencapai native file input dan focus-within menandai seluruh bidang. Scope Button memakai button/anchor dengan data-variant agar tetap berlaku ketika Radix asChild mengganti data-slot menjadi popover-trigger. Tablist diberi ruang4px dan scrollIntoView nearest saat navigasi keyboard agar outline tidak terpotong. Template cetak tidak dianimasikan/diwarnai ulang.

Kandidat Rusak Berat memakai entrance halaman280ms sekali; checkbox, search, peringatan expandable dan pagination feedback150ms, tanpa lift/scale/stagger baris atau animasi angka. Dialog buat paket150ms memakai primitive existing dengan Escape/focus-return. Reduced motion mengikuti fondasi BMN; pengujian browsernya tetap oleh pengguna.

## Paket Lelang dan navigasi BMN — 11 November 2026

- Daftar/kandidat/workflow memakai entrance halaman280ms sekali. Baris, kartu dokumen dan angka tidak lift/zoom/stagger. Kontrol, hover/focus, pilihan panitia dan Dialog150ms.
- Empat tab utama Paket Lelang dan subtab SK dalam editor memakai **animasi di dalam tab** existing: BmnTabContent, presence wait/initial=false, keluar y-8/opacity0 selama160ms, masuk y8→0/opacity1 selama160ms. Underline2px spring420/32, ID per instance. Draft AssetsLot/Valuation/DocumentsCenter/Realization hidup pada hook pemilik di page; draft narasi SK di pemilik modal. Pergantian tab tidak membuang isian.
- Tab utama memakai keyboard Radix; subtab editor mendukung ArrowLeft/Right/Home/End, roving tabIndex dan aria-controls/labelledby. Disabled fieldset narasi tidak mematikan navigasi subtab pratinjau. Modal memakai Dialog existing untuk Escape/focus trap/focus-return. Header editor membungkus aksi pada mobile.
- Sidebar mempertahankan spring navigasi existing450/35, bukan pola tab isi. Drawer/collapse150ms; fade keluar route existing120ms terpisah dari entrance halaman. Reduced motion: CSS durasi0 dan Framer duration0; nav/menu aktif memakai aria-current/expanded dan fokus kembali setelah Escape mobile. Efek Akses Cepat dashboard tetap seperti semula.

Fixture/source memverifikasi fallback reduced motion; emulasi browser tetap dikerjakan pengguna sesuai preferensi. Rincian pengujian aktual ada di [audit sidebar](bmn-ui-ux-modernization/remaining-sidebar-audit.md).

## Surat Tugas — 11 November 2026

- Terapkan feedback hover, pressed dan fokus 150 ms pada kontrol Surat Tugas. Kontrol aktif memakai pointer dan kontrol disabled memakai cursor default. Baris dan kartu memakai perubahan warna tanpa lift atau stagger. Entrance 280 ms hanya untuk pembukaan halaman.
- Gunakan pola **animasi di dalam tab** untuk panel status inbox. Isi keluar dan masuk dengan opacity dan perpindahan vertikal 8 px selama 160 ms per fase. Panel keluar bersifat inert. Garis bawah 2 px memakai spring 420/32, dengan ID per instance. Pertahankan fokus saat navigasi dengan panah/Home/End. Wizard pengajuan memakai durasi dan perpindahan yang sama, dengan draft berada di induk.
- Dialog, drawer dan dropdown memakai 150 ms. Tutup dengan Escape dan kembalikan fokus ke kontrol pemicu. Dialog A4 native Portal memakai fade 150 ms. Kertas tetap stabil dan dapat digulir di dalam pratinjau pada mobile.
- Scope CSS `.st-ui` mematikan animasi dan transisi saat reduced motion. Cabang Framer memakai durasi 0. Hasil browser dan cakupan fixture tersedia di [audit visual Surat Tugas](testing/surat-tugas-visual-audit.md).
