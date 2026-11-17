const path = require('node:path');
const Module = require('node:module');

const frontendRoot = path.resolve(__dirname, '..');
const frontendRequire = Module.createRequire(path.join(frontendRoot, 'package.json'));
const { chromium } = frontendRequire('playwright');

async function main() {
    const browser = await chromium.launch({
        executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
    });

    const context = await browser.newContext({
        viewport: { width: 1440, height: 900 }
    });

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
        { name: 'bksda_token', value: 'e2e_token', domain: 'localhost', path: '/' },
    ]);

    const page = await context.newPage();

    // Mock API
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
            body: JSON.stringify({
                data: [
                    { id: 'b1', nama: 'DATA TSL' },
                    { id: 'b2', nama: 'KONSERVASI KAWASAN' },
                    { id: 'b3', nama: 'PEMBERDAYAAN' },
                    { id: 'b4', nama: 'PEREDARAN TSL' },
                ]
            })
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
                ]
            })
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
                        bidang_id: 'b1',
                        judul_laporan: 'Laporan Rekapitulasi Realisasi Belanja Modal Satker BKSDA',
                        target_scope: 'restricted',
                        review_status: 'sesuai',
                        review_notes: 'Data terkonfirmasi valid dan lengkap.',
                        created_at: new Date().toISOString(),
                        is_mine: false,
                        is_read_by_me: true,
                        read_at: new Date().toISOString(),
                        uploader: { id: 2, name: 'Heryanto Sumanbowo', username: '198305282001121001' },
                        bidang: { id: 'b1', nama: 'DATA TSL' },
                        recipients_summary: [
                            { type: 'urusan', label: 'Urusan Keuangan & BMN' },
                            { type: 'user', label: 'Tegar Anugrah' },
                        ],
                        actions_allowed: { can_preview: true, can_download: true, can_review: true, can_delete: true },
                    },
                    {
                        id: 'rep-002',
                        bidang_id: 'b2',
                        judul_laporan: 'Laporan Hasil Monitoring Satwa Dilindungi Periode Q1',
                        target_scope: 'all',
                        review_status: 'terkirim',
                        created_at: new Date().toISOString(),
                        is_mine: true,
                        is_read_by_me: true,
                        uploader: { id: 1, name: 'Super Administrator', username: '198001012005011001' },
                        bidang: { id: 'b2', nama: 'KONSERVASI KAWASAN' },
                        recipients_summary: [],
                        actions_allowed: { can_preview: true, can_download: true, can_review: false, can_delete: true },
                    },
                ]
            })
        });
    });

    await page.route('**/api/dereporting/eksternals?*', route => {
        route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                data: [
                    { id: 'e1', status: 'Menunggu Tinjauan' },
                    { id: 'e2', status: 'Diterima' },
                ]
            })
        });
    });

    // 1. Dashboard
    console.log('Navigating to http://localhost:3000/dereporting...');
    await page.goto('http://localhost:3000/dereporting', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    const destDash = 'C:\\Users\\USER\\.gemini\\antigravity\\brain\\0d16b89b-13d8-4156-8565-5ffecddb9f93\\dereporting_cards_delicate_borders.png';
    await page.screenshot({ path: destDash, fullPage: true });
    console.log('Dashboard screenshot captured at:', destDash);

    // 2. Hover on first card
    const firstCard = page.locator('a:has-text("Laporan Internal")').first();
    if (await firstCard.isVisible()) {
        await firstCard.hover();
        await page.waitForTimeout(300);
        const destHover = 'C:\\Users\\USER\\.gemini\\antigravity\\brain\\0d16b89b-13d8-4156-8565-5ffecddb9f93\\dereporting_card_hover.png';
        await page.screenshot({ path: destHover });
        console.log('Hover screenshot captured at:', destHover);
    }

    // 3. Internal Page
    console.log('Navigating to http://localhost:3000/dereporting/internal...');
    await page.goto('http://localhost:3000/dereporting/internal', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    const destInternal = 'C:\\Users\\USER\\.gemini\\antigravity\\brain\\0d16b89b-13d8-4156-8565-5ffecddb9f93\\dereporting_internal_delicate_borders.png';
    await page.screenshot({ path: destInternal, fullPage: true });
    console.log('Internal page screenshot captured at:', destInternal);

    await browser.close();
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
