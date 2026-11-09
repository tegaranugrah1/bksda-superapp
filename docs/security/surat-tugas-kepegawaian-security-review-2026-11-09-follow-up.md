# Tindak lanjut tiga lead validasi Surat Tugas dan Kepegawaian

Tanggal: 9 November 2026. Acuan kode: commit `8578c9f31d0f847a12314ce33cc967ee9eab9a85`.

**Seluruh pemeriksaan lanjutan yang aman dan tersedia sudah selesai.** Tiga pemeriksa independen baru membaca ulang source dan bukti mentah yang disetujui; ketiganya memverifikasi bahwa record sebelumnya tetap tepat. Tidak ada perubahan verdict: **18 temuan historis diperbaiki, 3 needs_validation tanpa severity, dan 2 dugaan ditolak**. Tidak ditemukan dasar baru untuk mengklaim ketiga lead sebagai celah aktif terkonfirmasi atau menyatakan ketiganya terbantahkan.

Istilah needs_validation menyatakan ada fakta penentu yang belum terbukti. Itu berbeda dari pekerjaan perbaikan kode yang masih berjalan. Untuk operator dan snapshot, perbaikan source sudah tersedia dan bukti regresinya lulus. Untuk ZIP, dampak terhadap pengguna lain belum terbukti; ketiadaan budget agregat sendiri tidak cukup menjadi temuan keamanan.

## 1. Akses operator asisten pada versi lama

Fingerprint: `assistant/operator/unauthenticated-management-route`.

**Dugaan awal:** route lama `/qr` dan `/api/qr-live` tidak meminta otorisasi operator sebelum menggunakan adapter gateway. Pengamatan baseline hanya membuktikan halaman HTML anonim dapat dibuka; belum membuktikan QR/kode pairing sensitif dibaca atau akun ditautkan.

**Yang selesai:** source sekarang memasang `requireOperator` pada kedua route, memakai kredensial operator tersendiri, menetapkan `Cache-Control: no-store`, mengembalikan 503 saat password belum dikonfigurasi dan 401 bila kredensial tidak tepat. Kunci produsen webhook tidak memberikan hak operator. Pemeriksaan source gateway juga memastikan status sudah tersambung cukup mengembalikan `open`, tanpa perlu meminta koneksi baru.

Uji ulang aman terbaru memakai TypeScript dan Express aktual dengan HTTP loopback dalam sandbox: **1 skenario, 84 assertions, 0 gagal**, receipt `assistant-6eac30a1c741`. Gateway diganti recording adapter dengan jawaban connected-state; ini menguji urutan otorisasi sebelum delegasi, tanpa menghasilkan QR/pairing atau memanggil provider. Pemeriksa independen membaca dan memverifikasi hash receipt tersebut.

**Kenapa lead belum ditutup:** konfigurasi ingress dan otorisasi upstream deployment historis belum diketahui, demikian pula apakah instance/provider pada waktu itu benar-benar dapat mengembalikan material sensitif. Mapping port pada compose bukan bukti akses publik aktual. Kode sekarang yang sudah aman tidak membuktikan ataupun membantah dampak historis.

**Fakta untuk menutupnya:** hanya review arsip konfigurasi ingress/otorisasi versi terdampak dan catatan kapabilitas provider yang sudah ada, tanpa credential, QR, kode pairing, probe endpoint atau penautan akun. Bila bukti tersebut tidak tersedia, status tetap historical needs_validation; jangan mengklaim account takeover.

Source: `hermes-agent/assistant/src/index.ts:43`, `:58`, `:64`; `hermes-agent/assistant/src/gateway/evolution.ts:80`; `hermes-agent/docker-compose.yml:66` dan `:76`.

## 2. Retensi metadata pada impor ZIP presensi

Fingerprint: `kpg/meal/zip-cumulative-metadata-retention`.

**Dugaan awal:** parser ZIP HTML/XLS mengumpulkan hasil seluruh anggota yang diterima sebelum deduplikasi NIP/periode. Tidak ada budget byte agregat untuk jalur tersebut. Ini masih merupakan pertanyaan tentang kemungkinan kapasitas API pengguna lain ikut terpakai oleh impor admin yang sah, bukan bukti gangguan layanan.

