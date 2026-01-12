/**
 * Advanced Queue Engine
 * 
 * Manages notification queue with smart grouping, min duration, and priority handling
 */

import { UnifiedNotification } from "./types";

export interface QueueConfig {
  maxVisible: number;
  minVisibleDurationMs: number;
  groupWindowMs: number; // For WhatsApp grouping
}

export class NotificationQueueEngine {
  private queue: UnifiedNotification[] = [];
  private visible: UnifiedNotification[] = [];
  private visibleSince: Map<string, number> = new Map();
  private groupedWhatsApp: Map<string, UnifiedNotification[]> = new Map();
  private activeGroups: Map<string, UnifiedNotification> = new Map(); // Track active grouped notifications

  constructor(private config: QueueConfig) {}

  /**
   * Add notification to queue
   */
  add(notification: UnifiedNotification) {
    // Group WhatsApp notifications by conversation
    if (notification.source === "whatsapp" && notification.groupKey) {
      this.groupWhatsAppNotification(notification);
      return; // Don't add to main queue yet, wait for grouping
    }

    // Critical notifications jump to front
    if (notification.isCritical) {
      this.queue.unshift(notification);
    } else {
      this.queue.push(notification);
    }
  }

  /**
   * Update existing notification (for grouped WhatsApp messages)
   */
  updateNotification(notificationId: string, updater: (n: UnifiedNotification) => UnifiedNotification): boolean {
    // Check visible notifications
    const visibleIndex = this.visible.findIndex(n => n.id === notificationId);
    if (visibleIndex !== -1) {
      this.visible[visibleIndex] = updater(this.visible[visibleIndex]);
      return true;
    }

    // Check queue
    const queueIndex = this.queue.findIndex(n => n.id === notificationId);
    if (queueIndex !== -1) {
      this.queue[queueIndex] = updater(this.queue[queueIndex]);
      return true;
    }

    // Check active groups
    if (this.activeGroups.has(notificationId)) {
      const existing = this.activeGroups.get(notificationId)!;
      const updated = updater(existing);
      this.activeGroups.set(notificationId, updated);
      
      // If it's visible, update visible array too
      const groupKey = updated.groupKey || notificationId;
      const visibleGroupIndex = this.visible.findIndex(n => n.groupKey === groupKey || n.id === groupKey);
      if (visibleGroupIndex !== -1) {
        this.visible[visibleGroupIndex] = updated;
      }
      return true;
    }

    return false;
  }

  /**
   * Group WhatsApp notifications by conversation
   */
  private groupWhatsAppNotification(notification: UnifiedNotification) {
    const groupKey = notification.groupKey!;
    const now = Date.now();

    // Check if there's an active grouped notification for this conversation
    const existingGrouped = this.activeGroups.get(groupKey);
    
    if (existingGrouped) {
      // Update existing grouped notification
      const group = this.groupedWhatsApp.get(groupKey) || [];
      group.push(notification);
      this.groupedWhatsApp.set(groupKey, group);
      
      // Update the grouped notification
      const updated = this.createGroupedNotification(group);
      if (updated) {
        this.activeGroups.set(groupKey, updated);
        
        // If it's visible, update it in place
        const visibleIndex = this.visible.findIndex(n => n.groupKey === groupKey || n.id === groupKey);
        if (visibleIndex !== -1) {
          this.visible[visibleIndex] = updated;
        } else {
          // If not visible, update in queue
          const queueIndex = this.queue.findIndex(n => n.groupKey === groupKey || n.id === groupKey);
          if (queueIndex !== -1) {
            this.queue[queueIndex] = updated;
          }
        }
      }
      return;
    }

    // No existing group, create new
    if (!this.groupedWhatsApp.has(groupKey)) {
      this.groupedWhatsApp.set(groupKey, []);
    }

    const group = this.groupedWhatsApp.get(groupKey)!;
    group.push(notification);

    // Check if we should create grouped notification immediately or wait
    if (group.length === 1) {
      // First message - wait for more or timeout
      return;
    }

    // Multiple messages - create grouped notification
    const grouped = this.createGroupedNotification(group);
    if (grouped) {
      this.activeGroups.set(groupKey, grouped);
      
      // Add to queue (critical jump to front)
      if (grouped.isCritical) {
        this.queue.unshift(grouped);
      } else {
        this.queue.push(grouped);
      }
    }
  }

  /**
   * Create grouped notification from message array
   * Public method so it can be called from components
   */
  createGroupedNotification(
    group: UnifiedNotification[]
  ): UnifiedNotification | null {
    if (group.length === 0) return null;
    if (group.length === 1) return group[0];

    const first = group[0];
    const latest = group[group.length - 1]; // Use latest message for preview
    const groupKey = first.groupKey || first.id;
    
    return {
      ...first,
      id: groupKey, // Use groupKey as ID for grouping
      title: first.title, // Keep original sender name
      message: latest.message, // Show latest message preview
      timestamp: latest.timestamp, // Use latest timestamp
      metadata: {
        ...first.metadata,
        groupedMessages: group,
        messageCount: group.length,
      },
      groupKey, // Ensure groupKey is set
    };
  }

