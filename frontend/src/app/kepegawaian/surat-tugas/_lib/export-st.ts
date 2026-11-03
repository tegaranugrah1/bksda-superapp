/**
 * Helper untuk Export Dokumen Surat Tugas ke Word (.doc) dan PDF (.pdf).
 * Dibangun dengan prinsip Ponytail (minimalis & efisien) dan Security-Audit (sanitasi ketat).
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

export function buildSuratTugasFilename(
  stNumber: string,
  namaKegiatan: string,
  ext: "doc" | "pdf"
): string {
  const safeNumber = sanitizeFilenamePart(stNumber || "DRAFT", 25);
  const safeKegiatan = sanitizeFilenamePart(namaKegiatan || "ST", 45);
  const safeExt = ext === "pdf" ? "pdf" : "doc";
  return `ST_${safeNumber}_${safeKegiatan}.${safeExt}`;
}

function resolveAbsoluteUrl(url: string): string {
  if (!url) return "";
  if (/^https?:\/\//i.test(url) || url.startsWith("data:")) return url;
  if (typeof window !== "undefined") {
    return `${window.location.origin}${url.startsWith("/") ? "" : "/"}${url}`;
  }
  return url;
}

/**
 * Konversi image ke base64 data-URL agar dokumen Word dapat dibuka offline
 * tanpa ketergantungan koneksi jaringan ke server / origin.
 */
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
 * Ekspor Surat Tugas ke format Dokumen Microsoft Word (.doc).
 * Menghasilkan Word Document yang 100% kompatibel dan editable di Microsoft Word:
 * - Kop surat dimasukkan ke dalam Word Header resmi (mso-element: header) dan disembunyikan dari body (display:none).
 * - Teks BSrE dihapus sesuai permintaan agar dokumen Word bersih.
 * - Ruang TTD setinggi 90pt dengan posisi ${ttd_pengirim} pas di tengah, mendorong nama pejabat turun sedikit secara proporsional.
 * - Tembusan (kiri) dan TTD (kanan) ditata menggunakan tabel 2 kolom agar sejajar rapi.
 */
