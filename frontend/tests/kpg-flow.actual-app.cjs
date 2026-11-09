'use strict';
/* eslint-disable @typescript-eslint/no-require-imports */
// Author-only fixture. Parent must inspect, install and run in the trusted network-none runner.
// This script supplies no application HTML, mocked API response, or fabricated auth state.
const assert = require('node:assert/strict');
const { chromium } = require('playwright');

assert.equal(process.env.ST_E2E_SANDBOX, 'disposable-network-none');
assert.equal(process.env.ST_E2E_ALLOW_WRITE, '1');
const base = process.env.ST_E2E_URL;
const allowedHosts = new Set(['localhost', '127.0.0.1', '[::1]']);
const origin = new URL(base);
assert.equal(origin.protocol, 'http:');
assert(allowedHosts.has(origin.hostname) && !origin.username && !origin.password);
assert(/^dummy-/.test(process.env.ST_E2E_ADMIN_USERNAME || ''));
assert((process.env.ST_E2E_ADMIN_PASSWORD || '').startsWith('Dummy'));
assert((process.env.ST_E2E_EMPLOYEE_PASSWORD || '').startsWith('Dummy'));
assert(process.env.ST_E2E_CHROMIUM_EXECUTABLE, 'Use the installed sandbox Chromium.');
const requested = (process.env.ST_E2E_EMPLOYEE_NIPS || '').split(',');
assert.deepEqual(requested, ['900000000000000001', '900000000000000002', '900000000000000003']);
// Three short jobs share this maintained fixture; never keep multiple renderers alive.
const section = process.env.KPG_E2E_SECTION || 'people';
assert(['people', 'records', 'templates', 'leave'].includes(section));
const marker = `DUMMY-KPG-${Date.now()}`;
let browser, latestPage, stage = 'launch';
let pageErrors = 0;
const exercised = [];
function pass(check, detail = {}) {
  exercised.push(check);
  console.log(JSON.stringify({ status: 'PASS', section, check, ...detail }));
}

async function context() {
  const result = await browser.newContext({ viewport: { width: 1440, height: 1000 }, serviceWorkers: 'block' });
  // Native loopback is untouched. The outer runner independently enforces network:none.
  await result.route('https://**/*', route => route.abort('blockedbyclient'));
  result.setDefaultTimeout(20000);
  result.setDefaultNavigationTimeout(45000);
  return result;
}

function observe(page) {
  latestPage = page;
  page.on('pageerror', () => pageErrors++);
  return page;
}

async function login(username, password, label, expected = 200) {
  stage = `${label}: real UI login`;
  const actor = { context: await context(), page: null, apiBase: '' };
  actor.page = observe(await actor.context.newPage());
  await actor.page.goto(`${base}/login`, { waitUntil: 'networkidle' });
  await actor.page.locator('input[name=username]').fill(username);
  await actor.page.locator('input[name=password]').fill(password);
  const answered = actor.page.waitForResponse(response => response.url().endsWith('/login') && response.request().method() === 'POST');
  await actor.page.locator('button[type=submit]').click();
  const response = await answered;
  assert.equal(response.status(), expected, `${label}: unexpected login result (credentials omitted).`);
  actor.apiBase = response.url().slice(0, -'/login'.length);
  assert(allowedHosts.has(new URL(actor.apiBase).hostname));
  if (expected === 200) {
    await actor.page.getByRole('button', { name: 'Lihat Notifikasi', exact: true }).waitFor({ timeout: 45000 });
  } else {
    assert.equal(await actor.page.evaluate(() => localStorage.getItem('bksda_user')), null);
  }
  pass(`${label}: real UI login`, { httpStatus: expected });
  return actor;
}

async function get(actor, path) {
  // Read-only corroboration with the actual UI-created session cookie. No tokens are fabricated.
  assert(path.startsWith('/') && !path.startsWith('//'));
  const response = await actor.context.request.get(`${actor.apiBase}${path}`, {
    headers: { Accept: 'application/json', Origin: origin.origin, Referer: `${base}/portal` },
  });
  return { status: response.status(), body: await response.json().catch(() => ({})) };
}

function responseFor(page, pathname, method) {
  return page.waitForResponse(response => new URL(response.url()).pathname === pathname
    && response.request().method() === method);
}

