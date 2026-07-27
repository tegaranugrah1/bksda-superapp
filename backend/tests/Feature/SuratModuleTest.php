<?php

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Surat\Models\SuratMasuk;
use App\Modules\Surat\Models\SuratKeluar;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SuratModuleTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->user = User::factory()->create([
            'username' => 'testuser',
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
            'created_by' => $this->user->id,
        ]);

        $response = $this->actingAs($this->user)
            ->getJson('/api/surat/surat-masuk');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data',
                'meta' => ['current_page', 'last_page', 'per_page', 'total'],
            ])
            ->assertJsonCount(1, 'data');
    }

    public function test_can_list_surat_masuk_with_per_page_all(): void
    {
        SuratMasuk::create([
            'no_agenda' => '1002',
            'tanggal_agenda' => '2026-07-24',
            'no_surat' => 'S.102/2026',
            'isi_ringkas' => 'Surat All',
            'asal_surat' => 'Dirjen',
            'created_by' => $this->user->id,
        ]);

        $response = $this->actingAs($this->user)
            ->getJson('/api/surat/surat-masuk?per_page=all');

        $response->assertStatus(200)
            ->assertJsonPath('meta.per_page', 'all');
    }

    public function test_can_create_surat_masuk_with_disposisi(): void
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

        $response = $this->actingAs($this->user)
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

    public function test_can_create_surat_keluar(): void
    {
        $payload = [
            'no_surat' => 'S.500/K.18/TU/2026',
            'tanggal_surat' => '2026-07-23',
            'tujuan_surat' => 'Kepala BBKSDA Jatim',
            'perihal' => 'Koordinasi Data',
            'sifat' => 'Biasa',
        ];

        $response = $this->actingAs($this->user)
            ->postJson('/api/surat/surat-keluar', $payload);

        $response->assertStatus(201)
            ->assertJsonPath('data.no_surat', 'S.500/K.18/TU/2026');

        $this->assertDatabaseHas('surat_keluar', [
            'no_surat' => 'S.500/K.18/TU/2026',
        ]);
    }
}
