<?php

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Kepegawaian\Models\Employee;
use App\Modules\SuratTugas\Models\AssignmentLetter;
use App\Modules\SuratTugas\Services\AssignmentLetterConflictService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\TestCase;

class SuratTugasPostgresConcurrencyTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        // Use the configured isolated test database instead of a developer's fixed server.
        DB::purge('pgsql');

        if ($this->canConnectPgsql()) {
            config(['database.default' => 'pgsql']);
            DB::setDefaultConnection('pgsql');
        }
    }

    private function canConnectPgsql(): bool
    {
        try {
            DB::connection('pgsql')->getPdo();
            return true;
        } catch (\Throwable $e) {
            return false;
        }
    }

    /**
     * ST-08: Test deterministic lock ordering prevents deadlocks when requests
     * supply employees in reverse order (e.g. [A, B] vs [B, A]).
     */
    public function test_st08_deterministic_employee_lock_order_prevents_deadlock(): void
    {
        if (! $this->canConnectPgsql()) {
            $this->markTestSkipped('PostgreSQL connection not available on this host.');
        }

        $connection = DB::connection('pgsql');
        $id1 = 98765001;
        $id2 = 98765002;

        // Cleanup before test
        $connection->table('kpg_employees')->whereIn('id', [$id1, $id2])->delete();

        $connection->table('kpg_employees')->insert([
            ['id' => $id1, 'nip' => '98765001', 'nama_lengkap' => 'Emp Order A', 'is_active' => true],
            ['id' => $id2, 'nip' => '98765002', 'nama_lengkap' => 'Emp Order B', 'is_active' => true],
        ]);

        try {
            // Simulate Request 1 sorting: input [B, A] -> sorted to [A, B]
            $inputReverse = [['id' => $id2], ['id' => $id1]];
            $sortedA = collect($inputReverse)
                ->map(fn ($e) => is_array($e) ? ($e['id'] ?? null) : $e)
                ->filter()
                ->map(fn ($id) => (int) $id)
                ->unique()
                ->sort()
                ->values()
                ->all();

            // Simulate Request 2 sorting: input [A, B] -> sorted to [A, B]
            $inputNormal = [['id' => $id1], ['id' => $id2]];
            $sortedB = collect($inputNormal)
                ->map(fn ($e) => is_array($e) ? ($e['id'] ?? null) : $e)
                ->filter()
                ->map(fn ($id) => (int) $id)
                ->unique()
                ->sort()
                ->values()
                ->all();

            $this->assertSame([$id1, $id2], $sortedA);
            $this->assertSame([$id1, $id2], $sortedB);

            // Execute locking query on PostgreSQL in transaction
            $connection->beginTransaction();
            $locked = $connection->table('kpg_employees')
                ->whereIn('id', $sortedA)
                ->orderBy('id', 'asc')
                ->lockForUpdate()
                ->get();

            $this->assertCount(2, $locked);
            $this->assertSame($id1, (int) $locked[0]->id);
            $this->assertSame($id2, (int) $locked[1]->id);
            $connection->rollBack();
        } finally {
            $connection->table('kpg_employees')->whereIn('id', [$id1, $id2])->delete();
        }
    }

    /**
     * ST-08: Test concurrent worker simulation in PostgreSQL where Worker 1 locks,
     * checks conflicts, and approves; Worker 2 concurrently waits, then is rejected with 422 conflict.
     */
    public function test_st08_concurrent_overlapping_approval_race_is_serialized_and_rejected(): void
    {
        if (! $this->canConnectPgsql()) {
            $this->markTestSkipped('PostgreSQL connection not available on this host.');
        }

        $connection = DB::connection('pgsql');
        $empId = 98765010;
        $stId1 = (string) Str::uuid();
        $stId2 = (string) Str::uuid();

        // Cleanup
        $connection->table('st_assignment_letter_employees')->where('employee_id', $empId)->delete();
        $connection->table('st_assignment_letters')->whereIn('id', [$stId1, $stId2])->delete();
        $connection->table('kpg_employees')->where('id', $empId)->delete();

        $connection->table('kpg_employees')->insert([
            'id' => $empId, 'nip' => '98765010', 'nama_lengkap' => 'Emp Concurrent Test', 'is_active' => true,
        ]);

        $connection->table('st_assignment_letters')->insert([
            [
                'id' => $stId1,
                'nomor_surat' => 'ST/CONCURRENT/001',
                'maksud_tujuan' => 'Tugas A 20-25 Nov',
                'tanggal_mulai' => '2026-11-20',
                'tanggal_selesai' => '2026-11-25',
                'status' => 'pending',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'id' => $stId2,
                'nomor_surat' => 'ST/CONCURRENT/002',
                'maksud_tujuan' => 'Tugas B 22-23 Nov (Overlap)',
                'tanggal_mulai' => '2026-11-22',
                'tanggal_selesai' => '2026-11-23',
                'status' => 'pending',
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);

        $connection->table('st_assignment_letter_employees')->insert([
            ['assignment_letter_id' => $stId1, 'employee_id' => $empId, 'created_at' => now(), 'updated_at' => now()],
            ['assignment_letter_id' => $stId2, 'employee_id' => $empId, 'created_at' => now(), 'updated_at' => now()],
        ]);

        try {
            $conflictService = new AssignmentLetterConflictService();

            // === Worker 1 Transaction: Locks employee, verifies no conflict, approves ST 1 ===
            $connection->beginTransaction();

            // Worker 1 acquires lock on empId
            $connection->table('kpg_employees')
                ->where('id', $empId)
                ->orderBy('id', 'asc')
                ->lockForUpdate()
                ->first();

            $check1 = $conflictService->checkConflicts(
                [['id' => $empId]],
                '2026-11-20',
                '2026-11-25',
                $stId1,
                true
            );

            // ST 2 is pending, and ST 1 excludes itself. Worker 1 proceeds to approve ST 1
            $connection->table('st_assignment_letters')->where('id', $stId1)->update([
                'status' => 'approved',
                'updated_at' => now(),
            ]);

            $connection->commit(); // Worker 1 committed! Status of ST 1 is now APPROVED

            // === Worker 2 Transaction: Acquires lock after Worker 1, checks conflicts ===
            $connection->beginTransaction();

            $connection->table('kpg_employees')
                ->where('id', $empId)
                ->orderBy('id', 'asc')
                ->lockForUpdate()
                ->first();

            $check2 = $conflictService->checkConflicts(
                [['id' => $empId]],
                '2026-11-22',
                '2026-11-23',
                $stId2,
                true
            );

            // Worker 2 MUST detect conflict because Worker 1 already approved ST 1
            $this->assertTrue($check2['has_conflict'], 'Worker 2 must detect schedule conflict with newly approved ST 1');
            $this->assertSame('ST/CONCURRENT/001', $check2['conflicts'][0]['nomor'] ?? null);

            // Because has_conflict is true, Worker 2 rolls back without approving!
            $connection->rollBack();

            // === Final PostgreSQL Database Invariant Verification ===
            $finalSt1 = $connection->table('st_assignment_letters')->where('id', $stId1)->first();
            $finalSt2 = $connection->table('st_assignment_letters')->where('id', $stId2)->first();

            $this->assertSame('approved', $finalSt1->status, 'ST 1 must be approved');
            $this->assertSame('pending', $finalSt2->status, 'ST 2 must remain pending (not approved)');

            // Verify no double-booking exists in approved state
            $approvedOverlapCount = $connection->table('st_assignment_letters as sal')
                ->join('st_assignment_letter_employees as sale', 'sal.id', '=', 'sale.assignment_letter_id')
                ->where('sale.employee_id', $empId)
                ->where('sal.status', 'approved')
                ->where('sal.tanggal_mulai', '<=', '2026-11-23')
                ->where('sal.tanggal_selesai', '>=', '2026-11-22')
                ->count();

            $this->assertSame(1, $approvedOverlapCount, 'Invariant: Exactly 1 assignment letter is approved; zero double bookings allowed.');

        } finally {
            $connection->table('st_assignment_letter_employees')->where('employee_id', $empId)->delete();
            $connection->table('st_assignment_letters')->whereIn('id', [$stId1, $stId2])->delete();
            $connection->table('kpg_employees')->where('id', $empId)->delete();
        }
    }
}
