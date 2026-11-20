<?php

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Bmn\Enums\AuctionBatchStatus;
use App\Modules\Bmn\Models\Asset;
use App\Modules\Bmn\Models\AssetLoan;
use App\Modules\Bmn\Models\AssetMaintenance;
use App\Modules\Bmn\Models\AuctionBatch;
use App\Modules\Bmn\Models\ImportBatch;
use App\Modules\Bmn\Models\ImportStaging;
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
        $this->postJson('/api/bmn/tags', [
            'name' => 'cucu',
            'parent_id' => $subTag->id,
            'color' => 'amber',
        ])->assertStatus(403);

        Sanctum::actingAs($this->superAdminUser);

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
        $this->deleteJson("/api/bmn/tags/{$parentTag->id}")->assertStatus(403);

        Sanctum::actingAs($this->superAdminUser);

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

    public function test_import_review_field_selection_updates_summary_and_applies_only_checked_columns(): void
    {
        $asset = $this->createAsset([
            'kode_barang' => '4040104001',
            'nup' => '2',
            'nama_barang' => 'Pagar Permanen',
            'umur_aset' => 99,
            'no_dokumen' => '05/OLD/2020',
            'no_sertifikat' => '05/CERT/2020',
        ]);

        $batch = ImportBatch::create([
            'uploaded_by' => $this->superAdminUser->id,
            'filename' => 'pagar_update.xlsx',
            'status' => 'pending',
            'total_rows' => 2,
            'new_rows' => 1,
            'updated_rows' => 1,
            'unchanged_rows' => 0,
        ]);

        $newRow = ImportStaging::create([
            'batch_id' => $batch->id,
            'diff_status' => 'new',
            'selected' => true,
            'imported_data' => [
                'kode_barang' => '3010312999',
                'nup' => '1',
                'nama_barang' => 'Aset Baru Uji',
                'kondisi' => 'Baik',
            ],
        ]);

        $updatedRow = ImportStaging::create([
            'batch_id' => $batch->id,
            'existing_asset_id' => $asset->id,
            'diff_status' => 'updated',
            'selected' => true,
            'imported_data' => [
                'kode_barang' => '4040104001',
                'nup' => '2',
                'nama_barang' => 'Pagar Permanen',
            ],
            'changed_fields' => [
                'umur_aset' => ['old' => 99, 'new' => 98],
                'no_dokumen' => ['old' => '05/OLD/2020', 'new' => 'SPTJM.536/DOC'],
                'no_sertifikat' => ['old' => '05/CERT/2020', 'new' => 'SPTJM.536/CERT'],
            ],
        ]);

        Sanctum::actingAs($this->superAdminUser);

        $this->getJson("/api/bmn/import-review/{$batch->id}")
            ->assertOk()
            ->assertJsonPath('selection_summary.selected_total', 2)
            ->assertJsonPath('selection_summary.selected_new', 1)
            ->assertJsonPath('selection_summary.selected_updated', 1);

        $this->postJson('/api/bmn/import-review/bulk-selection', [
            'batch_id' => $batch->id,
            'action' => 'select_new_only',
        ])
            ->assertOk()
            ->assertJsonPath('selection_summary.selected_total', 1)
            ->assertJsonPath('selection_summary.selected_new', 1)
            ->assertJsonPath('selection_summary.selected_updated', 0);

        $this->postJson('/api/bmn/import-review/toggle-field-selection', [
            'row_id' => $updatedRow->id,
            'field' => 'no_dokumen',
            'selected' => true,
        ])
            ->assertOk()
            ->assertJsonPath('row.selected', true)
            ->assertJsonPath('row.changed_fields.no_dokumen.selected', true)
            ->assertJsonPath('selection_summary.selected_total', 2)
            ->assertJsonPath('selection_summary.selected_updated', 1);

        $this->postJson('/api/bmn/import-review/toggle-field-selection', [
            'row_id' => $updatedRow->id,
            'field' => 'no_sertifikat',
            'selected' => true,
        ])
            ->assertOk()
            ->assertJsonPath('row.changed_fields.no_dokumen.selected', true)
            ->assertJsonPath('row.changed_fields.no_sertifikat.selected', true)
            ->assertJsonPath('row.changed_fields.umur_aset.selected', false)
            ->assertJsonPath('selection_summary.selected_updated', 1);

        $this->postJson("/api/bmn/import-review/{$batch->id}/approve")
            ->assertOk()
            ->assertJsonPath('inserted', 1)
            ->assertJsonPath('updated', 1);

        $freshAsset = $asset->fresh();
        $this->assertEquals(99, (int) $freshAsset->umur_aset);
        $this->assertSame('SPTJM.536/DOC', $freshAsset->no_dokumen);
        $this->assertSame('SPTJM.536/CERT', $freshAsset->no_sertifikat);
        $this->assertDatabaseHas('bmn_assets', ['kode_barang' => '3010312999', 'nup' => '1']);
        $this->assertTrue($newRow->fresh()->selected);
    }

    public function test_import_review_bulk_field_selection_and_merk_search_filter(): void
    {
        $chairA = $this->createAsset(['kode_barang' => '3050201003', 'nup' => '105', 'nama_barang' => 'Kursi Besi/Metal']);
        $chairB = $this->createAsset(['kode_barang' => '3050204004', 'nup' => '36', 'nama_barang' => 'A.C. Split']);

        $batch = ImportBatch::create([
            'uploaded_by' => $this->superAdminUser->id,
            'filename' => 'bulk_field_test.xlsx',
            'status' => 'pending',
            'total_rows' => 3,
            'new_rows' => 1,
            'updated_rows' => 2,
            'unchanged_rows' => 0,
        ]);

        $rowNew = ImportStaging::create([
            'batch_id' => $batch->id,
            'diff_status' => 'new',
            'selected' => true,
            'imported_data' => [
                'kode_barang' => '3050209999',
                'nup' => '1',
                'nama_barang' => 'Laptop Baru',
            ],
        ]);

        $rowA = ImportStaging::create([
            'batch_id' => $batch->id,
            'existing_asset_id' => $chairA->id,
            'diff_status' => 'updated',
            'selected' => false,
            'imported_data' => [
                'kode_barang' => '3050201003',
                'nup' => '105',
                'nama_barang' => 'Kursi Besi/Metal',
                'merk' => 'Chitose',
                'tipe' => 'Chitose Cosmo 54',
                'merk_tipe' => 'Chitose Chitose Cosmo 54',
            ],
            'changed_fields' => [
                'tipe' => ['old' => null, 'new' => 'Chitose Cosmo 54', 'selected' => false],
                'umur_aset' => ['old' => 5, 'new' => 0, 'selected' => false],
            ],
        ]);

        $rowB = ImportStaging::create([
            'batch_id' => $batch->id,
            'existing_asset_id' => $chairB->id,
            'diff_status' => 'updated',
            'selected' => false,
            'imported_data' => [
                'kode_barang' => '3050204004',
                'nup' => '36',
                'nama_barang' => 'A.C. Split',
                'merk' => 'Daikin',
                'tipe' => 'FTKQ25',
            ],
            'changed_fields' => [
                'umur_aset' => ['old' => 10, 'new' => 9, 'selected' => false],
            ],
        ]);

        Sanctum::actingAs($this->superAdminUser);

        $this->getJson("/api/bmn/import-review/{$batch->id}?nama_barang=Chitose")
            ->assertOk()
            ->assertJsonCount(1, 'rows.data')
            ->assertJsonPath('rows.data.0.id', $rowA->id)
            ->assertJsonPath('selection_summary.filtered_updated', 1)
            ->assertJsonFragment(['field' => 'tipe', 'total' => 1, 'selected' => 0]);

        $this->postJson('/api/bmn/import-review/bulk-selection', [
            'batch_id' => $batch->id,
            'action' => 'select_field',
            'field' => 'umur_aset',
        ])
            ->assertOk()
            ->assertJsonPath('selection_summary.selected_updated', 2)
            ->assertJsonFragment(['field' => 'umur_aset', 'total' => 2, 'selected' => 2]);

        $this->assertTrue($rowA->fresh()->selected);
        $this->assertFalse($rowA->fresh()->changed_fields['tipe']['selected']);
        $this->assertTrue($rowB->fresh()->selected);

        $this->postJson('/api/bmn/import-review/bulk-selection', [
            'batch_id' => $batch->id,
            'action' => 'clear_field',
            'field' => 'umur_aset',
            'nama_barang' => 'Chitose',
        ])
            ->assertOk()
            ->assertJsonPath('selection_summary.selected_updated', 0);

        $this->assertFalse($rowA->fresh()->selected);
        $this->assertTrue($rowB->fresh()->selected);

        $this->getJson("/api/bmn/import-review/{$batch->id}?changed_field=tipe")
            ->assertOk()
            ->assertJsonCount(1, 'rows.data')
            ->assertJsonPath('rows.data.0.id', $rowA->id);

        $this->getJson("/api/bmn/import-review/{$batch->id}?changed_field=__selected__")
            ->assertOk()
            ->assertJsonCount(2, 'rows.data');

        $this->postJson('/api/bmn/import-review/bulk-selection', [
            'batch_id' => $batch->id,
            'action' => 'select_updated',
        ])
            ->assertOk()
            ->assertJsonPath('selection_summary.selected_updated', 2)
            ->assertJsonFragment(['field' => 'tipe', 'total' => 1, 'selected' => 1]);

        $this->assertTrue($rowA->fresh()->selected);
        $this->assertTrue($rowA->fresh()->changed_fields['tipe']['selected']);

        $this->postJson('/api/bmn/import-review/bulk-selection', [
            'batch_id' => $batch->id,
            'action' => 'clear_updated',
        ])
            ->assertOk()
            ->assertJsonPath('selection_summary.selected_updated', 0)
            ->assertJsonPath('selection_summary.selected_new', 1);

        $this->assertFalse($rowA->fresh()->selected);
        $this->assertFalse($rowB->fresh()->selected);
        $this->assertTrue($rowNew->fresh()->selected);
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

    public function test_assets_catalog_supports_acquisition_year_date_modified_photo_loan_filters_sort_and_export(): void
    {
        $employee = $this->createEmployee();
        $oldBorrowed = $this->createAsset([
            'nama_barang' => 'Drone Lama Dipinjam',
            'tahun_perolehan' => 2021,
            'nilai_perolehan' => 2000000,
            'foto_geotag_url' => 'https://drive.google.com/file/d/abc/view',
        ]);
        $recentPhoto = $this->createAsset([
            'nama_barang' => 'Laptop Baru',
            'tahun_perolehan' => 2025,
            'nilai_perolehan' => 15000000,
            'foto_depan_path' => 'bmn-photos/laptop.jpg',
        ]);
        $noPhoto = $this->createAsset([
            'nama_barang' => 'Meja Kerja',
            'tahun_perolehan' => 2018,
            'nilai_perolehan' => 500000,
            'foto_geotag_url' => '-',
        ]);

        AssetLoan::create([
            'asset_id' => $oldBorrowed->id,
            'employee_id' => $employee->id,
            'tanggal_pinjam' => now()->toDateString(),
            'status' => 'dipinjam',
        ]);

        // Set explicit past timestamps directly so Eloquent doesn't overwrite updated_at
        \Illuminate\Support\Facades\DB::table('bmn_assets')->where('id', $oldBorrowed->id)->update(['updated_at' => now()->subDays(12)]);
        \Illuminate\Support\Facades\DB::table('bmn_assets')->where('id', $noPhoto->id)->update(['updated_at' => now()->subDays(2)]);
        \Illuminate\Support\Facades\DB::table('bmn_assets')->where('id', $recentPhoto->id)->update(['updated_at' => now()]);

        Sanctum::actingAs($this->exporterUser);

        // Default order is updated_desc + filter_options.years lists distinct years descending
        $this->getJson('/api/bmn/assets')
            ->assertOk()
            ->assertJsonPath('data.0.id', $recentPhoto->id)
            ->assertJsonPath('data.1.id', $noPhoto->id)
            ->assertJsonPath('data.2.id', $oldBorrowed->id)
            ->assertJsonPath('filter_options.years', [2025, 2021, 2018]);

        // Year exact + range filters
        $this->getJson('/api/bmn/assets?tahun=2021')->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.id', $oldBorrowed->id);
        $this->getJson('/api/bmn/assets?tahun_from=2018&tahun_to=2022')->assertOk()->assertJsonCount(2, 'data');

        // Modified preset + custom range
        $this->getJson('/api/bmn/assets?modified_preset=today')->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.id', $recentPhoto->id);
        $this->getJson('/api/bmn/assets?modified_preset=7d')->assertOk()->assertJsonCount(2, 'data');
        $from = now()->subDays(13)->toDateString();
        $to = now()->subDays(10)->toDateString();
        $this->getJson("/api/bmn/assets?modified_from={$from}&modified_to={$to}&modified_from_invalid=skip")
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $oldBorrowed->id);

        // Photo & loan status filters
        $this->getJson('/api/bmn/assets?photo_status=with_photo')->assertOk()->assertJsonCount(2, 'data');
        $this->getJson('/api/bmn/assets?photo_status=without_photo')->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.id', $noPhoto->id);
        $this->getJson('/api/bmn/assets?loan_status=borrowed')->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.id', $oldBorrowed->id);
        $this->getJson('/api/bmn/assets?loan_status=available')->assertOk()->assertJsonCount(2, 'data');

        // Sort year_asc & export passes filters cleanly without error
        $this->getJson('/api/bmn/assets?sort=year_asc')->assertOk()->assertJsonPath('data.0.id', $noPhoto->id);
        $exportRows = (new \App\Modules\Bmn\Exports\AssetExport(true, [
            'tahun_from' => '2020',
            'photo_status' => 'with_photo',
            'loan_status' => 'borrowed',
        ]))->collection();
        $this->assertCount(1, $exportRows);
        $this->assertSame($oldBorrowed->id, $exportRows->first()->id);
        $this->get('/api/bmn/assets/export?tahun=2025&photo_status=with_photo')->assertOk();
    }
}
