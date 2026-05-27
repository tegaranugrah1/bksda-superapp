"use client";

import { toast } from "sonner";
import { formatDateLong } from "../_lib/auction-helpers";
import type { SkBuilderItem, SkKepalaBalai } from "../_lib/sk-defaults";
import type {
  SkTimPenilaiMemutuskan,
  TimPenilaiAnggota,
} from "../_lib/sk-tim-penilai-defaults";

interface SkTimPenilaiDocumentProps {
  skNumber: string;
  menimbang: SkBuilderItem[];
  mengingat: SkBuilderItem[];
  memutuskan: SkTimPenilaiMemutuskan;
  kepalaBalai: SkKepalaBalai;
  tembusan: SkBuilderItem[];
  susunanTimPenilai: TimPenilaiAnggota[];
}

// SK Tim Penilai uses a custom KAP suffix (KAP.06.01/B) — different from getSkNumberSuffix() which is KAP.05.
function getTimPenilaiNumberSuffix(date = new Date()) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `K.18/TU/KAP.06.01/B/${month}/${date.getFullYear()}`;
}

function renderKeduaText(text: string) {
  return text
    .split("\n")
    .filter((line) => line.trim().length > 0)
    .map((line, index) => {
      const trimmedLine = line.trim();
      const subItemMatch = trimmedLine.match(/^([a-z]\.)\s+(.*)$/i);
      const numberedItemMatch = trimmedLine.match(/^(\d+\.)\s+(.*)$/);

      if (subItemMatch) {
        return (
          <div className="sktp-kedua-item sktp-kedua-subitem" key={`${trimmedLine}-${index}`}>
            <span className="sktp-kedua-marker">{subItemMatch[1]}</span>
            <span className="sktp-kedua-item-text">{subItemMatch[2]}</span>
          </div>
        );
      }

      if (numberedItemMatch) {
        return (
          <div className="sktp-kedua-item" key={`${trimmedLine}-${index}`}>
            <span className="sktp-kedua-marker">{numberedItemMatch[1]}</span>
            <span className="sktp-kedua-item-text">{numberedItemMatch[2]}</span>
          </div>
        );
      }

      return (
        <div className="sktp-kedua-line" key={`${trimmedLine}-${index}`}>
          {trimmedLine}
        </div>
      );
    });
}