async function warm(actor, routes) {
  for (const route of routes) {
    stage = `compile actual route ${route.split('?')[0]}`;
    const response = await actor.context.request.get(`${base}${route}`, { timeout: 60000 });
    assert.equal(response.status(), 200, 'Actual Next route failed compilation.');
  }
}

async function dummyEmployee(admin) {
  const listed = await get(admin, '/kepegawaian/employees/select?limit=500');
  assert.equal(listed.status, 200);
  const roster = Array.isArray(listed.body.data) ? listed.body.data : listed.body;
  const employee = roster.find(item => item.nip === requested[1]);
  assert(employee && Number.isInteger(Number(employee.id)) && Number(employee.id) > 0);
  assert.equal(employee.nip, '900000000000000002');
  const access = await get(admin, `/kepegawaian/employees/${employee.id}/access`);
  assert.equal(access.status, 200);
  assert.equal(access.body.data?.role, 'user', 'Only reserved non-admin staff B may be modified.');
  assert.equal(access.body.data?.username, requested[1]);
  return employee;
}

async function openEmployee(admin, employee) {
  if (!admin.page || admin.page.isClosed()) admin.page = observe(await admin.context.newPage());
  await admin.page.goto(`${base}/kepegawaian/employees/${employee.id}`, { waitUntil: 'networkidle' });
  await admin.page.getByRole('button', { name: 'Kelola Akses (IAM)', exact: true }).waitFor();
}

async function editPosition(admin, employee, value) {
  stage = 'employee detail: benign position UI edit';
  await admin.page.getByRole('button', { name: 'Edit Biodata', exact: true }).click();
  // BioField renders its visible label as a p rather than an associated native label.
  const position = admin.page.locator('p').filter({ hasText: /^Jabatan$/ }).locator('..').locator('input');
  assert.equal(await position.count(), 1, 'Jabatan field selector is ambiguous.');
  await position.fill(value);
  const saved = responseFor(admin.page, `/api/kepegawaian/employees/${employee.id}`, 'PUT');
  await admin.page.getByRole('button', { name: 'Simpan Perubahan', exact: true }).click();
  const response = await saved;
  assert.equal(response.status(), 200);
  const record = (await response.json()).data;
  assert.equal(record.nip, requested[1]);
  assert.equal(record.jabatan, value);
  await admin.page.getByRole('button', { name: 'Edit Biodata', exact: true }).waitFor();
}

async function accountActive(admin, employee, active) {
  stage = `IAM explicit ${active ? 'activation' : 'deactivation'} via UI`;
  const loaded = responseFor(admin.page, `/api/kepegawaian/employees/${employee.id}/access`, 'GET');
  await admin.page.getByRole('button', { name: 'Kelola Akses (IAM)', exact: true }).click();
  const state = await loaded;
  assert.equal(state.status(), 200);
  const old = (await state.json()).data;
  assert.equal(old.username, requested[1]);
  assert.equal(old.role, 'user');
  const dialog = admin.page.getByRole('dialog', { name: 'Manajemen Hak Akses' });
  const checkbox = dialog.getByRole('checkbox', { name: 'Aktifkan akun akses aplikasi', exact: true });
  await checkbox.waitFor();
  await admin.page.waitForFunction(expected =>
    document.querySelector('[role=dialog] input[type=checkbox]')?.checked === expected, old.is_active);
  assert.equal(await checkbox.isChecked(), old.is_active);
  await checkbox.setChecked(active);
  const saved = responseFor(admin.page, `/api/kepegawaian/employees/${employee.id}/access`, 'PUT');
  await dialog.getByRole('button', { name: 'Simpan', exact: true }).click();
  const response = await saved;
  assert.equal(response.status(), 200);
  const record = (await response.json()).data;
  assert.equal(record.username, requested[1]);
  assert.equal(record.is_active, active);
  assert.equal(record.role, old.role);
  assert.deepEqual(record.access_modules, old.access_modules);
  await dialog.waitFor({ state: 'hidden' });
  pass(`IAM checkbox persists explicit ${active ? 'active' : 'inactive'} state without changing role/modules`);
}

