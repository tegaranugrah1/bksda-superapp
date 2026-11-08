# Penutupan review keamanan dan Ponytail modul Portal — 8 November 2026

Status: **perbaikan dan verifikasi lokal selesai untuk cakupan Portal**. Lima akar masalah baru yang terbukti sudah diperbaiki. Enam belas temuan historis dari run-2/run-3/run-4, beserta perbaikan tambahan pada progress 26–35, dicocokkan kembali dengan sumber dan regresi sekarang. Satu klaim admin-signal yang dahulu ditolak tetap ditolak; tidak dihitung sebagai celah atau perbaikan baru.

Audit menggunakan profil **standard** dari security-audit dan ponytail-review. Ini audit menyeluruh dalam lingkup Portal, sekaligus **cakupan parsial terhadap seluruh repositori dan lingkungan produksi**. Tidak ada kandidat yang belum diputuskan atau pekerjaan kode dalam ledger yang ditunda. Perbaikan, tes, laporan dan update progress disatukan dalam commit penutupan lokal; belum di-push atau deploy.

## Mengapa laporan sebelumnya terlihat berbeda

Jawaban sebelumnya hanya merangkum potongan pemeriksaan tiap putaran. Temuan lama tidak hilang dan tidak diganti kesimpulannya, tetapi tidak selalu ditampilkan lagi. Catatan "tidak ada celah baru" pada satu potongan juga tidak menyatakan seluruh portal sudah diaudit. Laporan ini menjadi rekap penutupan: memisahkan cacat historis, lima akar masalah baru, penyederhanaan kode dan batas verifikasi.

## Cakupan dan cara pemeriksaan

Seluruh tab portal, detail/deep-link Surat Tugas, profil/foto/email/password/2FA, aset dan pinjaman pribadi, cuti dan scan, notifikasi HTTP/realtime, visum, kalkulator, laporan umum/Smart Patrol/cetak, cache/draft dan dependensi pengamanan bersama diperiksa. Jalur administratif saudara dibaca saat menentukan otoritas atau integritas data yang dipakai portal.

Ledger memuat **33 unit:22 covered, 8 unit dengan bukti lima temuan yang sudah diverifikasi/diperbaiki, 3 out_of_scope**. Istilah `candidate` pada 8 unit adalah tempat tautan record temuan, bukan delapan celah terbuka. Tidak ada unresolved/deferred/blocked pada unit dalam cakupan. Dua coverage critic terpisah tidak menemukan unit atau jalur lain yang perlu ditambahkan/diperiksa ulang.

Run-2/3/4 beserta seluruh record dan ledger dibaca; run-5 mempunyai record/ledger kosong dan tidak dijadikan bukti penutupan. Identitas sumber: HEAD `b677713b75d23feab49b32ee75d880ca16faca17` ditambah perubahan working tree yang hash-nya dicatat. Snapshot pre-fix dipisahkan untuk membandingkan hasil merah/hijau.

Eksekusi hanya di Docker terisolasi tanpa jaringan eksternal dengan akun/data dummy, environment allowlist, source/toolchain read-only, scratch tmpfs, batas CPU/RAM/pid/file/waktu. PHP8.4.27, Node22 dan Chromium lokal dipakai tanpa memasang dependency baru. Observer tepercaya membuka descriptor sebelum target hidup dan hanya mempromosikan file regular/single-link berukuran terbatas setelah semua writer berhenti.

## Lima temuan baru dan alasan perbaikannya

Seluruhnya berprioritas **medium sesuai dampak lokal yang dibuktikan**, dan sudah diperbaiki. Hasil sebelum perbaikan adalah cacat snapshot pre-fix, bukan pernyataan bahwa kode sekarang masih rentan.

| ID | Masalah | Bukti sebelum | Yang diubah dan kenapa | Sesudah |
|---|---|---|---|---|
| N1 | 2FA memakai ulang recovery proof yang sedang dikonsumsi | Dua penyelesaian HTTP pada snapshot lama sama-sama200. | Recovery memakai UPDATE bersyarat atas ciphertext lama, password dan secret; TOTP memakai Cache::add atomik. | Penyelesaian pertama200, kedua422; array recovery tetap valid. |
| N2 | GET aset menimpa pengalihan pemilik oleh admin | Setelah B ditetapkan, GET A mengembalikan employee_id ke A; BPKB A200. | Hapus auto-heal kepemilikan dari GET; pertahankan resolver nama dan writer administratif. | A403, B200, owner database tetap B. |
| N3 | GET visum menimpa konfigurasi admin terbaru | Snapshot lama di-merge lalu disimpan kembali menimpa empat region baru. | Default visum digabung dalam memori; penyimpanan hanya melalui writer admin. | Nilai admin tetap utuh, pembaca tetap mendapat default lengkap. |
| N4 | Saldo cuti belum tersimpan mengabaikan aturan efektif | CPNS tanpa hak2025 dan histori12hari tetap bisa membuat pengajuan201. | Satu EmployeeLeave::forEmployeeYear dipakai pembacaan, pengajuan dan seluruh inisialisasi persetujuan. | Keduanya422; approval tiga jalur ditolak; carryover dan pindah tahun tetap benar. |
| N5 | State React lama bertahan saat akun berganti | Tab ST lama menampilkan surat A saat identitas sudahB; tidak meminta dataB. | Key pemilik state PortalContent/SuratTugasPreviewContent mengikuti useAuth().user.id. | A langsung hilang, adapter diminta sebagaiB dan menampilkan penolakanB. |

