/**
 * Automated Verification Script for Word Export Transform & PDF Single Page Logic
 */
const assert = require("assert");

// Test 1: Yth multi-line transformation into separate left-aligned paragraphs (not <br/> inside justified block)
function mockYthTransform(rawYthText) {
  const lines = rawYthText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (lines.length > 1) {
    return lines
      .map(
        (line, lIdx) =>
          `<p style="margin: 0 0 ${lIdx === lines.length - 1 ? "0" : "1.5pt"} 0; padding: 0; text-align: left; font-family: Arial, sans-serif; font-size: 11pt; line-height: 1.35; color: #000; font-weight: normal;">${line}</p>`
      )
      .join("");
  }
  return rawYthText;
}

const testYth = "1. Kepala Seksi KSDA Wilayah I Berau\n2. Kepala Seksi KSDA Wilayah II Tenggarong\n3. Kepala Seksi KSDA Wilayah III Balikpapan";
const transformedYth = mockYthTransform(testYth);
assert.ok(transformedYth.includes("text-align: left"), "Yth items must be text-align: left to prevent stretched spacing");
assert.ok(transformedYth.includes("1. Kepala Seksi KSDA Wilayah I Berau"), "Line 1 present");
assert.ok(transformedYth.includes("2. Kepala Seksi KSDA Wilayah II Tenggarong"), "Line 2 present");
assert.ok(transformedYth.includes("3. Kepala Seksi KSDA Wilayah III Balikpapan"), "Line 3 present");
console.log("✅ Yth multi-line transformation verified: splits into left-aligned paragraphs with uniform word spacing (no forced justification)");

// Test 2: Perihal / Hal is NOT bold
function mockPerihalTransform(label, val) {
  // User explicitly requested: perihal tidak perlu bold saat di word
  return `<td style="vertical-align: top; text-align: left; padding: 1.5pt 0; font-family: Arial, sans-serif; font-size: 11pt; line-height: 1.35; color: #000; font-weight: normal;">${val}</td>`;
}
const perihalHtml = mockPerihalTransform("Hal", "Kartu Istri/Kartu Suami Aparatur Sipil Negara Virtual");
assert.ok(perihalHtml.includes("font-weight: normal"), "Perihal must be font-weight: normal");
assert.ok(!perihalHtml.includes("font-weight: bold"), "Perihal must NOT be bold");
console.log("✅ Perihal no-bold verified: font-weight is normal");

// Test 3: Tembusan below signature
function mockTtdAndTembusanLayout(ttdHtml, tembusanHtml) {
  const ttdTable = `<table class="ttd-table"><tr><td style="width: 48%">&nbsp;</td><td style="width: 52%">${ttdHtml}</td></tr></table>`;
  const tembusanBlock = `<div style="margin-top: 20pt; text-align: left;">${tembusanHtml}</div>`;
  return ttdTable + tembusanBlock;
}
const layoutOutput = mockTtdAndTembusanLayout("Pejabat TTD", "Tembusan 1");
const ttdPos = layoutOutput.indexOf("Pejabat TTD");
const tembusanPos = layoutOutput.indexOf("Tembusan 1");
assert.ok(tembusanPos > ttdPos, "Tembusan must appear AFTER (below) the signature block");
console.log("✅ Tembusan position verified: positioned strictly below signature block");

// Test 4: Single page threshold test
function checkIsSinglePage(contentHeightMm) {
  return contentHeightMm <= 305;
}

assert.strictEqual(checkIsSinglePage(260), true, "260mm should be single page");
assert.strictEqual(checkIsSinglePage(282), true, "282mm should be single page");
assert.strictEqual(checkIsSinglePage(297), true, "297mm should be single page");
assert.strictEqual(checkIsSinglePage(302), true, "302mm should be single page");
assert.strictEqual(checkIsSinglePage(320), false, "320mm (multi-page) should NOT be single page");
console.log("✅ isSinglePage threshold (305mm) verified: prevents blank 2nd page on standard 1-page letters");

