'use strict';
/**
 * =============================================================================
 * PORTAL NOTIFICATIONS LIVE FULL-STACK E2E AUDIT (PLAYWRIGHT + LARAVEL + DB)
 * =============================================================================
 * - Menguji FE (Next.js :3000) <-> BE (Laravel :8000) <-> Database secara NYATA
 *   tanpa mock API `page.route()`.
 * - Membuat 5 user sandbox terisolasi (super_admin, admin kepegawaian, pegawai1,
 *   pegawai2, pegawai3) via Laravel bootstrap dan menghapus hanya ID sandbox di
 *   blok `finally`.
 * - Pelaporan status jujur & objektif: PASS | PARTIAL | FAIL | STOPPED / BLOCKED.
 * =============================================================================
 */

const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const Module = require('node:module');
const { execFileSync } = require('node:child_process');

const frontendRoot = path.resolve(__dirname, '..');
const backendRoot = path.resolve(frontendRoot, '..', 'backend');
const frontendRequire = Module.createRequire(path.join(frontendRoot, 'package.json'));
const { chromium } = frontendRequire('playwright');

const FE_BASE = process.env.E2E_FE_URL || 'http://localhost:3000';
const BE_BASE = process.env.E2E_BE_URL || 'http://localhost:8000';

const CHROME_PATH =
  process.platform === 'win32' && fs.existsSync('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe')
    ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
    : undefined;

const results = [];
function record(id, status, title, detail) {
  results.push({ id, status, title, detail });
  console.log(`  [${status}] [${id}] ${title} -> ${detail}`);
}

function runPhp(code) {
  const bootstrap = `
require 'vendor/autoload.php';
$app = require 'bootstrap/app.php';
$app->make(Illuminate\\Contracts\\Console\\Kernel::class)->bootstrap();
${code}
`;
  const out = execFileSync('php', ['-r', bootstrap], { cwd: backendRoot, encoding: 'utf8' });
  return JSON.parse(out.trim().split('\n').pop());
}