async function people(admin) {
  const employee = await dummyEmployee(admin);
  const before = await get(admin, `/kepegawaian/employees/${employee.id}`);
  assert.equal(before.status, 200);
  assert.equal(before.body.data.nip, requested[1]);
  const originalPosition = before.body.data.jabatan || '';
  await warm(admin, [`/kepegawaian/employees/${employee.id}`]);
  await admin.page.close();
  const staff = await login(requested[1], process.env.ST_E2E_EMPLOYEE_PASSWORD, 'seeded staff B before deactivation');
  await staff.page.close();
  assert.equal((await get(staff, '/me')).status, 200);
  await openEmployee(admin, employee);
  await editPosition(admin, employee, `${marker} Dummy Position`);
  await admin.page.reload({ waitUntil: 'networkidle' });
  await admin.page.getByText(`${marker} Dummy Position`, { exact: true }).first().waitFor();
  pass('employee detail: real UI update survives reload');
  await editPosition(admin, employee, originalPosition);
  assert.equal((await get(admin, `/kepegawaian/employees/${employee.id}`)).body.data.jabatan || '', originalPosition);
  pass('employee detail: marked dummy field restored through UI');
  await accountActive(admin, employee, false);
  const revoked = await get(staff, '/me');
  assert([401, 403].includes(revoked.status), 'Previously authenticated dummy staff session remained usable.');
  pass('IAM deactivation rejects previously authenticated staff cookie', { httpStatus: revoked.status });
  await staff.context.close();
  await admin.page.close();
  const denied = await login(requested[1], process.env.ST_E2E_EMPLOYEE_PASSWORD, 'inactive staff B', 422);
  await denied.context.close();
  await openEmployee(admin, employee);
  await accountActive(admin, employee, true);
  await admin.page.close();
  const restored = await login(requested[1], process.env.ST_E2E_EMPLOYEE_PASSWORD, 'explicitly reactivated staff B');
  assert.equal((await get(restored, '/me')).status, 200);
  await restored.context.close();
}

async function countCard(page, label, expected) {
  const card = page.getByRole('button').filter({ has: page.getByText(label, { exact: true }) });
  await card.waitFor();
  await page.waitForFunction(({ text, expected }) => {
    const label = [...document.querySelectorAll('button p')].find(node => node.textContent.trim() === text);
    return label?.nextElementSibling?.textContent.trim() === String(expected);
  }, { text: label, expected });
}

