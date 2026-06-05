export interface PersonalReminderItem {
  _id: string;
  title: string;
  note: string;
  scheduledAt: string;
  status: "pending" | "sent" | "cancelled";
  emailSentAt?: string | null;
  dismissedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export function combineDateAndTime(date: Date, timeHHmm: string): Date {
  const [h, m] = timeHHmm.split(":").map(Number);
  const result = new Date(date);
  result.setHours(h ?? 0, m ?? 0, 0, 0);
  return result;
}

export function dateToTimeString(date: Date): string {
  const h = String(date.getHours()).padStart(2, "0");
  const m = String(date.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

export function parseDateKey(key: string): Date {
  const [y, mo, d] = key.split("-").map(Number);
  return new Date(y, mo - 1, d);
}

export function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function formatReminderDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
