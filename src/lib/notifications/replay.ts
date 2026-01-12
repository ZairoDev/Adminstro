/**
 * Socket Replay System
 * 
 * Ensures zero missed notifications on reconnect
 */

import axios from "axios";

export interface ReplayState {
  lastNotificationTimestamp: Date | null;
  lastWhatsAppTimestamp: Date | null;
}

/**
 * Fetch missed system notifications since last timestamp
 */
export async function fetchMissedSystemNotifications(
  lastTimestamp: Date | null
): Promise<any[]> {
  try {
    const params = lastTimestamp
      ? { since: lastTimestamp.toISOString() }
      : {};
    
    const response = await axios.get("/api/notifications", { params });
    return response.data.notifications || [];
  } catch (error) {
    console.error("Error fetching missed notifications:", error);
    return [];
  }
}

/**
 * Store replay state in localStorage
 */
export function saveReplayState(state: ReplayState) {
  if (typeof window === "undefined") return;
  
  try {
    localStorage.setItem(
      "notification_replay_state",
      JSON.stringify({
        lastNotificationTimestamp: state.lastNotificationTimestamp?.toISOString() || null,
        lastWhatsAppTimestamp: state.lastWhatsAppTimestamp?.toISOString() || null,
      })
    );
  } catch (error) {
    console.error("Error saving replay state:", error);
  }
}

/**
 * Load replay state from localStorage
 */
export function loadReplayState(): ReplayState {
  if (typeof window === "undefined") {
    return {
      lastNotificationTimestamp: null,
      lastWhatsAppTimestamp: null,
    };
  }

  try {
    const stored = localStorage.getItem("notification_replay_state");
    if (!stored) {
      return {
        lastNotificationTimestamp: null,
        lastWhatsAppTimestamp: null,
      };
    }

    const parsed = JSON.parse(stored);
    return {
      lastNotificationTimestamp: parsed.lastNotificationTimestamp
        ? new Date(parsed.lastNotificationTimestamp)
        : null,
      lastWhatsAppTimestamp: parsed.lastWhatsAppTimestamp
        ? new Date(parsed.lastWhatsAppTimestamp)
        : null,
    };
  } catch (error) {
    console.error("Error loading replay state:", error);
    return {
      lastNotificationTimestamp: null,
      lastWhatsAppTimestamp: null,
    };
  }
}

/**
 * Update replay state with new notification timestamp
 */
export function updateReplayState(
  currentState: ReplayState,
  notification: { source: "system" | "whatsapp"; timestamp: Date }
): ReplayState {
  const newState = { ...currentState };

  if (notification.source === "system") {
    if (
      !newState.lastNotificationTimestamp ||
      notification.timestamp > newState.lastNotificationTimestamp
    ) {
      newState.lastNotificationTimestamp = notification.timestamp;
    }
  } else if (notification.source === "whatsapp") {
    if (
      !newState.lastWhatsAppTimestamp ||
      notification.timestamp > newState.lastWhatsAppTimestamp
    ) {
      newState.lastWhatsAppTimestamp = notification.timestamp;
    }
  }

  saveReplayState(newState);
  return newState;
}