async function incoming(admin) {
  stage = 'incoming archive: native UI create';
  await admin.page.goto(`${base}/kepegawaian/surat-masuk`, { waitUntil: 'networkidle' });
  const initial = await get(admin, '/kepegawaian/surat-masuk');
  assert.equal(initial.status, 200);
  assert.equal(initial.body.meta.summary_counts.all, 0, 'This zero-transition fixture requires its fresh disposable database.');
  await countCard(admin.page, 'Total Arsip Surat', 0);
  await admin.page.getByRole('button', { name: 'Tambah Arsip', exact: true }).click();
  await admin.page.getByLabel('Nomor Agenda *', { exact: true }).fill(marker);
  await admin.page.getByLabel('Asal Surat / Nama Pengirim *', { exact: true }).fill(`${marker} Dummy Sender`);
  await admin.page.getByPlaceholder('Tuliskan uraian ringkas maksud atau perihal surat...', { exact: true }).fill(`${marker} Dummy Subject`);
  const created = responseFor(admin.page, '/api/kepegawaian/surat-masuk', 'POST');
  await admin.page.getByRole('button', { name: 'Simpan Arsip', exact: true }).click();
  const response = await created;
  assert.equal(response.status(), 201);
  const item = (await response.json()).data;
  assert(item && Number.isInteger(Number(item.id)) && item.no_agenda === marker);
  await admin.page.getByRole('button', { name: 'Simpan Arsip', exact: true }).waitFor({ state: 'hidden' });
  const id = Number(item.id);
  let row = admin.page.locator('tbody tr').filter({ hasText: `${marker} Dummy Subject` });
  await row.waitFor();
  await countCard(admin.page, 'Total Arsip Surat', 1);
  pass('incoming archive: real create and rendered total 0 to 1');
  stage = 'incoming archive: edit and read through UI';
  await row.getByTitle('Edit Arsip', { exact: true }).click();
  await admin.page.getByPlaceholder('Tuliskan uraian ringkas maksud atau perihal surat...', { exact: true }).fill(`${marker} Revised Subject`);
  const edited = responseFor(admin.page, `/api/kepegawaian/surat-masuk/${id}`, 'POST');
  await admin.page.getByRole('button', { name: 'Perbarui Arsip', exact: true }).click();
  assert.equal((await edited).status(), 200);
  await admin.page.getByRole('button', { name: 'Perbarui Arsip', exact: true }).waitFor({ state: 'hidden' });
  row = admin.page.locator('tbody tr').filter({ hasText: `${marker} Revised Subject` });
  await row.waitFor();
  const search = admin.page.getByPlaceholder('Cari agenda, nomor, pengirim, perihal...', { exact: true });
  await search.fill(`${marker}-ABSENT`);
  await admin.page.getByText('Belum ada arsip surat masuk', { exact: true }).waitFor();
  // Summary counts are intentionally global, not filtered; zero is tested after deletion.
  await countCard(admin.page, 'Total Arsip Surat', 1);
  await search.fill(marker);
  await row.waitFor();
  pass('incoming archive: real edit and search preserve global count');
  stage = 'incoming archive: marked dummy UI cleanup and zero total';
  assert((await row.innerText()).includes(marker));
  await row.getByTitle('Hapus Arsip', { exact: true }).click();
  const dialog = admin.page.getByRole('dialog', { name: 'Hapus Arsip Surat', exact: true });
  await dialog.getByText(new RegExp(marker)).waitFor();
  const deleted = responseFor(admin.page, `/api/kepegawaian/surat-masuk/${id}`, 'DELETE');
  await dialog.getByRole('button', { name: 'Hapus', exact: true }).click();
  assert.equal((await deleted).status(), 200);
  await countCard(admin.page, 'Total Arsip Surat', 0);
  await admin.page.getByText('Belum ada arsip surat masuk', { exact: true }).waitFor();
  const final = await get(admin, '/kepegawaian/surat-masuk');
  assert.equal(final.body.meta.summary_counts.all, 0);
  assert.equal(final.body.meta.summary_counts.pending, 0);
  pass('incoming archive: marked record deleted via UI, rendered total returns to zero');
}

async function meal(admin, employee) {
  stage = 'meal: genuine SIKADIR HTML-XLS upload through UI';
  await admin.page.goto(`${base}/kepegawaian/uang-makan`, { waitUntil: 'networkidle' });
  // A tiny native input file only. This is parsed by real PHP and rendered by actual Next.
  const html = '<html><body><table><tr><td>NIP</td><td>'+requested[1]+'</td></tr>'
    +'<tr><td>NAMA</td><td>Dummy E2E Employee B</td></tr><tr><td>BULAN</td><td>September 2026</td></tr>'
    +'<tr><td>KELAS JABATAN</td><td>9</td></tr></table><table class="wbo"><tbody>'
    +'<tr><td>1</td><td>01/09/2026</td><td>Wfo</td><td>07:30</td><td>16:00</td>'
    +'<td></td><td></td><td></td><td></td><td></td><td>Hadir</td></tr></tbody></table></body></html>';
  assert(Buffer.byteLength(html) < 2048);
  const reconciled = responseFor(admin.page, '/api/kepegawaian/uang-makan/reconcile', 'POST');
  await admin.page.locator('input[type=file][multiple]').setInputFiles({
    name: `${marker}.xls`, mimeType: 'application/vnd.ms-excel', buffer: Buffer.from(html),
  });
  const response = await reconciled;
  assert.equal(response.status(), 200);
  const data = (await response.json()).data;
  assert.equal(data.periode_bulan, '2026-09');
  assert.equal(data.items.length, 1);
  const item = data.items[0];
  assert.equal(item.nip, requested[1]);
  assert.equal(Number(item.employee_id), Number(employee.id));
  assert.equal(item.daily_matrix['1'].status, 'H');
  assert.equal(item.jml_hadir, 1);
  const row = admin.page.locator('tbody tr').filter({ hasText: requested[1] });
  await row.waitFor();
  assert((await row.innerText()).includes('Dummy E2E Employee B'));
  // Three fixed identity columns precede actual day 1; do not mistake a summary H for that cell.
  assert.equal((await row.locator('td').nth(3).innerText()).trim(), 'H');
  assert.equal((await row.locator('td').nth(33).innerText()).trim(), '1');
  pass('meal: native HTML-XLS parser, employee link, September day 1 and H total rendered', { period: '2026-09', employees: 1, presentDays: 1 });
  // No operational sample button, attendance overrides, provider, or saved payroll batch is used.
}

