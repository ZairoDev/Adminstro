/**
 * OS / browser desktop notifications for WhatsApp page (tab may be in background).
 * Requires user-granted Notification permission.
 */

export function isDesktopNotificationSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export function getDesktopNotificationPermission(): NotificationPermission {
  if (!isDesktopNotificationSupported()) return "denied";
  return Notification.permission;
}                    

export async function requestDesktopNotificationPermission(): Promise<NotificationPermission> {
  if (!isDesktopNotificationSupported()) return "denied";
  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied") return "denied";
  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}

export type ShowDesktopNotificationInput = {
  title: string;
  body?: string;
  /** Dedup / replace: same tag updates single notification in many browsers. */
  tag?: string;
  icon?: string;
  requireInteraction?: boolean;
};

export function showDesktopNotification(input: ShowDesktopNotificationInput): Notification | null {
  if (!isDesktopNotificationSupported() || Notification.permission !== "granted") {
    return null;
  }
  try {
    return new Notification(input.title, {
      body: input.body,
      tag: input.tag,
      icon: input.icon,
      requireInteraction: input.requireInteraction ?? false,
      silent: false,
    });
  } catch {
    return null;
  }
}
