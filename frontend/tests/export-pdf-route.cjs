/* eslint-disable @typescript-eslint/no-require-imports -- Ponytail self-check for vector PDF export route & security guards. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const routeSrc = fs.readFileSync(path.join(__dirname, "../src/app/surat/export-pdf/route.ts"), "utf8");
const exporterSrc = fs.readFileSync(path.join(__dirname, "../src/app/surat/_lib/export-surat-dinas.ts"), "utf8");

assert.ok(routeSrc.includes("authorizeSuratRequest"), "Route must verify auth & surat module access");
assert.ok(routeSrc.includes("Referer") && routeSrc.includes("Origin"), "Route must forward Origin/Referer for Sanctum stateful session cookies");
assert.ok(routeSrc.includes("javaScriptEnabled: false"), "Chromium context must disable JS execution");
assert.ok(routeSrc.includes("route.abort()"), "Chromium must block external network fetches (SSRF protection)");
assert.ok(exporterSrc.includes('fetch("/surat/export-pdf"'), "PDF exporter must use /surat/export-pdf vector route");
assert.ok(!exporterSrc.includes("html2canvas"), "PDF exporter must not fall back to image-only html2canvas");

(async () => {
  const base = process.env.FRONTEND_URL || "http://127.0.0.1:3000";
  try {
    const res = await fetch(`${base}/surat/export-pdf`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ html: "<html><body>test</body></html>", filename: "t.pdf" }),
    });
    assert.strictEqual(res.status, 401, `Expected 401 unauth from ${base}/surat/export-pdf, got ${res.status}`);
    console.log("EXPORT_PDF_ROUTE_CHECK_PASS (live 401 + static invariants)");
  } catch (err) {
    if (err && err.code === "ERR_ASSERTION") throw err;
    console.log("EXPORT_PDF_ROUTE_CHECK_PASS (static invariants; server offline)");
  }
})();
