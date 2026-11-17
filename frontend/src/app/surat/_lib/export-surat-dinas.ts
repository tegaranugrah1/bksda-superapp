import { SURAT_DINAS_BASE_CSS, SURAT_DINAS_PRINT_CSS } from "../_components/SuratDinasDocument";

/**
 * Helper untuk Export Dokumen Tata Naskah Dinas ke Microsoft Word (.doc) dan PDF (.pdf).
 * Dibangun dengan prinsip Ponytail (minimalis & efisien), kompatibel penuh dengan MS Word (MHTML)
 * dan vector PDF ber-text layer (Headless Chromium) untuk TTE SRIKANDI/BSrE.
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

function sanitizeExportClone(clone: HTMLElement, stripTableChrome: boolean): void {
  const removeSelectors = [
    ".bsre-placeholder",
    ".page-break-indicator",
    ".halaman-divider",
    ".pkpknl-footer-bsre",
    ".print\\:hidden",
    ...(stripTableChrome ? ["thead", "tfoot"] : []),
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
}

function triggerBlobDownload(blob: Blob, filename: string): void {
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
 * Transformasi elemen DOM clone agar kompatibel penuh dengan mesin render HTML Microsoft Word:
 * - Mengganti layout CSS flexbox dengan table HTML (Word tidak mendukung flexbox).
 * - Menata metadata (Yth, Dari, Hal, Lampiran, Tanggal) dalam tabel 3 kolom rapi.
 * - Mengubah butir penomoran (.poin-item) menjadi tabel 2 kolom agar nomor & teks tidak rapat/menempel.
 * - Menata Tembusan (kiri) dan Tanda Tangan (kanan) dalam tabel 2 kolom sejajar.
 */
function escapeWordHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function sanitizeWordFragment(el: Element | null): string {
  if (!el) return "";
  const copy = el.cloneNode(true) as Element;
  copy.querySelectorAll("script, iframe, object, embed, link, style").forEach((n) => n.remove());
  copy.querySelectorAll("*").forEach((node) => {
    for (const attr of Array.from(node.attributes)) {
      const name = attr.name.toLowerCase();
      const val = attr.value.trim().toLowerCase();
      if (name.startsWith("on") || ((name === "href" || name === "src") && (val.startsWith("javascript:") || val.startsWith("data:text/html")))) {
        node.removeAttribute(attr.name);
      }
    }
  });
  return copy.innerHTML.replace(/\r?\n/g, "<br/>");
}

