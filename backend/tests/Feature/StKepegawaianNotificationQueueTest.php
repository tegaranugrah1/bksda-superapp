<?php

namespace Tests\Feature;

use App\Events\AdminInboxChanged;
use App\Events\PortalNotificationCreated;
use App\Models\PortalNotification;
use App\Models\User;
use Illuminate\Broadcasting\BroadcastEvent;
use Illuminate\Contracts\Broadcasting\Broadcaster;
use Illuminate\Contracts\Broadcasting\Factory;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class StKepegawaianNotificationQueueTest extends TestCase
{
    use RefreshDatabase;

    public function test_native_queued_events_recheck_revoked_credentials_and_module_membership(): void
    {
        config(['auth.two_factor_enforce' => false]);
        $owner = User::factory()->create(['role' => 'admin', 'access_modules' => ['surat_tugas'],
            'is_active' => true, 'must_change_password' => false]);
        $retained = User::factory()->create(['role' => 'admin', 'access_modules' => ['surat_tugas'],
            'is_active' => true, 'must_change_password' => false]);
        $revoked = $owner->createToken('dummy-queued-owner');
        $valid = $retained->createToken('dummy-retained-admin');
        $notice = PortalNotification::withoutEvents(fn () => PortalNotification::create([
            'user_id' => $owner->id, 'title' => 'Dummy queued ST', 'message' => 'Dummy private body', 'type' => 'surat_tugas',
        ]));
        $private = serialize(new BroadcastEvent(new PortalNotificationCreated($notice)));
        $admin = serialize(new BroadcastEvent(new AdminInboxChanged('surat_tugas', 'updated', 'dummy-letter')));
        $sent = [];
        $broadcaster = \Mockery::mock(Broadcaster::class);
        $broadcaster->shouldReceive('broadcast')->andReturnUsing(function ($channels, $event, $payload) use (&$sent) {
            $sent[] = ['channels' => array_map('strval', $channels), 'event' => $event, 'payload' => $payload];
        });
        $factory = \Mockery::mock(Factory::class);
        $factory->shouldReceive('connection')->andReturn($broadcaster);
        // Actual HTTP logout revokes all persistent credentials before delayed job handling.
        $this->withToken($revoked->plainTextToken)->postJson('/api/logout')->assertOk();
        $owner->update(['access_modules' => []]);
        unserialize($private)->handle($factory);
        $this->assertSame([], $sent);
        unserialize($admin)->handle($factory);
        $this->assertCount(1, $sent);
        $this->assertSame(['private-admin.inbox.surat_tugas.'.$valid->accessToken->id], $sent[0]['channels']);
        // A newly issued owner credential can receive personal notices, without restoring module authority.
        $fresh = $owner->createToken('dummy-fresh-owner');
        unserialize($private)->handle($factory);
        $this->assertCount(2, $sent);
        $this->assertSame(['private-App.Models.User.'.$owner->id.'.'.$fresh->accessToken->id], $sent[1]['channels']);
        $this->assertSame('Dummy private body', $sent[1]['payload']['message']);
        $sent = [];
        unserialize($admin)->handle($factory);
        $this->assertCount(1, $sent);
        $this->assertSame(['private-admin.inbox.surat_tugas.'.$valid->accessToken->id], $sent[0]['channels']);
    }
}
