<?php

namespace Tests\Feature;

use App\Events\AdminInboxChanged;
use App\Events\PortalNotificationCreated;
use App\Models\PortalNotification;
use App\Models\User;
use App\Modules\Kepegawaian\Models\Employee;
use App\Services\PortalNotificationService;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\URL;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class PortalIdentityBoundaryTest extends TestCase
{
    use RefreshDatabase;

    private const CURRENT_PASSWORD = 'DummyCurrentPassword42!';
    private const NEW_PASSWORD = 'DummyReplacementPassword42!';

    protected function setUp(): void
    {
        parent::setUp();
        Mail::fake();
        Notification::fake();
        config([
            'auth.two_factor_enforce' => false,
            'sanctum.expiration' => 1440,
            'broadcasting.default' => 'pusher',
            'broadcasting.connections.pusher' => [
                'driver' => 'pusher',
                'key' => 'dummy-identity-key',
                'secret' => 'dummy-identity-secret',
                'app_id' => 'dummy-identity-app',
                'options' => ['host' => '127.0.0.1', 'port' => 9, 'scheme' => 'http', 'useTLS' => false],
            ],
        ]);
        // Bootstrap registered channels on its original driver; register the real source on this test driver too.
        require base_path('routes/channels.php');
    }

    private function dummy(string $name, array $attributes = []): User
    {
        return User::create(array_merge([
            'name' => 'Dummy '.$name,
            'username' => 'dummy_identity_'.$name,
            'email' => $name.'@identity.example.test',
            'email_verified_at' => now(),
            'password' => Hash::make(self::CURRENT_PASSWORD),
            'role' => 'user',
            'is_active' => true,
            'must_change_password' => false,
            'access_modules' => [],
        ], $attributes));
    }

    private function notice(User $user, string $type = 'system', bool $read = false): PortalNotification
    {
        // Only fixture creation skips its outbound broadcast event; HTTP authorization is real.
        return PortalNotification::withoutEvents(fn () => PortalNotification::create([
            'user_id' => $user->id,
            'title' => 'Dummy private notice '.$user->id,
            'message' => 'Dummy private body '.$user->id,
            'type' => $type,
            'read_at' => $read ? now() : null,
        ]));
    }

    private function anonymous(): void
    {
        $this->app['auth']->forgetGuards();
        $this->app['auth']->setDefaultDriver('web');
    }

    private function bearer(string $token): void
    {
        $this->anonymous();
        $this->flushHeaders();
        $this->defaultCookies = [];
        $this->unencryptedCookies = [];
        $this->withCredentials = false;
        // A new stateless client must not inherit Laravel's in-memory test session from an earlier login.
        $this->app['session']->flush();
        $this->withToken($token);
    }

    private function channelAuth(string $token, string $channel, string $socket = '123.456')
    {
        $this->bearer($token);
        return $this->postJson('/api/broadcasting/auth', ['channel_name' => $channel, 'socket_id' => $socket]);
    }

    private function hmac(string $channel, string $socket = '123.456'): string
    {
        return 'dummy-identity-key:'.hash_hmac('sha256', $socket.':'.$channel, 'dummy-identity-secret');
    }

    private function eventTopics(object $event): array
    {
        return array_map(fn ($channel) => $channel->name, $event->broadcastOn());
    }

    private function resetInput(User $user, string $token): array
    {
        return [
            'email' => $user->email,
            'token' => $token,
            'password' => self::NEW_PASSWORD,
            'password_confirmation' => self::NEW_PASSWORD,
        ];
    }

    private function resetTokenFromHttp(User $user): string
    {
        $token = null;
        $this->postJson('/api/forgot-password', ['email' => $user->email])->assertOk();
        Notification::assertSentTo($user, ResetPassword::class, function ($notification) use (&$token) {
            $token = $notification->token;
            return true;
        });
        $this->assertIsString($token);
        return $token;
    }

    public function test_login_me_and_dashboard_preserve_exact_permission_metadata(): void
    {
        foreach ([null, [], ['kepegawaian.view']] as $index => $permissions) {
            $user = $this->dummy('permission_metadata_'.$index, [
                'role' => 'admin', 'access_modules' => ['kepegawaian'], 'permissions' => $permissions,
            ]);
            $this->anonymous();
            $this->flushHeaders();
            $this->app['session']->flush();
            $login = $this->postJson('/api/login', [
                'username' => $user->username, 'password' => self::CURRENT_PASSWORD,
            ])->assertOk();
            $this->assertArrayHasKey('permissions', $login->json('data'));
            $this->assertSame($permissions, $login->json('data.permissions'));
            $token = $login->json('token');
            $this->bearer($token);
            $me = $this->getJson('/api/me')->assertOk();
            $this->assertArrayHasKey('permissions', $me->json('data'));
            $this->assertSame($permissions, $me->json('data.permissions'));
            $this->bearer($token);
            $dashboard = $this->getJson('/api/me/dashboard')->assertOk();
            foreach (['user', 'data.user'] as $path) {
                $this->assertArrayHasKey('permissions', $dashboard->json($path));
                $this->assertSame($permissions, $dashboard->json($path.'.permissions'));
            }
        }
    }

    public function test_notification_list_filters_and_counts_never_include_another_owner(): void
    {
        $owner = $this->dummy('notice_owner');
        $other = $this->dummy('notice_other');
        $unread = $this->notice($owner, 'cuti');
        $read = $this->notice($owner, 'system', true);
        $foreign = $this->notice($other, 'cuti');
        Sanctum::actingAs($owner);

        $response = $this->getJson('/api/portal/notifications?per_page=999&user_id='.$other->id);
        $response->assertOk()->assertJsonPath('meta.total', 2)->assertJsonPath('meta.unread_count', 1)
            ->assertJsonPath('meta.per_page', 50);
        $this->assertEqualsCanonicalizing([$unread->id, $read->id], array_column($response->json('data'), 'id'));
        $this->assertNotContains($foreign->id, array_column($response->json('data'), 'id'));
        $this->getJson('/api/portal/notifications?unread_only=true&type=cuti')
            ->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.id', $unread->id)
            ->assertJsonPath('meta.total', 1)->assertJsonPath('meta.unread_count', 1);
    }

    public function test_notification_single_and_bulk_read_are_owner_scoped_and_idempotent(): void
    {
        $owner = $this->dummy('read_owner');
        $other = $this->dummy('read_other');
        $first = $this->notice($owner);
        $second = $this->notice($owner);
        $foreign = $this->notice($other);
        Sanctum::actingAs($owner);

        $this->postJson('/api/portal/notifications/'.$foreign->id.'/read')->assertNotFound();
        $this->assertNull($foreign->refresh()->read_at);
        $this->postJson('/api/portal/notifications/'.$first->id.'/read')
            ->assertOk()->assertJsonPath('unread_count', 1);
        $stamp = $first->refresh()->read_at->toISOString();
        $this->postJson('/api/portal/notifications/'.$first->id.'/read')
            ->assertOk()->assertJsonPath('unread_count', 1);
        $this->assertSame($stamp, $first->refresh()->read_at->toISOString());
        $this->postJson('/api/portal/notifications/mark-all-read', ['user_id' => $other->id])
            ->assertOk()->assertJsonPath('unread_count', 0);
        $this->assertNotNull($second->refresh()->read_at);
        $this->assertNull($foreign->refresh()->read_at);
    }

    public function test_anonymous_notification_and_broadcast_routes_deny_access(): void
    {
        $notice = $this->notice($this->dummy('anon_notice'));
        $this->getJson('/api/portal/notifications')->assertUnauthorized();
        $this->postJson('/api/portal/notifications/'.$notice->id.'/read')->assertUnauthorized();
        $this->postJson('/api/portal/notifications/mark-all-read')->assertUnauthorized();
        $this->postJson('/api/broadcasting/auth', [
            'channel_name' => 'private-App.Models.User.'.$notice->user_id,
            'socket_id' => '123.456',
        ])->assertUnauthorized();
        $this->assertNull($notice->refresh()->read_at);
    }

    public function test_private_user_channel_hmac_is_bound_to_owner_channel_and_socket(): void
    {
        $owner = $this->dummy('socket_owner');
        $other = $this->dummy('socket_other');
        $credential = $owner->createToken('dummy-socket-owner');
        $second = $owner->createToken('dummy-socket-second');
        $foreign = $other->createToken('dummy-socket-foreign');
        $channel = 'private-App.Models.User.'.$owner->id.'.'.$credential->accessToken->id;
        foreach (['123.456', '123.789'] as $socket) {
            $this->channelAuth($credential->plainTextToken, $channel, $socket)
                ->assertOk()->assertJsonPath('auth', $this->hmac($channel, $socket));
        }
        foreach ([
            'private-App.Models.User.'.$other->id.'.'.$credential->accessToken->id,
            'private-App.Models.User.'.$other->id.'.'.$foreign->accessToken->id,
            'private-App.Models.User.'.$owner->id.'.'.$second->accessToken->id,
            'private-unregistered.'.$owner->id.'.'.$credential->accessToken->id,
        ] as $forbidden) {
            $this->channelAuth($credential->plainTextToken, $forbidden)->assertForbidden();
        }
        $this->channelAuth($credential->accessToken->id.'|dummy-forged-secret', $channel)->assertUnauthorized();
        $secret = explode('|', $credential->plainTextToken, 2)[1];
        $this->channelAuth($foreign->accessToken->id.'|'.$secret, $channel)->assertUnauthorized();
    }

    public function test_admin_inbox_allows_only_appropriate_admin_module_or_super_admin(): void
    {
        $cases = [
            ['plain', 'user', [], 'kepegawaian', 403],
            ['admin_none', 'admin', [], 'kepegawaian', 403],
            ['admin_kpg', 'admin', ['kepegawaian'], 'kepegawaian', 200],
            ['admin_kpg_st', 'admin', ['kepegawaian'], 'surat_tugas', 200],
            ['admin_cross', 'admin', ['kepegawaian'], 'bmn', 403],
            ['super_bmn', 'super_admin', [], 'bmn', 200],
            ['super_unknown', 'super_admin', [], 'not_a_module', 403],
        ];
        foreach ($cases as [$name, $role, $modules, $module, $status]) {
            $user = $this->dummy($name, ['role' => $role, 'access_modules' => $modules]);
            $credential = $user->createToken('dummy-admin-matrix');
            $channel = 'private-admin.inbox.'.$module.'.'.$credential->accessToken->id;
            $response = $this->channelAuth($credential->plainTextToken, $channel)->assertStatus($status);
            if ($status === 200) {
                $response->assertJsonPath('auth', $this->hmac($channel));
            }
        }
    }

    public function test_regular_module_reader_cannot_subscribe_to_admin_inbox(): void
    {
        $user = $this->dummy('module_reader', ['access_modules' => ['kepegawaian']]);
        $credential = $user->createToken('dummy-module-reader');
        $this->channelAuth($credential->plainTextToken, 'private-admin.inbox.kepegawaian.'.$credential->accessToken->id)
            ->assertForbidden();
    }

    public function test_legacy_topics_and_another_live_token_of_same_admin_are_denied(): void
    {
        $owner = $this->dummy('legacy_admin', ['role' => 'admin', 'access_modules' => ['kepegawaian']]);
        $credential = $owner->createToken('dummy-current-admin');
        $second = $owner->createToken('dummy-other-admin-session');
        foreach ([
            'private-App.Models.User.'.$owner->id,
            'private-admin.inbox.kepegawaian',
            'private-admin.inbox.kepegawaian.'.$second->accessToken->id,
        ] as $channel) {
            $this->channelAuth($credential->plainTextToken, $channel)->assertForbidden();
        }
    }

    public function test_expired_and_aged_persistent_bearer_credentials_cannot_authorize_channels(): void
    {
        $owner = $this->dummy('expired_channel');
        $fresh = $owner->createToken('dummy-fresh-token');
        $expired = $owner->createToken('dummy-explicitly-expired', ['*'], now()->subMinute());
        $aged = $owner->createToken('dummy-config-age-expired');
        DB::table('personal_access_tokens')->where('id', $aged->accessToken->id)
            ->update(['created_at' => now()->subMinutes(1441)]);
        $channel = 'private-App.Models.User.'.$owner->id.'.'.$fresh->accessToken->id;
        $this->channelAuth($fresh->plainTextToken, $channel)->assertOk()->assertJsonPath('auth', $this->hmac($channel));
        foreach ([$expired, $aged] as $invalid) {
            $topic = 'private-App.Models.User.'.$owner->id.'.'.$invalid->accessToken->id;
            $this->channelAuth($invalid->plainTextToken, $topic)->assertUnauthorized();
            $this->channelAuth($fresh->plainTextToken, $topic)->assertForbidden();
        }
    }

    public function test_revoked_token_id_cannot_be_authorized_by_another_live_token_of_active_owner(): void
    {
        $owner = $this->dummy('revoked_channel');
        $revoked = $owner->createToken('dummy-revoked');
        $fresh = $owner->createToken('dummy-surviving');
        $topic = 'private-App.Models.User.'.$owner->id.'.'.$revoked->accessToken->id;
        $revoked->accessToken->delete();
        $this->assertTrue($owner->refresh()->is_active);
        $this->channelAuth($revoked->plainTextToken, $topic)->assertUnauthorized();
        $this->channelAuth($fresh->plainTextToken, $topic)->assertForbidden();
    }

    public function test_real_session_cookie_requires_matching_persistent_bearer_for_broadcast_auth(): void
    {
        $owner = $this->dummy('cookie_channel');
        $other = $this->dummy('cookie_foreign');
        $login = $this->withHeader('Origin', 'http://localhost:3000')->postJson('/api/login', [
            'username' => $owner->username, 'password' => self::CURRENT_PASSWORD,
        ])->assertOk();
        $cookie = collect($login->headers->getCookies())->first(fn ($item) => $item->getName() === config('session.cookie'));
        $this->assertNotNull($cookie, 'Actual login must issue its session cookie.');
        $this->withUnencryptedCookies([$cookie->getName() => $cookie->getValue()])->withCredentials();
        $this->anonymous();
        $this->getJson('/api/me')->assertOk()->assertJsonPath('data.id', $owner->id);
        $token = $login->json('token');
        $tokenId = explode('|', $token, 2)[0];
        $channel = 'private-App.Models.User.'.$owner->id.'.'.$tokenId;
        $this->anonymous();
        $this->postJson('/api/broadcasting/auth', ['channel_name' => $channel, 'socket_id' => '123.456'])->assertForbidden();
        $this->anonymous();
        $this->withToken($token)->postJson('/api/broadcasting/auth', ['channel_name' => $channel, 'socket_id' => '123.456'])
            ->assertOk()->assertJsonPath('auth', $this->hmac($channel));
        $foreign = $other->createToken('dummy-cookie-foreign');
        $this->anonymous();
        $this->withToken($foreign->plainTextToken)->getJson('/api/me')->assertOk()->assertJsonPath('data.id', $owner->id);
        $this->anonymous();
        $this->postJson('/api/broadcasting/auth', [
            'channel_name' => 'private-App.Models.User.'.$other->id.'.'.$foreign->accessToken->id,
            'socket_id' => '123.456',
        ])->assertForbidden();
    }

    public function test_admin_authorization_rechecks_current_role_and_module_after_token_issuance(): void
    {
        $owner = $this->dummy('admin_fresh_state', [
            'role' => 'admin', 'access_modules' => ['kepegawaian'], 'permissions' => ['kepegawaian.view'],
        ]);
        $credential = $owner->createToken('dummy-admin-fresh-state');
        $channel = 'private-admin.inbox.kepegawaian.'.$credential->accessToken->id;
        $this->channelAuth($credential->plainTextToken, $channel)->assertOk()->assertJsonPath('auth', $this->hmac($channel));
        $owner->update(['access_modules' => []]);
        $this->channelAuth($credential->plainTextToken, $channel)->assertForbidden();
        $owner->update(['access_modules' => ['kepegawaian'], 'role' => 'user']);
        $this->channelAuth($credential->plainTextToken, $channel)->assertForbidden();
    }

    public function test_personal_event_fans_out_only_to_current_valid_persistent_owner_tokens(): void
    {
        $owner = $this->dummy('event_owner');
        $other = $this->dummy('event_other');
        $first = $owner->createToken('dummy-valid-one');
        $second = $owner->createToken('dummy-valid-two');
        $other->createToken('dummy-foreign-event');
        $owner->createToken('dummy-expired-event', ['*'], now()->subMinute());
        $aged = $owner->createToken('dummy-aged-event');
        DB::table('personal_access_tokens')->where('id', $aged->accessToken->id)
            ->update(['created_at' => now()->subMinutes(1441)]);
        $revoked = $owner->createToken('dummy-revoked-event');
        $revoked->accessToken->delete();
        $event = new PortalNotificationCreated($this->notice($owner));
        $this->assertEqualsCanonicalizing([
            'private-App.Models.User.'.$owner->id.'.'.$first->accessToken->id,
            'private-App.Models.User.'.$owner->id.'.'.$second->accessToken->id,
        ], $this->eventTopics($event));
        $first->accessToken->delete();
        $this->assertSame(['private-App.Models.User.'.$owner->id.'.'.$second->accessToken->id], $this->eventTopics($event));
    }

    public function test_personal_event_reloads_inactive_and_soft_deleted_owner_state(): void
    {
        $owner = $this->dummy('event_owner_state');
        $credential = $owner->createToken('dummy-owner-state');
        $event = new PortalNotificationCreated($this->notice($owner));
        $this->assertSame(['private-App.Models.User.'.$owner->id.'.'.$credential->accessToken->id], $this->eventTopics($event));
        $owner->update(['is_active' => false]);
        $this->assertSame([], $this->eventTopics($event));
        $owner->update(['is_active' => true]);
        $this->assertCount(1, $this->eventTopics($event));
        $owner->delete();
        $this->assertSame([], $this->eventTopics($event));
    }

    public function test_admin_event_fanout_filters_tokens_and_reloads_role_module_and_owner_state(): void
    {
        $admin = $this->dummy('event_admin', [
            'role' => 'admin', 'access_modules' => ['kepegawaian'], 'permissions' => ['kepegawaian.view'],
        ]);
        $super = $this->dummy('event_super', ['role' => 'super_admin']);
        $eligible = $admin->createToken('dummy-admin-valid');
        $superToken = $super->createToken('dummy-super-valid');
        foreach ([
            ['event_reader', 'user', ['kepegawaian'], true, false],
            ['event_cross', 'admin', ['bmn'], true, false],
            ['event_inactive', 'admin', ['kepegawaian'], false, false],
            ['event_deleted', 'admin', ['kepegawaian'], true, true],
        ] as [$name, $role, $modules, $active, $deleted]) {
            $user = $this->dummy($name, ['role' => $role, 'access_modules' => $modules, 'is_active' => $active]);
            $user->createToken('dummy-ineligible-admin');
            if ($deleted) $user->delete();
        }
        $admin->createToken('dummy-admin-expired', ['*'], now()->subMinute());
        $aged = $admin->createToken('dummy-admin-aged');
        DB::table('personal_access_tokens')->where('id', $aged->accessToken->id)
            ->update(['created_at' => now()->subMinutes(1441)]);
        $revoked = $admin->createToken('dummy-admin-revoked');
        $revoked->accessToken->delete();
        $event = new AdminInboxChanged('kepegawaian');
        $this->assertEqualsCanonicalizing([
            'private-admin.inbox.kepegawaian.'.$eligible->accessToken->id,
            'private-admin.inbox.kepegawaian.'.$superToken->accessToken->id,
        ], $this->eventTopics($event));
        $admin->update(['access_modules' => []]);
        $this->assertSame(['private-admin.inbox.kepegawaian.'.$superToken->accessToken->id], $this->eventTopics($event));
        $super->update(['role' => 'user']);
        $this->assertSame([], $this->eventTopics($event));
    }

    public function test_real_http_logout_and_login_rotation_remove_old_event_topics(): void
    {
        $owner = $this->dummy('event_rotate');
        $old = $owner->createToken('dummy-before-logout');
        $owner->createToken('dummy-second-before-logout');
        $event = new PortalNotificationCreated($this->notice($owner));
        $this->assertCount(2, $this->eventTopics($event));
        $this->bearer($old->plainTextToken);
        $this->postJson('/api/logout')->assertOk();
        $this->assertSame([], $this->eventTopics($event));
        $this->anonymous();
        $this->flushHeaders();
        $login = $this->postJson('/api/login', [
            'username' => $owner->username, 'password' => self::CURRENT_PASSWORD,
        ])->assertOk();
        $new = $login->json('token');
        $newId = explode('|', $new, 2)[0];
        $topic = 'private-App.Models.User.'.$owner->id.'.'.$newId;
        $this->assertSame([$topic], $this->eventTopics($event));
        $this->channelAuth($new, $topic)->assertOk()->assertJsonPath('auth', $this->hmac($topic));
        $this->channelAuth($old->plainTextToken, 'private-App.Models.User.'.$owner->id.'.'.$old->accessToken->id)
            ->assertUnauthorized();
    }

    public function test_admin_personal_notice_delivery_stops_after_module_withdrawal_even_with_retained_permission(): void
    {
        // Fake outbound events only; recipient selection and notification persistence remain real.
        Event::fake([AdminInboxChanged::class, PortalNotificationCreated::class]);
        $admin = $this->dummy('notice_withdrawn', [
            'role' => 'admin', 'access_modules' => ['kepegawaian'], 'permissions' => ['kepegawaian.view'],
        ]);
        $retained = $this->dummy('notice_retained', ['role' => 'admin', 'access_modules' => ['kepegawaian']]);
        $ordinary = $this->dummy('notice_regular');
        $credential = $admin->createToken('dummy-before-module-withdrawal');
        $service = app(PortalNotificationService::class);
        $this->assertSame(2, $service->notifyAdmins('kepegawaian', 'Dummy initial admin notice', 'Dummy private initial body'));
        $this->assertSame(1, PortalNotification::where('user_id', $admin->id)->count());
        $employee = Employee::create([
            'nip' => $admin->username, 'nama_lengkap' => 'Dummy Notice Access Subject', 'is_active' => true,
        ]);
        // Create the IAM operator after the initial recipient control so its own eligible inbox is explicit.
        $operator = $this->dummy('notice_iam_operator', ['role' => 'super_admin']);
        $operatorToken = $operator->createToken('dummy-iam-operator');
        $this->bearer($operatorToken->plainTextToken);
        $this->putJson('/api/kepegawaian/employees/'.$employee->id.'/access', [
            'role' => 'admin', 'access_modules' => [], 'permissions' => ['kepegawaian.view'],
        ])->assertOk()->assertJsonPath('data.access_modules', [])
            ->assertJsonPath('data.permissions', ['kepegawaian.view']);
        $this->assertDatabaseMissing('personal_access_tokens', ['id' => $credential->accessToken->id]);
        $this->bearer($credential->plainTextToken);
        $this->getJson('/api/portal/notifications')->assertUnauthorized();
        $this->anonymous();
        $this->flushHeaders();
        $login = $this->postJson('/api/login', [
            'username' => $admin->username, 'password' => self::CURRENT_PASSWORD,
        ])->assertOk()->assertJsonPath('data.id', $admin->id);
        $newToken = $login->json('token');
        $this->assertIsString($newToken);
        $this->bearer($newToken);
        $this->getJson('/api/kepegawaian/leave-requests')->assertForbidden();
        $recipientCount = $service->notifyAdmins('kepegawaian', 'Dummy withdrawn admin notice', 'Dummy private withdrawn body');
        if ($recipientCount === 3) {
            // On a red baseline, establish disclosure after real IAM withdrawal, token revocation, and legitimate re-login.
            $this->assertDatabaseHas('portal_notifications', [
                'user_id' => $admin->id,
                'title' => 'Dummy withdrawn admin notice',
                'message' => 'Dummy private withdrawn body',
            ]);
            $this->bearer($newToken);
            $this->getJson('/api/portal/notifications')->assertOk()->assertJsonFragment([
                'user_id' => $admin->id,
                'title' => 'Dummy withdrawn admin notice',
                'message' => 'Dummy private withdrawn body',
            ]);
        }
        $this->assertSame(2, $recipientCount);
        $this->assertSame(1, PortalNotification::where('user_id', $admin->id)->count());
        $this->assertSame(2, PortalNotification::where('user_id', $retained->id)->count());
        $this->assertSame(1, PortalNotification::where('user_id', $operator->id)->count());
        $notice = $service->notifyUser($ordinary->id, 'Dummy ordinary notice', 'Dummy ordinary personal body');
        $this->assertNotNull($notice);
        $this->assertSame($ordinary->id, $notice->user_id);
    }

    public function test_valid_http_reset_token_changes_password_revokes_tokens_and_cannot_be_reused(): void
    {
        $owner = $this->dummy('reset_valid');
        $owner->createToken('dummy-existing-session');
        $token = $this->resetTokenFromHttp($owner);
        $input = $this->resetInput($owner, $token);
        $this->postJson('/api/reset-password', $input)->assertOk();
        $this->assertTrue(Hash::check(self::NEW_PASSWORD, $owner->refresh()->password));
        $this->assertFalse(Hash::check(self::CURRENT_PASSWORD, $owner->password));
        $this->assertSame(0, $owner->tokens()->count());
        $this->assertDatabaseMissing('password_reset_tokens', ['email' => $owner->email]);
        $this->postJson('/api/reset-password', $input)->assertUnprocessable();
    }

    public function test_invalid_and_other_identity_reset_tokens_cannot_change_passwords(): void
    {
        $owner = $this->dummy('reset_owner');
        $other = $this->dummy('reset_foreign');
        $token = $this->resetTokenFromHttp($owner);
        $oldOwnerHash = $owner->password;
        $oldOtherHash = $other->password;
        $this->postJson('/api/reset-password', $this->resetInput($owner, 'dummy-invalid-token'))->assertUnprocessable();
        $this->postJson('/api/reset-password', $this->resetInput($other, $token))->assertUnprocessable();
        $this->assertSame($oldOwnerHash, $owner->refresh()->password);
        $this->assertSame($oldOtherHash, $other->refresh()->password);
    }

    public function test_expired_reset_token_cannot_change_password(): void
    {
        $owner = $this->dummy('reset_expired');
        $token = $this->resetTokenFromHttp($owner);
        $broker = config('auth.defaults.passwords');
        $expiry = (int) config('auth.passwords.'.$broker.'.expire');
        DB::table('password_reset_tokens')->where('email', $owner->email)
            ->update(['created_at' => now()->subMinutes($expiry + 1)]);
        $hash = $owner->password;
        $this->postJson('/api/reset-password', $this->resetInput($owner, $token))->assertUnprocessable();
        $this->assertSame($hash, $owner->refresh()->password);
    }

    public function test_email_verification_accepts_valid_signed_owner_hash_only(): void
    {
        $owner = $this->dummy('verify_valid', ['email_verified_at' => null]);
        $url = URL::temporarySignedRoute('verification.verify', now()->addMinutes(5), [
            'id' => $owner->id, 'hash' => sha1($owner->email),
        ]);
        $this->get($url)->assertRedirect();
        $this->assertNotNull($owner->refresh()->email_verified_at);
        $verified = $owner->email_verified_at->toISOString();
        $this->get($url)->assertRedirect();
        $this->assertSame($verified, $owner->refresh()->email_verified_at->toISOString());
    }

    public function test_email_verification_rejects_wrong_hash_expiry_unsigned_and_old_email(): void
    {
        $owner = $this->dummy('verify_invalid', ['email_verified_at' => null]);
        $parameters = ['id' => $owner->id, 'hash' => sha1($owner->email)];
        $expired = URL::temporarySignedRoute('verification.verify', now()->subMinute(), $parameters);
        $wrongHash = URL::temporarySignedRoute('verification.verify', now()->addMinutes(5), [
            'id' => $owner->id, 'hash' => sha1('another@identity.example.test'),
        ]);
        $oldEmailLink = URL::temporarySignedRoute('verification.verify', now()->addMinutes(5), $parameters);
        $this->get($expired)->assertForbidden();
        $this->get($wrongHash)->assertForbidden();
        $this->get('/api/email/verify/'.$owner->id.'/'.sha1($owner->email))->assertForbidden();
        Sanctum::actingAs($owner);
        $this->putJson('/api/me/email', [
            'email' => 'verify_replaced@identity.example.test', 'current_password' => self::CURRENT_PASSWORD,
        ])->assertOk();
        $this->anonymous();
        $this->get($oldEmailLink)->assertForbidden();
        $this->assertNull($owner->refresh()->email_verified_at);
    }

    public function test_alternate_profile_email_mutation_requires_current_password_and_cannot_target_other_user(): void
    {
        $owner = $this->dummy('profile_owner');
        $other = $this->dummy('profile_foreign');
        $oldEmail = $owner->email;
        $oldOtherEmail = $other->email;
        Sanctum::actingAs($owner);
        foreach ([[], ['current_password' => 'dummy-wrong-password']] as $proof) {
            $this->postJson('/api/me/update-profile', array_merge([
                'email' => 'profile_new@identity.example.test', 'user_id' => $other->id,
            ], $proof))->assertUnprocessable();
            $this->assertSame($oldEmail, $owner->refresh()->email);
            $this->assertNotNull($owner->email_verified_at);
        }
        $this->postJson('/api/me/update-profile', [
            'email' => 'profile_new@identity.example.test', 'current_password' => self::CURRENT_PASSWORD,
            'user_id' => $other->id, 'id' => $other->id,
        ])->assertOk();
        $this->assertSame('profile_new@identity.example.test', $owner->refresh()->email);
        $this->assertNull($owner->email_verified_at);
        $this->assertSame($oldOtherEmail, $other->refresh()->email);
    }

    public function test_dedicated_email_change_invalidates_reset_capability_before_address_reassignment(): void
    {
        $this->assertEmailReassignmentCannotTransferReset('putJson', '/api/me/email', 'dedicated');
    }

    public function test_alternate_profile_email_change_invalidates_reset_capability_before_address_reassignment(): void
    {
        $this->assertEmailReassignmentCannotTransferReset('postJson', '/api/me/update-profile', 'profile');
    }

    private function assertEmailReassignmentCannotTransferReset(string $method, string $route, string $suffix): void
    {
        $original = $this->dummy('former_'.$suffix);
        $nextOwner = $this->dummy('next_'.$suffix);
        $originalPasswordHash = $original->password;
        $oldEmail = $original->email;
        $token = $this->resetTokenFromHttp($original);
        Sanctum::actingAs($original);
        $this->{$method}($route, [
            'email' => 'replacement_'.$suffix.'@identity.example.test',
            'current_password' => self::CURRENT_PASSWORD,
        ])->assertOk();
        Sanctum::actingAs($nextOwner);
        $this->putJson('/api/me/email', [
            'email' => $oldEmail, 'current_password' => self::CURRENT_PASSWORD,
        ])->assertOk();
        $nextOwner->refresh();
        // The successor proves ownership of the reassigned address using its own signed link.
        $this->anonymous();
        $this->get(URL::temporarySignedRoute('verification.verify', now()->addMinutes(5), [
            'id' => $nextOwner->id, 'hash' => sha1($oldEmail),
        ]))->assertRedirect();
        $oldHash = $nextOwner->refresh()->password;
        $response = $this->postJson('/api/reset-password', $this->resetInput($nextOwner, $token));
        $this->assertSame($originalPasswordHash, $original->refresh()->password, 'Predecessor password must remain unchanged.');
        if ($response->isSuccessful()) {
            // On a red baseline, establish that the reset changed the successor, not the token's issuer.
            $this->assertTrue(Hash::check(self::NEW_PASSWORD, $nextOwner->refresh()->password));
            $this->assertFalse(Hash::check(self::CURRENT_PASSWORD, $nextOwner->password));
        }
        $response->assertUnprocessable();
        $this->assertSame($oldHash, $nextOwner->refresh()->password);
    }
}