**Yang selesai:** jalur endpoint dan seluruh kontrol pembatas diperiksa ulang. Import memerlukan autentikasi, modul Kepegawaian dan role admin/super_admin; throttle berlaku. Parser hanya memeriksa 200 entri pertama, melewatkan hidden/macOS dan ekstensi yang tidak didukung, memakai basename, serta membaca paling banyak 5 MiB per anggota. Path file tidak diekstrak dari nama anggota. XLSX punya preflight 20 MiB tersendiri; batas XLSX tidak dianggap otomatis berlaku pada ZIP HTML/XLS.

Tes native kecil terbaru untuk filter, basename dan cutoff 200 entri lulus **1 tes, 3 assertions, 0 gagal**, receipt `php-d67a7ee18cd2`. Tes memakai anggota berukuran kecil. Tidak dilakukan pembesaran metadata, pencarian ambang kehabisan memori, stress, OOM atau pengujian layanan bersama. Hasil kecil ini tidak dipakai untuk mengklaim DoS ataupun ketiadaan DoS.

Pemeriksaan template deployment mengakui kontrol yang benar-benar ada: nginx body 25M; PHP upload 20M/post 25M; pemilihan `php.ini-production`; proses PHP-FPM; satu backend pada template produksi; dan `restart: always`. Tidak diasumsikan tidak ada memory limit atau satu request pasti menjatuhkan semua worker.

**Kenapa lead belum ditutup:** repository tidak menunjukkan konfigurasi efektif deployment aktif: `memory_limit`, `max_execution_time`, batas terminasi request FPM, ukuran pool, quota CPU/memory container, dan isolasi/reservasi kapasitas untuk request pengguna lain. Source dan tes kecil tidak dapat menentukan apakah akibatnya hanya kegagalan request importir sendiri atau melampaui boundary pengguna lain.

**Fakta untuk menutupnya:** owner cukup meninjau nilai konfigurasi efektif dan arsitektur isolasi yang sudah ada, tanpa upload pemicu atau pengukuran saturasi. Jika kontrol membatasi akibat ke request importir sendiri, klaim keamanan harus ditolak dan budget agregat menjadi hardening opsional. Jika ada kapasitas bersama yang terancam, tentukan batas produk dan isolasi yang sesuai berdasarkan konfigurasi tersebut. Tidak menambahkan batas produk arbitrer hanya untuk mengubah label audit menjadi selesai.

Source: `backend/app/Modules/Kepegawaian/Services/SikadirParserService.php:46`, `:169`, `:186`, `:191`; `backend/app/Modules/Kepegawaian/Routes/api.php:96`, `:136`; `backend/Dockerfile:60`, `:69`; `docker-compose.prod.yml:32`; `deploy/nginx-backend.conf:45`.

## 3. Kausalitas kegagalan render snapshot ST lama

Fingerprint: `surat-tugas/public-snapshot/untyped-render-state`.

**Dugaan awal:** snapshot lama dapat menyimpan nilai departure bertipe selain string dari submit publik, kemudian reader Builder meneruskannya ke React child. Yang harus dibuktikan adalah pengaruh input lebih rendah ke administrator yang membuka record yang sama, dengan penyebab render yang bisa diatribusikan secara tepat.

**Yang selesai:** source historis dan current diperiksa lagi; seluruh ukuran/hash output dari tiga receipt lama yang disetujui cocok. Bukti lama memang menunjukkan submit diterima dan kegagalan render record tersebut, tetapi mencampur tiga keluarga error: `null.text` di Builder, invalid React child `{dummy}` dengan frame global error boundary, dan `.trim` pada tembusan di shared preview. Ringkasannya juga mencatat `pageErrors=0`. Bukti campuran tersebut tidak mengisolasi departure sebagai penyebab tunggal; error frame global sendiri tidak menyelesaikan atribusi.

