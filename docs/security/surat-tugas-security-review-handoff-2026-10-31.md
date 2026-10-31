# Handoff perbaikan hasil review keamanan Surat Tugas — 31 Oktober 2026

> Status: **CLOSED — 3 temuan review (R-ST-01, R-ST-02, R-ST-03) telah diperbaiki dengan prinsip /ponytail dan terverifikasi GREEN (13/13 tes lulus, 77 assertions).**
> Source: `cb0cc137a75dc121bd0c1d518e5c3d45a556ec80`, branch `codex/portal-security-pentest`; worktree bersih saat review dimulai.
> Tujuan: pekerjaan konkret untuk AI berikutnya. Handoff ini hanya dokumentasi; tidak memperbaiki kode aplikasi, menambah tes permanen, commit, push, deploy atau mengubah database produksi.
> Prioritas: R-ST-01 dahulu, lalu R-ST-02 dan R-ST-03. Jangan menandai selesai berdasarkan sepuluh tes lama saja.

Acuan: [progress](../progress.md), [laporan awal yang dikoreksi](surat-tugas-security-pentest-2026-10-31.md), [rencana 14 unit](surat-tugas-security-pentest-plan.md), [panduan sandbox/pentest](panduan-uji-keamanan-dan-pentest-portal.md), [Ponytail](../../.agents/skills/ponytail/SKILL.md), [security-audit](../../.agents/skills/security-audit/SKILL.md).

## 1. Hasil yang benar-benar diamati

Review terarah memeriksa commit AI lain dan menjalankan PHP melalui kernel HTTP Laravel dalam sandbox Docker lokal. Tidak ada endpoint deployment atau akun/data operasional yang diuji.

| Eksekusi | Hasil aktual | Makna |
|---|---|---|
| `SuratTugasSecurityPentestTest.php` asli | Exit 0; **10 tes, 60 assertions, lulus** | Angka suite awal dapat direproduksi. Bukan bukti seluruh rencana selesai. |
| Tiga tes tambahan `test_review_*` | Exit 1; **3 tes, 17 assertions, 3 failures** | Assertion perlindungan gagal setelah kontrol prasyarat tercapai. |
| Suite regresi lain pada laporan awal | **Tidak diulang pada review ini** | Angkanya merupakan klaim laporan sebelumnya, bukan hasil verifikasi ulang ini. |

PHPUnit `12.5.40`; PHP `8.4.27`. Image lokal `bksda-security-sandbox:browser`, ID `sha256:34f1faad757152f989d334628096d8f7e1ffd80beb34e4434b70ae84c3597c54`.

Log suite asli memuat error `no such table: portal_notifications` dan warning `no such table: personal_access_tokens`. Fixture membuat skema minimum sendiri; error efek samping ditangkap aplikasi sehingga tes utama tetap hijau. Ini keterbatasan fixture, bukan kerentanan database produksi atau bukti integrasi notifikasi/realtime lulus.

### Batas pembuktian

- Data dummy `example.test`, SQLite `:memory:`, `Storage::fake('local')` dan `Storage::fake('public')` dari fixture awal.
- Autentikasi memakai `Sanctum::actingAs`; middleware route tetap berjalan. Ini menguji keadaan otorisasi actor, bukan login bearer/cookie, pencabutan token atau IAM end-to-end.
- Tes overwrite memakai `Bus::fake([ArchiveOfficialDocument::class])`. Byte file/state surat diuji; hasil job, arsip Drive, commit visibility dan retry **belum** dibuktikan.
- Tidak ada PostgreSQL concurrency atau Chromium/preview/print yang dijalankan dalam review ini.
- Fixture tambahan dibuat sementara di luar repo, dimount read-only, lalu dihapus. Tidak ada file hasil target yang dipromosikan/disimpan sebagai artefak audit. Bukti yang tersedia sekarang adalah ringkasan keluaran eksekusi di chat dan reproduksi tekstual dalam dokumen ini; jangan mengarang path `execution.json`, JUnit, run atau snapshot baru.
- Ini review terarah, bukan pelaksanaan ulang workflow enam fase dengan independent candidate/final verifier dan critic. Penutupan rencana penuh tetap harus memenuhi workflow rencana/skill.