export async function exportSuratTugasWord(
  stNumber: string,
  namaKegiatan: string
): Promise<void> {
  const previewDoc = document.getElementById("surat-preview-doc");
  if (!previewDoc) {
    throw new Error("Elemen pratinjau surat tugas tidak ditemukan.");
  }

  // 1. Clone elemen pratinjau
  const clone = previewDoc.cloneNode(true) as HTMLElement;

  // 2. Inline semua gambar (kop, logo) ke format Base64 data-URI terlebih dahulu
  await inlineImagesAsBase64(clone);

  // 3. Tangkap Kop Surat untuk ditempatkan ke Header Word
  const kopEl = clone.querySelector(".kop-surat");
  let kopImgHtml = "";
  if (kopEl) {
    const kopImg = kopEl.querySelector("img");
    if (kopImg) {
      const src = kopImg.getAttribute("src") || "";
      // Lebar 189.4mm (716px) dengan indent kiri -25.5pt membuat kop surat mulai 9mm di kiri "Menimbang" (1.1cm dari tepi kertas)
      // dan ujung garis hitam kanan sejajar persis dengan batas margin kanan kata-kata teks Dasar (194.5mm).
      kopImgHtml = `<img src="${src}" width="716" style="width: 189.4mm; max-width: 189.4mm; height: auto; display: block;" />`;
    }
    kopEl.remove();
  }

  // 4. Hapus elemen UI non-cetak, teks BSrE (sesuai request user untuk Word), dan print spacers
  const removeSelectors = [
    ".bsre-placeholder",
    ".page-break-indicator",
    ".halaman-divider",
    ".print\\:hidden",
    "thead", // Spacer print web 15mm yang menyebabkan jeda kosong di Word
    "tfoot", // Footer spacer web & BSrE
    "script",
    "iframe",
    "object",
    "embed",
  ];
  clone.querySelectorAll(removeSelectors.join(",")).forEach((el) => el.remove());

  // 5. Hapus inline event handlers
  clone.querySelectorAll("*").forEach((el) => {
    Array.from(el.attributes).forEach((attr) => {
      if (attr.name.toLowerCase().startsWith("on")) {
        el.removeAttribute(attr.name);
      }
    });
  });

  // 6. Transformasi .ttd-placeholder: beri margin atas dan bawah seimbang (45pt / ~120px)
  //    agar ${ttd_pengirim} berada tepat di tengah vertikal dengan ruang yang cukup lega untuk ttd-e / cap BSrE,
  //    dan nama penandatangan (M. Ari Wibawanto) terdorong turun sedikit secara proporsional.
  const ttdPlaceholders = Array.from(clone.querySelectorAll(".ttd-placeholder"));
  ttdPlaceholders.forEach((p) => {
    const pElem = document.createElement("p");
    pElem.setAttribute(
      "style",
      "margin: 45pt 0 45pt 35pt; color: #94a3b8; font-size: 9pt; font-family: 'Bookman Old Style', serif;"
    );
    pElem.textContent = "${ttd_pengirim}";
    p.replaceWith(pElem);
  });

  // 7. Tata letak Tembusan (kiri) dan Tanda Tangan (kanan) menggunakan tabel 2 kolom
  //    Kolom TTD diperlebar (58%) agar ruang tanda tangan dan nama pejabat muat leluasa
  const allDivs = Array.from(clone.querySelectorAll("div"));
  const ttdContainer = allDivs.find(
    (el) =>
      el.getAttribute("style")?.includes("9.2cm") ||
      (el.textContent?.includes("Kepala Balai") && el.textContent?.includes("NIP."))
  );
  const tembusanBlock = clone.querySelector(".tembusan-block");

  if (ttdContainer) {
    const layoutTable = document.createElement("table");
    layoutTable.setAttribute(
      "style",
      "width: 100%; border: none; border-collapse: collapse; margin-top: 14pt; table-layout: fixed; mso-table-lspace: 0; mso-table-rspace: 0;"
    );

    const tembusanContent = tembusanBlock ? tembusanBlock.outerHTML : "&nbsp;";
    if (tembusanBlock) tembusanBlock.remove();

    ttdContainer.style.marginLeft = "0";
    ttdContainer.style.marginTop = "0";
    ttdContainer.style.textAlign = "left";

    layoutTable.innerHTML = `
      <tr style="border: none;">
        <td style="width: 42%; vertical-align: top; border: none; padding: 0 10pt 0 0;">
          ${tembusanContent}
        </td>
        <td style="width: 58%; vertical-align: top; text-align: left; border: none; padding: 0 0 0 10pt;">
          ${ttdContainer.outerHTML}
        </td>
      </tr>
    `;
    ttdContainer.replaceWith(layoutTable);
  }

  // Tata letak Tanda Tangan Lampiran menggunakan tabel 2 kolom agar konsisten dan sejajar dengan Halaman 1
  const lampiranTtd = clone.querySelector(".lampiran-ttd") as HTMLElement | null;
  if (lampiranTtd) {
    const lampiranTtdTable = document.createElement("table");
    lampiranTtdTable.setAttribute(
      "style",
      "width: 100%; border: none; border-collapse: collapse; margin-top: 14pt; table-layout: fixed; mso-table-lspace: 0; mso-table-rspace: 0;"
    );
    lampiranTtd.style.marginLeft = "0";
    lampiranTtd.style.marginTop = "0";
    lampiranTtd.style.textAlign = "left";
    lampiranTtdTable.innerHTML = `
      <tr style="border: none;">
        <td style="width: 42%; vertical-align: top; border: none; padding: 0;">&nbsp;</td>
        <td style="width: 58%; vertical-align: top; text-align: left; border: none; padding: 0 0 0 10pt;">
          ${lampiranTtd.outerHTML}
        </td>
      </tr>
    `;
    lampiranTtd.replaceWith(lampiranTtdTable);
  }

  // 8. Tangani pemisahan halaman lampiran secara tepat untuk Word:
  //    Gunakan <br clear="all" style="page-break-before: always; mso-break-type: section-break;" />
  //    dan bersihkan style page-break / padding pada container agar Word tidak memecah
  //    meta lampiran dan judul daftar pegawai ke halaman yang berbeda.
  const lampiranWrapper = clone.querySelector(".st-lampiran-page-wrapper") as HTMLElement | null;
  let lampiranHtml = "";
  if (lampiranWrapper) {
    lampiranWrapper.style.removeProperty("page-break-before");
    lampiranWrapper.style.removeProperty("break-before");
    lampiranWrapper.style.marginTop = "0";

    const lampiranPage = lampiranWrapper.querySelector(".st-lampiran-page") as HTMLElement | null;
    if (lampiranPage) {
      lampiranPage.style.padding = "0";
      lampiranPage.style.width = "100%";
    }

    lampiranHtml = `<br clear="all" style="page-break-before: always; mso-break-type: section-break;" />` + lampiranWrapper.outerHTML;
    lampiranWrapper.remove();
  }

  // Bersihkan outer print table pembungkus surat-content
  const outerTable = clone.querySelector("table");
  const suratContent = clone.querySelector(".surat-content");
  let bodyContentHtml = "";
  if (outerTable && suratContent && outerTable.contains(suratContent)) {
    bodyContentHtml = suratContent.innerHTML + lampiranHtml;
  } else {
    bodyContentHtml = clone.innerHTML + lampiranHtml;
  }

  const filename = buildSuratTugasFilename(stNumber, namaKegiatan, "doc");
  const docTitle = filename.replace(/\.doc$/, "");
  const boundary = "----=_NextPart_SuratTugas_BKSDA";

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
  <title>${docTitle}</title>
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
      font-family: 'Bookman Old Style', 'Times New Roman', serif;
      font-size: 11pt;
      line-height: 1.25;
      color: #000000;
      text-align: justify;
      background: #ffffff;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
      margin-bottom: 0.3rem;
    }
    td, th {
      vertical-align: top;
      padding: 2px 0;
      font-size: 11pt;
    }
    .lampiran-table {
      border-collapse: collapse;
      width: 100%;
    }
    .lampiran-table th, .lampiran-table td {
      border: 1px solid #000000;
      padding: 4px 6px;
      font-size: 10.5pt;
      vertical-align: middle;
    }
    .st-lampiran-page-wrapper {
      margin-top: 0;
    }
    .st-lampiran-page {
      padding: 0 !important;
      width: 100% !important;
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

  const blob = new Blob([mhtml], {
    type: "application/msword;charset=utf-8",
  });
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
 * Ekspor Surat Tugas ke format berkas fisik PDF (.pdf) langsung ke unduhan disk.
 * Menggunakan jsPDF + html2canvas dengan skala 2x (300 DPI) agar teks dan kop tetap tajam.
 */
export async function exportSuratTugasPdf(
  stNumber: string,
  namaKegiatan: string
): Promise<void> {
  const previewDoc = document.getElementById("surat-preview-doc");
  if (!previewDoc) {
    throw new Error("Elemen pratinjau surat tugas tidak ditemukan.");
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

  const lampiranWrapper = previewDoc.querySelector(".st-lampiran-page-wrapper") as HTMLElement | null;
  const mainTable = previewDoc.querySelector("table") as HTMLElement | null;

  const canvasOptions = {
    scale: 2,
    useCORS: true,
    allowTaint: false,
    backgroundColor: "#ffffff",
    logging: false,
    windowWidth: previewDoc.scrollWidth,
    ignoreElements: (element: Element) =>
      element.classList.contains("print:hidden") ||
      element.classList.contains("halaman-divider") ||
      element.classList.contains("page-break-indicator"),
  };

  try {
    if (lampiranWrapper) {
      lampiranWrapper.style.display = "none";
    }

    // 1. Capture Halaman 1 (Naskah Surat Tugas) - tepat 1 halaman A4 penuh
    const canvas1 = await html2canvas(previewDoc, canvasOptions);
    const imgData1 = canvas1.toDataURL("image/jpeg", 0.96);
    pdf.addImage(imgData1, "JPEG", 0, 0, pageWidth, pageHeight, undefined, "FAST");

    // 2. Capture Halaman 2 (Lampiran jika aktif) - tepat 1 halaman A4 penuh
    if (lampiranWrapper) {
      lampiranWrapper.style.display = "";
      if (mainTable) mainTable.style.display = "none";

      const canvas2 = await html2canvas(previewDoc, canvasOptions);
      const imgData2 = canvas2.toDataURL("image/jpeg", 0.96);
      pdf.addPage();
      pdf.addImage(imgData2, "JPEG", 0, 0, pageWidth, pageHeight, undefined, "FAST");
    }
  } finally {
    // Pastikan styling tampilan selalu dikembalikan utuh ke kondisi semula
    if (lampiranWrapper) lampiranWrapper.style.display = "";
    if (mainTable) mainTable.style.display = "";
  }

  const filename = buildSuratTugasFilename(stNumber, namaKegiatan, "pdf");
  pdf.save(filename);
}
