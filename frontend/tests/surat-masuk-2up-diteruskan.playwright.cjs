'use strict';
/**
 * =============================================================================
 * BKSDA SUPERAPP - SURAT MASUK 2-UP BATCH PRINT, SIFAT & PENERUSAN BALAI E2E TEST
 * =============================================================================
 * Engine: Local Chromium (Headless)
 * Skenario Pengujian Menyeluruh (Root-to-Leaf):
 * 1. SM-PW-01: Render Checkbox Tabel, Kolom 'Sifat' Interaktif & Kolom 'Diteruskan Ke'
 * 2. SM-PW-02: Seleksi 2 Surat -> Muncul Floating Toolbar '2 Surat Terpilih (1 Lembar Kertas)'
 * 3. SM-PW-03: Buka Modal Cetak 2-Up -> Verifikasi Lembar 1 Merender 2 Form Berdampingan & Garis Potong
 * 4. SM-PW-04: Seleksi 3 Surat (Ekor Ganjil) -> Lembar 2 Sisi Kiri Terisi & Sisi Kanan Kosong
 * 5. SM-PW-05: Update Sifat Surat via SifatCellPopover (Ubah ke 'Segera' / 'Rahasia')
 * 6. SM-PW-06: Buka Popover Penerusan -> Verifikasi Master Ruang Balai (BMN) & Pegawai Balai -> Simpan & Render Badge
 * =============================================================================
 */

const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const Module = require('node:module');

const frontendRoot = path.resolve(__dirname, '..');
const frontendRequire = Module.createRequire(path.join(frontendRoot, 'package.json'));
const { chromium } = frontendRequire('playwright');

function getChromeExecutablePath() {
  const winPath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const winPathX86 = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
  if (process.platform === 'win32') {
    if (fs.existsSync(winPath)) return winPath;
    if (fs.existsSync(winPathX86)) return winPathX86;
  }
  return undefined;
}

const CHROME_PATH = getChromeExecutablePath();
let passedCount = 0;
let totalAssertions = 0;

function reportPass(suiteId, title, detail) {
  passedCount++;
  console.log(`  [PASS] [${suiteId}] ${title}: ${detail}`);
}

