'use strict';
/**
 * =============================================================================
 * MASTER LOKASI, KEPEGAWAIAN, BMN & DRIVE LIVE FULL-STACK E2E
 * =============================================================================
 * Menguji Next.js (:3000) <-> Laravel (:8000) <-> PostgreSQL (:5432) secara NYATA
 * tanpa page.route() mock apa pun, lalu membersihkan seluruh data sandbox di `finally`.
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

function cleanupByIdentifiers({ nip = null, saUserId = null, seksiCode = 'skw-9-sandbox', resorCode = 'resor_99_sbx' } = {}) {
  const payload = JSON.stringify({ nip, saUserId, seksiCode, resorCode }).replace(/'/g, "\\'");
  return runPhp(`
use App\\Models\\DriveFile;
use App\\Models\\DriveFolder;
use App\\Models\\DriveShare;
use App\\Models\\DriveUnit;
use App\\Models\\User;
use App\\Modules\\Bmn\\Models\\Location;
use App\\Modules\\Kepegawaian\\Models\\Employee;
use App\\Modules\\Kepegawaian\\Models\\EmployeeHistory;
use Illuminate\\Support\\Facades\\DB;
use Laravel\\Sanctum\\PersonalAccessToken;

$p = json_decode('${payload}', true);

$nips = Employee::withTrashed()
    ->where('nama_lengkap', 'like', '%Sandbox Master Lokasi%')
    ->when(! empty($p['nip']), fn ($q) => $q->orWhere('nip', $p['nip']))
    ->get();

foreach ($nips as $emp) {
    EmployeeHistory::where('employee_id', $emp->id)->delete();
    if ($u = User::where('username', $emp->nip)->first()) {
        DB::table('drive_unit_members')->where('user_id', $u->id)->delete();
        PersonalAccessToken::where('tokenable_id', $u->id)->delete();
        $u->delete();
    }
    $emp->forceDelete();
}

$locIds = Location::whereIn('code', [$p['resorCode'], $p['seksiCode']])
    ->orWhere('name', 'like', '%Sandbox E2E%')
    ->orWhere('name', 'like', '%Wilayah IX Sandbox%')
    ->pluck('id')
    ->all();

if (! empty($locIds)) {
    $fIds = DriveFolder::withTrashed()->whereIn('location_id', $locIds)->pluck('id')->all();
    if (! empty($fIds)) {
        DriveShare::whereIn('folder_id', $fIds)->delete();
        DriveFile::withTrashed()->whereIn('folder_id', $fIds)->forceDelete();
        DriveFolder::withTrashed()->whereIn('id', $fIds)->forceDelete();
    }
}

$unitIds = DriveUnit::whereIn('slug', [$p['seksiCode'], 'seksi-ksda-wilayah-ix-sandbox'])->pluck('id')->all();
if (! empty($unitIds)) {
    DB::table('drive_unit_members')->whereIn('drive_unit_id', $unitIds)->delete();
    DriveFile::withTrashed()->whereIn('unit_id', $unitIds)->forceDelete();
    DriveFolder::withTrashed()->whereIn('unit_id', $unitIds)->forceDelete();
    DriveUnit::whereIn('id', $unitIds)->delete();
}

Location::whereIn('code', [$p['resorCode']])->delete();
Location::whereIn('code', [$p['seksiCode']])->delete();
if (! empty($locIds)) {
    Location::whereIn('id', $locIds)->whereNotNull('parent_id')->delete();
    Location::whereIn('id', $locIds)->delete();
}

$saUsers = User::where('username', 'like', 'sbx_loc_%')
    ->when(! empty($p['saUserId']), fn ($q) => $q->orWhere('id', $p['saUserId']))
    ->get();
foreach ($saUsers as $su) {
    DB::table('drive_unit_members')->where('user_id', $su->id)->delete();
    PersonalAccessToken::where('tokenable_id', $su->id)->delete();
    $su->delete();
}

echo json_encode(['cleaned' => true]);
`);
}

function setupSandboxAdmin() {
  cleanupByIdentifiers();
  const tag = Date.now();
  return runPhp(`
use App\\Models\\User;
use Illuminate\\Support\\Facades\\Hash;

$tag = '${tag}';
$sa = User::create([
    'name' => 'Sandbox Admin Master Lokasi',
    'username' => 'sbx_loc_' . $tag,
    'email' => 'sbx_loc_' . $tag . '@bksda.test',
    'password' => Hash::make('SandboxPass!23'),
    'role' => 'super_admin',
    'access_modules' => ['kepegawaian', 'bmn', 'drive', 'dereporting', 'surat'],
    'permissions' => [],
    'is_active' => true,
    'must_change_password' => false,
]);

echo json_encode([
    'user' => $sa->toArray(),
    'token' => $sa->createToken('sbx_loc')->plainTextToken,
    'empNip' => '199912' . substr($tag, -12),
]);
`);
}

async function createAuthContext(browser, user, token) {
  const context = await browser.newContext({ viewport: { width: 1366, height: 900 } });
  await context.addInitScript(({ u, t }) => {
    localStorage.setItem('bksda_token', t);
    localStorage.setItem('bksda_logged_in', '1');
    localStorage.setItem('bksda_user', JSON.stringify(u));
  }, { u: user, t: token });
  return context;
}

(async () => {
  console.log('='.repeat(78));
  console.log('MASTER LOKASI HIERARCHY & DRIVE SYNC LIVE FULL-STACK E2E');

  try {
    const [beRes, feRes] = await Promise.all([fetch(`${BE_BASE}/up`), fetch(`${FE_BASE}/login`)]);
    if (!beRes.ok || !feRes.ok) throw new Error(`BE:${beRes.status} FE:${feRes.status}`);
  } catch (err) {
    console.log(`[STOPPED / BLOCKED] Live servers not reachable (${err.message})`);
    process.exit(2);
  }

  let sandbox;
  let browser;
  let createdEmpNip = null;

  try {
    sandbox = setupSandboxAdmin();
    createdEmpNip = sandbox.empNip;
    browser = await chromium.launch({ executablePath: CHROME_PATH, headless: true });
    const context = await createAuthContext(browser, sandbox.user, sandbox.token);
    const page = await context.newPage();

    const pageErrors = [];
    page.on('pageerror', (e) => pageErrors.push(e.message));

    // LIVE-01: /kepegawaian/settings -> tab Lokasi & Ruangan -> Create Seksi Level-1
    await page.goto(`${FE_BASE}/kepegawaian/settings`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.getByRole('tab', { name: /Lokasi & Ruangan/i }).click();
    await page.locator('table').getByText('Kantor Balai KSDA Kalimantan Timur').first().waitFor({ timeout: 10000 });

    await page.getByRole('button', { name: 'Tambah Lokasi Baru' }).click();
    await page.getByRole('button', { name: 'Seksi Baru (Lv 1)' }).click();
    await page.getByLabel('Nama Lokasi').fill('Seksi KSDA Wilayah IX Sandbox');
    await page.getByPlaceholder('Otomatis jika kosong').fill('skw-9-sandbox');

    const createSeksiRespPromise = page.waitForResponse(
      (r) => r.url().endsWith('/api/locations') && r.request().method() === 'POST'
    );
    await page.getByRole('button', { name: 'Simpan Lokasi' }).click();
    const createSeksiResp = await createSeksiRespPromise;
    assert.equal(createSeksiResp.status(), 201, `Expected 201 creating Seksi, got ${createSeksiResp.status()}`);
    await page.locator('table').getByText('Seksi KSDA Wilayah IX Sandbox').first().waitFor({ timeout: 10000 });

    const seksiDb = runPhp(`
      $loc = \\App\\Modules\\Bmn\\Models\\Location::with('driveUnit')->where('code', 'skw-9-sandbox')->first();
      $folderCount = $loc ? \\App\\Models\\DriveFolder::where('location_id', $loc->id)->count() : 0;
      echo json_encode(['loc' => $loc?->toArray(), 'drive_unit_slug' => $loc?->driveUnit?->slug, 'folder_count' => $folderCount]);
    `);
    assert.ok(seksiDb.loc && seksiDb.loc.id, 'Seksi must persist in DB');
    assert.equal(seksiDb.drive_unit_slug, 'skw-9-sandbox', 'DriveUnit auto-provisioned on Seksi creation');
    assert.ok(seksiDb.folder_count >= 1, 'General DriveFolder auto-created for Seksi');
    record('LIVE-01', 'PASS', 'Kepegawaian Settings Lokasi & Ruangan -> Seksi Level-1 + DriveUnit', `Created Seksi ID ${seksiDb.loc.id} & DriveUnit ${seksiDb.drive_unit_slug}`);

    // LIVE-02: Create Resor KSDA under Seksi IX Sandbox -> verify restricted DriveFolder in DB
    await page.getByRole('button', { name: 'Tambah Lokasi Baru' }).click();
    await page.getByRole('button', { name: 'Resor KSDA' }).click();
    await page.getByLabel('Unit Induk', { exact: true }).selectOption(seksiDb.loc.id);
    await page.getByLabel('Nama Lokasi').fill('Resor 99. Sandbox E2E');
    await page.getByPlaceholder('Otomatis jika kosong').fill('resor_99_sbx');

    const createResorRespPromise = page.waitForResponse(
      (r) => r.url().endsWith('/api/locations') && r.request().method() === 'POST'
    );
    await page.getByRole('button', { name: 'Simpan Lokasi' }).click();
    const createResorResp = await createResorRespPromise;
    assert.equal(createResorResp.status(), 201);
    await page.locator('table').getByText('Resor 99. Sandbox E2E').first().waitFor({ timeout: 10000 });

    const resorDb = runPhp(`
      $loc = \\App\\Modules\\Bmn\\Models\\Location::where('code', 'resor_99_sbx')->first();
      $folder = $loc ? \\App\\Models\\DriveFolder::where('location_id', $loc->id)->first() : null;
      echo json_encode(['loc' => $loc?->toArray(), 'folder' => $folder?->toArray()]);
    `);
    assert.equal(resorDb.loc?.parent_id, seksiDb.loc.id);
    assert.equal(Boolean(resorDb.folder?.is_restricted), true);
    assert.equal(resorDb.folder?.resor_code, 'resor_99_sbx');
    record('LIVE-02', 'PASS', 'Resor KSDA Level-2 under Seksi -> Auto Restricted DriveFolder', `Resor ID ${resorDb.loc.id}, Folder ID ${resorDb.folder.id}`);

    // LIVE-03: Create Employee with cascading Tier 1 (Seksi IX) -> Tier 2 (Resor 99)
    await page.goto(`${FE_BASE}/kepegawaian/employees/create`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.getByPlaceholder('Contoh: 19800101 200501 1 001').fill(sandbox.empNip);
    await page.getByPlaceholder('Contoh: Budi Santoso, S.Hut.').fill('Pegawai Sandbox Master Lokasi');

    const tier1Create = page.locator('select:has(option:text("Pilih Penempatan Satuan Kerja..."))');
    await tier1Create.selectOption(seksiDb.loc.id);
    const tier2Create = page.locator('select:has(option:text("Kantor Seksi Wilayah (Bukan Resor)"))');
    await tier2Create.waitFor({ timeout: 5000 });
    await tier2Create.selectOption(resorDb.loc.id);

    const empCreatePromise = page.waitForResponse(
      (r) => r.url().endsWith('/api/kepegawaian/employees') && r.request().method() === 'POST'
    );
    await page.getByRole('button', { name: 'Simpan Pegawai' }).click();
    const empCreateResp = await empCreatePromise;
    assert.equal(empCreateResp.status(), 201, `Expected 201 creating employee, got ${empCreateResp.status()}: ${await empCreateResp.text()}`);
    const empCreateJson = await empCreateResp.json();
    const empId = empCreateJson?.data?.id;
    assert.ok(empId, 'Employee ID returned');
    assert.equal(empCreateJson?.data?.location_id, resorDb.loc.id);
    record('LIVE-03', 'PASS', 'Kepegawaian Create Cascading Select -> DB location_id', `Employee #${empId} linked to ${resorDb.loc.id}`);

    // LIVE-04: Mutate Employee on [id] page -> verify Audit History renders location names (not raw UUIDs)
    await page.goto(`${FE_BASE}/kepegawaian/employees/${empId}`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.getByText('Pegawai Sandbox Master Lokasi').first().waitFor({ timeout: 10000 });
    await page.getByText('Resor 99. Sandbox E2E').first().waitFor({ timeout: 10000 });

    await page.getByRole('button', { name: 'Edit Biodata' }).click();
    const balaiAndKeu = runPhp(`
      $balai = \\App\\Modules\\Bmn\\Models\\Location::where('code', 'balai-samarinda')->first();
      $keu = \\App\\Modules\\Bmn\\Models\\Location::where('parent_id', $balai?->id)->where('code', 'ruang_keuangan')->first();
      echo json_encode(['balai_id' => $balai?->id, 'keu_id' => $keu?->id, 'keu_name' => $keu?->name]);
    `);
    await page.getByLabel('Satuan kerja').selectOption(balaiAndKeu.balai_id);
    const tier2Edit = page.locator('select:has(option:text("Kantor Balai Induk (Umum)"))');
    await tier2Edit.waitFor({ timeout: 5000 });
    await tier2Edit.selectOption(balaiAndKeu.keu_id);

    const empUpdatePromise = page.waitForResponse(
      (r) => r.url().includes(`/api/kepegawaian/employees/${empId}`) && r.request().method() === 'PUT'
    );
    await page.getByRole('button', { name: 'Simpan Perubahan' }).click();
    const empUpdateResp = await empUpdatePromise;
    assert.equal(empUpdateResp.status(), 200, `Expected 200 updating employee, got ${empUpdateResp.status()}: ${await empUpdateResp.text()}`);

    await page.getByRole('tab', { name: /Riwayat Perubahan/i }).click();
    await page.getByText('Penempatan Lokasi').first().waitFor({ timeout: 10000 });
    await page.getByText('Resor 99. Sandbox E2E').first().waitFor({ timeout: 10000 });
    await page.getByText(balaiAndKeu.keu_name).first().waitFor({ timeout: 10000 });
    record('LIVE-04', 'PASS', 'Kepegawaian [id] Cascading Mutation + Human-Readable Audit History', `Mutated to ${balaiAndKeu.keu_name} & resolved history labels`);

    // LIVE-05: BMN Assets Filter picks up live newly added Master Locations
    await page.goto(`${FE_BASE}/bmn/assets`, { waitUntil: 'networkidle', timeout: 30000 });
    const bmnSelect = page.getByLabel('Filter lokasi aset');
    await bmnSelect.waitFor({ timeout: 10000 });
    const bmnOptionsText = await bmnSelect.locator('option').allTextContents();
    assert.ok(bmnOptionsText.some((t) => t.includes('Resor 99. Sandbox E2E')), 'BMN filter contains dynamic Resor 99');
    assert.ok(bmnOptionsText.some((t) => t.includes('Seksi KSDA Wilayah IX Sandbox')), 'BMN filter contains dynamic Seksi IX');
    record('LIVE-05', 'PASS', 'BMN Assets Dynamic Master Lokasi Filter', 'Verified Resor 99 & Seksi IX appear live in BMN filter dropdown');

    // LIVE-06: DeReporting Internal Upload Drawer picks up live Master Locations
    await page.goto(`${FE_BASE}/dereporting/internal`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.getByRole('button', { name: /Unggah Laporan Baru/i }).click();
    await page.getByRole('button', { name: /Sasaran Terbatas/i }).click();
    await page.getByRole('button', { name: 'Resor 99. Sandbox E2E' }).waitFor({ timeout: 10000 });
    await page.getByRole('button', { name: 'Seksi KSDA Wilayah IX Sandbox' }).waitFor({ timeout: 10000 });
    record('LIVE-06', 'PASS', 'DeReporting InternalUploadDrawer Dynamic Urusan/Resor', 'Verified Resor 99 & Seksi IX rendered in recipient picker');

    // LIVE-07: BKSDA Drive shows auto-provisioned Seksi IX unit
    await page.goto(`${FE_BASE}/drive`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.getByText('Seksi KSDA Wilayah IX Sandbox').first().waitFor({ timeout: 10000 });
    record('LIVE-07', 'PASS', 'BKSDA Drive Unit Sidebar Synced with Master Lokasi', 'Seksi KSDA Wilayah IX Sandbox visible live in BKSDA Drive');

    assert.equal(pageErrors.length, 0, `Uncaught page errors: ${pageErrors.join(' | ')}`);
    await context.close();
  } finally {
    if (browser) await browser.close();
    if (sandbox?.user?.id || createdEmpNip) {
      cleanupByIdentifiers({ nip: createdEmpNip, saUserId: sandbox?.user?.id });
    }
  }

  console.log('-'.repeat(78));
  console.log(`ALL ${results.length} LIVE E2E CHECKS PASSED`);
})().catch((err) => {
  console.error('E2E FAILED:', err);
  process.exit(1);
});
