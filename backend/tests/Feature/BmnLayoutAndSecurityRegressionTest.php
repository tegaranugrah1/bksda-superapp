<?php

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Bmn\Enums\AuctionBatchStatus;
use App\Modules\Bmn\Models\Asset;
use App\Modules\Bmn\Models\AssetLoan;
use App\Modules\Bmn\Models\AssetMaintenance;
use App\Modules\Bmn\Models\AuctionBatch;
use App\Modules\Bmn\Models\ImportBatch;
use App\Modules\Bmn\Models\Tag;
use App\Modules\Bmn\Models\UsageAgreement;
use App\Modules\Kepegawaian\Models\Employee;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class BmnLayoutAndSecurityRegressionTest extends TestCase
{
    use RefreshDatabase;

    private User $viewOnlyUser;
    private User $adminUser;
    private User $exporterUser;
    private User $superAdminUser;

    protected function setUp(): void
    {
        parent::setUp();

        $this->viewOnlyUser = User::factory()->create([
            'username' => 'view_staff_' . uniqid(),
            'role' => 'user',
            'access_modules' => ['bmn'],
            'permissions' => ['bmn.view'],
        ]);

        $this->adminUser = User::factory()->create([
            'username' => 'admin_bmn_' . uniqid(),
            'role' => 'admin',
            'access_modules' => ['bmn'],
            'permissions' => [
                'bmn.view',
                'bmn.asset.create',
                'bmn.asset.update',
                'bmn.asset.dispose',
                'bmn.auction.view',
                'bmn.auction.create',
                'bmn.auction.update',
                'bmn.auction.delete',
                'bmn.auction.print',
                'bmn.document.history.view',
                'bmn.document.generate',
            ],
        ]);

        $this->exporterUser = User::factory()->create([
            'username' => 'exporter_bmn_' . uniqid(),
            'role' => 'user',
            'access_modules' => ['bmn'],
            'permissions' => ['bmn.view', 'bmn.asset.export'],
        ]);

        $this->superAdminUser = User::factory()->create([
            'username' => 'superadmin_' . uniqid(),
            'role' => 'super_admin',
            'access_modules' => ['bmn'],
        ]);
    }

    private function createAsset(array $overrides = []): Asset
    {
        return Asset::create(array_merge([
            'kode_barang' => '3010101' . rand(100, 999),
            'nup' => (string) rand(1000, 9999),
            'nama_barang' => 'Laptop Kedinasan',
            'kondisi' => 'Baik',
            'nilai_perolehan' => 15000000,
        ], $overrides));
    }

    private function createEmployee(array $overrides = []): Employee
    {
        return Employee::create(array_merge([
            'nip' => '19850101' . rand(100000, 999999),
            'nama_lengkap' => 'Pegawai Uji BMN',
            'jabatan' => 'Pranata Komputer',
            'pangkat_golongan' => 'III/a',
            'satuan_kerja' => 'BKSDA',
            'is_active' => true,
        ], $overrides));
    }

    // =========================================================================
    // PILAR 1: KASUS UJI KEAMANAN, RBAC & INVARIANT (BMN-SEC-01 s.d. BMN-SEC-27)
    // =========================================================================

    public function test_view_only_user_cannot_export_bmn_assets_and_gets_403(): void
    {
        Sanctum::actingAs($this->viewOnlyUser);

        $response = $this->getJson('/api/bmn/assets/export');

        $response->assertStatus(403)
            ->assertJsonPath('code', 'PERMISSION_DENIED');
    }

    public function test_view_only_user_cannot_export_bmn_loans_and_gets_403(): void
    {
        Sanctum::actingAs($this->viewOnlyUser);

        $response = $this->getJson('/api/bmn/loans/export');

        $response->assertStatus(403)
            ->assertJsonPath('code', 'PERMISSION_DENIED');
    }

    public function test_view_only_user_cannot_export_bmn_maintenances_and_gets_403(): void
    {
        Sanctum::actingAs($this->viewOnlyUser);

        $response = $this->getJson('/api/bmn/maintenances/export');

        $response->assertStatus(403)
            ->assertJsonPath('code', 'PERMISSION_DENIED');
    }

    public function test_user_with_export_permission_can_export_assets(): void
    {
        $this->createAsset();
        Sanctum::actingAs($this->exporterUser);

        $response = $this->get('/api/bmn/assets/export');

        $this->assertContains($response->getStatusCode(), [200, 302]);
    }

    public function test_admin_with_update_permission_can_export_assets(): void
    {
        $this->createAsset();
        Sanctum::actingAs($this->adminUser);

        $response = $this->get('/api/bmn/assets/export');

        $this->assertContains($response->getStatusCode(), [200, 302]);
    }

    public function test_upload_invalid_file_extension_to_import_review_fails_validation(): void
    {
        Sanctum::actingAs($this->superAdminUser);

        $fakeFile = UploadedFile::fake()->create('malicious.php', 100, 'application/x-php');

        $response = $this->postJson('/api/bmn/import-review/upload', [
            'file' => $fakeFile,
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['file']);
    }

    public function test_upload_file_exceeding_10mb_to_import_review_fails_validation(): void
    {
        Sanctum::actingAs($this->superAdminUser);

        $largeFile = UploadedFile::fake()->create('large_import.xlsx', 11264, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

        $response = $this->postJson('/api/bmn/import-review/upload', [
            'file' => $largeFile,
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['file']);
    }

    public function test_unauthenticated_request_is_rejected_with_401(): void
    {
        $response = $this->getJson('/api/bmn/assets');

        $response->assertStatus(401);
    }

    public function test_admin_cannot_bulk_force_delete_assets_and_gets_403(): void
    {
        $asset = $this->createAsset(['kondisi' => 'Rusak Berat']);
        $asset->delete(); // soft delete

        Sanctum::actingAs($this->adminUser);

        $response = $this->postJson('/api/bmn/assets/bulk-force-delete', [
            'ids' => [$asset->id],
        ]);

        $response->assertStatus(403)
            ->assertJsonPath('code', 'PERMISSION_DENIED');
    }

    public function test_super_admin_can_bulk_force_delete_assets_successfully(): void
    {
        $asset = $this->createAsset(['kondisi' => 'Rusak Berat']);
        $asset->delete(); // soft delete

        Sanctum::actingAs($this->superAdminUser);

        $response = $this->postJson('/api/bmn/assets/bulk-force-delete', [
            'ids' => [$asset->id],
        ]);

        $response->assertStatus(200);
        $this->assertDatabaseMissing('bmn_assets', ['id' => $asset->id]);
    }

    public function test_user_with_only_import_review_permission_cannot_approve_import_batch(): void
    {
        $reviewerUser = User::factory()->create([
            'username' => 'reviewer_' . uniqid(),
            'role' => 'user',
            'access_modules' => ['bmn'],
            'permissions' => ['bmn.view', 'bmn.import.review'],
        ]);

        $batch = ImportBatch::create([
            'uploaded_by' => $reviewerUser->id,
            'filename' => 'batch_sample.xlsx',
            'status' => 'pending',
            'total_rows' => 1,
            'new_rows' => 1,
            'updated_rows' => 0,
            'unchanged_rows' => 0,
        ]);

        Sanctum::actingAs($reviewerUser);

        $response = $this->postJson("/api/bmn/import-review/{$batch->id}/approve");

        $response->assertStatus(403)
            ->assertJsonPath('code', 'PERMISSION_DENIED');
    }

    public function test_regular_employee_cannot_view_other_employees_bmn_asset_via_idor(): void
    {
        $employeeA = $this->createEmployee(['nip' => '198501011111111111']);
        $employeeB = $this->createEmployee(['nip' => '198502022222222222']);

        $userA = User::factory()->create([
            'username' => $employeeA->nip,
            'role' => 'user',
            'access_modules' => ['bmn'],
            'permissions' => ['portal.view'], // no bmn.view
        ]);

        $assetB = $this->createAsset(['employee_id' => $employeeB->id]);

        Sanctum::actingAs($userA);

        $response = $this->getJson("/api/bmn/assets/{$assetB->id}");

        $response->assertStatus(403)
            ->assertJsonPath('code', 'PERMISSION_DENIED');
    }

    public function test_regular_employee_can_view_own_assigned_bmn_asset(): void
    {
        $employeeA = $this->createEmployee(['nip' => '198501013333333333']);

        $userA = User::factory()->create([
            'username' => $employeeA->nip,
            'role' => 'user',
            'access_modules' => ['bmn'],
            'permissions' => ['portal.view'], // no bmn.view
        ]);

        $assetA = $this->createAsset(['employee_id' => $employeeA->id]);

        Sanctum::actingAs($userA);

        $response = $this->getJson("/api/bmn/assets/{$assetA->id}");

        $response->assertStatus(200)
            ->assertJsonPath('data.id', $assetA->id);
    }

    public function test_document_download_path_traversal_is_blocked_with_422(): void
    {
        $asset = $this->createAsset(['kondisi' => 'Rusak Berat']);
        Sanctum::actingAs($this->adminUser);

        $response = $this->getJson("/api/bmn/assets/{$asset->id}/document/invalid_type/download");

        $response->assertStatus(422)
            ->assertJsonPath('message', 'Tipe dokumen tidak valid.');
    }

    public function test_loan_creation_rejects_already_borrowed_or_damaged_asset(): void
    {
        $employee = $this->createEmployee();
        $asset = $this->createAsset(['kondisi' => 'Rusak Berat']);

        // Create an existing active loan
        AssetLoan::create([
            'asset_id' => $asset->id,
            'employee_id' => $employee->id,
            'tanggal_pinjam' => now()->toDateString(),
            'status' => 'dipinjam',
        ]);

        Sanctum::actingAs($this->adminUser);

        $response = $this->postJson('/api/bmn/loans', [
            'asset_ids' => [$asset->id],
            'borrower_employee_id' => $employee->id,
            'loan_date' => now()->toDateString(),
        ]);

        $response->assertStatus(400)
            ->assertJsonFragment(['message' => "Aset '{$asset->nama_barang}' sedang dalam peminjaman aktif."]);
    }

    public function test_auction_batch_deletion_guard_blocks_diajukan_or_realisasi_batches(): void
    {
        $batch = AuctionBatch::create([
            'batch_number' => 'LELANG-REG-' . uniqid(),
            'name' => 'Lelang Terkunci',
            'status' => AuctionBatchStatus::DIAJUKAN,
            'created_by' => $this->adminUser->id,
        ]);

        Sanctum::actingAs($this->adminUser);

        $response = $this->deleteJson("/api/bmn/auction-batches/{$batch->id}");

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['status']);
    }

    public function test_auction_batch_transition_to_diajukan_requires_completed_valuations(): void
    {
        $batch = AuctionBatch::create([
            'batch_number' => 'LELANG-DRAFT-' . uniqid(),
            'name' => 'Lelang Draft Belum Lengkap',
            'status' => AuctionBatchStatus::DRAFT,
            'created_by' => $this->adminUser->id,
        ]);

        $asset = $this->createAsset(['kondisi' => 'Rusak Berat']);
        $emp = $this->createEmployee();

        Sanctum::actingAs($this->adminUser);

        // Add asset via official endpoint so proper UUID and relations are established
        $this->postJson("/api/bmn/auction-batches/{$batch->id}/assets", [
            'asset_ids' => [$asset->id],
        ])->assertStatus(200);

        // Transition with unvaluated asset must fail checklist valuation guard
        $response = $this->postJson("/api/bmn/auction-batches/{$batch->id}/transition", [
            'status' => 'DIAJUKAN',
            'kepala_balai_id' => $emp->id,
            'signatories' => [
                'panitia' => [$emp->id],
                'tim_penilai' => [$emp->id],
                'pemeriksa' => [$emp->id],
            ],
            'document_numbers' => ['surat_tugas' => 'ST/01'],
            'document_dates' => ['surat_tugas' => now()->toDateString()],
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['checklist']);
    }

    public function test_official_document_deletion_requires_bmn_document_delete_permission(): void
    {
        $employee = $this->createEmployee();
        $agreement = UsageAgreement::create([
            'employee_id' => $employee->id,
            'generated_by' => $this->adminUser->id,
            'number' => 'BA.01/TEST/2026',
            'status' => 'published',
            'kap' => 'KAP.03.02',
            'document_date' => now()->toDateString(),
            'first_party_snapshot' => ['name' => 'Dr. Pejabat'],
            'second_party_snapshot' => ['name' => $employee->nama_lengkap],
            'assets_snapshot' => [],
        ]);

        // User has generate and history view, but NO document.delete
        $creatorUser = User::factory()->create([
            'username' => 'doc_creator_' . uniqid(),
            'role' => 'user',
            'access_modules' => ['bmn'],
            'permissions' => ['bmn.view', 'bmn.document.generate', 'bmn.document.history.view'],
        ]);

        Sanctum::actingAs($creatorUser);

        $response = $this->deleteJson("/api/bmn/usage-agreements/{$agreement->id}");

        $response->assertStatus(403)
            ->assertJsonPath('code', 'PERMISSION_DENIED');
    }

    public function test_tag_creation_blocks_subtag_as_parent_enforcing_one_level_depth(): void
    {
        $parentTag = Tag::create([
            'name' => 'induk',
            'label' => '#induk',
            'color' => 'blue',
        ]);

        $subTag = Tag::create([
            'name' => 'anak',
            'label' => '#anak',
            'parent_id' => $parentTag->id,
            'color' => 'emerald',
        ]);

        Sanctum::actingAs($this->adminUser);

        $response = $this->postJson('/api/bmn/tags', [
            'name' => 'cucu',
            'parent_id' => $subTag->id,
            'color' => 'amber',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['parent_id']);
    }

    public function test_main_tag_deletion_is_blocked_when_subtags_exist(): void
    {
        $parentTag = Tag::create([
            'name' => 'induk_delete_guard',
            'label' => '#induk_delete_guard',
            'color' => 'blue',
        ]);

        Tag::create([
            'name' => 'anak_guard',
            'label' => '#anak_guard',
            'parent_id' => $parentTag->id,
            'color' => 'emerald',
        ]);

        Sanctum::actingAs($this->adminUser);

        $response = $this->deleteJson("/api/bmn/tags/{$parentTag->id}");

        $response->assertStatus(422)
            ->assertJsonFragment(['message' => "Tag {$parentTag->label} tidak dapat dihapus karena masih memiliki 1 sub-tag. Hapus atau pindahkan sub-tag terlebih dahulu."]);
    }

    public function test_geotag_photo_view_rejects_unsafe_uri_schemes_and_prevents_open_redirect(): void
    {
        $asset = $this->createAsset([
            'foto_geotag_url' => 'javascript:alert(document.cookie)',
        ]);

        Sanctum::actingAs($this->viewOnlyUser);

        $response = $this->get("/api/bmn/assets/{$asset->id}/photo/geotag/view");

        // System verifies http/https and safely returns 404
        $response->assertStatus(404);
    }

    public function test_loan_update_and_return_blocks_already_returned_loan(): void
    {
        $employee = $this->createEmployee();
        $asset = $this->createAsset(['kondisi' => 'Rusak Berat']);

        $loan = AssetLoan::create([
            'asset_id' => $asset->id,
            'employee_id' => $employee->id,
            'tanggal_pinjam' => now()->subDays(5)->toDateString(),
            'status' => 'dikembalikan',
            'tanggal_kembali' => now()->toDateString(),
        ]);

        Sanctum::actingAs($this->adminUser);

        // Edit already returned loan
        $editResponse = $this->putJson("/api/bmn/loans/{$loan->id}", [
            'purpose' => 'Tujuan baru',
        ]);
        $editResponse->assertStatus(400)
            ->assertJsonFragment(['message' => 'Peminjaman yang sudah dikembalikan tidak dapat diedit.']);

        // Return already returned loan
        $returnResponse = $this->postJson("/api/bmn/loans/{$loan->id}/return", [
            'return_condition' => 'Baik',
        ]);
        $returnResponse->assertStatus(400)
            ->assertJsonFragment(['error' => 'Buku catatan sudah ditutup. Aset ini sudah lama dikembalikan.']);
    }

    public function test_loan_creation_rejects_due_date_earlier_than_loan_date(): void
    {
        $employee = $this->createEmployee();
        $asset = $this->createAsset(['kondisi' => 'Rusak Berat']);

        Sanctum::actingAs($this->adminUser);

        $response = $this->postJson('/api/bmn/loans', [
            'asset_ids' => [$asset->id],
            'borrower_employee_id' => $employee->id,
            'loan_date' => '2026-11-10',
            'due_date' => '2026-11-01', // earlier than loan_date
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['due_date']);
    }

    public function test_auction_results_and_realization_requires_bmn_auction_finalize_permission(): void
    {
        $batch = AuctionBatch::create([
            'batch_number' => 'LELANG-FIN-' . uniqid(),
            'name' => 'Lelang Realisasi',
            'status' => AuctionBatchStatus::DIAJUKAN,
            'created_by' => $this->adminUser->id,
        ]);

        // User has bmn.auction.update but LACKS bmn.auction.finalize
        $updateOnlyUser = User::factory()->create([
            'username' => 'auction_updater_' . uniqid(),
            'role' => 'user',
            'access_modules' => ['bmn'],
            'permissions' => ['bmn.view', 'bmn.auction.view', 'bmn.auction.update'],
        ]);

        Sanctum::actingAs($updateOnlyUser);

        $response = $this->postJson("/api/bmn/auction-batches/{$batch->id}/realize");

        $response->assertStatus(403)
            ->assertJsonPath('code', 'PERMISSION_DENIED');
    }

    public function test_import_review_rejects_reapproval_of_already_approved_batch(): void
    {
        $batch = ImportBatch::create([
            'uploaded_by' => $this->superAdminUser->id,
            'filename' => 'already_approved.xlsx',
            'status' => 'approved',
            'total_rows' => 5,
            'new_rows' => 5,
            'updated_rows' => 0,
            'unchanged_rows' => 0,
        ]);

        $approverUser = User::factory()->create([
            'username' => 'approver_' . uniqid(),
            'role' => 'admin',
            'access_modules' => ['bmn'],
            'permissions' => ['bmn.view', 'bmn.import.approve'],
        ]);

        Sanctum::actingAs($approverUser);

        $response = $this->postJson("/api/bmn/import-review/{$batch->id}/approve");

        // Controller looks for where('status', 'pending')->findOrFail(), so it returns 404
        $response->assertStatus(404);
    }

    public function test_maintenance_index_returns_paginated_resources_for_view_only_users(): void
    {
        Sanctum::actingAs($this->viewOnlyUser);
        $this->getJson('/api/bmn/maintenances')->assertOk()
            ->assertJsonCount(0, 'data')->assertJsonPath('meta.total', 0);

        $asset = $this->createAsset();
        for ($i = 0; $i < 21; $i++) {
            AssetMaintenance::create([
                'asset_id' => $asset->id,
                'tanggal_service' => '2026-11-10',
                'biaya' => 10000,
                'deskripsi' => 'Fixture servis',
            ]);
        }

        $this->getJson('/api/bmn/maintenances')->assertOk()
            ->assertJsonCount(20, 'data')->assertJsonPath('meta.last_page', 2)
            ->assertJsonPath('meta.total', 21)->assertJsonPath('data.0.asset.id', $asset->id);
        $this->getJson('/api/bmn/maintenances?page=2')->assertOk()->assertJsonCount(1, 'data');
    }

    public function test_maintenance_rejects_negative_cost_and_updates_asset_condition_to_baik(): void
    {
        $asset = $this->createAsset(['kondisi' => 'Rusak Ringan']);

        Sanctum::actingAs($this->adminUser);

        // 1. Negative cost is rejected
        $negativeRes = $this->postJson("/api/bmn/assets/{$asset->id}/maintenances", [
            'tanggal_service' => now()->toDateString(),
            'biaya' => -50000,
            'deskripsi' => 'Servis ilegal',
        ]);
        $negativeRes->assertStatus(422)
            ->assertJsonValidationErrors(['biaya']);

        // 2. Valid maintenance updates asset condition
        $validRes = $this->postJson("/api/bmn/assets/{$asset->id}/maintenances", [
            'tanggal_service' => now()->toDateString(),
            'biaya' => 250000,
            'deskripsi' => 'Penggantian baterai dan kalibrasi',
            'kondisi_baru' => 'Baik',
        ]);
        $validRes->assertStatus(201);

        $this->assertEquals('Baik', $asset->fresh()->kondisi);
    }

    public function test_asset_document_upload_rejects_invalid_extension_and_size_over_20mb(): void
    {
        $asset = $this->createAsset(['kondisi' => 'Rusak Berat']);

        Sanctum::actingAs($this->adminUser);

        // Invalid extension
        $fakeExe = UploadedFile::fake()->create('trojan.exe', 100, 'application/x-msdownload');
        $invalidExtRes = $this->postJson("/api/bmn/assets/{$asset->id}/document", [
            'type' => 'bpkb',
            'document' => $fakeExe,
        ]);
        $invalidExtRes->assertStatus(422)
            ->assertJsonValidationErrors(['document']);

        // Exceeding 20MB (20480 KB)
        $largeDoc = UploadedFile::fake()->create('heavy.pdf', 21500, 'application/pdf');
        $largeRes = $this->postJson("/api/bmn/assets/{$asset->id}/document", [
            'type' => 'bpkb',
            'document' => $largeDoc,
        ]);
        $largeRes->assertStatus(422)
            ->assertJsonValidationErrors(['document']);
    }
}
