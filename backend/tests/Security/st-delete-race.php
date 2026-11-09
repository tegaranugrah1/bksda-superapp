<?php
/**
 * Parent-only execution: env -i, /app read-only, /scratch writable, isolated
 * loopback PostgreSQL, full dummy structural migrations and OS resource limits.
 * Promote only race-results.json <= 32768 bytes and
 * race-delete-publication/{result-1.json,result-2.json,stderr-1.log,stderr-2.log}
 * <= 4096 bytes each, after every writer stops. Never promote input.json/tokens.
 */
declare(strict_types=1);

use App\Models\User;
use App\Modules\Kepegawaian\Models\Employee;
use App\Modules\SuratTugas\Controllers\AssignmentLetterController;
use App\Modules\SuratTugas\Models\AssignmentLetter;
use Illuminate\Support\Facades\DB;

umask(0077);
$mode = $argv[1] ?? 'run';
$stage = 'guard';
$processes = [];
const RACE_ROOT = '/scratch/race-delete-publication';

function putJson(string $path, array $value): void
{
    $data = json_encode($value, JSON_THROW_ON_ERROR)."\n";
    if (strlen($data) > 32768 || file_put_contents($path, $data, LOCK_EX) !== strlen($data)) {
        throw new RuntimeException('bounded-write');
    }
}

function readJson(string $path): array
{
    if (filesize($path) > 4096) {
        throw new RuntimeException('oversize-worker-file');
    }
    return json_decode(file_get_contents($path), true, 16, JSON_THROW_ON_ERROR);
}

function waitFor(callable $condition, float $seconds = 1.95): void
{
    $deadline = microtime(true) + $seconds;
    do {
        clearstatcache();
        if ($condition()) {
            return;
        }
        usleep(10000);
    } while (microtime(true) < $deadline);
    throw new RuntimeException('bounded-observer-timeout');
}

function bootFixture(): Illuminate\Foundation\Application
{
    if (getenv('PORTAL_RACE_FIXTURE') !== '1' || getenv('APP_ENV') !== 'testing'
        || getenv('DB_CONNECTION') !== 'pgsql' || getenv('DB_HOST') !== '127.0.0.1'
        || getenv('DB_DATABASE') !== 'portal_audit' || getenv('PGDATABASE') !== 'portal_audit'
        || getenv('APP_BASE_PATH') !== '/app' || !is_dir('/scratch')) {
        throw new RuntimeException('isolated-audit-environment-required');
    }
    require '/app/vendor/autoload.php';
    $app = require '/app/bootstrap/app.php';
    $app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
    if (DB::connection()->getDriverName() !== 'pgsql'
        || DB::selectOne('select current_database() as name')->name !== 'portal_audit') {
        throw new RuntimeException('native-isolated-postgresql-required');
    }
    DB::statement("SET statement_timeout = '1900ms'");
    DB::statement("SET lock_timeout = '1800ms'");
    config(['auth.two_factor_enforce' => false, 'services.agent.webhook_url' => '']);
    Illuminate\Support\Facades\Mail::fake();
    Illuminate\Support\Facades\Event::fake([
        App\Events\AdminInboxChanged::class, App\Events\PortalNotificationCreated::class,
    ]);
    Illuminate\Support\Facades\Bus::fake([App\Jobs\ArchiveOfficialDocument::class]);
    return $app;
}

function workerEnvironment(): array
{
    $keys = ['PATH', 'HOME', 'TMPDIR', 'LANG', 'LC_ALL', 'TZ', 'PHPRC', 'PHP_INI_SCAN_DIR',
        'LD_LIBRARY_PATH', 'APP_NAME', 'APP_ENV', 'APP_KEY', 'APP_DEBUG', 'APP_URL',
        'APP_BASE_PATH', 'LARAVEL_STORAGE_PATH', 'APP_CONFIG_CACHE', 'APP_ROUTES_CACHE',
        'APP_EVENTS_CACHE', 'APP_SERVICES_CACHE', 'APP_PACKAGES_CACHE', 'VIEW_COMPILED_PATH',
        'LOG_CHANNEL', 'LOG_LEVEL', 'DB_CONNECTION', 'DB_HOST', 'DB_PORT', 'DB_DATABASE',
        'DB_USERNAME', 'DB_PASSWORD', 'PGDATABASE', 'PGOPTIONS', 'CACHE_STORE', 'SESSION_DRIVER',
        'QUEUE_CONNECTION', 'MAIL_MAILER', 'BROADCAST_CONNECTION', 'FILESYSTEM_DISK',
        'BCRYPT_ROUNDS', 'PORTAL_RACE_FIXTURE'];
    $environment = [];
    foreach ($keys as $key) {
        if (($value = getenv($key)) !== false) {
            $environment[$key] = $value;
        }
    }
    return $environment;
}

