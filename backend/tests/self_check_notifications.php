<?php

require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\PortalNotification;
use App\Models\User;
use App\Modules\Kepegawaian\Models\Employee;
use App\Services\PortalNotificationService;

echo "=== SELF CHECK PORTAL NOTIFICATIONS ===" . PHP_EOL;

$user = User::first();
if (!$user) {
    echo "No user found in DB." . PHP_EOL;
    exit(1);
}

echo "Testing with User ID: {$user->id} ({$user->name})" . PHP_EOL;

$service = app(PortalNotificationService::class);
$notif = $service->notifyUser(
    $user->id,
    'Uji Coba Notifikasi',
    'Ini adalah pesan uji notifikasi',
    'surat_tugas',
    'surat_tugas',
    'st-sample-123'
);

assert($notif !== null, 'Notification created');
assert($notif->title === 'Uji Coba Notifikasi', 'Title matches');
assert($notif->type === 'surat_tugas', 'Type matches');
assert($notif->read_at === null, 'Initially unread');

$unreadCount = PortalNotification::where('user_id', $user->id)
    ->whereNull('read_at')
    ->count();
assert($unreadCount >= 1, 'Unread count reflects new item');
echo "Unread count: {$unreadCount}" . PHP_EOL;

// Test Employee resolution
$employee = Employee::where('nip', $user->username)->first();
if ($employee) {
    $empNotif = $service->notifyEmployee(
        $employee,
        'Uji Notif Pegawai',
        'Notifikasi via Employee',
        'cuti',
        'cuti',
        'cuti-99'
    );
    assert($empNotif !== null, 'Employee notification created');
    assert($empNotif->user_id === $user->id, 'Resolved to correct user ID');
    echo "Employee notification verified: ID {$empNotif->id}" . PHP_EOL;
    $empNotif->delete();
}

// Cleanup
$notif->delete();

echo "=== ALL CHECKS PASSED ===" . PHP_EOL;
