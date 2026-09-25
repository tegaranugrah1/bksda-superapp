<?php

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Bmn\Models\Asset;
use App\Modules\Bmn\Models\AssetType;
use App\Modules\Bmn\Models\Location;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class BmnMasterDataTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->user = User::factory()->create([
            'username' => 'test_master_' . uniqid(),
            'role' => 'super_admin',
            'access_modules' => ['bmn'],
        ]);
        Sanctum::actingAs($this->user);
    }

    public function test_can_list_and_create_location(): void
    {
        $res = $this->postJson('/api/bmn/locations', [
            'unit_kerja' => 'Kantor Balai KSDA Kalimantan Timur',
            'name' => 'Ruang Laboratorium Uji',
            'description' => 'Untuk pengujian sampel',
        ]);

        $res->assertStatus(201)
            ->assertJsonPath('data.name', 'Ruang Laboratorium Uji')
            ->assertJsonPath('data.unit_kerja', 'Kantor Balai KSDA Kalimantan Timur');

        $listRes = $this->getJson('/api/bmn/locations');
        $listRes->assertStatus(200)
            ->assertJsonPath('data.0.name', 'Ruang Laboratorium Uji');
    }

    public function test_cannot_delete_location_in_use(): void
    {
        $loc = Location::create([
            'unit_kerja' => 'Kantor Balai',
            'name' => 'Gudang Utama',
        ]);

        Asset::create([
            'kode_barang' => '3010101001',
            'nup' => '100',
            'nama_barang' => 'Barang di Gudang',
            'kondisi' => 'Baik',
            'nilai_perolehan' => 5000,
            'lokasi_ruang' => 'Gudang Utama',
        ]);

        // Attempt delete -> should fail with 422
        $res = $this->deleteJson("/api/bmn/locations/{$loc->id}");
        $res->assertStatus(422);

        $this->assertDatabaseHas('bmn_locations', ['id' => $loc->id]);

        // When 0 assets, can delete
        Asset::where('lokasi_ruang', 'Gudang Utama')->delete();
        $resSuccess = $this->deleteJson("/api/bmn/locations/{$loc->id}");
        $resSuccess->assertStatus(200);

        $this->assertDatabaseMissing('bmn_locations', ['id' => $loc->id]);
    }

    public function test_can_list_and_create_asset_type(): void
    {
        $res = $this->postJson('/api/bmn/asset-types', [
            'name' => 'DRONE PENGAWASAN',
            'category_mode' => 'peralatan',
            'description' => 'Pesawat nirawak pemantau hutan',
        ]);

        $res->assertStatus(201)
            ->assertJsonPath('data.name', 'DRONE PENGAWASAN')
            ->assertJsonPath('data.category_mode', 'peralatan');

        $listRes = $this->getJson('/api/bmn/asset-types');
        $listRes->assertStatus(200)
            ->assertJsonPath('data.0.name', 'DRONE PENGAWASAN');
    }

    public function test_cannot_delete_asset_type_in_use(): void
    {
        $type = AssetType::create([
            'name' => 'KAPAL PATROLI',
            'category_mode' => 'kendaraan',
        ]);

        Asset::create([
            'kode_barang' => '3010101002',
            'nup' => '200',
            'nama_barang' => 'Kapal Patroli Laut',
            'kondisi' => 'Baik',
            'nilai_perolehan' => 100000,
            'jenis_bmn' => 'KAPAL PATROLI',
        ]);

        // Attempt delete -> should fail with 422
        $res = $this->deleteJson("/api/bmn/asset-types/{$type->id}");
        $res->assertStatus(422);

        $this->assertDatabaseHas('bmn_asset_types', ['id' => $type->id]);

        // When 0 assets, can delete
        Asset::where('jenis_bmn', 'KAPAL PATROLI')->delete();
        $resSuccess = $this->deleteJson("/api/bmn/asset-types/{$type->id}");
        $resSuccess->assertStatus(200);

        $this->assertDatabaseMissing('bmn_asset_types', ['id' => $type->id]);
    }
}
