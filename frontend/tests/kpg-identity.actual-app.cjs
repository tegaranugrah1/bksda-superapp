'use strict';
// Author-only fixture: trusted runner must enforce the stated OS sandbox before execution.
const assert = require('node:assert/strict');
assert.equal(process.env.ST_E2E_SANDBOX, 'disposable-network-none');
assert.equal(process.env.ST_E2E_ALLOW_WRITE, '1');
const base = process.env.ST_E2E_URL;
const hosts = new Set(['localhost', '127.0.0.1', '[::1]']);
const origin = new URL(base);
assert(hosts.has(origin.hostname) && origin.protocol === 'http:' && !origin.username && !origin.password);
assert(/^dummy-/.test(process.env.ST_E2E_ADMIN_USERNAME || ''));
assert.equal(process.env.ST_E2E_READER_USERNAME, '900000000000000003');
for (const key of ['ST_E2E_ADMIN_PASSWORD', 'ST_E2E_EMPLOYEE_PASSWORD']) assert((process.env[key] || '').startsWith('Dummy'));
assert(process.env.ST_E2E_CHROMIUM_EXECUTABLE, 'Supply the installed sandbox Chromium path.');
const { chromium } = require('playwright');
const sentinel = 'DUMMY_TRASH_PRIVATE_ROW';
let browser, cdp, first, stage = 'launch', frozen = false;
const output = (status, check, detail = {}) => console.log(JSON.stringify({ status, check, ...detail }));

async function login(page, username, password, navigate = true) {
  if (navigate) await page.goto(`${base}/login`, { waitUntil: 'networkidle' });
  await page.locator('input[name=username]').fill(username);
  await page.locator('input[name=password]').fill(password);
  const pending = page.waitForResponse(r => r.url().endsWith('/login') && r.request().method() === 'POST');
  await page.locator('button[type=submit]').click();
  const response = await pending;
  assert.equal(response.status(), 200, 'Dummy UI login failed.');
  const apiBase = response.url().slice(0, -'/login'.length);
  assert(hosts.has(new URL(apiBase).hostname));
  await page.getByRole('button', { name: 'Lihat Notifikasi', exact: true }).waitFor({ timeout: 45000 });
  assert.equal(new URL(page.url()).pathname, '/portal');
  return apiBase;
}

// Uses only the login-created session, without exporting or replacing credentials.
async function get(page, url) {
  return page.evaluate(async url => {
    const headers = { Accept: 'application/json' };
    const token = localStorage.getItem('bksda_token');
    if (token) headers.Authorization = `Bearer ${token}`;
    const response = await fetch(url, { headers, credentials: 'include' });
    const body = await response.json();
    const user = JSON.parse(localStorage.getItem('bksda_user') || 'null');
    return { status: response.status, rows: body.data, role: user?.role, username: user?.username, modules: user?.access_modules };
  }, url);
}

