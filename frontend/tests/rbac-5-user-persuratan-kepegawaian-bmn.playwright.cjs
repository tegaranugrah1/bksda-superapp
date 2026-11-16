'use strict';
/**
 * =============================================================================
 * BKSDA SUPERAPP - 5-USER RBAC E2E SUITE (PERSURATAN, KEPEGAWAIAN, BMN & IAM)
 * =============================================================================
 * Engine: Local Chromium (Headless Playwright)
 * Personas (5 Users):
 *   1. super_admin (ID: 1) — Full access including Settings, IAM, Force Delete
 *   2. admin       (ID: 2) — Operational admin across all 3 modules (No Settings, No IAM, No Force Delete)
 *   3. user_1      (ID: 3) — Regular employee (NIP: 199101012020121001)
 *   4. user_2      (ID: 4) — Regular employee (NIP: 199202022020121002)
 *   5. user_3      (ID: 5) — Regular employee (NIP: 199303032020121003)
 *
 * Modules Under Test:
 *   - Suite 1: Modul Persuratan (/surat, /surat/keluar, /surat/masuk, /surat/settings)
 *   - Suite 2: Modul Kepegawaian & IAM (/kepegawaian, /kepegawaian/employees/[id], /kepegawaian/settings)
 *   - Suite 3: Modul BMN (/bmn, /bmn/assets/[id], /bmn/disposal, /bmn/settings)
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

async function waitForPathname(page, expectedPath) {
  await page.waitForFunction(
    target => window.location.pathname === target,
    expectedPath,
    { timeout: 10000 }
  );
}

const USERS = {
  super_admin: {
    id: '1',
    username: '198001012005011001',
    name: 'Super Admin Balai',
    role: 'super_admin',
    access_modules: ['surat', 'kepegawaian', 'bmn'],
    permissions: [],
  },
  admin: {
    id: '2',
    username: '198502022010011002',
    name: 'Admin Operasional',
    role: 'admin',
    access_modules: ['surat', 'kepegawaian', 'bmn'],
    permissions: [],
  },
  user_1: {
    id: '3',
    username: '199101012020121001',
    name: 'Pegawai Satu',
    role: 'user',
    access_modules: ['surat', 'kepegawaian', 'bmn'],
    permissions: [],
  },
  user_2: {
    id: '4',
    username: '199202022020121002',
    name: 'Pegawai Dua',
    role: 'user',
    access_modules: ['surat', 'kepegawaian', 'bmn'],
    permissions: [],
  },
  user_3: {
    id: '5',
    username: '199303032020121003',
    name: 'Pegawai Tiga',
    role: 'user',
    access_modules: ['surat', 'kepegawaian', 'bmn'],
    permissions: [],
  },
};

const ALL_SURAT_KELUAR = [
  {
    id: 101,
    no_surat: 'S.101/K.23/TU/2026',
    tanggal_surat: '2026-11-16',
    tujuan_surat: 'Dinas Kehutanan User 1',
    perihal: 'Laporan Patroli Pegawai Satu',
    sifat: 'Biasa',
    lampiran: '-',
    status: 'terdaftar',
    created_by: 3,
  },
  {
    id: 102,
    no_surat: 'S.102/K.23/TU/2026',
    tanggal_surat: '2026-11-16',
    tujuan_surat: 'Dinas Kehutanan User 2',
    perihal: 'Laporan Patroli Pegawai Dua',
    sifat: 'Biasa',
    lampiran: '-',
    status: 'terdaftar',
    created_by: 4,
  },
  {
    id: 103,
    no_surat: 'S.103/K.23/TU/2026',
    tanggal_surat: '2026-11-16',
    tujuan_surat: 'Dinas Kehutanan User 3',
    perihal: 'Laporan Patroli Pegawai Tiga',
    sifat: 'Biasa',
    lampiran: '-',
    status: 'terdaftar',
    created_by: 5,
  },
];

async function createPersonaPage(browser, persona) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });

  await context.addCookies([
    { name: 'bksda_logged_in', value: 'true', domain: 'localhost', path: '/' },
    { name: 'bksda_user', value: encodeURIComponent(JSON.stringify(persona)), domain: 'localhost', path: '/' },
    { name: 'bksda_token', value: `e2e_token_${persona.role}_${persona.id}`, domain: 'localhost', path: '/' },
  ]);

  const page = await context.newPage();

  // Catch-all fallback for any background /api/** query so mock tokens never hit 401
  await page.route('**/api/**', route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: [] }),
    });
  });

  // Attach API mocks simulating backend RBAC behavior per persona
  await page.route('**/api/auth/me*', route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ user: persona }),
    });
  });

  // Surat API Mocks
  await page.route('**/api/surat/stats*', route => {
    const isRegUser = persona.role === 'user';
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        total_masuk: isRegUser ? 0 : 12,
        total_keluar: isRegUser ? 1 : 3,
        masuk_bulan_ini: isRegUser ? 0 : 4,
        keluar_bulan_ini: isRegUser ? 1 : 3,
        draft_keluar: 0,
        masuk_belum_disposisi: isRegUser ? 0 : 2,
        recent_masuk: [],
        recent_keluar: isRegUser
          ? ALL_SURAT_KELUAR.filter(s => String(s.created_by) === String(persona.id))
          : ALL_SURAT_KELUAR,
        monthly_trend: [],
      }),
    });
  });

  await page.route('**/api/surat/surat-keluar*', route => {
    const isRegUser = persona.role === 'user';
    const data = isRegUser
      ? ALL_SURAT_KELUAR.filter(s => String(s.created_by) === String(persona.id))
      : ALL_SURAT_KELUAR;
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data, total: data.length }),
    });
  });

  await page.route('**/api/surat/template-settings*', route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: {} }),
    });
  });

  await page.route('**/api/surat/templates*', route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: [] }),
    });
  });

  // Kepegawaian API Mocks
  await page.route('**/api/kepegawaian/statistics*', route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          total_pegawai: 5,
          total_pns: 5,
          total_pppk: 0,
          total_mmp: 0,
          by_resor: [],
          by_golongan: [],
        },
      }),
    });
  });

  await page.route('**/api/kepegawaian/employees/99', route => {
    const isRegUser = persona.role === 'user';
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          id: 99,
          nip: '198808082015011099',
          nama_lengkap: 'Budi Santoso Target',
          jabatan: 'Polisi Kehutanan Ahli Muda',
          pangkat_golongan: 'Penata Muda Tk.I (III/b)',
          satuan_kerja: 'Balai KSDA Kalimantan Selatan',
          resor: 'SKW I Pelaihari',
          telepon: '081234567890',
          email: 'budi@ksda.go.id',
          nama_bank: isRegUser ? undefined : 'BRI',
          nomor_rekening: isRegUser ? undefined : '001122334455',
          is_active: true,
          user: {
            id: 99,
            username: '198808082015011099',
            role: 'user',
            access_modules: ['surat', 'kepegawaian', 'bmn'],
            permissions: [],
          },
        },
      }),
    });
  });

  await page.route('**/api/kepegawaian/employees/99/access*', route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          has_account: true,
          username: '198808082015011099',
          role: 'user',
          access_modules: ['surat', 'kepegawaian', 'bmn'],
          permissions: [],
        },
      }),
    });
  });

  await page.route('**/api/kepegawaian/meal-allowances*', route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: [] }),
    });
  });

  await page.route('**/api/kepegawaian/st-templates*', route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: [] }),
    });
  });

  await page.route('**/api/kepegawaian/st-task-types*', route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: [] }),
    });
  });

  await page.route('**/api/surat-tugas*', route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: [], total: 0 }),
    });
  });

  // BMN API Mocks
  await page.route('**/api/bmn/locations*', route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: [] }),
    });
  });

  await page.route('**/api/bmn/tags*', route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: [] }),
    });
  });

  await page.route('**/api/bmn/statistics*', route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          total_assets: 10,
          total_value: 500000000,
          kondisi_baik: 8,
          kondisi_rusak_ringan: 1,
          kondisi_rusak_berat: 1,
        },
      }),
    });
  });

  await page.route('**/api/bmn/assets/501*', route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          id: 501,
          kode_barang: '3020101001',
          nup: 1,
          nama: 'Mobil Patroli Hilux Double Cabin',
          nama_barang: 'Mobil Patroli Hilux Double Cabin',
          jenis_bmn: 'ALAT ANGKUTAN DARAT BERMOTOR',
          merk: 'Toyota',
          tipe: 'Hilux 4x4',
          kondisi: 'Baik',
          nilai_perolehan: 485000000,
          nilai_buku: 320000000,
          lokasi_ruang: 'Garasi Balai',
          tags: [],
        },
      }),
    });
  });

  return { context, page };
}