Source sekarang mewajibkan nested snapshot types, reader hanya menghidrasi departure string, dan mandate diperiksa sebagai string sebelum digunakan. Receipt current HTTP yang sudah disetujui `php-d416c7034366` lulus **1 tes/60 assertions**, meliputi penolakan bentuk terkait dan penyimpanan tetap utuh; receipt legacy reader `e2e-5b78f941742c` lulus pada fixture yang tercatat. Keduanya dibaca dan hash-nya diperiksa ulang, **tidak dijalankan ulang**. Ini mendukung remediasi yang dibatasi pada source/fixture tersebut, bukan membuktikan semua bentuk data aman.

**Kenapa lead belum ditutup:** belum ada bukti yang disetujui dengan atribusi departure-only historis yang terisolasi. Automatic approval review sebelumnya menolak dynamic snapshot verification dengan alasan **possible cybersecurity risk**. Tidak ada runner/browser/HTTP, konstruksi input, replay atau pencarian varian snapshot pada tindak lanjut ini.

**Fakta untuk menutupnya:** hanya pemeriksaan provenance fixture lama dan output mentah yang sudah disetujui, bila tersedia dan mampu mengaitkan acceptance, nilai tersimpan, pembaca admin pada record yang sama, serta error sink yang spesifik. Bukti yang tersedia saat ini belum cukup. Tidak meminta akses deployment dan tidak menyarankan pengulangan aksi dinamis yang ditolak.

Source historis: `backend/app/Modules/SuratTugas/Requests/AssignmentLetterRequest.php:126`; `frontend/src/app/kepegawaian/surat-tugas/_components/SuratTugasForm.tsx:975`; `frontend/src/app/kepegawaian/surat-tugas/_components/STLampiranBedaHari.tsx:278`. Source current: shared snapshot rules pada `backend/app/Modules/Kepegawaian/Requests/StoreStTemplateRequest.php:65`, departure hydration pada `frontend/src/app/kepegawaian/surat-tugas/_components/SuratTugasForm.tsx:987`, mandate guard pada `frontend/src/components/SuratTugasLetterPreview.tsx:109`. Nomor baris historis selalu merujuk frozen snapshot yang disebut dalam record final.

## Hasil pemeriksaan dan perubahan commit ini

| Pemeriksaan tambahan | Hasil | Batas |
|---|---|---|
| Operator auth-only current | 1 skenario / 84 assertions lulus | Recording gateway connected-state; bukan provider/pairing. |
| ZIP member filter/cutoff current | 1 tes / 3 assertions lulus | Tiny inputs; bukan pertumbuhan metadata/availability. |
| Source/receipt snapshot | Hash/size cocok, guard current dan tiga keluarga error lama ditelusuri | Read-only; bukan reproduksi baru. |
| Review independen | 3/3 record verified tanpa perubahan verdict | Setiap lead tetap menyebut fakta yang belum tersedia. |
| Validator findings/coverage | 23 record dan 47 unit valid | Format dan konsistensi; bukan bukti runtime tambahan. |

Suite backend 304 tes/4.086 assertions (301 lulus,3 skip) tetap merupakan bukti commit sebelumnya; suite tersebut tidak dijalankan ulang pada tindak lanjut dokumentasi ini. Angka subset di atas tidak dijumlahkan dengan suite lama. Kode aplikasi dan tes tidak berubah. Commit ini menambahkan penjelasan per lead, bukti fresh yang terbatas, checks ledger, execution index, manifest, dan progress. Tidak mengubah data operasional, konfigurasi aktif, provider, push atau deployment.

Raw evidence: `C:/Users/USER/security-audit-skill/bksda-superapp/run-7/`. Metadata tindak lanjut dan tiga reviewer baru berada pada `followup-2026-11-09/` dan `agents/lead_followup_*/`. [Laporan audit utama](surat-tugas-kepegawaian-security-review-2026-11-09.md), [record final](surat-tugas-kepegawaian-security-review-2026-11-09-findings.json), dan [needs-validation](surat-tugas-kepegawaian-security-review-2026-11-09-needs-validation.md) mempertahankan putusan yang sama.