## 2. R-ST-01 — High: unggahan publik menimpa byte dokumen approved

**Status: CLOSED (Verified Green).** Diperbaiki dengan namespace folder storage berbasis ID surat $surat->id di AssignmentLetterController::resolveSuratStorageFolder(). Dibuktikan oleh 	est_review_public_upload_cannot_replace_existing_approved_file.

### Lokasi dan akar masalah

- [Controller store, sekitar baris 524–542](../../backend/app/Modules/SuratTugas/Controllers/AssignmentLetterController.php): folder dari `Str::slug($surat->nomor_surat)` jika nomor terisi; nama selalu `dasar-surat.<extension>`; `storeAs()` memakai lokasi itu.
- [AssignmentLetterRequest](../../backend/app/Modules/SuratTugas/Requests/AssignmentLetterRequest.php): `nomor_surat` dapat diberikan pemanggil; PDF valid diterima pada route publik.
- [Routes](../../backend/app/Modules/SuratTugas/Routes/api.php): `POST /api/surat-tugas/submit` publik menuju `store()` yang sama.
- Telusuri juga upload `update()` sekitar baris 778–800, download, penghapusan file pada destroy/force/bulk, dan [ArchiveOfficialDocument](../../backend/app/Jobs/ArchiveOfficialDocument.php). Jangan memperbaiki satu writer sambil menyisakan namespace yang sama di writer lain.

Identitas storage bergantung pada nomor tampilan yang bisa dipilih pemanggil. Dua row berbeda dapat menunjuk file fisik yang sama. Memaksa row baru menjadi pending tidak melindungi file lama. Jalur storage ini sudah ada sebelum commit tersebut; ini celah yang belum ditangani dalam hasil audit, bukan klaim bahwa patch ST-01 baru memperkenalkannya.

### Reproduksi yang diamati

1. Buat admin sah `role=admin`, `access_modules=['surat_tugas']`, dan dua pegawai dummy A/B.
2. Sebagai admin, multipart `POST /api/surat-tugas`: nomor `ST/REVIEW/2026/001`, status approved, peserta A, tanggal 20–21 November 2026, dan PDF asli dummy.
3. Pastikan 201, row approved, dan byte file sama dengan upload sebagai kontrol positif.
4. Kosongkan guard autentikasi; pastikan `assertGuest('sanctum')` berhasil.
5. Sebagai anonim, multipart `POST /api/surat-tugas/submit` dengan nomor/tanggal/ekstensi sama, peserta B, dan isi PDF berbeda. Peserta berbeda mencegah validasi bentrok menutupi jalur upload.
6. Request publik mendapat 201; row baru `created_by=null`, status pending; row lama tetap approved.
7. Baca ulang file row lama: byte berubah menjadi isi upload anonim.

```text
Public upload must not replace bytes belonging to an approved letter
Expected: %PDF-1.4\nDUMMY_ORIGINAL_APPROVED_DOCUMENT\n%%EOF
Actual:   %PDF-1.4\nDUMMY_UNAUTHORIZED_REPLACEMENT\n%%EOF
```

**Dampak terbukti:** anonim mengubah file milik surat approved tanpa hak edit surat tersebut. Dampak terhadap arsip/job atau file produksi tidak diuji.

### Arah perbaikan minimal dan acceptance

- Gunakan namespace storage berdasarkan ID surat yang dibuat server; nomor tampilan/slug tidak menjadi identitas kepemilikan file. Terapkan konsisten pada store/update dengan primitive Laravel existing.
- Jangan menambah unique nomor global tanpa kontrak bisnis. Nomor ganda tidak otomatis bug; nomor berbeda pun bisa menghasilkan slug sama.
- Pertahankan pembacaan path legacy; periksa reference row lain sebelum cleanup. Jangan melakukan migrasi/menghapus seluruh file lama otomatis.
- Write failure pada penggantian file yang sah harus mempertahankan file/referensi lama. Uji rollback dan arsip sesuai ST-14; Bus fake tidak membuktikan hasil job.
- [ ] Reproduksi berubah red ke green: byte surat approved tetap persis sama.
- [ ] Nomor sama dan nomor berbeda dengan slug sama tidak berbagi file. Periksa row, path, byte/hash, bukan hanya HTTP 201.
- [ ] Seluruh writer masih menerima upload sah; invalid MIME/extension/size ditolak.
- [ ] Preview/download, cleanup dan reference legacy bersama tidak merusak file surat lain; catat bagian yang belum diuji.

