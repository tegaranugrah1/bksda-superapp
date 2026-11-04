<?php
/** Dummy PostgreSQL only. Parent must execute inside the approved read-only /app sandbox. */
declare(strict_types=1);

use App\Models\User;
use App\Modules\Kepegawaian\Models\Employee;
use App\Modules\Kepegawaian\Models\EmployeeLeave;
use App\Modules\Kepegawaian\Models\EmployeeLeaveRequest;
use Illuminate\Support\Facades\DB;

$stage = 'guard';
$mode = $argv[1] ?? 'run';
$out = '/scratch/race-results.json';

function putJson(string $path, array $value): void
{
    if (file_put_contents($path, json_encode($value, JSON_THROW_ON_ERROR | JSON_PRETTY_PRINT)."\n") === false) {
        throw new RuntimeException('Result write failed');
    }
}

function bootFixture(): Illuminate\Foundation\Application
{
    if (getenv('PORTAL_RACE_FIXTURE') !== '1' || getenv('APP_ENV') !== 'testing'
        || getenv('DB_CONNECTION') !== 'pgsql' || getenv('DB_HOST') !== '127.0.0.1'
        || !str_contains(strtolower((string) getenv('DB_DATABASE')), 'audit')
        || getenv('APP_BASE_PATH') !== '/app' || !is_dir('/scratch')) {
        throw new RuntimeException('Isolated audit environment required');
    }
    require '/app/vendor/autoload.php';
    $app = require '/app/bootstrap/app.php';
    $app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
    if (DB::connection()->getDriverName() !== 'pgsql') {
        throw new RuntimeException('Real PostgreSQL required');
    }
    config(['auth.two_factor_enforce' => false]);
    Illuminate\Support\Facades\Mail::fake();
    Illuminate\Support\Facades\Notification::fake();
    Illuminate\Support\Facades\Event::fake([
        App\Events\AdminInboxChanged::class, App\Events\PortalNotificationCreated::class,
    ]);
    Illuminate\Support\Facades\Bus::fake([App\Jobs\ArchiveOfficialDocument::class]);
    return $app;
}

function payload(string $start = '2026-11-02', string $end = '2026-11-02'): array
{
    return [
        'jenis_cuti' => 'CT', 'alasan_cuti' => 'Dummy concurrency fixture',
        'tanggal_mulai' => $start, 'tanggal_selesai' => $end,
        'alamat_menjalankan_cuti' => 'Dummy address', 'telepon' => '080000000001',
    ];
}

function actor(int $sequence, bool $admin = false): array
{
    $nip = '900000000001'.str_pad((string) $sequence, 6, '0', STR_PAD_LEFT);
    $employee = Employee::create([
        'nip' => $nip, 'nama_lengkap' => 'Dummy race '.$sequence,
        'jabatan' => 'Dummy PNS', 'pangkat_golongan' => 'Dummy Rank',
        'satuan_kerja' => 'Dummy unit', 'is_active' => true,
    ]);
    $user = User::create([
        'username' => $nip, 'name' => 'Dummy race '.$sequence, 'email' => $nip.'@example.test',
        'password' => 'Dummy-local-only-password', 'role' => $admin ? 'admin' : 'user',
        'access_modules' => $admin ? ['kepegawaian'] : [], 'permissions' => null,
        'is_active' => true, 'must_change_password' => false,
    ]);
    return [$employee, $user->createToken('dummy-race-fixture')->plainTextToken];
}

function pending(Employee $employee, string $start, string $end, int $days): EmployeeLeaveRequest
{
    return EmployeeLeaveRequest::create(array_merge(payload($start, $end), [
        'employee_id' => $employee->id, 'jenis_cuti' => 'Cuti Tahunan',
        'tanggal_pengajuan' => '2026-10-31', 'jumlah_hari' => $days,
        'status' => 'PENGAJUAN', 'status_pertimbangan_atasan' => 'PENGAJUAN',
        'status_pertimbangan_pejabat' => 'PENGAJUAN',
    ]));
}

