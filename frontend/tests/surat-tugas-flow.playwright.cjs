'use strict';
/* eslint-disable @typescript-eslint/no-require-imports */

// Actual-app flow for a disposable, network-none sandbox only; never use operational accounts.
// Browser sessions remain in memory; server state belongs exclusively to disposable scratch.
const assert = require('node:assert/strict');

assert.equal(process.env.ST_E2E_SANDBOX, 'disposable-network-none', 'Run only in the isolated disposable Docker sandbox.');
const base = process.env.ST_E2E_URL;
assert(base, 'Missing explicit ST_E2E_URL (sandbox loopback only).');
const localHosts = new Set(['localhost', '127.0.0.1', '[::1]']);
assert(localHosts.has(new URL(base).hostname), 'This test only supports localhost.');
assert.equal(process.env.ST_E2E_ALLOW_WRITE, '1', 'Explicit disposable-fixture write opt-in required.');
assert.equal(new URL(base).protocol, 'http:');
assert(!new URL(base).username && !new URL(base).password, 'URL credentials are forbidden.');
for (const key of ['ST_E2E_ADMIN_USERNAME', 'ST_E2E_ADMIN_PASSWORD', 'ST_E2E_EMPLOYEE_PASSWORD']) {
  assert(process.env[key], `Missing ${key}`);
}

assert(/^dummy-/.test(process.env.ST_E2E_ADMIN_USERNAME), 'Use a dummy admin username.');
for (const key of ['ST_E2E_ADMIN_PASSWORD', 'ST_E2E_EMPLOYEE_PASSWORD']) {
  assert(process.env[key].startsWith('Dummy'), 'Use dummy-only passwords.');
}
const requested = (process.env.ST_E2E_EMPLOYEE_NIPS || '').split(',');
assert.equal(requested.length, 3, 'Explicit dummy NIPs required: two participants and one unrelated employee.');
assert(requested.every(nip => /^900\d{15}$/.test(nip)), 'Only reserved dummy fixture NIPs are accepted.');
assert.equal(new Set(requested).size, 3, 'Use three different dummy NIPs.');

const { chromium } = require('playwright');
const marker = `TEST-E2E-ST-${Date.now()}`;
const date = process.env.ST_E2E_DATE || '2099-12-01';
let browser;
let admin;
let letterId;
let stage = 'launch';

const errors = [];
function report(status, check, detail = '') {
  console.log(JSON.stringify({ status, check, ...(detail ? { detail } : {}) }));
}

async function newContext(viewport) {
  const context = await browser.newContext({ viewport, serviceWorkers: 'block' });
  await context.route('**/*', route => {
    const url = new URL(route.request().url());
    return localHosts.has(url.hostname) ? route.continue() : route.abort('blockedbyclient');
  });
  return context;
}

async function openActor(username, password, label) {
  stage = `${label}: UI login`;
  const context = await newContext({ width: 1440, height: 1000 });
  const page = await context.newPage();
  page.setDefaultTimeout(20000);
  page.on('pageerror', () => errors.push(label));
  const actor = { page, context, label, apiBase: '' };

  await page.goto(`${base}/login`, { waitUntil: 'networkidle', timeout: 45000 });
  await page.locator('input[name=username]').fill(username);
  await page.locator('input[name=password]').fill(password);
  const responsePromise = page.waitForResponse(r => r.url().endsWith('/login') && r.request().method() === 'POST');
  await page.locator('button[type=submit]').click();
  const response = await responsePromise;
  assert.equal(response.status(), 200, `${label}: login failed (credentials omitted).`);

  actor.apiBase = response.url().slice(0, -'/login'.length);
  assert(localHosts.has(new URL(actor.apiBase).hostname), 'Refusing a non-local backend.');
  // Login currently replaces location from both its auth effect and submit handler.
  // Wait for the destination UI rather than a navigation that can be superseded.
  await page.getByRole('button', { name: 'Lihat Notifikasi', exact: true }).waitFor({ timeout: 45000 });
  assert.equal(new URL(page.url()).pathname, '/portal');
  report('PASS', `${label}: real UI login`);
  return actor;
}

