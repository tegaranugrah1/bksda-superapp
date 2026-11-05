/**
 * Helper untuk Export Dokumen Tata Naskah Dinas ke Microsoft Word (.doc) dan PDF (.pdf).
 * Dibangun dengan prinsip Ponytail (minimalis & efisien), 100% kompatibel dengan MS Word (MHTML table layout),
 * serta presisi A4 untuk berkas PDF (menghindari halaman kosong ke-2).
 */

function sanitizeFilenamePart(text: string, maxLen: number = 40): string {
  if (!text) return "Surat";
  const cleaned = text
    .replace(/[\r\n\t]/g, " ")
    .replace(/[/\\?%*:|"<>]/g, "-")
    .replace(/[^a-zA-Z0-9_\-.\s]/g, "")
    .trim()
    .replace(/\s+/g, "_")
    .slice(0, maxLen);
  return cleaned || "Surat";
}

export function buildSuratDinasFilename(
  nomor: string,
  templateType: string,
  perihal: string,
  ext: "doc" | "pdf"
): string {
  const safeNum = sanitizeFilenamePart(nomor || "DRAFT", 25);
  const safeTpl = sanitizeFilenamePart(templateType || "Surat_Dinas", 20);
  const safeHal = sanitizeFilenamePart(perihal || "Naskah_Dinas", 35);
  return `${safeTpl}_${safeNum}_${safeHal}.${ext}`;
}

function resolveAbsoluteUrl(url: string): string {
  if (!url) return "";
  if (/^https?:\/\//i.test(url) || url.startsWith("data:")) return url;
  if (typeof window !== "undefined") {
    return `${window.location.origin}${url.startsWith("/") ? "" : "/"}${url}`;
  }
  return url;
}

async function inlineImagesAsBase64(container: HTMLElement): Promise<void> {
  const imgs = Array.from(container.getElementsByTagName("img"));
  await Promise.all(
    imgs.map(async (img) => {
      const src = img.getAttribute("src");
      if (!src || src.startsWith("data:")) return;

      const absUrl = resolveAbsoluteUrl(src);
      if (!/^https?:\/\//i.test(absUrl)) return;

      try {
        const res = await fetch(absUrl, { credentials: "same-origin" });
        if (!res.ok) return;
        const blob = await res.blob();
        const reader = new FileReader();
        await new Promise<void>((resolve, reject) => {
          reader.onloadend = () => {
            if (typeof reader.result === "string") {
              img.setAttribute("src", reader.result);
            }
            resolve();
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      } catch {
        img.setAttribute("src", absUrl);
      }
    })
  );
}

/**
 * Transformasi elemen DOM clone agar kompatibel penuh dengan mesin render HTML Microsoft Word:
 * - Mengganti layout CSS flexbox dengan table HTML (Word tidak mendukung flexbox).
 * - Menata metadata (Yth, Dari, Hal, Lampiran, Tanggal) dalam tabel 3 kolom rapi.
 * - Mengubah butir penomoran (.poin-item) menjadi tabel 2 kolom agar nomor & teks tidak rapat/menempel.
 * - Menata Tembusan (kiri) dan Tanda Tangan (kanan) dalam tabel 2 kolom sejajar.
 */
function transformCloneForWord(clone: HTMLElement): void {
  // 1. Bersihkan elemen non-cetak, web spacers, dan atribut editing
  const removeSelectors = [
    ".bsre-placeholder",
    ".page-break-indicator",
    ".halaman-divider",
    ".print\\:hidden",
    "thead",
    "tfoot",
    "script",
    "iframe",
  ];
  clone.querySelectorAll(removeSelectors.join(",")).forEach((el) => el.remove());

  clone.querySelectorAll("*").forEach((el) => {
    el.removeAttribute("contenteditable");
    Array.from(el.attributes).forEach((attr) => {
      if (attr.name.toLowerCase().startsWith("on")) {
        el.removeAttribute(attr.name);
      }
    });
  });

  // 1b. Pastikan Judul Naskah (NOTA DINAS/MEMORANDUM) turun sedikit dari kop dan Nomor dekat dengan judul
  const titleBlocks = Array.from(
    clone.querySelectorAll(".nota-dinas-title-block, .text-center")
  );
  titleBlocks.forEach((tb) => {
    (tb as HTMLElement).style.textAlign = "center";
    (tb as HTMLElement).style.marginTop = "16pt"; // Breathing room dari kop
    (tb as HTMLElement).style.marginBottom = "6pt";

    const h2 = tb.querySelector("h2");
    if (h2) {
      h2.style.textAlign = "center";
      h2.style.margin = "0 0 3pt 0"; // Rapatkan di atas nomor
      h2.style.padding = "0";
      h2.style.lineHeight = "1.2";
      h2.style.fontSize = "12pt";
      h2.style.fontWeight = "bold";
    }

    const pNomor = tb.querySelector("p");
    if (pNomor) {
      pNomor.style.textAlign = "center";
      pNomor.style.margin = "0 0 18pt 0"; // Dekatkan dengan judul di atasnya, beri jeda leluasa ke tabel Yth
      pNomor.style.padding = "0";
      pNomor.style.lineHeight = "1.25";
      pNomor.style.fontSize = "11pt";
    }

    tb.querySelectorAll("span").forEach((child) => {
      const el = child as HTMLElement;
      if (!el.classList.contains("nota-dinas-nomor-wrapper") && !el.style.minWidth) {
        el.style.textAlign = "center";
      }
    });
  });

  // 2. Transformasi Metadata untuk Nota Dinas & Memorandum
  const metaContainers = Array.from(
    clone.querySelectorAll(".nota-dinas-meta, [data-meta='nota-dinas'], .space-y-1\\.5, .space-y-2, .space-y-2\\.5")
  );
  if (metaContainers.length === 0) {
    const allDivs = Array.from(clone.querySelectorAll("div"));
    const fallbackMeta = allDivs.find(
      (d) =>
        d.textContent?.includes("Yth.") &&
        d.textContent?.includes("Dari") &&
        d.children.length >= 3
    );
    if (fallbackMeta) metaContainers.push(fallbackMeta);
  }

  metaContainers.forEach((container) => {
    const rows = Array.from(container.children);
    if (rows.length === 0) return;

    const table = document.createElement("table");
    table.setAttribute(
      "style",
      "width: 100%; border: none; border-collapse: collapse; margin-bottom: 0; table-layout: fixed;"
    );

    let tableHtml = "";
    rows.forEach((row) => {
      const spans = Array.from(row.querySelectorAll("span"));
      if (spans.length >= 2) {
        const label = spans[0]?.textContent?.trim() || "";
        const colon = spans[1]?.textContent?.trim() || ":";
        const valSpan = spans[spans.length - 1];

        // Format multi-baris untuk Yth (tiap penerima menjadi baris paragraf kiri mandiri agar Word tidak force-justify spasi kata)
        const rawText = valSpan ? (valSpan.innerText || valSpan.textContent || "") : "";
        const lines = rawText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
        let valHtml = "";
        if (lines.length > 1) {
          valHtml = lines
            .map(
              (line, lIdx) =>
                `<p style="margin: 0 0 ${lIdx === lines.length - 1 ? "0" : "3pt"} 0; padding: 0; text-align: left; font-family: Arial, sans-serif; font-size: 11pt; line-height: 1.45; color: #000; font-weight: normal;">${line}</p>`
            )
            .join("");
        } else {
          valHtml = valSpan ? valSpan.innerHTML.replace(/\r?\n/g, "<br/>") : "";
        }

        // Catatan: Hal/Perihal TIDAK di-bold sesuai instruksi resmi
        tableHtml += `
          <tr style="border: none;">
            <td style="width: 2.3cm; vertical-align: top; padding: 4.5pt 0; font-family: Arial, sans-serif; font-size: 11pt; line-height: 1.45; color: #000; font-weight: normal;">${label}</td>
            <td style="width: 0.4cm; vertical-align: top; text-align: center; padding: 4.5pt 0; font-family: Arial, sans-serif; font-size: 11pt; line-height: 1.45; color: #000;">${colon}</td>
            <td style="vertical-align: top; text-align: left; padding: 4.5pt 0; font-family: Arial, sans-serif; font-size: 11pt; line-height: 1.45; color: #000; font-weight: normal;">${valHtml}</td>
          </tr>
        `;
      }
    });

    table.innerHTML = tableHtml;

    // Spacer pemisah lega setelah tanggal sebelum paragraf pertama (khusus MS Word, ~20pt)
    const spacerP = document.createElement("p");
    spacerP.setAttribute(
      "style",
      "margin: 0; padding: 0; font-size: 1pt; line-height: 20pt; mso-line-height-rule: exactly;"
    );
    spacerP.innerHTML = "&nbsp;";

    const metaWrapper = document.createElement("div");
    metaWrapper.appendChild(table);
    metaWrapper.appendChild(spacerP);
    container.replaceWith(metaWrapper);
  });

  // 3. Transformasi Metadata untuk Surat Dinas (.pkpknl-meta-container)
  const pkpknlMeta = clone.querySelector(".pkpknl-meta-container");
  if (pkpknlMeta) {
    const rows = Array.from(pkpknlMeta.querySelectorAll(".pkpknl-meta-row, .pkpknl-perihal-full"));
    const tanggalEl = pkpknlMeta.querySelector(".pkpknl-meta-tanggal");
    const tanggalText = tanggalEl ? tanggalEl.textContent?.trim() : "";

    const metaTable = document.createElement("table");
    metaTable.setAttribute(
      "style",
      "width: 100%; border: none; border-collapse: collapse; margin-bottom: 0; table-layout: fixed;"
    );

    let tableHtml = "";
    rows.forEach((row, rIdx) => {
      const label = row.querySelector(".pkpknl-meta-label")?.textContent?.trim() || "";
      const colon = row.querySelector(".pkpknl-meta-colon")?.textContent?.trim() || ":";
      const valEl = row.querySelector(".pkpknl-meta-nomor, .pkpknl-perihal-content") || row.querySelector("span:last-child");
      const val = valEl ? valEl.innerHTML.replace(/\n/g, "<br/>") : "";

      tableHtml += `
        <tr style="border: none;">
          <td style="width: 2.1cm; vertical-align: top; padding: 4pt 0; font-family: Arial, sans-serif; font-size: 11pt; line-height: 1.45; color: #000;">${label}</td>
          <td style="width: 0.4cm; vertical-align: top; text-align: center; padding: 4pt 0; font-family: Arial, sans-serif; font-size: 11pt; line-height: 1.45; color: #000;">${colon}</td>
          <td style="vertical-align: top; text-align: left; padding: 4pt 0; font-family: Arial, sans-serif; font-size: 11pt; line-height: 1.45; color: #000; font-weight: normal;">${val}</td>
          ${
            rIdx === 0 && tanggalText
              ? `<td style="width: 7.0cm; vertical-align: top; text-align: right; padding: 4pt 0; font-family: Arial, sans-serif; font-size: 11pt; line-height: 1.45; color: #000;">${tanggalText}</td>`
              : rIdx === 0
              ? `<td style="width: 7.0cm; border: none;">&nbsp;</td>`
              : ""
          }
        </tr>
      `;
    });

    metaTable.innerHTML = tableHtml;

    const spacerP = document.createElement("p");
    spacerP.setAttribute(
      "style",
      "margin: 0; padding: 0; font-size: 1pt; line-height: 20pt; mso-line-height-rule: exactly;"
    );
    spacerP.innerHTML = "&nbsp;";

    const metaWrapper = document.createElement("div");
    metaWrapper.appendChild(metaTable);
    metaWrapper.appendChild(spacerP);
    pkpknlMeta.replaceWith(metaWrapper);
  }

  // 4. Transformasi Butir Penomoran (.poin-item) menjadi Tabel 2-Kolom Rapi dengan padding cell anti-collapse
  const poinItems = Array.from(clone.querySelectorAll(".poin-item"));
  poinItems.forEach((p) => {
    const markerEl = p.querySelector(".poin-marker");
    const contentEl = p.querySelector(".poin-content");
    const marker = markerEl ? markerEl.textContent?.trim() : "";
    const content = contentEl ? contentEl.innerHTML : p.innerHTML;

    let col1Width = "18pt";
    let col1Indent = "0";

    const isSub = p.classList.contains("poin-level-2") || p.classList.contains("poin-level-3") || p.classList.contains("poin-level-4");
    const cellPaddingBottom = isSub ? "2pt" : "4pt";

    if (p.classList.contains("poin-level-2")) {
      col1Width = "32pt";
      col1Indent = "18pt";
    } else if (p.classList.contains("poin-level-3")) {
      col1Width = "46pt";
      col1Indent = "32pt";
    } else if (p.classList.contains("poin-level-4")) {
      col1Width = "60pt";
      col1Indent = "46pt";
    }

    const table = document.createElement("table");
    table.setAttribute(
      "style",
      "width: 100%; border: none; border-collapse: collapse; margin-bottom: 1.5pt; table-layout: fixed;"
    );
    // Note: padding-bottom dan line-height: 135% menjamin Word merender butir-butir rapat dan proporsional seperti acuan
    table.innerHTML = `
      <tr style="border: none;">
        <td style="width: ${col1Width}; padding: 0 0 ${cellPaddingBottom} 0; padding-left: ${col1Indent}; vertical-align: top; font-family: Arial, sans-serif; font-size: 11pt; line-height: 135%; color: #000;">${marker}</td>
        <td style="padding: 0 0 ${cellPaddingBottom} 0; vertical-align: top; text-align: justify; font-family: Arial, sans-serif; font-size: 11pt; line-height: 135%; color: #000;">${content}</td>
      </tr>
    `;
    p.replaceWith(table);
  });

  // 5. Transformasi Paragraf Biasa (.pkpknl-body p yang bukan .poin-item)
  const normalParas = Array.from(clone.querySelectorAll(".pkpknl-body p"));
  normalParas.forEach((p, idx) => {
    const text = p.textContent?.trim() || "";
    const isPenutup = /^(?:demikian|atas perhatian|wassalamu|hormat)/i.test(text);
    const indent = "24pt"; // Baik pembuka maupun penutup menjorok ~24pt sesuai gambar acuan

    // Space lega untuk paragraf pertama setelah tanggal
    // Space lega untuk paragraf terakhir setelah butir-butir penomoran selesai
    const isFirstPara = idx === 0 && !isPenutup;
    const marginTop = isPenutup ? "10pt" : isFirstPara ? "4pt" : "0";
    const marginBottom = isPenutup ? "10pt" : "4pt";

    p.setAttribute(
      "style",
      `margin: ${marginTop} 0 ${marginBottom} 0; text-indent: ${indent}; text-align: justify; line-height: 135%; font-family: Arial, sans-serif; font-size: 11pt; color: #000;`
    );
  });

  // 6. Transformasi Tembusan (kiri) & Tanda Tangan (kanan)
  const ttdEl = clone.querySelector(".pkpknl-ttd") as HTMLElement | null;
  const tembusanEl = clone.querySelector(".pkpknl-tembusan") as HTMLElement | null;

  if (ttdEl) {
    const allP = Array.from(ttdEl.querySelectorAll("p"));
    const placeholderEl = ttdEl.querySelector(".pkpknl-ttd-placeholder");
    const placeholderText = placeholderEl ? placeholderEl.textContent?.trim() : "${ttd_pengirim}";
    const nameEl = ttdEl.querySelector(".pkpknl-ttd-name");
    const nameText = nameEl ? nameEl.textContent?.trim() : "";
    const nipText = allP[allP.length - 1] && allP[allP.length - 1] !== nameEl ? allP[allP.length - 1].textContent?.trim() : "";

    // Deteksi apakah ada jabatan penandatangan (pada Nota Dinas & Memorandum jabatan tidak dicantumkan di atas ttd)
    const hasJabatan = allP.length >= 3 || (allP.length >= 2 && allP[0] !== nameEl && !allP[0].classList.contains("pkpknl-ttd-name"));
    const jabatanText = hasJabatan ? allP[0]?.textContent?.trim() || "" : "";

    let tembusanHtml = "&nbsp;";
    if (tembusanEl) {
      const titleEl = tembusanEl.querySelector(".pkpknl-tembusan-title");
      const title = titleEl ? titleEl.textContent?.trim() || "Tembusan:" : "Tembusan:";
      const items = Array.from(tembusanEl.querySelectorAll(".pkpknl-tembusan-item"));
      let itemsHtml = "";
      if (items.length <= 1) {
        const text = items[0]?.textContent?.trim() || tembusanEl.textContent?.replace(/^tembusan:\s*/i, "").trim() || "";
        itemsHtml = `<p style="margin: 0 0 3pt 0; font-family: Arial, sans-serif; font-size: 10pt; line-height: 1.4; color: #000;">${text}</p>`;
      } else {
        items.forEach((item, idx) => {
          const spans = Array.from(item.querySelectorAll("span"));
          const num = spans.length > 1 ? spans[0]?.textContent?.trim() : `${idx + 1}.`;
          const text = spans[spans.length - 1]?.textContent?.trim() || item.textContent?.trim() || "";
          itemsHtml += `<p style="margin: 0 0 3pt 0; font-family: Arial, sans-serif; font-size: 10pt; line-height: 1.4; color: #000;">${num} ${text}</p>`;
        });
      }
      tembusanHtml = `
        <p style="margin: 0 0 4pt 0; font-weight: normal; font-family: Arial, sans-serif; font-size: 10pt; color: #000;">${title}</p>
        ${itemsHtml}
      `;
      tembusanEl.remove();
    }

    // Tabel Tanda Tangan: Posisi penandatangan di sebelah kanan (kolom 50% kanan)
    const ttdTable = document.createElement("table");
    ttdTable.setAttribute(
      "style",
      "width: 100%; border: none; border-collapse: collapse; margin-top: 22pt; table-layout: fixed; mso-table-lspace: 0; mso-table-rspace: 0;"
    );
    ttdTable.innerHTML = `
      <tr style="border: none;">
        <td style="width: 48%; border: none; padding: 0;">&nbsp;</td>
        <td style="width: 52%; vertical-align: top; text-align: left; border: none; padding: 0; font-family: Arial, sans-serif; font-size: 11pt; line-height: 1.3; color: #000;">
          ${jabatanText ? `<p style="margin: 0 0 4pt 0; line-height: 1.3;">${jabatanText}</p>` : ""}
          <p style="margin: 45pt 0 45pt 24pt; color: #94a3b8; font-size: 9pt;">${placeholderText}</p>
          <p style="margin: 0; padding: 0; font-weight: bold; line-height: 1.3;">${nameText}</p>
          <p style="margin: 0; padding: 0; line-height: 1.3;">${nipText}</p>
        </td>
      </tr>
    `;

    // Tembusan ditempatkan di BAWAH tanda tangan rata kiri sesuai tata naskah dinas resmi
    const tembusanBlockHtml = tembusanHtml && tembusanHtml !== "&nbsp;"
      ? `<div style="margin-top: 24pt; font-family: Arial, sans-serif; font-size: 10pt; line-height: 1.4; text-align: left;">${tembusanHtml}</div>`
      : "";

    const penutupTtdGroup = clone.querySelector(".penutup-ttd-group");
    if (penutupTtdGroup && penutupTtdGroup.contains(ttdEl)) {
      const closingBody = penutupTtdGroup.querySelector(".pkpknl-body");
      const closingHtml = closingBody ? closingBody.innerHTML : "";
      penutupTtdGroup.innerHTML = closingHtml + ttdTable.outerHTML + tembusanBlockHtml;
    } else {
      const wrapper = document.createElement("div");
      wrapper.innerHTML = ttdTable.outerHTML + tembusanBlockHtml;
      ttdEl.replaceWith(wrapper);
    }
  }
}

/**
 * Ekspor Naskah Dinas ke format Word (.doc) 100% kompatibel dan editable di Microsoft Word.
 */
export async function exportSuratDinasWord(
  nomor: string,
  templateType: string,
  perihal: string
): Promise<void> {
  const previewDoc = document.getElementById("surat-dinas-print-root");
  if (!previewDoc) {
    throw new Error("Elemen pratinjau surat dinas tidak ditemukan.");
  }

  const clone = previewDoc.cloneNode(true) as HTMLElement;
  await inlineImagesAsBase64(clone);

  // Tangkap Kop Surat untuk ditempatkan ke Word Header resmi
  // Samakan 100% dengan implementasi Surat Tugas (export-st.ts)
  const kopEl = clone.querySelector(".kop-surat, .pkpknl-kop");
  let kopImgHtml = "";
  if (kopEl) {
    const kopImg = kopEl.querySelector("img");
    if (kopImg) {
      const src = kopImg.getAttribute("src") || "";
      // Lebar 189.4mm (716px) dengan indent kiri -25.5pt membuat kop surat mulai 9mm di kiri teks (1.1cm dari tepi kertas)
      // dan ujung garis hitam kanan sejajar persis dengan batas margin kanan teks (194.5mm), sama persis seperti di Surat Tugas.
      kopImgHtml = `<img src="${src}" width="716" style="width: 189.4mm; max-width: 189.4mm; height: auto; display: block;" />`;
    }
    kopEl.remove();
  }

  // Terapkan transformasi layout tabel khusus MS Word
  transformCloneForWord(clone);

  const suratContent = clone.querySelector(".surat-content");
  const bodyContentHtml = suratContent ? suratContent.innerHTML : clone.innerHTML;

  const filename = buildSuratDinasFilename(nomor, templateType, perihal, "doc");
  const boundary = "----=_NextPart_SuratDinas_BKSDA";

  const mhtml = `MIME-Version: 1.0
Content-Type: multipart/related; boundary="${boundary}"

--${boundary}
Content-Location: file:///C:/document.htm
Content-Type: text/html; charset="utf-8"

<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:w="urn:schemas-microsoft-com:office:word"
      xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta charset="utf-8">
  <title>${filename.replace(/\.doc$/, "")}</title>
  <!--[if gte mso 9]>
  <xml>
    <w:WordDocument>
      <w:View>Print</w:View>
      <w:Zoom>100</w:Zoom>
      <w:DoNotOptimizeForBrowser/>
    </w:WordDocument>
  </xml>
  <![endif]-->
  <style>
    @page Section1 {
      size: 210mm 297mm;
      margin: 3.8cm 1.55cm 2.0cm 2.0cm;
      mso-header-margin: 0.8cm;
      mso-title-page: yes;
      mso-first-header: url("file:///C:/header.htm") fh1;
      mso-header: url("file:///C:/header.htm") h1;
    }
    div.Section1 {
      page: Section1;
    }
    body {
      font-family: Arial, Helvetica, sans-serif;
      font-size: 11pt;
      line-height: 150%;
      color: #000000;
      text-align: justify;
      background: #ffffff;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
    }
    p { margin: 0 0 8pt 0; line-height: 150%; }
    h2 { font-family: Arial, Helvetica, sans-serif; font-size: 12pt; text-align: center; margin: 0 0 4pt 0; }
    .text-center, .text-center p, .nota-dinas-title-block, .nota-dinas-title-block p {
      text-align: center !important;
    }
  </style>
</head>
<body>
  <div class="Section1">
    ${bodyContentHtml}
  </div>
</body>
</html>

--${boundary}
Content-Location: file:///C:/header.htm
Content-Type: text/html; charset="utf-8"

<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:w="urn:schemas-microsoft-com:office:word">
<head>
  <meta charset="utf-8">
  <style>
    p.MsoHeader {
      margin: 0;
      text-align: center;
    }
  </style>
</head>
<body>
  <div style="mso-element:header" id="fh1">
    <p class="MsoHeader" style="margin: 0 0 0 -25.5pt; padding: 0; text-align: left;">
      ${kopImgHtml}
    </p>
  </div>
  <div style="mso-element:header" id="h1">
    <p class="MsoHeader">&nbsp;</p>
  </div>
</body>
</html>

--${boundary}--
`;

  const blob = new Blob([mhtml], { type: "application/msword;charset=utf-8" });
  const downloadUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = downloadUrl;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(downloadUrl);
}

/**
 * Ekspor Naskah Dinas ke format PDF (.pdf) langsung unduh di browser.
 * Menjamin dokumen 1 halaman tetap tepat 1 halaman tanpa halaman ke-2 kosong.
 */
export async function exportSuratDinasPdf(
  nomor: string,
  templateType: string,
  perihal: string
): Promise<void> {
  const previewDoc = document.getElementById("surat-dinas-print-root");
  if (!previewDoc) {
    throw new Error("Elemen pratinjau surat dinas tidak ditemukan.");
  }

  const { jsPDF } = await import("jspdf");
  const html2canvas = (await import("html2canvas-pro")).default;

  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
    compress: true,
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const page1MaxContentMm = 270; // Batas aman konten halaman 1 agar margin bawah tetap ~27mm

  // Ukur jarak elemen penutup / ttd / tembusan untuk mendeteksi apakah naskah muat dalam 1 halaman A4
  const penutupGroup = (
    previewDoc.querySelector(".penutup-ttd-group") ||
    previewDoc.querySelector(".pkpknl-ttd") ||
    previewDoc.querySelector(".pkpknl-tembusan")
  ) as HTMLElement | null;

  const previewRect = previewDoc.getBoundingClientRect();
  const previewWidthPx = previewDoc.clientWidth || 794;
  const pxToMm = 210 / previewWidthPx;

  const penutupRect = penutupGroup ? penutupGroup.getBoundingClientRect() : null;
  const penutupTopMm = penutupRect ? (penutupRect.top - previewRect.top) * pxToMm : 0;
  const penutupBottomMm = penutupRect
    ? (penutupRect.bottom - previewRect.top) * pxToMm
    : (previewDoc.scrollHeight * pxToMm);

  // Dokumen 1 halaman A4 jika batas bawah penutup muat di bawah batas aman (<= 270mm)
  const isSinglePage = penutupBottomMm <= page1MaxContentMm;

  let pushedToNextPage = false;
  const originalMarginTop = penutupGroup?.style.marginTop || "";

  if (!isSinglePage && penutupGroup) {
    const currentPageIndex = Math.floor(penutupTopMm / pageHeight);
    const safePageCeilingMm = currentPageIndex * pageHeight + page1MaxContentMm;

    // Jika blok penutup (paragraf terakhir, TTD, dan tembusan) melewati batas bawah halaman,
    // dorong seluruh blok bersama-sama ke halaman berikutnya dengan margin atas 22mm
    if (penutupBottomMm > safePageCeilingMm) {
      const targetTopMm = (currentPageIndex + 1) * pageHeight + 22;
      const neededExtraMm = targetTopMm - penutupTopMm;
      if (neededExtraMm > 0) {
        penutupGroup.style.setProperty("margin-top", `${neededExtraMm}mm`, "important");
        pushedToNextPage = true;
      }
    }
  }

  try {
    const canvas = await html2canvas(previewDoc, {
      scale: 2,
      useCORS: true,
      allowTaint: false,
      backgroundColor: "#ffffff",
      logging: false,
      windowWidth: previewDoc.scrollWidth,
      ignoreElements: (el: Element) =>
        el.classList.contains("print:hidden") ||
        el.classList.contains("halaman-divider") ||
        el.classList.contains("page-break-indicator") ||
        el.classList.contains("bsre-placeholder"),
    });

    const imgData = canvas.toDataURL("image/jpeg", 0.96);

    if (isSinglePage) {
      // Tepat 1 Halaman A4 Penuh (tidak pernah memicu halaman ke-2 kosong)
      pdf.addImage(imgData, "JPEG", 0, 0, pageWidth, pageHeight, undefined, "FAST");
    } else {
      // Multi-Halaman: Bagi dengan pergeseran tepat per halaman A4 (297mm)
      const totalHeightMm = (canvas.height * pageWidth) / canvas.width;
      let heightLeft = totalHeightMm;
      let position = 0;
      let pageNum = 0;

      while (heightLeft > 25) {
        if (pageNum > 0) {
          pdf.addPage();
        }
        pdf.addImage(imgData, "JPEG", 0, position, pageWidth, totalHeightMm, undefined, "FAST");
        position -= pageHeight;
        heightLeft -= pageHeight;
        pageNum++;
      }
    }

    const filename = buildSuratDinasFilename(nomor, templateType, perihal, "pdf");
    pdf.save(filename);
  } finally {
    if (pushedToNextPage && penutupGroup) {
      if (originalMarginTop) {
        penutupGroup.style.setProperty("margin-top", originalMarginTop);
      } else {
        penutupGroup.style.removeProperty("margin-top");
      }
    }
  }
}