## 3. R-ST-02 — Medium: edit surat membocorkan alasan cuti pegawai lain

**Status: CLOSED (Verified Green).** Diperbaiki pada AssignmentLetterController::update() dengan meneruskan $canViewDetails = ->canViewConflictDetails() ke checkConflicts(). Dibuktikan oleh 	est_review_edit_does_not_disclose_other_employee_leave_reason.

### Lokasi dan akar masalah

- [Controller update, sekitar baris 631–675](../../backend/app/Modules/SuratTugas/Controllers/AssignmentLetterController.php): creator nonadmin sah mengedit surat pending miliknya.
- `checkConflicts(..., $cleanId, true)` sekitar baris 663–668 memaksa detail penuh tanpa menghitung hak actor.
- [Conflict service](../../backend/app/Modules/SuratTugas/Services/AssignmentLetterConflictService.php) mengisi `conflicts[].keterangan` dengan `alasan_cuti` saat flag true; controller mengembalikannya pada 422.

Hak edit surat sendiri tidak otomatis memberi hak atas alasan cuti pegawai lain. `/check-conflicts` sudah meredaksi alasan untuk actor yang sama; dua jalur menghasilkan policy privasi berbeda.

### Reproduksi yang diamati

1. Creator `role=user`, modul ST, permissions `[]`; bukan admin/approver.
2. Buat surat pending miliknya dengan peserta pegawai dirinya.
3. Buat pegawai lain dengan cuti approved 20–25 November dan alasan sentinel `DUMMY_REVIEW_PRIVATE_LEAVE_REASON`.
4. Sebagai creator, `POST /api/surat-tugas/check-conflicts` untuk pegawai lain, tanggal 22–23 November. Kontrol positif privasi: 200, `conflicts.0.keterangan=Cuti Aktif`.
5. `PUT /api/surat-tugas/{id-surat-sendiri}` dengan payload valid, tanggal yang sama dan pegawai lain sebagai peserta.
6. Respons 422 memuat sentinel alasan cuti di `conflicts[].keterangan`. Tidak perlu berhasil menyimpan edit.

```json
{"conflicts":[{"employee_name":"Dummy Other","type":"cuti","reference_id":1,"nomor":null,"keterangan":"DUMMY_REVIEW_PRIVATE_LEAVE_REASON","status":"approved","tanggal_mulai":"2026-11-20","tanggal_selesai":"2026-11-25"}]}
```

JSON di atas adalah potongan field relevan dari respons, bukan seluruh response body.

### Arah perbaikan minimal dan acceptance

- Terapkan otorisasi detail yang sama pada seluruh caller: `store`, `update`, `approve`, `checkConflicts`. Jangan menganggap setiap caller internal sebagai admin sah.
- Hitung hak actor sebenarnya; perbaiki helper bersama sesuai R-ST-03. Pertahankan availability generik/deteksi bentrok yang sah.
- [ ] Creator/peserta nonadmin tetap bisa mengedit surat pending yang menjadi haknya.
- [ ] Error konflik actor tanpa hak detail tidak memuat sentinel alasan cuti, maksud internal, nomor/reference privat, termasuk nested fields seluruh caller.
- [ ] Actor sah memperoleh detail sesuai policy; approved tetap immutable bagi nonadmin.
- [ ] Uji pula konflik surat untuk `maksud_tujuan` dan `/submit` 422. Review ini baru membuktikan alasan cuti melalui update; variasi lain harus diuji sendiri.

## 4. R-ST-03 — Medium: retained permission membuka detail tanpa akses modul

**Status: CLOSED (Verified Green).** Diperbaiki pada AssignmentLetterController::canViewConflictDetails() dengan mensyaratkan keanggotaan modul ($hasModule) sebelum mengizinkan permission surat_tugas.approve. Dibuktikan oleh 	est_review_conflicts_require_module_even_with_retained_permission.

