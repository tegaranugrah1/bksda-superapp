'use strict';
// Author-only fixture: run only through the trusted, bounded, network-none runner.
const assert = require('node:assert/strict');
assert.equal(process.env.ST_E2E_SANDBOX, 'disposable-network-none');
assert.equal(process.env.ST_E2E_ALLOW_WRITE, '1');
const base = process.env.ST_E2E_URL;
const hosts = new Set(['localhost', '127.0.0.1', '[::1]']);
const origin = new URL(base);
assert(hosts.has(origin.hostname) && origin.protocol === 'http:' && !origin.username && !origin.password);
assert(/^dummy-/.test(process.env.ST_E2E_ADMIN_USERNAME || ''));
assert((process.env.ST_E2E_ADMIN_PASSWORD || '').startsWith('Dummy'));
assert((process.env.ST_E2E_EMPLOYEE_PASSWORD || '').startsWith('Dummy'));
assert(/^900\d{15}$/.test(process.env.ST_E2E_SNAPSHOT_EMPLOYEE_NIP || ''), 'Supply an exact reserved dummy employee NIP.');
assert(process.env.ST_E2E_CHROMIUM_EXECUTABLE, 'Supply installed sandbox Chromium.');
const { chromium } = require('playwright');
let browser, stage = 'launch';
const marker = `DUMMY-SNAPSHOT-${Date.now()}`;
const output = (status, check, detail = {}) => console.log(JSON.stringify({ status, check, ...detail }));

async function api(page, url) {
  return page.evaluate(async url => {
    const headers = { Accept: 'application/json' };
    const token = localStorage.getItem('bksda_token');
    if (token) headers.Authorization = `Bearer ${token}`;
    const response = await fetch(url, { credentials: 'include', headers });
    return { status: response.status, body: await response.json() };
  }, url);
}