N1 tidak membuktikan dua bearer bertahan bersamaan atau dua worker OS; tes menggunakan interleaving HTTP deterministik. Atomicity TOTP lintas proses mengikuti driver cache bersama yang menyediakan `add` atomik. N2/N3 memakai hook penjadwalan snapshot dan committed write dummy, bukan dua HTTP admin paralel. N4 membuktikan reservasi sendiri melampaui kuota, bukan self-approval. N5 memakai Chromium dan React/komponen/auth nyata dengan adapter API dan router Next dummy: bukti dinamis pada detail ST, perubahan key portal utama diperiksa dari sumber, bukan klaim E2E deployment/backend.

Lokasi utama: `AuthController::login2Fa/myAssets/logout`, `VisumSpdController::getSettings`, `EmployeeLeave::forEmployeeYear`, `EmployeeLeaveController`, `EmployeeLeaveRequestController`, `frontend/src/app/portal/page.tsx` dan `portal/surat-tugas/[id]/page.tsx`. Setiap temuan melalui verifier baru dan pemeriksa record akhir yang berbeda; record/source/evidence rinci berada di artefak run-6.

## Rekonsiliasi 16 temuan historis

Semua baris berikut **sudah diperbaiki pada kode sekarang**; bukan 16 temuan baru.

| Temuan lama | Kontrol sekarang | Verifikasi sekarang |
|---|---|---|
| Cache GET lintas akun | Cache/pending response terikat generasi autentikasi; respons lama dibatalkan. | 8 skenario cache pada modul API/auth nyata |
| Surat Tugas admin lintas modul | Endpoint personal membatasi pemilik/peserta/pembuat atau admin modul yang sesuai. | PortalPersonalSecurityTest; SuratTugas security/full-schema |
| Penggantian 2FA yang sudah aktif | Enable/confirm ulang ditolak; penggantian melalui disable dengan password. | PortalAuthSecurityTest; TwoFactorTest |
| Akun nonaktif memakai sesi/challenge lama | Middleware memeriksa status aktif sebelum pengecualian, mencabut token dan sesi. | Tes cookie nyata, challenge, dokumen dan channel |
| Logout cookie meninggalkan bearer | Relasi seluruh token dicabut, web guard logout dan sesi diinvalidasi. | Tes mixed cookie/bearer dan HTTP login/logout |
| Nama legacy BMN salah/ambigu | ID eksplisit berwenang; fallback nama harus unik, konflik/kembar ditolak. | Tes nama kosong, parsial, kembar, konflik kolom dan import |
| Filter employee_id membuka aset lain | Pengecualian hanya GET list milik sendiri; detail/berkas memeriksa owner aktual. | Tes BPKB, body override, ekspor global dan mutasi |
| Kode cuti melewati aturan jenis/kuota | Kode/nama diselesaikan ke master kanonik; eligibility, reservasi dan debit konsisten. | Tes CT/CAP/PPPK, approve/status/cancel dan rename |
| Mutasi master visum oleh anggota biasa | Seluruh writer mensyaratkan role admin/super_admin dan modul keuangan. | Tes settings/template create/update/delete/default/duplicate |
| Notifikasi ke admin yang modulnya dicabut | Penerima diperiksa ulang berdasarkan role, modul dan status aktif. | PortalIdentityBoundaryTest fanout/withdrawal |
| Token reset email lama berpindah identitas | Hook email menghapus token reset alamat lama dan tujuan, kedua writer memakai helper sama. | HTTP reset/verification/email-change dan isolasi pegawai |
| Foto pegawai berbeda berbagi objek storage | Seluruh writer memakai path unik per employee ID dan cleanup yang memeriksa referensi. | PortalUploadSecurityTest dengan fake storage dan MIME nyata |
| Race reservasi/debit cuti | Kunci employee sebelum keputusan dan muat ulang request dalam transaksi. | 5 kasus native PostgreSQL dengan dua worker |
| Race rename jenis cuti | Protokol kunci katalog mendahului employee; klasifikasi riwayat tetap konsisten. | 1 kasus rename/create native PostgreSQL dua worker |
| Fallback form login memakai GET | Form kredensial menetapkan method POST secara native. | Source method POST tetap ada; bukti Chromium historis tidak dipromosikan sebagai eksekusi baru |
| Topik realtime bertahan setelah token dicabut | Channel memakai ID token dan dispatch memilih token/otoritas yang masih sah. | HTTP auth channel, token expiry/revoke, current topic/fanout/login/logout |

