const DEFAULT_TTL_HOURS = 24;

export function computePasswordExpiryDate(ttlHours: number = DEFAULT_TTL_HOURS): Date {
  const passwordExpiresAt = new Date();
  passwordExpiresAt.setHours(passwordExpiresAt.getHours() + ttlHours);
  return passwordExpiresAt;
}

export function computePasswordExpiryMs(ttlHours: number = DEFAULT_TTL_HOURS): number {
  const now = Date.now();
  return now + ttlHours * 60 * 60 * 1000;
}

