<?php

namespace Tests\Feature;

use App\Models\User;
use App\Support\Security\Totp;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Notification;
use Illuminate\Testing\TestResponse;
use Laravel\Sanctum\PersonalAccessToken;
use Laravel\Sanctum\TransientToken;
use Tests\TestCase;

class PortalAuthSecurityTest extends TestCase
{
    use RefreshDatabase;

    private const PASSWORD = 'DummyPassword-ForAudit42!';
    private const RECOVERY = 'AUDITCODE1';

    protected function setUp(): void
    {
        parent::setUp();
        config([
            'sanctum.stateful' => ['localhost:3000'],
            'session.driver' => 'file',
            'session.files' => storage_path('framework/sessions'),
            'session.secure' => false,
            'auth.two_factor_enforce' => false,
            'cache.default' => 'array',
            'mail.default' => 'array',
        ]);
        if (! is_dir(config('session.files'))) {
            mkdir(config('session.files'), 0700, true);
        }
        Cache::flush();
        Mail::fake();
        Notification::fake();
        $this->withCredentials();
    }

    private function principal(string $suffix, bool $withFactor = false): User
    {
        return User::create([
            'name' => 'Dummy Audit '.$suffix,
            'username' => 'audit-'.$suffix,
            'email' => $suffix.'@auth.example.test',
            'email_verified_at' => now(),
            'password' => Hash::make(self::PASSWORD),
            'role' => 'user',
            'access_modules' => [],
            'is_active' => true,
            'must_change_password' => false,
            'two_factor_secret' => $withFactor ? Totp::generateSecret(16) : null,
            'two_factor_confirmed_at' => $withFactor ? now() : null,
            'two_factor_recovery_codes' => $withFactor ? [hash('sha256', self::RECOVERY)] : null,
        ]);
    }

    /** Replay actual encrypted response cookies; do not inject an actingAs user. */
    private function requestAsBrowser(string $method, string $uri, array $body = [], array $cookies = [], ?string $bearer = null, bool $stateful = true): TestResponse
    {
        // A PHPUnit process serves many requests; forget per-request auth/session
        // objects so a prior principal cannot impersonate a fresh browser request.
        $this->app['auth']->setDefaultDriver('web');
        $this->app['auth']->forgetGuards();
        $this->app['session']->forgetDrivers();
        $this->app->forgetInstance('session.store');
        $this->defaultCookies = [];
        $this->unencryptedCookies = [];
        $this->withUnencryptedCookies($cookies);
        $headers = $stateful ? [
            'Origin' => 'http://localhost:3000',
            'Referer' => 'http://localhost:3000/portal',
        ] : [];
        if ($bearer !== null) {
            $headers['Authorization'] = 'Bearer '.$bearer;
        }

        return $this->json($method, $uri, $body, $headers);
    }

    private function responseCookies(TestResponse $response, array $cookies = []): array
    {
        foreach ($response->headers->getCookies() as $cookie) {
            if ($cookie->getExpiresTime() !== 0 && $cookie->getExpiresTime() <= time()) {
                unset($cookies[$cookie->getName()]);
            } else {
                $cookies[$cookie->getName()] = $cookie->getValue();
            }
        }
        return $cookies;
    }

    private function login(User $user): array
    {
        $response = $this->requestAsBrowser('POST', '/api/login', [
            'username' => $user->username,
            'password' => self::PASSWORD,
        ]);
        $response->assertOk();
        $cookies = $this->responseCookies($response);
        if ($user->two_factor_confirmed_at !== null) {
            $response->assertJsonPath('requires_2fa', true);
            $response = $this->requestAsBrowser('POST', '/api/login/2fa', [
                'challenge_token' => $response->json('challenge_token'),
                'code' => self::RECOVERY,
            ], $cookies);
            $response->assertOk();
            $cookies = $this->responseCookies($response, $cookies);
        }
        $token = $response->json('token');
        $this->assertIsString($token);
        $this->assertNotEmpty($token);
        $this->assertArrayHasKey(config('session.cookie'), $cookies);
        return [$token, $cookies];
    }

