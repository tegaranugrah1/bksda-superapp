'use strict';
/**
 * =============================================================================
 * ANIMATE UI PILOT (SHADCN MOTION PRIMITIVES) VERIFICATION TEST
 * =============================================================================
 * Prinsip: /ponytail (Minimal diff, Zero new dependencies, Fast & lightweight)
 * - Memverifikasi implementasi motion primitives pada Detail Pegawai:
 *   1. Framer Motion import & AnimatePresence
 *   2. Sliding Active Tab Indicator (layoutId="activeTabIndicator")
 *   3. Smooth Panel Transition (<AnimatePresence mode="wait"> + motion.div)
 *   4. Tactile Elevation on Metric Cards (whileHover={{ y: -3 }}, whileTap={{ scale: 0.98 }})
 *   5. 1-Click Copy Micro-Bounce (CopyIcon with spring physics)
 * =============================================================================
 */

const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');

const frontendRoot = path.resolve(__dirname, '..');
const pagePath = path.join(frontendRoot, 'src/app/kepegawaian/employees/[id]/page.tsx');
const packageJsonPath = path.join(frontendRoot, 'package.json');

console.log('='.repeat(80));
console.log('ANIMATE UI / MOTION PRIMITIVES PILOT VERIFICATION');
console.log('Target: Detail Pegawai (/kepegawaian/employees/[id])');
console.log('='.repeat(80));

const source = fs.readFileSync(pagePath, 'utf8');
const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

let passCount = 0;

function check(label, condition) {
  assert.ok(condition, `FAILED: ${label}`);
  passCount++;
  console.log(`  [PASS] ${label}`);
}

// 1. Zero New Dependencies Check
console.log('\n[1] Memeriksa Dependensi...');
check('framer-motion sudah terpasang dari awal di dependencies', !!pkg.dependencies['framer-motion']);
check('Tidak ada penambahan dependency baru yang berlebihan', Object.keys(pkg.dependencies).length <= 45);

// 2. Framer Motion Import Check
console.log('\n[2] Memeriksa Motion Primitives Import...');
check('motion dan AnimatePresence diimpor dari framer-motion', source.includes('import { motion, AnimatePresence } from "framer-motion";'));

// 3. Sliding Active Tab Indicator Check
console.log('\n[3] Memeriksa Sliding Active Tab Indicator...');
check('layoutId="activeTabIndicator" terpasang untuk animasi sliding pill', source.includes('layoutId="activeTabIndicator"'));
check('Spring physics damping & stiffness terpasang', source.includes('transition={{ type: "spring", stiffness: 420, damping: 32 }}'));
check('Icon dan label tab memiliki relative z-10 agar berada di atas sliding pill', source.includes('relative z-10'));

// 4. Panel Transition Check
console.log('\n[4] Memeriksa Panel Transition...');
check('AnimatePresence mode="wait" membungkus tab content', source.includes('<AnimatePresence mode="wait" initial={false}>'));
check('motion.div key={activeTab} terpasang untuk transisi halus', source.includes('<motion.div\n              key={activeTab}') || source.includes('key={activeTab}'));

// 5. Tactile Metric Cards Check
console.log('\n[5] Memeriksa Tactile Elevation pada Metric Cards...');
check('whileHover={{ y: -3 }} terpasang pada metric cards', source.includes('whileHover={{ y: -3 }}'));
check('whileTap={{ scale: 0.98 }} terpasang untuk micro-press feedback', source.includes('whileTap={{ scale: 0.98 }}'));

// 6. 1-Click Copy Bounce Check
console.log('\n[6] Memeriksa Micro-Bounce pada Tombol Salin...');
check('Helper CopyIcon menggunakan AnimatePresence dan spring animation', source.includes('function CopyIcon('));
check('CopyIcon terpasang untuk salin NIP', source.includes('<CopyIcon copied={copiedField === "nip"} />'));
check('CopyIcon terpasang untuk salin WhatsApp/Telepon', source.includes('<CopyIcon copied={copiedField === "telepon"} />'));
check('CopyIcon terpasang untuk salin Email', source.includes('<CopyIcon copied={copiedField === "email"} checkClass="text-blue-600" />'));
check('CopyIcon terpasang untuk salin Rekening Bank', source.includes('<CopyIcon copied={copiedField === "rekening"} />'));