function transformCloneForWord(clone: HTMLElement): void {
  // 1. Bersihkan elemen non-cetak, web spacers, dan atribut editing
  sanitizeExportClone(clone, true);

  // 1b. Pastikan Judul Naskah (NOTA DINAS/MEMORANDUM) turun sedikit dari kop dan Nomor dekat dengan judul
  const titleBlocks = Array.from(
    clone.querySelectorAll(".nota-dinas-title-block, .text-center")
  ).filter((tb) => Boolean(tb.querySelector("h2")));
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

  // 2. Transformasi Metadata khusus Nota Dinas & Memorandum (hindari selector umum agar body/surat-content tidak ikut terkonversi)
  const metaContainers = Array.from(
    clone.querySelectorAll(".nota-dinas-meta, [data-meta='nota-dinas']")
  );

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
        const label = escapeWordHtml(spans[0]?.textContent?.trim() || "");
        const colon = escapeWordHtml(spans[1]?.textContent?.trim() || ":");
        const valSpan = spans[spans.length - 1];

        // Format multi-baris untuk Yth (tiap penerima menjadi baris paragraf kiri mandiri agar Word tidak force-justify spasi kata)
        const rawText = valSpan ? (valSpan.innerText || valSpan.textContent || "") : "";
        const lines = rawText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
        let valHtml = "";
        if (lines.length > 1) {
          valHtml = lines
            .map(
              (line, lIdx) =>
                `<p style="margin: 0 0 ${lIdx === lines.length - 1 ? "0" : "3pt"} 0; padding: 0; text-align: left; font-family: Arial, sans-serif; font-size: 11pt; line-height: 1.45; color: #000; font-weight: normal;">${escapeWordHtml(line)}</p>`
            )
            .join("");
        } else {
          valHtml = sanitizeWordFragment(valSpan);
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

  // 3. Transformasi Metadata untuk Surat Dinas (.pkpknl-meta-container + sibling .pkpknl-perihal-full)
  const pkpknlMeta = clone.querySelector(".pkpknl-meta-container");
  if (pkpknlMeta) {
    const rows = Array.from(pkpknlMeta.querySelectorAll(".pkpknl-meta-row, .pkpknl-perihal-full"));
    const siblingPerihal = pkpknlMeta.nextElementSibling?.classList.contains("pkpknl-perihal-full")
      ? pkpknlMeta.nextElementSibling
      : null;
    if (siblingPerihal) rows.push(siblingPerihal);

    const tanggalEl = pkpknlMeta.querySelector(".pkpknl-meta-tanggal");
    const tanggalText = tanggalEl ? tanggalEl.textContent?.trim() : "";

    const metaTable = document.createElement("table");
    metaTable.setAttribute("cellpadding", "0");
    metaTable.setAttribute("cellspacing", "0");
    metaTable.setAttribute(
      "style",
      "width: 100%; border: none; border-collapse: collapse; margin-bottom: 0; table-layout: fixed;"
    );

    const cellStyle = "vertical-align: top; padding: 0; font-family: Arial, sans-serif; font-size: 11pt; line-height: 1.45; color: #000;";
    let tableHtml = "";
    rows.forEach((row, rIdx) => {
      const label = escapeWordHtml(row.querySelector(".pkpknl-meta-label")?.textContent?.trim() || "");
      const colon = escapeWordHtml(row.querySelector(".pkpknl-meta-colon")?.textContent?.trim() || ":");
      const valEl = row.querySelector(".pkpknl-meta-nomor, .pkpknl-perihal-content") || row.querySelector("span:last-child");
      const val = sanitizeWordFragment(valEl);
      const safeTanggalText = escapeWordHtml(tanggalText || "");

      if (rIdx === 0) {
        tableHtml += `
          <tr style="border: none;">
            <td style="width: 2.1cm; ${cellStyle}">${label}</td>
            <td style="width: 0.4cm; text-align: center; ${cellStyle}">${colon}</td>
            <td style="text-align: left; font-weight: normal; ${cellStyle}">${val}</td>
            <td style="width: 5.0cm; text-align: right; ${cellStyle}">${safeTanggalText || "&nbsp;"}</td>
          </tr>
        `;
      } else {
        tableHtml += `
          <tr style="border: none;">
            <td style="width: 2.1cm; ${cellStyle}">${label}</td>
            <td style="width: 0.4cm; text-align: center; ${cellStyle}">${colon}</td>
            <td colspan="2" style="text-align: justify; font-weight: normal; ${cellStyle}">${val}</td>
          </tr>
        `;
      }
    });

    siblingPerihal?.remove();
    metaTable.innerHTML = tableHtml;

    const spacerP = document.createElement("p");
    spacerP.setAttribute(
      "style",
      "margin: 0; padding: 0; font-size: 1pt; line-height: 14pt; mso-line-height-rule: exactly;"
    );
    spacerP.innerHTML = "&nbsp;";

    const metaWrapper = document.createElement("div");
    metaWrapper.appendChild(metaTable);
    metaWrapper.appendChild(spacerP);
    pkpknlMeta.replaceWith(metaWrapper);
  }

  // Rapikan spasi blok tujuan surat (.pkpknl-yth) untuk MS Word
  const ythEl = clone.querySelector(".pkpknl-yth");
  if (ythEl) {
    ythEl.setAttribute("style", "margin: 0 0 12pt 0; font-family: Arial, sans-serif; font-size: 11pt; line-height: 1.4; color: #000;");
    ythEl.querySelectorAll("p").forEach((p) => {
      const isTempat = p.classList.contains("pkpknl-yth-tempat");
      p.setAttribute("style", `margin: 0${isTempat ? " 0 0 14pt" : ""}; padding: 0; text-align: left; line-height: 1.4;`);
    });
  }

  // 4. Transformasi Butir Penomoran (.poin-item) menjadi Tabel 2-Kolom Rapi dengan padding cell anti-collapse
  const poinItems = Array.from(clone.querySelectorAll(".poin-item"));
  poinItems.forEach((p) => {
    const markerEl = p.querySelector(".poin-marker");
    const contentEl = p.querySelector(".poin-content");
    const marker = escapeWordHtml(markerEl ? markerEl.textContent?.trim() || "" : "");
    const content = sanitizeWordFragment(contentEl || p);

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

  // 4b. Transformasi Blok Rincian / Jadwal (.pkpknl-rincian-wrap) menjadi tabel Word 4-kolom rapi (spacer | label | : | value)
  const rincianIndents: Record<string, string> = {
    "0": "24pt",
    "1": "18pt",
    "2": "32pt",
    "3": "46pt",
    "4": "60pt",
  };
  const rincianBlocks = Array.from(clone.querySelectorAll(".pkpknl-rincian-wrap"));
  rincianBlocks.forEach((wrap) => {
    const indentLvl = wrap.getAttribute("data-indent-level") || "0";
    const leftIndent = rincianIndents[indentLvl] || "24pt";
    const rows = Array.from(wrap.querySelectorAll("tr"));
    if (rows.length === 0) return;

    const table = document.createElement("table");
    table.setAttribute(
      "style",
      "width: 100%; border: none; border-collapse: collapse; margin: 2pt 0 6pt 0; table-layout: fixed;"
    );

    const cellBase =
      "vertical-align: top; font-family: Arial, sans-serif; font-size: 11pt; line-height: 135%; color: #000; border: none;";
    let rowsHtml = "";
    rows.forEach((tr) => {
      const labelEl = tr.querySelector(".pkpknl-rincian-label");
      const valEl = tr.querySelector(".pkpknl-rincian-value");
      const label = escapeWordHtml(labelEl?.textContent?.trim() || "");
      const val = sanitizeWordFragment(valEl);
      rowsHtml += `
        <tr style="border: none;">
          <td style="width: ${leftIndent}; padding: 0; border: none;">&nbsp;</td>
          <td style="width: 2.8cm; padding: 1.5pt 4pt 1.5pt 0; text-align: left; ${cellBase}">${label}</td>
          <td style="width: 0.4cm; padding: 1.5pt 0; text-align: center; ${cellBase}">:</td>
          <td style="padding: 1.5pt 0 1.5pt 3pt; text-align: left; ${cellBase}">${val}</td>
        </tr>
      `;
    });

    table.innerHTML = rowsHtml;
    wrap.replaceWith(table);
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
    const placeholderText = escapeWordHtml((placeholderEl ? placeholderEl.textContent?.trim() : "${ttd_pengirim}") || "");
    const nameEl = ttdEl.querySelector(".pkpknl-ttd-name");
    const nameText = escapeWordHtml((nameEl ? nameEl.textContent?.trim() : "") || "");
    const nipText = escapeWordHtml((allP[allP.length - 1] && allP[allP.length - 1] !== nameEl ? allP[allP.length - 1].textContent?.trim() : "") || "");

    // Deteksi apakah ada jabatan penandatangan (pada Nota Dinas & Memorandum jabatan tidak dicantumkan di atas ttd)
    const hasJabatan = allP.length >= 3 || (allP.length >= 2 && allP[0] !== nameEl && !allP[0].classList.contains("pkpknl-ttd-name"));
    const jabatanText = escapeWordHtml(hasJabatan ? allP[0]?.textContent?.trim() || "" : "");

    let tembusanHtml = "&nbsp;";
    if (tembusanEl) {
      const titleEl = tembusanEl.querySelector(".pkpknl-tembusan-title");
      const title = escapeWordHtml(titleEl ? titleEl.textContent?.trim() || "Tembusan:" : "Tembusan:");
      const items = Array.from(tembusanEl.querySelectorAll(".pkpknl-tembusan-item"));
      let itemsHtml = "";
      if (items.length <= 1) {
        const text = escapeWordHtml(items[0]?.textContent?.trim() || tembusanEl.textContent?.replace(/^tembusan:\s*/i, "").trim() || "");
        itemsHtml = `<p style="margin: 0 0 3pt 0; font-family: Arial, sans-serif; font-size: 10pt; line-height: 1.4; color: #000;">${text}</p>`;
      } else {
        items.forEach((item, idx) => {
          const spans = Array.from(item.querySelectorAll("span"));
          const num = escapeWordHtml((spans.length > 1 ? spans[0]?.textContent?.trim() : `${idx + 1}.`) || "");
          const text = escapeWordHtml(spans[spans.length - 1]?.textContent?.trim() || item.textContent?.trim() || "");
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
      const closingHtml = sanitizeWordFragment(closingBody);
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
  triggerBlobDownload(blob, filename);
}

async function collectInlinedStylesHtml(): Promise<string> {
  const nodes = Array.from(document.querySelectorAll("style, link[rel='stylesheet']"));
  const chunks = await Promise.all(
    nodes.map(async (node) => {
      if (node.tagName === "STYLE") {
        return node.outerHTML;
      }
      const href = node.getAttribute("href");
      if (!href) return "";
      const absUrl = resolveAbsoluteUrl(href);
      try {
        const parsed = new URL(absUrl, window.location.origin);
        if (parsed.origin !== window.location.origin) return "";
        const res = await fetch(parsed.toString(), { credentials: "same-origin" });
        if (!res.ok) return "";
        const cssText = await res.text();
        return `<style>${cssText.replace(/<\/style/gi, "<\\/style")}</style>`;
      } catch {
        return "";
      }
    })
  );
  return chunks.join("\n");
}

/**
 * Ekspor Naskah Dinas ke format Vector PDF (.pdf) via headless Chromium (/surat/export-pdf).
 * Menghasilkan PDF dengan text layer asli sehingga placeholder TTE (${ttd_pengirim}, ${nomor_naskah})
 * terbaca langsung di SRIKANDI / BSrE, identik dengan Cetak Dokumen -> Save as PDF.
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

  const clone = previewDoc.cloneNode(true) as HTMLElement;
  await inlineImagesAsBase64(clone);
  sanitizeExportClone(clone, false);

  const inlinedStyles = await collectInlinedStylesHtml();
  const filename = buildSuratDinasFilename(nomor, templateType, perihal, "pdf");

  const html = `<!DOCTYPE html>
<html lang="id">
  <head>
    <meta charset="utf-8" />
    <title>${escapeWordHtml(filename.replace(/\.pdf$/i, ""))}</title>
    ${inlinedStyles}
    <style>
      ${SURAT_DINAS_BASE_CSS}
      ${SURAT_DINAS_PRINT_CSS}
    </style>
  </head>
  <body>
    <div class="surat-dinas-print-root" style="width: 210mm; margin: 0 auto; background: white;">
      ${clone.innerHTML}
    </div>
  </body>
</html>`;

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const token = typeof window !== "undefined" ? localStorage.getItem("bksda_token") : null;
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch("/surat/export-pdf", {
    method: "POST",
    headers,
    credentials: "include",
    body: JSON.stringify({ html, filename }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Export PDF gagal (${res.status}): ${errText || "Server error"}`);
  }

  const pdfBlob = await res.blob();
  triggerBlobDownload(pdfBlob, filename);
}