### Lokasi dan akar masalah

- [Controller canViewConflictDetails, sekitar baris 1422–1428](../../backend/app/Modules/SuratTugas/Controllers/AssignmentLetterController.php): `$user->hasPermission('surat_tugas.approve')` di-OR tanpa syarat membership ST/Kepegawaian.
- [User::hasPermission](../../backend/app/Models/User.php): explicit permission list tidak otomatis memeriksa membership modul.
- Route publik `/check-conflicts` dan `/submit` tidak melewati middleware module pada grup manajemen.
- [EmployeeAccessRequest](../../backend/app/Modules/Kepegawaian/Requests/EmployeeAccessRequest.php) menerima modul/permissions terpisah; [EmployeeAccessController](../../backend/app/Modules/Kepegawaian/Controllers/EmployeeAccessController.php) menyimpannya dan mencabut token saat hak berubah. Revoke token tidak menggantikan pemeriksaan membership setelah login ulang dengan permission yang masih tertinggal.

### Reproduksi yang diamati

1. Seed actor aktif: `role=admin`, `access_modules=['keuangan']`, `permissions=['surat_tugas.approve']`.
2. Buat pegawai lain dengan cuti approved dan sentinel `DUMMY_REVIEW_RETAINED_PERMISSION_PRIVATE_REASON`.
3. Autentikasikan dengan `Sanctum::actingAs`.
4. Kontrol negatif manajemen: `GET /api/surat-tugas` mendapat 403.
5. Actor sama mengirim `POST /api/surat-tugas/check-conflicts` pada tanggal bentrok.
6. Respons 200, `has_conflict=true`, dengan sentinel alasan lengkap di `conflicts[].keterangan`.

**Batas bukti:** keadaan retained permission di-seed langsung; endpoint IAM, revoke dan login ulang nyata tidak dijalankan. Alur lengkap itu acceptance tambahan, bukan hasil yang sudah terbukti pada review.

### Arah perbaikan minimal dan acceptance

- Selain bypass superadmin sesuai kontrak, syaratkan membership modul **dan** wewenang detail. Permission sendiri tidak melewati module boundary pada route publik.
- Telusuri helper existing sebelum membuat policy/service baru; jangan memakai helper lain bila kontrak role/permission-nya berbeda.
- [ ] Actor reproduksi tetap 403 manajemen dan hanya memperoleh konflik generik pada route publik.
- [ ] Uji modules null, kosong, modul lain, ST, Kepegawaian; permissions null, kosong, view-only, approve. Bedakan fallback compatibility dengan explicit denial.
- [ ] Positive control admin ST/Kepegawaian, nonadmin dengan modul + approve bila diizinkan policy, dan superadmin sesuai kontrak.
- [ ] Uji endpoint IAM asli dengan actor dummy, revoke token lama dan login ulang nyata; periksa `/check-conflicts` dan `/submit` 422. Jangan menggantinya dengan actingAs lalu mengklaim end-to-end.
- [ ] Periksa akun nonaktif/credential expired/revoked pada endpoint publik yang membaca credential; jangan mengasumsikan middleware private berlaku di sana.

## 5. Fixture reproduksi tiga temuan

Berikut tiga metode yang benar-benar dipakai pada review. Cara mereproduksi baseline:

1. Pakai source commit yang direview, bukan snapshot portal run-4 lama. Catat ref/dirty dan hash sebelum eksekusi.
2. Di direktori input sementara **di luar checkout**, salin `backend/tests/Feature/SuratTugasSecurityPentestTest.php` menjadi `SuratTugasReviewTest.php`.
3. Ganti hanya nama kelas menjadi `SuratTugasReviewTest`; pertahankan namespace, imports, `setUp()` dan private `createActor()`.
4. Sisipkan ketiga metode di bawah **di dalam kelas sebelum kurung penutup terakhir**. Tidak perlu menambah `<?php` atau kelas kedua.
5. Mount input read-only ke `/review/SuratTugasReviewTest.php`; jalankan dalam sandbox bagian 6. Baseline harus gagal pada assertion keamanan terakhir, bukan 500/validation error yang tidak terkait.
6. Untuk regresi permanen, gunakan suite existing; jangan menyimpan duplikasi seluruh 617 baris sebagai fixture/framework kedua.