function workerEnvironment(): array
{
    // Never forward ambient credentials, agent state, sockets, proxy settings, or host paths.
    $keys = ['PATH', 'HOME', 'TMPDIR', 'LANG', 'LC_ALL', 'TZ', 'PHPRC', 'PHP_INI_SCAN_DIR',
        'LD_LIBRARY_PATH', 'APP_NAME', 'APP_ENV', 'APP_KEY',
        'APP_DEBUG', 'APP_URL', 'APP_BASE_PATH', 'LARAVEL_STORAGE_PATH', 'APP_CONFIG_CACHE',
        'APP_ROUTES_CACHE', 'APP_EVENTS_CACHE', 'APP_SERVICES_CACHE', 'APP_PACKAGES_CACHE',
        'VIEW_COMPILED_PATH', 'LOG_CHANNEL', 'LOG_LEVEL', 'DB_CONNECTION', 'DB_HOST', 'DB_PORT',
        'DB_DATABASE', 'DB_USERNAME', 'DB_PASSWORD', 'CACHE_STORE', 'SESSION_DRIVER',
        'QUEUE_CONNECTION', 'MAIL_MAILER', 'BROADCAST_CONNECTION', 'FILESYSTEM_DISK',
        'BCRYPT_ROUNDS', 'PORTAL_RACE_FIXTURE', 'PGOPTIONS'];
    $env = [];
    foreach ($keys as $key) {
        if (($value = getenv($key)) !== false) {
            $env[$key] = $value;
        }
    }
    return $env;
}

function spawnWorker(string $name, int $worker): mixed
{
    $root = '/scratch/race-'.$name;
    $process = proc_open([PHP_BINARY, __FILE__, 'worker', $name, (string) $worker], [
        0 => ['file', '/dev/null', 'r'], 1 => ['file', $root.'/result-'.$worker.'.json', 'w'],
        2 => ['file', $root.'/stderr-'.$worker.'.log', 'w'],
    ], $pipes, '/app', workerEnvironment());
    if (!is_resource($process)) {
        throw new RuntimeException('Could not create worker');
    }
    return $process;
}

function collect(array $processes, ?callable $onExit = null): array
{
    $codes = [];
    $deadline = microtime(true) + 12;
    while (count($codes) < count($processes) && microtime(true) < $deadline) {
        foreach ($processes as $index => $process) {
            if (isset($codes[$index])) {
                continue;
            }
            $state = proc_get_status($process);
            if (!$state['running']) {
                $codes[$index] = $state['exitcode'];
                if ($onExit) { $onExit($index); }
            }
        }
        usleep(10000);
    }
    foreach ($processes as $index => $process) {
        if (!isset($codes[$index])) {
            proc_terminate($process, 9);
            $codes[$index] = 124;
        }
        proc_close($process);
    }
    ksort($codes);
    return array_values($codes);
}