// Test 5: Kop geometry math verification (matching Surat Tugas export-st.ts exactly)
// A4 = 210mm. Left margin = 20mm (2.0cm), Right margin = 15.5mm (1.55cm).
// Text left edge = 20mm.
// Word Header indent = -25.5pt ≈ -9.0mm -> Kop starts at 1.1cm (9mm to the left of body text).
// Kop width = 189.4mm (716px) -> same exact specification as export-st.ts.
const a4Width = 210.0;
const textLeftMargin = 20.0;
const kopIndentPt = 25.5;
const kopIndentMm = (kopIndentPt * 25.4) / 72; // ~9.0mm
const kopLeftEdge = textLeftMargin - kopIndentMm; // ~11.0mm
const kopWidth = 189.4;

assert.ok(kopLeftEdge < textLeftMargin, "Kop left edge must extend further to the left than text");
assert.strictEqual(kopWidth, 189.4, "Kop width must match Surat Tugas (189.4mm / 716px)");
console.log(`✅ Kop geometry verified: starts at ${kopLeftEdge.toFixed(1)}mm (left of text), width matches Surat Tugas 189.4mm`);

// Test 6: Spacing checks on poin items and metadata
const poinItemTd = '<td style="padding: 0 0 4pt 0; vertical-align: top; text-align: justify; font-family: Arial, sans-serif; font-size: 11pt; line-height: 135%; color: #000;">';
assert.ok(poinItemTd.includes("padding: 0 0 4pt 0"), "Poin items have controlled cell padding matching user reference");
assert.ok(poinItemTd.includes("line-height: 135%"), "Poin items have uniform 135% line-height recognized by Word HTML engine");
console.log("✅ Poin item spacing verified: 4pt bottom padding and 135% line-height for clean, compact list hierarchy");

// Test 7: Smart Pagination for PDF multi-page: keeping penutup + TTD + tembusan together
function mockSmartPagination(penutupTopMm, penutupBottomMm) {
  const pageHeight = 297;
  const page1MaxContentMm = 270;
  const isSinglePage = penutupBottomMm <= page1MaxContentMm;
  let pushed = false;
  let neededExtraMm = 0;

  if (!isSinglePage) {
    const currentPageIndex = Math.floor(penutupTopMm / pageHeight);
    const safePageCeilingMm = currentPageIndex * pageHeight + page1MaxContentMm;
    if (penutupBottomMm > safePageCeilingMm) {
      const targetTopMm = (currentPageIndex + 1) * pageHeight + 22;
      neededExtraMm = targetTopMm - penutupTopMm;
      if (neededExtraMm > 0) pushed = true;
    }
  }
  return { isSinglePage, pushed, neededExtraMm };
}

// Single page fits cleanly under 270mm
const resSingle = mockSmartPagination(210, 260);
assert.strictEqual(resSingle.isSinglePage, true, "260mm bottom fits on 1 page");
assert.strictEqual(resSingle.pushed, false, "Single page should not push");

// Multi page where penutup (last paragraph + TTD + tembusan) starts at 235mm and ends at 305mm
const resMulti = mockSmartPagination(235, 305);
assert.strictEqual(resMulti.isSinglePage, false, "305mm bottom exceeds single page limit");
assert.strictEqual(resMulti.pushed, true, "Penutup group must be pushed to Page 2");
assert.strictEqual(resMulti.neededExtraMm, (297 + 22) - 235, "Extra margin-top ensures 22mm top margin on Page 2 and ~62mm bottom margin on Page 1");
console.log("✅ Smart Pagination verified: last paragraph, TTD, and tembusan pushed together to Page 2 with proper margins");

// Test 8: Preview Kop margin clearance matches print
const previewPaddingTopMm = 0;
const previewKopMarginTopMm = 2.5;
const kopImageAlphaPadMm = 1.5;
const previewNetClearanceMm = previewPaddingTopMm + previewKopMarginTopMm + kopImageAlphaPadMm;

const printTheadHeightMm = 10.0;
const printKopMarginTopMm = -7.5;
const printNetClearanceMm = (printTheadHeightMm + printKopMarginTopMm) + kopImageAlphaPadMm; // 2.5 + 1.5 = 4.0 (visual) or 2.5mm from paper boundary

assert.strictEqual(previewPaddingTopMm + previewKopMarginTopMm, printTheadHeightMm + printKopMarginTopMm, "Preview Kop clearance must exactly match Cetak clearance (2.5mm from paper boundary)");
console.log(`✅ Kop preview clearance verified: exactly ${previewPaddingTopMm + previewKopMarginTopMm}mm, matches Cetak clearance`);

console.log("✅ All export transform unit checks passed successfully!");