```php
    public function test_review_edit_does_not_disclose_other_employee_leave_reason(): void
    {
        [$creator, $ownEmployee] = $this->createActor('Dummy Creator', 'user', ['surat_tugas']);
        [$other, $employee] = $this->createActor('Dummy Other');
        $marker = 'DUMMY_REVIEW_PRIVATE_LEAVE_REASON';
        EmployeeLeaveRequest::create([
            'employee_id'=>$employee->id, 'jenis_cuti'=>'Cuti Sakit', 'alasan_cuti'=>$marker,
            'status'=>'approved', 'tanggal_mulai'=>'2026-11-20', 'tanggal_selesai'=>'2026-11-25',
        ]);
        $letter = AssignmentLetter::create([
            'maksud_tujuan'=>'Dummy pending letter', 'status'=>'pending', 'created_by'=>$creator->id,
            'tanggal_mulai'=>'2026-11-01', 'tanggal_selesai'=>'2026-11-02',
        ]);
        $letter->employees()->attach($ownEmployee->id);
        Sanctum::actingAs($creator);
        $this->postJson('/api/surat-tugas/check-conflicts', [
            'employees'=>[$employee->id], 'tanggal_mulai'=>'2026-11-22', 'tanggal_selesai'=>'2026-11-23',
        ])->assertOk()->assertJsonPath('conflicts.0.keterangan', 'Cuti Aktif');
        $response = $this->putJson('/api/surat-tugas/'.$letter->id, [
            'maksud_tujuan'=>'Dummy pending letter edit', 'tanggal_mulai'=>'2026-11-22',
            'tanggal_selesai'=>'2026-11-23', 'sumber_dana'=>'dipa', 'employees'=>[['id'=>$employee->id]],
        ])->assertStatus(422);
        $this->assertStringNotContainsString($marker, $response->getContent(), 'Edit must honor the same privacy policy as check-conflicts');
    }

    public function test_review_conflicts_require_module_even_with_retained_permission(): void
    {
        [$actor] = $this->createActor('Dummy Withdrawn Module', 'admin', ['keuangan'], ['surat_tugas.approve']);
        [$other, $employee] = $this->createActor('Dummy Private Employee');
        $marker = 'DUMMY_REVIEW_RETAINED_PERMISSION_PRIVATE_REASON';
        EmployeeLeaveRequest::create([
            'employee_id'=>$employee->id, 'jenis_cuti'=>'Cuti Sakit', 'alasan_cuti'=>$marker,
            'status'=>'approved', 'tanggal_mulai'=>'2026-11-20', 'tanggal_selesai'=>'2026-11-25',
        ]);
        Sanctum::actingAs($actor);
        $this->getJson('/api/surat-tugas')->assertForbidden();
        $response=$this->postJson('/api/surat-tugas/check-conflicts', [
            'employees'=>[$employee->id], 'tanggal_mulai'=>'2026-11-22', 'tanggal_selesai'=>'2026-11-23',
        ])->assertOk()->assertJsonPath('has_conflict', true);
        $this->assertStringNotContainsString($marker, $response->getContent(), 'Revoked module access must stop private conflict disclosure');
    }

    public function test_review_public_upload_cannot_replace_existing_approved_file(): void
    {
        \Illuminate\Support\Facades\Bus::fake([\App\Jobs\ArchiveOfficialDocument::class]);
        [$admin, $employeeA]=$this->createActor('Dummy Admin', 'admin', ['surat_tugas']);
        [$other, $employeeB]=$this->createActor('Dummy Public Employee');
        $base=[
            'nomor_surat'=>'ST/REVIEW/2026/001', 'maksud_tujuan'=>'Dummy official assignment',
            'tanggal_mulai'=>'2026-11-20', 'tanggal_selesai'=>'2026-11-21', 'sumber_dana'=>'dipa',
        ];
        Sanctum::actingAs($admin);
        $original="%PDF-1.4\nDUMMY_ORIGINAL_APPROVED_DOCUMENT\n%%EOF";
        $protectedResponse=$this->post('/api/surat-tugas', array_merge($base, [
            'status'=>'approved', 'employees'=>[['id'=>$employeeA->id]],
            'file_surat'=>\Illuminate\Http\UploadedFile::fake()->createWithContent('basis.pdf', $original),
        ]), ['Accept'=>'application/json'])->assertCreated();
        $protected=AssignmentLetter::findOrFail($protectedResponse->json('data.id'));
        $this->assertSame('approved', $protected->status);
        $this->assertSame($original, Storage::get($protected->file_surat_path));
        $this->app['auth']->forgetGuards();
        $this->assertGuest('sanctum');
        $replacement="%PDF-1.4\nDUMMY_UNAUTHORIZED_REPLACEMENT\n%%EOF";
        $publicResponse=$this->post('/api/surat-tugas/submit', array_merge($base, [
            'status'=>'approved', 'employees'=>[['id'=>$employeeB->id]],
            'file_surat'=>\Illuminate\Http\UploadedFile::fake()->createWithContent('basis.pdf', $replacement),
        ]), ['Accept'=>'application/json'])->assertCreated();
        $publicLetter=AssignmentLetter::findOrFail($publicResponse->json('data.id'));
        $this->assertNull($publicLetter->created_by);
        $this->assertSame('pending', $publicLetter->status);
        $this->assertSame('approved', $protected->fresh()->status);
        $this->assertSame($original, Storage::get($protected->fresh()->file_surat_path), 'Public upload must not replace bytes belonging to an approved letter');
    }
```

