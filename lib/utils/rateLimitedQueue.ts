/**
 * Rate-Limited Queue Utilities
 * 
 * Provides utilities for processing API requests sequentially
 * with retry logic and exponential backoff to avoid rate limits.
 */

export interface RetryOptions {
    /** Maximum number of retry attempts (default: 3) */
    maxRetries?: number;
    /** Initial delay in ms before first retry (default: 1000) */
    initialDelayMs?: number;
    /** Multiplier for exponential backoff (default: 2) */
    backoffMultiplier?: number;
    /** Maximum delay in ms (default: 30000) */
    maxDelayMs?: number;
    /** HTTP status codes that should trigger retry (default: [429, 503, 502]) */
    retryableStatusCodes?: number[];
}

const DEFAULT_RETRY_OPTIONS: Required<RetryOptions> = {
    maxRetries: 3,
    initialDelayMs: 1000,
    backoffMultiplier: 2,
    maxDelayMs: 30000,
    retryableStatusCodes: [429, 503, 502],
};

/**
 * Simple delay utility
 */
export function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Check if an error is retryable based on status code
 */
function isRetryableError(error: unknown, retryableStatusCodes: number[]): boolean {
    if (error instanceof Error) {
        const message = error.message.toLowerCase();
        // Check for common rate limit indicators
        if (message.includes('429') || message.includes('rate limit') || message.includes('too many requests')) {
            return true;
        }
        // Check for status codes in error message
        for (const code of retryableStatusCodes) {
            if (message.includes(`${code}`) || message.includes(`status: ${code}`)) {
                return true;
            }
        }
    }
    return false;
}

/**
 * Execute a function with exponential backoff retry on failure.
 * 
 * @param fn - Async function to execute
 * @param options - Retry configuration options
 * @returns Result of the function
 * @throws Last error after all retries exhausted
 * 
 * @example
 * const result = await retryWithBackoff(
 *   () => AIService.improveBulletPoint(text),
 *   { maxRetries: 3, initialDelayMs: 1000 }
 * );
 */
export async function retryWithBackoff<T>(
    fn: () => Promise<T>,
    options: RetryOptions = {}
): Promise<T> {
    const opts = { ...DEFAULT_RETRY_OPTIONS, ...options };
    let lastError: Error | null = null;
    let currentDelay = opts.initialDelayMs;

    for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));

            // Check if we should retry
            if (attempt < opts.maxRetries && isRetryableError(error, opts.retryableStatusCodes)) {
                console.warn(
                    `Retry attempt ${attempt + 1}/${opts.maxRetries} after ${currentDelay}ms`,
                    { error: lastError.message }
                );
                await delay(currentDelay);
                currentDelay = Math.min(currentDelay * opts.backoffMultiplier, opts.maxDelayMs);
            } else if (attempt < opts.maxRetries && !isRetryableError(error, opts.retryableStatusCodes)) {
                // Non-retryable error, throw immediately
                throw lastError;
            }
        }
    }

    throw lastError;
}

export interface SequentialProcessOptions<T, R> {
    /** Items to process */
    items: T[];
    /** Async processor function for each item */
    processor: (item: T, index: number) => Promise<R>;
    /** Delay between each item in ms (default: 500) */
    delayBetweenMs?: number;
    /** Retry options for each item */
    retryOptions?: RetryOptions;
    /** Callback for progress updates */
    onProgress?: (index: number, total: number) => void;
    /** Whether to continue on error (default: true) */
    continueOnError?: boolean;
    /** Abort signal for cancellation */
    abortSignal?: AbortSignal;
}

export interface SequentialProcessResult<R> {
    results: Map<number, R>;
    errors: Map<number, Error>;
    completed: number;
    failed: number;
}

/**
 * Process items sequentially with rate limiting and retry logic.
 * 
 * @example
 * const { results, errors } = await processSequentially({
 *   items: bullets,
 *   processor: async (bullet, index) => {
 *     return await AIService.improveBulletPoint(bullet);
 *   },
 *   delayBetweenMs: 500,
 *   onProgress: (current, total) => setProgress(current / total),
 * });
 */
export async function processSequentially<T, R>(
    options: SequentialProcessOptions<T, R>
): Promise<SequentialProcessResult<R>> {
    const {
        items,
        processor,
        delayBetweenMs = 500,
        retryOptions = {},
        onProgress,
        continueOnError = true,
        abortSignal,
    } = options;

    const results = new Map<number, R>();
    const errors = new Map<number, Error>();
    let completed = 0;
    let failed = 0;

    for (let i = 0; i < items.length; i++) {
        // Check for abort
        if (abortSignal?.aborted) {
            break;
        }

        // Update progress
        onProgress?.(i, items.length);

        try {
            const item = items[i]!;
            const result = await retryWithBackoff(
                () => processor(item, i),
                retryOptions
            );
            results.set(i, result);
            completed++;
        } catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            errors.set(i, err);
            failed++;

            if (!continueOnError) {
                throw err;
            }
        }

        // Add delay between requests (except for the last one)
        if (i < items.length - 1 && !abortSignal?.aborted) {
            await delay(delayBetweenMs);
        }
    }

    // Final progress update
    onProgress?.(items.length, items.length);

    return { results, errors, completed, failed };
}
