/* eslint-disable @typescript-eslint/no-require-imports -- Runnable Node regression check for Persuratan UI/UX parity. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const srcRoot = path.join(__dirname, '../src');
const read = (relPath) => fs.readFileSync(path.join(srcRoot, relPath), 'utf8');

function srgbToLinear(c) {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

function luminance(hex) {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return 0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b);
}

function contrastRatio(hex1, hex2) {
  const l1 = luminance(hex1);
  const l2 = luminance(hex2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

// 1. Token & WCAG contrast verification in globals.css
const globalsCss = read('app/globals.css');
assert(
  globalsCss.includes('[data-module="persuratan"]'),
  'globals.css must declare [data-module="persuratan"] token scope.'
);
assert(
  globalsCss.includes('--ds-accent-solid: #0f766e;') &&
    globalsCss.includes('--ds-accent-hover: #115e59;') &&
    globalsCss.includes('--ds-accent-active: #134e4a;') &&
    globalsCss.includes('--ds-accent-soft: #f0fdfa;') &&
    globalsCss.includes('--ds-accent-soft-border: #99f6e4;'),
  'globals.css must define light Teal tokens for Persuratan.'
);
assert(
  globalsCss.includes('--ds-accent-solid: #2dd4bf;') &&
    globalsCss.includes('--ds-accent-hover: #5eead4;') &&
    globalsCss.includes('--ds-accent-active: #99f6e4;') &&
    globalsCss.includes('--ds-accent-soft: #042f2e;') &&
    globalsCss.includes('--ds-accent-soft-border: #115e59;'),
  'globals.css must define dark Teal tokens for Persuratan.'
);

assert(
  contrastRatio('#0f766e', '#ffffff') >= 4.5,
  'Light Teal primary (#0f766e on #ffffff) must pass WCAG AA 4.5:1.'
);
assert(
  contrastRatio('#5eead4', '#18181b') >= 4.5,
  'Dark Teal accent text (#5eead4 on #18181b) must pass WCAG AA 4.5:1.'
);
assert(
  contrastRatio('#2dd4bf', '#0f172a') >= 4.5,
  'Dark Teal solid button (#2dd4bf with #0f172a text) must pass WCAG AA 4.5:1.'
);

// 2. Ponytail CSS reuse (no new CSS file, shared rules in surat-tugas.css and kepegawaian.css)
assert(
  !fs.existsSync(path.join(srcRoot, 'app/surat/persuratan.css')),
  'Ponytail rule: do not create a duplicate persuratan.css file; reuse shared rules.'
);
const suratTugasCss = read('app/surat-tugas/surat-tugas.css');
assert(
  suratTugasCss.includes(':is(.st-ui, .kpg-ui, .psr-ui)'),
  'surat-tugas.css must share control foundation rules with .psr-ui.'
);
const kepegawaianCss = read('app/kepegawaian/kepegawaian.css');
assert(
  kepegawaianCss.includes(':is(.kpg-shell, .psr-shell)') &&
    kepegawaianCss.includes(':is(.kpg-ui.kpg-dashboard, .psr-ui.psr-dashboard)'),
  'kepegawaian.css must share shell and dashboard soft-badge rules with Persuratan.'
);

// 3. Sidebar & Shell Parity in app/surat/layout.tsx (single Teal Tua accent color matching BMN & Kepegawaian single-module shell standard)
const layoutSource = read('app/surat/layout.tsx');
assert(
  layoutSource.includes('data-module="persuratan"') &&
    layoutSource.includes('psr-shell') &&
    layoutSource.includes('reducedMotion="user"') &&
    layoutSource.includes('stiffness: 450, damping: 35') &&
    layoutSource.includes('shadow-2xs') &&
    layoutSource.includes('transition-[transform,width,visibility] duration-150 ease-out') &&
    layoutSource.includes('bg-[var(--ds-accent-soft)]') &&
    layoutSource.includes('border-[var(--ds-accent-soft-border)]') &&
    layoutSource.includes('text-[var(--ds-accent-fg)] font-bold') &&
    layoutSource.includes('w-1.5 h-1.5 rounded-full bg-[var(--ds-accent-solid)]') &&
    layoutSource.includes('text-[var(--ds-fg-secondary)]') &&
    !layoutSource.includes('CATEGORY_STYLES') &&
    layoutSource.includes('event.key === "Escape"') &&
    layoutSource.includes('menuButton.current?.focus()'),
  'surat/layout.tsx must use single Teal Tua accent color for sidebar matching BMN and Kepegawaian shell standard.'
);

// 4. Hub & Dashboard parity (including canonical Dashboard Kepegawaian header standard across BMN & Persuratan)
const hubPageSource = read('app/surat/page.tsx');
const hubComponentsSource = read('app/surat/_components/SuratHubComponents.tsx');
const bmnPageSource = read('app/bmn/page.tsx');
const kepegawaianPageSource = read('app/kepegawaian/page.tsx');
assert(
  hubPageSource.includes('psr-ui psr-dashboard') &&
    hubPageSource.includes('kpg-support-icon') &&
    hubComponentsSource.includes('kpg-support-badge'),
  'surat/page.tsx and SuratHubComponents.tsx must use .psr-ui.psr-dashboard and soft support icon/badge classes.'
);
assert(
  kepegawaianPageSource.includes('text-xl md:text-2xl font-bold') &&
    kepegawaianPageSource.includes('Dashboard Kepegawaian') &&
    bmnPageSource.includes('text-xl md:text-2xl font-bold text-[var(--ds-fg)] tracking-tight') &&
    bmnPageSource.includes('Dashboard BMN') &&
    !bmnPageSource.includes('>Barang Milik Negara</span>') &&
    hubComponentsSource.includes('text-xl md:text-2xl font-bold text-[var(--ds-fg)] tracking-tight') &&
    hubComponentsSource.includes('Dashboard Persuratan'),
  'Dashboard BMN and Dashboard Persuratan must follow the canonical Dashboard Kepegawaian header anatomy and sizing.'
);
assert(
  hubComponentsSource.includes('isError') &&
    hubComponentsSource.includes('Coba lagi') &&
    hubComponentsSource.includes('kpg-support-icon') &&
    !hubComponentsSource.includes('text-emerald-') &&
    !hubPageSource.includes('text-emerald-') &&
    hubComponentsSource.includes('text-[var(--ds-accent-fg)]') &&
    hubComponentsSource.includes('text-blue-700 dark:text-blue-300') &&
    hubComponentsSource.includes('text-amber-700 dark:text-amber-300'),
  'SuratHubComponents.tsx and surat/page.tsx must provide error recovery and strictly use the 3-color category palette (Teal, Blue, Amber).'
);

// 5. Surat Masuk & Popover/Modal portal token propagation + 1366x768 fit
const suratMasukSource = read('app/surat/masuk/page.tsx');
assert(
  suratMasukSource.includes('psr-ui') &&
    suratMasukSource.includes('contentModule: "persuratan"') &&
    suratMasukSource.includes('Coba lagi') &&
    !suratMasukSource.includes('min-w-[1050px]'),
  'surat/masuk/page.tsx must use psr-ui, persuratan confirm scope, error retry, and fit 1366x768.'
);

const sifatPopoverSource = read('app/surat/masuk/_components/SifatCellPopover.tsx');
assert(
  sifatPopoverSource.includes('data-module="persuratan"') &&
    sifatPopoverSource.includes('psr-ui') &&
    sifatPopoverSource.includes('aria-pressed'),
  'SifatCellPopover.tsx must propagate data-module="persuratan" and keyboard-accessible buttons.'
);

const diteruskanPopoverSource = read('app/surat/masuk/_components/DiteruskanCellPopover.tsx');
assert(
  diteruskanPopoverSource.includes('data-module="persuratan"') &&
    diteruskanPopoverSource.includes('psr-ui') &&
    diteruskanPopoverSource.includes('useKepegawaianTabs') &&
    diteruskanPopoverSource.includes('tabs.tabListProps') &&
    diteruskanPopoverSource.includes('aria-pressed'),
  'DiteruskanCellPopover.tsx must propagate data-module="persuratan" and use accessible tabs/buttons.'
);

const exportModalSource = read('app/surat/masuk/_components/ExportSuratMasukModal.tsx');
const batchPrintModalSource = read('app/surat/masuk/_components/BatchPrintDisposisiModal.tsx');
assert(
  exportModalSource.includes('KepegawaianDialog') &&
    exportModalSource.includes('module="persuratan"'),
  'ExportSuratMasukModal.tsx must reuse KepegawaianDialog with module="persuratan".'
);
assert(
  batchPrintModalSource.includes('KepegawaianDialog') &&
    batchPrintModalSource.includes('module="persuratan"') &&
    batchPrintModalSource.includes('id="batch-print-portal-root"'),
  'BatchPrintDisposisiModal.tsx must reuse KepegawaianDialog while preserving #batch-print-portal-root.'
);

// 6. Surat Keluar, TemplatePickerModal, Dinas Generator, and Settings parity
const suratKeluarSource = read('app/surat/keluar/page.tsx');
assert(
  suratKeluarSource.includes('psr-ui') &&
    suratKeluarSource.includes('useKepegawaianTabs') &&
    suratKeluarSource.includes('KepegawaianTabContent') &&
    suratKeluarSource.includes('useDialogFocusReturn') &&
    suratKeluarSource.includes('data-module="persuratan"') &&
    suratKeluarSource.includes('Perlu Nomor Definitif') &&
    suratKeluarSource.includes('Coba lagi'),
  'surat/keluar/page.tsx must use psr-ui, accessible tabs, dialog focus return, and error retry.'
);

const templatePickerSource = read('app/surat/_components/TemplatePickerModal.tsx');
assert(
  templatePickerSource.includes('data-module="persuratan"') &&
    templatePickerSource.includes('psr-ui') &&
    templatePickerSource.includes('useKepegawaianTabs') &&
    templatePickerSource.includes('useDialogFocusReturn'),
  'TemplatePickerModal.tsx must use data-module="persuratan", accessible tabs, and focus return.'
);

const dinasPageSource = read('app/surat/keluar/dinas/page.tsx');
assert(
  dinasPageSource.includes('psr-ui') &&
    dinasPageSource.includes('data-module="persuratan"'),
  'surat/keluar/dinas/page.tsx must use psr-ui and propagate data-module="persuratan" to dropdown portals.'
);

const settingsPageSource = read('app/surat/settings/page.tsx');
assert(
  settingsPageSource.includes('psr-ui') &&
    settingsPageSource.includes('useConfirm') &&
    settingsPageSource.includes('KepegawaianDialog') &&
    settingsPageSource.includes('useKepegawaianTabs') &&
    !settingsPageSource.includes('if (confirm('),
  'surat/settings/page.tsx must replace native confirm() and custom modal divs with useConfirm and KepegawaianDialog.'
);

// 7. Physical print paper components must remain white/black in both themes
const disposisiSheetSource = read('app/surat/_components/LembarDisposisiSheet.tsx');
const suratDinasDocSource = read('app/surat/_components/SuratDinasDocument.tsx');
assert(
  disposisiSheetSource.includes('bg-white') && disposisiSheetSource.includes('text-black'),
  'LembarDisposisiSheet.tsx must stay white/black for physical 2-Up printing.'
);
assert(
  suratDinasDocSource.includes('bg-white') &&
    suratDinasDocSource.includes('text-black') &&
    !suratDinasDocSource.includes('shadow-xl ring-1'),
  'SuratDinasDocument.tsx must stay white/black for A4 official document printing without heavy border shadows.'
);

// 8. Verify no undefined --ds-* tokens or solid-on-solid contrast bugs exist in app/surat
function listTsxFiles(dir) {
  let out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out = out.concat(listTsxFiles(full));
    else if (full.endsWith('.tsx')) out.push(full);
  }
  return out;
}

const forbiddenTokens = [
  '--ds-accent-border',
  '--ds-accent-text',
  '--ds-accent-solid-hover',
  '--ds-surface-hover',
  '--ds-fg-subtle',
];

for (const file of listTsxFiles(path.join(srcRoot, 'app/surat'))) {
  const content = fs.readFileSync(file, 'utf8');
  const rel = path.relative(srcRoot, file);
  for (const bad of forbiddenTokens) {
    assert(
      !content.includes(bad),
      `${rel} must not reference undefined token ${bad}.`
    );
  }
}

console.log('persuratan-ui.cjs: ALL CHECKS PASSED');
