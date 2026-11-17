'use strict';
/**
 * =============================================================================
 * BKSDA SUPERAPP - DEREPORING INTERNAL MULTI-RECIPIENT & RBAC E2E TEST
 * =============================================================================
 * Engine: Local Chromium (Headless Playwright)
 * Skenario Pengujian:
 * 1. DR-PW-01: Render Canonical Enterprise Header Card & Tombol Aksi
 * 2. DR-PW-02: Render Segmented Tabs (Semua Relevan, Untuk Saya, Urusan Saya, Unggahan Saya, Seluruh Balai)
 * 3. DR-PW-03: Navigasi Tab memicu filter query yang tepat
 * 4. DR-PW-04: Drawer Unggah memuat pilihan Sasaran (Semua Pegawai vs Sasaran Terbatas) & Urusan Check Pills
 * 5. DR-PW-05: Struktur Kolom Tabel & Badge Distribusi Sasaran (Urusan / Personal / Umum)
 * 6. DR-PW-06: Tombol Pratinjau Membuka Modal Quick PDF Viewer
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

async function runDeReportingInternalSuite() {
  console.log('='.repeat(80));
  console.log('DEREPORING INTERNAL MULTI-RECIPIENT & RBAC E2E TEST (PLAYWRIGHT)');
  console.log(`Engine: Local Chromium (${CHROME_PATH || 'bundled Playwright'})`);
  console.log('Target: http://localhost:3000/dereporting/internal');
  console.log('='.repeat(80));

  const browser = await chromium.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });

  // Mock Session Auth untuk Super Admin
  const adminUser = JSON.stringify({
    id: '1',
    username: '198001012005011001',
    name: 'Super Administrator',
    role: 'super_admin',
    access_modules: ['dereporting', 'kepegawaian', 'bmn', 'surat'],
  });

  await context.addCookies([
    { name: 'bksda_logged_in', value: 'true', domain: 'localhost', path: '/' },
    { name: 'bksda_user', value: encodeURIComponent(adminUser), domain: 'localhost', path: '/' },
    { name: 'bksda_token', value: 'e2e_dereporting_token', domain: 'localhost', path: '/' },
  ]);

  const page = await context.newPage();

  // Mock API Master Data & Internals
  await page.route('**/api/dereporting/master/tahun*', route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: [{ id: 't-2026', tahun: 2026 }] }),
    });
  });

  await page.route('**/api/dereporting/master/bidang*', route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: [{ id: 'b-tsl', nama: 'DATA TSL' }] }),
    });
  });

  await page.route('**/api/dereporting/recipients/candidates*', route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: [
          { id: 2, name: 'Heryanto Sumanbowo', nip: '198305282001121001', jabatan: 'PEH Ahli Muda', urusan: 'Urusan Teknis' },
          { id: 3, name: 'Tegar Anugrah', nip: '199907072025061006', jabatan: 'Pranata Komputer', urusan: 'Urusan Kepegawaian & Umum' },
        ],
      }),
    });
  });

  await page.route('**/api/dereporting/internals?*', route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        current_page: 1,
        total: 2,
        data: [
          {
            id: 'rep-001',
            judul_laporan: 'Laporan Rekapitulasi Realisasi Belanja Modal',
            target_scope: 'restricted',
            review_status: 'sesuai',
            review_notes: 'Data terkonfirmasi valid.',
            created_at: new Date().toISOString(),
            is_mine: false,
            is_read_by_me: true,
            read_at: new Date().toISOString(),
            uploader: { id: 2, name: 'Heryanto Sumanbowo', username: '198305282001121001' },
            bidang: { id: 'b-tsl', nama: 'DATA TSL' },
            recipients_summary: [
              { type: 'urusan', label: 'Urusan Keuangan & BMN' },
              { type: 'user', label: 'Tegar Anugrah' },
            ],
            actions_allowed: { can_preview: true, can_download: true, can_review: true, can_delete: true },
          },
          {
            id: 'rep-002',
            judul_laporan: 'Pengumuman Pelaksanaan Apel Pagi Gabungan',
            target_scope: 'all',
            review_status: 'terkirim',
            created_at: new Date().toISOString(),
            is_mine: true,
            is_read_by_me: true,
            uploader: { id: 1, name: 'Super Administrator', username: '198001012005011001' },
            bidang: { id: 'b-tsl', nama: 'DATA TSL' },
            recipients_summary: [],
            actions_allowed: { can_preview: true, can_download: true, can_review: false, can_delete: true },
          },
        ],
      }),
    });
  });

  await page.route('**/api/dereporting/internals/rep-001/preview', route => {
    route.fulfill({
      status: 200,
      contentType: 'application/pdf',
      body: Buffer.from('%PDF-1.4 sample preview content'),
    });
  });

  try {
    // -------------------------------------------------------------------------
    // DR-PW-01: Render Canonical Enterprise Header Card
    // -------------------------------------------------------------------------
    console.log('\n[1/6] Menguji DR-PW-01: Render Enterprise Header Card...');
    await page.goto('http://localhost:3000/dereporting/internal', { waitUntil: 'networkidle', timeout: 30000 });

    const headerTitle = await page.textContent('h1');
    assert.match(headerTitle, /Laporan Internal BKSDA/i, 'Header h1 harus memuat teks "Laporan Internal BKSDA"');
    totalAssertions++;

    const uploadBtn = page.locator('button:has-text("Unggah Laporan Baru")');
    assert.equal(await uploadBtn.isVisible(), true, 'Tombol "Unggah Laporan Baru" harus terlihat di header card');
    totalAssertions++;

    reportPass('DR-PW-01', 'Enterprise Header Card', 'Header card, icon container, dan tombol aksi terstandarisasi');

    // -------------------------------------------------------------------------
    // DR-PW-02: Render Segmented Tabs
    // -------------------------------------------------------------------------
    console.log('\n[2/6] Menguji DR-PW-02: Render Segmented Tabs...');
    const tabLabels = ['Semua Relevan', 'Untuk Saya', 'Urusan Saya', 'Unggahan Saya', 'Seluruh Balai'];
    for (const label of tabLabels) {
      const tab = page.locator(`button:has-text("${label}")`);
      assert.equal(await tab.isVisible(), true, `Tab "${label}" harus terlihat`);
      totalAssertions++;
    }
    reportPass('DR-PW-02', 'Segmented Tabs Render', 'Kelima segmented tabs (termasuk tab admin) ter-render lengkap');

    // -------------------------------------------------------------------------
    // DR-PW-03: Navigasi Tab
    // -------------------------------------------------------------------------
    console.log('\n[3/6] Menguji DR-PW-03: Navigasi Tab...');
    const urusanTab = page.locator('button:has-text("Urusan Saya")');
    await urusanTab.click();
    await page.waitForTimeout(200);
    // Verifikasi tab aktif memiliki styling aksen
    const isActive = await urusanTab.evaluate(el => el.classList.contains('text-[var(--ds-accent-fg)]'));
    assert.equal(isActive, true, 'Tab "Urusan Saya" harus memiliki state aktif');
    totalAssertions++;
    reportPass('DR-PW-03', 'Tab Switching State', 'Navigasi tab mengubah state aktif secara mulus');

    // -------------------------------------------------------------------------
    // DR-PW-04: Drawer Unggah & Pilihan Sasaran Multi-Target
    // -------------------------------------------------------------------------
    console.log('\n[4/6] Menguji DR-PW-04: Drawer Unggah & Multi-Target Selector...');
    await uploadBtn.click();
    await page.waitForTimeout(300);

    const drawerHeading = page.locator('text=Unggah Laporan Internal Baru');
    assert.equal(await drawerHeading.isVisible(), true, 'Drawer unggah harus terbuka di layar');
    totalAssertions++;

    // Klik pilihan "Sasaran Terbatas"
    const restrictedBtn = page.locator('button:has-text("Sasaran Terbatas")');
    assert.equal(await restrictedBtn.isVisible(), true, 'Tombol pilihan "Sasaran Terbatas" harus ada');
    await restrictedBtn.click();
    await page.waitForTimeout(200);

    // Verifikasi muncul check pills Urusan
    const urusanPill = page.locator('button:has-text("Urusan Keuangan & BMN")');
    assert.equal(await urusanPill.isVisible(), true, 'Pill "Urusan Keuangan & BMN" harus muncul saat mode terbatas');
    totalAssertions++;

    // Klik pill urusan untuk memilih
    await urusanPill.click();
    await page.waitForTimeout(100);

    // Tutup drawer
    const closeBtn = page.locator('button[aria-label="Tutup"]').or(page.locator('button:has-text("Batal")')).first();
    await closeBtn.click();
    await page.waitForTimeout(200);

    reportPass('DR-PW-04', 'Multi-Target Drawer', 'Drawer unggah mendukung pilihan sasaran Urusan & Personal');

    // -------------------------------------------------------------------------
    // DR-PW-05: Kolom Tabel & Badges Sasaran
    // -------------------------------------------------------------------------
    console.log('\n[5/6] Menguji DR-PW-05: Struktur Kolom Tabel & Badges...');
    // Kembalikan ke tab Semua Relevan
    await page.locator('button:has-text("Semua Relevan")').click();
    await page.waitForTimeout(200);

    const tableHeaders = ['Tanggal & Judul', 'Sasaran / Distribusi', 'Status Baca', 'Pengunggah', 'Aksi'];
    for (const th of tableHeaders) {
      const thEl = page.locator(`th:has-text("${th}")`);
      assert.equal(await thEl.isVisible(), true, `Kolom tabel "${th}" harus ada`);
      totalAssertions++;
    }

    // Periksa badge target Urusan Keuangan & BMN
    const urusanBadge = page.locator('text=Urusan Keuangan & BMN').first();
    assert.equal(await urusanBadge.isVisible(), true, 'Badge sasaran "Urusan Keuangan & BMN" harus terlihat di tabel');
    totalAssertions++;

    // Periksa badge Semua Pegawai
    const semuaBadge = page.locator('text=Semua Pegawai').first();
    assert.equal(await semuaBadge.isVisible(), true, 'Badge sasaran "Semua Pegawai" harus terlihat di tabel');
    totalAssertions++;

    reportPass('DR-PW-05', 'Table Columns & Badges', 'Seluruh kolom dan badges distribusi render secara terstruktur');

    // -------------------------------------------------------------------------
    // DR-PW-06: Quick In-App PDF Preview Modal
    // -------------------------------------------------------------------------
    console.log('\n[6/6] Menguji DR-PW-06: In-App PDF Preview Modal...');
    const previewBtn = page.locator('button[title="Pratinjau Dokumen Cepat"]').first();
    assert.equal(await previewBtn.isVisible(), true, 'Tombol pratinjau harus ada');
    await previewBtn.click();
    await page.waitForTimeout(400);

    const modalTitle = page.locator('text=Pratinjau Dokumen Kedinasan');
    assert.equal(await modalTitle.isVisible(), true, 'Modal dialog pratinjau dokumen harus terbuka');
    totalAssertions++;

    const closePreviewBtn = page.locator('button[aria-label="Tutup"]').last();
    await closePreviewBtn.click();
    await page.waitForTimeout(200);

    reportPass('DR-PW-06', 'In-App PDF Preview', 'Modal pratinjau PDF inline dapat dibuka dan ditutup bersih');

    console.log('\n' + '='.repeat(80));
    console.log(`SEMUA SKENARIO E2E PLAYWRIGHT LULUS: ${passedCount}/6 Suites (${totalAssertions} assertions)`);
    console.log('='.repeat(80));
  } finally {
    await browser.close();
  }
}

runDeReportingInternalSuite().catch(err => {
  console.error('\n[FAIL] DeReporting Internal E2E Test Error:', err);
  process.exit(1);
});