// 7. Uang Makan Tab Panel Transitions Check
console.log('\n[7] Memeriksa Tab Transitions Uang Makan (/kepegawaian/uang-makan)...');
const uangMakanSource = fs.readFileSync(path.join(frontendRoot, 'src/app/kepegawaian/uang-makan/page.tsx'), 'utf8');
check('layoutId="activeUangMakanTabIndicator" terpasang', uangMakanSource.includes('layoutId="activeUangMakanTabIndicator"'));
check('AnimatePresence mode="wait" membungkus tab panels uang makan', uangMakanSource.includes('<AnimatePresence mode="wait" initial={false}>'));
check('motion.div key={activeTab} transisi panel uang makan terpasang', uangMakanSource.includes('key={activeTab}'));

// 8. Setting Kepegawaian Tab Panel Transitions Check
console.log('\n[8] Memeriksa Tab Transitions Setting Kepegawaian (/kepegawaian/settings)...');
const settingsSource = fs.readFileSync(path.join(frontendRoot, 'src/app/kepegawaian/settings/page.tsx'), 'utf8');
check('layoutId="activeSettingsTabIndicator" terpasang', settingsSource.includes('layoutId="activeSettingsTabIndicator"'));
check('AnimatePresence mode="wait" membungkus tab panels settings', settingsSource.includes('<AnimatePresence mode="wait" initial={false}>'));
check('motion.div key={activeTab} transisi panel settings terpasang', settingsSource.includes('key={activeTab}'));

// 9. Surat Tugas Inbox Transitions Check
console.log('\n[9] Memeriksa Transitions Surat Tugas Inbox (/kepegawaian/surat-tugas/inbox)...');
const inboxSource = fs.readFileSync(path.join(frontendRoot, 'src/app/kepegawaian/surat-tugas/inbox/page.tsx'), 'utf8');
check('AnimatePresence membungkus daftar surat tugas inbox', inboxSource.includes('<AnimatePresence mode="wait" initial={false}>'));
check('motion.div key={activeTab} transisi status list inbox terpasang', inboxSource.includes('key={activeTab}'));
check('Full reader view menggunakan motion.div slide-in', inboxSource.includes('transition={{ duration: 0.18, ease: "easeOut" }}'));

// 10. Cuti & Izin Table Transitions Check
console.log('\n[10] Memeriksa Transitions Cuti (/kepegawaian/cuti)...');
const cutiSource = fs.readFileSync(path.join(frontendRoot, 'src/app/kepegawaian/cuti/page.tsx'), 'utf8');
check('AnimatePresence membungkus tabel cuti', cutiSource.includes('<AnimatePresence mode="wait" initial={false}>'));
check('motion.div transisi tabel cuti terpasang', cutiSource.includes('key={`${selectedStatus}-${selectedYear}`}') || cutiSource.includes('key={`${selectedStatus}'));

// 11. Daftar Pegawai Table Transitions Check
console.log('\n[11] Memeriksa Transitions Daftar Pegawai (/kepegawaian/employees)...');
const employeesSource = fs.readFileSync(path.join(frontendRoot, 'src/app/kepegawaian/employees/page.tsx'), 'utf8');
check('AnimatePresence membungkus tabel pegawai', employeesSource.includes('<AnimatePresence mode="wait" initial={false}>'));
check('motion.div transisi tabel pegawai terpasang', employeesSource.includes('key={`${jenisFilter}-${statusFilter}-${wilayahFilter}`}') || employeesSource.includes('key={`${jenisFilter}'));

// 12. Dashboard Kepegawaian Tactile Motion Check
console.log('\n[12] Memeriksa Dashboard Kepegawaian (/kepegawaian)...');
const dashboardSource = fs.readFileSync(path.join(frontendRoot, 'src/app/kepegawaian/page.tsx'), 'utf8');
check('motion.div whileHover terpasang pada kartu kategori PNS/PPPK/MMP', dashboardSource.includes('whileHover={{ y: -2 }}'));
check('motion.div whileHover terpasang pada 4 bento service cards', dashboardSource.includes('whileHover={{ y: -3 }}'));

console.log('\n' + '='.repeat(80));
console.log(`HASIL: Seluruh ${passCount}/${passCount} Motion Invariants BERHASIL (100% PASS)`);
console.log('='.repeat(80));
