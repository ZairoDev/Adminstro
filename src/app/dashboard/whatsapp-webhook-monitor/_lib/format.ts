import axios from "@/util/axios";

export function formatDateTime(value?: string): string {
  return value ? new Date(value).toLocaleString() : "—";
}

export function timeAgo(value?: string): string {
  if (!value) return "never";
  const diffMs = Date.now() - new Date(value).getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return `${hours} h ago`;
  return `${Math.floor(hours / 24)} d ago`;
}

export function apiErrorMessage(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err)) {
    const data: unknown = err.response?.data;
    if (data && typeof data === "object" && "error" in data) {
      return String((data as { error: unknown }).error);
    }
  }
  return fallback;
}