async function api(actor, path, method = 'GET', body) {
  return actor.page.evaluate(async ({ url, method, body }) => {
    const headers = { Accept: 'application/json' };
    const token = localStorage.getItem('bksda_token');
    if (token) headers.Authorization = `Bearer ${token}`;
    const xsrf = document.cookie.split('; ').find(c => c.startsWith('XSRF-TOKEN='));
    if (xsrf) headers['X-XSRF-TOKEN'] = decodeURIComponent(xsrf.slice('XSRF-TOKEN='.length));
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    const response = await fetch(url, {
      method, headers, credentials: 'include',
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
    const json = await response.json().catch(() => ({}));
    return { status: response.status, json };
  }, { url: `${actor.apiBase}${path}`, method, body });
}

async function listContains(actor, expected) {
  const response = await api(actor, `/surat-tugas/my?search=${encodeURIComponent(marker)}`);
  assert.equal(response.status, 200, `${actor.label}: personal list failed.`);
  assert.equal(response.json.data.some(item => item.id === letterId), expected);
}

async function main() {
  browser = await chromium.launch({
    ...(process.env.ST_E2E_CHROMIUM_EXECUTABLE ? { executablePath: process.env.ST_E2E_CHROMIUM_EXECUTABLE } : { channel: 'chrome' }),
    headless: true,
    args: ['--disable-dev-shm-usage'],
  });

  admin = await openActor(process.env.ST_E2E_ADMIN_USERNAME, process.env.ST_E2E_ADMIN_PASSWORD, 'admin');
  const choices = await api(admin, '/kepegawaian/employees/select?limit=500');
  assert.equal(choices.status, 200);
  const employees = Array.isArray(choices.json.data) ? choices.json.data : choices.json;
  const candidates = requested.map(nip => employees.find(e => e.nip === nip));
  assert(candidates.every(Boolean), 'Explicit dummy employees not found; no candidate scanning permitted.');
  for (const employee of candidates) {
    const access = await api(admin, `/kepegawaian/employees/${employee.id}/access`);
    assert.equal(access.status, 200);
    assert(access.json.data && !['admin', 'super_admin'].includes(access.json.data.role), 'Fixture employees must be non-admin.');
  }
  assert.equal(candidates.length, 3, 'Need two participants and one unrelated employee.');

  assert.equal(new Set(candidates.map(e => e.id)).size, 3, 'Use three different employees.');
  const staff = [];
  for (let i = 0; i < candidates.length; i++) {
    const actor = await openActor(candidates[i].nip, process.env.ST_E2E_EMPLOYEE_PASSWORD, `employee-${i + 1}`);
    const role = await actor.page.evaluate(() => JSON.parse(localStorage.getItem('bksda_user') || 'null')?.role);
    assert(role && !['admin', 'super_admin'].includes(role), 'Employee test must have a known non-admin role.');
    staff.push(actor);
  }

  stage = 'public mobile form and keyboard search';
  const publicContext = await newContext({ width: 375, height: 812 });
  const page = await publicContext.newPage();
  page.setDefaultTimeout(20000);
  page.on('pageerror', () => errors.push('public'));
  await page.goto(`${base}/surat-tugas`, { waitUntil: 'networkidle', timeout: 45000 });
  const search = page.getByRole('textbox', { name: 'Cari Personel', exact: true });
  async function noOverflow(check) {
    const widths = await page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth }));
    assert(widths.document <= widths.viewport + 1, `${check}: horizontal overflow ${JSON.stringify(widths)}`);
    report('PASS', check, widths);
  }
  await noOverflow('public 375px: initial layout');
  await search.fill(candidates[0].nip);
  await search.focus();
  await page.locator('#personnel-search-results button').first().waitFor();
  assert.equal(await search.getAttribute('aria-expanded'), 'true');
  await search.press('ArrowDown');
  assert(await page.locator('#personnel-search-results button').first().evaluate(el => el === document.activeElement));
  await page.keyboard.press('Escape');
  assert(await search.evaluate(el => el === document.activeElement));
  assert.equal(await search.getAttribute('aria-expanded'), 'false');
  report('PASS', 'public: labelled search, ArrowDown and Escape focus');
  for (const [index, employee] of candidates.slice(0, 2).entries()) {
    stage = `select participant ${index + 1}`;
    await search.fill(employee.nip);
    await search.focus();
    const result = page.locator('#personnel-search-results button').filter({ hasText: employee.name || employee.nama_lengkap });
    await result.waitFor();
    await search.press('ArrowDown');
    assert(await result.evaluate(el => el === document.activeElement));
    await page.keyboard.press('Enter');
  }
  await noOverflow('public 375px: selected personnel');
  stage = 'open detail step';
  await page.getByRole('button', { name: 'Lanjutkan ke Detail Tugas' }).click();
  await page.getByPlaceholder('Contoh: Kabupaten Kutai Barat').fill('Samarinda');
  await page.getByLabel('Dalam Rangka', { exact: false }).fill(`${marker} - dummy sandbox, bukan penugasan operasional`);
  const dates = page.locator('input[type=date]');
  await dates.nth(0).fill(date);
  await dates.nth(1).fill(date);
  stage = 'select DIPA funding';
  await page.locator('label').filter({ has: page.locator('input[name=sumber_dana]') }).filter({ hasText: 'DIPA' }).first().click();
  const consent = page.locator('input[name=tanda_setuju][value=sudah]');
  if (await consent.count()) await consent.locator('..').click();
  await page.locator('textarea').last().fill(`${marker}: disposable sandbox flow test`);
  await noOverflow('public 375px: detail form');
  stage = 'submit public form';
  const submitted = page.waitForResponse(r => r.url().endsWith('/surat-tugas/submit') && r.request().method() === 'POST');
  await page.locator('button[type=submit]').click();
  const response = await submitted;
  assert.equal(response.status(), 201, `Public submit returned ${response.status()}; no approval attempted.`);
  const body = await response.json();
  letterId = body.data?.id;
  assert(letterId, 'Missing created letter ID.');
  await page.getByRole('heading', { name: 'Berhasil Disubmit!' }).waitFor();
  report('PASS', 'anonymous real UI submission', { marker, letterId });

  const pending = await api(admin, `/surat-tugas/${letterId}`);
  assert.equal(pending.status, 200);
  assert.equal(pending.json.data.status, 'pending');
  assert.equal(pending.json.data.employees.length, 2);
  for (const actor of staff.slice(0, 2)) await listContains(actor, false);
  report('PASS', 'pending: two assignees, not yet in issued employee lists');

  stage = 'reject unnumbered publication without mutation';
  assert(!pending.json.data.nomor_surat, 'Public fixture must start unnumbered.');
  const notificationActors = [admin, ...staff];
  const notificationsBefore = await Promise.all(notificationActors.map(actor => api(actor, '/portal/notifications?per_page=50')));
  assert(notificationsBefore.every(response => response.status === 200), 'Notification snapshots must succeed.');
  const rejected = await api(admin, `/surat-tugas/${letterId}/approve`, 'PUT', { status: 'approved' });
  assert.equal(rejected.status, 422);
  assert(rejected.json.errors?.nomor_surat, 'Expected a number-specific validation error.');
  const afterRejection = await api(admin, `/surat-tugas/${letterId}`);
  assert.deepEqual(afterRejection, pending, 'Rejected approval changed the canonical document or participants.');
  const notificationsAfter = await Promise.all(notificationActors.map(actor => api(actor, '/portal/notifications?per_page=50')));
  assert.deepEqual(notificationsAfter, notificationsBefore, 'Rejected approval mutated employee notifications.');
  report('PASS', 'unnumbered approval: 422, unchanged document/participants/notifications');

  stage = 'find test letter in admin inbox';
  await admin.page.goto(`${base}/kepegawaian/surat-tugas/inbox`, { waitUntil: 'networkidle', timeout: 45000 });
  await admin.page.getByPlaceholder('Cari nomor surat, maksud perjalanan, nama pegawai, atau tujuan...').fill(marker);
  await admin.page.getByText(new RegExp(marker)).first().click();
  await admin.page.getByRole('button', { name: 'Lengkapi di Builder', exact: true }).click();
  await admin.page.waitForURL(`**/kepegawaian/surat-tugas/builder/${letterId}`);
  report('PASS', 'incomplete inbox action routes to actual Builder');

  stage = 'complete and save canonical Builder payload';
  await admin.page.getByRole('button', { name: 'Nomor Naskah', exact: false }).click();
  const number = `${marker}/DUMMY/2099`;
  await admin.page.getByRole('textbox', { name: 'Nomor naskah', exact: true }).fill(number);
  await admin.page.getByRole('button', { name: 'Simpan Perubahan', exact: true }).click();
  const savedPromise = admin.page.waitForResponse(r => r.url().endsWith(`/surat-tugas/${letterId}`) && r.request().method() === 'PUT');
  await admin.page.getByRole('dialog').getByRole('button', { name: 'Simpan Perubahan', exact: true }).click();
  const savedResponse = await savedPromise;
  assert.equal(savedResponse.status(), 200);
  const payload = savedResponse.request().postDataJSON();
  assert.equal(payload.nomor_surat, number);
  assert.equal(payload.employees.length, 2);
  assert.equal(payload.employee_ids.length, 2);
  assert(payload.maksud_tujuan.includes(marker));
  assert(payload.template_snapshot?.configuration);
  assert(payload.menimbang?.length && payload.dasar?.length);
  const canonical = await api(admin, `/surat-tugas/${letterId}`);
  assert.equal(canonical.json.data.status, 'pending');
  assert.equal(canonical.json.data.nomor_surat, number);
  for (const field of ['maksud_tujuan', 'tempat_tujuan', 'sumber_dana', 'menimbang', 'dasar']) {
    assert.deepEqual(canonical.json.data[field], payload[field], `Canonical ${field} differs from Builder payload.`);
  }
  for (const field of ['tanggal_mulai', 'tanggal_selesai']) {
    assert.equal(canonical.json.data[field]?.slice(0, 10), payload[field]);
  }
  assert.deepEqual(canonical.json.data.employees.map(e => String(e.id)).sort(), candidates.slice(0, 2).map(e => String(e.id)).sort());
  await admin.page.reload({ waitUntil: 'networkidle' });
  await admin.page.getByRole('textbox', { name: 'Nomor naskah', exact: true }).waitFor();
  await admin.page.waitForFunction(expected => document.querySelector('[aria-label="Nomor naskah"]')?.value === expected, number);
  assert.deepEqual(await api(admin, `/surat-tugas/${letterId}`), canonical, 'Reload mutated the saved document.');
  report('PASS', 'real Builder UI saves canonical payload and number survives reload');

  stage = 'cancel then confirm publication in inbox';
  await admin.page.goto(`${base}/kepegawaian/surat-tugas/inbox`, { waitUntil: 'networkidle', timeout: 45000 });
  await admin.page.getByPlaceholder('Cari nomor surat, maksud perjalanan, nama pegawai, atau tujuan...').fill(marker);
  await admin.page.getByText(new RegExp(marker)).first().click();
  const publish = admin.page.getByRole('button', { name: 'Setujui & Terbitkan', exact: true });
  const beforeCancelNotices = await Promise.all(notificationActors.map(actor => api(actor, '/portal/notifications?per_page=50')));
  await publish.click();
  await admin.page.getByRole('button', { name: 'Batal', exact: true }).click();
  const afterCancel = await api(admin, `/surat-tugas/${letterId}`);
  assert.deepEqual(afterCancel, canonical, 'Cancel changed the saved canonical document.');
  assert.deepEqual(await Promise.all(notificationActors.map(actor => api(actor, '/portal/notifications?per_page=50'))), beforeCancelNotices, 'Cancel mutated notifications.');
  report('PASS', 'cancel publication leaves document and notifications unchanged');
  await publish.click();
  const approvedPromise = admin.page.waitForResponse(r => r.url().includes(`/surat-tugas/${letterId}/approve`) && r.request().method() === 'PUT');
  await admin.page.getByRole('button', { name: 'Terbitkan Sekarang', exact: true }).click();
  assert.equal((await approvedPromise).status(), 200);
  const approved = await api(admin, `/surat-tugas/${letterId}`);
  assert.equal(approved.json.data.status, 'approved');
  assert(approved.json.data.approved_by);
  report('PASS', 'real admin UI approval publishes the test letter');
  assert.equal(approved.json.data.nomor_surat, number);

  for (const actor of staff.slice(0, 2)) {
    await listContains(actor, true);
    const detail = await api(actor, `/surat-tugas/my/${letterId}`);
    assert.equal(detail.status, 200);
    assert.equal(detail.json.data.status, 'approved');
    stage = `${actor.label}: notification and preview`;
    await actor.page.reload({ waitUntil: 'networkidle' });
    await actor.page.getByRole('button', { name: 'Lihat Notifikasi', exact: true }).click();
    const notice = actor.page.locator('div.cursor-pointer').filter({ has: actor.page.locator('p', { hasText: /^Surat Tugas Diterbitkan$/ }) }).filter({ hasText: marker });
    await notice.first().waitFor({ timeout: 15000 });
    await notice.first().click();
    await actor.page.locator('#print-letter-area').waitFor({ timeout: 20000 });
    const preview = await actor.page.locator('#print-letter-area').innerText();
    assert(preview.includes(marker));
    assert(preview.includes(number));
    for (const employee of candidates.slice(0, 2)) assert(preview.includes(employee.name || employee.nama_lengkap));
    report('PASS', `${actor.label}: issued list, notification click, actual formal preview`);
  }
  await listContains(staff[2], false);
  const unrelatedNotices = await api(staff[2], '/portal/notifications?per_page=50');
  assert.equal(unrelatedNotices.status, 200);
  assert(!unrelatedNotices.json.data.some(notice => String(notice.reference_id) === String(letterId)));
  assert.equal((await api(staff[2], `/surat-tugas/my/${letterId}`)).status, 403);
  report('PASS', 'unrelated employee cannot list or open the test letter');
  assert.equal(errors.length, 0, `Unhandled browser errors in: ${errors.join(', ')}`);
  report('PASS', 'browser unhandled errors', { count: errors.length });
}

