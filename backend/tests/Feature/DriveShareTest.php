<?php

namespace Tests\Feature;

use App\Models\DriveFile;
use App\Models\DriveShare;
use App\Models\DriveUnit;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class DriveShareTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('drive');
        Storage::fake('drive_signer');
    }

    public function test_internal_share_creation_and_visibility(): void
    {
        $owner = User::factory()->create([
            'name' => 'Owner User',
            'username' => 'owner.test',
            'email' => 'owner@bksdakaltim.web.id',
            'role' => 'user',
        ]);

        $recipient = User::factory()->create([
            'name' => 'Recipient User',
            'username' => 'recipient.test',
            'email' => 'recipient@bksdakaltim.web.id',
            'role' => 'user',
        ]);

        $file = DriveFile::create([
            'user_id' => $owner->id,
            'name' => 'Laporan_Tahunan.pdf',
            's3_key' => 'my/' . $owner->id . '/Laporan_Tahunan.pdf',
            'size_bytes' => 1024,
            'mime_type' => 'application/pdf',
        ]);

        // Owner shares file with recipient
        $response = $this->actingAs($owner, 'sanctum')->postJson("/api/drive/files/{$file->id}/shares", [
            'share_type' => 'internal',
            'target_type' => 'user',
            'target_id' => $recipient->id,
            'role' => 'viewer',
        ]);

        $response->assertStatus(201);
        $this->assertDatabaseHas('drive_shares', [
            'file_id' => $file->id,
            'user_id' => $recipient->id,
            'share_type' => 'internal',
        ]);

        // Recipient checks shared_with_me list
        $listResponse = $this->actingAs($recipient, 'sanctum')->getJson('/api/drive?filter=shared_with_me');
        $listResponse->assertStatus(200);
        $listResponse->assertJsonFragment(['name' => 'Laporan_Tahunan.pdf']);
    }

    public function test_public_share_with_password_and_noindex_headers(): void
    {
        $owner = User::factory()->create([
            'name' => 'Public Share Owner',
            'username' => 'owner.pub',
            'email' => 'pubowner@bksdakaltim.web.id',
            'role' => 'user',
        ]);

        $file = DriveFile::create([
            'user_id' => $owner->id,
            'name' => 'Dokumen_Publik.pdf',
            's3_key' => 'my/' . $owner->id . '/Dokumen_Publik.pdf',
            'size_bytes' => 2048,
            'mime_type' => 'application/pdf',
        ]);

        // Owner creates public share with password
        $response = $this->actingAs($owner, 'sanctum')->postJson("/api/drive/files/{$file->id}/shares", [
            'share_type' => 'public',
            'password' => 'Secret1234',
            'expires_in_days' => 7,
        ]);

        $response->assertStatus(201);
        $token = $response->json('share.token');
        $this->assertEquals(32, strlen($token));

        // Public info request (unauthenticated)
        $infoResponse = $this->getJson("/api/drive/s/{$token}");
        $infoResponse->assertStatus(200)
            ->assertHeader('X-Robots-Tag', 'noindex, nofollow')
            ->assertJson([
                'file_name' => 'Dokumen_Publik.pdf',
                'requires_password' => true,
            ]);

        // Public download with wrong password -> 401
        $wrongPwResponse = $this->postJson("/api/drive/s/{$token}/download", [
            'password' => 'WrongPassword',
        ]);
        $wrongPwResponse->assertStatus(401)
            ->assertHeader('X-Robots-Tag', 'noindex, nofollow');

        // Public download with correct password -> 200 with presigned URL
        $correctPwResponse = $this->postJson("/api/drive/s/{$token}/download", [
            'password' => 'Secret1234',
        ]);
        $correctPwResponse->assertStatus(200)
            ->assertHeader('X-Robots-Tag', 'noindex, nofollow')
            ->assertJsonStructure(['url', 'file_name', 'size_bytes']);

        $this->assertDatabaseHas('drive_shares', [
            'token' => $token,
            'download_count' => 1,
        ]);
    }

    public function test_expired_or_revoked_public_share_returns_404(): void
    {
        $owner = User::factory()->create([
            'name' => 'Owner Revoke',
            'username' => 'owner.rev',
            'email' => 'rev@bksdakaltim.web.id',
            'role' => 'user',
        ]);

        $file = DriveFile::create([
            'user_id' => $owner->id,
            'name' => 'Kedaluwarsa.pdf',
            's3_key' => 'my/' . $owner->id . '/Kedaluwarsa.pdf',
            'size_bytes' => 100,
            'mime_type' => 'application/pdf',
        ]);

        $share = DriveShare::create([
            'file_id' => $file->id,
            'share_type' => 'public',
            'role' => 'viewer',
            'token' => 'expiredtoken12345678901234567890',
            'expires_at' => now()->subDay(), // already expired
            'created_by' => $owner->id,
        ]);

        $response = $this->getJson("/api/drive/s/{$share->token}");
        $response->assertStatus(404)
            ->assertHeader('X-Robots-Tag', 'noindex, nofollow');
    }

    public function test_public_download_is_throttled(): void
    {
        $owner = User::factory()->create([
            'name' => 'Throttle Owner',
            'username' => 'owner.throttle',
            'email' => 'throttle@bksdakaltim.web.id',
            'role' => 'user',
        ]);

        $file = DriveFile::create([
            'user_id' => $owner->id,
            'name' => 'RateLimited.pdf',
            's3_key' => 'my/' . $owner->id . '/RateLimited.pdf',
            'size_bytes' => 100,
            'mime_type' => 'application/pdf',
        ]);

        $share = DriveShare::create([
            'file_id' => $file->id,
            'share_type' => 'public',
            'role' => 'viewer',
            'token' => 'throttletesttoken123456789012345',
            'created_by' => $owner->id,
        ]);

        // Hit 10 times (should succeed)
        for ($i = 0; $i < 10; $i++) {
            $resp = $this->postJson("/api/drive/s/{$share->token}/download");
            $resp->assertStatus(200);
        }

        // 11th time should hit 429 Too Many Requests
        $resp11 = $this->postJson("/api/drive/s/{$share->token}/download");
        $resp11->assertStatus(429);
    }
}
