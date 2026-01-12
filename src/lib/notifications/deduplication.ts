/**
 * Deduplication Guard
 * 
 * Prevents duplicate notifications from being displayed
 */

export class NotificationDeduplicator {
  private seenIds: Set<string> = new Set();
  private seenTimestamps: Map<string, number> = new Map();
  private readonly MAX_TRACKED = 100;
  private readonly DEDUP_WINDOW_MS = 5000; // 5 seconds

  /**
   * Check if notification should be dropped (duplicate)
   */
  shouldDrop(id: string, timestamp: Date): boolean {
    const now = Date.now();
    const timeKey = `${id}-${Math.floor(timestamp.getTime() / this.DEDUP_WINDOW_MS)}`;

    // Check if we've seen this exact ID recently
    if (this.seenIds.has(id)) {
      // Check timestamp window
      const lastSeen = this.seenTimestamps.get(timeKey);
      if (lastSeen && now - lastSeen < this.DEDUP_WINDOW_MS) {
        return true; // Duplicate within window
      }
    }

    // Track this notification
    this.seenIds.add(id);
    this.seenTimestamps.set(timeKey, now);

    // Cleanup old entries (keep only last MAX_TRACKED)
    if (this.seenIds.size > this.MAX_TRACKED) {
      const idsArray = Array.from(this.seenIds);
      const toRemove = idsArray.slice(0, this.seenIds.size - this.MAX_TRACKED);
      toRemove.forEach((id) => this.seenIds.delete(id));
    }

    // Cleanup old timestamps
    const cutoff = now - this.DEDUP_WINDOW_MS * 2;
    for (const [key, time] of this.seenTimestamps.entries()) {
      if (time < cutoff) {
        this.seenTimestamps.delete(key);
      }
    }

    return false;
  }

  /**
   * Clear deduplication cache (useful for testing or manual refresh)
   */
  clear() {
    this.seenIds.clear();
    this.seenTimestamps.clear();
  }

  /**
   * Get current cache size (for debugging)
   */
  getCacheSize(): { ids: number; timestamps: number } {
    return {
      ids: this.seenIds.size,
      timestamps: this.seenTimestamps.size,
    };
  }
}



