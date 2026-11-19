import { escapeDocumentData, safeDocumentImage, protectDocumentHtml, printDocument } from '../documentHtml';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
jest.mock('expo-print', () => ({ printToFileAsync: jest.fn() }));
jest.mock('expo-sharing', () => ({ isAvailableAsync: jest.fn(), shareAsync: jest.fn() }));
it('keeps document text as text and rejects executable image URLs', () => {
  const data = escapeDocumentData({ name: '<img src=x onerror="alert(1)">', items: ['A & B'], count: 0 });
  expect(data.name).toBe('&lt;img src=x onerror=&quot;alert(1)&quot;&gt;');
  expect(data.items).toEqual(['A &amp; B']); expect(data.count).toBe(0);
  expect(safeDocumentImage('javascript:alert(1)')).toBe('');
  expect(safeDocumentImage('data:image/svg+xml,<svg onload="alert(1)"/>')).toBe('');
  expect(safeDocumentImage('https://images.example.test/photo.png')).toBe('https://images.example.test/photo.png');
  expect(protectDocumentHtml('<html><head></head></html>')).toContain("default-src 'none'");
});
it('exports a real native PDF with a matching MIME type', async () => {
  (Print.printToFileAsync as jest.Mock).mockResolvedValue({ uri: 'file:///cache/dummy.pdf' });
  (Sharing.isAvailableAsync as jest.Mock).mockResolvedValue(true);
  await printDocument('<html><head></head><body>Dummy document</body></html>');
  expect(Sharing.shareAsync).toHaveBeenCalledWith('file:///cache/dummy.pdf', { UTI: '.pdf', mimeType: 'application/pdf' });
});