    public function test_real_login_issues_working_cookie_and_bearer_credentials(): void
    {
        $user = $this->principal('positive-login');
        [$token, $cookies] = $this->login($user);
        $this->requestAsBrowser('GET', '/api/me', cookies: $cookies)
            ->assertOk()->assertJsonPath('data.username', $user->username);
        $this->requestAsBrowser('GET', '/api/me', bearer: $token, stateful: false)
            ->assertOk()->assertJsonPath('data.username', $user->username);
    }

    public function test_initial_factor_setup_and_confirmation_remain_available(): void
    {
        $user = $this->principal('initial-factor');
        [$token] = $this->login($user);
        $setup = $this->requestAsBrowser('POST', '/api/me/2fa/enable', bearer: $token, stateful: false);
        $setup->assertOk();
        $secret = $setup->json('secret');
        $this->assertIsString($secret);
        $code = Totp::calculateCode($secret, (int) floor(time() / 30));
        $confirmed = $this->requestAsBrowser('POST', '/api/me/2fa/confirm', ['code' => $code], bearer: $token, stateful: false);
        $confirmed->assertOk()->assertJsonCount(8, 'recovery_codes');
        $this->assertNotNull($user->fresh()->two_factor_confirmed_at);
        $this->assertTrue($user->fresh()->two_factor_secret === $secret);
        $audit = \App\Models\AuditLog::where('url', 'like', '%/me/2fa/confirm')->latest('id')->firstOrFail();
        $this->assertSame('[redacted]', $audit->payload['code']);
    }

    public function test_enrollment_without_step_up_cannot_replace_an_already_confirmed_factor(): void
    {
        $user = $this->principal('factor-replacement', true);
        $originalSecret = $user->two_factor_secret;
        [$token] = $this->login($user);
        $this->requestAsBrowser('GET', '/api/me', bearer: $token, stateful: false)->assertOk();
        $response = $this->requestAsBrowser('POST', '/api/me/2fa/enable', bearer: $token, stateful: false);
        $this->assertTrue($user->fresh()->two_factor_secret === $originalSecret, 'Existing confirmed factor was overwritten without password or old-factor proof.');
        $this->assertNotNull($user->fresh()->two_factor_confirmed_at, 'Existing confirmed factor was disabled by starting enrollment.');
        $this->assertContains($response->status(), [403, 409, 422]);
    }

    public function test_deactivated_account_cannot_reuse_its_previous_cookie_session(): void
    {
        $user = $this->principal('inactive-session');
        [$token, $cookies] = $this->login($user);
        $before = $this->requestAsBrowser('GET', '/api/me', cookies: $cookies);
        $before->assertOk();
        $cookies = $this->responseCookies($before, $cookies);
        // Reproduce the DB state of account deactivation: row retained, bearer revoked.
        $user->update(['is_active' => false]);
        $user->tokens()->delete();
        $response = $this->requestAsBrowser('GET', '/api/me', cookies: $cookies);
        $this->assertContains($response->status(), [401, 403], 'Inactive account was accepted through its prior cookie session.');
    }

    public function test_deactivated_account_cannot_finish_a_previously_issued_2fa_challenge(): void
    {
        $user = $this->principal('inactive-challenge', true);
        $challenge = $this->requestAsBrowser('POST', '/api/login', [
            'username' => $user->username,
            'password' => self::PASSWORD,
        ]);
        $challenge->assertOk()->assertJsonPath('requires_2fa', true);
        $user->update(['is_active' => false]);
        $user->tokens()->delete();
        $response = $this->requestAsBrowser('POST', '/api/login/2fa', [
            'challenge_token' => $challenge->json('challenge_token'),
            'code' => self::RECOVERY,
        ], $this->responseCookies($challenge));
        $this->assertContains($response->status(), [401, 403, 422], 'An inactive account completed a pending challenge and obtained fresh credentials.');
        $this->assertNull($response->json('token'));
        $this->assertSame(0, $user->tokens()->count());
    }

