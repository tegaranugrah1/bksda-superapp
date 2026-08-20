# Issue #576 — Task: Bottom Navigation BMN Mobile

> **Branch**: `mobile-development`
> **Dokumen terkait**: `requirements.md`, `design.md`
> **Status**: Fase pertama diimplementasikan; belum di-commit

## Phase 0 — Review dan Baseline

- [ ] Review issue, requirement, dan design bersama user.
- [ ] Pastikan branch aktif `mobile-development`.
- [ ] Pastikan perubahan lokal yang tidak terkait tetap aman.
- [ ] Catat seluruh route BMN yang terdaftar di `AppTabs`.
- [ ] Catat semua submenu BMN di `FabMenu`.
- [ ] Cocokkan submenu dengan screen yang benar-benar tersedia.
- [x] Tentukan tab fase pertama berdasarkan screen siap: Beranda dan Aset.
- [x] Konfirmasi Pemeliharaan, Sampah, dan daftar Pinjaman belum memiliki screen final.

## Phase 1 — Navigator dan Tipe Route

- [x] Gunakan `BmnTabs.tsx` baru dengan pola nested navigator.
- [x] Tambahkan `BmnTabParamList` dengan route tab utama.
- [ ] Tambahkan route internal untuk detail/form/capture foto bila diperlukan.
- [ ] Pastikan param `BmnDetail`, `BmnForm`, dan `BmnPhotoCapture` tetap typed.
- [x] Daftarkan entry point `BmnMain` di `AppTabs`.
- [x] Pertahankan route global lama selama masa kompatibilitas.
- [ ] Pastikan global `AppTabs` tab bar tetap tersembunyi sesuai desain aplikasi.

## Phase 2 — Bottom Navigation BMN

- [x] Implementasikan bottom nav dengan pola `KepegawaianTabs`.
- [x] Tambahkan tab Beranda BMN.
- [x] Tambahkan tab Aset/Data Aset.
- [ ] Tambahkan tab Pinjaman setelah screen daftar peminjaman tersedia.
- [ ] Tambahkan tab Perawatan hanya jika screen final tersedia.
- [ ] Tambahkan tab Sampah hanya jika screen final tersedia.
- [ ] Gunakan icon dan label yang konsisten.
- [ ] Terapkan warna aktif/inaktif dari theme BMN.
- [ ] Pastikan layout tidak menyisakan slot kosong dari route hidden.
- [ ] Pastikan safe area dan bottom padding tidak menutupi konten.

## Phase 3 — Route Internal dan Back Behavior

- [ ] Daftarkan `BmnDetail` sebagai route internal tersembunyi jika dibutuhkan.
- [ ] Daftarkan `BmnForm` sebagai route internal tersembunyi jika dibutuhkan.
- [ ] Daftarkan `BmnPhotoCapture` sebagai route internal tersembunyi jika dibutuhkan.
- [ ] Pastikan route internal memakai `tabBarButton: () => null`.
- [ ] Pastikan route internal memakai `tabBarItemStyle: { display: "none" }`.
- [ ] Ubah fallback back detail agar kembali ke tab Aset yang terlihat.
- [ ] Ubah fallback back form agar kembali ke tab induk setelah konfirmasi perubahan.
- [ ] Ubah fallback back capture foto agar kembali ke pemanggil yang benar.
- [ ] Tambahkan handler hardware back bila navigator tab tidak menangani history dengan benar.
- [ ] Pastikan tab aktif tetap benar setelah detail/form ditutup.

## Phase 4 — Integrasi FabMenu

- [ ] Pertahankan FAB sebagai menu global lintas modul.
- [x] Arahkan `bmn` ke entry point navigator BMN/ Beranda.
- [x] Arahkan `data-aset` ke tab Aset.
- [x] Tahan `bmn-loan` sebagai disabled karena screen saat ini hanya form berbasis `assetId`.
- [ ] Arahkan `bmn-maintenance` hanya jika screen tersedia.
- [ ] Arahkan `bmn-trash` hanya jika screen tersedia.
- [x] Jangan mengaktifkan submenu BMN yang masih disabled.
- [ ] Pastikan perpindahan ke modul lain tetap bekerja.
- [ ] Pastikan masuk kembali ke BMN memilih Beranda atau tab terakhir sesuai keputusan review.

## Phase 5 — Access Control

- [ ] Gunakan `hasModule(user, "bmn")` pada entry point BMN.
- [ ] Pastikan user tanpa akses BMN tidak melihat pilihan BMN di FAB.
- [ ] Pastikan route BMN tidak dapat dibuka melalui UI jika akses tidak ada.
- [ ] Pastikan superadmin tetap dapat membuka BMN.
- [ ] Jangan menganggap guard frontend sebagai pengganti authorization backend.
- [ ] Uji user dengan `access_modules: []`, `access_modules: ["kepegawaian"]`, dan `access_modules: ["bmn"]`.

## Phase 6 — Testing

- [ ] Tambahkan/update test navigator jika struktur test sudah tersedia.
- [ ] Jalankan TypeScript check mobile.
- [ ] Jalankan ESLint file yang berubah.
- [ ] Jalankan test permission terkait.
- [ ] Uji Beranda → Aset → Pinjaman.
- [ ] Uji Aset → Detail → Back.
- [ ] Uji Aset → Form → Back.
- [ ] Uji Form → Capture Foto → Back.
- [ ] Uji membuka BMN dari FAB global.
- [ ] Uji berpindah BMN → Kepegawaian → kembali ke BMN.
- [ ] Uji orientation/ukuran layar mobile yang didukung.
- [ ] Uji bottom nav tidak hilang saat refresh/refetch data.

## Phase 7 — Manual QA Matrix

| Skenario | Hasil yang diharapkan | Status |
|---|---|---|
| User dengan akses BMN masuk dari FAB | Navigator BMN terbuka | [ ] |
| User tanpa akses BMN membuka FAB | BMN tidak tersedia | [ ] |
| Tap Beranda | Dashboard BMN aktif | [ ] |
| Tap Aset | Daftar aset aktif | [ ] |
| Tap Pinjaman | Daftar peminjaman aktif | [ ] |
| Buka detail aset lalu Back | Kembali ke tab Aset dan tab aktif | [ ] |
| Buka form aset lalu Back | Kembali ke tab Aset tanpa kehilangan nav | [ ] |
| Buka capture foto lalu Back | Kembali ke form/detail pemanggil | [ ] |
| Pindah modul lalu kembali BMN | Bottom nav BMN tampil normal | [ ] |
| Putar layar/perubahan ukuran | Layout tidak terpotong | [ ] |

## Phase 8 — Dokumentasi dan Delivery

- [ ] Update `docs/progress.md` setelah implementasi selesai.
- [ ] Catat file yang berubah pada PR.
- [ ] Pastikan tidak ada perubahan pada branch `production`.
- [ ] Jangan menjalankan Graphify kecuali diminta secara terpisah.
- [ ] Buat PR dari `mobile-development` sesuai alur repository.
- [ ] Pastikan acceptance criteria issue #576 terpenuhi.

## Definition of Done

- [ ] Bottom nav BMN aktif dan konsisten dengan pola Kepegawaian.
- [ ] Route internal tidak mengambil slot bottom nav.
- [ ] Back navigation kembali ke tab BMN yang benar.
- [ ] FAB tetap berfungsi sebagai navigasi lintas modul.
- [ ] Hak akses BMN diterapkan di entry point mobile.
- [ ] TypeScript, lint, test, dan manual QA selesai.
- [ ] Dokumen progress diperbarui.
- [ ] Tidak ada commit atau perubahan pada `production` sebelum user meminta delivery.
