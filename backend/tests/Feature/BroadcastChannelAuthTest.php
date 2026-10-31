<?php

namespace Tests\Feature;

use App\Events\AdminInboxChanged;
use App\Events\PortalNotificationCreated;
use App\Models\User;
use App\Modules\SuratTugas\Models\AssignmentLetter;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class BroadcastChannelAuthTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Mail::fake();
        Notification::fake();
        config([
            'auth.two_factor_enforce' => false,
            'broadcasting.default' => 'pusher',
            'broadcasting.connections.pusher' => [
                'driver' => 'pusher', 'key' => 'dummy-channel-key', 'secret' => 'dummy-channel-secret',
                'app_id' => 'dummy-channel-app',
                'options' => ['host' => '127.0.0.1', 'port' => 9, 'scheme' => 'http', 'useTLS' => false],
            ],
        ]);
        require base_path('routes/channels.php');
    }

    private function authenticateBearer(User $user): int
    {
        $credential = $user->createToken('dummy-broadcast-channel-test');
        $this->app['auth']->forgetGuards();
        $this->app['auth']->setDefaultDriver('web');
        $this->withToken($credential->plainTextToken);
        return $credential->accessToken->id;
    }

    /**
     * User can subscribe to their own private user channel, but not to other users.
     */
    public function test_user_can_only_subscribe_to_own_channel(): void
    {
        $user1 = User::create([
            'name' => 'User One',
            'username' => 'user1',
            'email' => 'user1@broadcast.example.test',
            'password' => bcrypt('password'),
            'role' => 'user',
        ]);

        $user2 = User::create([
            'name' => 'User Two',
            'username' => 'user2',
            'email' => 'user2@broadcast.example.test',
            'password' => bcrypt('password'),
            'role' => 'user',
        ]);

        $tokenId = $this->authenticateBearer($user1);

        // Own channel -> OK
        $resSelf = $this->postJson('/api/broadcasting/auth', [
            'channel_name' => 'private-App.Models.User.'.$user1->id.'.'.$tokenId,
            'socket_id' => '1234.5678',
        ]);
        $resSelf->assertStatus(200);

        // Other user's channel -> 403
        $resOther = $this->postJson('/api/broadcasting/auth', [
            'channel_name' => 'private-App.Models.User.'.$user2->id.'.'.$tokenId,
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
            'email' => 'reg@broadcast.example.test',
            'password' => bcrypt('password'),
            'role' => 'user',
            'access_modules' => [],
        ]);

        $tokenId = $this->authenticateBearer($regularUser);

        $this->postJson('/api/broadcasting/auth', [
            'channel_name' => 'private-admin.inbox.kepegawaian.'.$tokenId,
            'socket_id' => '1234.5678',
        ])->assertStatus(403);

        // 2. Admin Kepegawaian has access to kepegawaian and surat_tugas, but NOT bmn
        $adminKpg = User::create([
            'name' => 'Admin Kepegawaian',
            'username' => 'adminkpg',
            'email' => 'kpg@broadcast.example.test',
            'password' => bcrypt('password'),
            'role' => 'admin',
            'access_modules' => ['kepegawaian'],
        ]);

        $tokenId = $this->authenticateBearer($adminKpg);

        $this->postJson('/api/broadcasting/auth', [
            'channel_name' => 'private-admin.inbox.kepegawaian.'.$tokenId,
            'socket_id' => '1234.5678',
        ])->assertStatus(200);

        $this->postJson('/api/broadcasting/auth', [
            'channel_name' => 'private-admin.inbox.surat_tugas.'.$tokenId,
            'socket_id' => '1234.5678',
        ])->assertStatus(200);

        $this->postJson('/api/broadcasting/auth', [
            'channel_name' => 'private-admin.inbox.bmn.'.$tokenId,
            'socket_id' => '1234.5678',
        ])->assertStatus(403);

        // 3. Super Admin has access to all admin inboxes
        $superAdmin = User::create([
            'name' => 'Super Admin',
            'username' => 'superadmin',
            'email' => 'root@broadcast.example.test',
            'password' => bcrypt('password'),
            'role' => 'super_admin',
            'access_modules' => ['*'],
        ]);

        $tokenId = $this->authenticateBearer($superAdmin);

        $this->postJson('/api/broadcasting/auth', [
            'channel_name' => 'private-admin.inbox.kepegawaian.'.$tokenId,
            'socket_id' => '1234.5678',
        ])->assertStatus(200);

        $this->postJson('/api/broadcasting/auth', [
            'channel_name' => 'private-admin.inbox.bmn.'.$tokenId,
            'socket_id' => '1234.5678',
        ])->assertStatus(200);
    }

    /**
     * Approving or updating Surat Tugas immediately dispatches AdminInboxChanged event.
     */
    public function test_surat_tugas_approval_and_status_update_dispatches_admin_inbox_changed(): void
    {
        Event::fake([AdminInboxChanged::class, PortalNotificationCreated::class]);

        $admin = User::create([
            'name' => 'Admin ST',
            'username' => 'adminst',
            'email' => 'adminst@broadcast.example.test',
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

        $this->authenticateBearer($admin);

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