    public function test_mixed_cookie_and_bearer_logout_revokes_the_persistent_bearer(): void
    {
        $user = $this->principal('mixed-logout');
        [$token, $cookies] = $this->login($user);
        $before = $this->requestAsBrowser('GET', '/api/me', cookies: $cookies, bearer: $token);
        $before->assertOk();
        $this->assertInstanceOf(TransientToken::class, $this->app['auth']->guard('sanctum')->user()->currentAccessToken());
        $cookies = $this->responseCookies($before, $cookies);
        $this->requestAsBrowser('POST', '/api/logout', cookies: $cookies, bearer: $token)->assertOk();
        // Separate cookie-free client proves whether the retained bearer still authorizes a read.
        $this->requestAsBrowser('GET', '/api/me', bearer: $token, stateful: false)->assertUnauthorized();
        $this->assertNull(PersonalAccessToken::findToken($token));
    }

    public function test_password_reset_invalidates_an_unfinished_two_factor_login(): void
    {
        $user = $this->principal('reset-challenge', true);
        $challenge = $this->requestAsBrowser('POST', '/api/login', [
            'username' => $user->username, 'password' => self::PASSWORD,
        ])->assertOk()->assertJsonPath('requires_2fa', true);

        // Complete the actual password-broker flow after the first login factor.
        $resetToken = \Illuminate\Support\Facades\Password::createToken($user);
        $this->requestAsBrowser('POST', '/api/reset-password', [
            'email' => $user->email, 'token' => $resetToken,
            'password' => 'Replacement-DummyPassword42!',
            'password_confirmation' => 'Replacement-DummyPassword42!',
        ])->assertOk();

        $this->requestAsBrowser('POST', '/api/login/2fa', [
            'challenge_token' => $challenge->json('challenge_token'), 'code' => self::RECOVERY,
        ])->assertUnprocessable()->assertJsonValidationErrors('challenge_token');
        $this->assertSame(0, $user->tokens()->count());
        $this->assertSame([hash('sha256', self::RECOVERY)], $user->fresh()->two_factor_recovery_codes);
    }

    public function test_factor_replacement_invalidates_an_unfinished_two_factor_login(): void
    {
        $user = $this->principal('replaced-challenge', true);
        $challenge = $this->requestAsBrowser('POST', '/api/login', [
            'username' => $user->username, 'password' => self::PASSWORD,
        ])->assertOk()->assertJsonPath('requires_2fa', true);
        $user->update(['two_factor_secret' => Totp::generateSecret(16)]);
        $newCode = Totp::calculateCode($user->fresh()->two_factor_secret, (int) floor(time() / 30));
        $this->requestAsBrowser('POST', '/api/login/2fa', [
            'challenge_token' => $challenge->json('challenge_token'), 'code' => $newCode,
        ])->assertUnprocessable()->assertJsonValidationErrors('challenge_token');
        $this->assertSame(0, $user->tokens()->count());
    }

    public function test_invalid_two_factor_attempt_does_not_extend_the_login_challenge_deadline(): void
    {
        $user = $this->principal('fixed-challenge-deadline', true);
        $challenge = $this->requestAsBrowser('POST', '/api/login', [
            'username' => $user->username, 'password' => self::PASSWORD,
        ])->assertOk()->assertJsonPath('requires_2fa', true);
        $this->travel(4)->minutes();
        $this->requestAsBrowser('POST', '/api/login/2fa', [
            'challenge_token' => $challenge->json('challenge_token'), 'code' => 'INVALIDCODE',
        ])->assertUnprocessable()->assertJsonValidationErrors('code');
        $this->travel(2)->minutes();
        $this->requestAsBrowser('POST', '/api/login/2fa', [
            'challenge_token' => $challenge->json('challenge_token'), 'code' => self::RECOVERY,
        ])->assertUnprocessable()->assertJsonValidationErrors('challenge_token');
        $this->assertSame(0, $user->tokens()->count());
        $this->assertSame([hash('sha256', self::RECOVERY)], $user->fresh()->two_factor_recovery_codes);
        $this->travelBack();
    }

