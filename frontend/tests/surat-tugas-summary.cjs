const assert = require("node:assert/strict");
const { extractSuratTugasDalamRangka, formatSumberDanaLabel } = require("../src/lib/letter-utils.ts");

const realMultiLine =
  "Melaksanakan Perjalanan Dinas dari Samarinda ke Kabupate Kutai Barat dalam rangka Patroli Pengamanan di Suaka Badak Kelian, selama 6 (enam) hari terhitung mulai tanggal 19 November 2026 sampai dengan 24 November 2026;\n" +
  "Segala biaya yang timbul akibat Surat Tugas ini dibebankan pada DIPA Balai KSDA Kalimantan Timur Ditjen KSDAE (693614) Tahun Anggaran 2026;\n" +
  "Membuat laporan tertulis paling lambat 7 (tujuh) hari kerja setelah selesainya kegiatan tersebut.";

assert.equal(extractSuratTugasDalamRangka(realMultiLine, "Kabupate Kutai Barat"), "Patroli Pengamanan");
assert.equal(
  extractSuratTugasDalamRangka(
    "Melaksanakan Perjalanan Dinas di Kutai Timur dalam rangka Patroli Terpadu di TN Kutai, selama 1 (satu) hari pada tanggal 18 November 2026;",
    "Kutai Timur"
  ),
  "Patroli Terpadu"
);
assert.equal(
  extractSuratTugasDalamRangka(
    "Melaksanakan Kegiatan Rapat Evaluasi pada Aula Balai di Samarinda, selama 1 (satu) hari pada tanggal 18 November 2026;",
    "Samarinda"
  ),
  "Rapat Evaluasi"
);
assert.equal(
  extractSuratTugasDalamRangka("Menugaskan Staf untuk Penyusunan Laporan Keuangan pada Ruang Arsip;", null),
  "Penyusunan Laporan Keuangan"
);

assert.equal(formatSumberDanaLabel("dipa", null, "DIPA Balai KSDA"), "DIPA Balai KSDA");
assert.equal(formatSumberDanaLabel("other", "Hibah WWF Indonesia", null), "Hibah WWF Indonesia");
assert.equal(formatSumberDanaLabel("dipa", null, null), "DIPA");
assert.equal(formatSumberDanaLabel(null, null, null), "");

console.log("surat-tugas-summary: OK");
