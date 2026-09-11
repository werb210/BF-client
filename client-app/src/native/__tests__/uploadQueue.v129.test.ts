import { describe, expect, it, vi } from 'vitest';
import { UploadQueue, backoffMs, isRetryable, type UploadItem } from '../uploadQueue';

function memoryStorage(initial: UploadItem[] = []) {
  let rows = initial.map((item) => ({ ...item }));
  return {
    read: async () => rows.map((item) => ({ ...item })),
    write: async (items: UploadItem[]) => { rows = items.map((item) => ({ ...item })); },
    dump: () => rows.map((item) => ({ ...item })),
  };
}

const base = { id: 'u1', applicationId: 'a1', documentType: 'bank_statement', fileName: 'march.pdf', fileRef: 'file:///tmp/march.pdf', bytes: 1024 };

describe('v129 upload queue', () => {
  it('backoff grows and caps', () => {
    expect(backoffMs(0)).toBe(0);
    expect(backoffMs(1, 1000, 60000)).toBe(1000);
    expect(backoffMs(3, 1000, 60000)).toBe(4000);
    expect(backoffMs(20, 1000, 60000)).toBe(60000);
  });

  it('classifies retryable errors', () => {
    expect(isRetryable({ status: 400 })).toBe(false);
    expect(isRetryable({ status: 403 })).toBe(false);
    expect(isRetryable({ status: 429 })).toBe(true);
    expect(isRetryable({ status: 500 })).toBe(true);
    expect(isRetryable(new Error('offline'))).toBe(true);
  });

  it('uploads and persists a queued item', async () => {
    const storage = memoryStorage();
    const upload = vi.fn().mockResolvedValue(undefined);
    const queue = new UploadQueue(storage, { upload });
    await queue.enqueue(base);
    expect(storage.dump()[0]?.status).toBe('pending');
    expect((await queue.drain()).uploaded).toBe(1);
    expect(storage.dump()[0]?.status).toBe('done');
    expect(upload).toHaveBeenCalledTimes(1);
  });

  it('resets interrupted uploads on load', async () => {
    const storage = memoryStorage([{ ...base, status: 'uploading', attempts: 1, lastError: '', createdAt: 1, updatedAt: 1 }]);
    const queue = new UploadQueue(storage, { upload: async () => undefined });
    expect((await queue.load())[0]?.status).toBe('pending');
  });

  it('retries transient failures after backoff', async () => {
    let now = 0;
    const upload = vi.fn().mockRejectedValueOnce({ status: 503, message: 'down' }).mockResolvedValue(undefined);
    const queue = new UploadQueue(memoryStorage(), { upload }, { now: () => now, baseDelayMs: 1000 });
    await queue.enqueue(base);
    await queue.drain();
    expect(queue.list()[0]).toMatchObject({ status: 'pending', attempts: 1 });
    now = 500;
    await queue.drain();
    expect(upload).toHaveBeenCalledTimes(1);
    now = 2000;
    await queue.drain();
    expect(queue.list()[0]?.status).toBe('done');
  });

  it('fails permanent errors and supports manual retry', async () => {
    const upload = vi.fn().mockRejectedValueOnce({ status: 422, message: 'bad type' }).mockResolvedValue(undefined);
    const queue = new UploadQueue(memoryStorage(), { upload });
    await queue.enqueue(base);
    await queue.drain();
    expect(queue.list()[0]).toMatchObject({ status: 'failed', attempts: 1, lastError: 'bad type' });
    await queue.retry('u1');
    await queue.drain();
    expect(queue.list()[0]?.status).toBe('done');
  });

  it('stops after maxAttempts', async () => {
    let now = 0;
    const upload = vi.fn().mockRejectedValue({ status: 500, message: 'boom' });
    const queue = new UploadQueue(memoryStorage(), { upload }, { now: () => now, maxAttempts: 3, baseDelayMs: 1 });
    await queue.enqueue(base);
    for (let index = 0; index < 6; index += 1) { now += 100000; await queue.drain(); }
    expect(queue.list()[0]?.status).toBe('failed');
    expect(upload).toHaveBeenCalledTimes(3);
  });

  it('skips while offline and deduplicates ids', async () => {
    const upload = vi.fn();
    const queue = new UploadQueue(memoryStorage(), { upload }, { isOnline: () => false });
    await queue.enqueue(base);
    await queue.enqueue(base);
    expect(queue.list()).toHaveLength(1);
    expect((await queue.drain()).skipped).toBe(1);
    expect(upload).not.toHaveBeenCalled();
  });

  it('purges completed items and notifies on change', async () => {
    const onChange = vi.fn();
    const queue = new UploadQueue(memoryStorage(), { upload: async () => undefined }, { onChange });
    await queue.enqueue(base);
    await queue.enqueue({ ...base, id: 'u2' });
    await queue.drain();
    expect(await queue.purgeCompleted()).toBe(2);
    expect(queue.list()).toHaveLength(0);
    expect(onChange).toHaveBeenCalled();
  });
});