    public function test_five_invalid_two_factor_attempts_end_the_challenge_but_allow_fresh_login(): void
    {
        $user = $this->principal('challenge-attempt-limit', true);
        $challenge = $this->requestAsBrowser('POST', '/api/login', [
            'username' => $user->username, 'password' => self::PASSWORD,
        ])->assertOk();
        for ($attempt = 0; $attempt < 5; $attempt++) {
            $this->requestAsBrowser('POST', '/api/login/2fa', [
                'challenge_token' => $challenge->json('challenge_token'), 'code' => 'INVALIDCODE',
            ])->assertUnprocessable()->assertJsonValidationErrors('code');
        }
        $this->travel(61)->seconds();
        $this->requestAsBrowser('POST', '/api/login/2fa', [
            'challenge_token' => $challenge->json('challenge_token'), 'code' => self::RECOVERY,
        ])->assertUnprocessable()->assertJsonValidationErrors('challenge_token');
        $this->assertSame(0, $user->tokens()->count());
        [$token] = $this->login($user->fresh());
        $this->requestAsBrowser('GET', '/api/me', bearer: $token, stateful: false)->assertOk();
        $this->travelBack();
    }

    public function test_audit_log_does_not_retain_a_live_query_bearer_token(): void
    {
        $user = $this->principal('audit-query-token');
        [$token] = $this->login($user);
        $this->requestAsBrowser('POST', '/api/me/update-profile?'.http_build_query([
            'token' => $token, 'view' => 'contacts',
        ]), ['phone' => '080000000001', 'code' => 'ROOM-17'], stateful: false)->assertOk();
        $audit = \App\Models\AuditLog::where('url', 'like', '%/me/update-profile%')->latest('id')->firstOrFail();
        // On a vulnerable version, prove the logged credential still authenticates a fresh client.
        parse_str(parse_url($audit->url, PHP_URL_QUERY) ?? '', $query);
        if (isset($query['token'])) {
            $this->requestAsBrowser('GET', '/api/me', bearer: $query['token'], stateful: false)
                ->assertOk()->assertJsonPath('data.id', $user->id);
        }
        $this->assertArrayNotHasKey('token', $query);
        $this->assertStringNotContainsString($token, $audit->url);
        $this->assertSame('[redacted]', $audit->payload['token']);
        $this->assertSame('contacts', $audit->payload['view']);
        $this->assertSame('ROOM-17', $audit->payload['code']);
    }

    public function test_audit_log_does_not_retain_two_factor_recovery_input(): void
    {
        $this->login($this->principal('audit-recovery', true));
        $audit = \App\Models\AuditLog::where('url', 'like', '%/login/2fa')->latest('id')->firstOrFail();
        $this->assertSame('[redacted]', $audit->payload['code']);
        $this->assertSame('[redacted]', $audit->payload['challenge_token']);
    }

    public function test_audit_log_does_not_retain_a_public_share_capability_in_the_path(): void
    {
        $owner = $this->principal('audit-share');
        $file = \App\Models\DriveFile::create([
            'user_id' => $owner->id, 'name' => 'dummy-private.pdf',
            's3_key' => 'dummy/audit-share.pdf', 'mime_type' => 'application/pdf', 'size_bytes' => 20,
        ]);
        $share = \App\Models\DriveShare::create([
            'file_id' => $file->id, 'share_type' => 'public', 'role' => 'viewer',
            'token' => 'dummy-share-'.str_repeat('a', 40), 'created_by' => $owner->id,
        ]);
        config(['filesystems.drive_public_share_enabled' => true]);
        \Illuminate\Support\Facades\Storage::fake('drive_signer')->buildTemporaryUrlsUsing(
            fn () => 'http://localhost/dummy-signed-object'
        );
        $this->requestAsBrowser('POST', '/api/drive/s/'.$share->token.'/download', stateful: false)
            ->assertOk()->assertJsonPath('url', 'http://localhost/dummy-signed-object');
        $audit = \App\Models\AuditLog::where('url', 'like', '%/drive/s/%')->latest('id')->firstOrFail();
        $this->assertStringNotContainsString($share->token, $audit->url);
        $this->assertStringContainsString('/api/drive/s/{token}/download', $audit->url);
    }

