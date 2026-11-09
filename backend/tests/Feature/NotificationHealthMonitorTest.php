<?php

namespace App\Console\Commands {
    // Only this test process supplies controlled DNS/socket errors; real transport is tested separately.
    function fsockopen($host, $port, &$errno, &$errstr, $timeout) {
        $failure = \Tests\Feature\NotificationHealthMonitorTest::$socketError;
        if ($failure !== null) {
            $errno = 0;
            $errstr = $failure;
            return false;
        }
        return \fsockopen($host, $port, $errno, $errstr, $timeout);
    }
}

namespace Tests\Feature {
    use App\Models\PortalNotification;
    use App\Models\User;
    use App\Services\PortalNotificationService;
    use Illuminate\Broadcasting\Broadcasters\LogBroadcaster;
    use Illuminate\Support\Facades\Cache;

    class NotificationHealthMonitorTest extends \Tests\TestCase
    {
        public static ?string $socketError = null;

        protected function setUp(): void
        {
            parent::setUp();
            $this->artisan('migrate:fresh', ['--force' => true])->assertExitCode(0);
            config(['auth.two_factor_enforce' => false, 'queue.default' => 'sync', 'broadcasting.default' => 'log']);
            self::$socketError = null;
            Cache::put('queue:heartbeat', now()->timestamp);
        }

        protected function tearDown(): void
        {
            self::$socketError = null;
            $this->travelBack();
            parent::tearDown();
        }

        public function test_rv02_health_distinguishes_controlled_dns_failure_from_tcp_refusal(): void
        {
            $admin = User::factory()->create(['role' => 'super_admin', 'is_active' => true]);
            config(['broadcasting.default' => 'reverb', 'broadcasting.connections.reverb.options.host' => 'dummy.invalid']);
            self::$socketError = 'php_network_getaddresses: getaddrinfo for dummy.invalid failed: Try again';
            $this->artisan('app:monitor-health')->assertExitCode(1);
            $notice = PortalNotification::where('user_id', $admin->id)->sole();
            $this->assertStringContainsString('DNS', $notice->message);
            $this->assertStringContainsString('dummy.invalid', $notice->message);
            self::$socketError = 'Connection refused';
            $this->artisan('app:monitor-health')->assertExitCode(1);
            $this->assertSame(1, PortalNotification::where('user_id', $admin->id)->count(), 'Different issue is also suppressed inside the existing global dedup hour.');
            $this->travel(61)->minutes();
            Cache::put('queue:heartbeat', now()->timestamp);
            self::$socketError = 'Connection refused';
            $this->artisan('app:monitor-health')->assertExitCode(1);
            $tcp = PortalNotification::where('user_id', $admin->id)->latest('id')->firstOrFail();
            $this->assertStringContainsString('koneksi TCP', $tcp->message);
            $this->assertStringNotContainsString('DNS', $tcp->message);
            $this->travel(61)->minutes();
            Cache::put('queue:heartbeat', now()->timestamp);
            self::$socketError = 'Connection timed out';
            $this->artisan('app:monitor-health')->assertExitCode(1);
            $timeout = PortalNotification::where('user_id', $admin->id)->latest('id')->firstOrFail();
            $this->assertStringContainsString('koneksi TCP', $timeout->message);
            $this->assertStringContainsString('timed out', $timeout->message);
            $this->assertStringNotContainsString('DNS', $timeout->message);
        }

        public function test_rv03_native_open_tcp_is_not_presented_as_end_to_end_websocket_proof(): void
        {
            $listener = stream_socket_server('tcp://127.0.0.1:0');
            $this->assertIsResource($listener);
            try {
                $address = stream_socket_get_name($listener, false);
                config(['broadcasting.default' => 'reverb', 'broadcasting.connections.reverb.options.host' => '127.0.0.1',
                    'broadcasting.connections.reverb.options.port' => (int) substr(strrchr($address, ':'), 1)]);
                $this->artisan('app:monitor-health')->assertExitCode(0);
                $this->assertSame(0, PortalNotification::count());
            } finally {
                fclose($listener);
            }
        }

        public function test_rv05_06_first_heartbeat_never_consumed_eventually_alerts_instead_of_resetting_forever(): void
        {
            $admin = User::factory()->create(['role' => 'super_admin', 'is_active' => true]);
            config(['queue.default' => 'database']);
            Cache::forget('queue:heartbeat');
            $this->artisan('app:monitor-health')->assertExitCode(0);
            $this->assertSame(0, PortalNotification::count());
            $this->travel(16)->minutes();
            $this->artisan('app:monitor-health')->assertExitCode(1);
            $this->assertSame(1, PortalNotification::where('user_id', $admin->id)->count());
            $this->assertStringContainsString('Queue', PortalNotification::where('user_id', $admin->id)->sole()->message);
        }

        public function test_rv07_sync_transport_failure_does_not_erase_or_hide_the_committed_notification(): void
        {
            $user = User::factory()->create(['is_active' => true]);
            $user->createToken('dummy-native-broadcast');
            app(\Illuminate\Contracts\Broadcasting\Factory::class)->extend('dummy-failing', fn () => new class(app('log')) extends LogBroadcaster {
                public function broadcast(array $channels, $event, array $payload = []) {
                    throw new \RuntimeException('Dummy transport unavailable');
                }
            });
            config(['broadcasting.default' => 'dummy-failing']);
            $notice = app(PortalNotificationService::class)->notifyUser($user, 'Dummy outage', 'Dummy persisted body');
            $this->assertNotNull($notice);
            $this->assertDatabaseHas('portal_notifications', ['id' => $notice->id, 'user_id' => $user->id]);
        }
    }
}
