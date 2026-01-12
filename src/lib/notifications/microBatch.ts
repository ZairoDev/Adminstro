/**
 * Micro-batching System
 * 
 * Prevents UI spam by batching rapid notifications
 */

import { UnifiedNotification } from "./types";

export class NotificationMicroBatcher {
  private batch: UnifiedNotification[] = [];
  private batchTimer: NodeJS.Timeout | null = null;
  private readonly BATCH_WINDOW_MS = 300; // 300ms window
  private readonly RELEASE_INTERVAL_MS = 150; // Release every 150ms

  constructor(
    private onRelease: (notifications: UnifiedNotification[]) => void
  ) {}

  /**
   * Add notification to batch
   */
  add(notification: UnifiedNotification) {
    this.batch.push(notification);

    // If this is the first notification in batch, start timer
    if (this.batch.length === 1) {
      this.startBatchTimer();
    }

    // If batch exceeds threshold, release immediately
    if (this.batch.length >= 3) {
      this.releaseBatch();
    }
  }

  /**
   * Start batch timer
   */
  private startBatchTimer() {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
    }

    this.batchTimer = setTimeout(() => {
      this.releaseBatch();
    }, this.BATCH_WINDOW_MS);
  }

  /**
   * Release batch to queue
   */
  private releaseBatch() {
    if (this.batch.length === 0) return;

    const toRelease = [...this.batch];
    this.batch = [];

    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }

    // Release notifications with interval spacing
    toRelease.forEach((notification, index) => {
      setTimeout(() => {
        this.onRelease([notification]);
      }, index * this.RELEASE_INTERVAL_MS);
    });
  }

  /**
   * Force release all pending notifications
   */
  flush() {
    this.releaseBatch();
  }

  /**
   * Get current batch size
   */
  getBatchSize(): number {
    return this.batch.length;
  }
}