    public function test_private_document_query_tokens_respect_both_expiry_modes_and_account_deactivation(): void
    {
        $user = $this->principal('file-token');
        $employee = \App\Modules\Kepegawaian\Models\Employee::create([
            'nip' => $user->username, 'nama_lengkap' => 'Dummy Private File Owner',
            'jabatan' => 'Dummy PNS', 'satuan_kerja' => 'Dummy Unit', 'is_active' => true,
        ]);
        \Illuminate\Support\Facades\Storage::fake('local')->put('audit-fixtures/private.pdf', "%PDF-1.4\nDUMMY PRIVATE FILE\n%%EOF");
        $asset = \App\Modules\Bmn\Models\Asset::create([
            'kode_barang' => 'DUMMY-EXPIRY', 'nup' => '1001', 'nama_barang' => 'Dummy Private Vehicle',
            'employee_id' => $employee->id, 'bpkb_document_path' => 'audit-fixtures/private.pdf',
            'bpkb_document_mime' => 'application/pdf',
        ]);
        $token = $user->createToken('dummy-private-file')->plainTextToken;
        $credential = PersonalAccessToken::findToken($token);
        $url = "/api/bmn/assets/{$asset->id}/document/bpkb/view?token=".rawurlencode($token);
        $this->requestAsBrowser('GET', $url, stateful: false)->assertOk();
        $credential->update(['expires_at' => now()->subSecond()]);
        $this->requestAsBrowser('GET', $url, stateful: false)->assertUnauthorized();
        $credential->update(['expires_at' => now()->addHour()]);
        $this->requestAsBrowser('GET', $url, stateful: false)->assertOk();
        config(['sanctum.expiration' => 60]);
        $credential->forceFill(['created_at' => now()->subMinutes(61)])->save();
        $this->requestAsBrowser('GET', $url, stateful: false)->assertUnauthorized();
        $credential->forceFill(['created_at' => now()])->save();
        $this->requestAsBrowser('GET', $url, stateful: false)->assertOk();
        $user->update(['is_active' => false]);
        $this->requestAsBrowser('GET', $url, stateful: false)->assertForbidden()
            ->assertJsonPath('reason', 'account_inactive');
        $this->assertNull(PersonalAccessToken::findToken($token));
    }

    public function test_both_portal_email_edit_routes_require_password_and_preserve_other_employees(): void
    {
        $other = $this->principal('email-counterparty');
        $otherEmployee = \App\Modules\Kepegawaian\Models\Employee::create([
            'nip' => $other->username, 'nama_lengkap' => 'Dummy Other Email Owner', 'email' => $other->email,
        ]);
        $otherReset = \Illuminate\Support\Facades\Password::createToken($other);
        foreach (['/api/me/email' => 'PUT', '/api/me/update-profile' => 'POST'] as $endpoint => $method) {
            $suffix = $method === 'PUT' ? 'email-dialog' : 'email-profile';
            $user = $this->principal($suffix);
            $employee = \App\Modules\Kepegawaian\Models\Employee::create([
                'nip' => $user->username, 'nama_lengkap' => 'Dummy Email Owner '.$suffix, 'email' => $user->email,
            ]);
            [$token] = $this->login($user);
            $reset = \Illuminate\Support\Facades\Password::createToken($user);
            $oldVerification = \Illuminate\Support\Facades\URL::temporarySignedRoute('verification.verify', now()->addMinutes(10), [
                'id' => $user->id, 'hash' => sha1($user->email),
            ]);
            $newEmail = $suffix.'-changed@auth.example.test';
            $payload = [
                'email' => $newEmail, 'current_password' => self::PASSWORD,
                'user_id' => $other->id, 'employee_id' => $otherEmployee->id,
            ];
            $this->requestAsBrowser($method, $endpoint, array_merge($payload, [
                'current_password' => 'Wrong-DummyPassword!',
            ]), bearer: $token, stateful: false)->assertUnprocessable()->assertJsonValidationErrors('current_password');
            $this->assertSame($user->email, $user->fresh()->email);
            $this->assertTrue(\Illuminate\Support\Facades\Password::tokenExists($user, $reset));

            $this->requestAsBrowser($method, $endpoint, $payload, bearer: $token, stateful: false)
                ->assertOk()->assertJsonPath('email_changed', true)->assertJsonPath('cooldown_seconds', 60);
            $this->assertSame($newEmail, $user->fresh()->email);
            $this->assertSame($newEmail, $employee->fresh()->email);
            $this->assertNull($user->fresh()->email_verified_at);
            $this->assertFalse(\Illuminate\Support\Facades\Password::tokenExists($user, $reset));
            $this->requestAsBrowser('GET', $oldVerification, stateful: false)->assertForbidden();
            $this->assertSame($other->email, $other->fresh()->email);
            $this->assertSame($other->email, $otherEmployee->fresh()->email);
            $this->assertTrue(\Illuminate\Support\Facades\Password::tokenExists($other, $otherReset));
        }
    }