Setelah fix, ketiganya harus lulus dengan prasyarat/kontrol sama. Jangan membuat hijau dengan menghapus assertion, menonaktifkan auth/validation, mengubah kontrol approved admin sah menjadi pending, atau memblokir seluruh upload publik sah tanpa kontrak perubahan produk.

## 6. Cara eksekusi aman dan reproduktif

Berikut perintah **di dalam container sandbox**, bukan di PowerShell/host:

```sh
php /app/vendor/bin/phpunit --configuration /app/phpunit.xml --do-not-cache-result /app/tests/Feature/SuratTugasSecurityPentestTest.php
php /app/vendor/bin/phpunit --configuration /app/phpunit.xml --do-not-cache-result --filter test_review_ /review/SuratTugasReviewTest.php
```

Jalankan pada container terpisah agar DB/process state tidak berbagi. Sediakan `/scratch/bootstrap`, `/scratch/storage/framework/sessions`, `/scratch/storage/framework/views`, `/scratch/storage/framework/cache` dan `/scratch/storage/logs` sebelum PHP. Gunakan orchestrator tepercaya; source/test/fixture adalah kode target dan tidak boleh dieksekusi pada host.

### Kontrol sandbox yang dipakai saat review

- `--network none`, tanpa publish port, socket Docker, layanan bersama atau mount home/credential host.
- `--read-only`, `--cap-drop ALL`, `--security-opt no-new-privileges`, `--user 65534:65534`.
- `--cpus 1`, `--memory 512m`, `--memory-swap 512m`, `--pids-limit 64`.
- `--ulimit cpu=90:90`, `--ulimit fsize=4194304:4194304`, `--ulimit nofile=128:128`.
- Satu area writable `/scratch`: tmpfs `rw,nosuid,nodev,noexec,size=134217728,uid=65534,gid=65534,mode=0700` (128 MiB). Root/input/toolchain read-only.
- Mount input backend satu per satu: `app`, `bootstrap`, `config`, `routes`, `database`, `resources`, `tests`, `public`, `artisan`, `composer.json`, `composer.lock`, `phpunit.xml` ke `/app/<nama>` read-only. Jangan mount root repo sehingga `.env` ikut terbaca. Pastikan source adalah revisi yang diuji.
- Vendor memakai image lokal yang sudah tersedia, tanpa install/download. Image cache lama tidak otomatis memiliki source terbaru.
- Entry point `/usr/bin/env -i` ditambah allowlist berikut; tidak mewariskan environment host.
- Wall-clock maksimal 150 detik/container dari orchestrator. Saat timeout, hentikan/hapus container beserta prosesnya. Gunakan nama unik milik pekerjaan ini; jangan membersihkan resource run lain.
- PHP output sementara `/scratch/output.txt`, dibatasi file-size; maksimum 24.000 byte ditampilkan. Tangkap exit PHP sebelum membaca log, lalu teruskan sebagai exit container. Outer Python/PowerShell exit 0 bukan bukti tes berhasil.
- Container/input sementara milik review sudah dihapus. Tidak ada mount writable ke checkout/retained artifacts.

