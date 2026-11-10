# Pedoman Animate UI dan Motion BKSDA SuperApp

Revisi: **10 November 2026**. Acuan warna: [DESIGN_SYSTEM_COLORS.md](DESIGN_SYSTEM_COLORS.md).

## 1. Status dan ruang lingkup

Pedoman ini membedakan feedback kartu informasi dan navigasi, menjaga angka tetap terbaca, membatasi pulse untuk loading, dan menghindari klaim jaminan 60fps. Targetnya adalah aplikasi operasional: data mudah dibaca, navigasi jelas, serta feedback cepat. Animasi tidak membuktikan data sinkron, valid, atau sudah diaudit.

**Implementasi saat revisi:** pola Animate UI digunakan melalui `framer-motion` yang sudah terpasang. Paket `@animate-ui/react` belum dipasang dan tidak diperlukan untuk perubahan ini. Jangan mengimpor API paket itu seolah sudah tersedia. Istilah Animate UI di sini menjelaskan referensi pola interaksi, bukan klaim penggunaan seluruh komponen resmi.

Perubahan kode mencakup dashboard BMN, kebijakan MotionConfig di layout BMN, dan CSS aksi yang dibatasi oleh `[data-module="bmn"]`. Modul lain tidak dimigrasikan melalui pekerjaan ini.

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
