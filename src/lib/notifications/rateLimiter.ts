/**
 * Rate Limiter & Performance Guards
 * 
 * Prevents notification spam and ensures system stability
 */

export class NotificationRateLimiter {
  private sourceCounts: Map<string, { count: number; resetAt: number }> = new Map();
  private readonly MAX_PER_MINUTE = 20; // Max 20 notifications per minute per source
  private readonly WINDOW_MS = 60 * 1000; // 1 minute window

  /**
   * Check if notification should be throttled
   */
  shouldThrottle(source: "system" | "whatsapp", id: string): boolean {
    const now = Date.now();
    const key = `${source}-${id}`;
    
    const record = this.sourceCounts.get(key);
    
    if (!record || now > record.resetAt) {
      // Reset or create new record
      this.sourceCounts.set(key, {
        count: 1,
        resetAt: now + this.WINDOW_MS,
      });
      return false;
    }

    if (record.count >= this.MAX_PER_MINUTE) {
      console.warn(`⚠️ Rate limit exceeded for ${source} notification ${id}`);
      return true; // Throttle
    }

    record.count++;
    return false;
  }

  /**
   * Cleanup old records
   */
  cleanup() {
    const now = Date.now();
    for (const [key, record] of this.sourceCounts.entries()) {
      if (now > record.resetAt) {
        this.sourceCounts.delete(key);
      }
    }
  }

  /**
   * Get current rate limit stats
   */
  getStats() {
    const stats: Record<string, { count: number; resetAt: number }> = {};
    for (const [key, record] of this.sourceCounts.entries()) {
      stats[key] = { ...record };
    }
    return stats;
  }
}

/**
 * Notification Logger (for debugging and auditing)
 */
export class NotificationLogger {
  private logs: Array<{
    id: string;
    source: "system" | "whatsapp";
    event: "sent" | "received" | "rendered" | "dismissed" | "cleared";
    timestamp: Date;
  }> = [];

  private readonly MAX_LOGS = 200;

  log(id: string, source: "system" | "whatsapp", event: "sent" | "received" | "rendered" | "dismissed" | "cleared") {
    this.logs.push({
      id,
      source,
      event,
      timestamp: new Date(),
    });

    // Keep only last MAX_LOGS
    if (this.logs.length > this.MAX_LOGS) {
      this.logs = this.logs.slice(-this.MAX_LOGS);
    }

    // Console log for debugging (can be disabled in production)
    if (process.env.NODE_ENV === "development") {
      console.log(`📊 Notification ${event}:`, { id, source, event });
    }
  }

  /**
   * Get logs for a specific notification
   */
  getLogsForNotification(id: string) {
    return this.logs.filter((log) => log.id === id);
  }

  /**
   * Get recent logs
   */
  getRecentLogs(limit: number = 50) {
    return this.logs.slice(-limit);
  }

  /**
   * Clear logs
   */
  clear() {
    this.logs = [];
  }
}



