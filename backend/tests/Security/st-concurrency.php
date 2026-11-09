<?php
/**
 * Dummy PostgreSQL regression: run ONLY in the parent's OS-enforced /app (ro),
 * /scratch (rw), env -i sandbox with isolated loopback PostgreSQL and full schema.
 * This file neither migrates nor promotes artifacts. Tokens/input remain scratch-only.
 * Retain: race-results.json <= 32768 bytes; each race-{store,publish}/result-{1,2}.json
 * and stderr-{1,2}.log <= 4096 bytes, only after all writers have stopped.
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

function putJson(string $path, array $value): void
{
    $data = json_encode($value, JSON_THROW_ON_ERROR)."\n";
    if (strlen($data) > 32768 || file_put_contents($path, $data, LOCK_EX) !== strlen($data)) {
        throw new RuntimeException('bounded-write');
    }
}

function waitFor(callable $condition, float $seconds = 3.0): void
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
    DB::statement("SET statement_timeout = '2500ms'");
    DB::statement("SET lock_timeout = '2200ms'");
    config(['auth.two_factor_enforce' => false, 'services.agent.webhook_url' => '']);
    // Keep real model events, authorization, validation, conflict service and transactions.
    Illuminate\Support\Facades\Mail::fake();
    Illuminate\Support\Facades\Event::fake([
        App\Events\AdminInboxChanged::class, App\Events\PortalNotificationCreated::class,
    ]);
    Illuminate\Support\Facades\Bus::fake([App\Jobs\ArchiveOfficialDocument::class]);
    return $app;
}

function workerEnvironment(): array
{
    // Explicit allowlist; proc_open never inherits the ambient environment.
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

function spawnWorker(string $name, int $index): mixed
{
    $root = '/scratch/race-'.$name;
    $process = proc_open([PHP_BINARY, __FILE__, 'worker', $name, (string) $index], [
        0 => ['file', '/dev/null', 'r'],
        1 => ['file', $root.'/result-'.$index.'.json', 'w'],
        2 => ['file', $root.'/stderr-'.$index.'.log', 'w'],
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

function employee(int $sequence): Employee
{
    return Employee::create([
        'nip' => '900000000007'.str_pad((string) $sequence, 6, '0', STR_PAD_LEFT),
        'nama_lengkap' => 'Dummy ST race '.$sequence, 'is_active' => true,
        'jabatan' => 'Dummy PNS', 'satuan_kerja' => 'Dummy audit unit',
    ]);
}

function document(array $ids, string $number, string $status): array
{
    return [
        'nomor_surat' => $number, 'status' => $status,
        'maksud_tujuan' => 'Dummy isolated ST concurrency regression',
        'tanggal_mulai' => '2026-11-20', 'tanggal_selesai' => '2026-11-25',
        'tanggal_surat' => '2026-11-19', 'tempat_tujuan' => 'Dummy audit location',
        'sumber_dana' => 'Dummy audit funding',
        'employees' => array_map(fn ($id) => ['id' => $id], $ids),
    ];
}

function schedulingLock(string $sql, array $bindings, array $ids): bool
{
    $sql = strtolower($sql);
    if (!str_starts_with($sql, 'select ') || !str_contains($sql, 'from "kpg_employees"')
        || !str_ends_with($sql, 'for update')) {
        return false;
    }
    $boundToSource = false;
    foreach (debug_backtrace(DEBUG_BACKTRACE_IGNORE_ARGS, 32) as $frame) {
        if (($frame['class'] ?? '') === AssignmentLetterController::class
            && ($frame['function'] ?? '') === 'lockEmployeesForScheduling') {
            $boundToSource = true;
            break;
        }
    }
    if (!$boundToSource || !str_contains($sql, 'order by "id" asc')
        || array_map('intval', array_slice($bindings, 0, count($ids))) !== $ids || DB::transactionLevel() < 1) {
        throw new RuntimeException('unexpected-controller-lock-query');
    }
    return true;
}

try {
    $stage = 'bootstrap';
    $app = bootFixture();
    if ($mode === 'worker') {
        $stage = 'worker-input';
        $name = $argv[2] ?? '';
        $index = (int) ($argv[3] ?? 0);
        if (!in_array($name, ['store', 'publish'], true) || !in_array($index, [1, 2], true)) {
            throw new RuntimeException('invalid-worker-arguments');
        }
        $root = '/scratch/race-'.$name;
        $input = json_decode(file_get_contents($root.'/input.json'), true, 16, JSON_THROW_ON_ERROR);
        $kernel = $app->make(Illuminate\Contracts\Http\Kernel::class);
        $server = ['HTTP_ACCEPT' => 'application/json',
            'HTTP_AUTHORIZATION' => 'Bearer '.$input['bearer'], 'REMOTE_ADDR' => '127.0.0.1'];
        $stage = 'kernel-prime';
        $prime = Illuminate\Http\Request::create('/api/me', 'GET', [], [], [], $server);
        $response = $kernel->handle($prime);
        $kernel->terminate($prime, $response);
        if ($response->getStatusCode() !== 200) {
            throw new RuntimeException('real-sanctum-prime-failed');
        }
        DB::selectOne("select set_config('application_name', ?, false)", ['st-race-'.$name.'-'.$index]);
        $pid = (int) DB::selectOne('select pg_backend_pid() as pid')->pid;
        $before = $after = false;
        $gateSeconds = null;
        DB::connection()->beforeExecuting(function ($sql, $bindings) use ($root, $index, $input, &$before): void {
            if (!schedulingLock($sql, $bindings, $input['sorted_employee_ids'])) {
                return;
            }
            if ($before) {
                throw new RuntimeException('repeated-scheduling-lock');
            }
            $before = true;
            putJson($root.'/before-lock-'.$index.'.json', ['before_lock' => true]);
        });
        DB::listen(function (Illuminate\Database\Events\QueryExecuted $query) use ($root, $index, $input, &$after, &$gateSeconds): void {
            if (!schedulingLock($query->sql, $query->bindings, $input['sorted_employee_ids'])) {
                return;
            }
            $after = true;
            putJson($root.'/after-lock-'.$index.'.json', ['locked' => true]);
            if ($index === 1) {
                $start = microtime(true);
                waitFor(fn () => is_file($root.'/release-1'), 1.95);
                $gateSeconds = microtime(true) - $start;
            }
        });
        putJson($root.'/primed-'.$index.'.json', ['pid' => $pid]);
        $stage = 'coordinator-start';
        waitFor(fn () => is_file($root.'/go-'.$index));
        $stage = 'kernel-request';
        $spec = $input['requests'][$index - 1];
        $request = Illuminate\Http\Request::create($spec['uri'], $spec['method'], $spec['body'], [], [], $server);
        $response = $kernel->handle($request);
        $body = json_decode($response->getContent(), true);
        $kernel->terminate($request, $response);
        echo json_encode(['kind' => 'http-result', 'status' => $response->getStatusCode(),
            'request_id' => $body['data']['id'] ?? null, 'before_lock' => $before,
            'after_lock' => $after, 'lock_order_sorted' => $before && $after,
            'gate_seconds' => $gateSeconds === null ? null : round($gateSeconds, 6),
            'conflict_count' => count($body['conflicts'] ?? [])], JSON_THROW_ON_ERROR)."\n";
        exit(0);
    }
    if ($mode !== 'run') {
        throw new RuntimeException('invalid-mode');
    }
    $stage = 'schema-check';
    foreach (['users', 'personal_access_tokens', 'kpg_employees', 'st_assignment_letters',
        'st_assignment_letter_employees', 'kpg_employee_leave_requests'] as $table) {
        if (!Illuminate\Support\Facades\Schema::hasTable($table)) {
            throw new RuntimeException('parent-must-migrate-full-dummy-schema');
        }
    }
    $actor = User::create([
        'username' => '900000000007000100', 'name' => 'Dummy ST race administrator',
        'email' => '900000000007000100@example.test', 'password' => 'Dummy-local-only-password',
        'role' => 'admin', 'access_modules' => ['surat_tugas'], 'permissions' => null,
        'is_active' => true, 'must_change_password' => false,
    ]);
    $bearer = $actor->createToken('dummy-st-race-fixture')->plainTextToken;
    $results = [];
    foreach (['store', 'publish'] as $caseNumber => $name) {
        $stage = 'seed-'.$name;
        $root = '/scratch/race-'.$name;
        if (!mkdir($root, 0700)) {
            throw new RuntimeException('fresh-scenario-directory-required');
        }
        $ids = [employee($caseNumber * 2 + 1)->id, employee($caseNumber * 2 + 2)->id];
        sort($ids, SORT_NUMERIC);
        $requests = [];
        foreach ([1, 2] as $index) {
            $order = $index === 1 ? $ids : array_reverse($ids);
            $body = document($order, 'DUMMY-ST-RACE-'.$name.'-'.$index, $name === 'store' ? 'pending' : 'approved');
            $uri = '/api/surat-tugas';
            if ($name === 'publish') {
                // Drafts are not scheduling reservations; both valid documents must exist before approval races.
                $letter = AssignmentLetter::create(array_merge(
                    array_diff_key($body, ['employees' => true]), ['status' => 'draft', 'created_by' => $actor->id]
                ));
                $letter->employees()->attach($order);
                $uri .= '/'.$letter->id.'/approve';
            }
            $requests[] = ['method' => $name === 'store' ? 'POST' : 'PUT', 'uri' => $uri, 'body' => $body];
        }
        putJson($root.'/input.json', ['bearer' => $bearer, 'requests' => $requests, 'sorted_employee_ids' => $ids]);
        $stage = 'prime-'.$name;
        $processes = [spawnWorker($name, 1), spawnWorker($name, 2)];
        waitFor(fn () => is_file($root.'/primed-1.json') && is_file($root.'/primed-2.json'));
        $firstPid = json_decode(file_get_contents($root.'/primed-1.json'), true, 4, JSON_THROW_ON_ERROR)['pid'];
        $secondPid = json_decode(file_get_contents($root.'/primed-2.json'), true, 4, JSON_THROW_ON_ERROR)['pid'];
        $stage = 'first-lock-'.$name;
        file_put_contents($root.'/go-1', 'go');
        waitFor(fn () => is_file($root.'/after-lock-1.json'));
        $stage = 'overlap-'.$name;
        file_put_contents($root.'/go-2', 'go');
        $overlap = false;
        try {
            // pg_blocking_pids is native evidence of an actual in-flight blocked SQL statement,
            // rather than evidence that two commands were merely launched near each other.
            waitFor(function () use ($root, $firstPid, $secondPid, &$overlap): bool {
                if (!is_file($root.'/before-lock-2.json')) {
                    return false;
                }
                $state = DB::selectOne("select exists (select 1 from pg_stat_activity
                    where pid = ? and state = 'active' and wait_event_type = 'Lock'
                    and ? = any(pg_blocking_pids(pid))
                    and query ilike '%from \"kpg_employees\"%for update%') as blocked", [$secondPid, $firstPid]);
                return $overlap = in_array($state->blocked, [true, 1, '1', 't'], true);
            }, 1.5);
        } finally {
            file_put_contents($root.'/release-1', 'release');
        }
        $stage = 'collect-'.$name;
        $codes = collectWorkers($processes);
        $workers = [];
        foreach ([1, 2] as $index) {
            $path = $root.'/result-'.$index.'.json';
            if (filesize($path) > 4096) {
                throw new RuntimeException('oversize-worker-result');
            }
            $workers[] = json_decode(file_get_contents($path), true, 16, JSON_THROW_ON_ERROR);
        }
        $statuses = array_column($workers, 'status');
        sort($statuses);
        $stage = 'invariant-'.$name;
        $letters = AssignmentLetter::whereHas('employees', fn ($q) => $q->whereIn('kpg_employees.id', $ids))->get();
        $states = $letters->pluck('status')->all();
        sort($states);
        $expectedStatuses = $name === 'store' ? [201, 422] : [200, 422];
        $expectedStates = $name === 'store' ? ['pending'] : ['approved', 'draft'];
        $employeeCounts = [];
        foreach ($ids as $id) {
            $employeeCounts[] = DB::table('st_assignment_letters as sal')
                ->join('st_assignment_letter_employees as sale', 'sale.assignment_letter_id', '=', 'sal.id')
                ->where('sale.employee_id', $id)->whereNull('sal.deleted_at')
                ->whereIn('sal.status', ['pending', 'approved', 'completed', 'published', 'diterbitkan'])
                ->where('sal.tanggal_mulai', '<=', '2026-11-25')->where('sal.tanggal_selesai', '>=', '2026-11-20')->count();
        }
        $pass = $overlap && $codes === [0, 0] && $statuses === $expectedStatuses
            && $states === $expectedStates && $employeeCounts === [1, 1]
            && ($workers[0]['status'] ?? null) === $expectedStatuses[0]
            && ($workers[1]['status'] ?? null) === 422
            && ($workers[1]['conflict_count'] ?? 0) === 2
            && ($workers[0]['lock_order_sorted'] ?? false) && ($workers[1]['lock_order_sorted'] ?? false)
            && ($workers[0]['gate_seconds'] ?? 3) <= 2.0;
        $results[] = ['case' => $name, 'pass' => $pass, 'http_statuses' => $statuses,
            'expected_http_statuses' => $expectedStatuses, 'worker_exits' => $codes,
            'both_primed_before_start' => true, 'worker2_blocked_on_worker1' => $overlap,
            'inverse_employee_input_order' => true, 'letter_states' => $states,
            'active_assignments_per_employee' => $employeeCounts, 'workers' => $workers];
    }
    $report = ['schema' => 1, 'setup' => 'ok', 'driver' => 'pgsql',
        'pass' => !in_array(false, array_column($results, 'pass'), true),
        'concurrency_limit' => 2, 'gate_bound_seconds' => 2, 'observer_bound_seconds' => 3, 'cases' => $results];
    putJson('/scratch/race-results.json', $report);
    echo json_encode($report, JSON_THROW_ON_ERROR)."\n";
    exit($report['pass'] ? 0 : 1);
} catch (Throwable $error) {
    // Sanitized errors: never log bearer inputs, SQL bindings, ambient config or exception messages.
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