export function handlePrintSkTimPenilai() {
  const printContent = document.getElementById("sk-tim-penilai-print-root");
  if (!printContent) {
    toast.error("Tidak ada dokumen SK Tim Penilai untuk dicetak.");
    return;
  }
  const printWindow = window.open("", "_blank");
  if (!printWindow) return;

  printWindow.document.write(`
    <html>
      <head>
        <title>SK Tim Penilai BMN</title>
        <style>
          @page { size: A4; margin: 0; }
          @page sktp-main { size: A4; margin: 0; }
          @page sktp-main:first { size: A4; margin: 0; }
          * { box-sizing: border-box; }
          body {
            margin: 0; padding: 0; background: white; color: black;
            font-family: 'Bookman Old Style', Georgia, serif;
            font-size: 11pt; line-height: 1.25;
          }
          p { margin: 0; padding: 0; }
          .sktp-page {
            width: 210mm;
            margin: 0 auto; padding: 5mm 20mm 0;
          }
          .sktp-main-document { page: sktp-main; position: relative; }
          .sktp-print-root .sktp-page.sktp-main-document.sktp-main-paginated {
            height: 297mm !important;
            min-height: 297mm !important;
            padding: 5mm 20mm 28mm !important;
            overflow: hidden !important;
            position: relative !important;
            box-shadow: none !important;
          }
          .sktp-print-root .sktp-page.sktp-main-document.sktp-main-paginated.sktp-main-continuation-page {
            padding-top: 18mm !important;
          }
          .sktp-print-root .sktp-main-document.sktp-main-page-break {
            page-break-after: always;
            break-after: page;
          }
          .sktp-main-flow { width: 100%; }
          .sktp-main-paginated .sktp-paginated-field-section + .sktp-paginated-field-section { margin-top: 0 !important; }
          .sktp-main-paginated .sktp-paginated-field-section.sktp-section-start { margin-top: 0.5rem !important; }
          .sktp-page-ttd { padding-bottom: 0; }
          article { margin: 0; }
          .sktp-page-break { page-break-after: always; break-after: always; }
          .sktp-kop {
            margin-top: -5mm; margin-left: -16mm; margin-right: -16mm;
            margin-bottom: 6px; text-align: center;
          }
          .sktp-kop img { width: 196mm !important; max-width: 196mm !important; height: auto !important; display: block; margin: 0 auto; }
          .sktp-title {
            width: 166mm; margin-left: auto; margin-right: auto;
            margin-top: 10px; text-align: center; font-weight: bold; line-height: 1.3;
          }
          .sktp-title-nomor { font-weight: normal; }
          .sktp-title-tentang { margin-top: 10px; }
          .sktp-subtitle {
            width: 166mm; margin-left: auto; margin-right: auto;
            margin-top: 16px;
          }
          .sktp-subtitle > p { text-align: center; font-weight: bold; }
          .sktp-subtitle > p + p { margin-top: 6px; }
          .sktp-body { width: 166mm; margin-left: auto; margin-right: auto; }
          table { border-collapse: collapse; width: 100%; }
          td { vertical-align: top; padding: 0; }
          .sktp-field-section {
            display: grid;
            grid-template-columns: 28mm 8mm minmax(0, 1fr);
            break-inside: auto !important;
            page-break-inside: auto !important;
          }
          .sktp-field-section + .sktp-field-section { margin-top: 0.5rem; }
          .sktp-field-label, .sktp-field-colon { padding: 0; }
          .sktp-field-colon { text-align: center; }
          .sktp-mengingat-list {
            break-inside: auto !important;
            page-break-inside: auto !important;
          }
          .sktp-mengingat-item {
            display: grid;
            grid-template-columns: 9mm minmax(0, 1fr);
            break-inside: avoid !important;
            page-break-inside: avoid !important;
            padding-top: 0;
          }
          .sktp-mengingat-item:first-child { padding-top: 0; }
          .sktp-mengingat-text { text-align: justify; }
          .sktp-memutuskan { text-align: center; font-weight: bold; margin-bottom: 8px; }
          .sktp-ttd { width: 20rem; margin-left: auto; margin-top: 1.25rem; }
          .sktp-ttd, .sktp-ttd p { font-weight: normal !important; text-align: left !important; }
          .sktp-ttd p { margin: 0; padding: 0; line-height: 1.25; }
          .sktp-ttd-meta { display: grid !important; grid-template-columns: max-content auto 1fr; column-gap: 0.4rem; line-height: 1.3; }
          .sktp-ttd-meta span { font-weight: normal !important; text-align: left !important; }
          .sktp-keempat-group { break-inside: avoid !important; page-break-inside: avoid !important; }
          .sktp-signature-name { font-weight: normal !important; }
          .sktp-ttd-placeholder { height: 86px; padding-top: 28px; padding-left: 1.35cm; color: #94a3b8; font-weight: normal !important; text-align: left !important; margin-top: 0.75rem; margin-bottom: 0.75rem; }
          .sktp-continuation-word { position: absolute; right: 23mm; bottom: 31mm; width: 163mm; height: 0; line-height: 11pt; overflow: visible; white-space: nowrap; text-align: right !important; margin: 0; padding: 0; font-weight: normal !important; font-size: 11pt; z-index: 20; }
          .sktp-tembusan { margin-top: 1rem; }
          .sktp-tembusan, .sktp-tembusan p { font-weight: normal !important; text-align: left !important; }
          .sktp-tembusan p { margin: 0; padding: 0; line-height: 1.3; }
          .sktp-kedua-text { display: grid; row-gap: 0; white-space: normal; }
          .sktp-kedua-line { text-align: justify; }
          .sktp-kedua-item { display: grid; grid-template-columns: 7mm minmax(0, 1fr); column-gap: 0; text-align: left; }
          .sktp-kedua-subitem { margin-left: 8mm; }
          .sktp-kedua-marker { text-align: left; }
          .sktp-kedua-item-text { text-align: justify; }
          .sktp-lampiran {
            width: 210mm;
            margin: 0 auto;
            padding: 12mm 20mm 28mm;
            page-break-before: always;
            break-before: page;
          }
          .sktp-attachment-meta { width: 109mm; margin-left: auto; text-align: left; }
          .sktp-attachment-meta .meta-row { display: grid; grid-template-columns: 24mm 5mm minmax(0, 1fr); align-items: start; }
          .sktp-attachment-meta .meta-label { white-space: nowrap; }
          .sktp-attachment-meta .meta-colon { text-align: center; }
          .sktp-lampiran-title { text-align: center; font-weight: bold; line-height: 1.3; margin-top: 1.5rem; margin-bottom: 0.75rem; }
          .sktp-tabel { width: 100%; border-collapse: collapse; font-size: 10pt; }
          .sktp-tabel th, .sktp-tabel td { border: 1px solid #000; padding: 0.5rem; }
          .sktp-tabel td { vertical-align: middle; }
        </style>
      </head>
      <body>${printContent.innerHTML}</body>
    </html>
  `);
  printWindow.document.close();
  printWindow.focus();

  // JS pagination: split main page into explicit A4 pages,
  // inject continuation words at page breaks, with bottom safe area for BSrE
  // and top safe area on continuation pages.
  setTimeout(() => {
    try {
      const doc = printWindow.document;
      const body = doc.body;
      if (!body) {
        printWindow.print();
        return;
      }

      const paginationStyle = doc.createElement("style");
      paginationStyle.textContent = `
        @page sktp-main { size: A4; margin: 0; }
        @page sktp-main:first { size: A4; margin: 0; }
        .sktp-print-root .sktp-page.sktp-main-document.sktp-main-paginated {
          height: 297mm !important;
          min-height: 297mm !important;
          padding: 5mm 20mm 28mm !important;
          overflow: hidden !important;
          position: relative !important;
          box-shadow: none !important;
        }
        .sktp-print-root .sktp-page.sktp-main-document.sktp-main-paginated.sktp-main-continuation-page {
          padding-top: 18mm !important;
        }
        .sktp-print-root .sktp-main-document.sktp-main-page-break {
          page-break-after: always;
          break-after: page;
        }
        .sktp-main-paginated .sktp-paginated-field-section + .sktp-paginated-field-section {
          margin-top: 0 !important;
        }
        .sktp-main-paginated .sktp-paginated-field-section.sktp-section-start {
          margin-top: 0.5rem !important;
        }
        .sktp-continuation-word {
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
      const firstPageContentH = 264 * mmToPx;
      const continuationContentH = 251 * mmToPx;
      const markerReserveH = 9 * mmToPx;

      const mainDoc = doc.querySelector(".sktp-main-document");
      if (!mainDoc) {
        printWindow.print();
        return;
      }

      const root = mainDoc.parentElement;
      if (!root) {
        printWindow.print();
        return;
      }

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
        section.className = "sktp-field-section sktp-paginated-field-section";
        section.style.marginTop = marginTop ? "0.75rem" : "0";
        if (marginTop) section.classList.add("sktp-section-start");

        const label = doc.createElement("div");
        label.className = "sktp-field-label";
        label.textContent = showSectionLabel ? sectionLabel : "";

        const colon = doc.createElement("div");
        colon.className = "sktp-field-colon";
        colon.textContent = showSectionLabel ? ":" : "";

        const list = doc.createElement("div");
        list.className = "sktp-mengingat-list";
        const itemClone = cloneElement(item);
        itemClone.style.paddingTop = "0";
        list.appendChild(itemClone);

        section.append(label, colon, list);
        return section;
      };

      const createDecisionBlock = (rows: HTMLElement[]) => {
        const table = doc.createElement("table");
        table.className = "sktp-mengingat-table";
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
        page.className = "sktp-page sktp-page-ttd sktp-main-document sktp-main-paginated mx-auto max-w-[210mm] bg-white px-24 py-9 text-black";
        if (!isFirstPage) page.classList.add("sktp-main-continuation-page");
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
        flow.className = "sktp-main-flow";
        page.appendChild(flow);

        const bodyWrap = doc.createElement("div");
        bodyWrap.className = "sktp-body";
        flow.appendChild(bodyWrap);

        return { page, flow, bodyWrap };
      };

      const addContinuationWord = (page: HTMLElement, label: string) => {
        const contWord = doc.createElement("p");
        contWord.className = "sktp-continuation-word";
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

      const contentWrap = mainDoc.querySelector<HTMLElement>(".sktp-subtitle");
      const contentSections = contentWrap?.querySelector<HTMLElement>("div");
      const fieldSections = contentSections?.querySelectorAll<HTMLElement>(":scope > .sktp-field-section");
      const menimbangItems = fieldSections?.[0]?.querySelectorAll<HTMLElement>(".sktp-mengingat-item") || [];
      const mengingatItems = fieldSections?.[1]?.querySelectorAll<HTMLElement>(".sktp-mengingat-item") || [];

      const explicitMemutuskanHeading = mainDoc.querySelector<HTMLElement>(".sktp-memutuskan");
      const explicitMemRows = Array.from(mainDoc.querySelectorAll<HTMLElement>(".sktp-mengingat-row"));
      const keempatGroup = mainDoc.querySelector<HTMLElement>(".sktp-keempat-group");

      let currentPage = makePage(true);
      root.insertBefore(currentPage.page, mainDoc);

      const kop = mainDoc.querySelector<HTMLElement>(".sktp-kop");
      const title = mainDoc.querySelector<HTMLElement>(".sktp-title");
      const intro = doc.createElement("div");
      intro.className = "sktp-subtitle sktp-body";
      const introParagraphs = Array.from(contentWrap?.children || []).filter((child) => {
        return child.tagName === "P" && !(child as HTMLElement).classList.contains("sktp-memutuskan");
      });
      introParagraphs.forEach((child) => intro.appendChild(cloneElement(child as HTMLElement)));

      const firstBody = currentPage.bodyWrap;
      currentPage.flow.insertBefore(intro, firstBody);
      if (title) currentPage.flow.insertBefore(cloneElement(title), intro);
      if (kop) currentPage.flow.insertBefore(cloneElement(kop), currentPage.flow.firstChild);
      let currentUsedHeight = measureFlowContentHeight(currentPage.flow);

      const blocks: { el: HTMLElement; label: string }[] = [];

      // Menimbang items
      Array.from(menimbangItems).forEach((item, index) => {
        const num = item.querySelector("div:first-child")?.textContent || "";
        const text = item.querySelector(".sktp-mengingat-text")?.textContent || "";
        blocks.push({
          el: createFieldBlock("Menimbang", item, index === 0),
          label: continuationLabel(num || (index === 0 ? "" : ""), text),
        });
      });

      // Mengingat items
      Array.from(mengingatItems).forEach((item, index) => {
        const num = item.querySelector("div:first-child")?.textContent || "";
        const text = item.querySelector(".sktp-mengingat-text")?.textContent || "";
        blocks.push({
          el: createFieldBlock("Mengingat", item, index === 0, index === 0),
          label: continuationLabel(num, text),
        });
      });

      // Memutuskan + Menetapkan + KESATU + KEDUA + KETIGA + KEEMPAT
      if (explicitMemutuskanHeading && explicitMemRows[0]) {
        blocks.push({
          el: createMemutuskanMenetapkanBlock(explicitMemutuskanHeading, explicitMemRows[0]),
          label: "MEMUTUSKAN.....",
        });
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
      if (explicitMemRows[3]) {
        blocks.push({ el: createDecisionBlock([explicitMemRows[3]]), label: "KETIGA....." });
      }
      if (keempatGroup) {
        blocks.push({ el: cloneElement(keempatGroup), label: "KEEMPAT....." });
      }

      blocks.forEach((block, index) => {
        const isLastBlock = index === blocks.length - 1;
        const contentLimit = currentPage.page.classList.contains("sktp-main-continuation-page")
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
          currentPage.page.classList.add("sktp-main-page-break");
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

export function SkTimPenilaiDocument({
  skNumber,
  menimbang,
  mengingat,
  memutuskan,
  kepalaBalai,
  tembusan,
  susunanTimPenilai,
}: SkTimPenilaiDocumentProps) {
  const today = new Date();
  const skNumberText = `SK.${skNumber.trim() || "____"}/${getTimPenilaiNumberSuffix(today)}`;
  const mengingatTexts = mengingat.map((m) => m.text);

  const pageStyle: React.CSSProperties = {
    fontFamily: "'Bookman Old Style', Georgia, serif",
    fontSize: "11pt",
    lineHeight: "1.25",
  };

  return (
    <div id="sk-tim-penilai-print-root" className="sktp-print-root">
      <style jsx global>{`
        .sktp-print-root .sktp-page {
          width: 210mm;
          margin-left: auto;
          margin-right: auto;
          box-sizing: border-box;
        }
        .sktp-print-root .sktp-main-document {
          padding: 5mm 20mm 0 !important;
        }
        .sktp-print-root .sktp-kop {
          margin-top: -5mm;
          margin-left: -16mm;
          margin-right: -16mm;
          margin-bottom: 4px;
          text-align: center;
        }
        .sktp-print-root .sktp-kop img {
          width: 196mm !important;
          max-width: 196mm !important;
          height: auto !important;
          display: block;
          margin: 0 auto;
        }
        .sktp-print-root .sktp-title,
        .sktp-print-root .sktp-subtitle,
        .sktp-print-root .sktp-body {
          width: 166mm;
          margin-left: auto;
          margin-right: auto;
        }
        .sktp-print-root .sktp-title {
          margin-top: 10px;
          text-align: center;
          font-weight: bold;
          line-height: 1.3;
        }
        .sktp-print-root .sktp-title-nomor { font-weight: normal; }
        .sktp-print-root .sktp-title-tentang { margin-top: 10px; }
        .sktp-print-root .sktp-subtitle { margin-top: 16px; }
        .sktp-print-root .sktp-subtitle > p { text-align: center; font-weight: bold; }
        .sktp-print-root .sktp-subtitle > p + p { margin-top: 6px; }
        .sktp-print-root p { margin: 0; padding: 0; }
        .sktp-print-root table { border-collapse: collapse; width: 100%; }
        .sktp-print-root td { vertical-align: top; padding: 0; }
        .sktp-print-root .sktp-field-section {
          display: grid;
          grid-template-columns: 28mm 8mm minmax(0, 1fr);
          break-inside: auto;
          page-break-inside: auto;
        }
        .sktp-print-root .sktp-field-section + .sktp-field-section { margin-top: 0.5rem; }
        .sktp-print-root .sktp-field-colon { text-align: center; }
        .sktp-print-root .sktp-mengingat-list { break-inside: auto; page-break-inside: auto; }
        .sktp-print-root .sktp-mengingat-item {
          display: grid;
          grid-template-columns: 9mm minmax(0, 1fr);
          break-inside: avoid;
          page-break-inside: avoid;
          padding-top: 0;
        }
        .sktp-print-root .sktp-mengingat-item:first-child { padding-top: 0; }
        .sktp-print-root .sktp-mengingat-text { text-align: justify; }
        .sktp-print-root .sktp-memutuskan {
          text-align: center;
          font-weight: bold;
          margin-bottom: 8px;
        }
        .sktp-print-root .sktp-ttd {
          width: 20rem;
          margin-left: auto;
          margin-top: 1.25rem;
        }
        .sktp-print-root .sktp-ttd,
        .sktp-print-root .sktp-ttd p,
        .sktp-print-root .sktp-tembusan,
        .sktp-print-root .sktp-tembusan p {
          font-weight: normal !important;
          text-align: left !important;
        }
        .sktp-print-root .sktp-ttd p,
        .sktp-print-root .sktp-tembusan p {
          margin: 0;
          padding: 0;
        }
        .sktp-print-root .sktp-keempat-group { break-inside: avoid !important; page-break-inside: avoid !important; }
        .sktp-print-root .sktp-signature-name { font-weight: normal !important; }
        .sktp-print-root .sktp-ttd-placeholder {
          box-sizing: border-box;
          height: 86px;
          padding-top: 28px;
          padding-left: 1.35cm;
          color: #94a3b8;
          font-weight: normal !important;
          text-align: left !important;
          margin-top: 0.75rem;
          margin-bottom: 0.75rem;
        }
        .sktp-print-root .sktp-tembusan { margin-top: 1rem; }
        .sktp-print-root .sktp-tembusan p { line-height: 1.3; }
        .sktp-print-root .sktp-kedua-text { display: grid; row-gap: 0; white-space: normal; }
        .sktp-print-root .sktp-kedua-line { text-align: justify; }
        .sktp-print-root .sktp-kedua-item {
          display: grid;
          grid-template-columns: 7mm minmax(0, 1fr);
          column-gap: 0;
          text-align: left;
        }
        .sktp-print-root .sktp-kedua-subitem { margin-left: 8mm; }
        .sktp-print-root .sktp-kedua-marker { text-align: left; }
        .sktp-print-root .sktp-kedua-item-text { text-align: justify; }
        .sktp-print-root .sktp-lampiran { page-break-before: always; break-before: page; }
        .sktp-print-root .sktp-attachment-meta { width: 109mm; margin-left: auto; text-align: left; }
        .sktp-print-root .sktp-attachment-meta .meta-row {
          display: grid;
          grid-template-columns: 24mm 5mm minmax(0, 1fr);
          align-items: start;
        }
        .sktp-print-root .sktp-attachment-meta .meta-label { white-space: nowrap; }
        .sktp-print-root .sktp-attachment-meta .meta-colon { text-align: center; }
        .sktp-print-root .sktp-lampiran-title {
          text-align: center;
          font-weight: bold;
          line-height: 1.3;
          margin-top: 1.5rem;
          margin-bottom: 0.75rem;
        }
        .sktp-print-root .sktp-tabel { width: 100%; border-collapse: collapse; font-size: 10pt; }
        .sktp-print-root .sktp-tabel th, .sktp-print-root .sktp-tabel td { border: 1px solid #000; padding: 0.5rem; }
        .sktp-print-root .sktp-tabel td { vertical-align: middle; }
      `}</style>

      {/* === HALAMAN UTAMA === */}
      <article
        className="sktp-page sktp-page-ttd sktp-main-document mx-auto max-w-[210mm] bg-white px-24 py-9 text-black shadow-xl ring-1 ring-zinc-200"
        style={pageStyle}
      >
        <div className="sktp-kop" style={{ marginTop: "-5mm", marginLeft: "-16mm", marginRight: "-16mm", marginBottom: "4px", textAlign: "center" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/header-new.png" alt="Kop Surat" style={{ width: "196mm", maxWidth: "196mm", height: "auto", display: "block", margin: "0 auto" }} />
        </div>

        <div className="sktp-title mx-auto mt-3 w-[166mm] text-center font-bold leading-snug">
          <p className="m-0">KEPUTUSAN KEPALA BALAI</p>
          <p className="m-0">KONSERVASI SUMBER DAYA ALAM KALIMANTAN TIMUR</p>
          <p className="sktp-title-nomor m-0 font-normal">Nomor : {skNumberText}</p>
          <p className="sktp-title-tentang m-0 mt-2">TENTANG</p>
          <p className="m-0">PEMBENTUKAN PANITIA PENAKSIR HARGA BARANG MILIK NEGARA</p>
          <p className="m-0">PADA BALAI KONSERVASI SUMBER DAYA ALAM KALIMANTAN TIMUR</p>
        </div>

        <div className="sktp-subtitle sktp-body mx-auto mt-3 w-[166mm]">
          <p className="text-center font-bold">DENGAN RAHMAT TUHAN YANG MAHA ESA</p>
          <p className="mt-2 text-center font-bold">
            KEPALA BALAI KONSERVASI SUMBER DAYA ALAM KALIMANTAN TIMUR,
          </p>

          {/* Menimbang + Mengingat */}
          <div className="mt-2">
            <div className="sktp-field-section">
              <div className="sktp-field-label">Menimbang</div>
              <div className="sktp-field-colon">:</div>
              <div className="sktp-mengingat-list">
                {menimbang.length === 1 ? (
                  <div className="sktp-mengingat-item">
                    <div></div>
                    <div className="sktp-mengingat-text">{menimbang[0].text}</div>
                  </div>
                ) : (
                  menimbang.map((item, i) => (
                    <div
                      className="sktp-mengingat-item"
                      key={item.id}
                      style={i === 0 ? undefined : { paddingTop: "0.15rem" }}
                    >
                      <div>{String.fromCharCode(97 + i)}.</div>
                      <div className="sktp-mengingat-text">{item.text}</div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="sktp-field-section">
              <div className="sktp-field-label">Mengingat</div>
              <div className="sktp-field-colon">:</div>
              <div className="sktp-mengingat-list">
                {mengingatTexts.map((item, i) => (
                  <div className="sktp-mengingat-item" key={i}>
                    <div>{i + 1}.</div>
                    <div className="sktp-mengingat-text">{item}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* MEMUTUSKAN */}
          <p className="sktp-memutuskan text-center font-bold" style={{ marginTop: "0.75rem" }}>MEMUTUSKAN</p>

          <table className="sktp-mengingat-table mt-4 w-full" style={{ borderCollapse: "collapse" }}>
            <tbody>
              <tr className="sktp-mengingat-row">
                <td style={{ width: "28mm", verticalAlign: "top" }}>Menetapkan</td>
                <td style={{ width: "8mm", textAlign: "center", verticalAlign: "top" }}>:</td>
                <td style={{ verticalAlign: "top", textTransform: "uppercase", textAlign: "justify" }}>
                  {memutuskan.menetapkan}
                </td>
              </tr>
              <tr className="sktp-mengingat-row">
                <td style={{ width: "28mm", verticalAlign: "top", paddingTop: "0.4rem" }}>KESATU</td>
                <td style={{ width: "8mm", textAlign: "center", verticalAlign: "top", paddingTop: "0.4rem" }}>:</td>
                <td style={{ verticalAlign: "top", paddingTop: "0.4rem", textAlign: "justify" }}>
                  {memutuskan.kesatu}
                </td>
              </tr>
              <tr className="sktp-mengingat-row">
                <td style={{ width: "28mm", verticalAlign: "top", paddingTop: "0.4rem" }}>KEDUA</td>
                <td style={{ width: "8mm", textAlign: "center", verticalAlign: "top", paddingTop: "0.4rem" }}>:</td>
                <td style={{ verticalAlign: "top", paddingTop: "0.4rem", textAlign: "justify" }}>
                  <div className="sktp-kedua-text">{renderKeduaText(memutuskan.kedua)}</div>
                </td>
              </tr>
              <tr className="sktp-mengingat-row">
                <td style={{ width: "28mm", verticalAlign: "top", paddingTop: "0.4rem" }}>KETIGA</td>
                <td style={{ width: "8mm", textAlign: "center", verticalAlign: "top", paddingTop: "0.4rem" }}>:</td>
                <td style={{ verticalAlign: "top", paddingTop: "0.4rem", textAlign: "justify" }}>
                  {memutuskan.ketiga}
                </td>
              </tr>
            </tbody>
          </table>

          {/* KEEMPAT + TTD + Tembusan grouped */}
          <div className="sktp-keempat-group">
            <table className="sktp-mengingat-table mt-0 w-full" style={{ borderCollapse: "collapse" }}>
              <tbody>
                <tr className="sktp-mengingat-row">
                  <td style={{ width: "28mm", verticalAlign: "top", paddingTop: "0.4rem" }}>KEEMPAT</td>
                  <td style={{ width: "8mm", textAlign: "center", verticalAlign: "top", paddingTop: "0.4rem" }}>:</td>
                  <td style={{ verticalAlign: "top", paddingTop: "0.4rem", textAlign: "justify" }}>
                    {memutuskan.keempat}
                  </td>
                </tr>
              </tbody>
            </table>

            {/* TTD */}
            <div className="sktp-ttd signature mt-4 ml-auto w-80">
              <div className="sktp-ttd-meta" style={{ display: "grid", gridTemplateColumns: "max-content auto 1fr", columnGap: "0.4rem" }}>
                <span>Ditetapkan di</span>
                <span>:</span>
                <span>Samarinda</span>
                <span>Pada tanggal</span>
                <span>:</span>
                <span>{formatDateLong(today)}</span>
              </div>
              <p className="m-0 mt-3">Kepala Balai,</p>
              <div className="sktp-ttd-placeholder mt-3 h-20 box-border pt-7 pl-[1.35cm] text-zinc-400">${"{ttd_pengirim}"}</div>
              <p className="sktp-signature-name m-0 mt-4">{kepalaBalai.nama}</p>
              <p className="m-0">NIP. {kepalaBalai.nip}</p>
            </div>

            {/* Tembusan */}
            {tembusan.length > 0 && (
              <div className="sktp-tembusan mt-4">
                <p className="m-0">Tembusan</p>
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

      {/* === HALAMAN LAMPIRAN === */}
      <article
        className="sktp-page sktp-lampiran mx-auto max-w-[210mm] bg-white px-24 py-9 text-black shadow-xl ring-1 ring-zinc-200"
        style={pageStyle}
      >
        <div className="sktp-body mx-auto w-[166mm]">
          {/* Meta header */}
          <div className="sktp-attachment-meta ml-auto w-[109mm]">
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
          <p className="sktp-lampiran-title mt-6 text-center font-bold leading-snug">
            SUSUNAN PANITIA PENAKSIR HARGA BARANG MILIK NEGARA<br />
            PADA BALAI KONSERVASI SUMBER DAYA ALAM KALIMANTAN TIMUR
          </p>

          {/* Susunan Tabel — 4 kolom */}
          <table className="sktp-tabel" style={{ width: "100%", borderCollapse: "collapse", marginTop: "2rem", fontSize: "10pt" }}>
            <thead>
              <tr>
                <th style={{ border: "1px solid black", padding: "0.5rem", width: "10mm", textAlign: "center" }}>No.</th>
                <th style={{ border: "1px solid black", padding: "0.5rem", textAlign: "center" }}>Nama/NIP</th>
                <th style={{ border: "1px solid black", padding: "0.5rem", textAlign: "center" }}>Jabatan dalam Kegiatan</th>
                <th style={{ border: "1px solid black", padding: "0.5rem", textAlign: "center", width: "30mm" }}>Keterangan</th>
              </tr>
            </thead>
            <tbody>
              {susunanTimPenilai.map((item, index) => (
                <tr key={item.id}>
                  <td style={{ border: "1px solid black", padding: "0.5rem", textAlign: "center", verticalAlign: "middle" }}>{index + 1}.</td>
                  <td style={{ border: "1px solid black", padding: "0.5rem", verticalAlign: "middle" }}>
                    {item.nama}<br/>
                    NIP. {item.nip}
                  </td>
                  <td style={{ border: "1px solid black", padding: "0.5rem", textAlign: "center", verticalAlign: "middle" }}>{item.jabatanKegiatan}</td>
                  <td style={{ border: "1px solid black", padding: "0.5rem", textAlign: "center", verticalAlign: "middle" }}>{item.keterangan}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* TTD */}
          <div className="sktp-ttd signature mt-16 ml-auto w-80">
            <p className="m-0">Kepala Balai,</p>
            <div className="sktp-ttd-placeholder mt-4 h-24 box-border pt-10 pl-[1.35cm] text-zinc-400">${"{ttd_pengirim}"}</div>
            <p className="sktp-signature-name m-0 mt-4">{kepalaBalai.nama}</p>
            <p className="m-0">NIP. {kepalaBalai.nip}</p>
          </div>
        </div>
      </article>
    </div>
  );
}
