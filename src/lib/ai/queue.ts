/**
 * /src/lib/ai/queue.ts
 *
 * Batch processing queue for AI generation tasks.
 *
 * Behaviour:
 *   - Items are processed in batches of BATCH_SIZE (default 5).
 *   - A delay of INTER_BATCH_DELAY_MS (default 1 000 ms) is inserted between
 *     batches to respect Watsonx API rate limits.
 *   - Within a batch, all items are processed concurrently via Promise.allSettled.
 *   - Failed items are captured and their error is passed to the optional
 *     `onItemError` callback; the slot receives the `fallback` value instead.
 *   - A singleton `globalQueue` is exported for use throughout the app.
 */

// ─── Configuration ────────────────────────────────────────────────────────────

export interface QueueConfig {
  /** Items processed per batch. Default 5. */
  batchSize?: number;
  /** Milliseconds to wait between consecutive batches. Default 1 000. */
  interBatchDelayMs?: number;
}

const DEFAULTS: Required<QueueConfig> = {
  batchSize: 5,
  interBatchDelayMs: 1_000,
};

// ─── Types ────────────────────────────────────────────────────────────────────

type WorkFn<TInput, TOutput> = (item: TInput, index: number) => Promise<TOutput>;

export interface BatchResult<TOutput> {
  results: TOutput[];
  /** Number of items that used the fallback due to processing errors. */
  errorCount: number;
  /** Total wall-clock time in ms. */
  durationMs: number;
}

// ─── BatchQueue class ─────────────────────────────────────────────────────────

export class BatchQueue {
  private readonly batchSize: number;
  private readonly interBatchDelayMs: number;

  constructor(config: QueueConfig = {}) {
    this.batchSize = config.batchSize ?? DEFAULTS.batchSize;
    this.interBatchDelayMs = config.interBatchDelayMs ?? DEFAULTS.interBatchDelayMs;
  }

  /**
   * Process `items` by calling `workFn` on each, in batches.
   *
   * @param items       - Input array.
   * @param workFn      - Async function to apply to each item.
   * @param fallbackFn  - Synchronous fallback for items where `workFn` throws.
   * @param onItemError - Optional callback for per-item errors (for logging).
   */
  async process<TInput, TOutput>(
    items: TInput[],
    workFn: WorkFn<TInput, TOutput>,
    fallbackFn: (item: TInput, index: number) => TOutput,
    onItemError?: (err: unknown, item: TInput, index: number) => void
  ): Promise<BatchResult<TOutput>> {
    const start = Date.now();
    const results: TOutput[] = new Array(items.length);
    let errorCount = 0;

    for (let batchStart = 0; batchStart < items.length; batchStart += this.batchSize) {
      const batchItems = items.slice(batchStart, batchStart + this.batchSize);
      const batchOffset = batchStart;

      const settled = await Promise.allSettled(
        batchItems.map((item, localIdx) =>
          workFn(item, batchOffset + localIdx)
        )
      );

      for (let i = 0; i < settled.length; i++) {
        const globalIdx = batchOffset + i;
        const r = settled[i];
        if (r.status === "fulfilled") {
          results[globalIdx] = r.value;
        } else {
          errorCount++;
          onItemError?.(r.reason, batchItems[i], globalIdx);
          results[globalIdx] = fallbackFn(batchItems[i], globalIdx);
        }
      }

      // Delay between batches (not after the last batch)
      const hasMore = batchStart + this.batchSize < items.length;
      if (hasMore && this.interBatchDelayMs > 0) {
        await new Promise((r) => setTimeout(r, this.interBatchDelayMs));
      }
    }

    return {
      results,
      errorCount,
      durationMs: Date.now() - start,
    };
  }
}

// ─── Singleton instance ───────────────────────────────────────────────────────

/**
 * Global queue used by the /api/synthesize endpoint and other AI routes.
 * Configured with default batch size (5) and 1 s inter-batch delay.
 */
export const globalQueue = new BatchQueue({
  batchSize: 5,
  interBatchDelayMs: 1_000,
});
