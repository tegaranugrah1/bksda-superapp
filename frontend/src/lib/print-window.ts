/**
 * Shared HTML print window opener across BMN, Surat Tugas, and Persuratan.
 */

export interface OpenPrintWindowOptions {
  title: string;
  bodyHtml: string;
  headHtml?: string;
  styles?: string;
  bodyStyle?: string;
  bodyClassName?: string;
  docType?: boolean;
  htmlLang?: string;
  delayMs?: number;
  waitForImages?: boolean;
  closeAfterPrint?: boolean;
  onReady?: (printWindow: Window) => void;
}

export function resolveAbsoluteImageUrl(url: string): string {
  if (!url) return url;
  if (/^https?:\/\//i.test(url) || url.startsWith("data:")) return url;
  if (typeof window !== "undefined") {
    return `${window.location.origin}${url.startsWith("/") ? "" : "/"}${url}`;
  }
  return url;
}

export function cloneHtmlWithResolvedImages(
  source: HTMLElement,
  mutateClone?: (clone: HTMLElement) => void
): string {
  const clone = source.cloneNode(true) as HTMLElement;
  const imgs = clone.getElementsByTagName("img");
  for (let i = 0; i < imgs.length; i++) {
    const src = imgs[i].getAttribute("src");
    if (src) imgs[i].setAttribute("src", resolveAbsoluteImageUrl(src));
  }
  mutateClone?.(clone);
  return clone.innerHTML;
}

function escapePrintAttr(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function openPrintWindow({
  title,
  bodyHtml,
  headHtml = "",
  styles = "",
  bodyStyle = "",
  bodyClassName = "",
  docType = false,
  htmlLang = "",
  delayMs = 300,
  waitForImages = false,
  closeAfterPrint = false,
  onReady,
}: OpenPrintWindowOptions): Window | null {
  const printWindow = window.open("", "_blank");
  if (!printWindow) return null;

  const langAttr = htmlLang ? ` lang="${escapePrintAttr(htmlLang)}"` : "";
  const bodyAttrs = [
    bodyClassName ? `class="${escapePrintAttr(bodyClassName)}"` : "",
    bodyStyle ? `style="${escapePrintAttr(bodyStyle)}"` : "",
  ]
    .filter(Boolean)
    .join(" ");

  printWindow.document.write(`
    ${docType ? "<!DOCTYPE html>" : ""}
    <html${langAttr}>
      <head>
        <meta charset="utf-8" />
        <title>${escapePrintAttr(title)}</title>
        ${headHtml}
        <style>${styles}</style>
      </head>
      <body${bodyAttrs ? ` ${bodyAttrs}` : ""}>${bodyHtml}</body>
    </html>
  `);
  printWindow.document.close();

  if (onReady) {
    onReady(printWindow);
    return printWindow;
  }

  const triggerPrint = () => {
    printWindow.focus();
    if (closeAfterPrint) {
      printWindow.onafterprint = () => printWindow.close();
    }
    printWindow.print();
    if (closeAfterPrint) {
      // Some browsers trigger onafterprint lazily; match print onload behavior
      printWindow.onafterprint = () => printWindow.close();
    }
  };

  if (!waitForImages) {
    if (closeAfterPrint) {
      printWindow.onload = () => {
        printWindow.focus();
        printWindow.print();
        printWindow.close();
      };
    } else {
      setTimeout(() => {
        printWindow.focus();
        printWindow.print();
      }, delayMs);
    }
    return printWindow;
  }

  const printImages = printWindow.document.getElementsByTagName("img");
  let loaded = 0;
  const total = printImages.length;

  if (total === 0) {
    setTimeout(triggerPrint, delayMs);
    return printWindow;
  }

  for (let i = 0; i < total; i++) {
    if (printImages[i].complete) {
      loaded++;
    } else {
      printImages[i].onload = printImages[i].onerror = () => {
        loaded++;
        if (loaded >= total) triggerPrint();
      };
    }
  }
  if (loaded >= total) {
    setTimeout(triggerPrint, delayMs);
  }
  return printWindow;
}