    public function test_permission_routes_authenticate_before_evaluating_permissions(): void
    {
        $checked = 0;
        foreach (\Illuminate\Support\Facades\Route::getRoutes() as $route) {
            $middleware = $route->gatherMiddleware();
            foreach ($middleware as $position => $entry) {
                if (! is_string($entry) || ! str_starts_with($entry, 'permission:')) {
                    continue;
                }
                $authentication = array_search('auth:sanctum', $middleware, true);
                $this->assertNotFalse($authentication, $route->uri().' requires Sanctum before permission checks.');
                $this->assertLessThan($position, $authentication, $route->uri().' authenticates before authorization.');
                $checked++;
            }
        }
        $this->assertGreaterThan(0, $checked);
    }

    public function test_password_reset_revokes_browser_bearer_and_remember_credentials(): void
    {
        $user = $this->principal('reset-all-credentials');
        [$token, $cookies] = $this->login($user);
        $this->requestAsBrowser('GET', '/api/me', cookies: $cookies)->assertOk();
        $rememberCookies = $cookies;
        unset($rememberCookies[config('session.cookie')]);
        $this->assertArrayHasKey($this->app['auth']->guard('web')->getRecallerName(), $rememberCookies);
        $this->requestAsBrowser('GET', '/api/me', cookies: $rememberCookies)->assertOk();
        $resetToken = \Illuminate\Support\Facades\Password::createToken($user);
        $payload = [
            'email' => $user->email, 'token' => $resetToken,
            'password' => 'Dummy-Reset-All-Credentials42!',
            'password_confirmation' => 'Dummy-Reset-All-Credentials42!',
        ];
        $this->requestAsBrowser('POST', '/api/reset-password', $payload, stateful: false)->assertOk();
        $this->requestAsBrowser('GET', '/api/me', cookies: $cookies)->assertUnauthorized();
        $this->requestAsBrowser('GET', '/api/me', bearer: $token, stateful: false)->assertUnauthorized();
        $this->requestAsBrowser('GET', '/api/me', cookies: $rememberCookies)->assertUnauthorized();
        $this->assertNull(PersonalAccessToken::findToken($token));
        $freshLogin = $this->requestAsBrowser('POST', '/api/login', [
            'username' => $user->username, 'password' => $payload['password'],
        ], stateful: false)->assertOk();
        $freshToken = $freshLogin->json('token');
        $this->assertNotEmpty($freshToken);
        $this->requestAsBrowser('POST', '/api/reset-password', $payload, stateful: false)->assertUnprocessable();
        $this->requestAsBrowser('GET', '/api/me', bearer: $freshToken, stateful: false)
            ->assertOk()->assertJsonPath('data.id', $user->id);
    }

    public function test_two_factor_recovery_proof_cannot_be_consumed_by_two_overlapping_completions(): void
    {
        $user = $this->principal('recovery-overlap', true);
        $challenges = [];
        foreach ([1, 2] as $attempt) {
            $challenges[] = $this->requestAsBrowser('POST', '/api/login', [
                'username' => $user->username, 'password' => self::PASSWORD,
            ], stateful: false)->assertOk()->json('challenge_token');
        }
        $inner = null;
        $entered = false;
        User::retrieved(function (User $snapshot) use ($user, $challenges, &$entered, &$inner) {
            if ($snapshot->id === $user->id && ! $entered) {
                $entered = true;
                // Complete the second HTTP request after the first read its account snapshot.
                $inner = $this->requestAsBrowser('POST', '/api/login/2fa', [
                    'challenge_token' => $challenges[1], 'code' => self::RECOVERY,
                ], stateful: false);
            }
        });
        $outer = $this->requestAsBrowser('POST', '/api/login/2fa', [
            'challenge_token' => $challenges[0], 'code' => self::RECOVERY,
        ], stateful: false);
        $this->assertTrue($entered);
        $inner->assertOk();
        $outer->assertUnprocessable();
        $this->assertSame([], $user->fresh()->two_factor_recovery_codes);
    }

