'use strict';
// Real UI + native HTTP + actual Reverb. Trusted run8 sandbox supplies all processes.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { spawnSync } = require('node:child_process');
const { chromium } = require('/frontend/node_modules/playwright');
assert.equal(process.env.ST_E2E_SANDBOX, 'disposable-network-none');
assert.equal(process.env.ST_E2E_ALLOW_WRITE, '1');
assert.equal(process.env.NOTIFICATION_E2E_CONTROL, 'dummy-loopback-only');
const base = process.env.ST_E2E_URL;
const hosts = new Set(['localhost', '127.0.0.1', '[::1]']);
assert(hosts.has(new URL(base).hostname) && new URL(base).protocol === 'http:');
assert(/^dummy-/.test(process.env.ST_E2E_ADMIN_USERNAME || ''));
const nips = (process.env.ST_E2E_EMPLOYEE_NIPS || '').split(',');
assert.equal(nips.length, 3);
assert(nips.every(nip => /^900\d{15}$/.test(nip)) && new Set(nips).size === 3);
for (const key of ['ST_E2E_ADMIN_PASSWORD', 'ST_E2E_EMPLOYEE_PASSWORD']) assert((process.env[key] || '').startsWith('Dummy'));
const section = process.env.NOTIFICATION_E2E_SECTION || 'all';
assert(['all', 'core', 'offline', 'identity'].includes(section));
const marker = `TEST-R8-NOTIFICATION-${Date.now()}`;
let browser, admin, reader, letterId, stage = 'launch';
const pageErrors = [];
const output = (status, check, detail = {}) => console.log(JSON.stringify({ status, check, ...detail }));
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
async function until(predicate, message, milliseconds = 20000) {
  const end = Date.now() + milliseconds;
  while (Date.now() < end) { if (await predicate()) return; await delay(150); }
  throw new Error(message);
}
function fixture(command, id) {
  assert(['rebroadcast', 'stop-reverb', 'start-reverb', 'stop-worker', 'start-worker'].includes(command));
  const args = ['/fixtures/notification-control.php', command];
  if (id !== undefined) { assert(Number.isSafeInteger(id) && id > 0); args.push(String(id)); }
  const result = spawnSync('php', args, { encoding: 'utf8', timeout: 12000 });
  assert.equal(result.status, 0, `Disposable control ${command} failed; inspect safe fixture logs.`);
}
async function uiLogin(page, username, password, goto = true) {
  if (goto) await page.goto(`${base}/login`, { waitUntil: 'networkidle', timeout: 60000 });
  output('DIAGNOSTIC','login document',{scripts:await page.locator('script[src]').count(),type:await page.evaluate(()=>document.contentType)});
  await page.waitForFunction(() => {const form=document.querySelector('form');return form && Object.keys(form).some(k=>k.startsWith('__reactProps'));},{timeout:30000});
  await page.locator('input[name=username]').fill(username);
  await page.locator('input[name=password]').fill(password);
  const pending = page.waitForResponse(r => r.url().endsWith('/login') && r.request().method() === 'POST');
  await page.locator('button[type=submit]').click();
  const response = await pending;
  assert.equal(response.status(), 200, 'Dummy UI login must succeed;credentials omitted.');
  const apiBase = response.url().slice(0, -'/login'.length);
  assert(hosts.has(new URL(apiBase).hostname));
  await page.getByRole('button', { name: 'Lihat Notifikasi', exact: true }).waitFor({ timeout: 60000 });
  assert.equal(new URL(page.url()).pathname, '/portal');
  return apiBase;
}
async function actor(username, label) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, serviceWorkers: 'block' });
  const page = await context.newPage();
  context.setDefaultTimeout(20000);
  const seen = [], subscriptions = [], disconnected = [];
  page.on('pageerror', error => {pageErrors.push(label);output('DIAGNOSTIC','browser error',{label,error:error.message.slice(0,220)});});
  page.on('console',m=>{if(m.type()==='error')output('DIAGNOSTIC','browser console',{label,message:m.text().slice(0,220)});});
  page.on('requestfailed',r=>output('DIAGNOSTIC','request failed',{path:new URL(r.url()).pathname,reason:r.failure()?.errorText}));
  page.on('response',response=>{if(response.status()>=400)output('DIAGNOSTIC','HTTP failure',{path:new URL(response.url()).pathname,status:response.status()});});
  page.on('websocket', socket => {
    socket.on('framereceived', frame => {
      try {
        const event = JSON.parse(String(frame.payload));
        if (event.event === 'pusher_internal:subscription_succeeded') subscriptions.push(true);
        if (event.event === 'notification.created') {
          const item = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
          if (Number.isSafeInteger(item?.id)) seen.push(item.id);
        }
      } catch { /* Only inspected application JSON frames count; never retain raw auth. */ }
    });
    socket.on('close', () => disconnected.push(true));
  });
  const password = label === 'admin' ? process.env.ST_E2E_ADMIN_PASSWORD : process.env.ST_E2E_EMPLOYEE_PASSWORD;
  const apiBase = await uiLogin(page, username, password);
  const token = await page.evaluate(() => localStorage.getItem('bksda_token'));
  return { context, page, apiBase, token, label, seen, subscriptions, disconnected };
}
async function api(who, path, method = 'GET', data) {
  const headers = { Accept: 'application/json', Origin: new URL(base).origin, Referer: `${base}/portal` };
  if (who.token) headers.Authorization = `Bearer ${who.token}`;
  const xsrf = (await who.context.cookies(who.apiBase)).find(c => c.name === 'XSRF-TOKEN');
  if (xsrf) headers['X-XSRF-TOKEN'] = decodeURIComponent(xsrf.value);
  const response = await who.context.request.fetch(who.apiBase + path, { method, headers, ...(data === undefined ? {} : { data }) });
  let body; try { body = await response.json(); } catch { body = {}; }
  return { status: response.status(), body };
}
const bell = () => reader.page.getByRole('button', { name: 'Lihat Notifikasi', exact: true, includeHidden: true });
async function countDB() {
  const result = await api(reader, '/portal/notifications?per_page=50');
  assert.equal(result.status, 200);
  return result.body;
}
async function assertBadge(message, timeout = 20000) {
  const expected = (await countDB()).meta.unread_count;
  await until(async () => (await bell().innerText()).trim() === (expected > 99 ? '99+' : expected ? String(expected) : ''), message, timeout);
  return expected;
}
async function history(filter = 'Semua') {
  const dialog = reader.page.getByRole('dialog').filter({ has: reader.page.getByRole('heading', { name: 'Riwayat Notifikasi', exact: true }) });
  if (!await dialog.isVisible()) {
    await bell().click();
    await reader.page.getByRole('button', { name: 'Lihat Semua Riwayat', exact: true }).click();
  }
  await dialog.getByRole('button', { name: new RegExp('^'+filter+'(?:\\s+\\d+)?$') }).click();
  return dialog;
}
async function closeHistory() {
  await reader.page.keyboard.press('Escape');
}
async function main() {
  browser = await chromium.launch({ executablePath: process.env.ST_E2E_CHROMIUM_EXECUTABLE, headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  admin = await actor(process.env.ST_E2E_ADMIN_USERNAME, 'admin');
  reader = await actor(nips[0], 'employee-A');
  await until(() => reader.subscriptions.length > 0, 'Actual Echo did not subscribe through native proxy/Reverb.', 30000);
  output('PASS', 'RV03/RV04: actual browser private subscription through native Reverb/proxy');
  const choices = await api(admin, '/kepegawaian/employees/select?limit=500');
  assert.equal(choices.status, 200);
  const choicesList = Array.isArray(choices.body.data) ? choices.body.data : choices.body;
  const employees = nips.map(nip => choicesList.find(item => item.nip === nip));
  assert(employees.every(Boolean), 'Only exact reserved dummy employees may be used.');
  await api(reader, '/portal/notifications/mark-all-read', 'POST');
  const payload = { status: 'pending', maksud_tujuan: marker, tempat_tujuan: 'Dummy notification location', tanggal_mulai: '2099-12-21', tanggal_selesai: '2099-12-21', sumber_dana: 'dipa', employees: employees.slice(0, 2).map(e => ({ id: e.id, peran: 'Anggota' })) };
  stage = 'native create and approve';
  const created = await api(admin, '/surat-tugas', 'POST', payload);
  assert.equal(created.status, 201, `Dummy letter creation failed ${created.status}`);
  letterId = String(created.body.data?.id || created.body.id);
  assert(/^[0-9a-f-]{36}$/i.test(letterId));
  const approved = await api(admin, `/surat-tugas/${letterId}/approve`, 'PUT', { ...payload, status: 'approved', nomor_surat: `DUMMY-R8-${Date.now()}` });
  assert.equal(approved.status, 200, `Dummy approval failed ${approved.status}`);
  let notice;
  await until(async () => { notice = (await countDB()).data.find(n => n.reference_id === letterId && n.title === 'Surat Tugas Diterbitkan'); return Boolean(notice); }, 'Assigned employee did not receive native stored approval.');
  await until(() => reader.seen.includes(notice.id), 'Actual private Reverb approval did not arrive.', 20000);
  await assertBadge('Initial badge differs from authoritative notification DB.');
  output('PASS', 'STN01: native approval/DB notification reaches exact private recipient');

  if (section === 'core' || section === 'all') {
    stage = 'duplicate native broadcast';
    fixture('rebroadcast', notice.id); fixture('rebroadcast', notice.id);
    await until(() => reader.seen.filter(id => id === notice.id).length >= 3, 'Exact duplicate native events did not arrive.');
    await assertBadge('PN01 duplicate native event inflated unread badge.', 5000);
    const dialog = await history('Belum Dibaca');
    await dialog.locator('p').filter({ hasText: marker }).first().waitFor();
    assert.equal(await dialog.getByText('Surat Tugas Diterbitkan', { exact: true }).count(), 1, 'Duplicate events duplicated history row.');
    await dialog.getByText('Surat Tugas Diterbitkan', { exact: true }).click();
    const preview = reader.page.locator('dialog[aria-labelledby="st-preview-title"]');
    await preview.waitFor({ state: 'visible' });
    assert((await preview.innerText()).includes(marker));
    await until(async () => (await countDB()).data.find(n => n.id === notice.id)?.read_at, 'History click did not persist read state.');
    output('PASS', 'PN01/PN02: duplicate delivery preserves count/history;normal history click marks read and opens real preview');
    stage = 'trash while actual preview open';
    assert.equal((await api(admin, `/surat-tugas/${letterId}`, 'DELETE')).status, 200);
    await preview.waitFor({ state: 'hidden', timeout: 20000 });
    assert([403, 404].includes((await api(reader, `/surat-tugas/my/${letterId}`)).status));
    const afterTrash = await countDB();
    assert(afterTrash.data.some(n => n.id === notice.id && n.read_at), 'Approval event history was deleted/rewritten.');
    assert(afterTrash.data.some(n => n.reference_id === letterId && n.title === 'Surat Tugas Dipindahkan ke Sampah'), 'Trash availability notice missing.');
    const old = await history('Sudah Dibaca');
    await old.locator('p').filter({ hasText: marker }).first().click();
    await reader.page.getByText(/tidak tersedia|tidak ditemukan|tidak dapat diakses/i).last().waitFor();
    assert.equal(await preview.isVisible(), false, 'Old reference reopened stale approved preview.');
    output('PASS', 'STN03/STN04/PN06: trash closes open preview;old notification remains historical and no longer opens document');
    stage = 'restore and force delete';
    assert.equal((await api(admin, `/surat-tugas/${letterId}/restore`, 'POST')).status, 200);
    await until(async () => (await countDB()).data.some(n => n.reference_id === letterId && n.title === 'Surat Tugas Dipulihkan'), 'Restore notice missing.');
    const restored = await history();
    await restored.getByText('Surat Tugas Dipulihkan', { exact: true }).click();
    await preview.waitFor({ state: 'visible' });
    await reader.page.getByRole('button', { name: 'Tutup pratinjau Surat Tugas', exact: true }).click();
    assert.equal((await api(admin, `/surat-tugas/${letterId}`, 'DELETE')).status, 200);
    assert.equal((await api(admin, `/surat-tugas/${letterId}/force`, 'DELETE')).status, 200);
    assert([403, 404].includes((await api(reader, `/surat-tugas/my/${letterId}`)).status));
    const gone = await history();
    await gone.getByText('Surat Tugas Dipulihkan', { exact: true }).click();
    await reader.page.getByText(/tidak tersedia|tidak ditemukan|tidak dapat diakses/i).last().waitFor();
    assert.equal(await preview.isVisible(), false);
    output('PASS', 'STN05/STN06: restore reopens same authorized reference;force-deleted reference remains safely unavailable');
    const fullHistory = await history();
    const markAll = fullHistory.getByRole('button', { name: 'Tandai Semua Dibaca', exact: true });
    if (await markAll.isVisible()) await markAll.click();
    await until(async () => (await countDB()).meta.unread_count === 0, 'Read-all did not persist authoritative zero.');
    await assertBadge('Read-all badge did not reconcile with DB.');
    await fullHistory.getByRole('button', { name: 'Belum Dibaca', exact: true }).click();
    await fullHistory.getByText('Tidak ada notifikasi yang belum dibaca', { exact: true }).or(fullHistory.getByText('Belum ada riwayat notifikasi', { exact: true })).waitFor();
    await closeHistory();
    output('PASS', 'PN02: actual read-all and filtered history agree with native unread count');
    stage = 'ST-specific delayed native queue';
    fixture('stop-worker');
    await until(() => fs.existsSync('/scratch/worker.stop.done'), 'Named scratch worker did not stop.');
    const delayedMarker = `${marker}-DELAYED`;
    const delayedPayload = { ...payload, maksud_tujuan: delayedMarker, tanggal_mulai: '2099-12-24', tanggal_selesai: '2099-12-24' };
    const pendingDelayed = await api(admin, '/surat-tugas', 'POST', delayedPayload);
    assert.equal(pendingDelayed.status, 201);
    const delayedId = String(pendingDelayed.body.data?.id || pendingDelayed.body.id);
    assert.equal((await api(admin, `/surat-tugas/${delayedId}/approve`, 'PUT', { ...delayedPayload, status: 'approved', nomor_surat: 'DUMMY-DELAYED' })).status, 200);
    assert.equal((await api(admin, `/surat-tugas/${delayedId}`, 'DELETE')).status, 200);
    const delayedNotice = (await countDB()).data.find(n => n.reference_id === delayedId && n.title === 'Surat Tugas Diterbitkan');
    assert(delayedNotice);
    assert(!reader.seen.includes(delayedNotice.id), 'Worker pause must gate first delivery.');
    fixture('start-worker');
    await until(() => reader.seen.includes(delayedNotice.id), 'Delayed native approval did not arrive.');
    const delayedHistory = await history();
    await delayedHistory.locator('p').filter({ hasText: delayedMarker }).first().click();
    await reader.page.getByText(/tidak tersedia|tidak ditemukan|tidak dapat diakses/i).last().waitFor();
    assert.equal(await preview.isVisible(), false);
    assert.equal((await api(admin, `/surat-tugas/${delayedId}/restore`, 'POST')).status, 200);
    assert.equal((await api(reader, `/surat-tugas/my/${delayedId}`)).status, 200);
    output('PASS', 'STN10: first native queued approval arrives after trash but cannot reopen missing document;restore reauthorizes');

  }
  if (section === 'offline' || section === 'all') {
    stage = 'Reverb offline with API healthy';
    const disconnectedBefore = reader.disconnected.length;
    fixture('stop-reverb');
    await until(() => fs.existsSync('/scratch/reverb.stop.done'), 'Supervisor did not acknowledge Reverb stop.');
    await until(() => reader.disconnected.length > disconnectedBefore, 'Native Reverb connection did not close.');
    const pending = await api(admin, '/surat-tugas', 'POST', { ...payload, maksud_tujuan: `${marker}-OFFLINE`, tanggal_mulai: '2099-12-22', tanggal_selesai: '2099-12-22' });
    assert.equal(pending.status, 201, 'Offline native create status='+pending.status+' message='+String(pending.body.message||'').slice(0,120));
    const id = pending.body.data?.id || pending.body.id;
    const approvedOffline = await api(admin, `/surat-tugas/${id}/approve`, 'PUT', { ...payload, tanggal_mulai: '2099-12-22', tanggal_selesai: '2099-12-22', maksud_tujuan: `${marker}-OFFLINE`, status: 'approved', nomor_surat: `DUMMY-OFFLINE-${Date.now()}` });
    assert.equal(approvedOffline.status, 200, 'Offline native approve status='+approvedOffline.status+' message='+String(approvedOffline.body.message||'').slice(0,120));
    const before = reader.seen.length;
    await assertBadge('RV07 offline notification did not reach Portal via its normal poll.', 40000);
    assert.equal(reader.seen.length, before, 'Offline phase unexpectedly had realtime delivery.');
    const offlineHistory = await history();
    await offlineHistory.locator('p').filter({ hasText: `${marker}-OFFLINE` }).first().waitFor();
    await closeHistory();
    const subscriptionsBeforeRecovery = reader.subscriptions.length;
    fixture('start-reverb');
    await until(() => reader.subscriptions.length > subscriptionsBeforeRecovery, 'Native Echo did not resubscribe after daemon recovery.', 35000);
    const receivedBeforeRecovery = reader.seen.filter(value => value === notice.id).length;
    fixture('rebroadcast', notice.id);
    await until(() => reader.seen.filter(value => value === notice.id).length > receivedBeforeRecovery, 'Recovered native private channel did not deliver a new frame.', 10000);
    output('PASS', 'RV07/PN03: native API/notification storage remain healthy;35s visible-tab polling catches up while only Reverb is stopped');
  }
  if (section === 'identity' || section === 'all') {
    stage = 'supported two-tab account switch';
    // Preserve a genuinely existing A-only resource for the later foreign control,
    // even when the earlier core section has permanently deleted its first letter.
    const identityPayload = { ...payload, maksud_tujuan: `${marker}-IDENTITY`, tanggal_mulai: '2099-12-23', tanggal_selesai: '2099-12-23' };
    const identityCreated = await api(admin, '/surat-tugas', 'POST', identityPayload);
    assert.equal(identityCreated.status, 201);
    const identityId = String(identityCreated.body.data?.id || identityCreated.body.id);
    assert.equal((await api(admin, `/surat-tugas/${identityId}/approve`, 'PUT', { ...identityPayload, status: 'approved', nomor_surat: `DUMMY-IDENTITY-${Date.now()}` })).status, 200);
    assert.equal((await api(reader, `/surat-tugas/my/${identityId}`)).status, 200, 'Existing A-owned positive control must pass before switch.');
    const second = await reader.context.newPage();
    await second.goto(`${base}/portal`, { waitUntil: 'networkidle', timeout: 60000 });
    await second.locator('header button:has(svg.lucide-log-out)').click();
    await second.waitForURL('**/login', { timeout: 30000 });
    reader.apiBase = await uiLogin(second, nips[2], process.env.ST_E2E_EMPLOYEE_PASSWORD, false);
    await until(async () => {
      try { return await reader.page.evaluate(nip => JSON.parse(localStorage.getItem('bksda_user') || 'null')?.username === nip, nips[2]); } catch { return false; }
    }, 'Shared context did not complete actual C login.');
    await reader.page.getByRole('button', { name: 'Lihat Notifikasi', exact: true }).waitFor({ timeout: 45000 });
    reader.token = await reader.page.evaluate(() => localStorage.getItem('bksda_token'));
    const ownC = await countDB();
    assert(!ownC.data.some(n => n.message.includes(marker)), 'Current C notification API exposed A history.');
    assert([403, 404].includes((await api(reader, `/surat-tugas/my/${identityId}`)).status));
    assert.equal(await reader.page.locator('dialog[aria-labelledby="st-preview-title"]').isVisible(), false);
    await bell().click();
    assert(!(await reader.page.locator('body').innerText()).includes(marker), 'Old A private text survived the supported account switch.');
    output('PASS', 'PN04/PN05/PN06: real two-tab logout/login uses C identity and omits A data;foreign reference denied');
  }
  assert.deepEqual(pageErrors, []);
  output('PASS', 'actual-app notification phase completed', { section, pageErrors: 0 });
}
const timeout = setTimeout(() => { output('FAIL', 'bounded wall limit', { stage }); process.exit(1); }, 330000);
main().catch(error => { output('FAIL', 'actual-app notification check', { stage, type: error.name, reason: error.message.split('\n')[0].slice(0, 250) }); process.exitCode = 1; }).finally(async () => { await browser?.close(); clearTimeout(timeout); });