async function main() {
  browser = await chromium.launch({ executablePath: process.env.ST_E2E_CHROMIUM_EXECUTABLE, headless: true, args: ['--disable-dev-shm-usage'] });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, serviceWorkers: 'block' });
  await context.route('**/*', route => hosts.has(new URL(route.request().url()).hostname) ? route.continue() : route.abort('blockedbyclient'));
  context.setDefaultTimeout(20000);
  context.setDefaultNavigationTimeout(45000);
  first = await context.newPage();
  stage = 'admin real UI login';
  const apiBase = await login(first, process.env.ST_E2E_ADMIN_USERNAME, process.env.ST_E2E_ADMIN_PASSWORD);
  // Warm actual routes before retaining state, so dev compilation does not confuse the schedule.
  for (const path of ['/kepegawaian', '/kepegawaian/employees?status=trashed']) assert.equal((await context.request.get(`${base}${path}`)).status(), 200);
  const second = await context.newPage();
  await second.goto(`${base}/kepegawaian`, { waitUntil: 'networkidle' });
  await second.getByRole('button', { name: 'Keluar Sistem', exact: true }).waitFor();
  stage = 'cache completed admin-only trash';
  await first.goto(`${base}/kepegawaian/employees?status=trashed`, { waitUntil: 'networkidle' });
  await first.locator('tbody tr').filter({ hasText: sentinel }).waitFor();
  const admin = await get(first, `${apiBase}/kepegawaian/employees?status=trashed`);
  assert.equal(admin.status, 200);
  assert(['admin', 'super_admin'].includes(admin.role));
  assert(admin.rows.some(row => row.nama_lengkap === sentinel));
  let navigations = 0;
  first.on('framenavigated', frame => { if (frame === first.mainFrame()) navigations++; });
  // Read-only DOM instrumentation records only booleans. A sample requires the actual
  // sidebar to have rendered the reader's role, not merely updated shared storage.
  await first.evaluate(({ sentinel, username }) => {
    window.__kpgAudit = { samples: 0, readerRendered: false, leaked: false };
    const sample = () => {
      const user = JSON.parse(localStorage.getItem('bksda_user') || 'null');
      const roleRendered = [...document.querySelectorAll('aside span')].some(el => el.textContent.trim().toLowerCase() === 'user');
      const reader = user?.username === username && user?.role === 'user' && roleRendered;
      const visible = [...document.querySelectorAll('tbody tr')].some(el => el.textContent.includes(sentinel) && el.getBoundingClientRect().height > 0 && getComputedStyle(el).visibility !== 'hidden');
      const result = window.__kpgAudit;
      result.samples++;
      result.readerRendered ||= reader;
      result.leaked ||= reader && visible;
    };
    new MutationObserver(sample).observe(document.body, { subtree: true, childList: true, attributes: true, characterData: true });
    const frame = () => { sample(); requestAnimationFrame(frame); };
    requestAnimationFrame(frame);
  }, { sentinel, username: process.env.ST_E2E_READER_USERNAME });
  stage = 'freeze first tab and switch second tab through real logout/login';
  await second.bringToFront();
  cdp = await context.newCDPSession(first);
  await cdp.send('Page.setWebLifecycleState', { state: 'frozen' });
  frozen = true;
  await second.getByRole('button', { name: 'Keluar Sistem', exact: true }).click();
  await second.getByRole('button', { name: 'Ya, Keluar', exact: true }).click();
  await second.waitForURL('**/login');
  await second.locator('input[name=username]').waitFor();
  await login(second, process.env.ST_E2E_READER_USERNAME, process.env.ST_E2E_EMPLOYEE_PASSWORD, false);
  stage = 'independent reader backend control';
  const reader = await get(second, `${apiBase}/kepegawaian/employees?status=trashed`);
  assert.equal(reader.status, 200);
  assert.equal(reader.role, 'user');
  assert.equal(reader.username, process.env.ST_E2E_READER_USERNAME);
  assert(reader.modules.includes('kepegawaian'));
  assert(Array.isArray(reader.rows));
  assert(!reader.rows.some(row => row.nama_lengkap === sentinel), 'Fresh reader response exposes the admin-only sentinel.');
  output('PASS', 'fresh reader backend omits admin-only deleted fixture');
  stage = 'resume actual first tab';
  await cdp.send('Page.setWebLifecycleState', { state: 'active' });
  frozen = false;
  await first.bringToFront();
  // A bounded observation window, without request delay, abort, mocking or forced auth events.
  await first.waitForTimeout(3000);
  const state = await first.evaluate(() => window.__kpgAudit || null).catch(() => null);
  if (state?.leaked) {
    output('FAIL', 'actual reader UI rendered prior-admin deleted employee', { navigations, readerRendered: state.readerRendered });
    process.exitCode = 1;
  } else if (navigations || !state?.readerRendered) {
    output('INCONCLUSIVE', 'retained reader-render schedule not observed', { navigations, instrumentationSurvived: Boolean(state), readerRendered: Boolean(state?.readerRendered) });
    process.exitCode = 2;
  } else {
    assert.equal(await first.locator('tbody tr').filter({ hasText: sentinel }).count(), 0);
    output('PASS', 'surviving reader tab does not render prior-admin deleted employee', { navigations, samples: state.samples });
  }
}

const deadline = setTimeout(() => { output('INCONCLUSIVE', 'wall-clock limit', { stage }); process.exit(2); }, 240000);
main().catch(error => {
  output('INCONCLUSIVE', 'fixture or lifecycle check interrupted', { stage, type: error.name, reason: error.message.split('\n')[0].slice(0, 200) });
  process.exitCode = 2;
}).finally(async () => {
  if (frozen && cdp) await cdp.send('Page.setWebLifecycleState', { state: 'active' }).catch(() => {});
  await browser?.close();
  clearTimeout(deadline);
});
