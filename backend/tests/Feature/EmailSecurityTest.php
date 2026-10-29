<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Auth\Notifications\VerifyEmail;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Password;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class EmailSecurityTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Test hasDeliverableEmail guard.
     */
    public function test_has_deliverable_email_guard(): void
    {
        $localUser = new User([
            'email' => 'pegawai@bksda.local',
            'email_verified_at' => now(),
        ]);
        $this->assertFalse($localUser->hasDeliverableEmail());

        $unverifiedUser = new User([
            'email' => 'pegawai@gmail.com',
            'email_verified_at' => null,
        ]);
        $this->assertFalse($unverifiedUser->hasDeliverableEmail());

        $verifiedRealUser = new User([
            'email' => 'pegawai@gmail.com',
            'email_verified_at' => now(),
        ]);
        $this->assertTrue($verifiedRealUser->hasDeliverableEmail());
    }

    /**
     * Test PUT /api/me/email requires password and forbids .local.
     */
    public function test_update_email_validation(): void
    {
        Notification::fake();

        $user = User::create([
            'name' => 'Budi Santoso',
            'username' => '198501012010011001',
            'email' => 'budi@bksda.local',
            'password' => Hash::make('Secret123!'),
            'role' => 'user',
        ]);

        Sanctum::actingAs($user);

        // 1. Wrong current password -> 422
        $resWrongPw = $this->putJson('/api/me/email', [
            'email' => 'budi.santoso@gmail.com',
            'current_password' => 'WrongPassword!',
        ]);
        $resWrongPw->assertStatus(422);

        // 2. Cannot change to another .local domain -> 422
        $resLocal = $this->putJson('/api/me/email', [
            'email' => 'budi.baru@bksda.local',
            'current_password' => 'Secret123!',
        ]);
        $resLocal->assertStatus(422);

        // 3. Valid update -> 200, email_verified_at reset to null, verification notification sent
        $resOk = $this->putJson('/api/me/email', [
            'email' => 'budi.santoso@gmail.com',
            'current_password' => 'Secret123!',
        ]);
        $resOk->assertStatus(200);

        $user->refresh();
        $this->assertEquals('budi.santoso@gmail.com', $user->email);
        $this->assertNull($user->email_verified_at);

        Notification::assertSentTo($user, VerifyEmail::class);
    }

    /**
     * Test forgot password anti-enumeration response and deliverability check.
     */
    public function test_forgot_password_anti_enumeration_and_guard(): void
    {
        Notification::fake();

        // User with .local email
        $userLocal = User::create([
            'name' => 'User Local',
            'username' => 'userlocal',
            'email' => 'local@bksda.local',
            'password' => Hash::make('secret'),
            'role' => 'user',
        ]);

        // User with verified real email
        $userReal = User::create([
            'name' => 'User Real',
            'username' => 'userreal',
            'email' => 'real@gmail.com',
            'email_verified_at' => now(),
            'password' => Hash::make('secret'),
            'role' => 'user',
        ]);

        // Non-existent email
        $resGhost = $this->postJson('/api/forgot-password', [
            'email' => 'ghost@unknown.com',
        ]);
        $resGhost->assertStatus(200);

        // Local email
        $resLocal = $this->postJson('/api/forgot-password', [
            'email' => 'local@bksda.local',
        ]);
        $resLocal->assertStatus(200);

        // Responses should be identical (anti-enumeration)
        $this->assertEquals($resGhost->json('message'), $resLocal->json('message'));

        // Reset link must NOT be sent to .local user
        Notification::assertNotSentTo($userLocal, ResetPassword::class);

        // Real email
        $resReal = $this->postJson('/api/forgot-password', [
            'email' => 'real@gmail.com',
        ]);
        $resReal->assertStatus(200);
        $this->assertEquals($resGhost->json('message'), $resReal->json('message'));

        // Reset link must be sent to verified real user
        Notification::assertSentTo($userReal, ResetPassword::class);
    }

    /**
     * Test Svix webhook signature verification.
     */
    public function test_resend_svix_webhook_verification(): void
    {
        Config::set('services.resend.webhook_secret', 'whsec_mfasdjklh1289347890123456789012=');
        $secret = 'whsec_mfasdjklh1289347890123456789012=';
        $rawSecret = substr($secret, 6);
        $key = base64_decode($rawSecret);

        $user = User::create([
            'name' => 'Bounce User',
            'username' => 'bounceuser',
            'email' => 'bounced@gmail.com',
            'email_verified_at' => now(),
            'password' => Hash::make('secret'),
            'role' => 'user',
        ]);

        $body = json_encode([
            'type' => 'email.bounced',
            'data' => [
                'to' => ['bounced@gmail.com'],
                'email_id' => 'resend_msg_123',
                'bounce' => ['message' => 'Mailbox full'],
            ],
        ]);

        $msgId = 'msg_test_001';
        $timestamp = (string) time();
        $toSign = "{$msgId}.{$timestamp}.{$body}";
        $validSignature = 'v1,' . base64_encode(hash_hmac('sha256', $toSign, $key, true));

        // 1. Invalid signature -> 401
        $resInvalid = $this->call(
            'POST',
            '/api/webhooks/resend',
            [],
            [],
            [],
            [
                'CONTENT_TYPE' => 'application/json',
                'HTTP_SVIX_ID' => $msgId,
                'HTTP_SVIX_TIMESTAMP' => $timestamp,
                'HTTP_SVIX_SIGNATURE' => 'v1,invalid_signature_hash',
            ],
            $body
        );
        $resInvalid->assertStatus(401);

        // 2. Valid signature -> 200 and resets email_verified_at to null
        $resValid = $this->call(
            'POST',
            '/api/webhooks/resend',
            [],
            [],
            [],
            [
                'CONTENT_TYPE' => 'application/json',
                'HTTP_SVIX_ID' => $msgId,
                'HTTP_SVIX_TIMESTAMP' => $timestamp,
                'HTTP_SVIX_SIGNATURE' => $validSignature,
            ],
            $body
        );
        $resValid->assertStatus(200);

        $user->refresh();
        $this->assertNull($user->email_verified_at);
    }
}
