"use client";

import { toast } from "sonner";
import { formatDateLong, getSkNumberSuffix } from "../_lib/auction-helpers";
import type {
  SkBuilderItem,
  SkKepalaBalai,
  SkMemutuskan,
} from "../_lib/sk-defaults";
import type { PanitiaAnggota } from "../_lib/sk-panitia-defaults";

interface SkPanitiaDocumentProps {
  skNumber: string;
  menimbang: SkBuilderItem[];
  mengingat: SkBuilderItem[];
  memutuskan: SkMemutuskan;
  kepalaBalai: SkKepalaBalai;
  tembusan: SkBuilderItem[];
  susunanPanitia: PanitiaAnggota[];
}

export function handlePrintSkPanitia() {
  const printContent = document.getElementById("sk-panitia-print-root");
  if (!printContent) {
    toast.error("Tidak ada dokumen SK Panitia untuk dicetak.");
    return;
  }
  const printWindow = window.open("", "_blank");
  if (!printWindow) return;

  printWindow.document.write(`
    <html>
      <head>
        <title>SK Panitia Penghapusan BMN</title>
        <style>
          @page { size: A4; margin: 0; }
          @page skp-main { size: A4; margin: 0; }
          @page skp-main:first { size: A4; margin: 0; }
          * { box-sizing: border-box; }
          body {
            margin: 0; padding: 0; background: white; color: black;
            font-family: 'Bookman Old Style', Georgia, serif;
            font-size: 11pt; line-height: 1.25;
          }
          p { margin: 0; padding: 0; }
          .skp-page {
            width: 210mm;
            margin: 0 auto; padding: 5mm 20mm 0;
          }
          .skp-main-document { page: skp-main; position: relative; }
          .skp-print-root .skp-page.skp-main-document.skp-main-paginated {
            height: 297mm !important;
            min-height: 297mm !important;
            padding: 5mm 20mm 18mm !important;
            overflow: hidden !important;
            position: relative !important;
            box-shadow: none !important;
          }
          .skp-print-root .skp-page.skp-main-document.skp-main-paginated.skp-main-continuation-page {
            padding-top: 18mm !important;
          }
          .skp-print-root .skp-main-document.skp-main-page-break {
            page-break-after: always;
            break-after: page;
          }
          .skp-main-flow { width: 100%; }
          .skp-main-paginated .skp-paginated-field-section + .skp-paginated-field-section { margin-top: 0 !important; }
          .skp-main-paginated .skp-paginated-field-section.skp-section-start { margin-top: 0.5rem !important; }
          .skp-page-ttd { padding-bottom: 0; }
          article { margin: 0; }
          .skp-page-break { page-break-after: always; break-after: always; }
          /* KOP */
          .skp-kop {
            margin-top: -5mm; margin-left: -16mm; margin-right: -16mm;
            margin-bottom: 6px; text-align: center;
          }
          .skp-kop img { width: 196mm !important; max-width: 196mm !important; height: auto !important; display: block; margin: 0 auto; }
          /* Judul SK */
          .skp-title {
            width: 166mm; margin-left: auto; margin-right: auto;
            margin-top: 10px; text-align: center; font-weight: bold; line-height: 1.3;
          }
          .skp-title-nomor { font-weight: normal; }
          .skp-title-tentang { margin-top: 10px; }
          /* Sub-judul */
          .skp-subtitle {
            width: 166mm; margin-left: auto; margin-right: auto;
            margin-top: 16px;
          }
          .skp-subtitle > p { text-align: center; font-weight: bold; }
          .skp-subtitle > p + p { margin-top: 6px; }
          /* Body */
          .skp-body { width: 166mm; margin-left: auto; margin-right: auto; }
          table { border-collapse: collapse; width: 100%; }
          td { vertical-align: top; padding: 0; }
          /* Menimbang/Mengingat */
          .skp-field-section {
            display: grid;
            grid-template-columns: 28mm 8mm minmax(0, 1fr);
            break-inside: auto !important;
            page-break-inside: auto !important;
          }
          .skp-field-section + .skp-field-section { margin-top: 0.5rem; }
          .skp-field-label, .skp-field-colon { padding: 0; }
          .skp-field-colon { text-align: center; }
          .skp-mengingat-list {
            break-inside: auto !important;
            page-break-inside: auto !important;
          }
          .skp-mengingat-item {
            display: grid;
            grid-template-columns: 9mm minmax(0, 1fr);
            break-inside: avoid !important;
            page-break-inside: avoid !important;
            padding-top: 0;
          }
          .skp-mengingat-item:first-child { padding-top: 0; }
          .skp-mengingat-text { text-align: justify; }
          /* Memutuskan */
          .skp-memutuskan { text-align: center; font-weight: bold; margin-bottom: 12px; }
          /* TTD block */
          .skp-ttd { width: 20rem; margin-left: auto; margin-top: 3rem; }
          .skp-ttd, .skp-ttd p { font-weight: normal !important; text-align: left !important; }
          .skp-ttd p { margin: 0; padding: 0; line-height: 1.3; }
          .skp-ttd-meta { display: grid !important; grid-template-columns: max-content auto 1fr; column-gap: 0.4rem; line-height: 1.3; }
          .skp-ttd-meta span { font-weight: normal !important; text-align: left !important; }
          .skp-ketiga-group { break-inside: avoid !important; page-break-inside: avoid !important; }
          .skp-signature-name { font-weight: normal !important; }
          .skp-ttd-placeholder { height: 112px; padding-top: 40px; padding-left: 1.35cm; color: #94a3b8; font-weight: normal !important; text-align: left !important; margin-top: 2rem; margin-bottom: 2rem; }
          .skp-continuation-word { position: absolute; right: 23mm; bottom: 31mm; width: 163mm; height: 0; line-height: 11pt; overflow: visible; white-space: nowrap; text-align: right !important; margin: 0; padding: 0; font-weight: normal !important; font-size: 11pt; z-index: 20; }
          /* Tembusan */
          .skp-tembusan { margin-top: 2rem; }
          .skp-tembusan, .skp-tembusan p { font-weight: normal !important; text-align: left !important; }
          .skp-tembusan p { margin: 0; padding: 0; line-height: 1.5; }
          /* pre-wrap for KEDUA */
          .skp-kedua-text { white-space: pre-wrap; }
          /* Lampiran */
          .skp-lampiran {
            width: 210mm;
            margin: 0 auto;
            padding: 12mm 20mm 28mm;
            page-break-before: always;
            break-before: page;
          }
          .skp-attachment-meta { width: 109mm; margin-left: auto; text-align: left; }
          .skp-attachment-meta .meta-row { display: grid; grid-template-columns: 24mm 5mm minmax(0, 1fr); align-items: start; }
          .skp-attachment-meta .meta-label { white-space: nowrap; }
          .skp-attachment-meta .meta-colon { text-align: center; }
          .skp-lampiran-title { text-align: center; font-weight: bold; line-height: 1.3; margin-top: 1.5rem; margin-bottom: 0.75rem; }
          .skp-panitia-table { width: 100%; border-collapse: collapse; font-size: 10pt; }
          .skp-panitia-table th, .skp-panitia-table td { border: 1px solid #000; padding: 0.5rem; }
          .skp-panitia-table td { vertical-align: middle; }
        </style>
      </head>
      <body>${printContent.innerHTML}</body>
    </html>
  `);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    try {
      const doc = printWindow.document;
      const body = doc.body;
      if (!body) { printWindow.print(); return; }

      const paginationStyle = doc.createElement("style");
      paginationStyle.textContent = `
        @page skp-main { size: A4; margin: 0; }
        @page skp-main:first { size: A4; margin: 0; }
        .skp-print-root .skp-page.skp-main-document.skp-main-paginated {
          height: 297mm !important;
          min-height: 297mm !important;
          padding: 5mm 20mm 18mm !important;
          overflow: hidden !important;
          position: relative !important;
          box-shadow: none !important;
        }
        .skp-print-root .skp-page.skp-main-document.skp-main-paginated.skp-main-continuation-page {
          padding-top: 18mm !important;
        }
        .skp-print-root .skp-main-document.skp-main-page-break {
          page-break-after: always;
          break-after: page;
        }
        .skp-main-paginated .skp-paginated-field-section + .skp-paginated-field-section {
          margin-top: 0 !important;
        }
        .skp-main-paginated .skp-paginated-field-section.skp-section-start {
          margin-top: 0.5rem !important;
        }
        .skp-continuation-word {
          position: absolute !important;
          right: 23mm !important;
          bottom: 31mm !important;
          width: 163mm !important;
          height: 0 !important;
          line-height: 11pt !important;
          overflow: visible !important;
          white-space: nowrap !important;
          text-align: right !important;
          margin: 0 !important;
          padding: 0 !important;
          font-weight: normal !important;
          font-size: 11pt !important;
          z-index: 20 !important;
        }
      `;
      body.appendChild(paginationStyle);

      void body.offsetHeight;

      const mmToPx = 96 / 25.4;
      const firstPageContentH = 280 * mmToPx;
      const continuationContentH = 267 * mmToPx;
      const markerReserveH = 5 * mmToPx;

      const mainDoc = doc.querySelector(".skp-main-document");
      if (!mainDoc) { printWindow.print(); return; }

      const root = mainDoc.parentElement;
      if (!root) { printWindow.print(); return; }

      const continuationLabel = (num: string, text: string) => {
        const firstWord = text.trim().split(/\s+/)[0] || "";
        return `${num.trim()} ${firstWord ? `${firstWord}.....` : "....."}`;
      };

      const cloneElement = <T extends HTMLElement>(el: T) => el.cloneNode(true) as T;

      const createFieldBlock = (
        sectionLabel: string,
        item: HTMLElement,
        showSectionLabel: boolean,
        marginTop = false,
      ) => {
        const section = doc.createElement("div");
        section.className = "skp-field-section skp-paginated-field-section";
        section.style.marginTop = marginTop ? "0.75rem" : "0";
        if (marginTop) section.classList.add("skp-section-start");

        const label = doc.createElement("div");
        label.className = "skp-field-label";
        label.textContent = showSectionLabel ? sectionLabel : "";

        const colon = doc.createElement("div");
        colon.className = "skp-field-colon";
        colon.textContent = showSectionLabel ? ":" : "";

        const list = doc.createElement("div");
        list.className = "skp-mengingat-list";
        const itemClone = cloneElement(item);
        itemClone.style.paddingTop = "0";
        list.appendChild(itemClone);

        section.append(label, colon, list);
        return section;
      };

      const createDecisionBlock = (rows: HTMLElement[]) => {
        const table = doc.createElement("table");
        table.className = "skp-mengingat-table";
        table.style.borderCollapse = "collapse";

        const tbody = doc.createElement("tbody");
        rows.forEach((row) => tbody.appendChild(cloneElement(row)));
        table.appendChild(tbody);
        return table;
      };

      const createMemutuskanMenetapkanBlock = (heading: HTMLElement, row: HTMLElement) => {
        const block = doc.createElement("div");
        block.appendChild(cloneElement(heading));
        block.appendChild(createDecisionBlock([row]));
        return block;
      };

      const makePage = (isFirstPage: boolean) => {
        const page = doc.createElement("article");
        page.className = "skp-page skp-page-ttd skp-main-document skp-main-paginated mx-auto max-w-[210mm] bg-white px-24 py-9 text-black";
        if (!isFirstPage) page.classList.add("skp-main-continuation-page");
        page.style.cssText = [
          "width: 210mm",
          "height: 297mm",
          "min-height: 297mm",
          "margin: 0 auto",
          `padding: ${isFirstPage ? "5mm" : "18mm"} 20mm 28mm`,
          "overflow: hidden",
          "position: relative",
          "box-sizing: border-box",
          "background: white",
          "color: black",
        ].join("; ");

        const flow = doc.createElement("div");
        flow.className = "skp-main-flow";
        page.appendChild(flow);

        const bodyWrap = doc.createElement("div");
        bodyWrap.className = "skp-body";
        flow.appendChild(bodyWrap);

        return { page, flow, bodyWrap };
      };

      const addContinuationWord = (page: HTMLElement, label: string) => {
        const contWord = doc.createElement("p");
        contWord.className = "skp-continuation-word";
        contWord.textContent = label;
        page.appendChild(contWord);
      };

      const measureFlowContentHeight = (flow: HTMLElement) => {
        const flowTop = flow.getBoundingClientRect().top;
        return Array.from(flow.children).reduce((maxBottom, child) => {
          const rect = (child as HTMLElement).getBoundingClientRect();
          return Math.max(maxBottom, rect.bottom - flowTop);
        }, 0);
      };

      const measureOuterHeight = (el: HTMLElement) => {
        const rect = el.getBoundingClientRect();
        const style = printWindow.getComputedStyle(el);
        const marginTop = Number.parseFloat(style.marginTop || "0") || 0;
        const marginBottom = Number.parseFloat(style.marginBottom || "0") || 0;
        return rect.height + marginTop + marginBottom;
      };

      const contentWrap = mainDoc.querySelector<HTMLElement>(".skp-subtitle");
      const contentSections = contentWrap?.querySelector<HTMLElement>("div");
      const fieldSections = contentSections?.querySelectorAll<HTMLElement>(":scope > .skp-field-section");
      const menimbangItems = fieldSections?.[0]?.querySelectorAll<HTMLElement>(".skp-mengingat-item") || [];
      const mengingatItems = fieldSections?.[1]?.querySelectorAll<HTMLElement>(".skp-mengingat-item") || [];

      const explicitMemutuskanHeading = mainDoc.querySelector<HTMLElement>(".skp-memutuskan");
      const explicitMemRows = Array.from(mainDoc.querySelectorAll<HTMLElement>(".skp-mengingat-row"));
      const ketigaGroup = mainDoc.querySelector<HTMLElement>(".skp-ketiga-group");

      let currentPage = makePage(true);
      root.insertBefore(currentPage.page, mainDoc);

      const kop = mainDoc.querySelector<HTMLElement>(".skp-kop");
      const title = mainDoc.querySelector<HTMLElement>(".skp-title");
      const intro = doc.createElement("div");
      intro.className = "skp-subtitle skp-body";
      const introParagraphs = Array.from(contentWrap?.children || []).filter((child) => {
        return child.tagName === "P" && !(child as HTMLElement).classList.contains("skp-memutuskan");
      });
      introParagraphs.forEach((child) => intro.appendChild(cloneElement(child as HTMLElement)));

      const firstBody = currentPage.bodyWrap;
      currentPage.flow.insertBefore(intro, firstBody);
      if (title) currentPage.flow.insertBefore(cloneElement(title), intro);
      if (kop) currentPage.flow.insertBefore(cloneElement(kop), currentPage.flow.firstChild);
      let currentUsedHeight = measureFlowContentHeight(currentPage.flow);

      const blocks: { el: HTMLElement; label: string }[] = [];
      Array.from(menimbangItems).forEach((item, index) => {
        const num = item.querySelector("div:first-child")?.textContent || "";
        const text = item.querySelector(".skp-mengingat-text")?.textContent || "";
        blocks.push({
          el: createFieldBlock("Menimbang", item, index === 0),
          label: continuationLabel(num, text),
        });
      });

      Array.from(mengingatItems).forEach((item, index) => {
        const num = item.querySelector("div:first-child")?.textContent || "";
        const text = item.querySelector(".skp-mengingat-text")?.textContent || "";
        blocks.push({
          el: createFieldBlock("Mengingat", item, index === 0, index === 0),
          label: continuationLabel(num, text),
        });
      });

      if (explicitMemutuskanHeading && explicitMemRows[0]) {
        const memutuskanBlock = createMemutuskanMenetapkanBlock(explicitMemutuskanHeading, explicitMemRows[0]);
        blocks.push({ el: memutuskanBlock, label: "MEMUTUSKAN....." });
      } else if (explicitMemutuskanHeading) {
        blocks.push({ el: cloneElement(explicitMemutuskanHeading), label: "MEMUTUSKAN....." });
      } else if (explicitMemRows[0]) {
        blocks.push({ el: createDecisionBlock([explicitMemRows[0]]), label: "Menetapkan....." });
      }
      if (explicitMemRows[1]) {
        blocks.push({ el: createDecisionBlock([explicitMemRows[1]]), label: "KESATU....." });
      }
      if (explicitMemRows[2]) {
        blocks.push({ el: createDecisionBlock([explicitMemRows[2]]), label: "KEDUA....." });
      }
      if (ketigaGroup) {
        blocks.push({ el: cloneElement(ketigaGroup), label: "KETIGA....." });
      }

      blocks.forEach((block, index) => {
        const isLastBlock = index === blocks.length - 1;
        const contentLimit = currentPage.page.classList.contains("skp-main-continuation-page")
          ? continuationContentH
          : firstPageContentH;
        const maxFlowHeight = contentLimit - (isLastBlock ? 0 : markerReserveH);
        const markerSafeHeight = contentLimit - markerReserveH;

        currentPage.bodyWrap.appendChild(block.el);
        const blockHeight = measureOuterHeight(block.el);
        const flowHeight = currentUsedHeight + blockHeight;
        const canMoveToNextPage = currentPage.bodyWrap.children.length > 1;
        if ((flowHeight > maxFlowHeight || (!isLastBlock && flowHeight > markerSafeHeight)) && canMoveToNextPage) {
          currentPage.bodyWrap.removeChild(block.el);
          currentPage.page.classList.add("skp-main-page-break");
          addContinuationWord(currentPage.page, block.label);

          currentPage = makePage(false);
          root.insertBefore(currentPage.page, mainDoc);
          currentPage.bodyWrap.appendChild(block.el);
          currentUsedHeight = measureOuterHeight(block.el);
        } else {
          currentUsedHeight = flowHeight;
        }
      });

      root.removeChild(mainDoc);

    } catch {
      // Silently fail — print without continuation words
    }
    setTimeout(() => printWindow.print(), 300);
  }, 600);
}