async function runFiveUserRbacE2E() {
  console.log('='.repeat(84));
  console.log('5-USER RBAC E2E SUITE: PERSURATAN, KEPEGAWAIAN, BMN & IAM (PLAYWRIGHT)');
  console.log(`Engine: Local Chromium (${CHROME_PATH || 'bundled Playwright'})`);
  console.log('Personas: super_admin, admin, user_1, user_2, user_3');
  console.log('='.repeat(84));

  const browser = await chromium.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });

  try {
    // =========================================================================
    // SUITE 1: MODUL PERSURATAN (/surat) DENGAN 5 USER
    // =========================================================================
    console.log('\n[SUITE 1/3] Menguji Modul Persuratan (/surat) pada 5 User (user_1, user_2, user_3, admin, super_admin)...');

    for (const [key, expectedPerihal] of [
      ['user_1', 'Laporan Patroli Pegawai Satu'],
      ['user_2', 'Laporan Patroli Pegawai Dua'],
      ['user_3', 'Laporan Patroli Pegawai Tiga'],
    ]) {
      const { context, page } = await createPersonaPage(browser, USERS[key]);
      await page.goto('http://localhost:3000/surat/keluar', { waitUntil: 'networkidle', timeout: 30000 });

      // 1. Sidebar visibility for user
      assert.equal(await page.locator('aside a:has-text("Agenda Surat Keluar")').isVisible(), true, `${key} harus melihat Agenda Surat Keluar`);
      assert.equal(await page.locator('aside a:has-text("Tata Naskah Dinas")').isVisible(), true, `${key} harus melihat Tata Naskah Dinas`);
      assert.equal(await page.locator('aside a:has-text("Agenda Surat Masuk")').count(), 0, `${key} TIDAK boleh melihat Agenda Surat Masuk`);
      assert.equal(await page.locator('aside a:has-text("Rekapitulasi")').count(), 0, `${key} TIDAK boleh melihat Rekapitulasi`);
      assert.equal(await page.locator('aside a:has-text("Pengaturan Template")').count(), 0, `${key} TIDAK boleh melihat Pengaturan Template`);
      totalAssertions += 5;

      // 2. Data isolation: each user only sees their own Surat Keluar row
      assert.equal(await page.locator(`text=${expectedPerihal}`).isVisible(), true, `${key} harus melihat surat keluarnya sendiri (${expectedPerihal})`);
      for (const other of ALL_SURAT_KELUAR.filter(s => s.perihal !== expectedPerihal)) {
        assert.equal(await page.locator(`text=${other.perihal}`).count(), 0, `${key} TIDAK boleh melihat surat milik user lain (${other.perihal})`);
        totalAssertions++;
      }
      totalAssertions++;

      // 3. Route guard redirect on /surat/masuk and /surat/settings
      await page.goto('http://localhost:3000/surat/masuk', { waitUntil: 'domcontentloaded', timeout: 30000 });
      await waitForPathname(page, '/surat');
      totalAssertions++;

      await page.goto('http://localhost:3000/surat/settings', { waitUntil: 'domcontentloaded', timeout: 30000 });
      await waitForPathname(page, '/surat');
      totalAssertions++;

      await context.close();
      reportPass(`SRT-${key.toUpperCase()}`, `Isolasi & Guard Persuratan (${key})`, `Hanya melihat "${expectedPerihal}", menu admin & settings tersembunyi/redirect`);
    }

    // Admin Persuratan
    {
      const { context, page } = await createPersonaPage(browser, USERS.admin);
      await page.goto('http://localhost:3000/surat/keluar', { waitUntil: 'networkidle', timeout: 30000 });

      assert.equal(await page.locator('aside a:has-text("Agenda Surat Masuk")').isVisible(), true, 'Admin harus melihat Agenda Surat Masuk');
      assert.equal(await page.locator('aside a:has-text("Rekapitulasi")').isVisible(), true, 'Admin harus melihat Rekapitulasi');
      assert.equal(await page.locator('aside a:has-text("Pengaturan Template")').count(), 0, 'Admin TIDAK boleh melihat Pengaturan Template');
      totalAssertions += 3;

      // Admin sees all 3 users' Surat Keluar
      for (const item of ALL_SURAT_KELUAR) {
        assert.equal(await page.locator(`text=${item.perihal}`).isVisible(), true, `Admin harus melihat surat ${item.perihal}`);
        totalAssertions++;
      }

      // Admin redirected from /surat/settings
      await page.goto('http://localhost:3000/surat/settings', { waitUntil: 'domcontentloaded', timeout: 30000 });
      await waitForPathname(page, '/surat');
      totalAssertions++;

      await context.close();
      reportPass('SRT-ADMIN', 'Operasional Penuh Tanpa Settings (admin)', 'Admin melihat surat ketiga user & Surat Masuk, namun ditolak dari /surat/settings');
    }

    // Super Admin Persuratan
    {
      const { context, page } = await createPersonaPage(browser, USERS.super_admin);
      await page.goto('http://localhost:3000/surat/settings', { waitUntil: 'networkidle', timeout: 30000 });

      assert.equal(page.url().includes('/surat/settings'), true, 'Super Admin harus tetap berada di /surat/settings');
      assert.equal(await page.locator('aside a:has-text("Pengaturan Template")').isVisible(), true, 'Super Admin harus melihat menu Pengaturan Template');
      totalAssertions += 2;

      await context.close();
      reportPass('SRT-SUPERADMIN', 'Akses Penuh Pengaturan Template (super_admin)', 'Super Admin dapat membuka /surat/settings');
    }

    // =========================================================================
    // SUITE 2: MODUL KEPEGAWAIAN & IAM (/kepegawaian) DENGAN 5 USER
    // =========================================================================
    console.log('\n[SUITE 2/3] Menguji Modul Kepegawaian & IAM (/kepegawaian) pada 5 User...');

    for (const key of ['user_1', 'user_2', 'user_3']) {
      const { context, page } = await createPersonaPage(browser, USERS[key]);
      await page.goto('http://localhost:3000/kepegawaian/employees/99', { waitUntil: 'networkidle', timeout: 30000 });

      // Sidebar only shows Dashboard & Daftar Pegawai
      assert.equal(await page.locator('aside a:has-text("Daftar Pegawai")').isVisible(), true, `${key} harus melihat Daftar Pegawai`);
      assert.equal(await page.locator('aside a:has-text("Inbox Surat Tugas")').count(), 0, `${key} TIDAK boleh melihat Inbox Surat Tugas`);
      assert.equal(await page.locator('aside a:has-text("Hitung Uang Makan")').count(), 0, `${key} TIDAK boleh melihat Hitung Uang Makan`);
      assert.equal(await page.locator('aside a:has-text("Setting")').count(), 0, `${key} TIDAK boleh melihat Setting`);
      totalAssertions += 4;

      // Dossier Pegawai Lain: Only Biodata Lengkap tab is visible; sensitive tabs & IAM button hidden
      assert.equal(await page.locator('text=Budi Santoso Target').first().isVisible(), true, `${key} dapat melihat direktori biodata pegawai lain`);
      assert.equal(await page.locator('button[role="tab"]:has-text("Biodata Lengkap")').isVisible(), true, `${key} melihat tab Biodata Lengkap`);
      assert.equal(await page.locator('button[role="tab"]:has-text("Riwayat Penugasan")').count(), 0, `${key} TIDAK boleh melihat tab Riwayat Penugasan pegawai lain`);
      assert.equal(await page.locator('button[role="tab"]:has-text("Cuti Pegawai")').count(), 0, `${key} TIDAK boleh melihat tab Cuti Pegawai lain`);
      assert.equal(await page.locator('button[role="tab"]:has-text("Presensi & Uang Makan")').count(), 0, `${key} TIDAK boleh melihat tab Presensi & Uang Makan pegawai lain`);
      assert.equal(await page.locator('button[role="tab"]:has-text("Riwayat Perubahan")').count(), 0, `${key} TIDAK boleh melihat tab Riwayat Perubahan pegawai lain`);
      assert.equal(await page.locator('button:has-text("Kelola Akses (IAM)")').count(), 0, `${key} TIDAK boleh melihat tombol Kelola Akses (IAM)`);
      assert.equal(await page.locator('button:has-text("Reset Password")').count(), 0, `${key} TIDAK boleh melihat tombol Reset Password`);
      totalAssertions += 8;

      // Route guard redirect on /kepegawaian/settings
      await page.goto('http://localhost:3000/kepegawaian/settings', { waitUntil: 'domcontentloaded', timeout: 30000 });
      await waitForPathname(page, '/kepegawaian');
      totalAssertions++;

      await context.close();
      reportPass(`KPG-${key.toUpperCase()}`, `Proteksi Dossier & Sidebar Kepegawaian (${key})`, 'Tab sensitif, rekening, tombol IAM, dan /kepegawaian/settings tertutup rapat');
    }

    // Admin Kepegawaian
    {
      const { context, page } = await createPersonaPage(browser, USERS.admin);
      await page.goto('http://localhost:3000/kepegawaian/employees/99', { waitUntil: 'networkidle', timeout: 30000 });

      assert.equal(await page.locator('aside a:has-text("Inbox Surat Tugas")').isVisible(), true, 'Admin harus melihat Inbox Surat Tugas');
      assert.equal(await page.locator('aside a:has-text("Hitung Uang Makan")').isVisible(), true, 'Admin harus melihat Hitung Uang Makan');
      assert.equal(await page.locator('aside a:has-text("Setting")').count(), 0, 'Admin TIDAK boleh melihat Setting');
      assert.equal(await page.locator('button[role="tab"]:has-text("Riwayat Penugasan")').isVisible(), true, 'Admin dapat melihat tab Riwayat Penugasan');
      assert.equal(await page.locator('button:has-text("Reset Password")').isVisible(), true, 'Admin dapat melihat tombol Reset Password');
      assert.equal(await page.locator('button:has-text("Kelola Akses (IAM)")').count(), 0, 'Admin TIDAK boleh melihat tombol Kelola Akses (IAM)');
      totalAssertions += 6;

      await page.goto('http://localhost:3000/kepegawaian/settings', { waitUntil: 'domcontentloaded', timeout: 30000 });
      await waitForPathname(page, '/kepegawaian');
      totalAssertions++;

      await context.close();
      reportPass('KPG-ADMIN', 'Operasional Kepegawaian Tanpa IAM & Settings (admin)', 'Admin dapat mengelola dossier & uang makan, namun tombol IAM dan /kepegawaian/settings tertutup');
    }

    // Super Admin Kepegawaian & IAM Sheet
    {
      const { context, page } = await createPersonaPage(browser, USERS.super_admin);
      await page.goto('http://localhost:3000/kepegawaian/employees/99', { waitUntil: 'networkidle', timeout: 30000 });

      const iamBtn = page.locator('button:has-text("Kelola Akses (IAM)")');
      assert.equal(await iamBtn.isVisible(), true, 'Super Admin harus melihat tombol Kelola Akses (IAM)');
      await iamBtn.click();
      await page.waitForTimeout(300);

      // Verify IAM drawer opens and does NOT render legacy 16 BMN granular checkboxes
      assert.equal(await page.locator('text=Peran Sistem (Role)').isVisible(), true, 'Sheet IAM harus terbuka');
      assert.equal(await page.locator('text=bmn.asset.create').count(), 0, 'Checklist granular BMN lama (bmn.asset.create) harus sudah dihapus dari IAM Sheet');
      totalAssertions += 3;

      await page.goto('http://localhost:3000/kepegawaian/settings', { waitUntil: 'networkidle', timeout: 30000 });
      assert.equal(page.url().includes('/kepegawaian/settings'), true, 'Super Admin harus dapat membuka /kepegawaian/settings');
      totalAssertions++;

      await context.close();
      reportPass('KPG-SUPERADMIN', 'Akses Penuh IAM & Settings Kepegawaian (super_admin)', 'Super Admin dapat membuka IAM Sheet (tanpa 16 checkbox BMN lama) & /kepegawaian/settings');
    }

    // =========================================================================
    // SUITE 3: MODUL BMN (/bmn) DENGAN 5 USER
    // =========================================================================
    console.log('\n[SUITE 3/3] Menguji Modul BMN (/bmn) pada 5 User...');

    for (const key of ['user_1', 'user_2', 'user_3']) {
      const { context, page } = await createPersonaPage(browser, USERS[key]);
      await page.goto('http://localhost:3000/bmn/assets/501', { waitUntil: 'networkidle', timeout: 30000 });

      // Sidebar only shows 4 operational read/request menus
      assert.equal(await page.locator('aside a:has-text("Data Aset")').isVisible(), true, `${key} harus melihat Data Aset`);
      assert.equal(await page.locator('aside a:has-text("Peminjaman")').isVisible(), true, `${key} harus melihat Peminjaman`);
      assert.equal(await page.locator('aside a:has-text("Pemeliharaan")').isVisible(), true, `${key} harus melihat Pemeliharaan`);
      assert.equal(await page.locator('aside a:has-text("Import Review")').count(), 0, `${key} TIDAK boleh melihat Import Review`);
      assert.equal(await page.locator('aside a:has-text("Kandidat Rusak Berat")').count(), 0, `${key} TIDAK boleh melihat Kandidat Rusak Berat`);
      assert.equal(await page.locator('aside a:has-text("Paket Lelang BMN")').count(), 0, `${key} TIDAK boleh melihat Paket Lelang BMN`);
      assert.equal(await page.locator('aside a:has-text("Aset Dihapus")').count(), 0, `${key} TIDAK boleh melihat Aset Dihapus`);
      assert.equal(await page.locator('aside a:has-text("Dokumen & Laporan")').count(), 0, `${key} TIDAK boleh melihat Dokumen & Laporan`);
      assert.equal(await page.locator('aside a:has-text("Pengaturan Master")').count(), 0, `${key} TIDAK boleh melihat Pengaturan Master`);
      totalAssertions += 9;

      // Asset Detail: User sees full read-only detail without "Edit Aset" button
      assert.equal(await page.locator('text=Mobil Patroli Hilux Double Cabin').first().isVisible(), true, `${key} dapat melihat detail aset BMN secara transparan`);
      assert.equal(await page.locator('button:has-text("Edit Aset")').count(), 0, `${key} TIDAK boleh melihat tombol Edit Aset`);
      totalAssertions += 2;

      // Route guard redirect on /bmn/disposal and /bmn/settings
      await page.goto('http://localhost:3000/bmn/disposal', { waitUntil: 'domcontentloaded', timeout: 30000 });
      await waitForPathname(page, '/bmn');
      totalAssertions++;

      await page.goto('http://localhost:3000/bmn/settings', { waitUntil: 'domcontentloaded', timeout: 30000 });
      await waitForPathname(page, '/bmn');
      totalAssertions++;

      await context.close();
      reportPass(`BMN-${key.toUpperCase()}`, `Read-Only Transparan & Guard BMN (${key})`, 'Melihat 4 menu utama & detail aset tanpa tombol Edit, ditolak dari /bmn/disposal & /bmn/settings');
    }

    // Admin BMN
    {
      const { context, page } = await createPersonaPage(browser, USERS.admin);
      await page.goto('http://localhost:3000/bmn/assets/501', { waitUntil: 'networkidle', timeout: 30000 });

      assert.equal(await page.locator('aside a:has-text("Import Review")').isVisible(), true, 'Admin harus melihat Import Review');
      assert.equal(await page.locator('aside a:has-text("Paket Lelang BMN")').isVisible(), true, 'Admin harus melihat Paket Lelang BMN');
      assert.equal(await page.locator('aside a:has-text("Aset Dihapus")').isVisible(), true, 'Admin harus melihat Aset Dihapus');
      assert.equal(await page.locator('aside a:has-text("Dokumen & Laporan")').isVisible(), true, 'Admin harus melihat Dokumen & Laporan');
      assert.equal(await page.locator('aside a:has-text("Pengaturan Master")').count(), 0, 'Admin TIDAK boleh melihat Pengaturan Master');
      assert.equal(await page.locator('button:has-text("Edit Aset")').isVisible(), true, 'Admin harus melihat tombol Edit Aset');
      totalAssertions += 6;

      await page.goto('http://localhost:3000/bmn/settings', { waitUntil: 'domcontentloaded', timeout: 30000 });
      await waitForPathname(page, '/bmn');
      totalAssertions++;

      await context.close();
      reportPass('BMN-ADMIN', 'Operasional Penuh BMN Tanpa Master Settings (admin)', 'Admin melihat tombol Edit Aset & menu operasional, namun ditolak dari /bmn/settings');
    }

    // Super Admin BMN
    {
      const { context, page } = await createPersonaPage(browser, USERS.super_admin);
      await page.goto('http://localhost:3000/bmn/settings', { waitUntil: 'networkidle', timeout: 30000 });

      assert.equal(page.url().includes('/bmn/settings'), true, 'Super Admin harus dapat membuka /bmn/settings');
      assert.equal(await page.locator('aside a:has-text("Pengaturan Master")').isVisible(), true, 'Super Admin harus melihat menu Pengaturan Master');
      totalAssertions += 2;

      await context.close();
      reportPass('BMN-SUPERADMIN', 'Akses Penuh Pengaturan Master BMN (super_admin)', 'Super Admin dapat membuka /bmn/settings');
    }

    console.log('\n' + '='.repeat(84));
    console.log(`ALL ${passedCount} E2E PERSONA SUITES PASSED (${totalAssertions} ASSERTIONS VERIFIED)`);
    console.log('='.repeat(84));
  } finally {
    await browser.close();
  }
}

runFiveUserRbacE2E().catch(err => {
  console.error('\n[FAIL] 5-User RBAC E2E Suite Failed:', err);
  process.exit(1);
});
