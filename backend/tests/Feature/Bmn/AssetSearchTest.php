<?php

namespace Tests\Feature\Bmn;

use App\Models\User;
use App\Modules\Bmn\Models\Asset;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AssetSearchTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::factory()->create([
            'username' => 'testuser',
            'role' => 'user',
            'access_modules' => ['bmn'],
            'permissions' => [],
        ]);

        Sanctum::actingAs($this->user);
    }

    public function test_asset_search_is_case_insensitive(): void
    {
        Asset::create([
            'kode_barang' => '3100102002',
            'nup' => '13',
            'nama_barang' => 'Lap Top',
            'merk' => 'Asus Zenbook',
            'kondisi' => 'Baik',
            'nilai_perolehan' => 19450000,
        ]);

        // Search lower case 'lap top'
        $responseLower = $this->getJson('/api/bmn/assets?search=lap+top');
        $responseLower->assertStatus(200);
        $this->assertCount(1, $responseLower->json('data'));
        $this->assertEquals('Lap Top', $responseLower->json('data.0.nama_barang'));

        // Search upper case 'LAP TOP'
        $responseUpper = $this->getJson('/api/bmn/assets?search=LAP+TOP');
        $responseUpper->assertStatus(200);
        $this->assertCount(1, $responseUpper->json('data'));

        // Search mixed case 'lAp ToP'
        $responseMixed = $this->getJson('/api/bmn/assets?search=lAp+ToP');
        $responseMixed->assertStatus(200);
        $this->assertCount(1, $responseMixed->json('data'));
    }
}