async function runSuratMasuk2UpSuite() {
  console.log('='.repeat(80));
  console.log('SURAT MASUK 2-UP BATCH PRINT, SIFAT & PENERUSAN BALAI E2E AUDIT');
  console.log(`Engine: Local Chromium (${CHROME_PATH || 'bundled Playwright'})`);
  console.log('Target: http://localhost:3000/surat/masuk');
  console.log('='.repeat(80));

  const browser = await chromium.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });

  // Set cookies for authentication
  const userPayload = JSON.stringify({
    id: '1',
    username: 'superadmin',
    nama_lengkap: 'Super Administrator',
    role: 'super_admin',
    access_modules: ['surat', 'bmn', 'kepegawaian'],
  });

  await context.addCookies([
    {
      name: 'bksda_logged_in',
      value: 'true',
      domain: 'localhost',
      path: '/',
    },
    {
      name: 'bksda_user',
      value: encodeURIComponent(userPayload),
      domain: 'localhost',
      path: '/',
    },
    {
      name: 'bksda_token',
      value: 'e2e_test_bearer_token',
      domain: 'localhost',
      path: '/',
    },
  ]);

  const page = await context.newPage();

  // Mock API routes to avoid network lag or missing DB records during browser test
  await page.route('**/api/bmn/locations', route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: [
          { id: 'loc-1', name: 'Urusan Teknis', unit_kerja: 'Kantor Balai KSDA Kalimantan Timur' },
          { id: 'loc-2', name: 'Urusan Keuangan', unit_kerja: 'Kantor Balai KSDA Kalimantan Timur' },
          { id: 'loc-3', name: 'Urusan Umum dan Perlengkapan', unit_kerja: 'Kantor Balai KSDA Kalimantan Timur' },
          { id: 'loc-4', name: 'Ruang Kepala Balai', unit_kerja: 'Kantor Balai KSDA Kalimantan Timur' },
        ],
      }),
    });
  });

  await page.route('**/api/kepegawaian/employees/select*', route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: [
          { id: 1, nama_lengkap: 'M. Ari Wibawanto, S.Hut., M.Sc.', jabatan: 'Kepala Balai', satuan_kerja: 'Kantor Balai KSDA Kalimantan Timur' },
          { id: 83, nama_lengkap: 'Carica Deffa Yullinda, S.Kom.', jabatan: 'Pranata Komputer', satuan_kerja: 'Kantor Balai KSDA Kalimantan Timur' },
          { id: 114, nama_lengkap: 'Suryadi', jabatan: 'Manggala Agni Pemula', satuan_kerja: 'Kantor Balai KSDA Kalimantan Timur' },
        ],
      }),
    });
  });

  await page.route('**/api/surat-masuk/*', route => {
    if (route.request().method() === 'PUT') {
      const postData = JSON.parse(route.request().postData() || '{}');
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          message: 'Surat Masuk berhasil diperbarui.',
          data: {
            id: 101,
            no_agenda: postData.no_agenda || '1001',
            no_surat: postData.no_surat || 'S.101/BKSDA/2026',
            sifat_json: postData.sifat_json || ['Penting'],
            disposisi: postData.disposisi || { diteruskan_json: [] },
          },
        }),
      });
      return;
    }
    route.continue();
  });

  // Seed sample mock items into localStorage before page load
  const sampleSuratMasuk = [
    {
      id: 101,
      no_agenda: '1001',
      tanggal_agenda: '2026-11-01',
      no_surat: 'S.101/BKSDA/2026',
      tanggal_surat: '2026-10-30',
      asal_surat: 'Dirjen KSDAE Kementerian LHK',
      isi_ringkas: 'Instruksi Pengamanan Kawasan Konservasi Menjelang Akhir Tahun 2026',
      sifat_json: ['Penting'],
      lampiran: '1 Berkas',
      catatan: 'Harap segera dikoordinasikan dengan urusan teknis',
      disposisi: {
        diteruskan_json: [],
        catatan: '',
      },
    },
    {
      id: 102,
      no_agenda: '1002',
      tanggal_agenda: '2026-11-01',
      no_surat: 'S.102/DLH-KT/2026',
      tanggal_surat: '2026-10-31',
      asal_surat: 'Dinas Lingkungan Hidup Prov. Kaltim',
      isi_ringkas: 'Undangan Rapat Koordinasi Penataan Batas Koridor Satwa IKN',
      sifat_json: ['Biasa'],
      lampiran: '3 Lembar',
      catatan: 'Wajib dihadiri Kepala Balai',
      disposisi: {
        diteruskan_json: [],
        catatan: '',
      },
    },
    {
      id: 103,
      no_agenda: '1003',
      tanggal_agenda: '2026-11-02',
      no_surat: 'S.103/KUM-KLD/2026',
      tanggal_surat: '2026-11-01',
      asal_surat: 'Pusat Riset Biosistematika dan Evolusi BRIN',
      isi_ringkas: 'Permohonan Izin Penelitian Lapangan Habitat Bekantan',
      sifat_json: ['Biasa'],
      lampiran: 'Proposal Lengkap',
      catatan: 'Untuk diketahui dan diproses perizinannya',
      disposisi: {
        diteruskan_json: [],
        catatan: '',
      },
    },
  ];

  await page.addInitScript(({ sampleData, user }) => {
    localStorage.setItem('bksda_logged_in', 'true');
    localStorage.setItem('bksda_token', 'e2e_test_bearer_token');
    localStorage.setItem('bksda_user', user);
    localStorage.setItem('bksda_saved_surat_masuk', JSON.stringify(sampleData));
  }, { sampleData: sampleSuratMasuk, user: userPayload });

  try {
    console.log('\n[1/6] Menguji SM-PW-01: Navigasi ke /surat/masuk & Render Kolom Tabel...');
    await page.goto('http://localhost:3000/surat/masuk', { waitUntil: 'domcontentloaded', timeout: 15000 });

    // Tunggu tabel ter-render
    await page.waitForSelector('table', { timeout: 10000 });

    // Verifikasi kolom header
    const headers = await page.$$eval('thead th', ths => ths.map(t => t.innerText.trim()));
    assert.ok(headers.some(h => h.includes('Diteruskan Ke')), 'Kolom "Diteruskan Ke" harus ada di thead');
    assert.ok(headers.some(h => h.includes('Sifat')), 'Kolom "Sifat" harus ada di thead');
    assert.ok(headers.some(h => h.includes('No Agenda')), 'Kolom "No Agenda" harus ada di thead');
    totalAssertions += 3;
    reportPass('SM-PW-01', 'Render Tabel & Kolom Baru', `Ditemukan kolom 'Diteruskan Ke' berdampingan dengan 'Sifat'.`);

    // -------------------------------------------------------------------------
    // SM-PW-02: Seleksi 2 Surat -> Muncul Floating Action Bar
    // -------------------------------------------------------------------------
    console.log('\n[2/6] Menguji SM-PW-02: Seleksi 2 Surat & Floating Action Bar...');
    const rowCheckboxes = await page.$$('tbody tr input[type="checkbox"]');
    assert.ok(rowCheckboxes.length >= 2, 'Harus ada minimal 2 baris checkbox di tabel');

    // Centang surat 1 dan surat 2
    await rowCheckboxes[0].click();
    await rowCheckboxes[1].click();

    // Tunggu floating bar muncul
    await page.waitForSelector('.fixed.bottom-6', { timeout: 5000 });
    const barText = await page.$eval('.fixed.bottom-6', el => el.innerText);
    assert.ok(barText.includes('2'), 'Floating toolbar harus menampilkan counter 2 surat');
    assert.ok(barText.includes('1 Lembar Kertas'), 'Floating toolbar harus menghitung 2 surat = 1 lembar kertas');
    assert.ok(barText.includes('Cetak 2-Up'), 'Tombol Cetak 2-Up harus tersedia');
    totalAssertions += 3;
    reportPass('SM-PW-02', 'Seleksi & Floating Toolbar', `2 surat dicentang -> floating toolbar terdeteksi: "${barText.replace(/\n/g, ' ')}"`);

    // -------------------------------------------------------------------------
    // SM-PW-03: Modal Cetak 2-Up (Pasangan Genap)
    // -------------------------------------------------------------------------
    console.log('\n[3/6] Menguji SM-PW-03: Modal Pratinjau Cetak 2-Up (2 Surat = 1 Lembar)...');
    const printBatchBtn = await page.$('.fixed.bottom-6 button:has-text("Cetak 2-Up")');
    assert.ok(printBatchBtn, 'Tombol "Cetak 2-Up" harus ditemukan');
    await printBatchBtn.click();

    // Tunggu modal muncul
    await page.waitForSelector('#batch-print-modal-content', { timeout: 5000 });
    const modalTitle = await page.$eval('#batch-print-modal-content h2', el => el.innerText);
    assert.ok(modalTitle.includes('Pratinjau Cetak 2-Up (2 Surat)'), 'Judul modal harus memuat 2 Surat');

    // Periksa jumlah lembar fisik yang dirender
    const physicalSheets = await page.$$('#batch-print-modal-content .batch-print-sheet');
    assert.equal(physicalSheets.length, 1, 'Harus ada tepat 1 lembar fisik untuk 2 surat');

    // Lembar 1 harus memuat Surat 1 di kiri dan Surat 2 di kanan
    const sheetText = await physicalSheets[0].innerText();
    assert.ok(sheetText.includes('1001'), 'Lembar 1 kiri harus memuat agenda 1001');
    assert.ok(sheetText.includes('1002'), 'Lembar 1 kanan harus memuat agenda 1002');
    totalAssertions += 4;
    reportPass('SM-PW-03', 'Modal Cetak 2-Up Genap', `Lembar 1 merender agenda 1001 (kiri) & 1002 (kanan) berdampingan.`);

    // Tutup modal
    const closeBtn = await page.$('#batch-print-modal-content button:has-text("Tutup")');
    await closeBtn.click();
    await page.waitForSelector('#batch-print-modal-content', { state: 'detached', timeout: 5000 });

    // -------------------------------------------------------------------------
    // SM-PW-04: Seleksi 3 Surat (Ekor Ganjil) -> Sisi Kanan Kosong
    // -------------------------------------------------------------------------
    console.log('\n[4/6] Menguji SM-PW-04: Seleksi 3 Surat (Ganjil) & Verifikasi Sisi Kanan Kosong...');
    const freshCheckboxes = await page.$$('tbody tr input[type="checkbox"]');
    if (freshCheckboxes.length >= 3) {
      await freshCheckboxes[2].click(); // centang baris ke-3
    }

    const updatedBarText = await page.$eval('.fixed.bottom-6', el => el.innerText);
    assert.ok(updatedBarText.includes('3'), 'Floating bar harus menampilkan 3 surat');
    assert.ok(updatedBarText.includes('2 Lembar Kertas'), '3 surat harus dihitung menjadi 2 lembar kertas');

    // Buka modal lagi
    const printBatchBtn2 = await page.$('.fixed.bottom-6 button:has-text("Cetak 2-Up")');
    await printBatchBtn2.click();
    await page.waitForSelector('#batch-print-modal-content', { timeout: 5000 });

    // Periksa catatan info jumlah ganjil
    const noteText = await page.$eval('#batch-print-modal-content', el => el.innerText);
    assert.ok(noteText.includes('Jumlah surat ganjil (3 surat)'), 'Peringatan ekor ganjil harus muncul');

    const multiSheets = await page.$$('#batch-print-modal-content .batch-print-sheet');
    assert.equal(multiSheets.length, 2, 'Harus ada 2 lembar fisik untuk 3 surat');

    // Lembar ke-2 harus memiliki elemen sisi kanan kosong
    const emptyRightSlot = await page.$('#batch-print-modal-content .batch-print-empty-right');
    assert.ok(emptyRightSlot, 'Slot sisi kanan kosong harus ada pada lembar terakhir');
    const emptySlotText = await emptyRightSlot.innerText();
    assert.ok(emptySlotText.includes('SISI KANAN KOSONG'), 'Teks Sisi Kanan Kosong harus tampil jelas');
    totalAssertions += 5;
    reportPass('SM-PW-04', 'Ekor Ganjil (Odd-Tail)', `Lembar ke-2 merender agenda 1003 di sisi kiri dan sisi kanan kosong.`);

    // Tutup modal
    const closeBtn2 = await page.$('#batch-print-modal-content button:has-text("Tutup")');
    await closeBtn2.click();
    await page.waitForSelector('#batch-print-modal-content', { state: 'detached', timeout: 5000 });

    // -------------------------------------------------------------------------
    // SM-PW-05: Update Sifat Surat via SifatCellPopover
    // -------------------------------------------------------------------------
    console.log('\n[5/6] Menguji SM-PW-05: Update Sifat Surat via SifatCellPopover...');
    // Klik badge sifat pada baris 1
    const sifatBadges = await page.$$('tbody tr span:has-text("Penting")');
    assert.ok(sifatBadges.length > 0, 'Badge sifat "Penting" harus ditemukan');
    await sifatBadges[0].click();

    // Tunggu popover sifat terbuka
    await page.waitForSelector('span:has-text("Sifat Surat")', { timeout: 5000 });
    const segeraOption = await page.$('div:has-text("Segera")');
    assert.ok(segeraOption, 'Pilihan Segera harus tersedia di popover sifat');
    await segeraOption.click();

    // Verifikasi badge Segera ter-render di baris 1
    await page.waitForTimeout(500);
    const row1SifatText = await page.$$eval('tbody tr', rows => rows[0]?.innerText || '');
    assert.ok(row1SifatText.includes('Segera'), 'Sifat surat baris 1 berhasil diperbarui menjadi Segera');
    totalAssertions += 3;
    reportPass('SM-PW-05', 'Update Sifat Interaktif', `Sifat surat baris 1 berhasil diubah menjadi Segera via popover.`);

    // -------------------------------------------------------------------------
    // SM-PW-06: Buka Popover Penerusan & Simpan Penerusan Balai
    // -------------------------------------------------------------------------
    console.log('\n[6/6] Menguji SM-PW-06: Interaksi Popover Penerusan & Sifat Gabungan...');
    const pickRecipientButtons = await page.$$('tbody tr button:has-text("Pilih Penerus")');
    assert.ok(pickRecipientButtons.length > 0, 'Tombol "+ Pilih Penerus" harus ada di tabel');

    await pickRecipientButtons[0].click();

    // Tunggu popover terbuka
    await page.waitForSelector('h4:has-text("Arahan Pimpinan (Sifat & Penerus Balai)")', { timeout: 5000 });

    // Verifikasi tab ruangan dan pegawai
    const tabRuangan = await page.$('button:has-text("Ruangan")');
    const tabPegawai = await page.$('button:has-text("Pegawai")');
    assert.ok(tabRuangan, 'Tab Ruangan harus ada di popover');
    assert.ok(tabPegawai, 'Tab Pegawai harus ada di popover');

    // Cari ruangan 'Teknis'
    const searchInput = await page.$('input[placeholder*="Cari ruangan"]');
    assert.ok(searchInput, 'Input pencarian popover harus ada');
    await searchInput.fill('Teknis');

    // Verifikasi opsi 'Urusan Teknis'
    await page.waitForTimeout(500);
    const teknisOption = await page.$('div[class*="cursor-pointer"]:has-text("Teknis")');
    assert.ok(teknisOption, 'Harus menemukan ruangan yang mengandung kata Teknis');
    await teknisOption.click();

    // Klik tombol Simpan di popover
    const saveRecipientBtn = await page.$('button:has-text("Simpan")');
    assert.ok(saveRecipientBtn, 'Tombol Simpan penerus harus ada');
    await saveRecipientBtn.click();

    // Tunggu popover tertutup dan badge muncul di baris 1
    await page.waitForTimeout(1000);
    const firstRowText = await page.$$eval('tbody tr', rows => rows[0]?.innerText || '');
    assert.ok(firstRowText.includes('Teknis'), 'Badge "Teknis" harus tampil pada baris surat pertama');
    totalAssertions += 5;
    reportPass('SM-PW-06', 'Persistensi Badge Penerusan', `Badge penerus terpasang pada baris surat sesuai arahan pimpinan.`);

    console.log('\n' + '='.repeat(80));
    console.log(`SEMUA ${passedCount}/6 SKENARIO AUDIT LULUS DENGAN SUKSES (${totalAssertions} ASSERTIONS GREEN)`);
    console.log('='.repeat(80));

    await browser.close();
    process.exit(0);
  } catch (err) {
    console.error('\n❌ AUDIT SURAT MASUK GAGAL:', err);
    await browser.close();
    process.exit(1);
  }
}

runSuratMasuk2UpSuite();