async function main() {
  browser = await chromium.launch({ executablePath: process.env.ST_E2E_CHROMIUM_EXECUTABLE, headless: true, args: ['--disable-dev-shm-usage'] });
  async function context() {
    const result = await browser.newContext({ viewport: { width: 1440, height: 1000 }, serviceWorkers: 'block' });
    result.setDefaultTimeout(20000);
    result.setDefaultNavigationTimeout(45000);
    await result.route('**/*', route => hosts.has(new URL(route.request().url()).hostname) ? route.continue() : route.abort('blockedbyclient'));
    return result;
  }
  const admin = await context();
  const page = await admin.newPage();
  stage = 'real admin UI login';
  await page.goto(`${base}/login`, { waitUntil: 'networkidle' });
  await page.locator('input[name=username]').fill(process.env.ST_E2E_ADMIN_USERNAME);
  await page.locator('input[name=password]').fill(process.env.ST_E2E_ADMIN_PASSWORD);
  const loggedIn = page.waitForResponse(r => r.url().endsWith('/login') && r.request().method() === 'POST');
  await page.locator('button[type=submit]').click();
  const login = await loggedIn;
  assert.equal(login.status(), 200);
  const apiBase = login.url().slice(0, -'/login'.length);
  assert(hosts.has(new URL(apiBase).hostname));
  await page.getByRole('button', { name: 'Lihat Notifikasi', exact: true }).waitFor({ timeout: 45000 });
  const role = await page.evaluate(() => JSON.parse(localStorage.getItem('bksda_user') || 'null')?.role);
  assert(['admin', 'super_admin'].includes(role));
  stage = 'select exact dummy employee';
  const roster = await api(page, `${apiBase}/kepegawaian/employees/select?limit=500`);
  assert.equal(roster.status, 200);
  const employees = Array.isArray(roster.body.data) ? roster.body.data : roster.body;
  const employee = employees.find(item => item.nip === process.env.ST_E2E_SNAPSHOT_EMPLOYEE_NIP);
  assert(employee && Number.isInteger(Number(employee.id)), 'Exact reserved dummy employee absent.');
  const staff = await context();
  const staffLogin = await staff.newPage();
  await staffLogin.goto(`${base}/login`, { waitUntil: 'networkidle' });
  await staffLogin.locator('input[name=username]').fill(employee.nip);
  await staffLogin.locator('input[name=password]').fill(process.env.ST_E2E_EMPLOYEE_PASSWORD);
  const staffAuthenticated = staffLogin.waitForResponse(r => r.url().endsWith('/login') && r.request().method() === 'POST');
  await staffLogin.locator('button[type=submit]').click();
  assert.equal((await staffAuthenticated).status(), 200);
  await staffLogin.getByRole('button', { name: 'Lihat Notifikasi', exact: true }).waitFor({ timeout: 45000 });
  await staffLogin.close();
  const anonymous = await context();
  const publicPage = await anonymous.newPage();
  await publicPage.goto(`${base}/surat-tugas`, { waitUntil: 'networkidle' });
  assert.equal(await publicPage.evaluate(() => localStorage.getItem('bksda_user')), null);
  await publicPage.close();
  async function submit(departure, date, suffix) {
    const malformed = departure !== null && typeof departure === 'object';
    const payload = {
      maksud_tujuan: `${marker}-${suffix} disposable dummy record`, tempat_tujuan: 'Samarinda',
      tanggal_mulai: date, tanggal_selesai: date, sumber_dana: 'dipa', template_type: 'beda-hari',
      employees: [{ id: Number(employee.id), tanggal_mulai: date, tanggal_selesai: date }],
      menimbang: [{ id: 'dummy-m', text: 'Pengujian dummy lokal.' }],
      dasar: [{ id: 'dummy-d', text: 'Fixture dummy sekali pakai.' }],
      keterangan: `${marker}-${suffix}`, tanda_setuju: 'sudah',
      template_snapshot: { configuration: { show_departure_column: true, employee_departures: { [String(employee.id)]: departure },
        tembusan_items: malformed ? [null, { text: { dummy: 'shape' } }, 'DUMMY LEGACY VALID COPY'] : ['DUMMY VALID COPY'],
        untuk: malformed ? [null, { id: 'dummy-valid', text: 'DUMMY LEGACY VALID CLAUSE' }] : [],
      } },
    };
    // Anonymous actual HTTP submission; no cookies/tokens copied from the admin context.
    const response = await anonymous.request.post(`${apiBase}/surat-tugas/submit`, { data: payload, headers: { Accept: 'application/json' } });
    return { status: response.status(), body: await response.json() };
  }
  async function preview(id, suffix) {
    const tab = await admin.newPage();
    let pageErrors = 0;
    tab.on('pageerror', () => pageErrors++);
    await tab.goto(`${base}/kepegawaian/surat-tugas/builder/${encodeURIComponent(id)}`, { waitUntil: 'networkidle' });
    let rendered = false;
    try {
      await tab.waitForFunction(({ marker, suffix, name }) => {
        const preview = document.querySelector('#surat-preview-doc');
        const text = preview?.textContent.toLowerCase() || '';
        return text.includes(`${marker}-${suffix}`.toLowerCase()) && text.includes(name.toLowerCase());
      }, { marker, suffix, name: employee.nama_lengkap || employee.name }, { timeout: 20000 });
      rendered = await tab.locator('#surat-preview-doc').isVisible();
    } catch { /* bounded negative observation; errors are counted, never dumped */ }
    await tab.close();
    // Historically accepted data reaches the shared reader through a real publication
    // and recipient notification. A standalone admin without an Employee correctly
    // cannot use the personal endpoint, so it is not a valid positive control.
    const headers = { Accept: 'application/json', Origin: new URL(base).origin, Referer: `${base}/portal` };
    const xsrf = (await admin.cookies(apiBase)).find(cookie => cookie.name === 'XSRF-TOKEN');
    if (xsrf) headers['X-XSRF-TOKEN'] = decodeURIComponent(xsrf.value);
    const publication = await admin.request.put(`${apiBase}/surat-tugas/${encodeURIComponent(id)}/approve`, {
      data: { status: 'approved', nomor_surat: `DUMMY/SNAPSHOT/${id}` }, headers,
    });
    assert.equal(publication.status(), 200, 'Native publication control must succeed before testing the recipient reader.');
    const shared = await staff.newPage();
    shared.on('pageerror', () => pageErrors++);
    await shared.goto(`${base}/portal`, { waitUntil: 'networkidle' });
    await shared.getByRole('button', { name: 'Lihat Notifikasi', exact: true }).click();
    const notice = shared.locator('div.cursor-pointer')
      .filter({ has: shared.locator('p', { hasText: /^Surat Tugas Diterbitkan$/ }) })
      .filter({ hasText: new RegExp(`${marker}-${suffix}`, 'i') });
    await notice.first().waitFor();
    await notice.first().click();
    let sharedRendered = false;
    try {
      await shared.waitForFunction(({ marker, suffix }) => {
        const text = document.querySelector('#print-letter-area')?.textContent.toLowerCase() || '';
        return text.includes(`${marker}-${suffix}`.toLowerCase());
      }, { marker, suffix }, { timeout: 20000 });
      sharedRendered = await shared.locator('#print-letter-area').isVisible();
    } catch { /* independent actual shared-preview observation */ }
    await shared.close();
    return { pageErrors, rendered: rendered && sharedRendered, builderRendered: rendered, sharedRendered };
  }
  stage = 'positive control anonymous valid-string snapshot';
  const normal = await submit('Samarinda', '2099-12-27', 'control');
  assert.equal(normal.status, 201, 'Ordinary public submission must succeed.');
  assert(normal.body.data?.id);
  const control = await preview(normal.body.data.id, 'control');
  output('DIAGNOSTIC', 'valid-string control observation', control);
  assert.equal(control.pageErrors, 0, 'Ordinary actual Builder has page errors.');
  assert(control.rendered, 'Ordinary actual Builder/shared preview unavailable.');
  output('PASS', 'actual admin Builder renders anonymous valid-string control');
  stage = 'minimal malformed public snapshot';
  const malformed = await submit({ dummy: 'shape' }, '2099-12-28', 'malformed');
  if (malformed.status === 422) {
    const keys = Object.keys(malformed.body.errors || {});
    if (keys.some(key => key.startsWith('template_snapshot'))) {
      output('PASS', 'malformed snapshot rejected with nested validation', { httpStatus: 422 });
      return;
    }
    output('INCONCLUSIVE', '422 did not establish snapshot-shape rejection');
    process.exitCode = 2;
    return;
  }
  assert.equal(malformed.status, 201, `Native baseline must accept the snapshot before a renderer result is interpreted; observed ${malformed.status}.`);
  const id = malformed.body.data?.id;
  assert(id);
  stage = 'actual admin Builder opens accepted anonymous malformed record';
  const saved = await api(page, `${apiBase}/surat-tugas/${encodeURIComponent(id)}`);
  assert.equal(saved.status, 200);
  assert.equal(saved.body.data.status, 'pending');
  assert.equal(saved.body.data.template_type, 'beda-hari');
  const retained = saved.body.data.template_snapshot?.configuration?.employee_departures?.[String(employee.id)];
  const result = await preview(id, 'malformed');
  if (result.pageErrors || !result.rendered) {
    output('FAIL', 'accepted public snapshot prevents actual admin Builder preview', { httpStatus: 201, pageErrors: result.pageErrors, rendered: result.rendered, malformedShapeRetained: typeof retained === 'object' && retained !== null });
    process.exitCode = 1;
  } else {
    output('PASS', 'accepted public snapshot safely renders actual admin Builder', { pageErrors: 0, rendered: true });
  }
  // No approval, persistence beyond disposable database, or further malformed records.
}

const deadline = setTimeout(() => { output('INCONCLUSIVE', 'wall-clock limit', { stage }); process.exit(2); }, 240000);
main().catch(error => {
  output('INCONCLUSIVE', 'fixture check interrupted', { stage, type: error.name, reason: error.message.split('\n')[0].slice(0, 200) });
  process.exitCode = 2;
}).finally(async () => { await browser?.close(); clearTimeout(deadline); });