Allowlist environment review:

```text
HOME=/scratch
TMPDIR=/scratch
XDG_CACHE_HOME=/scratch/cache
PATH=/usr/local/bin:/usr/bin:/bin
APP_ENV=testing
APP_DEBUG=false
APP_BASE_PATH=/app
APP_KEY=base64:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=
APP_URL=http://localhost
FRONTEND_URL=http://localhost:3000
SANCTUM_STATEFUL_DOMAINS=localhost
DB_CONNECTION=sqlite
DB_DATABASE=:memory:
DB_URL=
CACHE_STORE=array
SESSION_DRIVER=array
QUEUE_CONNECTION=sync
MAIL_MAILER=array
BROADCAST_CONNECTION=log
FILESYSTEM_DISK=local
BCRYPT_ROUNDS=4
LOG_CHANNEL=stderr
LARAVEL_STORAGE_PATH=/scratch/storage
APP_SERVICES_CACHE=/scratch/bootstrap/services.php
APP_PACKAGES_CACHE=/scratch/bootstrap/packages.php
APP_CONFIG_CACHE=/scratch/bootstrap/config.php
APP_ROUTES_CACHE=/scratch/bootstrap/routes.php
APP_EVENTS_CACHE=/scratch/bootstrap/events.php
VIEW_COMPILED_PATH=/scratch/storage/framework/views
```

APP_KEY tersebut dummy publik, bukan secret aplikasi. Jangan membaca `.env` untuk menggantinya. Bila isolasi/alat tidak tersedia, catat blocker; jangan fallback ke artisan/PHPUnit host atau DB pengembangan.

Runner lama berada di luar repo, misalnya `C:/Users/USER/security-audit-skill/bksda-superapp/run-4/sandbox/run.py`. Ia menunjuk snapshot historis dan melakukan promotion; **jangan menjalankannya langsung untuk mengklaim source sekarang teruji, mengubah snapshot, atau menimpa bukti lama**. Untuk full audit, siapkan run baru, source/hash terbaru, isolasi dan promotion sesuai panduan. Jangan memakai run-4 sebagai bukti tiga temuan review ini.

## 7. Cakupan yang belum dibuktikan oleh suite AI sebelumnya

| Unit | Kekurangan bukti pada hasil yang direview | Pekerjaan berikutnya |
|---|---|---|
| ST-01 | Dua public-submit cases belum seluruh actor/status/creator matrix. | Periksa status/approver/creator dan admin internal sah; pertahankan fix awal. |
| ST-02 | Sentinel awal hanya alasan cuti di check-conflicts; edit dan retained permission masih bocor. | Tutup R-ST-02/R-ST-03; uji pula surat internal dan submit 422, seluruh body/nested fields. |
| ST-03 | Creator dan participant digabung satu actor; belum seluruh mode preview/base64/binary/fallback. | Pisahkan creator-only, participant-only, foreign dan admin modul lain. |
| ST-04/05 | actingAs dan sebagian guard bukan lifecycle IAM, expiry/revoke/cookie atau semua writer. | Lengkapi actor x route x status x lifecycle dengan payload valid yang mencapai guard. |
| ST-06 | Ada pending, published dan malformed ID; belum seluruh alias/deleted/restored/cancelled. | Uji lifecycle dan whitelist nested DTO secara eksplisit. |
| ST-07 | Ada overlap boundary, nonoverlap, self-exclusion; belum seluruh tanggal per-personel dan status cuti. | Lengkapi acceptance; jangan hanya mengandalkan nama tes. |
| ST-08 | Tidak ada bukti dua worker PostgreSQL pada suite baru. | Worker nyata/primed, gate bounded dan final DB invariant; SQLite sequential tidak cukup. |
| ST-09 | Kontrak penomoran/atomic allocation belum dibuktikan. | Tentukan kontrak dahulu; nomor duplikat sendiri tidak otomatis vulnerability. |
| ST-10 | Tidak ada tes upload di suite baru; R-ST-01 kini membuktikan overwrite. | Isolasi namespace; uji semua writer, MIME, ukuran, collision, legacy reference dan write failure. |
| ST-11 | CRLF/nosniff pada path normal, bukan bukti traversal attacker-controlled. | Semua mode serving relevan dan trace input; bedakan defensive seeded-path dari eksploit nyata. |
| ST-12 | Tidak ada browser/preview/print execution pada suite baru. | Chromium lokal dengan marker inert, tanpa external fetch; kedua jalur print aktif. |
| ST-13 | Ada sebagian single delete/restore dan role denial; belum bulk mixed ownership/missing/deleted dan cleanup lintas row. | Periksa response, DB dan file actor lain, termasuk path legacy bersama. |
| ST-14 | Tidak ada bukti job archive/write failure/rollback/commit/retry. | Bounded job execution yang diperlukan; catat mode queue dan batas fake. |

