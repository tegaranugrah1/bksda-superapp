// Shared print-pagination engine for the BMN "SK" (Keputusan) documents:
// SK Penghentian, SK Panitia, and SK Tim Penilai.
//
// All three documents render their main page (KOP + title + Menimbang +
// Mengingat + MEMUTUSKAN + TTD) into a hidden print root, then run an
// identical JS pagination pass inside the opened print window. The pass:
//   1. measures the live A4 layout,
//   2. re-flows the Menimbang / Mengingat / decision blocks into explicit
//      297mm pages with a bottom safe area (for BSrE QR placement), and
//   3. injects right-aligned "continuation words" at each page break.
//
// The only things that differ between documents are a CSS class prefix, the
// `section-start` top margin, and the set of decision-row labels / final
// "group" block. Those are expressed via {@link SkPaginationConfig} so the
// algorithm itself lives in a single place.

export interface SkPaginationConfig {
  /** CSS class prefix without trailing dash, e.g. "sk", "skp", "sktp". */
  prefix: string;
  /** Top margin applied to the first item of each field section in print. */
  sectionStartMarginTop: string;
  /**
   * Continuation labels for `explicitMemRows[1..]` (row 0 is always paired
   * with the MEMUTUSKAN heading). e.g. ["KESATU.....", "KEDUA....."].
   */
  decisionRowLabels: string[];
  /** Class of the final grouped decision block, e.g. "sk-ketiga-group". */
  finalGroupClass: string;
  /** Continuation label for the final grouped block, e.g. "KETIGA.....". */
  finalGroupLabel: string;
}

/**
 * Build the `<style>` markup (a single rules string) injected before the
 * pagination pass. Kept identical to the inline versions previously embedded
 * in each document, parameterised only by prefix and section margin.
 */
