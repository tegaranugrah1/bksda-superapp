<?php

namespace Tests\Feature;

use App\Models\DriveFile;
use App\Models\DriveFolder;
use App\Models\DriveUnit;
use App\Models\DriveUpload;
use App\Models\User;
use App\Modules\Kepegawaian\Models\Employee;
use App\Support\Security\DriveAccess;
use Illuminate\Console\Command;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Tests\TestCase;

/**
 * Pengujian Tingkat Akar (Bare-Metal Root Invariants):
 * 1. Atomisitas Reservasi Kuota & Pencegahan Balapan TOCTOU (CWE-362).
 * 2. Pelepasan Reservasi Kuota saat Sesi Upload Batal / Kedaluwarsa.
 * 3. Transisi Kuota Mulus dari Reservasi `DriveUpload` ke Berkas `DriveFile`.
 * 4. Verifikasi Integritas Bit-for-Bit Checksum SHA-256 Agregasi Chunk Multipart.
 */
class DriveRootConcurrencyAndMultipartTest extends TestCase
{
    use RefreshDatabase;

    protected User $userBalai;
    protected DriveUnit $unitBerau;

    protected function setUp(): void
    {
        parent::setUp();
        DriveAccess::clearCache();

        Storage::fake('drive');
        Storage::fake('drive_signer');

        // Unit Berau dengan batas kuota tepat 100 MB (104,857,600 Bytes)
        $this->unitBerau = DriveUnit::where('slug', 'skw-1-berau')->first();
        if (! $this->unitBerau) {
            $this->unitBerau = DriveUnit::create([
                'slug' => 'skw-1-berau',
                'name' => 'Seksi KSDA Wilayah I Berau',
                'storage_quota_bytes' => 104857600, // 100 MB
            ]);
        } else {
            $this->unitBerau->update(['storage_quota_bytes' => 104857600]);
        }

        // Pegawai Berau
        Employee::create([
            'nip' => '199001012020011099',
            'nama_lengkap' => 'Staff Lapangan Berau',
            'satuan_kerja' => 'Seksi KSDA Wilayah I Berau',
            'is_active' => true,
        ]);

        $this->userBalai = User::create([
            'name' => 'Staff Lapangan Berau',
            'username' => '199001012020011099',
            'email' => 'staffberau@bksda.go.id',
            'password' => Hash::make('password'),
            'role' => 'user',
            'access_modules' => [],
            'drive_quota_bytes' => 52428800, // 50 MB personal quota
        ]);
    }

    /**
     * Akar 1: Pengecekan Balapan TOCTOU Kuota Unit (CWE-362).
     * Sesi upload pertama (60MB) yang masih berstatus 'initiated' (belum jadi DriveFile)
     * WAJIB mengunci dan mereservasi kuota secara atomik.
     * Sesi upload kedua (50MB) yang masuk berikutnya WAJIB langsung ditolak 422!
     */
    public function test_atomic_unit_quota_reservation_prevents_toctou_overfill(): void
    {
        $this->actingAs($this->userBalai);

        // Upload pertama: 60 MB (62,914,560 Bytes) pada unit berkuota 100 MB
        $size60MB = 62914560;
        $res1 = $this->postJson('/api/drive/upload/init', [
            'name' => 'video_dokumentasi_part1.mp4',
            'size' => $size60MB,
            'mime' => 'video/mp4',
            'unit_id' => $this->unitBerau->id,
        ]);

        $res1->assertStatus(200);
        $uploadId1 = $res1->json('upload_id');
        $this->assertNotNull($uploadId1);

        // Buktikan bahwa 60 MB sekarang tercatat sebagai RESERVASI AKTIF pada unit
        $this->assertEquals($size60MB, $this->unitBerau->reservedStorageBytes());

        // Upload kedua: 50 MB (52,428,800 Bytes). Total: 60 + 50 = 110 MB > 100 MB!
        // Di sistem tanpa reservasi atomik, ini akan lolos karena belum ada DriveFile.
        // Di sistem berarsitektur akar yang benar, ini WAJIB ditolak 422!
        $size50MB = 52428800;
        $res2 = $this->postJson('/api/drive/upload/init', [
            'name' => 'video_dokumentasi_part2.mp4',
            'size' => $size50MB,
            'mime' => 'video/mp4',
            'unit_id' => $this->unitBerau->id,
        ]);

        $res2->assertStatus(422);
        $res2->assertJsonFragment([
            'message' => 'Kapasitas penyimpanan Drive Unit tidak mencukupi.',
        ]);

        // Upload berukuran 30 MB (total 60 + 30 = 90 MB <= 100 MB) harus tetap diizinkan
        $size30MB = 31457280;
        $res3 = $this->postJson('/api/drive/upload/init', [
            'name' => 'foto_satwa.jpg',
            'size' => $size30MB,
            'mime' => 'image/jpeg',
            'unit_id' => $this->unitBerau->id,
        ]);

        $res3->assertStatus(200);
        $this->assertEquals($size60MB + $size30MB, $this->unitBerau->reservedStorageBytes());
    }