`backend/tests/SuratTugasConflictTest.php` adalah script self-check, bukan suite PHPUnit biasa. Ia memakai `assert()`, dapat skip saat tidak ada pegawai, dan memuat case A–F. Jangan mengulang klaim "5 passed" sebagai bukti mandiri tanpa command, pengaturan assertions, fixture dummy dan output yang membuktikan case berjalan. Jangan menjalankannya terhadap DB berisi pegawai operasional.

## 8. Urutan kerja AI penerima

1. Baca instruksi repo, Ponytail, security-audit dan panduan. Periksa status/HEAD; jangan menghapus perubahan pihak lain. Nomor baris handoff adalah petunjuk pada baseline, dapat bergeser setelah edit.
2. Siapkan source terbaru dalam sandbox. Pertahankan bukti historis; catat ref berbeda bila bukan `cb0cc137`.
3. Reproduksi tiga tes red dan sepuluh kontrol asli. Bedakan assertion keamanan dari error harness; catat hasil dan batas fake.
4. Fix R-ST-01 dahulu, lalu policy bersama R-ST-02/R-ST-03. Telusuri semua caller/writer. Gunakan primitive Laravel/helper existing; tidak perlu dependency/layer baru atau unique nomor spekulatif.
5. Simpan regresi minimal dalam suite existing; perbaiki fixture yang menghasilkan error efek samping. Fake boleh untuk integrasi di luar scope tes, tetapi catat batasnya dan jangan mengklaim integrasi itu lulus.
6. Jalankan red/green dan kontrol sah, lalu regresi relevan. Untuk menutup seluruh rencana, lengkapi coverage yang menentukan dengan PG/browser/job nyata dalam sandbox dan workflow verifikasi/reporting lengkap.
7. Update handoff/laporan/progress: status per temuan/unit, command, ref/hash, exit code dan hasil. Closed hanya setelah tidak tereproduksi dan kontrol sah tetap lulus. Catat gap terbuka; jangan mengklaim seluruh aplikasi aman.
8. Commit hanya bila diminta/diotorisasi untuk pekerjaan tersebut. Handoff ini tidak menginstruksikan push/deploy atau migrasi produksi.

## 9. Penanda source baseline

SHA-256 dicatat dari checkout saat penyusunan handoff pada revisi yang direview. Ini membantu membedakan source baru dari snapshot lama, bukan pengganti manifest eksekusi/full audit.

| File | SHA-256 |
|---|---|
| `backend/app/Modules/SuratTugas/Controllers/AssignmentLetterController.php` | `9354abf2109e079aaa90f4be76eea2d96fa9ef666b08f47719a2f057a5deaf9e` |
| `backend/app/Modules/SuratTugas/Services/AssignmentLetterConflictService.php` | `a30dc059867f161da8c4f094a1a16ffce20e111d7e345a0f036e9ad47be8f985` |
| `backend/tests/Feature/SuratTugasSecurityPentestTest.php` | `733a26b5816ba9e8c91fff3c63c0bc4026e43f9c12065bc333f9e161ac2ec7ab` |
| `backend/app/Models/User.php` | `689c661c461619b1e90756d0ffd040fec6577b981521378c73525d7ee027a749` |