function buildPaginationStyle(p: string, sectionStartMarginTop: string): string {
  return `
        @page ${p}-main { size: A4; margin: 0; }
        @page ${p}-main:first { size: A4; margin: 0; }
        .${p}-print-root .${p}-page.${p}-main-document.${p}-main-paginated {
          height: 297mm !important;
          min-height: 297mm !important;
          padding: 5mm 20mm 28mm !important;
          overflow: hidden !important;
          position: relative !important;
          box-shadow: none !important;
        }
        .${p}-print-root .${p}-page.${p}-main-document.${p}-main-paginated.${p}-main-continuation-page {
          padding-top: 18mm !important;
        }
        .${p}-print-root .${p}-main-document.${p}-main-page-break {
          page-break-after: always;
          break-after: page;
        }
        .${p}-main-paginated .${p}-paginated-field-section + .${p}-paginated-field-section {
          margin-top: 0 !important;
        }
        .${p}-main-paginated .${p}-paginated-field-section.${p}-section-start {
          margin-top: ${sectionStartMarginTop} !important;
        }
        .${p}-continuation-word {
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
}

/**
 * Run the shared SK pagination pass inside an already-populated print window.
 * Falls back to a plain `print()` if the expected DOM structure is missing.
 *
 * This should be called inside the `setTimeout(..., 600)` that waits for the
 * print window's initial render, mirroring the original per-document code.
 */
export function runSkPagination(printWindow: Window, config: SkPaginationConfig): void {
  const p = config.prefix;
  try {
    const doc = printWindow.document;
    const body = doc.body;
    if (!body) {
      printWindow.print();
      return;
    }

    const paginationStyle = doc.createElement("style");
    paginationStyle.textContent = buildPaginationStyle(p, config.sectionStartMarginTop);
    body.appendChild(paginationStyle);

    // Force layout by reading offsetHeight
    void body.offsetHeight;

    const mmToPx = 96 / 25.4;
    const firstPageContentH = 264 * mmToPx;
    const continuationContentH = 251 * mmToPx;
    const markerReserveH = 9 * mmToPx;

    const mainDoc = doc.querySelector(`.${p}-main-document`);
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
      section.className = `${p}-field-section ${p}-paginated-field-section`;
      section.style.marginTop = marginTop ? "0.75rem" : "0";
      if (marginTop) section.classList.add(`${p}-section-start`);

      const label = doc.createElement("div");
      label.className = `${p}-field-label`;
      label.textContent = showSectionLabel ? sectionLabel : "";

      const colon = doc.createElement("div");
      colon.className = `${p}-field-colon`;
      colon.textContent = showSectionLabel ? ":" : "";

      const list = doc.createElement("div");
      list.className = `${p}-mengingat-list`;
      const itemClone = cloneElement(item);
      itemClone.style.paddingTop = "0";
      list.appendChild(itemClone);

      section.append(label, colon, list);
      return section;
    };

    const createDecisionBlock = (rows: HTMLElement[]) => {
      const table = doc.createElement("table");
      table.className = `${p}-mengingat-table`;
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
      page.className = `${p}-page ${p}-page-ttd ${p}-main-document ${p}-main-paginated mx-auto max-w-[210mm] bg-white px-24 py-9 text-black`;
      if (!isFirstPage) page.classList.add(`${p}-main-continuation-page`);
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
      flow.className = `${p}-main-flow`;
      page.appendChild(flow);

      const bodyWrap = doc.createElement("div");
      bodyWrap.className = `${p}-body`;
      flow.appendChild(bodyWrap);

      return { page, flow, bodyWrap };
    };

    const addContinuationWord = (page: HTMLElement, label: string) => {
      const contWord = doc.createElement("p");
      contWord.className = `${p}-continuation-word`;
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

    const contentWrap = mainDoc.querySelector<HTMLElement>(`.${p}-subtitle`);
    const contentSections = contentWrap?.querySelector<HTMLElement>("div");
    const fieldSections = contentSections?.querySelectorAll<HTMLElement>(`:scope > .${p}-field-section`);
    const menimbangItems = fieldSections?.[0]?.querySelectorAll<HTMLElement>(`.${p}-mengingat-item`) || [];
    const mengingatItems = fieldSections?.[1]?.querySelectorAll<HTMLElement>(`.${p}-mengingat-item`) || [];

    const explicitMemutuskanHeading = mainDoc.querySelector<HTMLElement>(`.${p}-memutuskan`);
    const explicitMemRows = Array.from(mainDoc.querySelectorAll<HTMLElement>(`.${p}-mengingat-row`));
    const finalGroup = mainDoc.querySelector<HTMLElement>(`.${config.finalGroupClass}`);

    let currentPage = makePage(true);
    root.insertBefore(currentPage.page, mainDoc);

    const kop = mainDoc.querySelector<HTMLElement>(`.${p}-kop`);
    const title = mainDoc.querySelector<HTMLElement>(`.${p}-title`);
    const intro = doc.createElement("div");
    intro.className = `${p}-subtitle ${p}-body`;
    const introParagraphs = Array.from(contentWrap?.children || []).filter((child) => {
      return child.tagName === "P" && !(child as HTMLElement).classList.contains(`${p}-memutuskan`);
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
      const text = item.querySelector(`.${p}-mengingat-text`)?.textContent || "";
      blocks.push({
        el: createFieldBlock("Menimbang", item, index === 0),
        label: continuationLabel(num, text),
      });
    });

    Array.from(mengingatItems).forEach((item, index) => {
      const num = item.querySelector("div:first-child")?.textContent || "";
      const text = item.querySelector(`.${p}-mengingat-text`)?.textContent || "";
      blocks.push({
        el: createFieldBlock("Mengingat", item, index === 0, index === 0),
        label: continuationLabel(num, text),
      });
    });

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

    config.decisionRowLabels.forEach((label, i) => {
      const row = explicitMemRows[i + 1];
      if (row) {
        blocks.push({ el: createDecisionBlock([row]), label });
      }
    });

    if (finalGroup) {
      blocks.push({ el: cloneElement(finalGroup), label: config.finalGroupLabel });
    }

    blocks.forEach((block, index) => {
      const isLastBlock = index === blocks.length - 1;
      const contentLimit = currentPage.page.classList.contains(`${p}-main-continuation-page`)
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
        currentPage.page.classList.add(`${p}-main-page-break`);
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
}

/**
 * Open a print window, write the document HTML + the supplied static print
 * CSS, then schedule the shared pagination pass. Returns early (with a no-op)
 * if the print root is missing or the window was blocked.
 */
export function openSkPrintWindow(options: {
  rootId: string;
  title: string;
  printCss: string;
  config: SkPaginationConfig;
}): void {
  const printContent = document.getElementById(options.rootId);
  if (!printContent) return;
  const printWindow = window.open("", "_blank");
  if (!printWindow) return;

  printWindow.document.write(`
    <html>
      <head>
        <title>${options.title}</title>
        <style>${options.printCss}</style>
      </head>
      <body>${printContent.innerHTML}</body>
    </html>
  `);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => runSkPagination(printWindow, options.config), 600);
}
