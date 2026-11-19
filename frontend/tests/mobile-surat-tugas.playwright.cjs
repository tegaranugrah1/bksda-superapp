/* eslint-disable @typescript-eslint/no-require-imports -- Standalone integration check. */
// Run: node frontend/tests/mobile-surat-tugas.playwright.cjs (Expo web :8081).
// Requests, uploads, conflicts and submissions are isolated; real records are never changed.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

async function main() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const people = [
      { id: 101, name: 'Budi Uji', nip: '000000000000000001', department: 'SKW III Balikpapan', position: 'Kepala Seksi Wilayah III', seksi_wilayah: 'III', is_seksi: true },
      { id: 102, name: 'Ayu Uji', nip: '000000000000000002', department: 'Kantor Balai', position: 'Staf', is_seksi: false },
    ];
    const user = { id: 999999, name: 'Akun Uji SPT', username: 'ui-spt', role: 'pegawai', access_modules: ['kepegawaian'], permissions: [], employee: { id: 999999, nip: '000000000000000000', name: 'Akun Uji SPT' } };
    const types = [
      { id: 11, nama: 'Perjalanan Dinas Luar Wilayah', kode: 'luar_wilayah', mode_lokasi: 'luar_wilayah', aturan_durasi: 'fleksibel', default_sertakan_laporan: true },
      { id: 12, nama: 'Perjalanan Dinas Dalam Kawasan / Wilayah', kode: 'dalam_kawasan', mode_lokasi: 'dalam_kawasan', aturan_durasi: 'fleksibel', default_sertakan_laporan: true },
      { id: 13, nama: 'Melaksanakan Kegiatan (1 Hari)', kode: 'kegiatan_1_hari', mode_lokasi: 'tempat_saja', aturan_durasi: 'wajib_1_hari', default_sertakan_laporan: true },
      { id: 14, nama: 'Pengawasan / Pemeriksaan Pekerjaan', kode: 'jenis_kegiatan', mode_lokasi: 'luar_wilayah', aturan_durasi: 'fleksibel', default_sertakan_laporan: false, contoh_format: 'Melaksanakan Perjalanan Dinas dari {asal} ke {tujuan} untuk {kegiatan} dalam rangka {paket} di {tempat}' },
    ];
    const fundingNames = ["Program Mitra Aktif"];
    let setupCalls = 0;
    let conflict = false;
    let rejectSubmit = false;
    let conflictCalls = 0;
    const submissions = [];
    const errors = [];
    await context.routeWebSocket('ws://localhost:8080/**', ws => {
      ws.onMessage(message => { const frame = JSON.parse(message); if (frame.event === 'pusher:subscribe') ws.send(JSON.stringify({ event: 'pusher_internal:subscription_succeeded', channel: frame.data.channel, data: '{}' })); });
      ws.send(JSON.stringify({ event: 'pusher:connection_established', data: JSON.stringify({ socket_id: '123.456', activity_timeout: 120 }) }));
    });
    await context.route('**/api/**', async route => {
      const request = route.request();
      const endpoint = new URL(request.url()).pathname;
      let body = { data: [] };
      if (endpoint.endsWith('/login')) body = { data: user, token: '42|local-spt-fixture' };
      else if (endpoint.endsWith('/me')) body = { data: user };
      else if (endpoint.endsWith('/broadcasting/auth')) body = { auth: 'fixture:signature' };
      else if (endpoint.endsWith('/employees/select')) body = { data: people };
      else if (endpoint.endsWith('/st-task-types/public')) { setupCalls++; body = { data: types }; }
      else if (endpoint.endsWith('/st-expense-templates/public')) body = { data: fundingNames.map((name, index) => ({ id: index + 1, name })) };
      else if (endpoint.endsWith('/me/dashboard')) body = { data: { my_assets: [] } };
      else if (endpoint.endsWith('/mobile/dashboard')) body = { data: { profile: user, summary: {}, notifications: [], urgent_tax_vehicles: [] } };
      else if (endpoint.endsWith('/check-conflicts')) { conflictCalls++; body = { has_conflict: conflict, conflicts: conflict ? [{ employee_name: 'Ayu Uji, A.Md.Kom.', type: 'surat_tugas', range_formatted: '19 Nov 2026 s/d 23 Nov 2026', message: 'Ayu Uji, A.Md.Kom.: Ada Surat Tugas aktif pada 19 Nov 2026 s/d 23 Nov 2026.' }] : [] }; }
      else if (endpoint.endsWith('/surat-tugas/submit')) {
        const raw = request.postDataBuffer().toString();
        const boundary = request.headers()['content-type'].split('boundary=')[1];
        assert.ok(boundary, 'Browser must send a real multipart boundary');
        const fields = {};
        for (const part of raw.split(`--${boundary}`)) {
          const split = part.indexOf('\r\n\r\n');
          if (split < 0) continue;
          const name = part.slice(0, split).match(/name="([^"]+)"/)?.[1];
          if (name) fields[name] = part.slice(split + 4).replace(/\r\n$/, '');
        }
        submissions.push(fields);
        if (rejectSubmit) { await route.fulfill({ status: 422, contentType: 'application/json', body: JSON.stringify({ errors: { nama_kegiatan: ['Uraian perlu diperbaiki oleh pemohon.'] } }) }); return; }
        await new Promise(resolve => setTimeout(resolve, 150));
        body = { data: { id: 9001 }, message: 'Diterima' };
      }
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
    });
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if ((/Blocked aria-hidden|Unexpected text node|text strings must be rendered within/i).test(message.text())) errors.push(message.text()); });
    await page.goto(process.env.MOBILE_URL || 'http://localhost:8081', { waitUntil: 'networkidle' });
    await page.getByPlaceholder('Contoh: 19850412 201012 1 002').fill('ui-spt');
    await page.getByPlaceholder('••••••••••••').fill('fixture-password');
    await page.getByLabel('Masuk', { exact: true }).click();
    const form = page.getByTestId('assignment-form');
    const assertProgress = async step => {
      const track = await form.getByTestId('assignment-step-track').boundingBox();
      const progress = await form.getByTestId('assignment-step-progress').boundingBox();
      assert.ok(Math.abs(progress.width / track.width - (step - 1) / 2) < 0.01, `Step ${step} progress line`);
      if (step > 1) {
        const actual = await form.getByTestId('assignment-step-progress').evaluate(el => getComputedStyle(el).backgroundColor);
        const expected = await form.getByText(String(step), { exact: true }).evaluate(el => getComputedStyle(el.parentElement).backgroundColor);
        assert.equal(actual, expected, 'The progress line uses the active step color');
      }
    };
    const open = async () => { await page.getByLabel('Buka aksi cepat', { exact: true }).click(); await page.waitForTimeout(350); await page.getByText('Buat Surat Tugas (SPT) Baru', { exact: true }).click(); await form.getByLabel('Cari pegawai', { exact: true }).waitFor(); await page.waitForTimeout(400); assert.equal(await page.evaluate(() => !!document.activeElement?.closest('[aria-hidden="true"]')), false, 'Focus must not return to the hidden portal'); };
    const select = async name => { await form.getByLabel('Cari pegawai', { exact: true }).fill(name); await form.getByLabel(`Pilih ${name}`, { exact: true }).click(); };
    const choose = async (control, option) => { await form.getByLabel(control, { exact: true }).click(); await page.getByText(option, { exact: true }).last().click(); await page.waitForTimeout(350); };
    const baseDay = await page.evaluate(() => { const d = new Date(); return [d.getFullYear(), d.getMonth(), d.getDate()]; });
    const date = offset => new Date(baseDay[0], baseDay[1], baseDay[2] + offset, 12);
    const iso = offset => { const d = date(offset); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
    const setDate = async (control, offset) => {
      await form.getByRole('button', { name: control, exact: true }).click();
      const label = date(offset).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
      for (let i = 0; i < 3 && !await page.getByRole('button', { name: label, exact: true }).count(); i++) await page.getByLabel('Bulan berikutnya', { exact: true }).click();
      await page.getByRole('button', { name: label, exact: true }).click();
    };
    const out = path.resolve(__dirname, '../../scratch/spt-form'); fs.mkdirSync(out, { recursive: true });
    await open(); await assertProgress(1);
    for (const width of [360, 440]) { await page.setViewportSize({ width, height: 844 }); await page.screenshot({ path: path.join(out, `step1-light-${width}.png`) }); }
    await form.getByLabel('Aktifkan tema gelap', { exact: true }).click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(out, 'step1-dark.png') });
    await form.getByLabel('Aktifkan tema terang', { exact: true }).click();
    await select('Budi Uji'); await select('Ayu Uji');
    await form.getByRole('button', { name: 'Lanjutkan', exact: true }).click();
    await assertProgress(2);
    // Preview belongs to the detail card, before scheduling, rather than the footer.
    assert.equal(await form.getByText('Detail Surat Tugas', { exact: true }).evaluate(el => el.parentElement.textContent.includes('Pratinjau kalimat surat')), true);
    assert.equal(await form.getByText('Pratinjau kalimat surat', { exact: true }).evaluate(el => !!(el.compareDocumentPosition([...document.querySelectorAll('div')].find(node => node.textContent === 'Jadwal penugasan')) & Node.DOCUMENT_POSITION_FOLLOWING)), true);
    for (const label of ['Pilih pegawai', 'Detail tugas', 'Terkirim']) {
      const geometry = await form.getByText(label, { exact: true }).evaluate(el => {
        const label = el.getBoundingClientRect(), item = el.parentElement.getBoundingClientRect(), circle = el.previousElementSibling.getBoundingClientRect();
        return { label: label.x + label.width / 2, circle: circle.x + circle.width / 2, item: item.x + item.width / 2 };
      });
      assert.ok(Math.abs(geometry.label - geometry.item) < 1 && Math.abs(geometry.circle - geometry.item) < 1, `${label} must be centered`);
    }
    // Closing a task sheet must retain task content throughout the exit animation.
    for (const dismiss of ['button', 'escape']) {
      const trigger = form.getByLabel('Pilih jenis tugas', { exact: true });
      await trigger.click(); await page.getByRole('dialog').waitFor();
      if (dismiss === 'escape') await page.keyboard.press('Escape');
      else await page.getByLabel('Tutup pilihan', { exact: true }).click();
      assert.equal(await page.getByText('Pilih Sumber Dana', { exact: true }).count(), 0);
      await page.waitForTimeout(350);
      assert.equal(await trigger.evaluate(el => el === document.activeElement), true, 'Closing the picker returns focus to its trigger');
    }
    await form.getByRole('button', { name: 'Submit Pengajuan', exact: true }).click();
    await form.getByText('Nama kegiatan / maksud tugas minimal 5 karakter.', { exact: true }).waitFor();
    await choose('Pilih jenis tugas', 'Perjalanan Dinas Dalam Kawasan / Wilayah');
    assert.equal(await form.getByLabel('Kota / lokasi asal *', { exact: true }).count(), 0);
    await choose('Pilih jenis tugas', 'Pengawasan / Pemeriksaan Pekerjaan');
    await form.getByLabel('Kota / kabupaten tujuan *', { exact: true }).fill('Berau');
    await form.getByLabel('Paket / nama pekerjaan *', { exact: true }).fill('inventarisasi BMN dan GPS');
    await form.getByLabel('Jenis pengawasan / pemeriksaan *', { exact: true }).fill('pengawasan habitat');
    await form.getByLabel('Tempat spesifik', { exact: true }).fill('Hutan Lindung');
    for(const [width,height] of [[360,844],[440,844],[800,360]]) {
      await page.setViewportSize({width,height});await page.waitForTimeout(250);
      await form.getByText('Pengajuan Surat Tugas',{exact:true}).scrollIntoViewIfNeeded();
      const bounds=await form.getByRole('textbox').evaluateAll(nodes=>nodes.map(el=>{const r=el.getBoundingClientRect();return {x:r.x,right:r.right};}));
      assert.ok(bounds.every(r=>r.x>=0&&r.right<=width+1));
      await page.screenshot({path:path.join(out,`step2-light-${width}.png`)});
    }
    await page.setViewportSize({width:360,height:844});
    await form.getByLabel('Aktifkan tema gelap',{exact:true}).click();await page.waitForTimeout(800);
    await form.getByText('Pengajuan Surat Tugas',{exact:true}).scrollIntoViewIfNeeded();
    await page.screenshot({path:path.join(out,'step2-dark-360.png')});
    await form.getByLabel('Aktifkan tema terang',{exact:true}).click();await page.waitForTimeout(800);
    assert.equal(await form.getByLabel('Jadwal personel berbeda hari', { exact: true }).isDisabled(), true, 'Set the main period before enabling individual schedules');
    await setDate('Sampai tanggal *', 1);
    for (const control of ['Mulai tanggal *', 'Sampai tanggal *']) {
      assert.match(await form.getByLabel(control, { exact: true }).textContent(), new RegExp(date(1).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })), 'Choosing the main end first initializes a valid one-day period');
    }
    await setDate('Mulai tanggal *', 0); await setDate('Sampai tanggal *', 1);
    await form.getByLabel('Jadwal personel berbeda hari', { exact: true }).click();
    const calendarDay = async offset => {
      const label = date(offset).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
      const day = page.getByRole('button', { name: label, exact: true });
      if (!await day.count()) await page.getByLabel(offset < 0 ? 'Bulan sebelumnya' : 'Bulan berikutnya', { exact: true }).click();
      return day;
    };
    for (const control of ['Mulai — Budi Uji', 'Selesai — Budi Uji', 'Mulai — Ayu Uji', 'Selesai — Ayu Uji']) {
      await form.getByLabel(control, { exact: true }).click();
      assert.equal(await (await calendarDay(-1)).isDisabled(), true, 'Before the main period is unavailable');
      await page.getByLabel('Tutup kalender', { exact: true }).click(); await page.waitForTimeout(300);
      await form.getByLabel(control, { exact: true }).click();
      assert.equal(await (await calendarDay(2)).isDisabled(), true, 'After the main period is unavailable');
      assert.equal(await page.getByRole('button', { name: '+3 Hari', exact: true }).isDisabled(), true, 'Quick dates use the same bounds');
      await page.getByLabel('Tutup kalender', { exact: true }).click(); await page.waitForTimeout(300);
    }
    await setDate('Mulai — Budi Uji', 1);
    assert.match(await form.getByLabel('Selesai — Budi Uji', { exact: true }).textContent(), new RegExp(date(1).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })));
    await form.getByLabel('Selesai — Budi Uji', { exact: true }).click();
    assert.equal(await (await calendarDay(0)).isDisabled(), true, 'A personal end cannot precede that personal start');
    await page.getByLabel('Tutup kalender', { exact: true }).click(); await page.waitForTimeout(300);
    await setDate('Sampai tanggal *', 0);
    assert.match(await form.getByLabel('Mulai — Budi Uji', { exact: true }).textContent(), new RegExp(date(0).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })));
    await setDate('Mulai tanggal *', 2);
    for (const control of ['Sampai tanggal *', 'Mulai — Budi Uji', 'Selesai — Budi Uji']) {
      assert.match(await form.getByLabel(control, { exact: true }).textContent(), new RegExp(date(2).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })), 'Moving the main start must preserve valid schedules');
    }
    await form.getByLabel('Sampai tanggal *', { exact: true }).click();
    assert.equal(await (await calendarDay(1)).isDisabled(), true, 'The main end cannot precede the main start');
    await page.getByLabel('Tutup kalender', { exact: true }).click(); await page.waitForTimeout(300);
    await setDate('Mulai tanggal *', 1); await setDate('Sampai tanggal *', 4);
    await setDate('Mulai — Budi Uji', 1);
    await setDate('Selesai — Budi Uji', 2); await setDate('Mulai — Ayu Uji', 3);
    await form.getByLabel('Sertakan tenaga lapangan', { exact: true }).click();
    await form.getByLabel('Tambah tenaga lapangan', { exact: true }).click();
    await choose('Pilih sumber dana', 'Program Mitra Aktif');
    await form.getByLabel('Nama PLH *', { exact: true }).fill('Pelaksana Harian Uji');
    await form.getByText('Sudah disetujui', { exact: true }).click();
    const fileChooser = page.waitForEvent('filechooser');
    await form.getByLabel('Pilih berkas dasar surat', { exact: true }).click();
    await (await fileChooser).setFiles({ name: 'dasar-uji.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4\nFixture only\n%%EOF') });
    await form.getByText('dasar-uji.pdf', { exact: true }).waitFor();
    await form.getByLabel('Keterangan lainnya (opsional)', { exact: true }).fill('Koordinasi dengan petugas lapangan.');
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(out, 'step2-complete.png') });
    await form.getByRole('button', { name: 'Submit Pengajuan', exact: true }).dblclick();
    await form.getByText('Pengajuan Surat Tugas Berhasil!', { exact: true }).waitFor();
    await assertProgress(3);
    assert.equal(submissions.length, 1);
    const sent = submissions[0];
    assert.equal(sent.task_type_id, '14'); assert.equal(sent.sertakan_laporan, '0');
    assert.equal(sent.template_type, 'beda-hari'); assert.equal(sent.jumlah_buruh, '2');
    assert.equal(sent['employees[0][tanggal_selesai]'], iso(2)); assert.equal(sent['employees[1][tanggal_mulai]'], iso(3));
    assert.equal(sent.nama_plh, 'Pelaksana Harian Uji'); assert.equal(sent.tanda_setuju, 'sudah');
    assert.equal(sent.sumber_dana, 'Program Mitra Aktif'); assert.equal(sent.has_seksi_employee, '1');
    assert.match(sent.maksud_tujuan, /untuk Pengawasan Habitat dalam rangka Inventarisasi BMN dan GPS/);
    assert.match(sent.file_surat, /^%PDF/); assert.equal(sent.status, undefined);
    await form.getByRole('button', { name: 'Kembali ke Portal', exact: true }).click();
    await open();
    assert.equal(await form.getByLabel('Cari pegawai', { exact: true }).inputValue(), '');
    await select('Ayu Uji'); await form.getByRole('button', { name: 'Lanjutkan', exact: true }).click();
    await choose('Pilih jenis tugas', 'Melaksanakan Kegiatan (1 Hari)');
    assert.equal(await form.getByLabel('Nama PLH *', { exact: true }).count(), 0);
    await form.getByLabel('Nama kegiatan / maksud tugas *', { exact: true }).fill('koordinasi pengamanan satwa');
    await form.getByLabel('Tempat spesifik', { exact: true }).fill('Kantor Balai');
    await setDate('Tanggal kegiatan *', 5);
    await choose('Pilih sumber dana', 'Lainnya');
    await form.getByRole('button', { name: 'Submit Pengajuan', exact: true }).click();
    await form.getByText('Lengkapi sumber pembebanan dana.', { exact: true }).waitFor();
    await form.getByLabel('Nama sumber dana lainnya *', { exact: true }).fill('Dana Mitra Uji');
    rejectSubmit = true;
    await form.getByRole('button', { name: 'Submit Pengajuan', exact: true }).click();
    await form.getByText('Uraian perlu diperbaiki oleh pemohon.', { exact: true }).waitFor();
    assert.equal(await form.getByLabel('Nama kegiatan / maksud tugas *', { exact: true }).inputValue(), 'koordinasi pengamanan satwa');
    rejectSubmit = false;
    await form.getByRole('button', { name: 'Submit Pengajuan', exact: true }).click();
    await form.getByText('Pengajuan Surat Tugas Berhasil!', { exact: true }).waitFor();
    const single = submissions.at(-1);
    assert.equal(single.tanggal_mulai, single.tanggal_selesai); assert.equal(single.task_type_id, '13');
    assert.equal(single.sumber_dana_other, 'Dana Mitra Uji'); assert.equal(single.jumlah_buruh, '0');
    assert.equal(single.nama_plh, undefined); assert.equal(single['file_surat'], undefined);
    assert.equal(single['employees[0][tanggal_mulai]'], undefined);
    await form.getByRole('button', { name: 'Kembali ke Portal', exact: true }).click();
    await open(); await select('Ayu Uji'); await form.getByRole('button', { name: 'Lanjutkan', exact: true }).click();
    await form.getByLabel('Kota / kabupaten tujuan *', { exact: true }).fill('Samarinda');
    await form.getByLabel('Nama kegiatan / maksud tugas *', { exact: true }).fill('pengamanan satwa liar');
    conflict = true;
    await setDate('Mulai tanggal *', 6); await setDate('Sampai tanggal *', 6);
    await form.getByTestId('assignment-conflicts').waitFor();
    const conflictCard = form.getByTestId('assignment-conflicts');
    assert.equal(await conflictCard.getAttribute('role'), 'alert');
    assert.equal(await conflictCard.getByText('Jadwal Tugas / Cuti Bentrok', { exact: true }).count(), 1);
    assert.match(await conflictCard.textContent(), /Ayu Uji, A.Md.Kom.: Ada Surat Tugas pada tanggal 19 Nov 2026 s\/d 23 Nov 2026/);
    const employeeName = conflictCard.getByText('Ayu Uji, A.Md.Kom.', { exact: true });
    const conflictRange = conflictCard.getByText('19 Nov 2026 s/d 23 Nov 2026', { exact: true });
    assert.ok(Number(await employeeName.evaluate(el => getComputedStyle(el).fontWeight)) >= 700);
    assert.ok(Number(await conflictRange.evaluate(el => getComputedStyle(el).fontWeight)) >= 700);
    assert.match(await conflictRange.evaluate(el => getComputedStyle(el).textDecorationLine), /underline/);
    for (const [dark, color] of [[false, 'rgb(255, 251, 235)'], [true, 'rgb(69, 26, 3)']]) {
      if (dark) { await form.getByLabel('Aktifkan tema gelap', { exact: true }).click(); await page.waitForTimeout(800); }
      await conflictCard.scrollIntoViewIfNeeded();
      assert.equal(await conflictCard.evaluate(el => getComputedStyle(el).backgroundColor), color);
      await page.screenshot({ path: path.join(out, `conflict-${dark ? 'dark' : 'light'}.png`) });
    }
    await form.getByLabel('Aktifkan tema terang', { exact: true }).click(); await page.waitForTimeout(800);
    assert.equal(await form.getByRole('button', { name: 'Jadwal bentrok — perbaiki tanggal', exact: true }).isDisabled(), true);
    conflict = false;
    const checked = page.waitForResponse(response => response.url().includes('/check-conflicts') && response.request().postDataJSON().tanggal_selesai === iso(7));
    await setDate('Sampai tanggal *', 7); await checked;
    assert.equal(await conflictCard.count(), 0, 'Resolved conflicts remove their card');
    await choose('Pilih sumber dana', 'Program Mitra Aktif');
    await form.getByRole('button', { name: 'Submit Pengajuan', exact: true }).click();
    await form.getByText('Pengajuan Surat Tugas Berhasil!', { exact: true }).waitFor();
    assert.equal(submissions.length, 4);
    assert.ok(conflictCalls > 0);
    const reference=await context.newPage();
    await reference.goto('http://localhost:3000/surat-tugas',{waitUntil:'networkidle'});
    for(const dark of [false,true]) {
      await reference.evaluate(value=>document.documentElement.classList.toggle('dark',value),dark);
      if(dark){await form.getByLabel('Aktifkan tema gelap',{exact:true}).click();await page.waitForTimeout(800);}
      const webAccent=await reference.locator('[data-module="surat-tugas"]').evaluate(el=>getComputedStyle(el).getPropertyValue('--ds-accent-solid').trim());
      assert.equal(webAccent,dark?'#38bdf8':'#0369a1');
      const mobileAccent=await form.getByRole('button',{name:'Kembali ke Portal',exact:true}).evaluate(el=>getComputedStyle(el).backgroundColor);
      assert.equal(mobileAccent,dark?'rgb(56, 189, 248)':'rgb(3, 105, 161)');
    }
    await reference.close();
    const previousCalls = setupCalls;
    types.push({ id: 99, nama: 'Pemantauan Habitat Baru', kode: 'pemantauan_baru', mode_lokasi: 'tempat_saja', aturan_durasi: 'fleksibel', default_sertakan_laporan: true });
    fundingNames.push('Sumber Dana Baru');
    await form.getByRole('button', { name: 'Kembali ke Portal', exact: true }).click();
    await open(); await select('Ayu Uji'); await form.getByRole('button', { name: 'Lanjutkan', exact: true }).click();
    assert.ok(setupCalls > previousCalls, 'Reentering a retained form must fetch updated settings');
    await choose('Pilih jenis tugas', 'Pemantauan Habitat Baru');
    await choose('Pilih sumber dana', 'Sumber Dana Baru');
    await form.getByLabel('Nama kegiatan / maksud tugas *', { exact: true }).fill('Draf yang tetap disimpan');
    await form.getByLabel('Kembali ke pemilihan pegawai', { exact: true }).click();
    await form.getByLabel('Kembali ke portal', { exact: true }).click();
    await open(); await form.getByRole('button', { name: 'Lanjutkan', exact: true }).click();
    assert.match(await form.getByLabel('Pilih jenis tugas', { exact: true }).textContent(), /Pemantauan Habitat Baru/);
    assert.match(await form.getByLabel('Pilih sumber dana', { exact: true }).textContent(), /Sumber Dana Baru/);
    assert.equal(await form.getByLabel('Nama kegiatan / maksud tugas *', { exact: true }).inputValue(), 'Draf yang tetap disimpan');
    assert.deepEqual(errors, []);
    console.log('PASS: portal entry, themes, configured tasks/funding, location modes, personnel dates, PLH/agreement, PM, multipart upload, single-day, duplicate protection, validation/retry and new-form reset.');
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
