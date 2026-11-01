<?php

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Bmn\Models\Asset;
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
            'permissions' => ['bmn.view', 'bmn.asset.update'],
        ]);

        $this->exporterUser = User::factory()->create([
            'username' => 'exporter_bmn_' . uniqid(),
            'role' => 'user',
            'access_modules' => ['bmn'],
            'permissions' => ['bmn.view', 'bmn.asset.export'],
        ]);
    }

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
        Asset::create([
            'kode_barang' => '3010101001',
            'nup' => '1',
            'nama_barang' => 'Laptop Kedinasan',
            'kondisi' => 'Baik',
            'nilai_perolehan' => 15000000,
        ]);

        Sanctum::actingAs($this->exporterUser);

        $response = $this->get('/api/bmn/assets/export');

        $this->assertContains($response->getStatusCode(), [200, 302]);
    }

    public function test_admin_with_update_permission_can_export_assets(): void
    {
        Asset::create([
            'kode_barang' => '3010101002',
            'nup' => '2',
            'nama_barang' => 'PC Server BMN',
            'kondisi' => 'Baik',
            'nilai_perolehan' => 25000000,
        ]);

        Sanctum::actingAs($this->adminUser);

        $response = $this->get('/api/bmn/assets/export');

        $this->assertContains($response->getStatusCode(), [200, 302]);
    }

    public function test_upload_invalid_file_extension_to_import_review_fails_validation(): void
    {
        $superAdmin = User::factory()->create([
            'username' => 'super_admin_' . uniqid(),
            'role' => 'super_admin',
            'access_modules' => ['bmn'],
        ]);
        Sanctum::actingAs($superAdmin);

        $fakeFile = UploadedFile::fake()->create('malicious.php', 100, 'application/x-php');

        $response = $this->postJson('/api/bmn/import-review/upload', [
            'file' => $fakeFile,
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['file']);
    }

    public function test_upload_file_exceeding_10mb_to_import_review_fails_validation(): void
    {
        $superAdmin = User::factory()->create([
            'username' => 'super_admin_2_' . uniqid(),
            'role' => 'super_admin',
            'access_modules' => ['bmn'],
        ]);
        Sanctum::actingAs($superAdmin);

        // 11 MB file exceeds the 10240 KB limit
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
}
