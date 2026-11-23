export const ATTENDANCE_DECISION_ROLES = ["HR", "Admin", "SuperAdmin"] as const;

export type NoticeAudience = "hr" | "manager" | "employee";

export type NoticeRecipient = {
  id: string;
  audience: NoticeAudience;
};

export type MissingLoginCheck = {
  now: Date;
  attendanceDate: string;
  cutoff: Date;
  holiday: boolean;
  weeklyOff: boolean;
  joiningDate: string | null;
  exitDate: string | null;
  hasLogin: boolean;
  onApprovedLeave: boolean;
};

export function uniqueRecipients(
  recipients: NoticeRecipient[],
  actorId: string,
): NoticeRecipient[] {
  const seen = new Set<string>();
  const result: NoticeRecipient[] = [];
  for (const recipient of recipients) {
    if (!recipient.id || recipient.id === actorId || seen.has(recipient.id)) continue;
    seen.add(recipient.id);
    result.push(recipient);
  }
  return result;
}

/** HR and Admin can act on the request. The reporting manager is told as well. */
export function leaveRequestedRecipients(input: {
  actorId: string;
  managerId: string | null;
  decisionMakerIds: string[];
}): NoticeRecipient[] {
  return uniqueRecipients(
    [
      ...input.decisionMakerIds.map((id) => ({ id, audience: "hr" as const })),
      ...(input.managerId ? [{ id: input.managerId, audience: "manager" as const }] : []),
    ],
    input.actorId,
  );
}

/** The employee and their manager hear the result. The person who decided does not. */
export function leaveDecidedRecipients(input: {
  actorId: string;
  employeeId: string;
  managerId: string | null;
}): NoticeRecipient[] {
  return uniqueRecipients(
    [
      { id: input.employeeId, audience: "employee" },
      ...(input.managerId ? [{ id: input.managerId, audience: "manager" as const }] : []),
    ],
    input.actorId,
  );
}

/**
 * Someone else cancelling tells the employee.
 * The employee cancelling tells their manager and the people who approve leave.
 */
export function leaveCancelledRecipients(input: {
  actorId: string;
  employeeId: string;
  managerId: string | null;
  decisionMakerIds: string[];
}): NoticeRecipient[] {
  if (input.actorId === input.employeeId) {
    return uniqueRecipients(
      [
        ...(input.managerId ? [{ id: input.managerId, audience: "manager" as const }] : []),
        ...input.decisionMakerIds.map((id) => ({ id, audience: "hr" as const })),
      ],
      input.actorId,
    );
  }
  return uniqueRecipients([{ id: input.employeeId, audience: "employee" }], input.actorId);
}

export function noticeHref(
  audience: NoticeAudience,
  employeeId: string,
  kind: "leave" | "digest",
): string {
  if (audience === "hr") {
    return kind === "leave" ? "/dashboard/attendance/leaves" : "/dashboard/attendance";
  }
  if (audience === "manager") {
    return kind === "leave" ? `/dashboard/attendance/${employeeId}` : "/dashboard/attendance";
  }
  return "/dashboard/my-attendance";
}

export function leaveDedupeKey(kind: string, leaveId: string, recipientId: string): string {
  return `${kind}:${leaveId}:${recipientId}`;
}

export function missingLoginDedupeKey(employeeId: string, date: string): string {
  return `missing_login:${employeeId}:${date}`;
}

export function missingLoginDigestDedupeKey(recipientId: string, date: string): string {
  return `missing_login_digest:${recipientId}:${date}`;
}

export function unionIds(left: string[], right: string[]): string[] {
  return [...new Set([...left, ...right])];
}

/** Ids in `next` that were not already on the digest. */
export function newDigestIds(already: string[], next: string[]): string[] {
  const seen = new Set(already);
  return next.filter((id) => id && !seen.has(id));
}

export function shouldNotifyMissingLogin(input: MissingLoginCheck): boolean {
  if (input.now.getTime() < input.cutoff.getTime()) return false;
  if (input.holiday || input.weeklyOff) return false;
  if (input.hasLogin || input.onApprovedLeave) return false;
  if (input.joiningDate && input.attendanceDate < input.joiningDate) return false;
  if (input.exitDate && input.attendanceDate > input.exitDate) return false;
  return true;
}

export function joinNames(names: string[], limit = 12): string {
  const clean = names.map((name) => name.trim()).filter((name) => name.length > 0);
  const shown = clean.slice(0, limit);
  const extra = clean.length - shown.length;
  if (shown.length === 0) return "Someone";
  if (extra > 0) return `${shown.join(", ")}, and ${extra} more`;
  return shown.join(", ");
}

export function missingLoginDigestMessage(dateLabel: string, names: string[]): string {
  const list = joinNames(names);
  const verb = names.length === 1 ? "has" : "have";
  return `${list} ${verb} no login for ${dateLabel}.`;
}

export function missingLoginFollowUpMessage(names: string[]): string {
  const list = joinNames(names);
  const verb = names.length === 1 ? "also has" : "also have";
  return `${list} ${verb} no login.`;
}

/** Missed-login email goes only to a SuperAdmin company digest. Leave mail is unchanged. */
export function missingLoginEmailAllowed(input: {
  kind: string;
  title: string;
  role: string;
}): boolean {
  return (
    input.kind === "missing_login_digest" &&
    input.title === "Employees have no login" &&
    input.role === "SuperAdmin"
  );
}
