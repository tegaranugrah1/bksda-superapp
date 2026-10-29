<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class BroadcastChannelAuthTest extends TestCase
{
    use RefreshDatabase;

    /**
     * User can subscribe to their own private user channel, but not to other users.
     */
    public function test_user_can_only_subscribe_to_own_channel(): void
    {
        $user1 = User::create([
            'name' => 'User One',
            'username' => 'user1',
            'email' => 'user1@example.com',
            'password' => bcrypt('password'),
            'role' => 'user',
        ]);

        $user2 = User::create([
            'name' => 'User Two',
            'username' => 'user2',
            'email' => 'user2@example.com',
            'password' => bcrypt('password'),
            'role' => 'user',
        ]);

        Sanctum::actingAs($user1);

        // Own channel -> OK
        $resSelf = $this->postJson('/api/broadcasting/auth', [
            'channel_name' => 'private-App.Models.User.'.$user1->id,
            'socket_id' => '1234.5678',
        ]);
        $resSelf->assertStatus(200);

        // Other user's channel -> 403
        $resOther = $this->postJson('/api/broadcasting/auth', [
            'channel_name' => 'private-App.Models.User.'.$user2->id,
            'socket_id' => '1234.5678',
        ]);
        $resOther->assertStatus(403);
    }

    /**
     * Test admin inbox channel authorization matrix for modules: surat_tugas, kepegawaian, bmn.
     */
    public function test_admin_inbox_channel_authorization(): void
    {
        // 1. Regular user has no access to any admin inbox
        $regularUser = User::create([
            'name' => 'Regular User',
            'username' => 'regular',
            'email' => 'reg@example.com',
            'password' => bcrypt('password'),
            'role' => 'user',
            'access_modules' => [],
        ]);

        Sanctum::actingAs($regularUser);

        $this->postJson('/api/broadcasting/auth', [
            'channel_name' => 'private-admin.inbox.kepegawaian',
            'socket_id' => '1234.5678',
        ])->assertStatus(403);

        // 2. Admin Kepegawaian has access to kepegawaian and surat_tugas, but NOT bmn
        $adminKpg = User::create([
            'name' => 'Admin Kepegawaian',
            'username' => 'adminkpg',
            'email' => 'kpg@example.com',
            'password' => bcrypt('password'),
            'role' => 'admin',
            'access_modules' => ['kepegawaian'],
        ]);

        Sanctum::actingAs($adminKpg);

        $this->postJson('/api/broadcasting/auth', [
            'channel_name' => 'private-admin.inbox.kepegawaian',
            'socket_id' => '1234.5678',
        ])->assertStatus(200);

        $this->postJson('/api/broadcasting/auth', [
            'channel_name' => 'private-admin.inbox.surat_tugas',
            'socket_id' => '1234.5678',
        ])->assertStatus(200);

        $this->postJson('/api/broadcasting/auth', [
            'channel_name' => 'private-admin.inbox.bmn',
            'socket_id' => '1234.5678',
        ])->assertStatus(403);

        // 3. Super Admin has access to all admin inboxes
        $superAdmin = User::create([
            'name' => 'Super Admin',
            'username' => 'superadmin',
            'email' => 'root@example.com',
            'password' => bcrypt('password'),
            'role' => 'super_admin',
            'access_modules' => ['*'],
        ]);

        Sanctum::actingAs($superAdmin);

        $this->postJson('/api/broadcasting/auth', [
            'channel_name' => 'private-admin.inbox.kepegawaian',
            'socket_id' => '1234.5678',
        ])->assertStatus(200);

        $this->postJson('/api/broadcasting/auth', [
            'channel_name' => 'private-admin.inbox.bmn',
            'socket_id' => '1234.5678',
        ])->assertStatus(200);
    }
}