main().catch(error => {
  // Omit call logs and redact credentials/NIPs from the diagnostic line.
  let message = error.message.split('\n')[0].replace(/\b\d{18}\b/g, '[employee]');
  for (const key of ['ST_E2E_ADMIN_PASSWORD', 'ST_E2E_EMPLOYEE_PASSWORD']) {
    if (process.env[key]) message = message.split(process.env[key]).join('[redacted]');
  }
  report('FAIL', 'flow interrupted', { stage, type: error.name, message });
  process.exitCode = 1;
}).finally(async () => {
  try {
    if (letterId && admin) {
      const current = await api(admin, `/surat-tugas/${letterId}`);
      assert.equal(current.status, 200);
      assert(current.json.data.keterangan?.includes(marker), 'Cleanup marker mismatch; refusing deletion.');
      const result = await api(admin, `/surat-tugas/${letterId}`, 'DELETE');
      assert.equal(result.status, 200);
      report('PASS', 'cleanup: only the marked test letter moved to trash', { letterId, marker, note: 'Audit trail and generated test notifications remain; no bulk deletion or permanent deletion.' });
    }
  } catch {
    report('FAIL', 'marked fixture cleanup failed; disposable sandbox teardown still required', { letterId, marker });
    process.exitCode = 1;
  }
  if (browser) await browser.close();
});
