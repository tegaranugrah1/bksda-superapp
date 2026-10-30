<?php

namespace Tests\Feature;

use App\Models\DriveFile;
use App\Models\DriveFolder;
use App\Models\DriveUnit;
use App\Models\PortalNotification;
use App\Models\User;
use App\Modules\DeReporting\Models\DynamicForm;
use App\Modules\DeReporting\Models\DynamicFormResponse;
use App\Support\Security\DriveAccess;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class DeReportingDriveIntegrationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('drive');
        Storage::fake('drive_signer');

        // Create default system user for foreign keys
        User::firstOrCreate(['username' => 'admin_test'], [
            'name' => 'Admin Test',
            'email' => 'admin_test@bksda.go.id',
            'password' => Hash::make('password'),
            'role' => 'super_admin',
        ]);

        // Ensure Balai Samarinda Unit exists
        DriveUnit::firstOrCreate(['slug' => 'balai-samarinda'], [
            'name' => 'Balai BKSDA Samarinda',
            'storage_quota_bytes' => 107374182400,
        ]);
    }

    public function test_public_submit_saves_files_to_drive_disk_and_does_not_consume_creator_personal_quota(): void
    {
        $creator = User::create([
            'name' => 'Staff Pelaksana',
            'username' => '199505052020011001',
            'email' => 'staff@bksda.go.id',
            'password' => Hash::make('password'),
            'role' => 'user',
            'drive_quota_bytes' => 5368709120, // 5 GB
        ]);

        $form = DynamicForm::create([
            'title' => 'Laporan Temuan Satwa Liar',
            'slug' => 'laporan-temuan-satwa-liar',
            'description' => 'Formulir pelaporan satwa',
            'fields' => [
                [
                    'id' => 'nama_pelapor',
                    'type' => 'text',
                    'label' => 'Nama Pelapor',
                    'required' => true,
                ],
                [
                    'id' => 'foto_dokumentasi',
                    'type' => 'file',
                    'label' => 'Foto Dokumentasi',
                    'required' => true,
                    'max_files' => 3,
                ],
                [
                    'id' => 'titik_lokasi',
                    'type' => 'gps_location',
                    'label' => 'Koordinat Lapangan',
                    'required' => true,
                ],
            ],
            'is_active' => true,
            'created_by' => $creator->id,
        ]);

        $file1 = UploadedFile::fake()->image('satwa1.jpg', 800, 600);
        $file2 = UploadedFile::fake()->image('satwa2.jpg', 800, 600);

        $payload = [
            'nama_pelapor' => 'Budi Santoso',
            'foto_dokumentasi' => [$file1, $file2],
            'titik_lokasi' => json_encode([
                'latitude' => -0.502106,
                'longitude' => 117.153709,
                'accuracy' => 12.5,
                'address_hint' => 'Sungai Wain, Balikpapan',
            ]),
        ];

        $response = $this->post("/api/dereporting/public-forms/{$form->slug}/submit", $payload);

        $response->assertStatus(201);
        $response->assertJsonStructure(['message', 'id']);

        $responseId = $response->json('id');
        $dbResponse = DynamicFormResponse::findOrFail($responseId);

        // 1. Verifikasi Jawaban tersimpan
        $this->assertEquals('Budi Santoso', $dbResponse->answers['nama_pelapor']);
        $this->assertEquals(-0.502106, $dbResponse->answers['titik_lokasi']['latitude']);
        $this->assertCount(2, $dbResponse->file_paths['foto_dokumentasi']);

        // 2. Verifikasi File tercatat di drive_files (2 berkas lampiran + 1 Ringkasan_Laporan.txt)
        $driveFiles = DriveFile::where('source_module', 'dereporting')->get();
        $this->assertCount(3, $driveFiles);
        $this->assertTrue($driveFiles->contains('name', 'Ringkasan_Laporan.txt'));

        $firstDriveFile = $driveFiles->where('name', 'satwa1.jpg')->first() ?? $driveFiles->first();
        $this->assertNotNull($firstDriveFile->unit_id);
        $this->assertEquals($creator->id, $firstDriveFile->user_id);
        $this->assertTrue(Storage::disk('drive')->exists($firstDriveFile->s3_key));

        // 3. Verifikasi Kuota Pribadi Pegawai Pembuat Form tetap 0 Byte
        $personalQuotaUsed = DriveFile::where('user_id', $creator->id)
            ->whereNull('unit_id')
            ->whereNull('deleted_at')
            ->sum('size_bytes');
        $this->assertEquals(0, $personalQuotaUsed, 'Kuota pribadi pegawai tidak boleh tersedot oleh formulir publik');

        // 4. Verifikasi Pembuat Form Memiliki Hak Akses ke Berkasnya
        $this->assertTrue(DriveAccess::canReadFile($creator, $firstDriveFile));
        $this->assertTrue(DriveAccess::canWriteFile($creator, $firstDriveFile));

        // 5. Verifikasi Notifikasi Portal terkirim ke Creator
        $notification = PortalNotification::where('user_id', $creator->id)->latest()->first();
        $this->assertNotNull($notification);
        $this->assertEquals('Tanggapan Baru Diterima', $notification->title);
    }

    public function test_public_submit_rejects_more_than_max_files(): void
    {
        $form = DynamicForm::create([
            'title' => 'Form Cek Kuota File',
            'slug' => 'form-cek-kuota-file',
            'fields' => [
                [
                    'id' => 'lampiran',
                    'type' => 'file',
                    'label' => 'Bukti Foto',
                    'required' => true,
                    'max_files' => 2,
                ],
            ],
            'is_active' => true,
        ]);

        $payload = [
            'lampiran' => [
                UploadedFile::fake()->image('f1.jpg'),
                UploadedFile::fake()->image('f2.jpg'),
                UploadedFile::fake()->image('f3.jpg'), // 3 files > max_files 2
            ],
        ];

        $response = $this->postJson("/api/dereporting/public-forms/{$form->slug}/submit", $payload);
        $response->assertStatus(422);
        $response->assertJsonFragment([
            'message' => "Maksimal 2 berkas yang dapat diunggah untuk 'Bukti Foto'.",
        ]);
    }

    public function test_public_submit_rejects_closed_form(): void
    {
        $form = DynamicForm::create([
            'title' => 'Formulir Berakhir',
            'slug' => 'formulir-berakhir',
            'fields' => [
                ['id' => 'nama', 'type' => 'text', 'label' => 'Nama', 'required' => true],
            ],
            'is_active' => true,
            'closed_at' => now()->subDay(), // Kemarin
            'closed_message' => 'Pendaftaran telah ditutup oleh panitia BKSDA.',
        ]);

        $response = $this->postJson("/api/dereporting/public-forms/{$form->slug}/submit", [
            'nama' => 'Ahmad',
        ]);

        $response->assertStatus(403);
        $response->assertJson([
            'message' => 'Pendaftaran telah ditutup oleh panitia BKSDA.',
        ]);
    }

    public function test_summary_endpoint_aggregates_responses_and_gps(): void
    {
        $user = User::create([
            'name' => 'Admin DeReporting',
            'username' => '199201012018011001',
            'email' => 'admin-dr@bksda.go.id',
            'password' => Hash::make('password'),
            'role' => 'super_admin',
        ]);

        $form = DynamicForm::create([
            'title' => 'Survei Kepuasan Masyarakat',
            'slug' => 'survei-kepuasan-masyarakat',
            'fields' => [
                [
                    'id' => 'kepuasan',
                    'type' => 'radio',
                    'label' => 'Tingkat Kepuasan',
                    'options' => ['Sangat Puas', 'Puas', 'Cukup'],
                ],
                [
                    'id' => 'layanan',
                    'type' => 'checkbox',
                    'label' => 'Layanan yang Diakses',
                    'options' => ['SIMAKSI', 'Pengaduan', 'Informasi'],
                ],
                [
                    'id' => 'lokasi',
                    'type' => 'gps_location',
                    'label' => 'Lokasi Pengisian',
                ],
            ],
            'is_active' => true,
            'created_by' => $user->id,
        ]);

        // Respon 1
        DynamicFormResponse::create([
            'form_id' => $form->id,
            'answers' => [
                'kepuasan' => 'Sangat Puas',
                'layanan' => ['SIMAKSI', 'Informasi'],
                'lokasi' => ['latitude' => -0.5, 'longitude' => 117.1, 'address_hint' => 'Samarinda'],
            ],
            'ip_address' => '127.0.0.1',
        ]);

        // Respon 2
        DynamicFormResponse::create([
            'form_id' => $form->id,
            'answers' => [
                'kepuasan' => 'Puas',
                'layanan' => ['SIMAKSI'],
                'lokasi' => ['latitude' => -1.2, 'longitude' => 116.8, 'address_hint' => 'Balikpapan'],
            ],
            'ip_address' => '127.0.0.1',
        ]);

        Sanctum::actingAs($user);

        $response = $this->getJson("/api/dereporting/forms/{$form->id}/summary");

        $response->assertStatus(200);
        $response->assertJsonPath('summary.total_responses', 2);

        $fieldsSummary = collect($response->json('summary.fields_summary'));

        // Cek agregasi radio
        $radioSummary = $fieldsSummary->firstWhere('id', 'kepuasan');
        $this->assertEquals('pie', $radioSummary['chart_type']);
        $sangatPuas = collect($radioSummary['data'])->firstWhere('name', 'Sangat Puas');
        $this->assertEquals(1, $sangatPuas['value']);
        $this->assertEquals(50.0, $sangatPuas['percentage']);

        // Cek agregasi checkbox
        $checkSummary = $fieldsSummary->firstWhere('id', 'layanan');
        $this->assertEquals('bar', $checkSummary['chart_type']);
        $simaksi = collect($checkSummary['data'])->firstWhere('name', 'SIMAKSI');
        $this->assertEquals(2, $simaksi['count']);

        // Cek GPS points
        $gpsPoints = $response->json('summary.gps_points');
        $this->assertCount(2, $gpsPoints);
        $this->assertEquals(-0.5, $gpsPoints[0]['latitude']);
    }
}
