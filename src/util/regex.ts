export function escapeRegExp(value: string): string {
  // Escape regex special chars: .*+?^${}()|[]\
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function exactCaseInsensitiveRegex(value: string): RegExp {
  return new RegExp(`^${escapeRegExp(value)}$`, "i");
}