async function templates(admin) {
  stage = 'expense template: real UI create';
  await warm(admin, ['/kepegawaian/settings?tab=expense_templates']);
  await admin.page.goto(`${base}/kepegawaian/settings?tab=expense_templates`, { waitUntil: 'networkidle' });
  await admin.page.getByRole('button', { name: 'Tambah Sumber Dana Baru', exact: true }).click();
  await admin.page.getByPlaceholder('Contoh: DIPA Balai KSDA Kaltim (693614)', { exact: true }).fill(marker);
  await admin.page.getByLabel(/Kategori Sumber Dana/).selectOption('dl1');
  // dl1 intentionally permits empty expense text, avoiding edits to seeded legal clauses/defaults.
  const created = responseFor(admin.page, '/api/kepegawaian/st-expense-templates', 'POST');
  await admin.page.getByRole('button', { name: 'Simpan Template Biaya', exact: true }).click();
  const response = await created;
  assert.equal(response.status(), 201);
  const item = (await response.json()).data;
  assert(item && Number.isInteger(Number(item.id)) && item.name === marker);
  assert.equal(item.is_default, false);
  assert.equal(item.is_active, true);
  const id = Number(item.id);
  const row = admin.page.locator('tbody tr').filter({ hasText: marker });
  await row.waitFor();
  pass('expense template: real create is listed and remains active/nondefault');
  stage = 'expense template: actual UI reload/read';
  await admin.page.reload({ waitUntil: 'networkidle' });
  await row.waitFor();
  assert((await row.innerText()).includes(marker));
  pass('expense template: real persisted record survives reload');
  stage = 'expense template: marked dummy UI cleanup';
  await row.getByTitle('Hapus Sumber Dana', { exact: true }).click();
  const heading = admin.page.getByRole('heading', { name: 'Hapus Template Sumber Dana?', exact: true });
  await heading.waitFor();
  const modal = heading.locator('../../..');
  assert((await modal.innerText()).includes(marker));
  const deleted = responseFor(admin.page, `/api/kepegawaian/st-expense-templates/${id}`, 'DELETE');
  await modal.getByRole('button', { name: 'Ya, Hapus', exact: true }).click();
  assert.equal((await deleted).status(), 200);
  await row.waitFor({ state: 'detached' });
  pass('expense template: only marked dummy record deleted via UI');
}

// Insert before main() in the current maintained kpg-flow.actual-app.cjs.
// Uses only its guarded dummy actors, genuine UI login, readonly get(), and actual UI helpers.
async function openStaffLeavePage(staff) {
  if (!staff.page || staff.page.isClosed()) staff.page = observe(await staff.context.newPage());
  await staff.page.goto(`${base}/portal`, { waitUntil: 'networkidle' });
  await staff.page.getByRole('button', { name: /^Pengajuan Cuti(?:\s+\d+)?$/ }).click();
  await staff.page.getByRole('button', { name: 'Ajukan Cuti Baru', exact: true }).waitFor();
}

function personalLeaveCard(page, reason) {
  // The actual MyLeaveTab card has no record test id. Select its unique marked reason,
  // then its nearest rounded card, never an unmarked sibling or an entire page panel.
  return page.getByText(reason, { exact: true })
    .locator('xpath=ancestor::div[contains(@class,"rounded-2xl")][1]');
}

