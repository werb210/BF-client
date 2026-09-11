// v129-upload-queue
// Durable upload queue. Storage and transport are injected so the queue is
// testable off-device and reusable in the portal. Survives app suspension by
// persisting after every state transition, not just on enqueue.

export type UploadStatus = 'pending' | 'uploading' | 'done' | 'failed';

export type UploadItem = {
  id: string;
  applicationId: string;
  documentType: string;
  fileName: string;
  /** Opaque handle to the file - a native path or object-url key. */
  fileRef: string;
  bytes: number;
  status: UploadStatus;
  attempts: number;
  lastError: string;
  createdAt: number;
  updatedAt: number;
};

export type QueueStorage = {
  read: () => Promise<UploadItem[]>;
  write: (items: UploadItem[]) => Promise<void>;
};

export type Transport = { upload: (item: UploadItem) => Promise<void> };

export type QueueOptions = {
  maxAttempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  now?: () => number;
  isOnline?: () => boolean;
  onChange?: (items: UploadItem[]) => void;
};

export const MAX_ATTEMPTS_DEFAULT = 5;

export function backoffMs(attempts: number, base = 2000, max = 300000): number {
  if (attempts <= 0) return 0;
  return Math.min(base * Math.pow(2, attempts - 1), max);
}

export function isRetryable(err: unknown): boolean {
  const status = (err as { status?: unknown } | null)?.status;
  if (typeof status === 'number') {
    if (status === 408 || status === 429) return true;
    if (status >= 400 && status < 500) return false;
  }
  return true;
}

function clone(items: UploadItem[]): UploadItem[] {
  return items.map((item) => ({ ...item }));
}

export class UploadQueue {
  private items: UploadItem[] = [];
  private loaded = false;
  private draining = false;
  private readonly maxAttempts: number;
  private readonly baseDelayMs: number;
  private readonly maxDelayMs: number;
  private readonly now: () => number;
  private readonly isOnline: () => boolean;
  private readonly onChange: ((items: UploadItem[]) => void) | undefined;

  constructor(
    private readonly storage: QueueStorage,
    private readonly transport: Transport,
    options: QueueOptions = {},
  ) {
    this.maxAttempts = options.maxAttempts ?? MAX_ATTEMPTS_DEFAULT;
    this.baseDelayMs = options.baseDelayMs ?? 2000;
    this.maxDelayMs = options.maxDelayMs ?? 300000;
    this.now = options.now ?? (() => Date.now());
    this.isOnline = options.isOnline ?? (() => true);
    this.onChange = options.onChange;
  }

  async load(): Promise<UploadItem[]> {
    if (this.loaded) return clone(this.items);
    const stored = await this.storage.read().catch(() => [] as UploadItem[]);
    this.items = (stored || []).map((item) =>
      item.status === 'uploading' ? { ...item, status: 'pending' as UploadStatus } : { ...item },
    );
    this.loaded = true;
    await this.persist();
    return clone(this.items);
  }

  private async persist(): Promise<void> {
    await this.storage.write(clone(this.items)).catch((): void => undefined);
    this.onChange?.(clone(this.items));
  }

  list(): UploadItem[] {
    return clone(this.items);
  }

  pendingCount(): number {
    return this.items.filter((item) => item.status === 'pending' || item.status === 'uploading').length;
  }

  async enqueue(
    input: Omit<UploadItem, 'status' | 'attempts' | 'lastError' | 'createdAt' | 'updatedAt'>,
  ): Promise<UploadItem> {
    await this.load();
    const existing = this.items.find((item) => item.id === input.id);
    if (existing) return { ...existing };
    const timestamp = this.now();
    const item: UploadItem = {
      ...input,
      status: 'pending',
      attempts: 0,
      lastError: '',
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    this.items.push(item);
    await this.persist();
    return { ...item };
  }

  async remove(id: string): Promise<void> {
    await this.load();
    this.items = this.items.filter((item) => item.id !== id);
    await this.persist();
  }

  async retry(id: string): Promise<void> {
    await this.load();
    this.items = this.items.map((item) =>
      item.id === id
        ? { ...item, status: 'pending' as UploadStatus, attempts: 0, lastError: '', updatedAt: this.now() }
        : item,
    );
    await this.persist();
  }

  /** Items eligible right now, honouring exponential backoff. */
  due(): UploadItem[] {
    const timestamp = this.now();
    return this.items.filter((item) => {
      if (item.status !== 'pending') return false;
      if (item.attempts === 0) return true;
      return timestamp - item.updatedAt >= backoffMs(item.attempts, this.baseDelayMs, this.maxDelayMs);
    });
  }

  /** Processes every due item once and collapses concurrent drain calls. */
  async drain(): Promise<{ uploaded: number; failed: number; skipped: number }> {
    await this.load();
    if (this.draining) return { uploaded: 0, failed: 0, skipped: 0 };
    if (!this.isOnline()) return { uploaded: 0, failed: 0, skipped: this.pendingCount() };

    this.draining = true;
    let uploaded = 0;
    let failed = 0;
    try {
      for (const target of this.due()) {
        const index = this.items.findIndex((item) => item.id === target.id);
        if (index < 0) continue;
        const current = this.items[index];
        if (!current) continue;

        this.items[index] = { ...current, status: 'uploading', updatedAt: this.now() };
        await this.persist();
        try {
          await this.transport.upload({ ...this.items[index] } as UploadItem);
          const done = this.items[index];
          if (done) this.items[index] = { ...done, status: 'done', lastError: '', updatedAt: this.now() };
          uploaded += 1;
        } catch (err) {
          const previous = this.items[index];
          if (!previous) continue;
          const attempts = previous.attempts + 1;
          const permanent = !isRetryable(err) || attempts >= this.maxAttempts;
          this.items[index] = {
            ...previous,
            status: permanent ? 'failed' : 'pending',
            attempts,
            lastError: String((err as { message?: unknown } | null)?.message ?? err ?? 'upload failed').slice(0, 200),
            updatedAt: this.now(),
          };
          failed += 1;
        }
        await this.persist();
        if (!this.isOnline()) break;
      }
    } finally {
      this.draining = false;
    }
    return { uploaded, failed, skipped: this.pendingCount() };
  }

  /** Drops completed uploads so the queue does not grow without bound. */
  async purgeCompleted(): Promise<number> {
    await this.load();
    const before = this.items.length;
    this.items = this.items.filter((item) => item.status !== 'done');
    await this.persist();
    return before - this.items.length;
  }
}
