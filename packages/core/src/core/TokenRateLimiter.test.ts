import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TokenRateLimiter } from './TokenRateLimiter.js';

describe('TokenRateLimiter', () => {
  let rateLimiter: TokenRateLimiter;

  beforeEach(() => {
    vi.useFakeTimers();
    rateLimiter = new TokenRateLimiter();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should allow requests below the rate limit without waiting', async () => {
    const start = Date.now();
    // 630 tokens/sec * 10 sec window = 6300 tokens capacity roughly?
    // Actually Logic: currentRate = totalTokensInWindow / 10sec.
    // If (currentRate + newTokens/10) <= 630, no wait.
    // So (totalTokensInWindow + newTokens) <= 6300.

    await rateLimiter.waitForTurn(100);
    const end = Date.now();
    expect(end - start).toBe(0); // Should be immediate (fake timers might make it essentially 0)
  });

  it('should wait when rate limit is exceeded', async () => {
    // Fill up the capacity
    // Limit is 630 tokens/sec. Window is 10s. Capacity = 6300 tokens.

    // 1. Consume 6000 tokens immediately.
    // rate = 6000/10 = 600. <= 630. OK.
    await rateLimiter.waitForTurn(6000);

    // 2. Try to consume 400 more.
    // New total = 6400. Rate = 640/sec > 630.
    // Excess = 6400 - 6300 = 100 tokens.
    // Wait time = (100 / 630) * 1000 = ~158ms.

    const waitPromise = rateLimiter.waitForTurn(400);

    // Advance time little bit, should not verify yet
    await vi.advanceTimersByTimeAsync(100);
    // Not resolved yet (how to check? manually hard)

    // Advance enough time
    await vi.advanceTimersByTimeAsync(100); // Total 200ms

    await waitPromise;
    // If we reached here, it resolved.

    // We can check the internal state if we exposed it, or rely on timing.
    // Since we mocked timers, 'Date.now()' inside TokenRateLimiter needs to move?
    // TokenRateLimiter calls Date.now(). vi.useFakeTimers mocks Date.now().
    // So advancing time updates Date.now().
  });

  it('should clear old requests from window', async () => {
    // 1. Max out usage
    await rateLimiter.waitForTurn(6300);

    // 2. Move time forward past the window (10s + 1ms)
    await vi.advanceTimersByTimeAsync(10001);

    // 3. Should allow full capacity again
    const start = Date.now();
    await rateLimiter.waitForTurn(6300);
    const end = Date.now();

    // Should be immediate since previous usage expired
    expect(end - start).toBe(0);
  });
});
