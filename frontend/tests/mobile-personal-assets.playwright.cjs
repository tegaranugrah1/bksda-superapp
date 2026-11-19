/* eslint-disable @typescript-eslint/no-require-imports -- Standalone browser regression check. */
// Run with Expo web on port 8081: node frontend/tests/mobile-personal-assets.playwright.cjs
// All API and realtime traffic is isolated; no real account or BMN records are changed.
const assert = require('node:assert/strict');
const { chromium } = require('playwright');

async function main() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    let fixtureSignedIn = false;
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const user = {
      id: 999999, name: 'Pegawai Uji Aset', username: 'ui-assets', role: 'pegawai',
      access_modules: ['bmn'], permissions: [],
      employee: { id: 999999, nip: '000000000000000000', name: 'Pegawai Uji Aset', is_active: true },
    };
    const assigned = { id: 101, nama_barang: 'Laptop Tetap Uji', kode_barang: '3.10.01', nup: '1', kondisi: 'B' };
    const borrowed = { id: 102, nama_barang: 'GPS Pinjaman Uji', kode_barang: '3.05.01', nup: '2', kondisi: 'B' };
    // Asset ID is a string and loan ID deliberately equals the permanent asset ID.
    const loan = { ...borrowed, id: '102', loan_id: 101, status: 'dipinjam', loan_date: '2026-11-01', due_date: '2026-12-01' };
    let assets = [assigned, borrowed];
    let loans = [loan];
    let socket;
    let assetsRequests = 0;
    let loansRequests = 0;
    const errors = [];
    await context.routeWebSocket('**/*', ws => {
      if (!new URL(ws.url()).pathname.startsWith('/app/')) { ws.close(); return; }
      socket = ws;
      ws.onMessage(message => {
        const frame = JSON.parse(message);
        if (frame.event === 'pusher:subscribe') ws.send(JSON.stringify({
          event: 'pusher_internal:subscription_succeeded', channel: frame.data.channel, data: '{}',
        }));
      });
      ws.send(JSON.stringify({ event: 'pusher:connection_established',
        data: JSON.stringify({ socket_id: '123.456', activity_timeout: 120 }) }));
    });
    await context.route('**/sanctum/csrf-cookie', route => route.fulfill({status:204}));
    await context.route('**/api/**', async route => {
      const pathname = new URL(route.request().url()).pathname;
      let body = { data: [] };
      if (new URL(route.request().url()).pathname.endsWith('/me') && !fixtureSignedIn) {await route.fulfill({status:401,contentType:'application/json',body:JSON.stringify({message:'Unauthenticated'})});return;}
      if (pathname.endsWith('/login')) body = { data: (fixtureSignedIn = true, user), token: '42|local-assets-fixture' };
      else if (pathname.endsWith('/me')) body = { data: user, realtime_token: '42|local-cookie-fixture' };
      else if (pathname.endsWith('/broadcasting/auth')) body = { auth: 'fixture:signature' };
      else if (pathname.endsWith('/mobile/dashboard')) body = { data: {
        profile: user,
        // A stale nonzero summary must never replace a valid empty personal list.
        summary: { assigned_assets_count: 2, active_loans_count: 1 }, notifications: [], urgent_tax_vehicles: [],
      } };
      else if (pathname.endsWith('/me/assets')) { assetsRequests++; body = { data: assets }; }
      else if (pathname.endsWith('/me/dashboard')) { loansRequests++; body = { data: { my_assets: loans } }; }
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
    });
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    const text = value => page.getByText(value, { exact: true });
    const visible = async value => { await text(value).waitFor(); };
    const refresh = async (nextAssets, nextLoans) => {
      const beforeAssets = assetsRequests;
      const beforeLoans = loansRequests;
      assets = nextAssets;
      loans = nextLoans;
      assert.ok(socket, 'Private realtime connection is required');
      socket.send(JSON.stringify({ event: 'notification.created', channel: 'private-App.Models.User.999999.42', data: '{}' }));
      for (let attempt = 0; attempt < 50 && (assetsRequests <= beforeAssets || loansRequests <= beforeLoans); attempt++) {
        await page.waitForTimeout(100);
      }
      assert.ok(assetsRequests > beforeAssets && loansRequests > beforeLoans, 'Both personal datasets must refresh');
    };
    await page.goto(process.env.MOBILE_URL || 'http://localhost:8081', { waitUntil: 'networkidle' });
    await page.getByPlaceholder('Contoh: 19850412 201012 1 002').fill('ui-assets');
    await page.getByPlaceholder('••••••••••••').fill('fixture-password');
    await page.getByLabel('Masuk', { exact: true }).click();
    await visible('1 Barang');
    await page.getByLabel('Lihat profil pegawai', {exact:true}).click();
    await visible('1 Aset (1 Pinjaman)'); await text('Beranda').click();
    await visible('1 Barang');
    await text('Detail Pinjaman').click();
    const loanDialog = page.getByRole('dialog');
    await loanDialog.getByText('Pinjaman BMN Aktif', {exact:true}).waitFor();
    await loanDialog.getByText(borrowed.nama_barang, {exact:true}).waitFor();
    await loanDialog.getByText('Tutup', {exact:true}).click();
    await loanDialog.waitFor({state:'hidden'});
    await text('Layanan').click();
    await visible('Buka Daftar (1) ›');
    await text('Kalkulator Dinas (SBM)').click();
    const calculatorDialog = page.getByRole('dialog');
    await calculatorDialog.getByText('Rp 3.100.000', {exact:true}).waitFor();
    await calculatorDialog.getByText('Tutup Kalkulator', {exact:true}).click();
    await calculatorDialog.waitFor({state:'hidden'});
    await text('Aset Saya').click();
    await visible('Aset Tetap (1)');
    await visible('Pinjaman Berjalan (1)');
    await visible(assigned.nama_barang);
    assert.equal(await text(borrowed.nama_barang).count(), 0);
    // Filters and layout belong to the portal and must survive extracted-view unmounts.
    await page.getByLabel('Tampilan List', {exact:true}).click();
    await page.getByPlaceholder('Cari nama barang, merk, atau NUP...').fill(assigned.nama_barang);
    const category = text('IT & PC (1)');
    const inactiveCategoryColor = await category.evaluate(node => getComputedStyle(node).color);
    await category.click();
    const activeCategoryColor = await category.evaluate(node => getComputedStyle(node).color);
    assert.notEqual(activeCategoryColor, inactiveCategoryColor);
    await text('Profil').click(); await visible('1 Aset (1 Pinjaman)');
    await text('Layanan').click(); await text('Aset Saya').click();
    assert.equal(await page.getByPlaceholder('Cari nama barang, merk, atau NUP...').inputValue(), assigned.nama_barang);
    assert.equal(await text('IT & PC (1)').evaluate(node => getComputedStyle(node).color), activeCategoryColor);
    await visible(`${assigned.kode_barang} • NUP: ${assigned.nup}`);
    await page.getByPlaceholder('Cari nama barang, merk, atau NUP...').fill('');
    await text('Semua (1)').click();
    await page.getByLabel('Tampilan Grid', {exact:true}).click();
    await text('Pinjaman Berjalan (1)').click();
    await visible(borrowed.nama_barang);
    assert.equal(await text(assigned.nama_barang).count(), 0);
    await text('Profil').click();
    await visible('1 Aset (1 Pinjaman)');

    // Loan-only: a valid zero must not turn into summary data or sample assets.
    await refresh([borrowed], [loan]);
    await visible('0 Aset (1 Pinjaman)');
    await text('Beranda').click();
    await visible('0 Barang');
    await text('Aset Saya').click();
    await visible('Aset Tetap (0)');
    await visible('Tidak Ada Aset Ditemukan');

    // Returning an asset restores it to the permanent list without relogging.
    await refresh([assigned, borrowed], []);
    await visible('Aset Tetap (2)');
    await visible('Pinjaman Berjalan (0)');
    await visible(assigned.nama_barang);
    await visible(borrowed.nama_barang);
    await text('Pinjaman Berjalan (0)').click();
    await visible('Tidak Ada Pinjaman Aktif');

    // Truly empty account: all visible counts remain zero and no examples appear.
    await refresh([], []);
    await visible('Aset Tetap (0)');
    await text('Profil').click();
    await visible('0 Aset (0 Pinjaman)');
    await text('Beranda').click();
    await visible('0 Barang');
    assert.equal(await text('Pinjaman Aktif').count(), 0);
    await page.reload({ waitUntil: 'networkidle' });
    await visible('0 Barang');
    assert.equal(await text('Pinjaman Aktif').count(), 0);
    assert.deepEqual(errors, []);
    console.log('PASS: permanent/borrowed counts, numeric/string IDs, shared views, search/category/layout persistence, realtime return, empty state and reload.');
  } finally {
    await browser.close();
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