function spawnWorker(int $index): mixed
{
    $process = proc_open([PHP_BINARY, __FILE__, 'worker', (string) $index], [
        0 => ['file', '/dev/null', 'r'],
        1 => ['file', RACE_ROOT.'/result-'.$index.'.json', 'w'],
        2 => ['file', RACE_ROOT.'/stderr-'.$index.'.log', 'w'],
    ], $pipes, '/app', workerEnvironment());
    if (!is_resource($process)) {
        throw new RuntimeException('worker-spawn-failed');
    }
    return $process;
}

function collectWorkers(array &$processes): array
{
    $codes = [];
    try {
        waitFor(function () use ($processes, &$codes): bool {
            foreach ($processes as $index => $process) {
                if (!array_key_exists($index, $codes)) {
                    $state = proc_get_status($process);
                    if (!$state['running']) {
                        $codes[$index] = $state['exitcode'];
                    }
                }
            }
            return count($codes) === count($processes);
        });
    } finally {
        foreach ($processes as $index => $process) {
            if (!array_key_exists($index, $codes)) {
                proc_terminate($process, 9);
                $codes[$index] = 124;
            }
            proc_close($process);
        }
        $processes = [];
    }
    ksort($codes);
    return array_values($codes);
}

function controllerSelect(string $sql, array $bindings, string $id, string $method): bool
{
    if (!str_starts_with(strtolower($sql), 'select ')
        || !str_contains(strtolower($sql), 'from "st_assignment_letters"')
        || !in_array($id, $bindings, true)) {
        return false;
    }
    foreach (debug_backtrace(DEBUG_BACKTRACE_IGNORE_ARGS, 32) as $frame) {
        if (($frame['class'] ?? '') === AssignmentLetterController::class
            && ($frame['function'] ?? '') === $method) {
            return true;
        }
    }
    return false;
}

function actor(int $sequence, bool $admin): User
{
    $nip = '900000000007'.str_pad((string) $sequence, 6, '0', STR_PAD_LEFT);
    return User::create([
        'username' => $nip, 'name' => 'Dummy deletion race '.$sequence,
        'email' => $nip.'@example.test', 'password' => 'Dummy-local-only-password',
        'role' => $admin ? 'admin' : 'user', 'access_modules' => ['surat_tugas'],
        'permissions' => null, 'is_active' => true, 'must_change_password' => false,
    ]);
}

