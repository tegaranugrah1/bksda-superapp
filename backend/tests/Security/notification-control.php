<?php
// Native in-sandbox fixture control; never exposed as an application HTTP route.
require '/app/vendor/autoload.php';
$app = require '/app/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
if (getenv('APP_ENV') !== 'audit' || getenv('DB_DATABASE') !== '/scratch/e2e.sqlite') throw new LogicException('Disposable fixture required');
$action = $argv[1] ?? '';
if (in_array($action, ['stop-reverb', 'start-reverb', 'stop-worker', 'start-worker'], true)) {
    [$verb, $service] = explode('-', $action);
    @unlink('/scratch/'.$service.'.'.$verb.'.done');
    file_put_contents('/scratch/'.$service.'.'.$verb, 'requested');
    echo json_encode(['control' => $verb]);
} elseif ($action === 'notify') {
    $user = App\Models\User::where('username', '900000000000000001')->firstOrFail();
    $notice = app(App\Services\PortalNotificationService::class)->notifyUser($user, 'Dummy native transport', 'Dummy private notification body', 'system');
    if (!$notice) throw new RuntimeException('Dummy notification was not created');
    echo json_encode(['id' => $notice->id]);
} elseif ($action === 'rebroadcast') {
    $notice = App\Models\PortalNotification::findOrFail((int) ($argv[2] ?? 0));
    if (!str_starts_with($notice->user->username, '900')) throw new LogicException('Dummy recipient required');
    event(new App\Events\PortalNotificationCreated($notice));
    echo json_encode(['id' => $notice->id]);
} elseif ($action === 'work') {
    Illuminate\Support\Facades\Artisan::call('queue:work', ['--once' => true, '--tries' => 1, '--timeout' => 8]);
    echo json_encode(['failed' => Illuminate\Support\Facades\DB::table('failed_jobs')->count(), 'pending' => Illuminate\Support\Facades\DB::table('jobs')->count()]);
} elseif ($action === 'retry') {
    foreach (Illuminate\Support\Facades\DB::table('failed_jobs')->pluck('uuid') as $id) Illuminate\Support\Facades\Artisan::call('queue:retry', ['id' => [$id]]);
    echo json_encode(['pending' => Illuminate\Support\Facades\DB::table('jobs')->count()]);
} else throw new InvalidArgumentException('Unknown fixture command');
