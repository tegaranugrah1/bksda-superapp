<?php

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Bmn\Models\Asset;
use App\Modules\Bmn\Models\Tag;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class BmnTagTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->user = User::factory()->create([
            'username' => 'testbmn_' . uniqid(),
            'role' => 'super_admin',
            'access_modules' => ['bmn'],
        ]);
        Sanctum::actingAs($this->user);
    }

    public function test_can_create_and_list_tags(): void
    {
        $res = $this->postJson('/api/bmn/tags', [
            'name' => 'motor',
            'color' => 'blue',
            'description' => 'Kendaraan roda dua',
        ]);

        $res->assertStatus(201)
            ->assertJsonPath('data.name', 'motor')
            ->assertJsonPath('data.label', '#motor')
            ->assertJsonPath('data.color', 'blue');

        $listRes = $this->getJson('/api/bmn/tags');
        $listRes->assertStatus(200)
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.label', '#motor');
    }

    public function test_cannot_create_duplicate_tag(): void
    {
        Tag::create([
            'name' => 'mobil',
            'label' => '#mobil',
            'color' => 'emerald',
        ]);

        $res = $this->postJson('/api/bmn/tags', [
            'name' => '#mobil',
            'color' => 'amber',
        ]);

        $res->assertStatus(422)
            ->assertJsonValidationErrors(['clean_name']);
    }

    public function test_can_update_tag(): void
    {
        $tag = Tag::create([
            'name' => 'speed',
            'label' => '#speed',
            'color' => 'cyan',
        ]);

        $res = $this->putJson("/api/bmn/tags/{$tag->id}", [
            'name' => '#speedboat',
            'color' => 'purple',
            'description' => 'Kapal cepat',
        ]);

        $res->assertStatus(200)
            ->assertJsonPath('data.name', 'speedboat')
            ->assertJsonPath('data.label', '#speedboat')
            ->assertJsonPath('data.color', 'purple');
    }

    public function test_can_sync_tags_for_single_asset(): void
    {
        $asset = Asset::create([
            'kode_barang' => '3010101001',
            'nup' => '1',
            'nama_barang' => 'Sepeda Motor Trail',
            'kondisi' => 'Baik',
            'nilai_perolehan' => 35000000,
        ]);

        $tag1 = Tag::create(['name' => 'motor', 'label' => '#motor', 'color' => 'blue']);
        $tag2 = Tag::create(['name' => 'balai', 'label' => '#balai', 'color' => 'purple']);

        $res = $this->postJson("/api/bmn/assets/{$asset->id}/tags", [
            'tag_ids' => [$tag1->id, $tag2->id],
        ]);

        $res->assertStatus(200)
            ->assertJsonCount(2, 'data.tags');

        $this->assertDatabaseHas('bmn_asset_tag', [
            'asset_id' => $asset->id,
            'tag_id' => $tag1->id,
        ]);
        $this->assertDatabaseHas('bmn_asset_tag', [
            'asset_id' => $asset->id,
            'tag_id' => $tag2->id,
        ]);
    }

    public function test_can_bulk_assign_tags_to_multiple_assets(): void
    {
        $asset1 = Asset::create([
            'kode_barang' => '3010101001',
            'nup' => '10',
            'nama_barang' => 'Toyota Hilux 4x4',
            'kondisi' => 'Baik',
            'nilai_perolehan' => 450000000,
        ]);

        $asset2 = Asset::create([
            'kode_barang' => '3010101002',
            'nup' => '11',
            'nama_barang' => 'Mitsubishi Triton 4x4',
            'kondisi' => 'Baik',
            'nilai_perolehan' => 480000000,
        ]);

        $tag = Tag::create(['name' => 'mobil', 'label' => '#mobil', 'color' => 'emerald']);

        $res = $this->postJson('/api/bmn/tags/bulk-assign', [
            'asset_ids' => [$asset1->id, $asset2->id],
            'tag_ids' => [$tag->id],
            'action' => 'attach',
        ]);

        $res->assertStatus(200)
            ->assertJsonPath('count', 2);

        $this->assertDatabaseHas('bmn_asset_tag', ['asset_id' => $asset1->id, 'tag_id' => $tag->id]);
        $this->assertDatabaseHas('bmn_asset_tag', ['asset_id' => $asset2->id, 'tag_id' => $tag->id]);
    }

    public function test_can_filter_and_search_assets_by_tag(): void
    {
        $asset1 = Asset::create([
            'kode_barang' => '3010101001',
            'nup' => '20',
            'nama_barang' => 'Yamaha WR 155',
            'kondisi' => 'Baik',
            'nilai_perolehan' => 40000000,
        ]);

        $asset2 = Asset::create([
            'kode_barang' => '3010101002',
            'nup' => '21',
            'nama_barang' => 'Isuzu D-Max',
            'kondisi' => 'Baik',
            'nilai_perolehan' => 400000000,
        ]);

        $tagMotor = Tag::create(['name' => 'motor', 'label' => '#motor', 'color' => 'blue']);
        $tagMobil = Tag::create(['name' => 'mobil', 'label' => '#mobil', 'color' => 'emerald']);

        $asset1->tags()->sync([$tagMotor->id]);
        $asset2->tags()->sync([$tagMobil->id]);

        // Filter by tag_id
        $filterRes = $this->getJson("/api/bmn/assets?tag_id={$tagMotor->id}");
        $filterRes->assertStatus(200)
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $asset1->id);

        // Search by tag name with #
        $searchRes = $this->getJson("/api/bmn/assets?search=%23mobil");
        $searchRes->assertStatus(200)
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $asset2->id);
    }

    public function test_can_delete_tag_and_cascade_detach(): void
    {
        $asset = Asset::create([
            'kode_barang' => '3010101001',
            'nup' => '30',
            'nama_barang' => 'Honda CRF 150',
            'kondisi' => 'Baik',
            'nilai_perolehan' => 36000000,
        ]);

        $tag = Tag::create(['name' => 'motor', 'label' => '#motor', 'color' => 'blue']);
        $asset->tags()->sync([$tag->id]);

        $this->assertDatabaseHas('bmn_asset_tag', ['asset_id' => $asset->id, 'tag_id' => $tag->id]);

        $delRes = $this->deleteJson("/api/bmn/tags/{$tag->id}");
        $delRes->assertStatus(200)
            ->assertJsonPath('affected_assets_count', 1);

        $this->assertDatabaseMissing('bmn_tags', ['id' => $tag->id]);
        $this->assertDatabaseMissing('bmn_asset_tag', ['asset_id' => $asset->id, 'tag_id' => $tag->id]);
        $this->assertDatabaseHas('bmn_assets', ['id' => $asset->id]); // Asset remains intact
    }

    public function test_can_filter_assets_by_multiple_tags_with_and_logic(): void
    {
        $asset1 = Asset::create([
            'kode_barang' => '3010101001',
            'nup' => '40',
            'nama_barang' => 'Toyota Hilux Berau',
            'kondisi' => 'Baik',
            'nilai_perolehan' => 450000000,
        ]);

        $asset2 = Asset::create([
            'kode_barang' => '3010101002',
            'nup' => '41',
            'nama_barang' => 'Toyota Hilux Samarinda',
            'kondisi' => 'Baik',
            'nilai_perolehan' => 450000000,
        ]);

        $tagMobil = Tag::create(['name' => 'mobil_multi', 'label' => '#mobil_multi', 'color' => 'emerald']);
        $tagBerau = Tag::create(['name' => 'berau_multi', 'label' => '#berau_multi', 'color' => 'blue']);
        $tagSamarinda = Tag::create(['name' => 'smd_multi', 'label' => '#smd_multi', 'color' => 'green']);

        $asset1->tags()->sync([$tagMobil->id, $tagBerau->id]);
        $asset2->tags()->sync([$tagMobil->id, $tagSamarinda->id]);

        // Filter by both mobil AND berau -> only asset1
        $res = $this->getJson("/api/bmn/assets?tag_ids={$tagMobil->id},{$tagBerau->id}");
        $res->assertStatus(200)
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $asset1->id);

        // Filter by both mobil AND samarinda -> only asset2
        $res2 = $this->getJson("/api/bmn/assets?tag_ids={$tagMobil->id},{$tagSamarinda->id}");
        $res2->assertStatus(200)
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $asset2->id);

        // Filter by all 3 -> 0 assets match
        $res3 = $this->getJson("/api/bmn/assets?tag_ids={$tagMobil->id},{$tagBerau->id},{$tagSamarinda->id}");
        $res3->assertStatus(200)
            ->assertJsonCount(0, 'data');
    }

    public function test_can_bulk_detach_specific_tags(): void
    {
        $asset1 = Asset::create(['kode_barang' => '3010101001', 'nup' => '50', 'nama_barang' => 'Test 1', 'kondisi' => 'Baik', 'nilai_perolehan' => 1000]);
        $asset2 = Asset::create(['kode_barang' => '3010101002', 'nup' => '51', 'nama_barang' => 'Test 2', 'kondisi' => 'Baik', 'nilai_perolehan' => 1000]);

        $tagA = Tag::create(['name' => 'tag_a', 'label' => '#tag_a']);
        $tagB = Tag::create(['name' => 'tag_b', 'label' => '#tag_b']);

        $asset1->tags()->sync([$tagA->id, $tagB->id]);
        $asset2->tags()->sync([$tagA->id, $tagB->id]);

        // Bulk detach tagA only
        $res = $this->postJson('/api/bmn/tags/bulk-assign', [
            'asset_ids' => [$asset1->id, $asset2->id],
            'tag_ids' => [$tagA->id],
            'action' => 'detach',
        ]);
        $res->assertStatus(200);

        $this->assertDatabaseMissing('bmn_asset_tag', ['asset_id' => $asset1->id, 'tag_id' => $tagA->id]);
        $this->assertDatabaseHas('bmn_asset_tag', ['asset_id' => $asset1->id, 'tag_id' => $tagB->id]);
    }

    public function test_can_bulk_clear_all_tags(): void
    {
        $asset = Asset::create(['kode_barang' => '3010101001', 'nup' => '60', 'nama_barang' => 'Test Clear', 'kondisi' => 'Baik', 'nilai_perolehan' => 1000]);
        $tag = Tag::create(['name' => 'tag_c', 'label' => '#tag_c']);
        $asset->tags()->sync([$tag->id]);

        $res = $this->postJson('/api/bmn/tags/bulk-assign', [
            'asset_ids' => [$asset->id],
            'action' => 'clear_all',
        ]);
        $res->assertStatus(200);

        $this->assertDatabaseMissing('bmn_asset_tag', ['asset_id' => $asset->id]);
    }

    public function test_tag_changes_are_logged_in_asset_updates(): void
    {
        $asset = Asset::create(['kode_barang' => '3010101001', 'nup' => '70', 'nama_barang' => 'Test Audit', 'kondisi' => 'Baik', 'nilai_perolehan' => 1000]);
        $tag1 = Tag::create(['name' => 'tag_1', 'label' => '#tag_1']);
        $tag2 = Tag::create(['name' => 'tag_2', 'label' => '#tag_2']);

        // Single sync: attach tag1
        $this->postJson("/api/bmn/assets/{$asset->id}/tags", [
            'tag_ids' => [$tag1->id],
        ])->assertStatus(200);

        $this->assertDatabaseHas('bmn_asset_updates', [
            'asset_id' => $asset->id,
            'field_changed' => 'tags',
            'old_value' => '—',
            'new_value' => '#tag_1',
            'alasan_perubahan' => 'Perubahan tag aset',
        ]);

        // Bulk attach: attach tag2 as well
        $this->postJson('/api/bmn/tags/bulk-assign', [
            'asset_ids' => [$asset->id],
            'tag_ids' => [$tag2->id],
            'action' => 'attach',
        ])->assertStatus(200);

        $this->assertDatabaseHas('bmn_asset_updates', [
            'asset_id' => $asset->id,
            'field_changed' => 'tags',
            'old_value' => '#tag_1',
            'new_value' => '#tag_1, #tag_2',
            'alasan_perubahan' => 'Penambahan tag massal',
        ]);
    }
}
