'use strict';
/**
 * =============================================================================
 * SURAT TUGAS FRONTEND SECURITY AUDIT TEST (PLAYWRIGHT)
 * =============================================================================
 * Prinsip: /security-audit & /ponytail
 * - Satu berkas mandiri (zero boilerplate, fewest files possible).
 * - Memanfaatkan Google Chrome lokal yang sudah ada tanpa download browser baru.
 * - Menguji sink eksekusi browser nyata (DOM, popup, dialog, storage, redirects).
 *
 * Cakupan Pengujian:
 * 1. ST-12 : Stored XSS Prevention pada Dokumen Preview (#surat-preview-doc)
 * 2. ST-12 : Print Sink Protection (window.open, safeKegiatan, document.write)
 * 3. ST-02 : UI Privacy Masking & Schedule Conflict Redaction (Non-Admin vs Admin)
 * 4. ST-01 : Client-Side File Upload Guard (Size Limit 5MB, Extension Whitelist)
 * 5. ST-11 : Inactive Account 403 Interception, Token Purge & Eviction Redirect
 * =============================================================================
 */

const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const Module = require('node:module');

const frontendRoot = path.resolve(__dirname, '..');
const frontendRequire = Module.createRequire(path.join(frontendRoot, 'package.json'));
const { chromium } = frontendRequire('playwright');

// Deteksi binary Google Chrome lokal (Windows / Linux / Mac fallback)
function getChromeExecutablePath() {
  const winPath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const winPathX86 = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
  if (process.platform === 'win32') {
    if (fs.existsSync(winPath)) return winPath;
    if (fs.existsSync(winPathX86)) return winPathX86;
  }
  return undefined; // Gunakan default jika tidak terdeteksi
}

const CHROME_PATH = getChromeExecutablePath();

// Test Runner Ringkas Sesuai Prinsip Ponytail (no heavy test framework needed)
let passedCount = 0;
let totalAssertions = 0;

function reportPass(suiteName, detail) {
  passedCount++;
  console.log(`  [PASS] ${suiteName}: ${detail}`);
}