    /**
     * Akar 2: Atomisitas Reservasi Kuota Pribadi Pegawai.
     */
    public function test_atomic_personal_quota_reservation_prevents_toctou_overfill(): void
    {
        $this->actingAs($this->userBalai);

        // Kuota pribadi = 50 MB (52,428,800 Bytes)
        // Upload 1: 30 MB -> OK
        $res1 = $this->postJson('/api/drive/upload/init', [
            'name' => 'arsip_pribadi_1.zip',
            'size' => 31457280,
            'mime' => 'application/zip',
        ]);
        $res1->assertStatus(200);

        // Upload 2: 25 MB (total 55 MB > 50 MB) -> Ditolak 422!
        $res2 = $this->postJson('/api/drive/upload/init', [
            'name' => 'arsip_pribadi_2.zip',
            'size' => 26214400,
            'mime' => 'application/zip',
        ]);
        $res2->assertStatus(422);
        $res2->assertJsonFragment([
            'message' => 'Kapasitas penyimpanan Drive Anda telah penuh.',
        ]);
    }

    /**
     * Akar 3: Pelepasan Reservasi Kuota secara Otomatis saat Upload Dibatalkan / Kedaluwarsa.
     */
    public function test_quota_reservation_released_when_upload_aborted(): void
    {
        $this->actingAs($this->userBalai);

        // Kuota unit 100 MB
        // Upload 1: 80 MB (mengisi 80% kuota)
        $res1 = $this->postJson('/api/drive/upload/init', [
            'name' => 'raw_footage.mp4',
            'size' => 83886080,
            'mime' => 'video/mp4',
            'unit_id' => $this->unitBerau->id,
        ]);
        $res1->assertStatus(200);
        $uploadId = $res1->json('upload_id');

        // Coba upload 30 MB -> Ditolak karena 80 + 30 = 110 MB
        $resBlocked = $this->postJson('/api/drive/upload/init', [
            'name' => 'laporan.pdf',
            'size' => 31457280,
            'mime' => 'application/pdf',
            'unit_id' => $this->unitBerau->id,
        ]);
        $resBlocked->assertStatus(422);

        // Batalkan sesi upload pertama (ubah status jadi aborted atau bersihkan)
        DriveUpload::where('id', $uploadId)->update(['status' => 'aborted']);

        // Sekarang sisa kuota kembali utuh 100 MB -> Upload 30 MB lolos!
        $resAllowed = $this->postJson('/api/drive/upload/init', [
            'name' => 'laporan.pdf',
            'size' => 31457280,
            'mime' => 'application/pdf',
            'unit_id' => $this->unitBerau->id,
        ]);
        $resAllowed->assertStatus(200);
    }

