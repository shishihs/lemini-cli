
const TOKEN_LIMIT_PER_SECOND = 630;
const TIME_WINDOW_SECONDS = 10; // Consider requests from the last 10 seconds

interface RequestRecord {
  timestamp: number;
  tokenCount: number;
}

export class TokenRateLimiter {
  private requestQueue: RequestRecord[] = [];

  public async waitForTurn(tokenCount: number): Promise<void> {
    const now = Date.now();

    // Remove old records from the queue
    this.requestQueue = this.requestQueue.filter(
      (record) => now - record.timestamp < TIME_WINDOW_SECONDS * 1000,
    );

    // Calculate total tokens in the current window
    const totalTokensInWindow = this.requestQueue.reduce(
      (sum, record) => sum + record.tokenCount,
      0,
    );

    // Calculate current rate
    const currentRate = totalTokensInWindow / TIME_WINDOW_SECONDS;

    if (
      currentRate + tokenCount / TIME_WINDOW_SECONDS >
      TOKEN_LIMIT_PER_SECOND
    ) {
      // If rate is exceeded, calculate wait time
      const excessTokens =
        totalTokensInWindow +
        tokenCount -
        TOKEN_LIMIT_PER_SECOND * TIME_WINDOW_SECONDS;
      const waitTime = (excessTokens / TOKEN_LIMIT_PER_SECOND) * 1000;

      if (waitTime > 0) {
        await new Promise((resolve) => setTimeout(resolve, waitTime));
      }
    }

    // Add new request to the queue
    this.requestQueue.push({ timestamp: Date.now(), tokenCount });
  }
}
