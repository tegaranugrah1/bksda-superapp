<?php

namespace Tests\Feature\Bmn;

use App\Models\User;
use App\Modules\Bmn\Models\Asset;
use App\Modules\Bmn\Models\AuctionBatch;
use App\Modules\Bmn\Models\AssetAuctionBatch;
use App\Modules\Bmn\Enums\AuctionBatchStatus;
use App\Modules\Bmn\Enums\AuctionAssetFinalResult;
use App\Modules\Bmn\Support\AuctionBatchEventAction;
use App\Modules\Bmn\Services\AuctionAssetDocumentReadinessService;
use App\Modules\Bmn\Services\AuctionBatchDocumentWorkflow;
use App\Modules\Bmn\Services\AuctionBatchValidityService;
use App\Modules\Kepegawaian\Models\Employee;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AuctionBatchTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private Employee $kepalaBalai;
    private Employee $panitiaMember;
    private Employee $timPenilaiMember;
    private Employee $pemeriksaMember;

    protected function setUp(): void
    {
        parent::setUp();

        // Create signers
        $this->kepalaBalai = Employee::create([
            'nip' => '1234567890',
            'nama_lengkap' => 'M. Ari Wibawanto',
            'jabatan' => 'Kepala Balai',
            'pangkat_golongan' => 'IV/a',
            'satuan_kerja' => 'Balai',
            'is_active' => true,
        ]);

        $this->panitiaMember = Employee::create([
            'nip' => '1111111111',
            'nama_lengkap' => 'Panitia Satu',
            'jabatan' => 'Staff',
            'is_active' => true,
        ]);

        $this->timPenilaiMember = Employee::create([
            'nip' => '2222222222',
            'nama_lengkap' => 'Penilai Satu',
            'jabatan' => 'Staff',
            'is_active' => true,
        ]);

        $this->pemeriksaMember = Employee::create([
            'nip' => '3333333333',
            'nama_lengkap' => 'Pemeriksa Satu',
            'jabatan' => 'Staff',
            'is_active' => true,
        ]);

        // Create BMN admin user
        $this->admin = User::create([
            'name' => 'BMN Admin',
            'username' => 'bmn_admin',
            'email' => 'bmn@test.com',
            'password' => bcrypt('password'),
            'role' => 'admin',
            'access_modules' => ['bmn'],
            'permissions' => [
                'bmn.view',
                'bmn.auction.view',
                'bmn.auction.create',
                'bmn.auction.update',
                'bmn.auction.delete',
                'bmn.auction.print',
                'bmn.auction.finalize',
            ],
            'is_active' => true,
        ]);

        Sanctum::actingAs($this->admin);
    }

    private function createAsset(array $overrides = []): Asset
    {
        return Asset::create(array_merge([
            'jenis_bmn' => 'Peralatan dan Mesin',
            'kode_barang' => '3.02.01.01.002',
            'nup' => '10',
            'nup_lama' => '10',
            'nama_barang' => 'Sepeda Motor Suzuki',
            'kondisi' => 'Rusak Berat',
            'status_penggunaan' => 'Digunakan Untuk Dinas',
            'henti_guna' => false,
            'nilai_perolehan' => 15000000.00,
            'nilai_buku' => 100000.00,
            'no_polisi' => 'KT 1234 AB',
            'no_stnk' => '12345678',
            'no_bpkp' => 'BPKB-123',
            'no_mesin' => 'MESIN-123',
            'no_rangka' => 'RANGKA-123',
        ], $overrides));
    }

    public function test_can_create_draft_batch(): void
    {
        $response = $this->postJson('/api/bmn/auction-batches', [
            'name' => 'Batch Lelang Tahap I 2026',
        ]);

        $response->assertStatus(201);
        $response->assertJsonPath('data.status', 'DRAFT');
        $response->assertJsonPath('data.is_read_only', false);

        $this->assertDatabaseHas('bmn_auction_batches', [
            'name' => 'Batch Lelang Tahap I 2026',
            'status' => 'DRAFT',
        ]);
    }

    public function test_can_add_rusak_berat_asset_to_draft_batch(): void
    {
        $batch = AuctionBatch::create([
            'batch_number' => 'LE-20260622-0001',
            'name' => 'Batch I',
            'status' => AuctionBatchStatus::DRAFT,
        ]);

        $asset = $this->createAsset();

        $response = $this->postJson("/api/bmn/auction-batches/{$batch->id}/assets", [
            'asset_ids' => [$asset->id],
        ]);

        $response->assertStatus(200);
        $this->assertDatabaseHas('bmn_asset_auction_batch', [
            'bmn_auction_batch_id' => $batch->id,
            'bmn_asset_id' => $asset->id,
        ]);
    }

    public function test_cannot_add_same_asset_to_another_active_batch(): void
    {
        $batch1 = AuctionBatch::create([
            'batch_number' => 'LE-20260622-0001',
            'name' => 'Batch I',
            'status' => AuctionBatchStatus::DRAFT,
        ]);

        $batch2 = AuctionBatch::create([
            'batch_number' => 'LE-20260622-0002',
            'name' => 'Batch II',
            'status' => AuctionBatchStatus::DRAFT,
        ]);

        $asset = $this->createAsset();

        // Add to batch1
        $this->postJson("/api/bmn/auction-batches/{$batch1->id}/assets", [
            'asset_ids' => [$asset->id],
        ])->assertStatus(200);

        // Try adding to batch2 (should fail)
        $response = $this->postJson("/api/bmn/auction-batches/{$batch2->id}/assets", [
            'asset_ids' => [$asset->id],
        ]);

        $response->assertStatus(422);
    }

    public function test_can_update_lot_and_nilai_taksiran_in_draft(): void
    {
        $batch = AuctionBatch::create([
            'batch_number' => 'LE-20260622-0001',
            'name' => 'Batch I',
            'status' => AuctionBatchStatus::DRAFT,
        ]);

        $asset = $this->createAsset();
        $batch->assets()->attach($asset->id, ['id' => \Illuminate\Support\Str::uuid()]);

        $response = $this->putJson("/api/bmn/auction-batches/{$batch->id}/assets/{$asset->id}/valuation", [
            'lot_number' => 'LOT-01',
            'nilai_taksiran' => 5000000,
            'kertas_kerja_data' => ['bobot' => 'tinggi'],
        ]);

        $response->assertStatus(200);
        $this->assertDatabaseHas('bmn_asset_auction_batch', [
            'bmn_auction_batch_id' => $batch->id,
            'bmn_asset_id' => $asset->id,
            'lot_number' => 'LOT-01',
            'nilai_taksiran' => 5000000,
        ]);
    }

    public function test_cannot_update_lot_after_diajukan(): void
    {
        $batch = AuctionBatch::create([
            'batch_number' => 'LE-20260622-0001',
            'name' => 'Batch I',
            'status' => AuctionBatchStatus::DIAJUKAN,
        ]);

        $asset = $this->createAsset();
        $batch->assets()->attach($asset->id, ['id' => \Illuminate\Support\Str::uuid()]);

        $response = $this->putJson("/api/bmn/auction-batches/{$batch->id}/assets/{$asset->id}/valuation", [
            'lot_number' => 'LOT-01',
            'nilai_taksiran' => 5000000,
        ]);

        $response->assertStatus(422);
    }

    public function test_document_workflow_registry_matches_srikandi_sequence(): void
    {
        $workflow = app(AuctionBatchDocumentWorkflow::class);
        $keys = $workflow->keys();

        $this->assertSame('sk_penghentian', $keys[0]);
        $this->assertSame('ba_koreksi', $keys[1]);
        $this->assertSame('sk_panitia_penaksir_harga', $keys[8]);
        $this->assertSame('nilai_taksiran', $keys[9]);
        $this->assertSame('nota_dinas_ksdae', $keys[11]);
        $this->assertTrue($workflow->get('sk_panitia_penaksir_harga')['required_for_valuation']);
        $this->assertTrue($workflow->get('nota_dinas_ksdae')['requires_valuation']);
    }

    public function test_can_update_draft_metadata_on_draft_batch(): void
    {
        $batch = AuctionBatch::create([
            'batch_number' => 'LE-20260622-0001',
            'name' => 'Batch I',
            'status' => AuctionBatchStatus::DRAFT,
            'metadata' => [
                'custom_key' => 'keep-me',
                'document_numbers' => [
                    'existing' => 'EX-001',
                ],
                'signatories_raw' => [
                    'panitia' => ['old-member'],
                ],
            ],
        ]);

        $response = $this->patchJson("/api/bmn/auction-batches/{$batch->id}/draft-metadata", [
            'kepala_balai_id' => $this->kepalaBalai->id,
            'signatories' => [
                'panitia' => [$this->panitiaMember->id],
                'tim_penilai' => [$this->timPenilaiMember->id],
            ],
            'document_numbers' => [
                'nota_dinas' => 'ND-001/BMN',
            ],
            'document_dates' => [
                'nota_dinas' => '2026-06-24',
            ],
            'workflow' => [
                'documents' => [
                    'sk_penghentian' => [
                        'status' => 'completed',
                        'notes' => 'Sudah terbit di Srikandi',
                    ],
                    'nota_dinas_ksdae' => [
                        'status' => 'prepared',
                    ],
                ],
            ],
        ]);

        $response->assertStatus(200);

        $batch->refresh();
        $metadata = $batch->metadata;

        $this->assertSame($this->kepalaBalai->id, $batch->kepala_balai_id);
        $this->assertSame('keep-me', $metadata['custom_key']);
        $this->assertSame('EX-001', $metadata['document_numbers']['existing']);
        $this->assertSame('ND-001/BMN', $metadata['document_numbers']['nota_dinas']);
        $this->assertSame([$this->panitiaMember->id], $metadata['signatories_raw']['panitia']);
        $this->assertSame([$this->timPenilaiMember->id], $metadata['signatories_raw']['tim_penilai']);
        $this->assertSame('completed', $metadata['workflow']['documents']['sk_penghentian']['status']);
        $this->assertSame('Penghentian Penggunaan BMN', $metadata['workflow']['documents']['sk_penghentian']['title']);
        $this->assertSame('prepared', $metadata['workflow']['documents']['nota_dinas_ksdae']['status']);

        $this->assertDatabaseHas('bmn_auction_batch_events', [
            'bmn_auction_batch_id' => $batch->id,
            'action' => AuctionBatchEventAction::DRAFT_METADATA_UPDATED,
        ]);
    }

    public function test_cannot_update_draft_metadata_after_diajukan(): void
    {
        $batch = AuctionBatch::create([
            'batch_number' => 'LE-20260622-0001',
            'name' => 'Batch I',
            'status' => AuctionBatchStatus::DIAJUKAN,
        ]);

        $response = $this->patchJson("/api/bmn/auction-batches/{$batch->id}/draft-metadata", [
            'document_numbers' => [
                'nota_dinas' => 'ND-001/BMN',
            ],
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors('status');
    }

    public function test_draft_metadata_rejects_invalid_workflow_document_key(): void
    {
        $batch = AuctionBatch::create([
            'batch_number' => 'LE-20260622-0001',
            'name' => 'Batch I',
            'status' => AuctionBatchStatus::DRAFT,
        ]);

        $response = $this->patchJson("/api/bmn/auction-batches/{$batch->id}/draft-metadata", [
            'workflow' => [
                'documents' => [
                    'dokumen_ngawur' => [
                        'status' => 'completed',
                    ],
                ],
            ],
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors('workflow.documents');
    }

    public function test_cannot_lock_incomplete_batch(): void
    {
        $batch = AuctionBatch::create([
            'batch_number' => 'LE-20260622-0001',
            'name' => 'Batch I',
            'status' => AuctionBatchStatus::DRAFT,
        ]);

        $response = $this->postJson("/api/bmn/auction-batches/{$batch->id}/transition", [
            'status' => 'DIAJUKAN',
        ]);

        $response->assertStatus(422);
    }

    public function test_can_lock_complete_batch_to_diajukan_and_freeze_asset(): void
    {
        $batch = AuctionBatch::create([
            'batch_number' => 'LE-20260622-0001',
            'name' => 'Batch I',
            'status' => AuctionBatchStatus::DRAFT,
        ]);

        $asset = $this->createAsset();
        $batch->assets()->attach($asset->id, [
            'id' => \Illuminate\Support\Str::uuid(),
            'lot_number' => 'LOT-01',
            'nilai_taksiran' => 5000000,
        ]);

        $response = $this->postJson("/api/bmn/auction-batches/{$batch->id}/transition", [
            'status' => 'DIAJUKAN',
            'kepala_balai_id' => $this->kepalaBalai->id,
            'signatories' => [
                'panitia' => [$this->panitiaMember->id],
                'tim_penilai' => [$this->timPenilaiMember->id],
                'pemeriksa' => [$this->pemeriksaMember->id],
            ],
            'document_numbers' => [
                'surat_tugas' => 'ST/001/BMN',
            ],
            'document_dates' => [
                'surat_tugas' => '2026-06-22',
            ],
        ]);

        $response->assertStatus(200);
        $this->assertEquals(AuctionBatchStatus::DIAJUKAN->value, $response->json('data.status'));

        // Verify asset is frozen
        $asset->refresh();
        $this->assertTrue((bool)$asset->henti_guna);
        $this->assertEquals('Dihentikan dari Penggunaan Dinas', $asset->status_penggunaan);
    }

    public function test_can_record_schedule_to_jadwal_ditetapkan(): void
    {
        $batch = AuctionBatch::create([
            'batch_number' => 'LE-20260622-0001',
            'name' => 'Batch I',
            'status' => AuctionBatchStatus::DIAJUKAN,
            'kepala_balai_id' => $this->kepalaBalai->id,
        ]);

        $response = $this->postJson("/api/bmn/auction-batches/{$batch->id}/transition", [
            'status' => 'JADWAL_DITETAPKAN',
            'no_surat_persetujuan' => 'S-123/MK/2026',
            'tanggal_surat_persetujuan' => '2026-06-22',
            'no_surat_penetapan' => 'S-456/KPKNL/2026',
            'tanggal_lelang' => '2026-07-22',
        ]);

        $response->assertStatus(200);
        $this->assertEquals(AuctionBatchStatus::JADWAL_DITETAPKAN->value, $response->json('data.status'));
        $this->assertEquals('S-123/MK/2026', $response->json('data.no_surat_persetujuan'));
    }

    public function test_can_record_first_auction_result(): void
    {
        $batch = AuctionBatch::create([
            'batch_number' => 'LE-20260622-0001',
            'name' => 'Batch I',
            'status' => AuctionBatchStatus::JADWAL_DITETAPKAN,
            'tanggal_lelang' => '2026-07-22',
        ]);

        $asset = $this->createAsset();
        $batch->assets()->attach($asset->id, [
            'id' => \Illuminate\Support\Str::uuid(),
            'lot_number' => 'LOT-01',
            'nilai_taksiran' => 5000000,
        ]);

        $response = $this->postJson("/api/bmn/auction-batches/{$batch->id}/first-auction-results", [
            'assets' => [
                [
                    'bmn_asset_id' => $asset->id,
                    'first_auction_is_sold' => true,
                    'first_auction_price' => 6000000,
                ],
            ],
        ]);

        $response->assertStatus(200);
        $this->assertDatabaseHas('bmn_asset_auction_batch', [
            'bmn_auction_batch_id' => $batch->id,
            'bmn_asset_id' => $asset->id,
            'first_auction_is_sold' => true,
            'first_auction_price' => 6000000,
        ]);
    }

    public function test_cannot_start_lelang_ulang_if_all_assets_sold(): void
    {
        $batch = AuctionBatch::create([
            'batch_number' => 'LE-20260622-0001',
            'name' => 'Batch I',
            'status' => AuctionBatchStatus::JADWAL_DITETAPKAN,
            'tanggal_lelang' => '2026-07-22',
        ]);

        $asset = $this->createAsset();
        $batch->assets()->attach($asset->id, [
            'id' => \Illuminate\Support\Str::uuid(),
            'first_auction_is_sold' => true,
            'first_auction_price' => 6000000,
        ]);

        $response = $this->postJson("/api/bmn/auction-batches/{$batch->id}/transition", [
            'status' => 'LELANG_ULANG',
            'no_surat_jadwal_ulang' => 'S-REP/2026',
            'tanggal_lelang_ulang' => '2026-08-22',
        ]);

        $response->assertStatus(422);
    }

    public function test_can_start_lelang_ulang_if_at_least_one_asset_unsold(): void
    {
        $batch = AuctionBatch::create([
            'batch_number' => 'LE-20260622-0001',
            'name' => 'Batch I',
            'status' => AuctionBatchStatus::JADWAL_DITETAPKAN,
            'tanggal_lelang' => '2026-07-22',
        ]);

        $asset = $this->createAsset();
        $batch->assets()->attach($asset->id, [
            'id' => \Illuminate\Support\Str::uuid(),
            'first_auction_is_sold' => false,
        ]);

        $response = $this->postJson("/api/bmn/auction-batches/{$batch->id}/transition", [
            'status' => 'LELANG_ULANG',
            'no_surat_jadwal_ulang' => 'S-REP/2026',
            'tanggal_lelang_ulang' => '2026-08-22',
        ]);

        $response->assertStatus(200);
        $this->assertEquals(AuctionBatchStatus::LELANG_ULANG->value, $response->json('data.status'));
    }

    public function test_cannot_start_second_lelang_ulang(): void
    {
        $batch = AuctionBatch::create([
            'batch_number' => 'LE-20260622-0001',
            'name' => 'Batch I',
            'status' => AuctionBatchStatus::LELANG_ULANG,
            'reauction_count' => 1,
        ]);

        $response = $this->postJson("/api/bmn/auction-batches/{$batch->id}/transition", [
            'status' => 'LELANG_ULANG',
            'no_surat_jadwal_ulang' => 'S-REP-2/2026',
            'tanggal_lelang_ulang' => '2026-09-22',
        ]);

        $response->assertStatus(422);
    }

    public function test_can_record_reauction_result(): void
    {
        $batch = AuctionBatch::create([
            'batch_number' => 'LE-20260622-0001',
            'name' => 'Batch I',
            'status' => AuctionBatchStatus::LELANG_ULANG,
            'tanggal_lelang_ulang' => '2026-08-22',
        ]);

        $asset = $this->createAsset();
        $batch->assets()->attach($asset->id, [
            'id' => \Illuminate\Support\Str::uuid(),
            'first_auction_is_sold' => false,
        ]);

        $response = $this->postJson("/api/bmn/auction-batches/{$batch->id}/reauction-results", [
            'assets' => [
                [
                    'bmn_asset_id' => $asset->id,
                    'reauction_is_sold' => true,
                    'reauction_price' => 4500000,
                ],
            ],
        ]);

        $response->assertStatus(200);
        $this->assertDatabaseHas('bmn_asset_auction_batch', [
            'bmn_auction_batch_id' => $batch->id,
            'bmn_asset_id' => $asset->id,
            'reauction_is_sold' => true,
            'reauction_price' => 4500000,
        ]);
    }

    public function test_realization_disposes_sold_assets_and_restores_unsold_assets(): void
    {
        $batch = AuctionBatch::create([
            'batch_number' => 'LE-20260622-0001',
            'name' => 'Batch I',
            'status' => AuctionBatchStatus::JADWAL_DITETAPKAN,
            'tanggal_lelang' => '2026-07-22',
        ]);

        $assetSold = $this->createAsset(['nup' => '11']);
        $assetUnsold = $this->createAsset(['nup' => '12']);

        $batch->assets()->attach($assetSold->id, [
            'id' => \Illuminate\Support\Str::uuid(),
            'lot_number' => 'LOT-01',
            'nilai_taksiran' => 5000000,
            'first_auction_is_sold' => true,
            'first_auction_price' => 5500000,
            'freeze_snapshot' => json_encode(['schema_version' => 1, 'previous_status_penggunaan' => 'Digunakan Untuk Dinas', 'previous_henti_guna' => false]),
        ]);

        $batch->assets()->attach($assetUnsold->id, [
            'id' => \Illuminate\Support\Str::uuid(),
            'lot_number' => 'LOT-02',
            'nilai_taksiran' => 4000000,
            'first_auction_is_sold' => false,
            'freeze_snapshot' => json_encode(['schema_version' => 1, 'previous_status_penggunaan' => 'Digunakan Untuk Dinas', 'previous_henti_guna' => false]),
        ]);

        // Freeze them first
        $assetSold->henti_guna = true;
        $assetSold->status_penggunaan = 'Dihentikan dari Penggunaan Dinas';
        $assetSold->save();

        $assetUnsold->henti_guna = true;
        $assetUnsold->status_penggunaan = 'Dihentikan dari Penggunaan Dinas';
        $assetUnsold->save();

        $response = $this->postJson("/api/bmn/auction-batches/{$batch->id}/transition", [
            'status' => 'REALISASI',
        ]);

        $response->assertStatus(200);

        // Sold asset must be soft-deleted
        $this->assertSoftDeleted('bmn_assets', ['id' => $assetSold->id]);

        // Unsold asset must be restored
        $assetUnsold->refresh();
        $this->assertFalse((bool)$assetUnsold->henti_guna);
        $this->assertEquals('Digunakan Untuk Dinas', $assetUnsold->status_penggunaan);
    }

    public function test_cancel_restores_frozen_assets(): void
    {
        $batch = AuctionBatch::create([
            'batch_number' => 'LE-20260622-0001',
            'name' => 'Batch I',
            'status' => AuctionBatchStatus::DIAJUKAN,
        ]);

        $asset = $this->createAsset();
        $batch->assets()->attach($asset->id, [
            'id' => \Illuminate\Support\Str::uuid(),
            'freeze_snapshot' => json_encode(['schema_version' => 1, 'previous_status_penggunaan' => 'Digunakan Untuk Dinas', 'previous_henti_guna' => false]),
        ]);

        // Freeze
        $asset->henti_guna = true;
        $asset->status_penggunaan = 'Dihentikan dari Penggunaan Dinas';
        $asset->save();

        $response = $this->postJson("/api/bmn/auction-batches/{$batch->id}/transition", [
            'status' => 'BATAL',
            'notes' => 'Dibatalkan karena kondisi teknis',
        ]);

        $response->assertStatus(200);

        // Verify restored
        $asset->refresh();
        $this->assertFalse((bool)$asset->henti_guna);
        $this->assertEquals('Digunakan Untuk Dinas', $asset->status_penggunaan);
    }

    public function test_realisasi_batch_is_read_only(): void
    {
        $batch = AuctionBatch::create([
            'batch_number' => 'LE-20260622-0001',
            'name' => 'Batch I',
            'status' => AuctionBatchStatus::REALISASI,
        ]);

        $response = $this->postJson("/api/bmn/auction-batches/{$batch->id}/transition", [
            'status' => 'BATAL',
        ]);

        $response->assertStatus(422);
    }

    public function test_batal_batch_is_read_only(): void
    {
        $batch = AuctionBatch::create([
            'batch_number' => 'LE-20260622-0001',
            'name' => 'Batch I',
            'status' => AuctionBatchStatus::BATAL,
        ]);

        $response = $this->postJson("/api/bmn/auction-batches/{$batch->id}/transition", [
            'status' => 'REALISASI',
        ]);

        $response->assertStatus(422);
    }

    public function test_audit_events_are_created_for_key_actions(): void
    {
        $batch = AuctionBatch::create([
            'batch_number' => 'LE-20260622-0001',
            'name' => 'Batch I',
            'status' => AuctionBatchStatus::DRAFT,
        ]);

        $asset = $this->createAsset();

        // 1. Add asset
        $this->postJson("/api/bmn/auction-batches/{$batch->id}/assets", [
            'asset_ids' => [$asset->id],
        ])->assertStatus(200);

        $this->assertDatabaseHas('bmn_auction_batch_events', [
            'bmn_auction_batch_id' => $batch->id,
            'bmn_asset_id' => $asset->id,
            'action' => AuctionBatchEventAction::ASSET_ADDED,
        ]);
    }

    public function test_metadata_builder_freezes_signatory_fields(): void
    {
        $batch = AuctionBatch::create([
            'batch_number' => 'LE-20260622-0001',
            'name' => 'Batch I',
            'status' => AuctionBatchStatus::DRAFT,
        ]);

        $asset = $this->createAsset();
        $batch->assets()->attach($asset->id, [
            'id' => \Illuminate\Support\Str::uuid(),
            'lot_number' => 'LOT-01',
            'nilai_taksiran' => 5000000,
        ]);

        $this->postJson("/api/bmn/auction-batches/{$batch->id}/transition", [
            'status' => 'DIAJUKAN',
            'kepala_balai_id' => $this->kepalaBalai->id,
            'signatories' => [
                'panitia' => [$this->panitiaMember->id],
                'tim_penilai' => [$this->timPenilaiMember->id],
                'pemeriksa' => [$this->pemeriksaMember->id],
            ],
            'document_numbers' => [
                'surat_tugas' => 'ST/001/BMN',
            ],
            'document_dates' => [
                'surat_tugas' => '2026-06-22',
            ],
        ])->assertStatus(200);

        $batch->refresh();
        $metadata = $batch->metadata;

        $this->assertEquals(1, $metadata['schema_version']);
        $this->assertEquals('M. Ari Wibawanto', $metadata['signatories']['kepala_balai']['nama']);
        $this->assertEquals('Panitia Satu', $metadata['committees']['panitia_penghapusan'][0]['nama']);
    }

    public function test_document_readiness_service(): void
    {
        $service = app(AuctionAssetDocumentReadinessService::class);

        // 1. Incomplete vehicle
        $assetVehicleIncomplete = $this->createAsset([
            'no_bpkp' => null,
        ]);

        $eval = $service->evaluate($assetVehicleIncomplete);
        $this->assertEquals('vehicle', $eval['asset_type']);
        $this->assertTrue($eval['requires_document_review']);
        $this->assertEquals('warning', $eval['items']['bpkb']);

        // 2. Non-vehicle
        $assetNonVehicle = Asset::create([
            'jenis_bmn' => 'Gedung dan Bangunan',
            'kode_barang' => '4.01.01.01.001',
            'nup' => '1',
            'nama_barang' => 'Kantor Balai',
            'kondisi' => 'Rusak Berat',
        ]);

        $evalNon = $service->evaluate($assetNonVehicle);
        $this->assertEquals('general', $evalNon['asset_type']);
        $this->assertFalse($evalNon['requires_document_review']);
    }

    public function test_validity_service_approval_review_warning(): void
    {
        $service = app(AuctionBatchValidityService::class);

        // 1. Inside window
        $batch = AuctionBatch::create([
            'batch_number' => 'LE-1',
            'name' => 'Batch 1',
            'status' => AuctionBatchStatus::DIAJUKAN,
            'tanggal_surat_persetujuan' => now()->toDateString(),
        ]);

        $warning = $service->approvalReviewWarning($batch);
        $this->assertFalse($warning['requires_revaluation_review']);

        // 2. Outside window (7 months ago)
        $batchOld = AuctionBatch::create([
            'batch_number' => 'LE-2',
            'name' => 'Batch 2',
            'status' => AuctionBatchStatus::DIAJUKAN,
            'tanggal_surat_persetujuan' => now()->subMonths(7)->toDateString(),
        ]);

        $warningOld = $service->approvalReviewWarning($batchOld);
        $this->assertTrue($warningOld['requires_revaluation_review']);
        $this->assertNotNull($warningOld['message']);
    }
}