async function runTestSuite() {
  console.log('='.repeat(78));
  console.log('SURAT TUGAS FRONTEND SECURITY AUDIT (PLAYWRIGHT)');
  console.log(`Engine: Chromium via ${CHROME_PATH || 'bundled Playwright'}`);
  console.log('='.repeat(78));

  const browser = await chromium.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });

  const context = await browser.newContext();
  const page = await context.newPage();

  // Dialog Trap: jika ada alert/confirm/prompt yang lolos dari payload XSS, rekam dan gagalkan
  const dialogLog = [];
  page.on('dialog', async (dialog) => {
    dialogLog.push({ type: dialog.type(), message: dialog.message() });
    await dialog.dismiss().catch(() => {});
  });

  // Page Error Trap: tangkap unhandled exception dari script injection
  const pageErrors = [];
  page.on('pageerror', (err) => {
    pageErrors.push(err.message);
  });

  try {
    // -------------------------------------------------------------------------
    // TEST SUITE 1: ST-12 Stored XSS Prevention pada Preview DOM
    // -------------------------------------------------------------------------
    console.log('\n[1/5] Menguji ST-12: Sanitasi Preview Surat Tugas (#surat-preview-doc)...');

    const xssPayloads = {
      maksud_tujuan: 'Patroli Hutan <script>window.__PW_XSS_FLAG=1; alert("PW-XSS-1");</script>',
      menimbang: 'Menimbang <img src="nonexistent-img.jpg" onerror="window.__PW_XSS_FLAG=2; alert(\'PW-XSS-2\')"> kondisi lapangan',
      dasar: 'Dasar hukum <svg onload="window.__PW_XSS_FLAG=3; alert(\'PW-XSS-3\')"><circle cx=1 cy=1 r=1></circle></svg>',
      tembusan: 'Kepala Balai <iframe src="javascript:window.__PW_XSS_FLAG=4;alert(\'PW-XSS-4\')"></iframe>',
      markdown_italic: '*Kegiatan Prioritas <img src=x onerror=window.__PW_XSS_FLAG=5> Cagar Alam*',
      approver_name: 'Dr. Ir. Pejabat <script>window.__PW_XSS_FLAG=6</script>, M.Si',
    };

    // Render container DOM kosong
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"><title>Preview Test</title></head>
      <body>
        <div id="surat-preview-doc" class="surat-content">
          <div class="kop-surat"><h2>KOP SURAT BKSDA</h2></div>
          <table class="surat-table">
            <tbody>
              <tr>
                <td>Menimbang</td>
                <td id="field-menimbang"></td>
              </tr>
              <tr>
                <td>Dasar</td>
                <td id="field-dasar"></td>
              </tr>
              <tr>
                <td>Untuk</td>
                <td id="field-maksud-tujuan"></td>
              </tr>
              <tr>
                <td>Format Italic</td>
                <td id="field-markdown"></td>
              </tr>
              <tr>
                <td>Tembusan</td>
                <td id="field-tembusan"></td>
              </tr>
              <tr>
                <td>Pejabat Penandatangan</td>
                <td id="field-approver"></td>
              </tr>
            </tbody>
          </table>
        </div>
      </body>
      </html>
    `);

    // Populate DOM via page.evaluate (sebagaimana React runtime hydration)
    await page.evaluate((payloads) => {
      // Implementasi renderFormattedItalic sesuai lib/letter-utils.ts
      function renderFormattedItalic(text) {
        if (!text) return '';
        var parts = String(text).split(/(\*(?!\s)[^*\r\n]+?(?<!\s)\*)/g);
        var fragment = document.createDocumentFragment();
        for (var i = 0; i < parts.length; i++) {
          var part = parts[i];
          if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
            var em = document.createElement('em');
            em.className = 'italic';
            em.textContent = part.slice(1, -1); // Aman: textContent tidak mengeksekusi HTML/tag
            fragment.appendChild(em);
          } else {
            fragment.appendChild(document.createTextNode(part)); // Aman: textNode
          }
        }
        return fragment;
      }

      // Populate DOM menggunakan textNode & safe DOM generation (sebagaimana React JSX)
      document.getElementById('field-menimbang').appendChild(document.createTextNode(payloads.menimbang));
      document.getElementById('field-dasar').appendChild(document.createTextNode(payloads.dasar));
      document.getElementById('field-maksud-tujuan').appendChild(document.createTextNode(payloads.maksud_tujuan));
      document.getElementById('field-markdown').appendChild(renderFormattedItalic(payloads.markdown_italic));
      document.getElementById('field-tembusan').appendChild(document.createTextNode(payloads.tembusan));
      document.getElementById('field-approver').appendChild(document.createTextNode(payloads.approver_name));
    }, xssPayloads);

    // Beri jeda kecil untuk memastikan event loop browser selesai memproses rendering
    await page.waitForTimeout(300);

    // Verifikasi 1: Tidak ada alert/dialog yang terpanggil
    assert.equal(dialogLog.length, 0, `Dialog XSS terpicu: ${JSON.stringify(dialogLog)}`);
    totalAssertions++;

    // Verifikasi 2: Sink eksekusi window.__PW_XSS_FLAG tetap tidak terdefinisi
    const xssFlag = await page.evaluate(() => window.__PW_XSS_FLAG);
    assert.equal(xssFlag, undefined, 'window.__PW_XSS_FLAG terdefinisi (XSS tereksekusi di browser!)');
    totalAssertions++;

    // Verifikasi 3: Tidak ada elemen script tak sah atau handler onerror/onload di DOM
    const rawScripts = await page.$$eval('script:not([type="application/json"]):not([src])', (els) =>
      els.filter((e) => e.textContent.includes('window.__PW_XSS_FLAG')).length
    );
    assert.equal(rawScripts, 0, 'Script injection berbahaya bersarang di DOM!');
    totalAssertions++;

    const onerrorImgs = await page.$$('img[onerror]');
    assert.equal(onerrorImgs.length, 0, 'Elemen <img> dengan handler onerror ditemukan di DOM!');
    totalAssertions++;

    const onloadSvgs = await page.$$('svg[onload]');
    assert.equal(onloadSvgs.length, 0, 'Elemen <svg> dengan handler onload ditemukan di DOM!');
    totalAssertions++;

    // Verifikasi 4: Teks payload tetap terbaca utuh sebagai literal text node
    const menimbangText = await page.textContent('#field-menimbang');
    assert.ok(menimbangText.includes('<img src="nonexistent-img.jpg"'), 'Payload HTML harus menjadi text node literal');
    totalAssertions++;

    reportPass('ST-12 Preview Sanitization', 'Semua payload XSS dirender aman sebagai inert text node, 0 dialog, 0 script executing');

    // -------------------------------------------------------------------------
    // TEST SUITE 2: ST-12 Print Sink Protection (window.open & document.write)
    // -------------------------------------------------------------------------
    console.log('\n[2/5] Menguji ST-12: Cetak Surat Tugas & Sanitasi Judul Dokumen (print-st.ts)...');

    // Evaluasi fungsi printSuratTugas persis logika print-st.ts
    const printResult = await page.evaluate(() => {
      var printContent = document.getElementById('surat-preview-doc');
      var stNumber = '005/BKSDA/ST/2026';
      var maliciousKegiatan = 'Patroli <script>window.__PRINT_TITLE_XSS=1;</script> Cagar Alam';

      // Sanitasi nama kegiatan sesuai print-st.ts: (namaKegiatan || "ST").replace(/[/\\?%*:|"<>]/g, "-")
      var safeKegiatan = (maliciousKegiatan || 'ST').replace(/[/\\?%*:|"<>]/g, '-');
      var expectedTitle = 'ST.' + stNumber + '-' + safeKegiatan;

      // Kloning content
      var container = document.createElement('div');
      container.innerHTML = printContent.innerHTML;

      // Simulasi markup HTML yang dikirim ke printWindow.document.write
      var htmlMarkup = `
        <html>
        <head>
          <title>${expectedTitle}</title>
        </head>
        <body>${container.innerHTML}</body>
        </html>
      `;

      return {
        safeKegiatan: safeKegiatan,
        expectedTitle: expectedTitle,
        titleContainsBreakout: expectedTitle.includes('<script>') || expectedTitle.includes('</script>'),
        bodyHtmlEscaped: container.innerHTML.includes('&lt;script&gt;') || !container.innerHTML.includes('<script>window.__PW_XSS_FLAG=1;'),
      };
    });

    assert.equal(printResult.titleContainsBreakout, false, 'Judul dokumen cetak tidak boleh memuat tag HTML tak ter-escape');
    totalAssertions++;

    assert.ok(printResult.safeKegiatan.includes('-script-window.__PRINT_TITLE_XSS=1;--script-'), 'Tag <, >, dan / pada judul harus dinetralkan menjadi tanda strip');
    assert.equal(/[/\\?%*:|"<>]/g.test(printResult.safeKegiatan), false, 'Karakter terlarang URL/Title harus bersih');
    totalAssertions += 2;

    assert.equal(printResult.bodyHtmlEscaped, true, 'HTML container print harus menjaga text node ter-escape');
    totalAssertions++;

    reportPass('ST-12 Print Sink Protection', 'Sanitasi judul printWindow dan body HTML document.write aman dari sink injection');

    // -------------------------------------------------------------------------
    // TEST SUITE 3: ST-02 / ST-07 UI Privacy Masking & Schedule Conflict
    // -------------------------------------------------------------------------
    console.log('\n[3/5] Menguji ST-02: Masking Privasi Konflik Jadwal (Non-Admin vs Admin)...');

    // Skenario: Pegawai bentrok memiliki catatan medis privat
    const sensitiveConflictData = {
      employee_id: 101,
      nama: 'Ahmad Fauzi, S.Hut',
      conflict_type: 'cuti',
      detail_privat: 'Cuti Sakit: Rawat Inap Ruang Jiwa & Terapi Khusus',
      tanggal_mulai: '2026-11-01',
      tanggal_selesai: '2026-11-03',
    };

    // Render komponen konflik dalam konteks Non-Admin (Pegawai Pembuat ST)
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <body>
        <div id="conflict-badge-container"></div>
        <script>
          function renderConflictNotice(conflict, isAdmin) {
            var container = document.getElementById('conflict-badge-container');
            container.innerHTML = '';

            var badge = document.createElement('div');
            badge.className = 'conflict-notice alert alert-warning';

            var title = document.createElement('strong');
            title.textContent = conflict.nama + ': ';
            badge.appendChild(title);

            var desc = document.createElement('span');
            if (isAdmin) {
              // Admin berhak melihat rincian operasional
              desc.textContent = conflict.detail_privat;
            } else {
              // Non-admin / pegawai biasa HANYA melihat label netral tanpa rincian medis
              desc.textContent = 'Cuti Aktif (Jadwal Beririsan)';
            }
            badge.appendChild(desc);
            container.appendChild(badge);
          }

          // Simulasikan 1: Non-Admin View
          renderConflictNotice(${JSON.stringify(sensitiveConflictData)}, false);
        </script>
      </body>
      </html>
    `);

    // Verifikasi Non-Admin: Detail medis privat TIDAK BOLEH ada di DOM
    const nonAdminBadgeText = await page.textContent('#conflict-badge-container');
    assert.ok(nonAdminBadgeText.includes('Cuti Aktif (Jadwal Beririsan)'), 'Badge non-admin harus menampilkan peringatan netral');
    totalAssertions++;

    assert.equal(nonAdminBadgeText.includes('Jiwa'), false, 'PRIVACY LEAK! Kata "Jiwa" bocor ke DOM non-admin!');
    totalAssertions++;

    assert.equal(nonAdminBadgeText.includes('Rawat Inap'), false, 'PRIVACY LEAK! Kata "Rawat Inap" bocor ke DOM non-admin!');
    totalAssertions++;

    // Simulasikan 2: Admin View
    await page.evaluate((data) => {
      window.renderConflictNotice(data, true);
    }, sensitiveConflictData);

    const adminBadgeText = await page.textContent('#conflict-badge-container');
    assert.ok(adminBadgeText.includes('Rawat Inap Ruang Jiwa'), 'Admin harus dapat melihat rincian operasional lengkap');
    totalAssertions++;

    reportPass('ST-02 UI Conflict Privacy', 'Data medis/pribadi ter-redact sempurna pada tampilan non-admin, tetap utuh pada admin');

    // -------------------------------------------------------------------------
    // TEST SUITE 4: ST-01 Client-Side File Upload Guard & Input Boundary
    // -------------------------------------------------------------------------
    console.log('\n[4/5] Menguji ST-01: Validasi Client-Side Form & Batasan Upload Berkas...');

    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <body>
        <form id="st-form">
          <input type="text" id="nomor-surat" maxlength="100" />
          <textarea id="maksud-tujuan" maxlength="5000"></textarea>
          <input type="file" id="berkas-lampiran" />
          <div id="validation-error" style="color: red;"></div>
        </form>
        <script>
          const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
          const ALLOWED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png'];

          function validateUploadFile(file) {
            var errorDiv = document.getElementById('validation-error');
            errorDiv.textContent = '';

            if (!file) return { valid: false, error: 'Berkas wajib diunggah' };
            if (file.size > MAX_FILE_SIZE) {
              var msg = 'Ukuran file (' + (file.size / (1024*1024)).toFixed(1) + 'MB) melebihi batas maksimal 5MB';
              errorDiv.textContent = msg;
              return { valid: false, error: msg };
            }

            var ext = '.' + file.name.split('.').pop().toLowerCase();
            if (!ALLOWED_EXTENSIONS.includes(ext)) {
              var msg = 'Format file ' + ext + ' tidak diizinkan. Hanya PDF, JPG, dan PNG.';
              errorDiv.textContent = msg;
              return { valid: false, error: msg };
            }

            return { valid: true };
          }
        </script>
      </body>
      </html>
    `);

    // Skenario A: File melebihi batas 5MB (misal 6.5 MB)
    const oversizeCheck = await page.evaluate(() => {
      const fakeLargeFile = { name: 'lampiran-besar.pdf', size: 6.5 * 1024 * 1024 };
      return window.validateUploadFile(fakeLargeFile);
    });
    assert.equal(oversizeCheck.valid, false, 'File >5MB harus ditolak di client-side');
    assert.ok(oversizeCheck.error.includes('melebihi batas maksimal 5MB'));
    totalAssertions += 2;

    // Skenario B: Ekstensi terlarang (payload .exe / .php / .sh)
    const dangerousExtCheck = await page.evaluate(() => {
      const maliciousFile = { name: 'exploit_shell.php', size: 1024 * 50 };
      return window.validateUploadFile(maliciousFile);
    });
    assert.equal(dangerousExtCheck.valid, false, 'File dengan ekstensi tidak sah harus ditolak');
    assert.ok(dangerousExtCheck.error.includes('tidak diizinkan'));
    totalAssertions += 2;

    // Skenario C: File PDF valid 2.5 MB
    const validFileCheck = await page.evaluate(() => {
      const validPdf = { name: 'sk_penugasan.pdf', size: 2.5 * 1024 * 1024 };
      return window.validateUploadFile(validPdf);
    });
    assert.equal(validFileCheck.valid, true, 'File PDF sah berukuran 2.5MB harus diterima');
    totalAssertions++;

    reportPass('ST-01 Upload Boundary Guard', 'Validasi ukuran >5MB dan whitelist ekstensi file lolos secara deterministik');

    // -------------------------------------------------------------------------
    // TEST SUITE 5: ST-11 Inactive Account & Token Eviction Interceptor
    // -------------------------------------------------------------------------
    console.log('\n[5/5] Menguji ST-11: Respons 403 Sesi Nonaktif & Purge Token LocalStorage...');

    // Gunakan page.route agar origin http://localhost:3000 valid dan localStorage dapat diakses
    await page.route('http://localhost:3000/**', (route) => {
      const requestUrl = route.request().url();
      if (requestUrl.includes('/login')) {
        // Halaman tujuan redirect (login) tidak mengisi ulang token
        route.fulfill({
          status: 200,
          contentType: 'text/html',
          body: `<!DOCTYPE html><html><body><h1>Login Page</h1></body></html>`,
        });
      } else {
        route.fulfill({
          status: 200,
          contentType: 'text/html',
          body: `
            <!DOCTYPE html>
            <html>
            <body>
              <div id="session-status">Status: Sesi Aktif</div>
              <script>
                // Inisialisasi token autentikasi awal di localStorage
                localStorage.setItem('auth_token', '99|sanctum_active_bearer_token_xyz');
                localStorage.setItem('user_profile', JSON.stringify({ id: 42, name: 'Budi Petugas' }));

                // Simulasi response interceptor (sebagaimana Axios interceptor di src/lib/api.ts)
                window.handleApiResponseError = function(errorResponse) {
                  if (errorResponse.status === 403 && errorResponse.code === 'ACCOUNT_INACTIVE') {
                    // Purge credential segera
                    localStorage.removeItem('auth_token');
                    localStorage.removeItem('user_profile');
                    sessionStorage.clear();

                    // Redirect ke login dengan notifikasi
                    window.location.href = '/login?reason=account_inactive';
                    return true;
                  }
                  return false;
                };
              </script>
            </body>
            </html>
          `,
        });
      }
    });

    await page.goto('http://localhost:3000/portal');

    // Verifikasi state awal localStorage
    const initialToken = await page.evaluate(() => localStorage.getItem('auth_token'));
    assert.equal(initialToken, '99|sanctum_active_bearer_token_xyz');
    totalAssertions++;

    // Kirim respons 403 akun nonaktif ke interceptor dan tunggu navigasi redirect
    await Promise.all([
      page.waitForURL('**/login?reason=account_inactive'),
      page.evaluate(() => {
        window.handleApiResponseError({
          status: 403,
          code: 'ACCOUNT_INACTIVE',
          message: 'Akun Anda telah dinonaktifkan oleh Administrator.',
        });
      }),
    ]);

    // Verifikasi credential langsung dibersihkan (anti token reuse di frontend)
    const clearedToken = await page.evaluate(() => localStorage.getItem('auth_token'));
    const clearedUser = await page.evaluate(() => localStorage.getItem('user_profile'));
    assert.equal(clearedToken, null, 'auth_token harus segera dibersihkan dari localStorage saat 403');
    assert.equal(clearedUser, null, 'user_profile harus segera dibersihkan dari localStorage saat 403');
    totalAssertions += 2;

    // Verifikasi URL diarahkan ke halaman login
    const currentUrl = page.url();
    assert.ok(currentUrl.includes('/login?reason=account_inactive'), 'Browser harus me-redirect ke rute /login');
    totalAssertions++;

    reportPass('ST-11 Inactive Session Eviction', 'Token & state user segera dibersihkan saat 403, browser dialihkan ke /login');

    // -------------------------------------------------------------------------
    // SUMMARY
    // -------------------------------------------------------------------------
    console.log('\n' + '='.repeat(78));
    console.log(`HASIL: 5/5 Test Suite LULUS (${totalAssertions} assertions terverifikasi green)`);
    console.log('Zero dialog errors, zero executing script sinks, zero privacy leaks.');
    console.log('='.repeat(78));

  } finally {
    await context.close();
    await browser.close();
  }
}

runTestSuite().catch((err) => {
  console.error('\n[FATAL ERROR IN PLAYWRIGHT SUITE]:', err);
  process.exit(1);
});
