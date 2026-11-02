<?php

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Surat\Models\SuratMasuk;
use App\Modules\Surat\Models\SuratKeluar;
use App\Modules\Surat\Models\SuratDisposisi;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SuratModuleTest extends TestCase
{
    use RefreshDatabase;

    protected User $adminUser;
    protected User $regularUser;

    protected function setUp(): void
    {
        parent::setUp();
        $this->adminUser = User::factory()->create([
            'username' => 'admin_surat',
            'role' => 'admin',
            'access_modules' => ['surat'],
        ]);

        $this->regularUser = User::factory()->create([
            'username' => 'staff_surat',
            'role' => 'pegawai',
            'access_modules' => ['surat'],
        ]);
    }

    public function test_can_list_surat_masuk(): void
    {
        SuratMasuk::create([
            'no_agenda' => '1000',
            'tanggal_agenda' => '2026-07-23',
            'no_surat' => 'S.100/2026',
            'isi_ringkas' => 'Undangan Rapat',
            'asal_surat' => 'Dirjen KSDAE',
            'created_by' => $this->adminUser->id,
        ]);

        $response = $this->actingAs($this->regularUser)
            ->getJson('/api/surat/surat-masuk');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data',
                'meta' => ['current_page', 'last_page', 'per_page', 'total'],
            ])
            ->assertJsonCount(1, 'data');
    }

    public function test_can_list_surat_masuk_with_pagination(): void
    {
        SuratMasuk::create([
            'no_agenda' => '1002',
            'tanggal_agenda' => '2026-07-24',
            'no_surat' => 'S.102/2026',
            'isi_ringkas' => 'Surat Paginasi',
            'asal_surat' => 'Dirjen',
            'created_by' => $this->adminUser->id,
        ]);

        $response = $this->actingAs($this->regularUser)
            ->getJson('/api/surat/surat-masuk?per_page=10');

        $response->assertStatus(200)
            ->assertJsonPath('meta.per_page', 10);
    }

    public function test_regular_user_cannot_export_excel(): void
    {
        $response = $this->actingAs($this->regularUser)
            ->get('/api/surat/surat-masuk/export/excel');

        $response->assertStatus(403);
    }

    public function test_regular_user_cannot_create_surat_masuk(): void
    {
        $payload = [
            'no_agenda' => '999',
            'tanggal_agenda' => '2026-07-23',
            'no_surat' => 'S.999/2026',
            'isi_ringkas' => 'Unauthorized Surat',
        ];

        $response = $this->actingAs($this->regularUser)
            ->postJson('/api/surat/surat-masuk', $payload);

        $response->assertStatus(403);
    }

    public function test_admin_can_create_surat_masuk_with_disposisi(): void
    {
        $payload = [
            'no_agenda' => '1001',
            'tanggal_agenda' => '2026-07-23',
            'no_surat' => 'S.101/2026',
            'isi_ringkas' => 'Laporan Konservasi',
            'asal_surat' => 'Balai KSDA Jatim',
            'sifat_json' => ['Penting'],
            'disposisi' => [
                'catatan' => 'Segera tindaklanjuti',
            ],
        ];

        $response = $this->actingAs($this->adminUser)
            ->postJson('/api/surat/surat-masuk', $payload);

        $response->assertStatus(201)
            ->assertJsonPath('data.no_agenda', '1001');

        $this->assertDatabaseHas('surat_masuk', [
            'no_agenda' => '1001',
        ]);
        $this->assertDatabaseHas('surat_disposisi', [
            'catatan' => 'Segera tindaklanjuti',
        ]);
    }

    public function test_cannot_create_duplicate_no_agenda(): void
    {
        SuratMasuk::create([
            'no_agenda' => '1050',
            'tanggal_agenda' => '2026-07-23',
            'no_surat' => 'S.1050/2026',
            'isi_ringkas' => 'Surat Pertama',
            'created_by' => $this->adminUser->id,
        ]);

        $payload = [
            'no_agenda' => '1050', // Duplikat
            'tanggal_agenda' => '2026-07-24',
            'no_surat' => 'S.1051/2026',
            'isi_ringkas' => 'Surat Kedua Yang Mencoba Menimpa',
        ];

        $response = $this->actingAs($this->adminUser)
            ->postJson('/api/surat/surat-masuk', $payload);

        // Wajib menolak dengan 422 Unprocessable Content, bukan menimpa surat pertama
        $response->assertStatus(422)
            ->assertJsonValidationErrors(['no_agenda']);

        // Data pertama tetap utuh
        $this->assertDatabaseHas('surat_masuk', [
            'no_agenda' => '1050',
            'isi_ringkas' => 'Surat Pertama',
        ]);
    }

    public function test_next_agenda_endpoint(): void
    {
        SuratMasuk::create([
            'no_agenda' => '1099',
            'tanggal_agenda' => '2026-07-23',
            'no_surat' => 'S.1099/2026',
            'created_by' => $this->adminUser->id,
        ]);

        $response = $this->actingAs($this->regularUser)
            ->getJson('/api/surat/surat-masuk/next-agenda?year=2026');

        $response->assertStatus(200)
            ->assertJsonPath('next_agenda', '1100');
    }

    public function test_cascading_soft_delete_disposisi(): void
    {
        $surat = SuratMasuk::create([
            'no_agenda' => '1088',
            'tanggal_agenda' => '2026-07-23',
            'no_surat' => 'S.1088/2026',
            'created_by' => $this->adminUser->id,
        ]);

        $disposisi = SuratDisposisi::create([
            'surat_masuk_id' => $surat->id,
            'catatan' => 'Catatan Disposisi Cascase',
        ]);

        $response = $this->actingAs($this->adminUser)
            ->deleteJson("/api/surat/surat-masuk/{$surat->id}");

        $response->assertStatus(200);

        // Keduanya wajib ter-soft-delete
        $this->assertSoftDeleted('surat_masuk', ['id' => $surat->id]);
        $this->assertSoftDeleted('surat_disposisi', ['id' => $disposisi->id]);
    }

    public function test_admin_can_create_surat_keluar(): void
    {
        $payload = [
            'no_surat' => 'S.500/K.18/TU/2026',
            'tanggal_surat' => '2026-07-23',
            'tujuan_surat' => 'Kepala BBKSDA Jatim',
            'perihal' => 'Koordinasi Data',
            'sifat' => 'Biasa',
        ];

        $response = $this->actingAs($this->adminUser)
            ->postJson('/api/surat/surat-keluar', $payload);

        $response->assertStatus(201)
            ->assertJsonPath('data.no_surat', 'S.500/K.18/TU/2026');

        $this->assertDatabaseHas('surat_keluar', [
            'no_surat' => 'S.500/K.18/TU/2026',
        ]);
    }
}