## Perbaikan tambahan dari progress 26–35

| Area | Kontrol yang dipertahankan | Verifikasi |
|---|---|---|
| Challenge 2FA sesudah reset/pergantian faktor | Fingerprint password dan secret harus tetap cocok sebelum penyelesaian. | PortalAuthSecurityTest |
| Percobaan salah memperpanjang umur challenge | RateLimiter terpisah; challenge asli tidak ditulis ulang sehingga TTL tetap. | Tes menit4/6, lima kegagalan dan login baru |
| Ringkasan mobile membocorkan jumlah approval global | Butuh modul ST/KPG beserta role/permission, atau super_admin. | Matriks tujuh kombinasi role/module/permission |
| GET saldo menghapus pemakaian historis/manual | Saldo tersimpan menjadi acuan; GET hanya menghitung draft saat belum ada. | Tes pemakaian8hari tetap8, penolakan kuota dan debit8→9 |
| Query/path token dan OTP masuk audit log | URL tanpa query, parameter path sensitif menjadi pola route, code2FA disensor. | Tes redaksi token aktif, recovery/TOTP, share path dan metadata bisnis |
| Peminjam dapat mengakses dokumen rahasia/MIME berbahaya | Borrower hanya enam foto umum GET; owner, expiry dan MIME tetap diperiksa. | Tes STNK/BPKB, foto returned-loan, query expiry/nonaktif dan upload MIME |
| Email/profil/izin email admin | Password wajib untuk perubahan alamat; user/employee terikat akun; konfigurasi email hanya super_admin. | Tes dua endpoint email, phone, email kosong dan isolasi akun |
| Perbaikan Drive pada catatan sebelumnya | Writer tetap memakai canWrite dan akun manajer dibuat nonaktif dengan password acak; share di trash bisa dicabut aman. | Regresi personal star/restore/force-delete/share; DriveHierarchicalResorRBACTest. Audit penuh Drive tetap di luar cakupan portal. |
| Frontend file URL, gambar dan judul cetak | Skema URL dan MIME raster dibatasi; teks/judul cetak di-escape. | Source seluruh sink portal; upload HTTP; Chromium komponen ST+print-media dengan markup dummy inert |

## Perubahan lain dan Ponytail

- `AuthController:197`: **delete** lookup/delete token saat ini yang langsung diikuti delete seluruh token. Hapus duplikasi, pertahankan pencabutan bearer dan sesi.
- `AuthController:325`: **delete** writeback kepemilikan pada GET. Ini sekaligus menutup N2.
- `EmployeeLeaveRequestController:375`: **shrink** pemetaan alias status yang tidak dapat dicapai oleh validasi menjadi `strtoupper`; batas status/otoritas tetap sama.
- `EmployeeLeave:51`: **reuse** aturan draft saldo yang sudah ada untuk semua pembaca dan initializer; hapus default kuota yang disalin berbeda-beda. Saldo tersimpan tidak dihitung ulang.
- `VisumSpdController:17`: **delete** create/update dari GET; gabung default tanpa menyimpan. Ini sekaligus menutup N3.
- `AssetPhotoController`: **native** hapus wrapper `disk()` yang hanya meneruskan default; gunakan `Storage::disk()` pada pemanggil. Guard akses, MIME dan path dipertahankan.
- `frontend/src/lib/api.ts`: **delete** alias `apiExport`; named/default export tetap menunjuk objek API yang sama.
- `AuthSync.tsx`: **delete** variabel `isLoginRoute` yang tidak digunakan.
- `ActiveLoansTab.tsx`: **shrink** pemeriksaan status mentah yang sudah dicakup hasil lowercase.
- Detail ST: tambahkan `?download=1` karena pemanggil blob sebelumnya menerima JSON preview. Endpoint preview lainnya tetap mendukung JSON.
- Beri nama fungsi `TabLoading` agar pemeriksaan ESLint display-name lulus.
- Tes PostgreSQL ST memakai konfigurasi database tes, menggantikan server/port/password developer yang hardcoded. Kini bisa berjalan pada database dummy terisolasi.