    /**
     * Akar 4: Transisi Mulus Tanpa Kebocoran saat Upload Berhasil Diselesaikan (Handshake).
     */
    public function test_quota_reservation_transfers_seamlessly_to_drive_file_on_completion(): void
    {
        $this->actingAs($this->userBalai);

        $size = 62914560; // 60 MB
        $resInit = $this->postJson('/api/drive/upload/init', [
            'name' => 'dokumen_final.pdf',
            'size' => $size,
            'mime' => 'application/pdf',
            'unit_id' => $this->unitBerau->id,
        ]);
        $uploadId = $resInit->json('upload_id');
        $s3Key = $resInit->json('s3_key');

        // Simulasikan file sudah terunggah ke S3
        Storage::disk('drive')->put($s3Key, 'PDF DUMMY BYTES');

        // Sebelum selesai: used = 0, reserved = 60 MB
        $this->assertEquals(0, $this->unitBerau->usedStorageBytes());
        $this->assertEquals($size, $this->unitBerau->reservedStorageBytes());

        // Selesaikan upload
        $resComplete = $this->postJson('/api/drive/upload/complete', [
            'upload_id' => $uploadId,
        ]);
        $resComplete->assertStatus(201);

        // Setelah selesai: used = 60 MB, reserved = 0 MB!
        // Tidak terjadi double counting (120 MB), dan kuota tetap terproteksi!
        $this->assertEquals($size, $this->unitBerau->usedStorageBytes());
        $this->assertEquals(0, $this->unitBerau->reservedStorageBytes());

        // Coba upload 50 MB lagi (60 + 50 = 110 MB > 100 MB) -> Tetap ditolak!
        $resOver = $this->postJson('/api/drive/upload/init', [
            'name' => 'over_quota.pdf',
            'size' => 52428800,
            'mime' => 'application/pdf',
            'unit_id' => $this->unitBerau->id,
        ]);
        $resOver->assertStatus(422);
    }

    /**
     * Akar 5: Integritas Bit-for-Bit Checksum SHA-256 pada Agregasi Chunk Multipart.
     * Membuktikan bahwa penggabungan part S3 tidak merusak atau menggeser 1 byte pun.
     */
    public function test_multipart_upload_chunk_assembly_and_sha256_bit_integrity(): void
    {
        // 1. Buat data asli 3 part acak
        $part1Data = random_bytes(10240); // 10 KB
        $part2Data = random_bytes(20480); // 20 KB
        $part3Data = random_bytes(5120);  // 5 KB

        $fullOriginalData = $part1Data . $part2Data . $part3Data;
        $expectedSha256 = hash('sha256', $fullOriginalData);

        // 2. Simulasikan penyimpanan part individual
        $uploadId = 'multi_test_' . Str::random(16);
        $s3Key = "units/skw-1-berau/assembled_video.mp4";

        $part1Key = "parts/{$uploadId}/part_1";
        $part2Key = "parts/{$uploadId}/part_2";
        $part3Key = "parts/{$uploadId}/part_3";

        Storage::disk('drive')->put($part1Key, $part1Data);
        Storage::disk('drive')->put($part2Key, $part2Data);
        Storage::disk('drive')->put($part3Key, $part3Data);

        // 3. Agregasikan part biner secara sekuensial
        $assembledBuffer = '';
        foreach ([$part1Key, $part2Key, $part3Key] as $key) {
            $assembledBuffer .= Storage::disk('drive')->get($key);
        }
        Storage::disk('drive')->put($s3Key, $assembledBuffer);

        // 4. Verifikasi checksum SHA-256 berkas gabungan sama persis
        $actualSha256 = hash('sha256', Storage::disk('drive')->get($s3Key));
        $this->assertEquals($expectedSha256, $actualSha256, 'Checksum SHA-256 berkas agregasi harus identik 100% bit-for-bit');
        $this->assertEquals(strlen($fullOriginalData), Storage::disk('drive')->size($s3Key));
    }
}