try {
    $stage = 'bootstrap';
    $app = bootFixture();
    if ($mode === 'worker') {
        $stage = 'worker-input';
        $name = $argv[2] ?? '';
        $index = (int) ($argv[3] ?? 0);
        if (!in_array($name, ['rename_create'], true)
            || !in_array($index, [1, 2], true)) {
            throw new RuntimeException('Invalid worker arguments');
        }
        $root = '/scratch/race-'.$name;
        $input = json_decode(file_get_contents($root.'/input.json'), true, 16, JSON_THROW_ON_ERROR);
        $requestInput = $input['requests'][$index - 1];
        $gated = false;
        $peers = 0;
        $barrier = static function () use (&$gated, &$peers, $root, $index, $name): void {
            if ($gated) {
                return;
            }
            $gated = true;
            file_put_contents($root.'/ready-'.$index, 'ready');
            $deadline = microtime(true) + 2;
            do {
                clearstatcache();
                $peers = (int) is_file($root.'/ready-1') + (int) is_file($root.'/ready-2');
                if (($name === 'rename_create' && $index === 1) ? is_file($root.'/master-committed') : $peers === 2) {
                    break;
                }
                usleep(10000);
            } while (microtime(true) < $deadline);
        };
        if ($name === 'rename_create') {
            if ($index === 1) { EmployeeLeaveRequest::creating($barrier); }
            else { App\Modules\Kepegawaian\Models\LeaveType::updated($barrier); }
        } elseif (in_array($name, ['duplicate', 'reservation'], true)) {
            EmployeeLeaveRequest::creating($barrier);
        } else {
            EmployeeLeave::retrieved($barrier);
        }
        $stage = 'http-kernel-prime';
        $kernel = $app->make(Illuminate\Contracts\Http\Kernel::class);
        $prime = Illuminate\Http\Request::create('/api/me', 'GET', [], [], [], [
            'HTTP_ACCEPT' => 'application/json', 'HTTP_AUTHORIZATION' => 'Bearer '.($input['bearers'][$index - 1] ?? $input['bearer']),
            'REMOTE_ADDR' => '127.0.0.1',
        ]);
        $primeResponse = $kernel->handle($prime);
        $kernel->terminate($prime, $primeResponse);
        if ($primeResponse->getStatusCode() !== 200) {
            throw new RuntimeException('Dummy bearer prime failed');
        }
        file_put_contents($root.'/booted-'.$index, 'booted');
        $bootDeadline = microtime(true) + 20;
        while (!is_file($root.'/go-'.$index) && microtime(true) < $bootDeadline) {
            clearstatcache(); usleep(10000);
        }
        if (!is_file($root.'/go-'.$index)) {
            throw new RuntimeException('Bounded coordinator gate missing');
        }
        $stage = 'http-kernel';
        $request = Illuminate\Http\Request::create(
            $requestInput['uri'], $requestInput['method'], $requestInput['body'], [], [], [
                'HTTP_ACCEPT' => 'application/json', 'HTTP_AUTHORIZATION' => 'Bearer '.($input['bearers'][$index - 1] ?? $input['bearer']),
                'REMOTE_ADDR' => '127.0.0.1',
            ]
        );
        $kernel = $app->make(Illuminate\Contracts\Http\Kernel::class);
        $response = $kernel->handle($request);
        $body = json_decode($response->getContent(), true);
        $kernel->terminate($request, $response);
        echo json_encode([
            'kind' => 'http-result', 'status' => $response->getStatusCode(),
            'request_id' => $body['data']['id'] ?? null, 'gate_reached' => $gated, 'gate_peers' => $peers,
        ], JSON_THROW_ON_ERROR)."\n";
        exit(0);
    }
    if ($mode !== 'run') {
        throw new RuntimeException('Unknown mode');
    }
    $stage = 'schema-check';
    // Parent owns disposable migration selection; this fixture never drops a database.
    if (!Illuminate\Support\Facades\Schema::hasTable('kpg_employee_leave_requests')) {
        throw new RuntimeException('Parent must migrate the disposable audit database first');
    }
    $annual = App\Modules\Kepegawaian\Models\LeaveType::where('kode', 'CT')->first();
    if (!$annual || !$annual->is_active || !$annual->potong_kuota_tahunan || $annual->hitung_hari !== 'hari_kerja') {
        throw new RuntimeException('Expected seeded annual working-day master');
    }
    $results = [];
    [$admin, $adminBearer] = actor(100, true);
    foreach (['rename_create'] as $number => $name) {
        $stage = 'seed-'.$name;
        $root = '/scratch/race-'.$name;
        if (!mkdir($root, 0700)) {
            throw new RuntimeException('Fresh scenario directory required');
        }
        [$employee, $bearer] = actor($number + 1);
        $balance = EmployeeLeave::create([
            'employee_id' => $employee->id, 'year' => 2026, 'hak_cuti_n' => 12,
            'sisa_cuti_n1' => 0, 'cuti_terpakai_n1' => 0, 'sisa_cuti_n2' => 0,
            'cuti_terpakai_n2' => 0, 'cuti_terpakai_n0' => 0,
        ]);
        if ($name === 'rename_create') {
            $master = App\Modules\Kepegawaian\Models\LeaveType::create([
                'nama' => 'Dummy Concurrent Annual', 'kode' => 'RA', 'hitung_hari' => 'hari_kerja',
                'potong_kuota_tahunan' => true, 'maks_hari' => 12, 'is_active' => true, 'urutan' => 99,
            ]);
            $first = ['method' => 'POST', 'uri' => '/api/me/leave-requests',
                'body' => array_merge(payload(), ['jenis_cuti' => 'RA'])];
            $second = ['method' => 'PUT', 'uri' => '/api/kepegawaian/leave-types/'.$master->id,
                'body' => ['nama' => 'Dummy Renamed Annual', 'kode' => 'RA', 'hitung_hari' => 'hari_kerja',
                    'potong_kuota_tahunan' => true, 'maks_hari' => 12, 'is_active' => true, 'urutan' => 99]];
        } elseif (in_array($name, ['duplicate', 'reservation'], true)) {
            $first = ['method' => 'POST', 'uri' => '/api/me/leave-requests',
                'body' => $name === 'duplicate' ? payload() : payload('2026-11-02', '2026-11-11')];
            $second = $name === 'duplicate' ? $first : array_merge($first, ['body' => payload('2026-11-16', '2026-11-25')]);
        } else {
            $bearer = $adminBearer;
            $days = $name === 'approve_budget' ? 8 : 1;
            $row = pending($employee, '2026-11-02', $days === 8 ? '2026-11-11' : '2026-11-02', $days);
            $secondRow = $name === 'approve_budget' ? pending($employee, '2026-11-16', '2026-11-25', 8) : $row;
            $suffix = $name === 'status_same' ? '/status' : '/approve';
            $first = ['method' => $name === 'status_same' ? 'PUT' : 'POST',
                'uri' => '/api/kepegawaian/leave-requests/'.$row->id.$suffix,
                'body' => $name === 'status_same' ? ['status' => 'DISETUJUI'] : []];
            $second = array_merge($first, ['uri' => '/api/kepegawaian/leave-requests/'.$secondRow->id.$suffix]);
        }
        putJson($root.'/input.json', ['bearer' => $bearer, 'bearers' => [$bearer, $adminBearer], 'requests' => [$first, $second]]);
        $stage = 'requests-'.$name;
        $processes = [spawnWorker($name, 1), spawnWorker($name, 2)];
        $deadline = microtime(true) + 20;
        while ((!is_file($root.'/booted-1') || !is_file($root.'/booted-2')) && microtime(true) < $deadline) {
            clearstatcache(); usleep(10000);
        }
        if (!is_file($root.'/booted-1') || !is_file($root.'/booted-2')) {
            collect($processes);
            throw new RuntimeException('Workers did not finish bounded prime');
        }
        file_put_contents($root.'/go-1', 'go');
        $deadline = microtime(true) + 10;
        while (!is_file($root.'/ready-1') && microtime(true) < $deadline) {
            clearstatcache(); usleep(10000);
        }
        if (!is_file($root.'/ready-1')) {
            collect($processes);
            throw new RuntimeException('First request did not reach expected gate');
        }
        file_put_contents($root.'/go-2', 'go');
        $codes = collect($processes, static function (int $index) use ($root): void {
            if ($index === 1) { file_put_contents($root.'/master-committed', 'committed'); }
        });
        $workers = [];
        foreach ([1, 2] as $index) {
            $workers[] = json_decode(file_get_contents($root.'/result-'.$index.'.json'), true, 16, JSON_THROW_ON_ERROR);
        }
        $statuses = array_column($workers, 'status');
        sort($statuses);
        if ($codes !== [0, 0] || count($statuses) !== 2
            || array_diff($statuses, $name === 'rename_create' ? [200, 201] : (in_array($name, ['duplicate', 'reservation'], true) ? [201, 422] : [200, 422]))) {
            throw new RuntimeException('Worker or positive HTTP setup failed');
        }
        $requests = EmployeeLeaveRequest::where('employee_id', $employee->id);
        $pendingDays = (int) (clone $requests)->where('status', 'PENGAJUAN')->annual()->sum('jumlah_hari');
        $approvedDays = (int) (clone $requests)->where('status', 'DISETUJUI')->annual()->sum('jumlah_hari');
        $used = (int) $balance->fresh()->cuti_terpakai_n0;
        $count = (clone $requests)->count();
        $expected = match ($name) {
            'rename_create' => [200, 201],
            'duplicate', 'reservation' => [201, 422],
            'approve_budget' => [200, 422],
            default => [200, 200],
        };
        $pass = $statuses === $expected && match ($name) {
            'rename_create' => $count === 1 && $pendingDays === 1
                && (clone $requests)->first()->jenis_cuti === $master->fresh()->nama,
            'duplicate' => $count === 1 && $pendingDays === 1,
            'reservation' => $count === 1 && $pendingDays === 8,
            'approve_budget' => $used === 8 && $approvedDays === 8,
            default => $used === 1 && $approvedDays === 1,
        };
        $results[] = ['case' => $name, 'pass' => $pass, 'http_statuses' => $statuses,
            'worker_exits' => $codes, 'workers' => $workers, 'request_count' => $count,
            'pending_days' => $pendingDays, 'approved_days' => $approvedDays, 'debited_days' => $used,
            'master_current_name' => $master->fresh()->nama, 'saved_request_type' => (clone $requests)->first()?->jenis_cuti,
            'entitlement_days' => 12, 'expected_http_statuses' => $expected];
    }
    $pass = !in_array(false, array_column($results, 'pass'), true);
    $report = ['schema' => 1, 'setup' => 'ok', 'driver' => 'pgsql', 'pass' => $pass,
        'concurrency_limit' => 2, 'gate_bound_seconds' => 2, 'cases' => $results];
    putJson($out, $report);
    echo json_encode($report, JSON_THROW_ON_ERROR)."\n";
    exit($pass ? 0 : 1);
} catch (Throwable $error) {
    // Never emit request inputs, bearer values, SQL bindings, passwords, or ambient configuration.
    $report = ['schema' => 1, 'setup' => 'fixture_error', 'pass' => null, 'stage' => $stage,
        'exception_class' => get_class($error), 'exception_code' => (string) $error->getCode()];
    if ($mode === 'worker') {
        echo json_encode($report)."\n";
    } else {
        putJson($out, $report);
        echo json_encode($report)."\n";
    }
    exit(2);
}
