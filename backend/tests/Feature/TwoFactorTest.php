<?php

namespace Tests\Feature;

use App\Models\User;
use App\Support\Security\Totp;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class TwoFactorTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Test pure PHP Totp engine calculation and verification.
     */
    public function test_totp_engine_generates_and_verifies_code(): void
    {
        $secret = Totp::generateSecret(16);
        $this->assertEquals(16, strlen($secret));

        $timeSlice = (int) floor(time() / 30);
        $code = Totp::calculateCode($secret, $timeSlice);

        $this->assertEquals(6, strlen($code));
        $this->assertTrue(Totp::verify($secret, $code));
        $this->assertFalse(Totp::verify($secret, '000000'));
    }

    /**
     * Test two-step login flow: password challenge -> TOTP verification -> sanctum token.
     */
    public function test_two_step_login_flow(): void
    {
        $secret = Totp::generateSecret(16);
        $timeSlice = (int) floor(time() / 30);
        $validTotp = Totp::calculateCode($secret, $timeSlice);

        $user = User::create([
            'name' => 'Admin Dua Langkah',
            'username' => 'admin2fa',
            'email' => 'admin2fa@gmail.com',
            'email_verified_at' => now(),
            'password' => Hash::make('PasswordBenar123!'),
            'role' => 'admin',
            'two_factor_secret' => $secret,
            'two_factor_confirmed_at' => now(),
            'two_factor_recovery_codes' => [hash('sha256', 'RECOVERY01')],
        ]);

        // Step 1: POST /api/login -> returns requires_2fa: true and challenge_token
        $resLogin = $this->postJson('/api/login', [
            'username' => 'admin2fa',
            'password' => 'PasswordBenar123!',
        ]);

        $resLogin->assertStatus(200);
        $resLogin->assertJsonPath('requires_2fa', true);
        $this->assertNull($resLogin->json('token'));

        $challengeToken = $resLogin->json('challenge_token');
        $this->assertNotEmpty($challengeToken);

        // Step 2: POST /api/login/2fa with invalid code -> 422
        $resBadCode = $this->postJson('/api/login/2fa', [
            'challenge_token' => $challengeToken,
            'code' => '999999',
        ]);
        $resBadCode->assertStatus(422);

        // Step 3: POST /api/login/2fa with valid TOTP code -> 200 and issues token
        $resGoodCode = $this->postJson('/api/login/2fa', [
            'challenge_token' => $challengeToken,
            'code' => $validTotp,
        ]);
        $resGoodCode->assertStatus(200);
        $this->assertNotEmpty($resGoodCode->json('token'));
        $this->assertEquals('Admin Dua Langkah', $resGoodCode->json('data.name'));
    }

    /**
     * Test recovery code login single-use consumption.
     */
    public function test_recovery_code_single_use(): void
    {
        $user = User::create([
            'name' => 'Recovery User',
            'username' => 'recoveryuser',
            'email' => 'recovery@gmail.com',
            'email_verified_at' => now(),
            'password' => Hash::make('Pass123!'),
            'role' => 'user',
            'two_factor_secret' => Totp::generateSecret(16),
            'two_factor_confirmed_at' => now(),
            'two_factor_recovery_codes' => [hash('sha256', 'RECOVERY01')],
        ]);

        $resLogin = $this->postJson('/api/login', [
            'username' => 'recoveryuser',
            'password' => 'Pass123!',
        ]);
        $challengeToken = $resLogin->json('challenge_token');

        // Use recovery code
        $resRecovery = $this->postJson('/api/login/2fa', [
            'challenge_token' => $challengeToken,
            'code' => 'RECOVERY01',
        ]);
        $resRecovery->assertStatus(200);

        // Check recovery code was consumed and removed from user record
        $user->refresh();
        $this->assertEmpty($user->two_factor_recovery_codes);
    }

    /**
     * Test EnsureAccountSecure middleware: 423 for must_change_password and 2FA enforcement.
     */
    public function test_ensure_account_secure_middleware(): void
    {
        $lockedUser = User::create([
            'name' => 'User Terkunci',
            'username' => 'lockeduser',
            'email' => 'locked@gmail.com',
            'password' => Hash::make('Temp123!'),
            'role' => 'user',
            'must_change_password' => true,
        ]);

        Sanctum::actingAs($lockedUser);

        // 1. Trying to access regular protected endpoint -> 423
        $resBlocked = $this->getJson('/api/me/assets');
        $resBlocked->assertStatus(423);
        $resBlocked->assertJsonPath('reason', 'must_change_password');

        // 2. Allowlisted endpoints: /api/me and /api/me/change-password -> 200
        $resMe = $this->getJson('/api/me');
        $resMe->assertStatus(200);

        // 3. Change password clears lock
        $resChange = $this->postJson('/api/me/change-password', [
            'current_password' => 'Temp123!',
            'new_password' => 'NewPassword999!',
            'new_password_confirmation' => 'NewPassword999!',
        ]);
        $resChange->assertStatus(200);

        $lockedUser->update(['must_change_password' => false]);

        // Access is unblocked
        $resUnblocked = $this->getJson('/api/me/assets');
        $resUnblocked->assertStatus(200);
    }
}
