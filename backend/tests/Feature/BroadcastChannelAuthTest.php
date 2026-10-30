<?php

namespace Tests\Feature;

use App\Events\AdminInboxChanged;
use App\Models\User;
use App\Modules\SuratTugas\Models\AssignmentLetter;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
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

    /**
     * Approving or updating Surat Tugas immediately dispatches AdminInboxChanged event.
     */
    public function test_surat_tugas_approval_and_status_update_dispatches_admin_inbox_changed(): void
    {
        Event::fake([AdminInboxChanged::class]);

        $admin = User::create([
            'name' => 'Admin ST',
            'username' => 'adminst',
            'email' => 'adminst@example.com',
            'password' => bcrypt('password'),
            'role' => 'admin',
            'access_modules' => ['surat_tugas'],
        ]);

        $letter = AssignmentLetter::create([
            'nomor_surat' => 'ST.999/BKSDA/2026',
            'maksud_tujuan' => 'Uji Broadcast WebSocket Approval',
            'tanggal_mulai' => '2026-08-01',
            'tanggal_selesai' => '2026-08-02',
            'tanggal_surat' => '2026-07-31',
            'status' => 'pending',
            'created_by' => $admin->id,
        ]);

        Sanctum::actingAs($admin);

        // 1. Update status
        $resUpdate = $this->putJson("/api/surat-tugas/{$letter->id}/status", [
            'status' => 'approved',
        ]);
        $resUpdate->assertStatus(200);

        Event::assertDispatched(AdminInboxChanged::class, function ($event) use ($letter) {
            return $event->module === 'surat_tugas' &&
                   $event->action === 'status_updated' &&
                   $event->referenceId === (string) $letter->id;
        });

        // 2. Approve endpoint
        $resApprove = $this->putJson("/api/surat-tugas/{$letter->id}/approve", [
            'nomor_surat' => 'ST.999/BKSDA/2026-APP',
            'status' => 'approved',
        ]);
        $resApprove->assertStatus(200);

        Event::assertDispatched(AdminInboxChanged::class, function ($event) use ($letter) {
            return $event->module === 'surat_tugas' &&
                   $event->action === 'approved' &&
                   $event->referenceId === (string) $letter->id;
        });
    }
}
