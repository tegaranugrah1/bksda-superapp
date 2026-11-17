<?php

namespace Tests\Feature;

use App\Modules\Bmn\Enums\AuctionBatchStatus;
use App\Models\DriveFile;
use App\Models\DriveFolder;
use App\Models\DriveShare;
use App\Models\DriveUnit;
use App\Models\User;
use App\Modules\Bmn\Models\Asset;
use App\Modules\Bmn\Models\AssetLoan;
use App\Modules\Bmn\Models\AuctionBatch;
use App\Modules\Bmn\Models\HandoverAgreement;
use App\Modules\Bmn\Services\AuctionBatchStateMachine;
use App\Modules\Kepegawaian\Models\Employee;
use App\Modules\Kepegawaian\Models\EmployeeLeaveRequest;
use App\Modules\Surat\Exports\SuratMasukExport;
use App\Modules\Surat\Models\SuratMasuk;
use App\Services\PortalNotificationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class SixModulesSecurityHardeningTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('local');
        Storage::fake('public');
        Storage::fake('drive');
    }

    public function test_sec01_bmn_snapshots_strip_tokens_and_private_ktp_endpoint_enforces_auth(): void
    {
        $bmnAdmin = User::factory()->create([
            'role' => 'admin',
            'access_modules' => ['bmn'],
        ]);
        $empA = Employee::create([
            'nip' => '199001012020011001',
            'nama_lengkap' => 'Pihak Pertama',
            'jabatan' => 'Staff',
            'satuan_kerja' => 'BKSDA',
            'is_active' => true,
        ]);
        $empB = Employee::create([
            'nip' => '199001012020011002',
            'nama_lengkap' => 'Pihak Kedua',
            'jabatan' => 'Staff',
            'satuan_kerja' => 'BKSDA',
            'is_active' => true,
        ]);
        $asset = Asset::create([
            'kode_barang' => '3020101001',
            'nup' => '1',
            'nama_barang' => 'Kendaraan Dinas',
            'kondisi' => 'Baik',
        ]);

        // Pre-existing legacy record carrying ?token=secret in snapshot
        $legacy = HandoverAgreement::create([
            'variant' => 'general_goods',
            'first_party_employee_id' => $empA->id,
            'second_party_employee_id' => $empB->id,
            'generated_by' => $bmnAdmin->id,
            'title' => 'BAST Legacy Token',
            'number' => 'BAST/LEG/001',
            'status' => 'draft',
            'document_date' => '2026-11-10',
            'first_party_snapshot' => ['name' => 'Pihak Pertama'],
            'second_party_snapshot' => ['name' => 'Pihak Kedua'],
            'items_snapshot' => [
                ['foto_depan_url' => 'https://app.test/api/bmn/assets/1/photo/depan/view?v=1&token=LEAKED_SECRET'],
            ],
        ]);

        Sanctum::actingAs($bmnAdmin);
        $show = $this->getJson("/api/bmn/handover-agreements/{$legacy->id}")->assertOk();
        $this->assertStringNotContainsString('LEAKED_SECRET', $show->getContent());

        // New agreement with photo URL carrying query token does not persist token in DB
        $created = $this->postJson('/api/bmn/handover-agreements', [
            'variant' => 'general_goods',
            'first_party_employee_id' => $empA->id,
            'second_party_employee_id' => $empB->id,
            'title' => 'BAST Baru',
            'number' => 'BAST/NEW/001',
            'document_date' => '2026-11-10',
            'first_party' => ['name' => 'Pihak Pertama'],
            'second_party' => ['name' => 'Pihak Kedua'],
            'items' => [
                [
                    'name' => 'Laptop',
                    'quantity' => 1,
                    'foto_depan_url' => '/api/bmn/assets/1/photo/depan/view?v=2&token=SHOULD_NOT_SAVE',
                ],
            ],
        ])->assertCreated();

        $savedId = $created->json('data.id');
        $savedRaw = json_encode(HandoverAgreement::findOrFail($savedId)->items_snapshot);
        $this->assertStringNotContainsString('SHOULD_NOT_SAVE', $savedRaw);

        // Private KTP upload on PowerOfAttorney stores on 'local' disk and blocks unauthenticated reads
        $ktpImage = UploadedFile::fake()->image('ktp.png', 200, 120);
        $poa = $this->post('/api/bmn/power-of-attorneys', [
            'employee_id' => $empA->id,
            'document_date' => '2026-11-10',
            'first_party' => ['name' => 'Kepala Balai'],
            'second_party' => ['name' => 'Penerima Kuasa'],
            'asset_ids' => [$asset->id],
            'ktp_image' => $ktpImage,
        ], ['Accept' => 'application/json'])->assertCreated();

        $poaId = $poa->json('data.id');
        $this->assertSame([], Storage::disk('public')->allFiles());
        $this->assertStringContainsString("/api/bmn/power-of-attorneys/{$poaId}/ktp", $poa->json('data.ktp_url'));

        $this->get("/api/bmn/power-of-attorneys/{$poaId}/ktp")->assertOk();
        $this->app['auth']->forgetGuards();
        $this->getJson("/api/bmn/power-of-attorneys/{$poaId}/ktp")->assertUnauthorized();
    }

    public function test_sec02_and_sec10_rolefor_isolation_and_module_admin_notifications(): void
    {
        $bmnOnlyAdmin = User::factory()->create([
            'role' => 'admin',
            'access_modules' => ['bmn', 'kepegawaian'],
            'module_roles' => ['bmn' => 'admin'],
        ]);

        $this->assertSame('admin', $bmnOnlyAdmin->roleFor('bmn'));
        $this->assertSame('user', $bmnOnlyAdmin->roleFor('kepegawaian'));

        // Non-kepegawaian-admin cannot enumerate employee leave-type eligibility via ?employee_id=
        $emp = Employee::create([
            'nip' => '199101012020011003',
            'nama_lengkap' => 'Pegawai LeaveCheck',
            'status_kepegawaian' => 'MMP',
            'is_active' => true,
        ]);
        Sanctum::actingAs($bmnOnlyAdmin);
        $this->getJson("/api/kepegawaian/leave-types?employee_id={$emp->id}")
            ->assertOk()
            ->assertJsonMissing(['message' => 'Personil Masyarakat Mitra Polhut (MMP) tidak memiliki hak cuti kepegawaian.']);

        // notifyAdmins includes user whose global role is 'user' but module_roles['bmn'] === 'admin'
        $modAdmin = User::factory()->create([
            'role' => 'user',
            'access_modules' => ['bmn'],
            'module_roles' => ['bmn' => 'admin'],
            'is_active' => true,
        ]);
        $otherModAdmin = User::factory()->create([
            'role' => 'admin',
            'access_modules' => ['surat'],
            'module_roles' => ['surat' => 'admin'],
            'is_active' => true,
        ]);

        app(PortalNotificationService::class)->notifyAdmins(
            'bmn',
            'Usulan Lelang',
            'Batch baru menunggu persetujuan',
            'bmn_auction'
        );

        $this->assertDatabaseHas('portal_notifications', [
            'user_id' => $modAdmin->id,
            'type' => 'bmn_auction',
            'title' => 'Usulan Lelang',
        ]);
        $this->assertDatabaseMissing('portal_notifications', [
            'user_id' => $otherModAdmin->id,
            'type' => 'bmn_auction',
        ]);
    }

    public function test_sec03_kepegawaian_cross_admin_reset_self_approval_and_quota(): void
    {
        $hrEmp = Employee::create([
            'nip' => '198801012020011001',
            'nama_lengkap' => 'HR Admin',
            'tmt_cpns' => '2020-01-01',
            'is_active' => true,
        ]);
        $hrAdmin = User::factory()->create([
            'username' => $hrEmp->nip,
            'role' => 'admin',
            'access_modules' => ['kepegawaian'],
            'module_roles' => ['kepegawaian' => 'admin'],
        ]);

        $bmnEmp = Employee::create([
            'nip' => '198801012020011002',
            'nama_lengkap' => 'BMN Admin',
            'tmt_cpns' => '2020-01-01',
            'is_active' => true,
        ]);
        User::factory()->create([
            'username' => $bmnEmp->nip,
            'role' => 'user',
            'access_modules' => ['bmn'],
            'module_roles' => ['bmn' => 'admin'],
        ]);

        Sanctum::actingAs($hrAdmin);

        $this->postJson("/api/kepegawaian/employees/{$bmnEmp->id}/reset-password")
            ->assertForbidden();

        $ownLeave = EmployeeLeaveRequest::create([
            'employee_id' => $hrEmp->id,
            'jenis_cuti' => 'Cuti Tahunan',
            'alasan_cuti' => 'Self test',
            'tanggal_pengajuan' => '2026-10-01',
            'tanggal_mulai' => '2026-11-02',
            'tanggal_selesai' => '2026-11-03',
            'jumlah_hari' => 2,
            'alamat_menjalankan_cuti' => 'Samarinda',
            'status' => 'PENGAJUAN',
        ]);
        $this->putJson("/api/kepegawaian/leave-requests/{$ownLeave->id}/status", [
            'status' => 'DISETUJUI',
        ])->assertForbidden();

        $this->postJson("/api/kepegawaian/employees/{$bmnEmp->id}/leave-records", [
            'tanggal_pengajuan' => '2026-10-01',
            'jenis_cuti' => 'Cuti Tahunan',
            'tanggal_mulai' => '2026-11-02',
            'tanggal_selesai' => '2026-11-03',
            'jumlah_hari' => 10,
        ])->assertUnprocessable();
    }

    public function test_sec04_drive_recursive_trash_purge_and_public_share_hardening(): void
    {
        $owner = User::factory()->create([
            'username' => 'driveowner01',
            'role' => 'admin',
            'access_modules' => ['drive'],
            'module_roles' => ['drive' => 'admin'],
            'drive_quota_bytes' => 10 * 1024 * 1024,
        ]);
        $editor = User::factory()->create([
            'username' => 'driveeditor01',
            'role' => 'user',
            'access_modules' => [],
            'drive_quota_bytes' => 10 * 1024 * 1024,
        ]);
        $unit = DriveUnit::create([
            'name' => 'Unit Test Drive',
            'slug' => 'unit-test-drive',
            'storage_quota_bytes' => 50 * 1024 * 1024,
        ]);
        $unit->members()->attach($editor->id, ['role' => 'editor']);

        $parent = DriveFolder::create([
            'unit_id' => $unit->id,
            'user_id' => $owner->id,
            'name' => 'Old Trash Folder',
            'is_restricted' => true,
        ]);
        $childFolder = DriveFolder::create([
            'unit_id' => $unit->id,
            'parent_id' => $parent->id,
            'user_id' => $owner->id,
            'name' => 'Nested Secret',
            'is_restricted' => true,
        ]);
        $childFile = DriveFile::create([
            'unit_id' => $unit->id,
            'folder_id' => $childFolder->id,
            'user_id' => $owner->id,
            'name' => 'secret.pdf',
            's3_key' => 'units/unit-test-drive/secret.pdf',
            'size_bytes' => 50,
            'mime_type' => 'application/pdf',
        ]);
        Storage::disk('drive')->put($childFile->s3_key, '%PDF-1.4 secret');

        $parent->delete();
        DriveFolder::withTrashed()->where('id', $parent->id)->update(['deleted_at' => now()->subDays(40)]);
        Artisan::call('drive:purge-trash', ['--days' => 30]);

        $this->assertNull(DriveFolder::withTrashed()->find($parent->id));
        $this->assertNull(DriveFolder::withTrashed()->find($childFolder->id));
        $this->assertNull(DriveFile::withTrashed()->find($childFile->id));
        Storage::disk('drive')->assertMissing($childFile->s3_key);

        $unitFile = DriveFile::create([
            'unit_id' => $unit->id,
            'user_id' => $owner->id,
            'name' => 'shared.pdf',
            's3_key' => 'units/unit-test-drive/shared.pdf',
            'size_bytes' => 40,
            'mime_type' => 'application/pdf',
        ]);

        Sanctum::actingAs($editor);
        $this->postJson("/api/drive/files/{$unitFile->id}/shares", [
            'share_type' => 'public',
        ])->assertForbidden();

        Sanctum::actingAs($owner);
        $this->postJson("/api/drive/files/{$unitFile->id}/shares", [
            'share_type' => 'public',
            'password' => 'short',
        ])->assertUnprocessable();

        $share = DriveShare::create([
            'file_id' => $unitFile->id,
            'share_type' => 'public',
            'role' => 'viewer',
            'token' => 'tokensec04test1234567890',
            'password_hash' => Hash::make('StrongPass123!'),
            'created_by' => $owner->id,
        ]);

        $this->app['auth']->forgetGuards();
        for ($i = 0; $i < 5; $i++) {
            $this->postJson("/api/drive/s/{$share->token}/download", ['password' => 'WrongPass'])
                ->assertStatus(401);
        }
        $this->postJson("/api/drive/s/{$share->token}/download", ['password' => 'WrongPass'])
            ->assertStatus(429);
    }

    public function test_sec05_bmn_loan_cannot_bypass_private_documents_and_auction_cannot_skip_to_realisasi(): void
    {
        $emp = Employee::create([
            'nip' => '199201012020011005',
            'nama_lengkap' => 'Peminjam Kendaraan',
            'is_active' => true,
        ]);
        $borrower = User::factory()->create([
            'username' => $emp->nip,
            'role' => 'user',
            'access_modules' => [],
        ]);

        $asset = Asset::create([
            'kode_barang' => '3020101002',
            'nup' => '2',
            'nama_barang' => 'Kendaraan Operasional',
            'kondisi' => 'Baik',
            'employee_id' => $emp->id,
            'bpkb_document_path' => 'bmn-docs/bpkb.pdf',
        ]);
        Storage::disk('local')->put('bmn-docs/bpkb.pdf', '%PDF-1.4 bpkb');

        AssetLoan::create([
            'asset_id' => $asset->id,
            'employee_id' => $emp->id,
            'tanggal_pinjam' => '2026-11-01',
            'due_date' => '2026-12-01',
            'status' => 'dipinjam',
        ]);

        Sanctum::actingAs($borrower);
        $this->getJson("/api/bmn/assets/{$asset->id}/document/bpkb/view")->assertForbidden();

        $reviewer = User::factory()->create([
            'role' => 'user',
            'access_modules' => ['bmn'],
            'permissions' => ['bmn.view', 'bmn.import.review'],
        ]);
        Sanctum::actingAs($reviewer);
        $this->postJson('/api/bmn/assets/import', [])->assertForbidden();

        $batch = AuctionBatch::create([
            'batch_number' => 'LELANG-DRAFT-01',
            'name' => 'Batch Draft',
            'status' => AuctionBatchStatus::DRAFT,
        ]);

        $this->expectException(ValidationException::class);
        app(AuctionBatchStateMachine::class)->assertCanTransition($batch, AuctionBatchStatus::REALISASI);
    }

    public function test_sec06_and_sec07_surat_tugas_kop_whitelist_and_surat_local_storage(): void
    {
        $emp = Employee::create([
            'nip' => '199301012020011006',
            'nama_lengkap' => 'Pegawai ST & Surat',
            'is_active' => true,
        ]);
        $stPlainUser = User::factory()->create([
            'username' => $emp->nip,
            'role' => 'user',
            'access_modules' => ['surat_tugas'],
        ]);

        Sanctum::actingAs($stPlainUser);
        $this->getJson('/api/surat-tugas')->assertForbidden();

        $this->app['auth']->forgetGuards();
        $this->postJson('/api/surat-tugas/submit', [
            'maksud_tujuan' => 'Uji Kop Eksternal',
            'tanggal_mulai' => '2026-12-10',
            'tanggal_selesai' => '2026-12-11',
            'sumber_dana' => 'dipa',
            'employees' => [['id' => $emp->id]],
            'template_snapshot' => [
                'configuration' => [
                    'kop_image_url' => 'https://evil.example.test/steal.png',
                ],
            ],
        ])->assertUnprocessable()->assertJsonValidationErrors(['template_snapshot.configuration.kop_image_url']);

        $suratAdmin = User::factory()->create([
            'role' => 'admin',
            'access_modules' => ['surat'],
            'module_roles' => ['surat' => 'admin'],
        ]);
        Sanctum::actingAs($suratAdmin);

        $this->getJson('/api/surat/surat-masuk/not-a-number')->assertNotFound();

        $pdf = UploadedFile::fake()->create('surat.pdf', 10, 'application/pdf');
        $created = $this->post('/api/surat/surat-masuk', [
            'no_agenda' => 'AGD/001/2026',
            'tanggal_agenda' => '2026-11-10',
            'no_surat' => '=cmd|"/C calc"!A0',
            'tanggal_surat' => '2026-11-10',
            'asal_surat' => '+Pengirim Berbahaya',
            'isi_ringkas' => '@Formula Perihal',
            'file_surat' => $pdf,
        ], ['Accept' => 'application/json'])->assertCreated();

        $id = $created->json('data.id');
        $record = SuratMasuk::findOrFail($id);
        $this->assertTrue(Storage::disk('local')->exists($record->file_path));

        $this->get("/api/surat/surat-masuk/{$id}/file")->assertOk();

        $mapped = (new SuratMasukExport())->map($record);
        $this->assertStringStartsWith("'=", (string) $mapped[2]);
        $this->assertStringStartsWith("'+", (string) $mapped[4]);
        $this->assertStringStartsWith("'@", (string) $mapped[6]);
    }
}
