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
// Inert markup-looking text only: no script, executable URL, handler or network payload.
const printMarker = `${marker} <audit-st12-marker title="inert">literal & \"quoted\"</audit-st12-marker>`;
const sinkMarkers = ['MAKSUD', 'MENIMBANG', 'DASAR', 'TEMBUSAN'].map(field => `${marker}-${field}`);
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
  // The trusted runner enforces network:none. Do not install Playwright routing:
  // it disables the native HTTP cache used by cloned print-window images.
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
  actor.token = await page.evaluate(() => localStorage.getItem('bksda_token'));
  report('PASS', `${label}: real UI login`);
  return actor;
}

async function api(actor, path, method = 'GET', body) {
  const headers = { Accept: 'application/json', Origin: new URL(base).origin, Referer: `${base}/portal` };
  if (actor.token) headers.Authorization = `Bearer ${actor.token}`;
  const xsrf = (await actor.context.cookies(actor.apiBase)).find(cookie => cookie.name === 'XSRF-TOKEN');
  if (xsrf) headers['X-XSRF-TOKEN'] = decodeURIComponent(xsrf.value);
  const response = await actor.context.request.fetch(`${actor.apiBase}${path}`, {
    method, headers, ...(body !== undefined ? { data: body } : {}),
  });
  return { status: response.status(), json: await response.json().catch(() => ({})) };
}

async function listContains(actor, expected) {
  const response = await api(actor, `/surat-tugas/my?search=${encodeURIComponent(marker)}`);
  assert.equal(response.status, 200, `${actor.label}: personal list failed.`);
  assert.equal(response.json.data.some(item => item.id === letterId), expected);
}

async function openMarkedInboxRow() {
  stage = 'locate marked inbox row';
  // The responsive row can truncate its subject to zero width. Its personnel span
  // is a visible child of the same real click handler; use a normal pointer click.
  const subject = admin.page.locator('span[title]')
    .filter({ hasText: new RegExp(marker, 'i') }).filter({ hasText: /dummy sandbox/i });
  await subject.waitFor({ state: 'attached' });
  const personnel = subject.locator('../..').locator('span[title]').first();
  await personnel.scrollIntoViewIfNeeded();
  const geometry = await personnel.evaluate(el => {
    const rect = el.getBoundingClientRect();
    const target = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
    return { tag: el.tagName, width: Math.round(rect.width), height: Math.round(rect.height), hitInside: Boolean(target && el.contains(target)) };
  });
  report('DIAGNOSTIC', 'marked row normal-click target', geometry);
  stage = 'click visible marked row personnel';
  await personnel.click();
}

async function checkNativePrint(actor, button, path) {
  stage = `${path}: actual UI native print`;
  const headerControl = await actor.context.request.get(`${base}/header-st.png`);
  report('DIAGNOSTIC', `${path}: static kop control`, { status: headerControl.status(), bytes: (await headerControl.body()).length });
  assert.equal(headerControl.status(), 200, 'The disposable app must serve its real letterhead.');
  const resourceLog = [];
  const relevant = request => new URL(request.url()).pathname === '/header-st.png';
  const requested = request => { if (relevant(request)) resourceLog.push({ event: 'request', type: request.resourceType() }); };
  const failed = request => { if (relevant(request)) resourceLog.push({ event: 'failed', reason: request.failure()?.errorText }); };
  const responded = response => { if (relevant(response.request())) resourceLog.push({ event: 'response', status: response.status() }); };
  actor.context.on('request', requested);
  actor.context.on('requestfailed', failed);
  actor.context.on('response', responded);
  // Observe the actual application-created popup and forward its native print call.
  // No document methods or HTML are replaced; this is telemetry, not a print stub.
  await actor.page.evaluate(expected => {
    const owner = window;
    const originalOpen = owner.open;
    owner.__st12NativePrint = { calls: 0, returns: 0, literal: false, elementCreated: false, textFieldsPresent: false };
    owner.__st12RestoreOpen = () => { owner.open = originalOpen; };
    owner.open = function (...args) {
      const popup = Reflect.apply(originalOpen, this, args);
      if (!popup) return popup;
      const nativePrint = popup.print;
      popup.print = function (...args) {
        const evidence = owner.__st12NativePrint;
        evidence.calls++;
        evidence.literal = popup.document.body.textContent.includes(expected);
        evidence.elementCreated = Boolean(popup.document.querySelector('audit-st12-marker'));
        evidence.textFieldsPresent = owner.__st12ExpectedFields.every(text => popup.document.body.textContent.toLowerCase().includes(text.toLowerCase()));
        const result = Reflect.apply(nativePrint, this, args);
        evidence.returns++;
        return result;
      };
      return popup;
    };
  }, printMarker);
  await actor.page.evaluate(fields => { window.__st12ExpectedFields = fields; }, sinkMarkers);
  let popup;
  try {
    const opened = actor.page.waitForEvent('popup', { timeout: 20000 });
    await button.click();
    popup = await opened;
    try {
      await actor.page.waitForFunction(() => window.__st12NativePrint?.returns >= 1, null, { timeout: 20000 });
    } catch (error) {
      report('DIAGNOSTIC', `${path}: native print observation`, await actor.page.evaluate(() => window.__st12NativePrint));
      report('DIAGNOSTIC', `${path}: image requests`, resourceLog);
      if (popup && !popup.isClosed()) report('DIAGNOSTIC', `${path}: actual popup state`, await popup.evaluate(expected => ({
        ready: document.readyState, base: document.baseURI, visibility: document.visibilityState, literal: document.body.textContent.includes(expected),
        images: [...document.images].map(image => ({ complete: image.complete, width: image.naturalWidth, loading: image.loading, src: image.getAttribute('src') })),
      }), printMarker));
      throw error;
    }
    const evidence = await actor.page.evaluate(() => window.__st12NativePrint);
    assert.equal(evidence.calls, 1, `${path}: actual application did not call native print.`);
    assert.equal(evidence.returns, 1, `${path}: native print did not return.`);
    assert(evidence.literal, `${path}: persisted inert text missing from actual print popup.`);
    assert(!evidence.elementCreated, `${path}: inert text became a DOM element.`);
    assert(evidence.textFieldsPresent, `${path}: a stored text field is missing from actual print output.`);
    report('PASS', `ST12 ${path}: actual popup and native print preserve persisted inert text`, evidence);
  } finally {
    actor.context.off('request', requested);
    actor.context.off('requestfailed', failed);
    actor.context.off('response', responded);
    await actor.page.evaluate(() => { window.__st12RestoreOpen?.(); delete window.__st12RestoreOpen; }).catch(() => {});
    if (popup && !popup.isClosed()) await popup.close();
  }
}

