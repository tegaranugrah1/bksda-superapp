<?php

namespace Tests\Feature;

use App\Events\AdminInboxChanged;
use App\Events\PortalNotificationCreated;
use App\Models\User;
use App\Modules\Kepegawaian\Models\Employee;
use App\Modules\Kepegawaian\Models\EmployeeLeave;
use App\Modules\Kepegawaian\Models\Holiday;
use App\Modules\Kepegawaian\Models\LeaveType;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Notification;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class LeaveHolidayDurationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config(['auth.two_factor_enforce' => false]);
        Mail::fake();
        Notification::fake();
        Event::fake([AdminInboxChanged::class, PortalNotificationCreated::class]);
    }

    public function test_annual_leave_duration_excludes_national_holidays_cuti_bersama_and_custom_holidays(): void
    {
        LeaveType::updateOrCreate(['kode' => 'CT'], [
            'nama' => 'Cuti Tahunan',
            'hitung_hari' => 'hari_kerja',
            'potong_kuota_tahunan' => true,
            'maks_hari' => 12,
            'is_active' => true,
        ]);

        $nip = '900000000000000099';
        $employee = Employee::create([
            'nip' => $nip,
            'nama_lengkap' => 'Dummy Holiday Leave Actor',
            'jabatan' => 'Dummy PNS',
            'pangkat_golongan' => 'Penata (III/c)',
            'satuan_kerja' => 'Balai KSDA Kalimantan Timur',
            'is_active' => true,
        ]);
        $user = User::factory()->create([
            'name' => 'Dummy Holiday Leave Actor',
            'username' => $nip,
            'email' => $nip.'@example.test',
            'role' => 'user',
            'access_modules' => [],
            'permissions' => null,
            'is_active' => true,
            'must_change_password' => false,
        ]);

        EmployeeLeave::create([
            'employee_id' => $employee->id,
            'year' => 2026,
            'hak_cuti_n' => 12,
            'sisa_cuti_n1' => 6,
            'sisa_cuti_n2' => 0,
            'cuti_terpakai_n0' => 0,
        ]);

        Sanctum::actingAs($user);

        $typesResp = $this->getJson('/api/me/leave-types?year=2026')->assertOk();
        $holidayDates = $typesResp->json('holiday_dates');
        $this->assertContains('2026-12-24', $holidayDates);
        $this->assertContains('2026-12-25', $holidayDates);

        $payload = [
            'jenis_cuti' => 'Cuti Tahunan',
            'alasan_cuti' => 'Dummy libur akhir tahun',
            'tanggal_mulai' => '2026-12-21',
            'tanggal_selesai' => '2026-12-31',
            'alamat_menjalankan_cuti' => 'Samarinda',
            'telepon' => '080000000001',
        ];

        // 21-31 Dec 2026 has 9 Mon-Fri days, minus Dec 24 (Cuti Bersama) & Dec 25 (Natal) = 7 working days
        $created = $this->postJson('/api/me/leave-requests', $payload)->assertCreated();
        $this->assertSame(7, (int) $created->json('data.jumlah_hari'));

        // Selecting only holidays/cuti bersama must fail with 0 working days
        $this->postJson('/api/me/leave-requests', array_merge($payload, [
            'tanggal_mulai' => '2026-12-24',
            'tanggal_selesai' => '2026-12-25',
        ]))->assertStatus(422);

        // Custom holiday stored via Settings DB must also be excluded (7 -> 6)
        $this->deleteJson('/api/me/leave-requests/'.$created->json('data.id'))->assertOk();
        Holiday::create([
            'tanggal' => '2026-12-30',
            'tahun' => 2026,
            'nama' => 'Dummy Libur Khusus Instansi',
            'is_cuti_bersama' => true,
        ]);

        $withCustom = $this->postJson('/api/me/leave-requests', $payload)->assertCreated();
        $this->assertSame(6, (int) $withCustom->json('data.jumlah_hari'));
    }
}