function setupSandboxData() {
  const tag = Date.now();
  return runPhp(`
use App\\Models\\User;
use App\\Models\\PortalNotification;
use App\\Modules\\Kepegawaian\\Models\\Employee;
use App\\Modules\\Kepegawaian\\Models\\EmployeeLeave;
use App\\Modules\\Kepegawaian\\Models\\EmployeeLeaveRequest;
use App\\Modules\\SuratTugas\\Models\\AssignmentLetter;
use App\\Services\\PortalNotificationService;
use Illuminate\\Support\\Facades\\Hash;
use Laravel\\Sanctum\\PersonalAccessToken;

// Clean up any leftover aborted sandbox records first (child tables before parent users/employees)
$oldUserIds = User::withTrashed()->where('username', 'like', 'sbx_%')->orWhere('email', 'like', 'sbx_%')->orWhere('name', 'like', '%Sandbox%')->pluck('id')->all();
$oldEmpIds = Employee::withTrashed()->where('nama_lengkap', 'like', '%Sandbox%')->pluck('id')->all();
if (!empty($oldUserIds)) {
    PortalNotification::whereIn('user_id', $oldUserIds)->delete();
    AssignmentLetter::withTrashed()->whereIn('created_by', $oldUserIds)->forceDelete();
    PersonalAccessToken::whereIn('tokenable_id', $oldUserIds)->delete();
}
AssignmentLetter::withTrashed()->where('maksud_tujuan', 'Sandbox ST Removed Test')->forceDelete();
EmployeeLeaveRequest::withTrashed()->where('alasan_cuti', 'like', 'Sandbox E2E Test%')->forceDelete();
if (!empty($oldEmpIds)) {
    EmployeeLeaveRequest::withTrashed()->whereIn('employee_id', $oldEmpIds)->forceDelete();
    EmployeeLeave::whereIn('employee_id', $oldEmpIds)->delete();
}
User::withTrashed()->where('username', 'like', 'sbx_%')->orWhere('email', 'like', 'sbx_%')->orWhere('name', 'like', '%Sandbox%')->forceDelete();
Employee::withTrashed()->where('nama_lengkap', 'like', '%Sandbox%')->forceDelete();

$tag = '${tag}';
$pw = Hash::make('SandboxPass!23');

$sa = User::create([
    'name' => 'Sandbox Super Admin',
    'username' => 'sbx_sa_' . $tag,
    'email' => 'sbx_sa_' . $tag . '@bksda.test',
    'password' => $pw,
    'role' => 'super_admin',
    'access_modules' => ['kepegawaian', 'bmn', 'surat_tugas', 'dereporting'],
    'permissions' => [],
    'is_active' => true,
    'must_change_password' => false,
]);

$empAdm = Employee::create(['nip' => '9901' . substr($tag, -10), 'nama_lengkap' => 'Sandbox Admin Kpg', 'is_active' => true]);
$adm = User::create([
    'name' => 'Sandbox Admin Kpg',
    'username' => $empAdm->nip,
    'email' => 'sbx_adm_' . $tag . '@bksda.test',
    'password' => $pw,
    'role' => 'admin',
    'access_modules' => ['kepegawaian'],
    'permissions' => [],
    'is_active' => true,
    'must_change_password' => false,
]);

$emp1 = Employee::create(['nip' => '9902' . substr($tag, -10), 'nama_lengkap' => 'Duriawati Halim Sandbox', 'is_active' => true]);
$u1 = User::create([
    'name' => 'Duriawati Halim Sandbox',
    'username' => $emp1->nip,
    'email' => 'sbx_u1_' . $tag . '@bksda.test',
    'password' => $pw,
    'role' => 'user',
    'access_modules' => ['surat_tugas'],
    'permissions' => [],
    'is_active' => true,
    'must_change_password' => false,
]);

$emp2 = Employee::create(['nip' => '9903' . substr($tag, -10), 'nama_lengkap' => 'Sandbox Pegawai Dua', 'is_active' => true]);
$u2 = User::create([
    'name' => 'Sandbox Pegawai Dua',
    'username' => $emp2->nip,
    'email' => 'sbx_u2_' . $tag . '@bksda.test',
    'password' => $pw,
    'role' => 'user',
    'access_modules' => [],
    'permissions' => [],
    'is_active' => true,
    'must_change_password' => false,
]);

$emp3 = Employee::create(['nip' => '9904' . substr($tag, -10), 'nama_lengkap' => 'Sandbox Pegawai Tiga', 'is_active' => true]);
$u3 = User::create([
    'name' => 'Sandbox Pegawai Tiga',
    'username' => $emp3->nip,
    'email' => 'sbx_u3_' . $tag . '@bksda.test',
    'password' => $pw,
    'role' => 'user',
    'access_modules' => ['dereporting'],
    'permissions' => [],
    'is_active' => true,
    'must_change_password' => false,
]);

// 1. Real Leave Request by pegawai1 + real PortalNotification to sa & adm & u1
$leave = EmployeeLeaveRequest::create([
    'employee_id' => $emp1->id,
    'jenis_cuti' => 'Cuti Tahunan',
    'tanggal_pengajuan' => now()->toDateString(),
    'tanggal_mulai' => '2026-12-01',
    'tanggal_selesai' => '2026-12-02',
    'jumlah_hari' => 2,
    'alasan_cuti' => 'Sandbox E2E Test',
    'alamat_menjalankan_cuti' => 'Samarinda',
    'status' => 'DISETUJUI',
]);
$notifIds = [];
$svc = app(PortalNotificationService::class);
// sa gets both new-format admin notice (data.link) and legacy notice (data=null) to prove both navigate safely
$nSaNew = $svc->notifyUser($sa->id, 'Pengajuan Cuti Baru', "Pengajuan Cuti Tahunan baru oleh {$emp1->nama_lengkap}.", 'cuti', 'cuti', (string) $leave->id, ['link' => '/kepegawaian/cuti', 'leave_id' => $leave->id]);
if ($nSaNew) $notifIds[] = $nSaNew->id;
$nAdm = $svc->notifyUser($adm->id, 'Pengajuan Cuti Baru', "Pengajuan Cuti Tahunan baru oleh {$emp1->nama_lengkap}.", 'cuti', 'cuti', (string) $leave->id, ['link' => '/kepegawaian/cuti', 'leave_id' => $leave->id]);
if ($nAdm) $notifIds[] = $nAdm->id;
$nOwner = $svc->notifyUser($u1->id, 'Pengajuan Cuti Disetujui', 'Pengajuan Cuti Tahunan Anda telah disetujui.', 'cuti', 'cuti', (string) $leave->id, ['status' => 'DISETUJUI']);
if ($nOwner) $notifIds[] = $nOwner->id;

// 2. Real Surat Tugas without emp1, plus removed notification for emp1
$st = AssignmentLetter::create([
    'nomor_surat' => 'SBX/ST/' . $tag,
    'maksud_tujuan' => 'Sandbox ST Removed Test',
    'tempat_tujuan' => 'Samarinda',
    'tanggal_mulai' => '2026-12-05',
    'tanggal_selesai' => '2026-12-06',
    'sumber_dana' => 'dipa',
    'status' => 'approved',
    'created_by' => $adm->id,
]);
$nStRemoved = $svc->notifyUser($u1->id, 'Perubahan Penugasan Surat Tugas', 'Anda tidak lagi tercantum pada ST ' . $st->nomor_surat, 'surat_tugas', 'surat_tugas', (string) $st->id, ['status' => 'removed', 'availability' => 'unavailable']);
if ($nStRemoved) $notifIds[] = $nStRemoved->id;

// 3. HealthMonitor notification for super_admin -> safe root link '/'
$nHealth = $svc->notifyUser($sa->id, 'Peringatan Kesehatan Sistem', 'Storage hampir penuh (sandbox).', 'system', 'dashboard', null, ['link' => '/']);
if ($nHealth) $notifIds[] = $nHealth->id;

// 4. DeReporting notification + unsafe external link check for pegawai3
$nDeRep = $svc->notifyUser($u3->id, 'Tanggapan Baru Diterima', "Tanggapan baru telah masuk pada formulir 'Sandbox Satwa'.", 'dereporting', 'responses', '999', ['form_id' => '5', 'link' => '/dereporting/forms/5/responses']);
if ($nDeRep) $notifIds[] = $nDeRep->id;
$nUnsafe = $svc->notifyUser($u3->id, 'Uji Open Redirect', 'Link berbahaya harus ditolak.', 'system', 'dashboard', null, ['link' => '//evil.example/phish']);
if ($nUnsafe) $notifIds[] = $nUnsafe->id;

// 5. pegawai2: 8 newest read + 4 older (2 unread + 2 read) + 1 BMN pinjaman unread
$nBmn = $svc->notifyUser($u2->id, 'Pinjaman BMN Disetujui', 'Permohonan pinjaman kendaraan disetujui.', 'bmn', 'pinjaman', '999', ['status' => 'approved']);
if ($nBmn) {
    $nBmn->created_at = now()->subMinutes(1);
    $nBmn->save();
    $notifIds[] = $nBmn->id;
}
for ($i = 1; $i <= 7; $i++) {
    $n = $svc->notifyUser($u2->id, "Info Terbaca #$i", "Pesan terbaca #$i", 'system', 'dashboard', null);
    if ($n) {
        $n->read_at = now();
        $n->created_at = now()->subMinutes($i + 2);
        $n->save();
        $notifIds[] = $n->id;
    }
}
for ($i = 1; $i <= 2; $i++) {
    $n = $svc->notifyUser($u2->id, "Unread Lama #$i", "Pesan belum dibaca posisi lama #$i", 'system', 'dashboard', null);
    if ($n) {
        $n->created_at = now()->subMinutes($i + 20);
        $n->save();
        $notifIds[] = $n->id;
    }
}
for ($i = 1; $i <= 4; $i++) {
    $n = $svc->notifyUser($u2->id, "Arsip Lama #$i", "Pesan arsip halaman 2 #$i", 'system', 'dashboard', null);
    if ($n) {
        $n->read_at = now();
        $n->created_at = now()->subMinutes($i + 30);
        $n->save();
        $notifIds[] = $n->id;
    }
}

$tokens = [
    'super_admin' => $sa->createToken('sbx')->plainTextToken,
    'admin' => $adm->createToken('sbx')->plainTextToken,
    'pegawai1' => $u1->createToken('sbx')->plainTextToken,
    'pegawai2' => $u2->createToken('sbx')->plainTextToken,
    'pegawai3' => $u3->createToken('sbx')->plainTextToken,
];

echo json_encode([
    'tokens' => $tokens,
    'users' => [
        'super_admin' => $sa->toArray(),
        'admin' => $adm->toArray(),
        'pegawai1' => $u1->toArray(),
        'pegawai2' => $u2->toArray(),
        'pegawai3' => $u3->toArray(),
    ],
    'cleanup' => [
        'user_ids' => [$sa->id, $adm->id, $u1->id, $u2->id, $u3->id],
        'employee_ids' => [$empAdm->id, $emp1->id, $emp2->id, $emp3->id],
        'leave_id' => $leave->id,
        'st_id' => $st->id,
        'notif_ids' => $notifIds,
    ],
    'reverb_env_present' => false,
]);
`);
}