  /**
   * Get grouped WhatsApp notification (if multiple messages in window)
   */
  private getGroupedWhatsApp(groupKey: string): UnifiedNotification | null {
    const group = this.groupedWhatsApp.get(groupKey);
    if (!group || group.length <= 1) return null;

    // Create aggregated notification
    const first = group[0];
    const grouped: UnifiedNotification = {
      ...first,
      message: `${first.message} (${group.length} new messages)`,
      metadata: {
        ...first.metadata,
        groupedMessages: group,
      },
    };
    return grouped;
  }

  /**
   * Update visible notifications based on queue and min duration
   */
  updateVisible(dismissedIds: Map<string, number> | Set<string>, mutedIds: Set<string>): UnifiedNotification[] {
    const now = Date.now();
    
    // Convert Set to Map if needed (for backward compatibility)
    const dismissedMap = dismissedIds instanceof Map 
      ? dismissedIds 
      : new Map(Array.from(dismissedIds).map(id => [id, now]));

    // Remove dismissed from visible (but keep in queue for potential revival)
    // Note: Dismissed notifications can be revived by new messages
    this.visible = this.visible.filter((n) => {
      if (dismissedMap.has(n.id) || (n.groupKey && dismissedMap.has(n.groupKey))) {
        this.visibleSince.delete(n.id);
        return false;
      }
      return true;
    });

    // Check for ready WhatsApp groups (outside time window)
    for (const [groupKey, group] of this.groupedWhatsApp.entries()) {
      if (group.length === 0) continue;

      const lastNotification = group[group.length - 1];
      const timeSinceLast = now - lastNotification.timestamp.getTime();

      // If group window expired and we have messages, create grouped notification
      if (timeSinceLast > this.config.groupWindowMs && group.length > 0) {
        const grouped = this.createGroupedNotification(group);
        if (grouped) {
          this.activeGroups.set(groupKey, grouped);
          
          // Only add to queue if not muted and not already in queue/visible
          if (!mutedIds.has(groupKey) && !dismissedIds.has(groupKey)) {
            const existsInQueue = this.queue.some(n => n.groupKey === groupKey || n.id === groupKey);
            const existsInVisible = this.visible.some(n => n.groupKey === groupKey || n.id === groupKey);
            
            if (!existsInQueue && !existsInVisible) {
              if (grouped.isCritical) {
                this.queue.unshift(grouped);
              } else {
                this.queue.push(grouped);
              }
            }
          }
        }
        this.groupedWhatsApp.delete(groupKey);
      }
    }

    // Fill visible slots from queue
    while (this.visible.length < this.config.maxVisible && this.queue.length > 0) {
      const next = this.queue.shift();
      if (!next) break;

      // Skip if muted (muted notifications never show)
      if (mutedIds.has(next.id) || (next.groupKey && mutedIds.has(next.groupKey))) {
        continue;
      }

      // Check if dismissed - if so, check if it's been updated (new messages revive it)
      // If groupKey exists and is in dismissed, also check
      const isDismissed = dismissedMap.has(next.id) || (next.groupKey && dismissedMap.has(next.groupKey));
      
      if (isDismissed) {
        // Check if this notification was recently updated (has new messages)
        // If it's in activeGroups, it means it has new content and should be revived
        const groupKey = next.groupKey || next.id;
        const inActiveGroups = this.activeGroups.has(groupKey);
        
        if (inActiveGroups) {
          // Has new messages, revive it by removing from dismissed check
          // (The component will handle removing from dismissed map)
          // For now, allow it to show
        } else {
          // No new messages, keep it dismissed
          this.queue.push(next);
          continue;
        }
      }

      this.visible.push(next);
      this.visibleSince.set(next.id, now);
    }

    return [...this.visible];
  }

  /**
   * Get current visible notifications (without updating)
   */
  getVisible(): UnifiedNotification[] {
    return [...this.visible];
  }

  /**
   * Revive a dismissed notification (for new messages in same conversation)
   */
  reviveNotification(notificationId: string, dismissedIds: Set<string>): boolean {
    if (!dismissedIds.has(notificationId)) return false;
    
    // Remove from dismissed set (caller should handle this)
    // Check if notification exists in queue or active groups
    const inQueue = this.queue.some(n => n.id === notificationId || n.groupKey === notificationId);
    const inActiveGroups = this.activeGroups.has(notificationId);
    
    return inQueue || inActiveGroups;
  }

  /**
   * Get notification by ID or groupKey
   */
  getNotification(idOrGroupKey: string): UnifiedNotification | null {
    // Check visible
    const inVisible = this.visible.find(n => n.id === idOrGroupKey || n.groupKey === idOrGroupKey);
    if (inVisible) return inVisible;

    // Check queue
    const inQueue = this.queue.find(n => n.id === idOrGroupKey || n.groupKey === idOrGroupKey);
    if (inQueue) return inQueue;

    // Check active groups
    const inGroups = this.activeGroups.get(idOrGroupKey);
    if (inGroups) return inGroups;

    return null;
  }

  /**
   * Get queue statistics
   */
  getStats() {
    return {
      queueLength: this.queue.length,
      visibleCount: this.visible.length,
      groupedCount: this.groupedWhatsApp.size,
      activeGroupsCount: this.activeGroups.size,
    };
  }

  /**
   * Clear queue
   */
  clear() {
    this.queue = [];
    this.visible = [];
    this.visibleSince.clear();
    this.groupedWhatsApp.clear();
    this.activeGroups.clear();
  }
}

