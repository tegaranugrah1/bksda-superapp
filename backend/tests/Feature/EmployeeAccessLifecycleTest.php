<?php

namespace Tests\Feature;

use App\Events\UserAccessChanged;
use App\Models\User;
use App\Modules\Kepegawaian\Models\Employee;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Notification;
use Laravel\Sanctum\PersonalAccessToken;
use Tests\TestCase;

class EmployeeAccessLifecycleTest extends TestCase
{
    use RefreshDatabase;

    private function authenticate(User $actor): void
    {
        $this->app['auth']->guard('web')->logout();
        $this->app['auth']->forgetGuards();
        $this->app['auth']->setDefaultDriver('web');
        $this->withHeader('Authorization', 'Bearer '.$actor->createToken('dummy-lifecycle')->plainTextToken);
    }

    public function test_precreated_account_requires_explicit_activation_and_deactivation_revokes_tokens(): void
    {
        config(['auth.two_factor_enforce' => false]);
        Mail::fake();
        Notification::fake();
        $admin = User::factory()->create(['role' => 'super_admin']);
        $this->authenticate($admin);
        $nip = '900000000000000081';
        $id = $this->postJson('/api/kepegawaian/employees', ['nip' => $nip, 'nama_lengkap' => 'Dummy Provisioning'])
            ->assertCreated()->json('data.id');
        $user = User::where('username', $nip)->firstOrFail();
        $this->assertFalse($user->is_active);
        $url = '/api/kepegawaian/employees/'.$id.'/access';
        $payload = ['role' => 'user', 'access_modules' => [], 'password' => 'DummyLifecyclePassword42!'];
        $this->putJson($url, $payload)->assertOk();
        $this->assertFalse($user->fresh()->is_active, 'Editing role/password must not silently activate an account.');
        $this->getJson($url)->assertOk()->assertJsonPath('data.is_active', false);
        $this->putJson($url, [...$payload, 'is_active' => true])->assertOk()->assertJsonPath('data.is_active', true);
        $this->app['auth']->forgetGuards();
        $this->withHeader('Authorization', '');
        $this->postJson('/api/login', ['username' => $nip, 'password' => $payload['password']])->assertOk();
        $this->assertGreaterThan(0, $user->tokens()->count());
        $this->authenticate($admin);
        $this->putJson($url, ['role' => 'user', 'is_active' => false])->assertOk();
        $this->assertFalse($user->fresh()->is_active);
        $this->assertSame(0, $user->tokens()->count());
        $this->assertDatabaseHas('kpg_employee_histories', ['employee_id' => $id, 'action' => 'UPDATE_IAM_ACCESS']);
        $this->app['auth']->forgetGuards();
        $this->withHeader('Authorization', '');
        $this->postJson('/api/login', ['username' => $nip, 'password' => $payload['password']])->assertUnprocessable();
    }

    public function test_activation_is_super_admin_only_and_cannot_lock_out_the_current_admin(): void
    {
        $employee = Employee::create(['nip' => '900000000000000082', 'nama_lengkap' => 'Dummy IAM target']);
        $owner = User::factory()->create(['username' => $employee->nip, 'role' => 'super_admin']);
        $url = '/api/kepegawaian/employees/'.$employee->id.'/access';
        $this->authenticate(User::factory()->create(['role' => 'admin', 'access_modules' => ['kepegawaian']]));
        foreach ([false, 0, '0'] as $inactive) {
            $this->putJson($url, ['role' => 'super_admin', 'is_active' => $inactive])->assertForbidden();
        }
        $this->authenticate($owner);
        $this->putJson($url, ['role' => 'super_admin', 'is_active' => false])->assertForbidden();
        $this->assertTrue($owner->fresh()->is_active);
        $this->putJson($url, ['role' => 'super_admin', 'is_active' => 'invalid'])->assertUnprocessable()->assertJsonValidationErrors('is_active');
    }

    public function test_module_changes_preserve_mobile_token_and_enforce_new_access_on_next_request(): void
    {
        config(['auth.two_factor_enforce' => false, 'broadcasting.default' => 'null']);
        $employee = Employee::create(['nip' => '900000000000000083', 'nama_lengkap' => 'Dummy Mobile IAM']);
        $user = User::factory()->create([
            'username' => $employee->nip,
            'role' => 'user',
            'access_modules' => ['kepegawaian', 'inventory', 'bmn'],
        ]);
        $mobileToken = $user->createToken('dummy-mobile')->plainTextToken;
        $this->authenticate(User::factory()->create(['role' => 'super_admin']));
        $this->putJson('/api/kepegawaian/employees/'.$employee->id.'/access', [
            'role' => 'user', 'access_modules' => ['kepegawaian', 'bmn'],
            'module_roles' => ['kepegawaian' => 'user', 'bmn' => 'user'],
        ])->assertOk();
        $this->assertNotNull(PersonalAccessToken::findToken($mobileToken));

        $this->app['auth']->forgetGuards();
        $this->withToken($mobileToken)->getJson('/api/me')
            ->assertOk()->assertJsonPath('data.access_modules', ['kepegawaian', 'bmn']);
        $this->app['auth']->forgetGuards();
        $this->getJson('/api/inventory/items')->assertForbidden();
    }

    public function test_access_event_is_private_and_excludes_revoked_tokens_and_inactive_owners(): void
    {
        $user = User::factory()->create(['is_active' => true]);
        $live = $user->createToken('dummy-live');
        $revoked = $user->createToken('dummy-revoked');
        $revoked->accessToken->delete();
        User::factory()->create()->createToken('dummy-other-owner');
        $event = new UserAccessChanged($user->id);
        $this->assertSame('access.updated', $event->broadcastAs());
        $this->assertSame(['user_id' => $user->id], $event->broadcastWith());
        $this->assertSame(
            ['private-App.Models.User.'.$user->id.'.'.$live->accessToken->id],
            array_map(fn ($channel) => $channel->name, $event->broadcastOn()),
        );
        $user->updateQuietly(['is_active' => false]);
        $this->assertSame([], $event->broadcastOn());
    }

    public function test_password_reset_still_revokes_mobile_token(): void
    {
        config(['auth.two_factor_enforce' => false, 'broadcasting.default' => 'null']);
        $employee = Employee::create(['nip' => '900000000000000084', 'nama_lengkap' => 'Dummy Mobile Reset']);
        $user = User::factory()->create(['username' => $employee->nip, 'role' => 'user']);
        $mobileToken = $user->createToken('dummy-mobile')->plainTextToken;
        $this->authenticate(User::factory()->create(['role' => 'super_admin']));
        $this->putJson('/api/kepegawaian/employees/'.$employee->id.'/access', [
            'role' => 'user', 'password' => 'DummyReplacementPassword42!',
        ])->assertOk();
        $this->assertNull(PersonalAccessToken::findToken($mobileToken));
    }
}
