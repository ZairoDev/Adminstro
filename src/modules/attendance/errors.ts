export function isDuplicateKeyError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const record = error as { code?: number; writeErrors?: { code?: number }[] };
  if (record.code === 11000 && (!record.writeErrors || record.writeErrors.length === 0)) {
    return true;
  }
  if (Array.isArray(record.writeErrors) && record.writeErrors.length > 0) {
    return record.writeErrors.every((item) => item.code === 11000);
  }
  return false;
}

export class AttendanceError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "AttendanceError";
    this.status = status;
  }
}