try {
    $stage = 'bootstrap';
    $app = bootFixture();
    if ($mode === 'worker') {
        $index = (int) ($argv[2] ?? 0);
        if (!in_array($index, [1, 2], true)) {
            throw new RuntimeException('invalid-worker');
        }
        $stage = 'worker-input';
        $input = readJson(RACE_ROOT.'/input.json');
        $spec = $input['requests'][$index - 1];
        $server = ['HTTP_ACCEPT' => 'application/json',
            'HTTP_AUTHORIZATION' => 'Bearer '.$spec['bearer'], 'REMOTE_ADDR' => '127.0.0.1'];
        $kernel = $app->make(Illuminate\Contracts\Http\Kernel::class);
        $stage = 'kernel-prime';
        $prime = Illuminate\Http\Request::create('/api/me', 'GET', [], [], [], $server);
        $response = $kernel->handle($prime);
        $kernel->terminate($prime, $response);
        if ($response->getStatusCode() !== 200) {
            throw new RuntimeException('real-sanctum-prime-failed');
        }
        DB::selectOne("select set_config('application_name', ?, false)", ['st-delete-race-'.$index]);
        $pid = (int) DB::selectOne('select pg_backend_pid() as pid')->pid;
        $gated = $snapshotLocked = $snapshotTransaction = $approvalLock = false;
        $gateSeconds = null;
        if ($index === 1) {
            // Query results are already fetched, but the first destroy snapshot has not yet
            // returned to the controller. Do not mutate any DB state from this observer.
            DB::listen(function (Illuminate\Database\Events\QueryExecuted $query) use ($input,
                &$gated, &$snapshotLocked, &$snapshotTransaction, &$gateSeconds): void {
                if ($gated || !controllerSelect($query->sql, $query->bindings, $input['letter_id'], 'destroy')) {
                    return;
                }
                $gated = true;
                $snapshotLocked = str_ends_with(strtolower($query->sql), 'for update');
                $snapshotTransaction = DB::transactionLevel() > 0;
                putJson(RACE_ROOT.'/snapshot-1.json', [
                    'for_update' => $snapshotLocked, 'in_transaction' => $snapshotTransaction,
                ]);
                $start = microtime(true);
                waitFor(fn () => is_file(RACE_ROOT.'/release-1'));
                $gateSeconds = microtime(true) - $start;
            });
        } else {
            DB::connection()->beforeExecuting(function ($sql, $bindings) use ($input, &$approvalLock): void {
                if (!$approvalLock && controllerSelect($sql, $bindings, $input['letter_id'], 'approve')
                    && str_ends_with(strtolower($sql), 'for update')) {
                    $approvalLock = true;
                    putJson(RACE_ROOT.'/before-approval-lock-2.json', ['attempted' => true]);
                }
            });
        }
        putJson(RACE_ROOT.'/primed-'.$index.'.json', ['pid' => $pid]);
        $stage = 'coordinator-start';
        waitFor(fn () => is_file(RACE_ROOT.'/go-'.$index));
        $stage = 'kernel-request';
        $request = Illuminate\Http\Request::create($spec['uri'], $spec['method'], $spec['body'], [], [], $server);
        $response = $kernel->handle($request);
        $kernel->terminate($request, $response);
        if (DB::transactionLevel() !== 0) {
            throw new RuntimeException('request-left-open-transaction');
        }
        $result = ['kind' => 'http-result', 'status' => $response->getStatusCode(),
            'snapshot_gate_reached' => $gated, 'snapshot_for_update' => $snapshotLocked,
            'snapshot_in_transaction' => $snapshotTransaction, 'approval_lock_attempted' => $approvalLock,
            'gate_seconds' => $gateSeconds === null ? null : round($gateSeconds, 6)];
        // A regular scratch-only completion marker lets the coordinator distinguish a
        // committed approval from a blocked approval before releasing the delete snapshot.
        if ($index === 2) {
            putJson(RACE_ROOT.'/done-2.json', $result);
        }
        echo json_encode($result, JSON_THROW_ON_ERROR)."\n";
        exit(0);
    }
    if ($mode !== 'run') {
        throw new RuntimeException('invalid-mode');
    }
    $stage = 'seed';
    if (!mkdir(RACE_ROOT, 0700)) {
        throw new RuntimeException('fresh-scenario-directory-required');
    }
    $creator = actor(201, false);
    $admin = actor(202, true);
    $employee = Employee::create(['nip' => $creator->username,
        'nama_lengkap' => 'Dummy deletion race employee', 'is_active' => true]);
    $letter = AssignmentLetter::create([
        'nomor_surat' => 'DUMMY-ST-DELETE-RACE-001', 'maksud_tujuan' => 'Dummy isolated deletion race',
        'tanggal_mulai' => '2026-11-20', 'tanggal_selesai' => '2026-11-25',
        'tanggal_surat' => '2026-11-19', 'tempat_tujuan' => 'Dummy audit location',
        'sumber_dana' => 'Dummy audit funding', 'status' => 'pending', 'created_by' => $creator->id,
    ]);
    $letter->employees()->attach($employee->id);
    putJson(RACE_ROOT.'/input.json', ['letter_id' => $letter->id, 'requests' => [
        ['method' => 'DELETE', 'uri' => '/api/surat-tugas/'.$letter->id, 'body' => [],
            'bearer' => $creator->createToken('dummy-delete-race')->plainTextToken],
        ['method' => 'PUT', 'uri' => '/api/surat-tugas/'.$letter->id.'/approve', 'body' => ['status' => 'approved'],
            'bearer' => $admin->createToken('dummy-publish-race')->plainTextToken],
    ]]);
    $stage = 'prime';
    $processes = [spawnWorker(1), spawnWorker(2)];
    waitFor(fn () => is_file(RACE_ROOT.'/primed-1.json') && is_file(RACE_ROOT.'/primed-2.json'));
    $firstPid = readJson(RACE_ROOT.'/primed-1.json')['pid'];
    $secondPid = readJson(RACE_ROOT.'/primed-2.json')['pid'];
    if ($firstPid === $secondPid) {
        throw new RuntimeException('independent-database-workers-required');
    }
    $stage = 'delete-snapshot';
    file_put_contents(RACE_ROOT.'/go-1', 'go');
    waitFor(fn () => is_file(RACE_ROOT.'/snapshot-1.json'));
    $snapshot = readJson(RACE_ROOT.'/snapshot-1.json');
    $stage = 'publication-overlap';
    $schedule = null;
    $blocked = false;
    $committedBeforeRelease = false;
    file_put_contents(RACE_ROOT.'/go-2', 'go');
    try {
        waitFor(function () use ($firstPid, $secondPid, $letter, &$schedule,
            &$blocked, &$committedBeforeRelease): bool {
            if (!is_file(RACE_ROOT.'/before-approval-lock-2.json')) {
                return false;
            }
            $activity = DB::selectOne("select exists (select 1 from pg_stat_activity
                where pid = ? and state = 'active' and wait_event_type = 'Lock'
                and ? = any(pg_blocking_pids(pid))
                and query ilike '%from \"st_assignment_letters\"%for update%') as blocked", [$secondPid, $firstPid]);
            if (in_array($activity->blocked, [true, 1, '1', 't'], true)) {
                $blocked = true;
                $schedule = 'approval_blocked_on_delete';
                return true;
            }
            if (is_file(RACE_ROOT.'/done-2.json')) {
                $done = readJson(RACE_ROOT.'/done-2.json');
                $row = DB::table('st_assignment_letters')->where('id', $letter->id)->first();
                if ($done['status'] !== 200 || !$row || $row->status !== 'approved' || $row->deleted_at !== null) {
                    throw new RuntimeException('approval-positive-control-failed');
                }
                $committedBeforeRelease = true;
                $schedule = 'approval_committed_before_delete_release';
                return true;
            }
            return false;
        }, 1.5);
    } finally {
        file_put_contents(RACE_ROOT.'/release-1', 'release');
    }
    $stage = 'collect';
    $codes = collectWorkers($processes);
    $workers = [readJson(RACE_ROOT.'/result-1.json'), readJson(RACE_ROOT.'/result-2.json')];
    $statuses = array_column($workers, 'status');
    $stage = 'invariant';
    $final = DB::table('st_assignment_letters')->where('id', $letter->id)->first();
    if (!$final) {
        throw new RuntimeException('expected-soft-deleted-row-missing');
    }
    $trashed = $final->deleted_at !== null;
    $official = in_array(strtolower($final->status), ['approved', 'completed', 'published', 'diterbitkan'], true);
    $violation = $official && $trashed;
    $setupValid = $codes === [0, 0] && ($workers[0]['snapshot_gate_reached'] ?? false)
        && ($workers[1]['approval_lock_attempted'] ?? false) && ($workers[0]['gate_seconds'] ?? 3) <= 2.0;
    $lockedSafe = $blocked && $snapshot['for_update'] && $snapshot['in_transaction']
        && $statuses === [200, 404] && $final->status === 'pending' && $trashed;
    // Also accept a fresh authorization recheck after an initial unlocked read;
    // the legal admin publication commits and the creator is then correctly denied.
    $recheckedSafe = $committedBeforeRelease && $statuses === [403, 200]
        && $final->status === 'approved' && !$trashed;
    $staleViolation = $committedBeforeRelease && $statuses === [200, 200] && $violation;
    if (!$setupValid || (!$lockedSafe && !$recheckedSafe && !$staleViolation)) {
        throw new RuntimeException('unexpected-race-outcome');
    }
    $report = ['schema' => 1, 'setup' => 'ok', 'driver' => 'pgsql',
        'case' => 'delete_publication_stale_authorization', 'pass' => !$violation,
        'boundary_violation' => $violation, 'concurrency_limit' => 2, 'gate_bound_seconds' => 2,
        'observer_bound_seconds' => 2, 'both_primed_before_start' => true,
        'delete_principal' => 'ordinary_module_creator', 'publish_principal' => 'module_admin',
        'schedule' => $schedule, 'publication_blocked_on_delete' => $blocked,
        'publication_committed_before_delete_release' => $committedBeforeRelease,
        'delete_snapshot' => $snapshot, 'http_statuses' => $statuses, 'worker_exits' => $codes,
        'final_status' => $final->status, 'final_trashed' => $trashed, 'workers' => $workers];
    putJson('/scratch/race-results.json', $report);
    echo json_encode($report, JSON_THROW_ON_ERROR)."\n";
    exit($violation ? 1 : 0);
} catch (Throwable $error) {
    foreach ($processes as $process) {
        if (is_resource($process)) {
            proc_terminate($process, 9);
            proc_close($process);
        }
    }
    $report = ['schema' => 1, 'setup' => 'fixture_error', 'pass' => null, 'stage' => $stage,
        'exception_class' => get_class($error), 'exception_code' => (string) $error->getCode()];
    if ($mode === 'run') {
        putJson('/scratch/race-results.json', $report);
    }
    echo json_encode($report, JSON_THROW_ON_ERROR)."\n";
    exit(2);
}
