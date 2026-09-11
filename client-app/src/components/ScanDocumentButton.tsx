// v132-document-scanner
import { useState } from 'react';
import { scanDocument, toQueueItems, isScannerAvailable } from '../native/documentScanner';
import { getQueue } from '../native/uploadQueueRuntime';
import { DISCOVERED_UPLOAD_ROUTE } from '../native/uploadQueueRuntime';
import { readToken, resolveBaseUrl, readFileRef } from '../native/borealRuntime';

type Props = {
  applicationId: string;
  documentType: string;
  label?: string;
  onQueued?: (count: number) => void;
  className?: string;
};

function newId(): string {
  return 'scan-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
}

export default function ScanDocumentButton({
  applicationId,
  documentType,
  label,
  onQueued,
  className,
}: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  if (!isScannerAvailable()) return null;

  const run = async () => {
    setBusy(true);
    setError('');
    try {
      const result = await scanDocument({ maxPages: 15, preferPdf: true });
      const items = toQueueItems(result, applicationId, documentType, newId);
      if (items.length === 0) return;

      const queue = getQueue({
        transport: {
          baseUrl: resolveBaseUrl(),
          route: DISCOVERED_UPLOAD_ROUTE,
          getToken: readToken,
          readFile: readFileRef,
        },
      });
      for (const item of items) {
        await queue.enqueue(item);
      }
      void queue.drain();
      if (onQueued) onQueued(items.length);
    } catch (err) {
      setError('Scan failed. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={className}>
      <button type="button" onClick={run} disabled={busy} data-testid="scan-document">
        {busy ? 'Scanning...' : label || 'Scan Document'}
      </button>
      {error ? <p role="alert">{error}</p> : null}
    </div>
  );
}
