/* eslint-disable @typescript-eslint/no-require-imports -- Standalone integration check. */
// All API mutations are intercepted. No real profile, email, photo or password changes.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

async function main() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    let fixtureSignedIn = false;
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const person = { id: 999999, name: 'Pegawai Uji Profil', nip: '000000000000000001', position: 'Pengelola Data', department: 'Balai KSDA Kalimantan Timur', rank: 'Penata Muda (III/a)', email: 'profile@example.test', phone: '081100000001', photo: null, is_active: true };
    const user = { id: 999999, username: person.nip, name: 'Nama Akun Berbeda', email: person.email, role: 'pegawai', access_modules: ['kepegawaian'], permissions: [], employee: person };
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j0R0AAAAASUVORK5CYII=', 'base64');
    const contactPosts = [], photoPosts = [], passwordPosts = [], errors = [];
    let rejectContact = true, rejectPassword = true, meCalls = 0;
    let fixtureLeaves = [];
    let logoutCalls = 0, failLogout = false;
    await context.routeWebSocket('**/*', ws => {
      if (!new URL(ws.url()).pathname.startsWith('/app/')) { ws.close(); return; }
      ws.onMessage(raw => { const f = JSON.parse(raw); if (f.event === 'pusher:subscribe') ws.send(JSON.stringify({ event: 'pusher_internal:subscription_succeeded', channel: f.data.channel, data: '{}' })); });
      ws.send(JSON.stringify({ event: 'pusher:connection_established', data: JSON.stringify({ socket_id: '123.456', activity_timeout: 120 }) }));
    });
    await context.route('**/storage/fixture-profile.png', route => route.fulfill({ contentType: 'image/png', body: png }));
    await context.route('**/sanctum/csrf-cookie', route => route.fulfill({status:204}));
    await context.route('**/api/**', async route => {
      const request = route.request(), endpoint = new URL(request.url()).pathname;
      let body = { data: [] };
      if (new URL(route.request().url()).pathname.endsWith('/me') && !fixtureSignedIn) {await route.fulfill({status:401,contentType:'application/json',body:JSON.stringify({message:'Unauthenticated'})});return;}
      if (endpoint.endsWith('/login')) body = { data: (fixtureSignedIn = true, user), token: '42|local-profile-fixture' };
      else if (endpoint.endsWith('/me')) { meCalls++; body = { data: user, realtime_token: '42|local-cookie-fixture' }; }
      else if (endpoint.endsWith('/logout')) {
        logoutCalls++;
        if (failLogout) { await route.fulfill({status:500,contentType:'application/json',body:JSON.stringify({message:'Fixture logout unavailable'})}); return; }
        fixtureSignedIn = false; body = {message:'Logged out'};
      }
      else if (endpoint.endsWith('/broadcasting/auth')) body = { auth: 'fixture:signature' };
      else if (endpoint.endsWith('/mobile/dashboard')) body = { data: { profile: user, summary: {}, notifications: [], urgent_tax_vehicles: [] } };
      else if (endpoint.endsWith('/me/leave-requests')) body = {data:fixtureLeaves};
      else if (endpoint.endsWith('/me/leave-balance')) body = { data: { sisa_cuti_tersedia: 0 } };
      else if (endpoint.endsWith('/me/dashboard')) body = { data: { my_assets: [] } };
      else if (endpoint.endsWith('/me/update-profile')) {
        const payload = request.postDataJSON(); contactPosts.push(payload);
        if (rejectContact) { await route.fulfill({ status: 422, contentType: 'application/json', body: JSON.stringify({ errors: { current_password: ['Kata sandi konfirmasi tidak sesuai.'] } }) }); return; }
        await new Promise(resolve => setTimeout(resolve, 150));
        user.email = payload.email; person.email = payload.email; person.phone = payload.phone;
        body = { message: 'Profil kontak berhasil diperbarui. Tautan verifikasi telah dikirim ke email baru Anda.', email_changed: true };
      } else if (endpoint.endsWith('/me/update-photo')) {
        photoPosts.push(request.postDataBuffer());
        person.photo = '/storage/fixture-profile.png'; body = { photo: person.photo, message: 'Foto profil berhasil diperbarui.' };
      } else if (endpoint.endsWith('/me/change-password')) {
        passwordPosts.push(request.postDataJSON());
        if (rejectPassword) { await route.fulfill({ status: 422, contentType: 'application/json', body: JSON.stringify({ errors: { current_password: ['Kata sandi saat ini tidak sesuai.'] } }) }); return; }
        await new Promise(resolve => setTimeout(resolve, 150)); body = { message: 'Password berhasil diubah' };
      }
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
    });
    const page = await context.newPage();
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', message => { if (/Blocked aria-hidden|Unexpected text node/.test(message.text())) errors.push(message.text()); });
    const text = value => page.getByText(value, { exact: true });
    const button = value => page.getByRole('button', { name: value, exact: true });
    const close = async title => { await button(`Tutup ${title}`).click(); await page.waitForTimeout(300); };
    const out = path.resolve(__dirname, '../../scratch/profile'); fs.mkdirSync(out, { recursive: true });
    await page.goto(process.env.MOBILE_URL || 'http://localhost:8081', { waitUntil: 'networkidle' });
    await page.getByPlaceholder('Contoh: 19850412 201012 1 002').fill(user.username);
    await page.getByPlaceholder('••••••••••••').fill('fixture-password');
    await page.getByLabel('Masuk', { exact: true }).click();
    await text('Profil').click();
    await text(person.name).waitFor(); await text('0 Hari Kerja').waitFor();
    assert.equal(await text('Hubungi Subbag Tata Usaha (TU)').count(), 0);
    for (const dark of [false, true]) {
      if (dark) { await page.getByLabel('Aktifkan tema gelap', { exact: true }).click(); await page.waitForTimeout(800); }
      for (const [width, height] of [[360,844],[440,844],[800,360]]) {
        await page.setViewportSize({ width, height }); await page.waitForTimeout(200);
        await text('Profil Pegawai').scrollIntoViewIfNeeded();
        await page.screenshot({ path: path.join(out, `profile-${dark ? 'dark' : 'light'}-${width}.png`) });
      }
    }
    await page.setViewportSize({ width: 360, height: 844 });
    await button('Riwayat Surat Tugas & SPPD').click(); await text('Belum Ada Surat Tugas').waitFor(); await text('Profil').click();
    await button('Data Pangkat, Jabatan & Unit Kerja').click(); await text(person.rank).waitFor();
    await close('Data kepegawaian');
    await button('Edit informasi kontak').click();
    await page.getByRole('dialog').waitFor(); await page.screenshot({path:path.join(out,'contact-dark-360.png')});
    await page.getByLabel('Email profil', { exact: true }).fill('invalid'); await button('Simpan informasi kontak').click();
    await text('Gunakan alamat email aktif yang valid.').waitFor(); assert.equal(contactPosts.length, 0);
    await page.getByLabel('Email profil', { exact: true }).fill('updated@example.test'); await button('Simpan informasi kontak').click();
    await text('Isi kata sandi saat ini untuk mengonfirmasi perubahan email.').waitFor(); assert.equal(contactPosts.length, 0);
    await page.getByLabel('Nomor telepon profil', { exact: true }).fill('081100000002');
    await page.getByLabel('Kata sandi konfirmasi email', { exact: true }).fill('fixture-current-password');
    await button('Simpan informasi kontak').click(); await text('Kata sandi konfirmasi tidak sesuai.').waitFor();
    assert.equal(await page.getByLabel('Email profil', { exact: true }).inputValue(), 'updated@example.test');
    rejectContact = false; await button('Simpan informasi kontak').dblclick();
    await text('updated@example.test').waitFor(); await text('081100000002').waitFor();
    assert.equal(contactPosts.length, 2); assert.ok(meCalls >= 1);
    assert.deepEqual(Object.keys(contactPosts.at(-1)).sort(), ['current_password','email','phone']);
    await button('Edit informasi kontak').click();
    assert.equal(await page.getByLabel('Kata sandi konfirmasi email', { exact: true }).count(), 0);
    await close('Edit informasi kontak');
    await button('Ubah foto profil').click();
    let chooser = page.waitForEvent('filechooser'); await button('Pilih foto profil').click();
    await (await chooser).setFiles({ name: 'not-a-photo.svg', mimeType: 'image/svg+xml', buffer: Buffer.from('<svg/>') });
    await text('Pilih foto JPG, PNG atau WebP.').waitFor(); assert.equal(photoPosts.length, 0);
    chooser = page.waitForEvent('filechooser'); await button('Pilih foto profil').click();
    await (await chooser).setFiles({ name: 'profile.png', mimeType: 'image/png', buffer: png });
    await page.getByLabel('Pratinjau foto profil', { exact: true }).waitFor();
    await button('Simpan foto profil').click(); await text('Foto profil berhasil diperbarui.').waitFor();
    assert.equal(photoPosts.length, 1); assert.ok(photoPosts[0].includes(Buffer.from('name="foto"; filename="profile.png"'))); assert.ok(photoPosts[0].includes(png));
    await page.getByLabel(`Foto ${person.name}`, { exact: true }).waitFor();
    await button('Riwayat Surat Tugas & SPPD').click(); await text('Belum Ada Surat Tugas').waitFor();
    await text('Profil').click();
    await text('Foto profil berhasil diperbarui.').waitFor();
    await page.getByLabel(`Foto ${person.name}`, {exact:true}).waitFor();
    await button('Riwayat Pengajuan Cuti Online').click();
    assert.equal(await text('Formulir Pengajuan Cuti').count(), 0); await text('Tidak Ada Pengajuan Cuti').waitFor(); await text('Profil').click();
    // The leave year filter must survive switching between the profile and services views.
    fixtureLeaves = [
      {id:999991, jenis_cuti:'Cuti Tahunan', tanggal_mulai:'2025-11-03', tanggal_selesai:'2025-11-03', jumlah_hari:1, status:'PENGAJUAN', alasan_cuti:'Dummy archive 2025'},
      {id:999992, jenis_cuti:'Cuti Sakit', tanggal_mulai:'2026-11-03', tanggal_selesai:'2026-11-03', jumlah_hari:1, status:'PENGAJUAN', alasan_cuti:'Dummy archive 2026'},
    ];
    await button('Perbarui Data Profil').click();
    await button('Riwayat Pengajuan Cuti Online').click();
    await text('2025 (1)').click();
    await text('Cuti Tahunan').waitFor(); assert.equal(await text('Cuti Sakit').count(), 0);
    const selectedYearColor = await text('2025 (1)').evaluate(node => getComputedStyle(node).color);
    await text('Profil').click(); await button('Riwayat Pengajuan Cuti Online').click();
    await text('Cuti Tahunan').waitFor(); assert.equal(await text('Cuti Sakit').count(), 0);
    assert.equal(await text('2025 (1)').evaluate(node => getComputedStyle(node).color), selectedYearColor);
    await text('Profil').click(); fixtureLeaves = [];
    user.employee = null; const before = meCalls; await button('Perbarui Data Profil').click();
    await text('Akun belum terhubung dengan data pegawai').waitFor(); assert.ok(meCalls > before);
    await text('Tidak tersedia').waitFor(); assert.equal(await button('Ubah foto profil').isDisabled(), true);
    await button('Edit informasi kontak').click(); assert.equal(await page.getByLabel('Nomor telepon profil', { exact: true }).count(), 0); await close('Edit informasi kontak');
    user.employee = person; await button('Perbarui Data Profil').click(); await text(person.name).waitFor();
    await button('Keamanan Akun & Ubah Kata Sandi').click();
    await page.getByRole('dialog').waitFor(); await page.screenshot({path:path.join(out,'password-dark-360.png')});
    await button('Simpan kata sandi').click();
    await text('Kata sandi saat ini wajib diisi.').waitFor(); assert.equal(passwordPosts.length, 0);
    await page.getByLabel('Kata sandi saat ini', { exact: true }).fill('fixture-current-password');
    await page.getByLabel('Kata sandi baru', { exact: true }).fill('fixture-current-password');
    await page.getByLabel('Konfirmasi kata sandi baru', { exact: true }).fill('fixture-current-password');
    await button('Simpan kata sandi').click(); await text('Kata sandi baru harus berbeda dari kata sandi saat ini.').waitFor();
    await page.getByLabel('Kata sandi baru', { exact: true }).fill('fixture-next-password');
    await button('Simpan kata sandi').click(); await text('Konfirmasi kata sandi baru tidak cocok.').waitFor();
    await page.getByLabel('Konfirmasi kata sandi baru', { exact: true }).fill('fixture-next-password');
    await button('Simpan kata sandi').click(); await text('Kata sandi saat ini tidak sesuai.').waitFor();
    rejectPassword = false; await button('Simpan kata sandi').dblclick(); await text('Kata sandi berhasil diperbarui').waitFor();
    assert.equal(passwordPosts.length, 2);
    await page.keyboard.press('Escape');
    await page.getByLabel('Masuk', { exact: true }).waitFor();
    // Exercise the actual portal logout button, beyond the password-reset logout.
    for (const failed of [false, true]) {
      failLogout = failed;
      await page.getByPlaceholder('Contoh: 19850412 201012 1 002').fill(user.username);
      await page.getByPlaceholder('••••••••••••').fill('fixture-password');
      await page.getByLabel('Masuk', { exact: true }).click(); await text('Profil').click();
      const logoutButton = text('Keluar Akun (Logout)');
      const previousCalls = logoutCalls;
      await logoutButton.click();
      await text('Konfirmasi Logout').waitFor({ timeout: 3000 });
      await page.getByRole('dialog').waitFor();
      await button('Batal').click(); await page.waitForTimeout(300);
      assert.equal(logoutCalls, previousCalls, 'Cancel does not send logout');
      assert.equal(await page.evaluate(() => localStorage.getItem('auth_token')), null, 'Bearer tokens stay in memory while cancelling logout preserves the active UI');
      await logoutButton.click(); await page.getByRole('dialog').waitFor();
      await page.keyboard.press('Escape'); await page.waitForTimeout(300);
      assert.equal(await text('Konfirmasi Logout').count(), 0);
      assert.equal(logoutCalls, previousCalls, 'Escape keeps the current session');
      await logoutButton.click(); await page.getByRole('dialog').waitFor();
      await page.screenshot({path:path.join(out,`logout-${failed ? 'failure' : 'success'}.png`)});
      const contrast = await button('Ya, Keluar').evaluate(el => {
        const luminance = css => css.match(/\d+/g).slice(0,3).map(Number).map(v => {const s=v/255;return s<=0.04045?s/12.92:Math.pow((s+0.055)/1.055,2.4);}).reduce((sum,v,i)=>sum+v*[0.2126,0.7152,0.0722][i],0);
        const foreground=luminance(getComputedStyle(el.firstElementChild).color), background=luminance(getComputedStyle(el).backgroundColor);
        return (Math.max(foreground,background)+0.05)/(Math.min(foreground,background)+0.05);
      });
      assert.ok(contrast >= 4.5, 'The logout button text must remain readable in both themes');
      await button('Ya, Keluar').click(); await page.getByLabel('Masuk', { exact: true }).waitFor();
      assert.equal(logoutCalls, previousCalls + 1);
      assert.equal(await page.evaluate(() => localStorage.getItem('auth_token') === null), true, 'Logout always clears the stored token');
      await page.reload({waitUntil:'networkidle'}); await page.getByLabel('Masuk', { exact: true }).waitFor();
      assert.equal(await text('Profil Pegawai').count(), 0, 'Reload cannot restore a logged-out session');
    }
    assert.deepEqual(errors, []);
    console.log('PASS: profile identity/empty states, themes, employment data, contact validation/retry/double submit, password confirmation, multipart photo, leave history, non-employee account and password reset/logout, portal logout/cancel/Escape and cleanup/reload after API failure.');
  } finally { await browser.close(); }
}
main().catch(e => { console.error(e); process.exitCode = 1; });
