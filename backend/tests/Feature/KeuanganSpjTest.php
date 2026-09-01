<?php

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Keuangan\Models\Spj;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class KeuanganSpjTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->user = User::factory()->create([
            'username' => 'testadmin_' . uniqid(),
            'role' => 'admin',
            'access_modules' => ['keuangan'],
        ]);
        Sanctum::actingAs($this->user);
    }

    public function test_can_create_spj_and_calculate_total(): void
    {
        $payload = [
            'nama_kegiatan' => 'Operasionalisasi SMART Patrol di KSA, KPA dan TB',
            'tipe_anggaran' => 'FOLU',
            'nomor_spt' => 'ST.685/K.18/TU/FOLU-NC-23/KSA.02.01/B/07/2026',
            'sumber_dana' => 'FOLU-NC-23',
            'kode_awp' => 'C.1.1.2.01',
            'asal' => 'Samarinda',
            'tujuan' => 'Kabupaten Kutai Barat',
            'tanggal_mulai' => '2026-07-10',
            'tanggal_selesai' => '2026-07-17',
            'pejabat_ppk' => [
                'name' => 'Ahmad Hidayat, S.PKP., M.Ling',
                'nik' => '19820301 200012 1 001',
            ],
            'recipients' => [
                [
                    'id' => 'emp-1',
                    'name' => 'Didi Susanto, S.Si.',
                    'type' => 'pegawai',
                    'description' => 'Perjalanan dinas ke Kutai Barat',
                    'amount' => 5590000,
                ],
                [
                    'id' => 'emp-2',
                    'name' => 'Tegar Anugrah, A.md.Kom.',
                    'type' => 'pegawai',
                    'description' => 'Perjalanan dinas ke Kutai Barat',
                    'amount' => 3590000,
                ],
            ],
            'status' => 'Diajukan',
        ];

        $response = $this->postJson('/api/keuangan/spj', $payload);

        $response->assertStatus(201)
            ->assertJsonPath('status', 'success')
            ->assertJsonPath('data.nama_kegiatan', 'Operasionalisasi SMART Patrol di KSA, KPA dan TB')
            ->assertJsonPath('data.tipe_anggaran', 'FOLU')
            ->assertJsonPath('data.total_anggaran', 9180000)
            ->assertJsonPath('data.employee_count', 2)
            ->assertJsonPath('data.status', 'Diajukan');

        $this->assertDatabaseHas('keuangan_spj', [
            'nama_kegiatan' => 'Operasionalisasi SMART Patrol di KSA, KPA dan TB',
            'tipe_anggaran' => 'FOLU',
            'total_anggaran' => 9180000,
        ]);
    }

    public function test_can_list_and_filter_spj(): void
    {
        Spj::create([
            'nama_kegiatan' => 'Kegiatan FOLU A',
            'tipe_anggaran' => 'FOLU',
            'nomor_spj' => 'SPJ.001/FOLU',
            'recipients' => [['name' => 'Budi', 'amount' => 1000000]],
            'total_anggaran' => 1000000,
            'employee_count' => 1,
            'status' => 'Draft',
        ]);

        Spj::create([
            'nama_kegiatan' => 'Kegiatan DIPA B',
            'tipe_anggaran' => 'DIPA',
            'nomor_spj' => 'SPJ.002/DIPA',
            'recipients' => [['name' => 'Siti', 'amount' => 2000000]],
            'total_anggaran' => 2000000,
            'employee_count' => 1,
            'status' => 'Disetujui',
        ]);

        $response = $this->getJson('/api/keuangan/spj?tipe_anggaran=FOLU');
        $response->assertStatus(200)
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.nama_kegiatan', 'Kegiatan FOLU A');
    }

    public function test_can_get_and_delete_spj(): void
    {
        $spj = Spj::create([
            'nama_kegiatan' => 'SPJ Test Detail',
            'tipe_anggaran' => 'FOLU',
            'nomor_spj' => 'SPJ.TEST/001',
            'recipients' => [['name' => 'Test User', 'amount' => 500000]],
            'total_anggaran' => 500000,
            'employee_count' => 1,
            'status' => 'Draft',
        ]);

        $showResponse = $this->getJson("/api/keuangan/spj/{$spj->id}");
        $showResponse->assertStatus(200)
            ->assertJsonPath('data.id', $spj->id)
            ->assertJsonPath('data.nama_kegiatan', 'SPJ Test Detail');

        $deleteResponse = $this->deleteJson("/api/keuangan/spj/{$spj->id}");
        $deleteResponse->assertStatus(200);

        $this->assertSoftDeleted('keuangan_spj', ['id' => $spj->id]);
    }
}
