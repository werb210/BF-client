import { describe, it, expect } from 'vitest';
import {
  normalizeScanResult,
  scanFileName,
  toQueueItems,
  isCancelled,
} from '../documentScanner';

describe('v132 document scanner', () => {
  it('detects a cancellation from any wording', () => {
    expect(isCancelled(new Error('User cancelled'))).toBe(true);
    expect(isCancelled({ message: 'scanner dismissed' })).toBe(true);
    expect(isCancelled(new Error('camera unavailable'))).toBe(false);
  });

  it('normalizes a flat pdfPath result', () => {
    const r = normalizeScanResult({ pdfPath: 'file:///tmp/scan.pdf' });
    expect(r.format).toBe('pdf');
    expect(r.refs).toEqual(['file:///tmp/scan.pdf']);
    expect(r.cancelled).toBe(false);
  });

  it('normalizes a nested pdf.uri result', () => {
    const r = normalizeScanResult({ pdf: { uri: 'file:///tmp/x.pdf', pageCount: 3 } });
    expect(r.format).toBe('pdf');
    expect(r.refs).toEqual(['file:///tmp/x.pdf']);
  });

  it('normalizes per-page image arrays of strings', () => {
    const r = normalizeScanResult({ scannedImages: ['file:///a.jpg', 'file:///b.jpg'] });
    expect(r.format).toBe('image');
    expect(r.refs.length).toBe(2);
  });

  it('normalizes per-page image arrays of objects', () => {
    const r = normalizeScanResult({ pages: [{ uri: 'file:///a.jpg' }, { path: 'file:///b.jpg' }] });
    expect(r.refs).toEqual(['file:///a.jpg', 'file:///b.jpg']);
  });

  it('treats an empty result as cancelled', () => {
    expect(normalizeScanResult({}).cancelled).toBe(true);
    expect(normalizeScanResult(null).cancelled).toBe(true);
    expect(normalizeScanResult({ scannedImages: [] }).cancelled).toBe(true);
  });

  it('builds safe file names', () => {
    expect(scanFileName('Bank Statement', 0, 'pdf')).toBe('bank-statement.pdf');
    expect(scanFileName('Bank Statement', 1, 'image')).toBe('bank-statement-p2.jpg');
    expect(scanFileName('', 0, 'pdf')).toBe('document.pdf');
    expect(scanFileName('!!!', 0, 'pdf')).toBe('document.pdf');
  });

  it('maps a pdf scan to one queue item', () => {
    let n = 0;
    const items = toQueueItems(
      { refs: ['file:///scan.pdf'], format: 'pdf', cancelled: false },
      'app-1',
      'bank_statement',
      () => 'id' + ++n,
    );
    expect(items.length).toBe(1);
    expect(items[0]?.applicationId).toBe('app-1');
    expect(items[0]?.fileName).toBe('bank-statement.pdf');
  });

  it('maps a multi-page image scan to one item per page with unique ids', () => {
    let n = 0;
    const items = toQueueItems(
      { refs: ['a.jpg', 'b.jpg', 'c.jpg'], format: 'image', cancelled: false },
      'app-2',
      'financial_statement',
      () => 'id' + ++n,
    );
    expect(items.length).toBe(3);
    expect(new Set(items.map((i) => i.id)).size).toBe(3);
    expect(items[2]?.fileName).toBe('financial-statement-p3.jpg');
  });

  it('produces nothing when the scan was cancelled', () => {
    expect(toQueueItems({ refs: [], format: 'image', cancelled: true }, 'a', 'b', () => 'x')).toEqual([]);
  });
});