async function openPersonalLeaveForm(staff, date, reason) {
  await staff.page.getByRole('button', { name: 'Ajukan Cuti Baru', exact: true }).click();
  const heading = staff.page.getByRole('heading', { name: 'Formulir Permintaan Cuti Mandiri', exact: true });
  await heading.waitFor();
  const modal = heading.locator('../../..');
  // These source labels are p/sibling-label elements, so use native form field shape
  // and unique actual placeholders instead of claiming nonexistent label associations.
  await modal.locator('select').selectOption({ label: 'Cuti Tahunan' });
  await modal.locator('input[type=date]').nth(0).fill(date);
  await modal.locator('input[type=date]').nth(1).fill(date);
  await modal.getByPlaceholder('Contoh: Perpanjang SIM di Balikpapan / Acara keluarga...', { exact: true }).fill(reason);
  await modal.getByPlaceholder('Contoh: Jl. Sudirman No. 12, Balikpapan', { exact: true }).fill(`${marker} Dummy Address`);
  // No telephone/provider operation is necessary; this optional field remains empty.
  await modal.getByPlaceholder('Contoh: 081351458775', { exact: true }).fill('');
  await modal.getByText('1 Hari Kerja', { exact: true }).waitFor();
  return modal;
}

async function submitPersonalLeave(staff, employee, date, suffix) {
  stage = `leave: ordinary staff UI submission ${suffix}`;
  const reason = `${marker} ${suffix}`;
  const modal = await openPersonalLeaveForm(staff, date, reason);
  const submitted = responseFor(staff.page, '/api/me/leave-requests', 'POST');
  await modal.getByRole('button', { name: 'Kirim Pengajuan Cuti', exact: true }).click();
  const response = await submitted;
  assert.equal(response.status(), 201);
  const record = (await response.json()).data;
  assert(Number.isInteger(Number(record.id)) && Number(record.id) > 0);
  assert.equal(Number(record.employee_id), Number(employee.id));
  assert.equal(record.alasan_cuti, reason);
  assert.equal(record.jenis_cuti, 'Cuti Tahunan');
  assert.equal(record.jumlah_hari, 1);
  assert.equal(record.status, 'PENGAJUAN');
  await modal.waitFor({ state: 'hidden' });
  const card = personalLeaveCard(staff.page, reason);
  await card.getByText('Pengajuan', { exact: true }).waitFor();
  await card.getByRole('button', { name: 'Batalkan', exact: true }).waitFor();
  pass(`leave: ${suffix} saved and rendered as ordinary staff pending request`, { days: 1 });
  return { id: Number(record.id), reason };
}

async function assertPendingQuota(staff, year, expectedPending) {
  const result = await get(staff, `/me/leave-balance?year=${year}`);
  assert.equal(result.status, 200);
  assert.equal(result.body.employee.nip, requested[1]);
  assert.equal(result.body.data.total_hak_cuti, 12);
  assert.equal(result.body.data.pending_cuti_tahunan, expectedPending);
  assert.equal(result.body.data.sisa_cuti_tersedia, 12);
  assert.equal(result.body.data.sisa_cuti_dapat_diajukan, 12 - expectedPending);
}