export function SkPanitiaDocument({
  skNumber,
  menimbang,
  mengingat,
  memutuskan,
  kepalaBalai,
  tembusan,
  susunanPanitia,
}: SkPanitiaDocumentProps) {
  const today = new Date();
  const skNumberText = `SK.${skNumber.trim() || "____"}/${getSkNumberSuffix(today)}`;

  const mengingatTexts = mengingat.map((m) => m.text);

  const pageStyle: React.CSSProperties = {
    fontFamily: "'Bookman Old Style', Georgia, serif",
    fontSize: "11pt",
    lineHeight: "1.4",
  };

  return (
    <div id="sk-panitia-print-root" className="skp-print-root">
      <style jsx global>{`
        .skp-print-root .skp-page {
          width: 210mm;
          margin-left: auto;
          margin-right: auto;
          box-sizing: border-box;
        }
        .skp-print-root .skp-main-document {
          padding: 5mm 20mm 0 !important;
        }
        .skp-print-root .skp-kop {
          margin-top: -5mm;
          margin-left: -16mm;
          margin-right: -16mm;
          margin-bottom: 4px;
          text-align: center;
        }
        .skp-print-root .skp-kop img {
          width: 196mm !important;
          max-width: 196mm !important;
          height: auto !important;
          display: block;
          margin: 0 auto;
        }
        .skp-print-root .skp-title,
        .skp-print-root .skp-subtitle,
        .skp-print-root .skp-body {
          width: 166mm;
          margin-left: auto;
          margin-right: auto;
        }
        .skp-print-root .skp-title {
          margin-top: 10px;
          text-align: center;
          font-weight: bold;
          line-height: 1.3;
        }
        .skp-print-root .skp-title-nomor {
          font-weight: normal;
        }
        .skp-print-root .skp-title-tentang {
          margin-top: 10px;
        }
        .skp-print-root .skp-subtitle {
          margin-top: 16px;
        }
        .skp-print-root .skp-subtitle > p {
          text-align: center;
          font-weight: bold;
        }
        .skp-print-root .skp-subtitle > p + p {
          margin-top: 6px;
        }
        .skp-print-root p {
          margin: 0;
          padding: 0;
        }
        .skp-print-root table {
          border-collapse: collapse;
          width: 100%;
        }
        .skp-print-root td {
          vertical-align: top;
          padding: 0;
        }
        .skp-print-root .skp-field-section {
          display: grid;
          grid-template-columns: 28mm 8mm minmax(0, 1fr);
          break-inside: auto;
          page-break-inside: auto;
        }
        .skp-print-root .skp-field-section + .skp-field-section {
          margin-top: 0.5rem;
        }
        .skp-print-root .skp-field-colon {
          text-align: center;
        }
        .skp-print-root .skp-mengingat-list {
          break-inside: auto;
          page-break-inside: auto;
        }
        .skp-print-root .skp-mengingat-item {
          display: grid;
          grid-template-columns: 9mm minmax(0, 1fr);
          break-inside: avoid;
          page-break-inside: avoid;
          padding-top: 0;
        }
        .skp-print-root .skp-mengingat-item:first-child {
          padding-top: 0;
        }
        .skp-print-root .skp-mengingat-text {
          text-align: justify;
        }
        .skp-print-root .skp-memutuskan {
          text-align: center;
          font-weight: bold;
          margin-bottom: 12px;
        }
        .skp-print-root .skp-continuation-word {
          text-align: right !important;
          margin-top: 0.5rem;
          font-weight: normal !important;
        }
        .skp-print-root .skp-ttd {
          width: 20rem;
          margin-left: auto;
          margin-top: 3rem;
        }
        .skp-print-root .skp-ttd,
        .skp-print-root .skp-ttd p,
        .skp-print-root .skp-tembusan,
        .skp-print-root .skp-tembusan p {
          font-weight: normal !important;
          text-align: left !important;
        }
        .skp-print-root .skp-ttd p,
        .skp-print-root .skp-tembusan p {
          margin: 0;
          padding: 0;
        }
        .skp-print-root .skp-signature-name {
          font-weight: normal !important;
        }
        .skp-print-root .skp-ttd-placeholder {
          box-sizing: border-box;
          height: 112px;
          padding-top: 40px;
          padding-left: 1.35cm;
          color: #94a3b8;
          font-weight: normal !important;
          text-align: left !important;
          margin-top: 2rem;
          margin-bottom: 2rem;
        }
        .skp-print-root .skp-tembusan {
          margin-top: 2rem;
        }
        .skp-print-root .skp-tembusan p {
          line-height: 1.5;
        }
        .skp-print-root .skp-kedua-text {
          white-space: pre-wrap;
        }
        .skp-print-root .skp-lampiran {
          page-break-before: always;
          break-before: page;
        }
        .skp-print-root .skp-attachment-meta {
          width: 109mm;
          margin-left: auto;
          text-align: left;
        }
        .skp-print-root .skp-attachment-meta .meta-row {
          display: grid;
          grid-template-columns: 24mm 5mm minmax(0, 1fr);
          align-items: start;
        }
        .skp-print-root .skp-attachment-meta .meta-label {
          white-space: nowrap;
        }
        .skp-print-root .skp-attachment-meta .meta-colon {
          text-align: center;
        }
        .skp-print-root .skp-lampiran-title {
          text-align: center;
          font-weight: bold;
          line-height: 1.3;
          margin-top: 1.5rem;
          margin-bottom: 0.75rem;
        }
        .skp-print-root .skp-panitia-table { width: 100%; border-collapse: collapse; font-size: 10pt; }
        .skp-print-root .skp-panitia-table th, .skp-print-root .skp-panitia-table td { border: 1px solid #000; padding: 0.5rem; }
        .skp-print-root .skp-panitia-table td { vertical-align: middle; }
      `}</style>

      {/* ── HALAMAN SK PANITIA: KOP + Judul + Menimbang + Mengingat + MEMUTUSKAN + TTD + Tembusan ── */}
      <article
        className="skp-page skp-page-ttd skp-main-document mx-auto max-w-[210mm] bg-white px-24 py-9 text-black shadow-xl ring-1 ring-zinc-200"
        style={pageStyle}
      >
        <div className="skp-kop" style={{ marginTop: "-5mm", marginLeft: "-16mm", marginRight: "-16mm", marginBottom: "4px", textAlign: "center" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/header-new.png" alt="Kop Surat" style={{ width: "196mm", maxWidth: "196mm", height: "auto", display: "block", margin: "0 auto" }} />
        </div>

        <div className="skp-title mx-auto mt-3 w-[166mm] text-center font-bold leading-snug">
          <p className="m-0">KEPUTUSAN KEPALA BALAI</p>
          <p className="m-0">KONSERVASI SUMBER DAYA ALAM KALIMANTAN TIMUR</p>
          <p className="skp-title-nomor m-0 font-normal">Nomor : {skNumberText}</p>
          <p className="skp-title-tentang m-0 mt-2">TENTANG</p>
          <p className="m-0">PANITIA PENGHAPUSAN BARANG MILIK NEGARA</p>
          <p className="m-0">BERUPA ALAT ANGKUTAN BERMOTOR</p>
        </div>

        <div className="skp-subtitle skp-body mx-auto mt-3 w-[166mm]">
          <p className="text-center font-bold">DENGAN RAHMAT TUHAN YANG MAHA ESA</p>
          <p className="mt-2 text-center font-bold">
            KEPALA BALAI<br />
            KONSERVASI SUMBER DAYA ALAM KALIMANTAN TIMUR,
          </p>

          {/* Menimbang + Mengingat */}
          <div className="mt-2">\n            <div className="skp-field-section">
              <div className="skp-field-label">Menimbang</div>
              <div className="skp-field-colon">:</div>
              <div className="skp-mengingat-list">
                {menimbang.map((item, i) => (
                  <div
                    className="skp-mengingat-item"
                    key={item.id}
                    style={i === 0 ? undefined : { paddingTop: "0.15rem" }}
                  >
                    <div>{String.fromCharCode(97 + i)}.</div>
                    <div className="skp-mengingat-text">{item.text}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="skp-field-section">
              <div className="skp-field-label">Mengingat</div>
              <div className="skp-field-colon">:</div>
              <div className="skp-mengingat-list">
                {mengingatTexts.map((item, i) => (
                  <div className="skp-mengingat-item" key={i}>
                    <div>{i + 1}.</div>
                    <div className="skp-mengingat-text">{item}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* MEMUTUSKAN */}
          <p className="skp-memutuskan text-center font-bold" style={{ marginTop: "0.75rem" }}>MEMUTUSKAN</p>

          <table className="skp-mengingat-table mt-4 w-full" style={{ borderCollapse: "collapse" }}>
            <tbody>
              <tr className="skp-mengingat-row">
                <td style={{ width: "28mm", verticalAlign: "top" }}>Menetapkan</td>
                <td style={{ width: "8mm", textAlign: "center", verticalAlign: "top" }}>:</td>
                <td style={{ verticalAlign: "top", textTransform: "uppercase", textAlign: "justify" }}>
                  {memutuskan.menetapkan}
                </td>
              </tr>
              <tr className="skp-mengingat-row">
                <td style={{ width: "28mm", verticalAlign: "top", paddingTop: "0.6rem" }}>KESATU</td>
                <td style={{ width: "8mm", textAlign: "center", verticalAlign: "top", paddingTop: "0.6rem" }}>:</td>
                <td style={{ verticalAlign: "top", paddingTop: "0.6rem", textAlign: "justify" }}>
                  {memutuskan.kesatu}
                </td>
              </tr>
              <tr className="skp-mengingat-row">
                <td style={{ width: "28mm", verticalAlign: "top", paddingTop: "0.6rem" }}>KEDUA</td>
                <td style={{ width: "8mm", textAlign: "center", verticalAlign: "top", paddingTop: "0.6rem" }}>:</td>
                <td style={{ verticalAlign: "top", paddingTop: "0.6rem", textAlign: "justify" }}>
                  <span className="skp-kedua-text" style={{ whiteSpace: "pre-wrap" }}>{memutuskan.kedua}</span>
                </td>
              </tr>
            </tbody>
          </table>

          {/* KETIGA + TTD + Tembusan grouped */}
          <div className="skp-ketiga-group">
            <table className="skp-mengingat-table mt-0 w-full" style={{ borderCollapse: "collapse" }}>
              <tbody>
                <tr className="skp-mengingat-row">
                  <td style={{ width: "28mm", verticalAlign: "top", paddingTop: "0.6rem" }}>KETIGA</td>
                  <td style={{ width: "8mm", textAlign: "center", verticalAlign: "top", paddingTop: "0.6rem" }}>:</td>
                  <td style={{ verticalAlign: "top", paddingTop: "0.6rem", textAlign: "justify" }}>
                    {memutuskan.ketiga}
                  </td>
                </tr>
              </tbody>
            </table>

            {/* TTD */}
            <div className="skp-ttd signature mt-6 ml-auto w-80">
              <div className="skp-ttd-meta" style={{ display: "grid", gridTemplateColumns: "max-content auto 1fr", columnGap: "0.4rem" }}>
                <span>Ditetapkan di</span>
                <span>:</span>
                <span>Samarinda</span>
                <span>Pada tanggal</span>
                <span>:</span>
                <span>{formatDateLong(today)}</span>
              </div>
              <p className="m-0 mt-3">Kepala Balai,</p>
              <div className="skp-ttd-placeholder mt-4 h-24 box-border pt-10 pl-[1.35cm] text-zinc-400">${"{ttd_pengirim}"}</div>
              <p className="skp-signature-name m-0 mt-4">{kepalaBalai.nama}</p>
              <p className="m-0">NIP. {kepalaBalai.nip}</p>
            </div>

            {/* Tembusan */}
            {tembusan.length > 0 && (
              <div className="skp-tembusan mt-10">
                <p className="m-0">Tembusan :</p>
                {tembusan.length === 1 ? (
                  <p className="m-0">{tembusan[0].text}</p>
                ) : (
                  tembusan.map((item, i) => (
                    <p key={item.id} className="m-0">{i + 1}.&nbsp; {item.text}</p>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </article>

      {/* ── HALAMAN LAMPIRAN: Susunan Panitia ── */}
      <article
        className="skp-page skp-lampiran mx-auto max-w-[210mm] bg-white px-24 py-9 text-black shadow-xl ring-1 ring-zinc-200"
        style={pageStyle}
      >
        <div className="skp-body mx-auto w-[166mm]">
          {/* Meta header */}
          <div className="skp-attachment-meta ml-auto w-[109mm]">
            <div className="meta-row grid grid-cols-[24mm_5mm_minmax(0,1fr)]">
              <span>Lampiran</span><span>:</span><span>Surat Keputusan Kepala Balai KSDA Kalimantan Timur</span>
            </div>
            <div className="meta-row grid grid-cols-[24mm_5mm_minmax(0,1fr)]">
              <span>Nomor</span><span>:</span><span>{skNumberText}</span>
            </div>
            <div className="meta-row grid grid-cols-[24mm_5mm_minmax(0,1fr)]">
              <span>Tanggal</span><span>:</span><span>{formatDateLong(today)}</span>
            </div>
          </div>

          {/* Title */}
          <p className="skp-lampiran-title mt-6 text-center font-bold leading-snug">
            PANITIA PENGHAPUSAN BARANG MILIK NEGARA<br />
            BERUPA ALAT ANGKUTAN BERMOTOR<br />
            PADA BALAI KONSERVASI SUMBER DAYA ALAM KALIMANTAN TIMUR
          </p>

          {/* Susunan Panitia table */}
          <table className="skp-panitia-table" style={{ width: "100%", borderCollapse: "collapse", marginTop: "2rem", fontSize: "10pt" }}>
            <thead>
              <tr>
                <th style={{ border: "1px solid black", padding: "0.5rem", width: "8mm", textAlign: "center" }}>No.</th>
                <th style={{ border: "1px solid black", padding: "0.5rem", textAlign: "center" }}>Nama/NIP/Jabatan</th>
                <th style={{ border: "1px solid black", padding: "0.5rem", textAlign: "center" }}>Jabatan dalam Kegiatan</th>
              </tr>
            </thead>
            <tbody>
              {susunanPanitia.map((item, index) => (
                <tr key={item.id}>
                  <td style={{ border: "1px solid black", padding: "0.5rem", textAlign: "center", verticalAlign: "middle" }}>{index + 1}.</td>
                  <td style={{ border: "1px solid black", padding: "0.5rem", verticalAlign: "middle" }}>
                    {item.nama}<br/>
                    NIP. {item.nip}<br/>
                    {item.jabatanInstansi}
                  </td>
                  <td style={{ border: "1px solid black", padding: "0.5rem", textAlign: "center", verticalAlign: "middle" }}>{item.jabatanKegiatan}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* TTD */}
          <div className="skp-ttd signature mt-16 ml-auto w-80">
            <p className="m-0">Kepala Balai,</p>
            <div className="skp-ttd-placeholder mt-4 h-24 box-border pt-10 pl-[1.35cm] text-zinc-400">${"{ttd_pengirim}"}</div>
            <p className="skp-signature-name m-0 mt-4">{kepalaBalai.nama}</p>
            <p className="m-0">NIP. {kepalaBalai.nip}</p>
          </div>
        </div>
      </article>
    </div>
  );
}




