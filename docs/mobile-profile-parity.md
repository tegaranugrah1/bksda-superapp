# Profil Pegawai Portal Mobile

19 November 2026. Target: tab Profil Pegawai pada portal mobile; pembanding fungsi: PortalProfileSidebar dan SecurityModals web. Header/warna/bentuk kartu portal dipertahankan.

| Bagian | Perubahan |
|---|---|
| Identitas | Data pegawai menjadi sumber nama/NIP/jabatan/unit; akun tanpa pegawai memakai identitas akun dan keadaan kosong |
| Kontak | Email, telepon, username serta edit kontak pada API /me/update-profile |
| Perubahan email | Konfirmasi kata sandi akun, pesan verifikasi server; rahasia tidak ditampilkan/dilog/disimpan ke storage |
| Foto | Foto aktual, fallback inisial, pilih/pratinjau/konfirmasi JPG/PNG/WebP 10 MB; field multipart foto seperti web |
| Pangkat/jabatan | Dialog data saat ini yang dapat dibaca; bukan riwayat historis yang tidak disediakan /me |
| Keamanan | Ubah kata sandi pada API yang sama dengan web; kesalahan field, lock submit, pembersihan isian dan login ulang setelah sukses |
| Riwayat | Tugas membuka tab Tugas, cuti membuka riwayat Layanan; akun login tidak memperoleh daftar contoh saat kosong |
| Bantuan contoh | Nomor/alamat TU contoh dihapus dan diganti aksi refresh profil |
| Saldo cuti | Nol tetap nol, keadaan belum tersedia dan akun yang tidak berhak dipisahkan |

## Verifikasi

- Typecheck dan ESLint file berubah lulus.
- node frontend/tests/mobile-profile.playwright.cjs: identitas, empty states, dua tema pada 360/440/landscape 800, baca data kepegawaian, validasi/konfirmasi email/retry 422, multipart foto dan SVG ditolak, kirim ganda, akun tanpa pegawai, password/reset/logout lulus.
- node frontend/tests/mobile-personal-assets.playwright.cjs: pemisahan aset/pinjaman, angka nol, realtime dan reload tetap lulus.
- Bundle Android HTTP 200 JavaScript; perangkat fisik belum diuji.
- Seluruh request dan pengiriman browser memakai fixture terisolasi. Tidak mengubah profil atau mengirim email verifikasi ke akun nyata.


## Perbaikan logout (Bagian 173)

Konfirmasi logout portal memakai ConfirmModal lintas platform. Alert.alert React Native Web tidak menampilkan konfirmasi, sehingga sebelumnya klik tombol tidak memanggil logout. Batal/Escape/Back tetap di profil; Ya, Keluar memanggil alur AuthProvider dengan pembersihan token yang tetap berjalan saat API gagal. Reload setelah keluar tetap pada login. Regresi browser mencakup respons 200/500 dan kontras tombol light/dark minimal 4.5:1; 11 tes auth/API lulus termasuk kegagalan jaringan. Backend tidak diubah.