**net: -93 lines pada implementasi putaran penutupan ini**, dibanding snapshot awal run-6; tes dan dokumentasi tidak dihitung. Tidak ada dependency baru. Penyederhanaan lama pada kalkulator, viewer, middleware dan helper email tetap dipertahankan.

## Hasil pengujian

| Pemeriksaan | Hasil |
|---|---|
| Suite gabungan PHP current | **220 tes, 3022 assertions; 217 lulus, 3 terlewati**,0 gagal |
| Regresi setelah cleanup terakhir | **90 tes, 1194 assertions lulus**,0skip/0gagal |
| Dua tes ST PostgreSQL yang terlewati di SQLite | Dijalankan terpisah di PostgreSQL15: **2 tes, 10 assertions lulus** |
| Konkurensi cuti PostgreSQL nyata | **5/5 kasus lulus**: duplikasi, reservasi, approve ulang, status ulang, batas saldo |
| Rename jenis cuti/create PostgreSQL nyata | **1/1 kasus lulus**, nama kanonik dan reservasi tetap konsisten |
| Chromium komponen nyata | Pergantian akun dua tab, penghapusan stateA, permintaanB/penolakanB, markup literal dan print-media **lulus** |
| Cache API/auth dengan Axios nyata dan adapter dummy | **8/8 skenario lulus** |
| Kalkulator draft | Baca sekali, seluruh field, storage kosong/rusak dan SSR **lulus** |
| TypeScript seluruh frontend | `--noEmit --incremental false` **lulus** |
| ESLint file frontend yang diperiksa | **0 error,0 warning** setelah fungsi loading diberi nama |
| Record dan coverage validator | **5 record valid,33 unit valid** |
| Whitespace diff | `git diff --check` bersih |

Tiga skip pada suite gabungan tidak dihitung sebagai lulus: dua memerlukan PostgreSQL (sudah dijalankan terpisah), satu tes lama mengharuskan path Chrome Windows. Script lama itu juga menyusun HTML simulasi. Penggantinya pada audit ini memakai komponen ST/React nyata dalam Chromium Linux serta print-media; tidak mengklaim menjalankan tes Windows yang sama atau seluruh dialog cetak aplikasi.

Reproduksi masing-masing temuan baru gagal pada invariant yang tepat sebelum perbaikan dan lulus sesudahnya. Tambahan tiga regresi memeriksa approval pada saldo0 melalui status/approve/generate, perpindahan riwayat approved antar tahun tanpa saldo awal, dan carryover yang benar untuk dua pengajuan total13hari. Bukti dan output tidak berisi kredensial operasional.

Runner tepercaya dan seluruh receipt/hash berada di `C:/Users/USER/security-audit-skill/bksda-superapp/run-6/`. Perintah lokal yang tersedia: `python .../run.py php`, `frontend`, `browser`, `lint`, `validate`; database concurrency memakai `run-pg.py` dengan nama job unik. Jangan arahkan fixture ke server/domain/database operasional. Batas PHP/Node:1CPU,1536MiB,pids64,file16MiB,scratch128MiB,wall185s; Chromium pids256. PostgreSQL memakai namespace loopback terisolasi dan resource/scratch database terpisah; receipt tiap job mencatat batas aktual.

## Batas penutupan

Kode Portal dan semua akar masalah terkonfirmasi dalam cakupan sudah diperbaiki serta diuji sesuai bukti di atas. Pemeriksaan ini tidak menyatakan sistem produksi sudah menerima perbaikan. Commit penutupan hanya menyimpan perubahan lokal; tidak ada push, deploy, migrasi atau perubahan data operasional.

Log historis yang mungkin pernah memuat token/OTP belum dibaca/dibersihkan dan kredensial operasional belum dicabut. Perbaikan logging berlaku untuk penulisan baru. Aset legacy ambigu yang sudah telanjur mempunyai ID eksplisit tidak dimigrasikan massal; penetapan pemilik aktual tetap keputusan admin. Konfigurasi proxy/CDN, domain cookie/CORS, cache bersama, mail/storage provider dan Reverb operasional tidak dipastikan melalui pengujian live. Ini batas lingkungan dan tindakan operasional, bukan kandidat celah baru tanpa bukti.

Audit penuh modul standalone Drive/CMS/mobile, CI/release dan infrastruktur berada di luar cakupan. Laporan lama tetap disimpan sebagai riwayat; gunakan laporan ini untuk status penutupan kode saat ini.