function cleanupSandboxData(cleanup) {
  if (!cleanup) return;
  const payload = JSON.stringify(cleanup).replace(/'/g, "\\'");
  runPhp(`
use App\\Models\\User;
use App\\Models\\PortalNotification;
use App\\Modules\\Kepegawaian\\Models\\Employee;
use App\\Modules\\Kepegawaian\\Models\\EmployeeLeave;
use App\\Modules\\Kepegawaian\\Models\\EmployeeLeaveRequest;
use App\\Modules\\SuratTugas\\Models\\AssignmentLetter;
use Laravel\\Sanctum\\PersonalAccessToken;

$c = json_decode('${payload}', true);
PortalNotification::whereIn('user_id', $c['user_ids'])->delete();
EmployeeLeaveRequest::withTrashed()->whereIn('employee_id', $c['employee_ids'])->forceDelete();
EmployeeLeave::whereIn('employee_id', $c['employee_ids'])->delete();
AssignmentLetter::withTrashed()->where('id', $c['st_id'])->forceDelete();
PersonalAccessToken::whereIn('tokenable_id', $c['user_ids'])->delete();
User::withTrashed()->whereIn('id', $c['user_ids'])->forceDelete();
Employee::withTrashed()->whereIn('id', $c['employee_ids'])->forceDelete();
echo json_encode(['cleaned' => true]);
`);
}

async function openPortalAs(browser, user, token) {
  const context = await browser.newContext({ viewport: { width: 1366, height: 900 } });
  const page = await context.newPage();
  await page.addInitScript(({ u, t }) => {
    localStorage.setItem('bksda_token', t);
    localStorage.setItem('bksda_logged_in', '1');
    localStorage.setItem('bksda_user', JSON.stringify(u));
  }, { u: user, t: token });
  await page.goto(`${FE_BASE}/portal`, { waitUntil: 'networkidle', timeout: 30000 });
  await page.getByRole('button', { name: 'Lihat Notifikasi', exact: true }).waitFor({ timeout: 15000 });
  return { context, page };
}

(async () => {
  console.log('='.repeat(78));
  console.log('PORTAL NOTIFICATIONS LIVE FULL-STACK E2E AUDIT');

  try {
    const [beRes, feRes] = await Promise.all([fetch(`${BE_BASE}/up`), fetch(`${FE_BASE}/login`)]);
    if (!beRes.ok || !feRes.ok) throw new Error(`BE:${beRes.status} FE:${feRes.status}`);
  } catch (err) {
    console.log(`[STOPPED / BLOCKED] Live servers not reachable (${err.message})`);
    process.exit(2);
  }

  let sandbox;
  let browser;
  try {
    sandbox = setupSandboxData();
    browser = await chromium.launch({ executablePath: CHROME_PATH, headless: true });

    // E2E-LIVE-01A: super_admin -> redirects cleanly to /kepegawaian/cuti (NO 404 toast!)
    {
      const { context, page } = await openPortalAs(browser, sandbox.users.super_admin, sandbox.tokens.super_admin);
      let hitPersonalLeave = false;
      page.on('request', (req) => {
        if (req.url().includes(`/api/me/leave-requests/${sandbox.cleanup.leave_id}`)) hitPersonalLeave = true;
      });
      await page.getByRole('button', { name: 'Lihat Notifikasi', exact: true }).click();
      await page.getByText('Pengajuan Cuti Tahunan baru oleh Duriawati Halim Sandbox.').click();
      await page.waitForURL((u) => u.pathname === '/kepegawaian/cuti', { timeout: 8000 });
      assert.equal(hitPersonalLeave, false, 'super_admin must not hit /api/me/leave-requests/{id}');
      assert.equal(await page.getByText('Permohonan cuti tidak tersedia atau tidak dapat diakses.').count(), 0);
      record('E2E-LIVE-01A', 'PASS', 'super_admin leave notif -> navigates to /kepegawaian/cuti', 'Redirected to /kepegawaian/cuti without hitting personal leave 404');
      await context.close();
    }

    // E2E-LIVE-01B: admin Kepegawaian -> redirects cleanly to /kepegawaian/cuti (NO 404 toast!)
    {
      const { context, page } = await openPortalAs(browser, sandbox.users.admin, sandbox.tokens.admin);
      let hitPersonalLeave = false;
      page.on('request', (req) => {
        if (req.url().includes(`/api/me/leave-requests/${sandbox.cleanup.leave_id}`)) hitPersonalLeave = true;
      });
      await page.getByRole('button', { name: 'Lihat Notifikasi', exact: true }).click();
      await page.getByText('Pengajuan Cuti Tahunan baru oleh Duriawati Halim Sandbox.').click();
      await page.waitForURL((u) => u.pathname === '/kepegawaian/cuti', { timeout: 8000 });
      assert.equal(hitPersonalLeave, false, 'admin kepegawaian must not hit /api/me/leave-requests/{id}');
      assert.equal(await page.getByText('Permohonan cuti tidak tersedia atau tidak dapat diakses.').count(), 0);
      record('E2E-LIVE-01B', 'PASS', 'admin kepegawaian leave notif -> navigates to /kepegawaian/cuti', 'Redirected to /kepegawaian/cuti without hitting personal leave 404');
      await context.close();
    }

    // E2E-LIVE-01C: pegawai1 (owner) -> real 200 on own leave notif
    {
      const { context, page } = await openPortalAs(browser, sandbox.users.pegawai1, sandbox.tokens.pegawai1);
      const respPromise = page.waitForResponse((r) => r.url().includes(`/api/me/leave-requests/${sandbox.cleanup.leave_id}`));
      await page.getByRole('button', { name: 'Lihat Notifikasi', exact: true }).click();
      await page.getByText('Pengajuan Cuti Tahunan Anda telah disetujui.').click();
      const resp = await respPromise;
      assert.equal(resp.status(), 200);
      await page.waitForTimeout(400);
      assert.equal(await page.getByText('Permohonan cuti tidak tersedia atau tidak dapat diakses.').count(), 0);
      await page.getByText('Cuti Tahunan').first().waitFor({ timeout: 5000 });
      record('E2E-LIVE-01C', 'PASS', 'pegawai1 owner own leave notif -> real BE 200', `HTTP ${resp.status()} & opened leave view without error toast`);
      await context.close();
    }

    // E2E-LIVE-02: Modal Riwayat Notifikasi Penuh (pagination halaman 2 + ?type=dereporting filter API)
    {
      const { context, page } = await openPortalAs(browser, sandbox.users.pegawai2, sandbox.tokens.pegawai2);
      await page.getByRole('button', { name: 'Lihat Notifikasi', exact: true }).click();
      await page.getByRole('button', { name: 'Lihat Semua Riwayat' }).click();
      await page.getByText('Riwayat Notifikasi').waitFor({ timeout: 5000 });
      await page.getByText(/Halaman 1 dari 2/).waitFor({ timeout: 5000 });
      const page2Resp = page.waitForResponse((r) => r.url().includes('/api/portal/notifications') && r.url().includes('page=2'));
      await page.locator('button[title="Halaman Selanjutnya"]').click();
      const resp2 = await page2Resp;
      assert.equal(resp2.status(), 200);
      await page.getByText(/Halaman 2 dari 2/).waitFor({ timeout: 5000 });
      record('E2E-LIVE-02', 'PASS', 'Modal Riwayat Notifikasi pagination & real API', `Loaded page 2/2 via real GET /api/portal/notifications?page=2`);
      await context.close();
    }

    // E2E-LIVE-03: BMN pinjaman click + Popover "Belum Dibaca" unread_only fix + "Tandai dibaca" markAllAsRead
    {
      const { context, page } = await openPortalAs(browser, sandbox.users.pegawai2, sandbox.tokens.pegawai2);
      await page.getByRole('button', { name: 'Lihat Notifikasi', exact: true }).click();
      const markReadBmn = page.waitForResponse((r) => r.url().includes('/api/portal/notifications/') && r.url().includes('/read'));
      await page.getByText('Permohonan pinjaman kendaraan disetujui.').click();
      assert.equal((await markReadBmn).status(), 200);
      // Now top 8 are read, while 2 older unread ("Unread Lama #1", "#2") sit at rank 9-10!
      await page.getByRole('button', { name: 'Lihat Notifikasi', exact: true }).click();
      const unreadRespPromise = page.waitForResponse((r) => r.url().includes('/api/portal/notifications') && r.url().includes('unread_only=1'));
      await page.getByRole('button', { name: /Belum Dibaca/ }).click();
      assert.equal((await unreadRespPromise).status(), 200);
      await page.getByText('Unread Lama #1').waitFor({ timeout: 5000 });
      // Click "Tandai dibaca" (mark-all-read)
      const markAllResp = page.waitForResponse((r) => r.url().includes('/api/portal/notifications/mark-all-read'));
      await page.getByRole('button', { name: 'Tandai dibaca' }).click();
      const rAll = await markAllResp;
      assert.equal(rAll.status(), 200);
      const rAllJson = await rAll.json();
      assert.equal(rAllJson.unread_count, 0);
      record('E2E-LIVE-03', 'PASS', 'BMN click + Popover unread_only=1 fix + markAllAsRead', 'Loaded older Unread Lama #1 via unread_only=1 & persisted unread_count=0');
      await context.close();
    }

    // E2E-LIVE-04: Surat Tugas removed participant click -> opens Surat Tugas tab cleanly WITHOUT requesting removed detail 403/404
    {
      const { context, page } = await openPortalAs(browser, sandbox.users.pegawai1, sandbox.tokens.pegawai1);
      let hitRemovedStDetail = false;
      page.on('request', (req) => {
        if (req.url().includes(`/api/surat-tugas/my/${sandbox.cleanup.st_id}`)) hitRemovedStDetail = true;
      });
      await page.getByRole('button', { name: 'Lihat Notifikasi', exact: true }).click();
      await page.getByText(/Anda tidak lagi tercantum pada ST/).click();
      await page.waitForTimeout(500);
      assert.equal(hitRemovedStDetail, false, 'Must not fetch /api/surat-tugas/my/{id} when availability=unavailable / status=removed');
      assert.equal(await page.getByText('Surat tugas tidak tersedia atau tidak dapat diakses.').count(), 0);
      record('E2E-LIVE-04', 'PASS', 'ST removed participant notif -> safe tab open without 403/404', 'Opened Surat Tugas tab cleanly without requesting revoked ST detail');
      await context.close();
    }

    // E2E-LIVE-05: super_admin HealthMonitor notif -> navigates to '/' cleanly (NO 404 /pengaturan)
    {
      const { context, page } = await openPortalAs(browser, sandbox.users.super_admin, sandbox.tokens.super_admin);
      await page.getByRole('button', { name: 'Lihat Notifikasi', exact: true }).click();
      await page.getByText('Storage hampir penuh (sandbox).').click();
      await page.waitForURL((u) => u.pathname === '/', { timeout: 8000 });
      record('E2E-LIVE-05', 'PASS', 'HealthMonitor notif -> navigates to /', 'Redirected super_admin cleanly to / dashboard');
      await context.close();
    }

    // E2E-LIVE-06A: pegawai3 unsafe link '//evil.example/phish' blocked by resolveSafeInternalLink -> stays on /portal
    {
      const { context, page } = await openPortalAs(browser, sandbox.users.pegawai3, sandbox.tokens.pegawai3);
      await page.getByRole('button', { name: 'Lihat Notifikasi', exact: true }).click();
      await page.getByText('Link berbahaya harus ditolak.').click();
      await page.waitForTimeout(400);
      const u = new URL(page.url());
      assert.equal(u.host, new URL(FE_BASE).host, 'External/protocol-relative redirect must be blocked');
      assert.equal(u.pathname, '/portal');
      record('E2E-LIVE-06A', 'PASS', 'Security: open-redirect //evil.example blocked', 'Stayed safely on /portal');
      await context.close();
    }

    // E2E-LIVE-06B: pegawai3 DeReporting notif -> navigates to /dereporting/forms/5/responses!
    {
      const { context, page } = await openPortalAs(browser, sandbox.users.pegawai3, sandbox.tokens.pegawai3);
      await page.getByRole('button', { name: 'Lihat Notifikasi', exact: true }).click();
      await page.getByText("Tanggapan baru telah masuk pada formulir 'Sandbox Satwa'.").click();
      await page.waitForURL((u) => u.pathname === '/dereporting/forms/5/responses', { timeout: 8000 });
      record('E2E-LIVE-06B', 'PASS', 'DeReporting notif -> navigates to /dereporting/forms/5/responses', 'Redirected via safe data.link to target DeReporting responses route');
      await context.close();
    }

    // E2E-LIVE-07: Live WebSocket / Laravel Reverb two-browser real-time round-trip
    {
      const envLocalPath = path.join(frontendRoot, '.env.local');
      const envLocal = fs.existsSync(envLocalPath) ? fs.readFileSync(envLocalPath, 'utf8') : '';
      const hasReverbKey = /^NEXT_PUBLIC_REVERB_APP_KEY=.+/m.test(envLocal);
      if (!hasReverbKey) {
        record(
          'E2E-LIVE-07',
          'STOPPED / BLOCKED',
          'Live WebSocket Reverb toast "Buka" & useAdminInboxLive',
          'NEXT_PUBLIC_REVERB_APP_KEY tidak dikonfigurasi di frontend/.env.local; getEcho() mengembalikan null sehingga WebSocket live tidak dapat diuji tanpa mengubah env/konfigurasi.'
        );
      } else {
        const admCtx = await browser.newContext({ viewport: { width: 1366, height: 900 } });
        const empCtx = await browser.newContext({ viewport: { width: 1366, height: 900 } });
        try {
        const admPage = await admCtx.newPage();
        const empPage = await empCtx.newPage();

        let admSubscribed = false;
        let empSubscribed = false;
        const attachWsTracker = (page, onFrame) => {
          page.on('websocket', (ws) => {
            if (!ws.url().includes(':8080/app/')) return;
            ws.on('framereceived', (frame) => {
              try {
                const msg = JSON.parse(String(frame.payload));
                onFrame(msg);
              } catch {}
            });
          });
        };
        attachWsTracker(admPage, (msg) => {
          if (msg.event === 'pusher_internal:subscription_succeeded' && String(msg.channel || '').startsWith('private-admin.inbox.kepegawaian.')) {
            admSubscribed = true;
          }
        });
        attachWsTracker(empPage, (msg) => {
          if (msg.event === 'pusher_internal:subscription_succeeded' && String(msg.channel || '').startsWith('private-App.Models.User.')) {
            empSubscribed = true;
          }
        });

        await admPage.addInitScript(({ u, t }) => {
          localStorage.setItem('bksda_token', t);
          localStorage.setItem('bksda_logged_in', '1');
          localStorage.setItem('bksda_user', JSON.stringify(u));
        }, { u: sandbox.users.admin, t: sandbox.tokens.admin });

        await empPage.addInitScript(({ u, t }) => {
          localStorage.setItem('bksda_token', t);
          localStorage.setItem('bksda_logged_in', '1');
          localStorage.setItem('bksda_user', JSON.stringify(u));
          localStorage.setItem('bksda_portal_nav_tab', 'cuti');
        }, { u: sandbox.users.pegawai1, t: sandbox.tokens.pegawai1 });

        await Promise.all([
          admPage.goto(`${FE_BASE}/kepegawaian/cuti`, { waitUntil: 'networkidle', timeout: 30000 }),
          empPage.goto(`${FE_BASE}/portal?tab=cuti`, { waitUntil: 'networkidle', timeout: 30000 }),
        ]);

        // Wait up to 6s for BOTH live Reverb private subscriptions
        const subDeadline = Date.now() + 6000;
        while ((!admSubscribed || !empSubscribed) && Date.now() < subDeadline) {
          await admPage.waitForTimeout(100);
        }
        assert.equal(admSubscribed, true, 'Admin /kepegawaian/cuti did not subscribe to Reverb admin.inbox.kepegawaian');
        assert.equal(empSubscribed, true, 'Employee /portal did not subscribe to Reverb App.Models.User');

        // 1) Employee submits new leave request -> Admin inbox updates in < 4s WITHOUT refresh or 10s poll
        const submitStartedAt = Date.now();
        const createdLeave = await empPage.evaluate(async ({ beBase, token }) => {
          const res = await fetch(`${beBase}/api/me/leave-requests`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
              jenis_cuti: 'Cuti Karena Alasan Penting',
              alasan_cuti: 'Sandbox E2E Test Realtime',
              tanggal_mulai: '2026-12-20',
              tanggal_selesai: '2026-12-20',
              alamat_menjalankan_cuti: 'Samarinda',
              telepon: '081234567890',
            }),
          });
          const body = await res.json();
          if (!res.ok) throw new Error(`POST /api/me/leave-requests ${res.status}: ${JSON.stringify(body)}`);
          return body.data;
        }, { beBase: BE_BASE, token: sandbox.tokens.pegawai1 });

        await admPage.getByText('Cuti Karena Alasan Penting').first().waitFor({ timeout: 4000 });
        const adminLatencyMs = Date.now() - submitStartedAt;
        assert.equal(await admPage.getByText('Cuti Karena Alasan Penting').count() >= 1, true);

        // 2) Admin approves leave -> Employee Portal notification + approved badge update in < 4s WITHOUT refresh or 15s/35s poll
        const approveStartedAt = Date.now();
        await admPage.evaluate(async ({ beBase, token, id }) => {
          const res = await fetch(`${beBase}/api/kepegawaian/leave-requests/${id}/status`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
              status: 'DISETUJUI',
              catatan_persetujuan: 'Disetujui Realtime E2E',
            }),
          });
          if (!res.ok) throw new Error(`PUT status ${res.status}: ${await res.text()}`);
        }, { beBase: BE_BASE, token: sandbox.tokens.admin, id: createdLeave.id });

        await empPage.getByText('Permohonan Cuti Disetujui').first().waitFor({ timeout: 4000 });
        await empPage.waitForFunction(
          () => Array.from(document.querySelectorAll('tr, [class*="rounded"]')).some((el) => {
            const text = (el.innerText || '').trim();
            return text.length > 0 && text.length < 400 && /Cuti Karena Alasan Penting/i.test(text) && /Disetujui/i.test(text);
          }),
          undefined,
          { timeout: 4000 }
        );
        const empLatencyMs = Date.now() - approveStartedAt;

        // 3) Admin deletes that leave request -> old approved notif cleaned, Employee gets live "Permohonan Cuti Dihapus",
        //    and clicking it opens Cuti tab WITHOUT requesting deleted leave 404 or showing unavailable error toast.
        let hitDeletedLeaveDetail = false;
        empPage.on('request', (req) => {
          if (req.url().includes(`/api/me/leave-requests/${createdLeave.id}`)) hitDeletedLeaveDetail = true;
        });

        await admPage.evaluate(async ({ beBase, token, id }) => {
          const res = await fetch(`${beBase}/api/kepegawaian/leave-requests/${id}`, {
            method: 'DELETE',
            headers: {
              'Accept': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
          });
          if (!res.ok) throw new Error(`DELETE leave ${res.status}: ${await res.text()}`);
        }, { beBase: BE_BASE, token: sandbox.tokens.admin, id: createdLeave.id });

        await empPage.getByText('Permohonan Cuti Dihapus').first().waitFor({ timeout: 4000 });
        await empPage.waitForFunction(
          () => !(document.querySelector('main')?.innerText || '').includes('Cuti Karena Alasan Penting'),
          undefined,
          { timeout: 4000 }
        );

        await empPage.getByRole('button', { name: 'Lihat Notifikasi', exact: true }).click();
        const bellPopover = empPage.locator('[data-module="portal"]');
        await bellPopover.getByText('Pengajuan Cuti Karena Alasan Penting Anda').first().waitFor({ timeout: 5000 });
        assert.equal(await bellPopover.getByText(/Cuti Karena Alasan Penting.*telah disetujui resmi/i).count(), 0);
        await bellPopover.getByText('Pengajuan Cuti Karena Alasan Penting Anda').first().click();
        await empPage.waitForTimeout(400);
        assert.equal(hitDeletedLeaveDetail, false, 'Clicking deleted leave notification must not request deleted /api/me/leave-requests/{id}');
        assert.equal(await empPage.getByText('Permohonan cuti tidak tersedia atau tidak dapat diakses.').count(), 0);

        record(
          'E2E-LIVE-07',
          'PASS',
          'Live two-browser Reverb WebSocket bidirectional sync + safe delete cleanup (Employee <-> Admin Cuti)',
          `Sub: admin=${admSubscribed}, emp=${empSubscribed}; Employee->Admin ${adminLatencyMs}ms, Admin->Employee ${empLatencyMs}ms (<4000ms), deleted leave notif cleaned cleanly`
        );
      } finally {
        await admCtx.close().catch(() => {});
        await empCtx.close().catch(() => {});
      }
      }
    }

    // E2E-LIVE-08: Mouse-opened ConfirmDialog (DropdownMenu -> Hapus) & Bell Popover must NOT stick :focus-visible or show double green+blue ring
    {
      const admCtx = await browser.newContext({ viewport: { width: 1366, height: 900 } });
      const empCtx = await browser.newContext({ viewport: { width: 1366, height: 900 } });
      try {
        const admPage = await admCtx.newPage();
        await admPage.addInitScript(({ u, t }) => {
          localStorage.setItem('bksda_token', t);
          localStorage.setItem('bksda_logged_in', '1');
          localStorage.setItem('bksda_user', JSON.stringify(u));
        }, { u: sandbox.users.admin, t: sandbox.tokens.admin });
        await admPage.goto(`${FE_BASE}/kepegawaian/cuti`, { waitUntil: 'networkidle', timeout: 30000 });
        await admPage.getByText('Duriawati Halim Sandbox').first().waitFor({ timeout: 10000 });

        const targetRow = admPage.locator('tr', { hasText: 'Duriawati Halim Sandbox' }).first();
        const menuTriggerBtn = targetRow.locator('button[title="Aksi Lainnya"]');
        await menuTriggerBtn.click();
        await admPage.getByRole('menuitem', { name: /Hapus/i }).first().click();

        const batalBtn = admPage.getByRole('button', { name: 'Batal', exact: true });
        await batalBtn.waitFor({ timeout: 5000 });
        const focusOnOpen = await batalBtn.evaluate((el) => ({
          focusVisible: el.matches(':focus-visible'),
          boxShadow: getComputedStyle(el).boxShadow,
        }));
        assert.equal(focusOnOpen.focusVisible, false, 'ConfirmDialog Batal must not stick :focus-visible when opened by mouse click');

        // 1) Pure mouse close (without any keyboard Tab in between): trigger button MUST NOT get stuck :focus-visible!
        await batalBtn.click();
        await batalBtn.waitFor({ state: 'hidden', timeout: 5000 });
        await admPage.waitForTimeout(250);
        const menuTriggerAfterMouseClose = await menuTriggerBtn.evaluate((el) => ({
          focusVisible: el.matches(':focus-visible'),
          outlineStyle: getComputedStyle(el).outlineStyle,
          outlineWidth: getComputedStyle(el).outlineWidth,
        }));
        assert.equal(menuTriggerAfterMouseClose.focusVisible, false, 'Pure mouse Hapus -> Batal must not leave stuck :focus-visible on row ... trigger');

        // 2) Separate check: keyboard Tab inside ConfirmDialog uses single crisp Kepegawaian focus outline (NOT green border + blue outline)
        await menuTriggerBtn.click();
        await admPage.getByRole('menuitem', { name: /Hapus/i }).first().click();
        await batalBtn.waitFor({ timeout: 5000 });
        await admPage.keyboard.press('Tab');
        const focusOnTab = await batalBtn.evaluate((el) => ({
          active: document.activeElement === el,
          focusVisible: el.matches(':focus-visible'),
          borderColor: getComputedStyle(el).borderColor,
          outlineColor: getComputedStyle(el).outlineColor,
          boxShadow: getComputedStyle(el).boxShadow,
        }));
        assert.equal(focusOnTab.active && focusOnTab.focusVisible, true, 'Keyboard Tab into ConfirmDialog must focus Batal visibly');
        assert.notEqual(focusOnTab.borderColor, 'rgb(22, 163, 74)', 'Batal focus border must not clash with green default --ring');
        assert.equal(focusOnTab.outlineColor, 'rgb(37, 99, 235)', 'Kepegawaian focus outline must match module blue (#2563eb)');
        assert.equal(focusOnTab.boxShadow, 'none', 'Kepegawaian focus ring must not stack box-shadow underneath outline');

        await batalBtn.click();
        await batalBtn.waitFor({ state: 'hidden', timeout: 5000 });
        await admPage.waitForTimeout(250);
        const menuTriggerFocusVisible = await menuTriggerBtn.evaluate((el) => el.matches(':focus-visible'));
        assert.equal(menuTriggerFocusVisible, false, 'Closing ConfirmDialog via mouse must not leave stuck :focus-visible on row trigger');

        // 3) Check KepegawaianDialog modal opened from DropdownMenu (Edit Pengajuan) -> close via Batal -> zero stuck focus ring!
        await menuTriggerBtn.click();
        await admPage.getByRole('menuitem', { name: /Edit Pengajuan/i }).first().click();
        const editCloseBtn = admPage.getByRole('button', { name: 'Batal', exact: true });
        await editCloseBtn.waitFor({ timeout: 5000 });
        const editAnyFocusVisible = await admPage.locator('[data-slot="dialog-content"] button').evaluateAll((els) => els.some((el) => el.matches(':focus-visible')));
        assert.equal(editAnyFocusVisible, false, 'KepegawaianDialog opened from DropdownMenu must not stick :focus-visible on modal buttons');
        await editCloseBtn.click();
        await editCloseBtn.waitFor({ state: 'hidden', timeout: 5000 });
        await admPage.waitForTimeout(250);
        assert.equal(await menuTriggerBtn.evaluate((el) => el.matches(':focus-visible')), false, 'Closing KepegawaianDialog via mouse must not stick :focus-visible on row trigger');

        // Verify Portal Bell Popover pointer open/close does not leave stuck :focus-visible on controls
        const empPage = await empCtx.newPage();
        await empPage.addInitScript(({ u, t }) => {
          localStorage.setItem('bksda_token', t);
          localStorage.setItem('bksda_logged_in', '1');
          localStorage.setItem('bksda_user', JSON.stringify(u));
        }, { u: sandbox.users.pegawai1, t: sandbox.tokens.pegawai1 });
        await empPage.goto(`${FE_BASE}/portal`, { waitUntil: 'networkidle', timeout: 30000 });
        const bellBtn = empPage.getByRole('button', { name: 'Lihat Notifikasi', exact: true });
        await bellBtn.waitFor({ timeout: 10000 });
        await bellBtn.click();
        await empPage.locator('[data-slot="popover-content"][data-module="portal"]').waitFor({ timeout: 5000 });
        const anyStuckInsideBell = await empPage.locator('[data-slot="popover-content"][data-module="portal"] button').evaluateAll((els) => els.some((el) => el.matches(':focus-visible')));
        assert.equal(anyStuckInsideBell, false, 'Opening NotificationBell popover by mouse must not focus-visible internal buttons');
        await empPage.mouse.click(20, 20);
        await empPage.waitForTimeout(150);
        assert.equal(await bellBtn.evaluate((el) => el.matches(':focus-visible')), false, 'Closing Bell popover via mouse must not leave stuck ring on bell button');

        record('E2E-LIVE-08', 'PASS', 'Mouse dialog/popover opens & closes without stuck :focus-visible or double green+blue ring', 'Verified mouse ConfirmDialog open/close, keyboard Tab single #2563eb outline (zero green border / zero box-shadow), and Portal Bell popover');
      } finally {
        await admCtx.close().catch(() => {});
        await empCtx.close().catch(() => {});
      }
    }
  } finally {
    if (browser) await browser.close();
    if (sandbox?.cleanup) cleanupSandboxData(sandbox.cleanup);
  }

  console.log('='.repeat(78));
  console.log('RINGKASAN HASIL:');
  for (const r of results) {
    console.log(`- ${r.id} [${r.status}]: ${r.title}`);
  }
})();