async function leave(admin) {
  const employee = await dummyEmployee(admin);
  await warm(admin, ['/kepegawaian/cuti']);
  await admin.page.close();
  const staff = await login(requested[1], process.env.ST_E2E_EMPLOYEE_PASSWORD, 'ordinary staff B leave flow');
  const identity = await staff.page.evaluate(() => JSON.parse(localStorage.getItem('bksda_user') || 'null'));
  assert.equal(identity?.username, requested[1]);
  assert.equal(identity?.role, 'user');
  assert(!(identity?.access_modules || []).includes('kepegawaian'), 'Personal flow must not rely on management authority.');
  const year = new Date().getUTCFullYear();
  assert(year >= 2000 && year <= 2100);
  const workday = new Date(Date.UTC(year, 11, 1));
  while ([0, 6].includes(workday.getUTCDay())) workday.setUTCDate(workday.getUTCDate() + 1);
  const date = workday.toISOString().slice(0, 10);
  const types = await get(staff, '/me/leave-types');
  assert.equal(types.status, 200);
  const annual = types.body.data.find(type => type.kode === 'CT' && type.nama === 'Cuti Tahunan');
  assert(annual && annual.is_active && annual.hitung_hari === 'hari_kerja' && annual.potong_kuota_tahunan);
  const initial = await get(staff, '/me/leave-requests');
  assert.equal(initial.status, 200);
  assert.deepEqual(initial.body.data, [], 'Fresh dummy B must have no preexisting leave history.');
  await assertPendingQuota(staff, year, 0);
  await openStaffLeavePage(staff);
  const first = await submitPersonalLeave(staff, employee, date, 'Cancel Control');
  await assertPendingQuota(staff, year, 1);
  stage = 'leave: genuine native confirmation and pending cancellation';
  const nativeConfirm = staff.page.waitForEvent('dialog');
  const cancelled = responseFor(staff.page, `/api/me/leave-requests/${first.id}`, 'DELETE');
  const clicked = personalLeaveCard(staff.page, first.reason).getByRole('button', { name: 'Batalkan', exact: true }).click();
  const confirmation = await nativeConfirm;
  assert.equal(confirmation.type(), 'confirm');
  assert.equal(confirmation.message(), 'Apakah Anda yakin ingin membatalkan permohonan cuti ini?');
  await confirmation.accept();
  await clicked;
  assert.equal((await cancelled).status(), 200);
  await staff.page.getByText(first.reason, { exact: true }).waitFor({ state: 'detached' });
  await assertPendingQuota(staff, year, 0);
  pass('leave: own pending cancellation removes marked card and releases one-day reservation');
  const second = await submitPersonalLeave(staff, employee, date, 'Admin Decision');
  await assertPendingQuota(staff, year, 1);
  stage = 'leave: actual UI overlapping submission keeps correct rejection';
  const overlapForm = await openPersonalLeaveForm(staff, date, `${marker} Overlap Negative`);
  const overlapped = responseFor(staff.page, '/api/me/leave-requests', 'POST');
  await overlapForm.getByRole('button', { name: 'Kirim Pengajuan Cuti', exact: true }).click();
  const refused = await overlapped;
  assert.equal(refused.status(), 422);
  assert.match((await refused.json()).message, /permohonan cuti aktif/i);
  await overlapForm.getByRole('button', { name: 'Batal', exact: true }).click();
  await overlapForm.waitFor({ state: 'hidden' });
  assert.equal((await get(staff, '/me/leave-requests')).body.data.length, 1);
  await assertPendingQuota(staff, year, 1);
  pass('leave: native overlapping submission rejected without creating a second record', { httpStatus: 422 });
  await staff.page.close();
  admin.page = observe(await admin.context.newPage());
  stage = 'leave: management pending inbox and real rejection decision';
  await admin.page.goto(`${base}/kepegawaian/cuti`, { waitUntil: 'networkidle' });
  await admin.page.getByPlaceholder('Cari nama pegawai, NIP, no. surat, jenis cuti...', { exact: true }).fill(marker);
  const row = admin.page.locator('tbody tr').filter({ hasText: second.reason });
  await row.getByRole('button', { name: 'Pengajuan', exact: true }).waitFor();
  assert((await row.innerText()).includes('Dummy E2E Employee B'));
  const saved = await get(admin, `/kepegawaian/leave-requests/${second.id}`);
  assert.equal(saved.body.data.alasan_cuti, second.reason);
  assert.equal(Number(saved.body.data.employee_id), Number(employee.id));
  await row.getByTitle('Aksi Lainnya', { exact: true }).click();
  await admin.page.getByRole('menuitem', { name: 'Tolak Pengajuan', exact: true }).click();
  const rejectDialog = admin.page.getByRole('dialog', { name: 'Tolak Pengajuan Cuti?', exact: true });
  await rejectDialog.getByText(/Dummy E2E Employee B/).waitFor();
  const rejected = responseFor(admin.page, `/api/kepegawaian/leave-requests/${second.id}/status`, 'PUT');
  await rejectDialog.getByRole('button', { name: 'Tolak Pengajuan', exact: true }).click();
  const decision = await rejected;
  assert.equal(decision.status(), 200);
  assert.equal((await decision.json()).data.status, 'DITOLAK');
  await row.getByRole('button', { name: 'Ditolak', exact: true }).waitFor();
  await assertPendingQuota(staff, year, 0);
  pass('leave: real admin inbox shows pending request and persists rejection without quota debit');
  await admin.page.close();
  stage = 'leave: ordinary personal UI reflects persisted admin decision';
  await openStaffLeavePage(staff);
  const rejectedCard = personalLeaveCard(staff.page, second.reason);
  await rejectedCard.getByText('Ditolak', { exact: true }).waitFor();
  assert.equal(await rejectedCard.getByRole('button', { name: 'Batalkan', exact: true }).count(), 0);
  const own = await get(staff, `/me/leave-requests/${second.id}`);
  assert.equal(own.status, 200);
  assert.equal(own.body.data.status, 'DITOLAK');
  pass('leave: ordinary staff reads rejected state and has no pending-cancel action');
  await staff.page.close();
  admin.page = observe(await admin.context.newPage());
  stage = 'leave: marked dummy admin UI cleanup';
  await admin.page.goto(`${base}/kepegawaian/cuti`, { waitUntil: 'networkidle' });
  await admin.page.getByPlaceholder('Cari nama pegawai, NIP, no. surat, jenis cuti...', { exact: true }).fill(marker);
  const cleanupRow = admin.page.locator('tbody tr').filter({ hasText: second.reason });
  await cleanupRow.waitFor();
  assert((await cleanupRow.innerText()).includes(marker));
  await cleanupRow.getByTitle('Aksi Lainnya', { exact: true }).click();
  await admin.page.getByRole('menuitem', { name: 'Hapus Pengajuan', exact: true }).click();
  const deleteDialog = admin.page.getByRole('dialog', { name: 'Hapus Pengajuan Cuti?', exact: true });
  await deleteDialog.getByText(/Dummy E2E Employee B/).waitFor();
  const deleted = responseFor(admin.page, `/api/kepegawaian/leave-requests/${second.id}`, 'DELETE');
  await deleteDialog.getByRole('button', { name: 'Hapus Pengajuan', exact: true }).click();
  assert.equal((await deleted).status(), 200);
  await cleanupRow.waitFor({ state: 'detached' });
  assert.deepEqual((await get(staff, '/me/leave-requests')).body.data, []);
  await assertPendingQuota(staff, year, 0);
  pass('leave: only marked rejected request removed through real admin UI; personal list and quota restored');
  await admin.page.close();
  await staff.context.close();
}