async function main() {
  browser = await chromium.launch({
    ...(process.env.ST_E2E_CHROMIUM_EXECUTABLE ? { executablePath: process.env.ST_E2E_CHROMIUM_EXECUTABLE } : { channel: 'chrome' }),
    headless: true,
    args: ['--disable-dev-shm-usage'],
  });

  admin = await openActor(process.env.ST_E2E_ADMIN_USERNAME, process.env.ST_E2E_ADMIN_PASSWORD, 'admin');
  // Compile the actual dev routes before retaining form state across tabs.
  // Next Fast Refresh can otherwise reload every open page when a new route compiles.
  for (const path of ['/surat-tugas', '/kepegawaian/surat-tugas/inbox',
    '/kepegawaian/surat-tugas/builder/00000000-0000-4000-8000-000000000000',
    '/portal/surat-tugas/00000000-0000-4000-8000-000000000000']) {
    const warmed = await admin.context.request.get(`${base}${path}`, { timeout: 45000 });
    assert.equal(warmed.status(), 200, 'Actual dummy route did not compile.');
  }
  await admin.page.goto(`${base}/portal`, { waitUntil: 'networkidle', timeout: 45000 });
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
    // Keep each isolated login session, with no idle portal renderer or polling.
    await actor.page.close();
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
  // Anonymous catalog masks NIP; search the name actually visible to this actor.
  await search.fill(candidates[0].name || candidates[0].nama_lengkap);
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
    await search.fill('');
    await search.fill(employee.name || employee.nama_lengkap);
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
  await publicContext.close();

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
  await openMarkedInboxRow();
  stage = 'open reader Builder action';
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
  assert(payload.maksud_tujuan.toLowerCase().includes(marker.toLowerCase()));
  assert(payload.template_snapshot?.configuration);
  assert(payload.menimbang?.length && payload.dasar?.length);
  const fromBuilder = await api(admin, `/surat-tugas/${letterId}`);
  for (const field of ['maksud_tujuan', 'tempat_tujuan', 'sumber_dana', 'menimbang', 'dasar']) {
    assert.deepEqual(fromBuilder.json.data[field], payload[field], `Canonical ${field} differs from Builder payload.`);
  }
  // Exercise a persisted renderer-text field through the real update endpoint. The
  // Builder exposes no penutup editor; keep its other canonical payload unchanged.
  payload.template_snapshot.configuration.penutup_text = printMarker;
  const inert = text => `${text} <audit-st12-marker>literal</audit-st12-marker>`;
  payload.maksud_tujuan = payload.maksud_tujuan.replace(new RegExp(marker, 'i'), match => `${match} ${inert(sinkMarkers[0])}`);
  payload.menimbang[0].text += ` ${inert(sinkMarkers[1])}`;
  payload.dasar[0].text += ` ${inert(sinkMarkers[2])}`;
  payload.tembusan = [inert(sinkMarkers[3])];
  // This supported type preserves its stored snapshot during native edit hydration;
  // the default template reconciliation otherwise replaces penutup with its catalog.
  payload.template_type = 'beda-hari';
  const marked = await api(admin, `/surat-tugas/${letterId}`, 'PUT', payload);
  assert.equal(marked.status, 200);
  const canonical = await api(admin, `/surat-tugas/${letterId}`);
  assert.equal(canonical.json.data.template_snapshot.configuration.penutup_text, printMarker);
  assert.equal(canonical.json.data.status, 'pending');
  assert.equal(canonical.json.data.nomor_surat, number);
  for (const field of ['tempat_tujuan', 'sumber_dana']) assert.deepEqual(canonical.json.data[field], payload[field]);
  for (const [text, expected] of [[canonical.json.data.maksud_tujuan, sinkMarkers[0]],
    [canonical.json.data.menimbang[0].text, sinkMarkers[1]], [canonical.json.data.dasar[0].text, sinkMarkers[2]],
    [canonical.json.data.tembusan[0], sinkMarkers[3]]]) {
    assert(text.includes(expected));
    assert(!text.includes('<audit-st12-marker>'), 'Validated native writer must sanitize these four text fields.');
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
  const builderPreview = admin.page.locator('#surat-preview-doc');
  assert((await builderPreview.innerText()).includes(printMarker));
  for (const text of sinkMarkers) assert((await builderPreview.innerText()).toLowerCase().includes(text.toLowerCase()));
  assert.equal(await builderPreview.locator('audit-st12-marker').count(), 0);
  await checkNativePrint(admin, admin.page.getByRole('button', { name: 'Preview Cetak', exact: true }), 'Builder printSuratTugas');

  stage = 'cancel then confirm publication in inbox';
  await admin.page.goto(`${base}/kepegawaian/surat-tugas/inbox`, { waitUntil: 'networkidle', timeout: 45000 });
  await admin.page.getByPlaceholder('Cari nomor surat, maksud perjalanan, nama pegawai, atau tujuan...').fill(marker);
  await openMarkedInboxRow();
  stage = 'open publication confirmation';
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
  await admin.page.close();

  for (const actor of staff.slice(0, 2)) {
    await listContains(actor, true);
    const detail = await api(actor, `/surat-tugas/my/${letterId}`);
    assert.equal(detail.status, 200);
    assert.equal(detail.json.data.status, 'approved');
    stage = `${actor.label}: notification and preview`;
    actor.page = await actor.context.newPage();
    actor.page.on('pageerror', () => errors.push(actor.label));
    await actor.page.goto(`${base}/portal`, { waitUntil: 'networkidle', timeout: 45000 });
    await actor.page.getByRole('button', { name: 'Lihat Notifikasi', exact: true }).click();
    const notice = actor.page.locator('div.cursor-pointer').filter({ has: actor.page.locator('p', { hasText: /^Surat Tugas Diterbitkan$/ }) }).filter({ hasText: marker });
    await notice.first().waitFor({ timeout: 15000 });
    await notice.first().click();
    await actor.page.locator('#print-letter-area').waitFor({ timeout: 20000 });
    const preview = await actor.page.locator('#print-letter-area').innerText();
    assert(preview.toLowerCase().includes(marker.toLowerCase()));
    assert(preview.includes(number));
    for (const employee of candidates.slice(0, 2)) assert(preview.includes(employee.name || employee.nama_lengkap));
    assert(preview.includes(printMarker));
    for (const text of sinkMarkers) assert(preview.toLowerCase().includes(text.toLowerCase()));
    assert.equal(await actor.page.locator('#print-letter-area audit-st12-marker').count(), 0);
    report('PASS', `${actor.label}: issued list, notification click, actual formal preview`);
    if (actor === staff[0]) {
      await checkNativePrint(actor, actor.page.getByRole('button', { name: 'Cetak Surat Tugas (A4)', exact: true }), 'shared SuratTugasLetterPreview');
    }
    await actor.page.close();
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

main().catch(async error => {
  // Omit call logs and redact credentials/NIPs from the diagnostic line.
  let message = error.message.slice(0, 3500).replace(/\b\d{18}\b/g, '[employee]');
  for (const key of ['ST_E2E_ADMIN_PASSWORD', 'ST_E2E_EMPLOYEE_PASSWORD']) {
    if (process.env[key]) message = message.split(process.env[key]).join('[redacted]');
  }
  report('FAIL', 'flow interrupted', { stage, type: error.name, message });
  if (admin?.page && !admin.page.isClosed()) {
    const text = await admin.page.locator('body').innerText().catch(() => 'Dummy page unavailable');
    report('DIAGNOSTIC', 'dummy admin UI', text.replace(/\b\d{18}\b/g, '[employee]').slice(0, 4000));
  }
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
