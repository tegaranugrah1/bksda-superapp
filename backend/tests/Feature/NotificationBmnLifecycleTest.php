<?php

namespace Tests\Feature;

use App\Events\AdminInboxChanged;
use App\Events\PortalNotificationCreated;
use App\Models\PortalNotification;
use App\Models\User;
use App\Modules\Bmn\Models\Asset;
use App\Modules\Bmn\Models\AssetLoan;
use App\Modules\Bmn\Models\AssetUpdate;
use App\Modules\Bmn\Services\LoanService;
use App\Modules\Kepegawaian\Models\Employee;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class NotificationBmnLifecycleTest extends TestCase
{
    // No enclosing test transaction: after-commit timing is part of these contracts.

    private User $admin;
    private Employee $a;
    private Employee $b;
    private Employee $c;
    private User $userA;
    private User $userB;
    private User $userC;

    protected function setUp(): void
    {
        parent::setUp();
        $this->artisan('migrate:fresh', ['--force' => true])->assertExitCode(0);
        config(['auth.two_factor_enforce' => false, 'broadcasting.default' => 'log', 'queue.default' => 'sync']);
        $this->admin = User::factory()->create(['role' => 'admin', 'is_active' => true,
            'must_change_password' => false, 'access_modules' => ['bmn'],
            'permissions' => ['bmn.view', 'bmn.asset.update']]);
        foreach (['a', 'b', 'c'] as $i => $key) {
            $employee = Employee::create(['nip' => '90000000000000000'.($i + 1),
                'nama_lengkap' => 'Dummy BMN '.strtoupper($key), 'is_active' => true]);
            $user = User::factory()->create(['username' => $employee->nip, 'role' => 'user',
                'is_active' => true, 'must_change_password' => false, 'access_modules' => [], 'permissions' => []]);
            $this->{$key} = $employee;
            $this->{'user'.strtoupper($key)} = $user;
        }
        Sanctum::actingAs($this->admin);
    }

    private function asset(string $marker): Asset
    {
        return Asset::create(['kode_barang' => 'DUMMY-'.$marker, 'nup' => $marker,
            'nama_barang' => 'Dummy asset '.$marker, 'kondisi' => 'Baik', 'nilai_perolehan' => 100]);
    }

    private function payload(array $assets, ?Employee $borrower = null): array
    {
        return ['asset_ids' => array_map(fn ($asset) => $asset->id, $assets),
            'borrower_employee_id' => ($borrower ?? $this->a)->id,
            'loan_date' => now()->toDateString(), 'due_date' => now()->addDay()->toDateString(),
            'purpose' => 'Dummy notification lifecycle'];
    }

    public function test_bn01_bulk_http_loans_notify_only_actual_borrower_and_view_only_user_is_denied(): void
    {
        $first = $this->asset('bulk-1');
        $second = $this->asset('bulk-2');
        $viewer = User::factory()->create(['role' => 'user', 'is_active' => true,
            'must_change_password' => false, 'access_modules' => ['bmn'], 'permissions' => ['bmn.view']]);
        Sanctum::actingAs($viewer);
        $this->postJson('/api/bmn/loans', $this->payload([$first, $second]))->assertForbidden();
        $this->assertSame(0, AssetLoan::count());
        $this->assertSame(0, PortalNotification::count());
        Sanctum::actingAs($this->admin);
        $this->postJson('/api/bmn/loans', $this->payload([$first, $second]))->assertCreated();
        $this->assertSame(2, AssetLoan::count());
        $this->assertSame($this->a->id, $first->fresh()->employee_id);
        $this->assertSame($this->a->id, $second->fresh()->employee_id);
        $notices = PortalNotification::where('user_id', $this->userA->id)->orderBy('id')->get();
        $this->assertCount(2, $notices);
        foreach ($notices as $notice) {
            $loan = AssetLoan::findOrFail($notice->reference_id);
            $this->assertSame('bmn', $notice->type);
            $this->assertSame('pinjaman', $notice->action_tab);
            $this->assertSame($loan->id, $notice->data['loan_id']);
            $this->assertSame($loan->asset_id, $notice->data['asset_id']);
            $this->assertSame($this->a->id, $notice->employee_id);
            $this->assertNull($notice->read_at);
        }
        $this->assertSame(0, PortalNotification::whereIn('user_id', [$this->userB->id, $this->userC->id])->count());
    }

    public function test_bn01_legacy_single_asset_http_accepts_actual_integer_employee_identifier(): void
    {
        $asset = $this->asset('legacy');
        $this->postJson('/api/bmn/assets/'.$asset->id.'/loans', [
            'employee_id' => $this->a->id, 'tanggal_pinjam' => now()->toDateString(),
            'keterangan' => 'Dummy legacy positive',
        ])->assertCreated();
        $loan = AssetLoan::where('asset_id', $asset->id)->sole();
        $this->assertSame($this->a->id, $loan->employee_id);
        $this->assertSame($this->a->id, $asset->fresh()->employee_id);
        $notice = PortalNotification::where('user_id', $this->userA->id)->sole();
        $this->assertSame($loan->id, $notice->reference_id);
        $this->assertSame('Peminjaman Aset BMN', $notice->title);
        $this->assertSame(0, PortalNotification::where('user_id', $this->userC->id)->count());
    }

    public function test_bn02_return_http_notifies_once_and_repeated_return_does_not_change_state_or_count(): void
    {
        $asset = $this->asset('return');
        $this->postJson('/api/bmn/loans', $this->payload([$asset]))->assertCreated();
        $loan = AssetLoan::where('asset_id', $asset->id)->sole();
        $this->postJson('/api/bmn/loans/'.$loan->id.'/return', ['return_condition' => 'Baik'])->assertOk();
        $this->assertSame('dikembalikan', $loan->fresh()->status);
        $this->assertNull($asset->fresh()->employee_id);
        $notice = PortalNotification::where('title', 'Pengembalian Aset BMN')->sole();
        $this->assertSame($this->userA->id, $notice->user_id);
        $this->assertSame($loan->id, $notice->reference_id);
        $before = $loan->fresh()->getAttributes();
        $noticeCount = PortalNotification::count();
        $historyCount = AssetUpdate::count();
        $this->postJson('/api/bmn/loans/'.$loan->id.'/return', ['return_condition' => 'Baik'])->assertStatus(400);
        $this->assertSame($before, $loan->fresh()->getAttributes());
        $this->assertSame($noticeCount, PortalNotification::count());
        $this->assertSame($historyCount, AssetUpdate::count());
    }

    public function test_bn03_borrower_correction_keeps_loan_and_asset_current_owner_consistent(): void
    {
        $asset = $this->asset('correction');
        $this->postJson('/api/bmn/loans', $this->payload([$asset]))->assertCreated();
        $loan = AssetLoan::where('asset_id', $asset->id)->sole();
        $approval = PortalNotification::where('user_id', $this->userA->id)->sole()->getAttributes();
        $this->putJson('/api/bmn/loans/'.$loan->id, ['borrower_employee_id' => $this->b->id])->assertOk();
        $this->assertSame($this->b->id, $loan->fresh()->employee_id);
        $this->assertSame($this->b->id, $asset->fresh()->employee_id);
        $this->assertSame($approval, PortalNotification::findOrFail($approval['id'])->getAttributes());
        // Historical personal notice must not become authority over the reassigned asset.
        Sanctum::actingAs($this->userA);
        $this->getJson('/api/me/assets')->assertOk()->assertJsonMissing(['id' => $asset->id]);
        Sanctum::actingAs($this->userB);
        $this->getJson('/api/me/assets')->assertOk()->assertJsonFragment(['id' => $asset->id]);
    }

    public function test_bn03_return_and_delete_of_old_loan_cannot_release_another_current_holder(): void
    {
        $returned = $this->asset('old-return');
        $deleted = $this->asset('old-delete');
        $this->postJson('/api/bmn/loans', $this->payload([$returned, $deleted]))->assertCreated();
        $oldReturn = AssetLoan::where('asset_id', $returned->id)->sole();
        $oldDelete = AssetLoan::where('asset_id', $deleted->id)->sole();
        // Fixture models a completed administrator reassignment before an old loan is settled.
        $returned->update(['employee_id' => $this->c->id]);
        $deleted->update(['employee_id' => $this->c->id]);
        $this->postJson('/api/bmn/loans/'.$oldReturn->id.'/return', ['return_condition' => 'Baik'])->assertOk();
        $this->assertSame($this->c->id, $returned->fresh()->employee_id);
        $this->assertSame('dikembalikan', $oldReturn->fresh()->status);
        $this->deleteJson('/api/bmn/loans/'.$oldDelete->id)->assertOk();
        $this->assertSame($this->c->id, $deleted->fresh()->employee_id);
        $this->assertNull(AssetLoan::find($oldDelete->id));
        $this->assertSame(0, PortalNotification::where('user_id', $this->userC->id)->count());
    }

    public function test_bn04_real_mixed_bulk_rollback_does_not_publish_intermediate_notifications(): void
    {
        $safe = $this->asset('safe-first');
        $conflicting = $this->asset('already-loaned');
        app(LoanService::class)->createLoan($this->payload([$conflicting], $this->c));
        $baseline = ['loans' => AssetLoan::count(), 'history' => AssetUpdate::count(), 'notices' => PortalNotification::count()];
        $intermediate = [];
        $published = [];
        AssetUpdate::created(function (AssetUpdate $history) use (&$intermediate, $safe) {
            if ($history->asset_id === $safe->id) {
                $intermediate[] = ['transaction' => DB::transactionLevel(),
                    'loan_exists' => AssetLoan::where('asset_id', $safe->id)->exists(),
                    'owner' => $safe->fresh()->employee_id];
            }
        });
        Event::listen(PortalNotificationCreated::class, function ($event) use (&$published) { $published[] = 'personal'; });
        Event::listen(AdminInboxChanged::class, function ($event) use (&$published) { $published[] = 'admin'; });
        $this->postJson('/api/bmn/loans', $this->payload([$safe, $conflicting]))->assertStatus(400);
        $this->assertCount(1, $intermediate, 'The safe first member really changed before the conflict.');
        $this->assertGreaterThan(0, $intermediate[0]['transaction']);
        $this->assertTrue($intermediate[0]['loan_exists']);
        $this->assertSame($this->a->id, $intermediate[0]['owner']);
        $this->assertNull($safe->fresh()->employee_id);
        $this->assertSame($baseline['loans'], AssetLoan::count());
        $this->assertSame($baseline['history'], AssetUpdate::count());
        $this->assertSame($baseline['notices'], PortalNotification::count());
        $this->assertSame([], $published, 'Rolled back work must not dispatch success notifications.');
        $this->postJson('/api/bmn/loans', $this->payload([$safe]))->assertCreated();
        $this->assertNotEmpty($published, 'Real events still dispatch after a legitimate successful commit.');
    }

    public function test_rv06_health_alert_deduplicates_an_hour_and_only_notifies_active_superadmins(): void
    {
        $super = User::factory()->create(['role' => 'super_admin', 'is_active' => true, 'must_change_password' => false]);
        $inactive = User::factory()->create(['role' => 'super_admin', 'is_active' => false]);
        // Deliberately isolate health dedup/recipient behavior from DNS/transport.
        // Queue is native sync, cache is the test array store, broadcaster is native log.
        Cache::forget('monitor:alert_health_dedup');
        Cache::put('queue:heartbeat', now()->subMinutes(20)->timestamp, now()->addHours(2));
        $this->artisan('app:monitor-health')->assertExitCode(1);
        $this->assertSame(1, PortalNotification::where('user_id', $super->id)->where('title', 'Peringatan Kesehatan Sistem')->count());
        $this->assertSame(0, PortalNotification::where('user_id', $inactive->id)->count());
        $this->assertSame(0, PortalNotification::where('user_id', $this->admin->id)->count());
        Cache::put('queue:heartbeat', now()->subMinutes(20)->timestamp, now()->addHours(2));
        $this->artisan('app:monitor-health')->assertExitCode(1);
        $this->assertSame(1, PortalNotification::where('user_id', $super->id)->count());
        $this->travel(61)->minutes();
        Cache::put('queue:heartbeat', now()->subMinutes(20)->timestamp, now()->addHours(2));
        $this->artisan('app:monitor-health')->assertExitCode(1);
        $this->assertSame(2, PortalNotification::where('user_id', $super->id)->count());
        Cache::put('queue:heartbeat', now()->timestamp, now()->addHours(2));
        $this->artisan('app:monitor-health')->assertExitCode(0);
        $this->assertSame(2, PortalNotification::where('user_id', $super->id)->count());
        // Recovery does not clear the existing one-hour dedup contract.
        Cache::put('queue:heartbeat', now()->subMinutes(20)->timestamp, now()->addHours(2));
        $this->artisan('app:monitor-health')->assertExitCode(1);
        $this->assertSame(2, PortalNotification::where('user_id', $super->id)->count());
        $this->travelBack();
    }
}