async function main() {
  browser = await chromium.launch({ executablePath: process.env.ST_E2E_CHROMIUM_EXECUTABLE, headless: true, args: ['--disable-dev-shm-usage'] });
  const admin = await login(process.env.ST_E2E_ADMIN_USERNAME, process.env.ST_E2E_ADMIN_PASSWORD, 'dummy super_admin');
  const identity = await admin.page.evaluate(() => JSON.parse(localStorage.getItem('bksda_user') || 'null'));
  assert.equal(identity?.role, 'super_admin');
  assert.equal(identity?.username, process.env.ST_E2E_ADMIN_USERNAME);
  if (section === 'people') await people(admin);
  if (section === 'records') {
    const employee = await dummyEmployee(admin);
    await warm(admin, ['/kepegawaian/surat-masuk', '/kepegawaian/uang-makan']);
    await incoming(admin);
    await meal(admin, employee);
  }
  if (section === 'templates') await templates(admin);
  if (section === 'leave') await leave(admin);
  assert.equal(pageErrors, 0, 'Actual application emitted page errors (contents omitted).');
  console.log(JSON.stringify({ status: 'PASS', section, exercised, actualApplication: 'Next+PHP+Chromium', apiMocks: false,
    exclusions: ['Other section modes unless run separately', 'binary XLSX import', 'document/task/leave master template UI',
      'real provider/production behavior', 'native workbook export', 'full mobile/accessibility coverage'] }));
  await admin.context.close();
}

const deadline = setTimeout(() => {
  console.log(JSON.stringify({ status: 'INCONCLUSIVE', section, check: 'fixture wall limit', stage }));
  process.exit(2);
}, 240000);
main().catch(async error => {
  // Keep a bounded dummy-only UI diagnostic; omit response payloads, cookies and credentials.
  console.log(JSON.stringify({ status: 'INCONCLUSIVE', section, stage, type: error.name,
    reason: error.message.slice(0, 1500).replace(/https?:\/\/\S+/g, '[local-url]') }));
  if (latestPage && !latestPage.isClosed()) console.log(JSON.stringify({ status: 'DIAGNOSTIC', section, check: 'dummy UI',
    text: (await latestPage.locator('body').innerText().catch(() => '')).replace(/\b\d{18}\b/g, '[dummy-employee]').slice(0, 4000) }));
  process.exitCode = 2;
}).finally(async () => { await browser?.close(); clearTimeout(deadline); });