    public function test_totp_replay_claim_is_atomic_between_overlapping_completions(): void
    {
        $user = $this->principal('totp-overlap', true);
        $challenges = [];
        foreach ([1, 2] as $attempt) {
            $challenges[] = $this->requestAsBrowser('POST', '/api/login', [
                'username' => $user->username, 'password' => self::PASSWORD,
            ], stateful: false)->assertOk()->json('challenge_token');
        }
        $code = Totp::calculateCode($user->two_factor_secret, (int) floor(time() / 30));
        $repository = new class(Cache::getStore()) extends \Illuminate\Cache\Repository {
            public $interleave;
            public bool $entered = false;
            private function interleave(string $key): void
            {
                if (str_starts_with($key, 'totp_used:') && ! $this->entered) {
                    $this->entered = true;
                    ($this->interleave)();
                }
            }
            public function has($key): bool
            {
                $exists = parent::has($key);
                $this->interleave($key);
                return $exists;
            }
            public function add($key, $value, $ttl = null)
            {
                $this->interleave($key);
                return parent::add($key, $value, $ttl);
            }
        };
        $inner = null;
        $repository->interleave = function () use ($challenges, $code, &$inner) {
            $inner = $this->requestAsBrowser('POST', '/api/login/2fa', [
                'challenge_token' => $challenges[1], 'code' => $code,
            ], stateful: false);
        };
        Cache::swap($repository);
        $outer = $this->requestAsBrowser('POST', '/api/login/2fa', [
            'challenge_token' => $challenges[0], 'code' => $code,
        ], stateful: false);
        $this->assertTrue($repository->entered);
        $inner->assertOk();
        $outer->assertUnprocessable();
    }

    public function test_confirmed_factor_cannot_regenerate_recovery_codes_via_setup_confirmation(): void
    {
        $user = $this->principal('repeat-confirmation', true);
        [$token] = $this->login($user);
        $user = $user->fresh();
        $originalRecoveryCodes = $user->two_factor_recovery_codes;
        $code = Totp::calculateCode($user->two_factor_secret, (int) floor(time() / 30));
        $response = $this->requestAsBrowser('POST', '/api/me/2fa/confirm', ['code' => $code], bearer: $token, stateful: false);
        $response->assertStatus(409);
        $this->assertSame($originalRecoveryCodes, $user->fresh()->two_factor_recovery_codes);
    }

    public function test_forced_password_change_clears_the_lock_and_allows_fresh_login(): void
    {
        $user = $this->principal('forced-password');
        $user->update(['must_change_password' => true]);
        [$token, $cookies] = $this->login($user);
        $this->requestAsBrowser('GET', '/api/me/assets', cookies: $cookies, bearer: $token)
            ->assertStatus(423);
        $newPassword = 'DummyReplacement-ForAudit43!';
        $this->requestAsBrowser('POST', '/api/me/change-password', [
            'current_password' => self::PASSWORD,
            'new_password' => $newPassword,
            'new_password_confirmation' => $newPassword,
        ], $cookies, $token)->assertOk();
        $this->assertFalse($user->fresh()->must_change_password);
        $this->assertSame(0, $user->tokens()->count());
        $login = $this->requestAsBrowser('POST', '/api/login', [
            'username' => $user->username,
            'password' => $newPassword,
        ]);
        $login->assertOk();
        $this->requestAsBrowser('GET', '/api/me/assets', bearer: $login->json('token'), stateful: false)
            ->assertOk();
    }
}
