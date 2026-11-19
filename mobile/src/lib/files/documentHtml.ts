import { Platform } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);
}

/** Escape text leaves before interpolating data into a trusted document template. */
export function escapeDocumentData<T>(value: T): T {
  if (typeof value === 'string') return escapeHtml(value) as T;
  if (Array.isArray(value)) return value.map(item => escapeDocumentData(item)) as T;
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, escapeDocumentData(item)])) as T;
  return value;
}

export function safeDocumentImage(value: unknown): string {
  if (typeof value !== 'string') return '';
  if (/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=\r\n]+$/.test(value)) return value;
  try {
    const url = new URL(value);
    if (url.username || url.password) return '';
    if (url.protocol === 'https:' || (url.protocol === 'http:' && __DEV__) || url.protocol === 'blob:') return value;
    if (Platform.OS !== 'web' && ['file:', 'content:'].includes(url.protocol)) return value;
  } catch { /* Reject relative, malformed and executable URLs. */ }
  return '';
}

export function protectDocumentHtml(html: string): string {
  const policy = "default-src 'none'; img-src data: blob: https:" + (__DEV__ ? ' http:' : '') + (Platform.OS !== 'web' ? ' file: content:' : '') + "; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'";
  return html.replace(/<head>/i, `<head><meta http-equiv="Content-Security-Policy" content="${policy}"><meta name="referrer" content="no-referrer">`);
}

export async function printDocument(html: string): Promise<void> {
  const protectedHtml = protectDocumentHtml(html);
  if (Platform.OS !== 'web') {
    const { uri } = await Print.printToFileAsync({ html: protectedHtml });
    if (!await Sharing.isAvailableAsync()) throw new Error('Fitur berbagi PDF tidak tersedia di perangkat ini.');
    await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
    return;
  }
  await new Promise<void>((resolve, reject) => {
    const frame = document.createElement('iframe');
    frame.title = 'Cetak dokumen';
    frame.setAttribute('sandbox', 'allow-same-origin allow-modals');
    frame.referrerPolicy = 'no-referrer';
    Object.assign(frame.style, { position: 'fixed', width: '1px', height: '1px', opacity: '0', pointerEvents: 'none' });
    const cleanup = () => { clearTimeout(timeout); frame.remove(); };
    const timeout = setTimeout(cleanup, 300_000);
    frame.onload = () => {
      try {
        if (!frame.contentWindow) throw new Error('Pratinjau cetak belum tersedia.');
        frame.contentWindow.onafterprint = cleanup;
        frame.contentWindow.focus(); frame.contentWindow.print(); resolve();
      } catch (error) { cleanup(); reject(error); }
    };
    frame.onerror = () => { cleanup(); reject(new Error('Dokumen belum dapat dicetak.')); };
    frame.srcdoc = protectedHtml;
    document.body.appendChild(frame);
  });
}
