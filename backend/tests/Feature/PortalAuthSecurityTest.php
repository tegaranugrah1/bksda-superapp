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
