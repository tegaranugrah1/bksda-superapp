<?php
// Disposable local E2E only; no production identities, providers or database.
require '/app/vendor/autoload.php';
$app = require '/app/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
if (getenv('APP_ENV') !== 'audit' || getenv('DB_DATABASE') !== '/scratch/e2e.sqlite') {
    throw new LogicException('Disposable E2E database required.');
}

config([
    'auth.two_factor_enforce' => false,
    'services.agent.webhook_url' => '',
    'filesystems.disks.drive' => ['driver' => 'local', 'root' => '/scratch/storage/drive', 'throw' => true],
    'filesystems.disks.drive_signer' => ['driver' => 'local', 'root' => '/scratch/storage/drive', 'throw' => true],
]);
$password = 'DummyE2E-Local-Password42!';
foreach (['A', 'B', 'C'] as $i => $suffix) {
    $nip = '90000000000000000'.($i + 1);
    App\Modules\Kepegawaian\Models\Employee::create([
        'nip' => $nip, 'nama_lengkap' => 'Dummy E2E Employee '.$suffix,
        'jabatan' => 'Dummy Staff', 'pangkat_golongan' => 'Penata (III/c)',
        'satuan_kerja' => 'Balai KSDA Kalimantan Timur', 'is_active' => true,
        'nama_bank' => 'BRI', 'nomor_rekening' => '000000000'.$i,
    ]);
    App\Models\User::create([
        'name' => 'Dummy E2E Employee '.$suffix, 'username' => $nip,
        'email' => 'dummy-e2e-'.strtolower($suffix).'@example.test', 'email_verified_at' => now(),
        'password' => $password, 'role' => 'user', 'access_modules' => $i===2 ? ['kepegawaian'] : [], 'permissions' => null,
        'is_active' => true, 'must_change_password' => false,
    ]);
}
$trash = App\Modules\Kepegawaian\Models\Employee::create([
    'nip' => '900000000000000004', 'nama_lengkap' => 'DUMMY_TRASH_PRIVATE_ROW', 'is_active' => false,
]);
$trash->delete();
App\Models\User::create([
    'name' => 'Dummy E2E Administrator', 'username' => 'dummy-e2e-admin',
    'email' => 'dummy-e2e-admin@example.test', 'email_verified_at' => now(), 'password' => $password,
    'role' => 'super_admin', 'access_modules' => ['kepegawaian', 'surat_tugas'],
    'permissions' => null, 'is_active' => true, 'must_change_password' => false,
]);
(new Database\Seeders\StTemplateSeeder())->run();
// Persist dummy storage selection for real HTTP requests; all security code remains native.
file_put_contents(getenv('APP_CONFIG_CACHE'), '<?php return '.var_export(config()->all(), true).';');
echo "Seeded three dummy employees, one dummy administrator and standard document catalogs.\n";
