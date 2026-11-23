import AttendanceNotice, {
  type AttendanceNoticeDoc,
  ATTENDANCE_NOTICE_KINDS,
} from "@/models/attendanceNotice";
import Employees from "@/models/employee";
import { isDuplicateKeyError } from "@/modules/attendance/errors";
import { formatAttendanceDate } from "@/modules/attendance/dates";
import {
  ATTENDANCE_DECISION_ROLES,
  leaveCancelledRecipients,
  leaveDecidedRecipients,
  leaveDedupeKey,
  leaveRequestedRecipients,
  missingLoginDigestMessage,
  missingLoginEmailAllowed,
  missingLoginFollowUpMessage,
  newDigestIds,
  noticeHref,
  unionIds,
  type NoticeAudience,
  type NoticeRecipient,
} from "@/modules/attendance/notices/rules";
import { getAttendanceNoticeEmailTemplate } from "@/lib/email/templates/attendanceNotice";
import { sendCustomEmail } from "@/lib/email";
import { connectDb } from "@/util/db";
import { TEST_SUPERADMIN_EMAIL } from "@/util/employeeConstants";

export type AttendanceNoticeKind = (typeof ATTENDANCE_NOTICE_KINDS)[number];

export type AttendanceNoticeView = {
  id: string;
  kind: AttendanceNoticeKind;
  title: string;
  message: string;
  href: string;
  createdAt: string;
  readAt: string | null;
};

type NoticeDraft = {
  recipientId: string;
  kind: AttendanceNoticeKind;
  title: string;
  message: string;
  href: string;
  relatedId: string;
  dedupeKey: string;
  subjectIds: string[];
};

type LeaveNoticeEvent = "requested" | "approved" | "rejected" | "cancelled";

const LEAVE_KIND: Record<LeaveNoticeEvent, AttendanceNoticeKind> = {
  requested: "leave_requested",
  approved: "leave_approved",
  rejected: "leave_rejected",
  cancelled: "leave_cancelled",
};

function appBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    "https://adminstro.in"
  ).replace(/\/$/, "");
}

function toView(row: {
  _id: unknown;
  kind: string;
  title: string;
  message: string;
  href: string;
  createdAt?: Date;
  readAt?: Date | null;
}): AttendanceNoticeView {
  return {
    id: String(row._id),
    kind: row.kind as AttendanceNoticeKind,
    title: row.title,
    message: row.message,
    href: row.href,
    createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : new Date().toISOString(),
    readAt: row.readAt ? new Date(row.readAt).toISOString() : null,
  };
}

function emitNotice(recipientId: string, notice: AttendanceNoticeView): void {
  const io = (
    global as {
      io?: { to: (room: string) => { emit: (event: string, payload: unknown) => void } };
    }
  ).io;
  io?.to(`user-${recipientId}`).emit("attendance-notice", notice);
}

async function recipientContact(
  recipientId: string,
): Promise<{ name: string; email: string } | null> {
  const row = await Employees.findById(recipientId)
    .select("name email isActive")
    .lean<{ name?: string; email?: string; isActive?: boolean } | null>();
  if (!row || row.isActive === false) return null;
  const email = row.email?.trim() || "";
  if (!email || email === TEST_SUPERADMIN_EMAIL) return null;
  return { name: row.name?.trim() || "there", email };
}

async function deliverEmail(
  notice: Pick<AttendanceNoticeDoc, "_id" | "recipientId" | "title" | "message" | "href" | "subjectIds">,
  message: string,
  emailedSubjectIds: string[],
): Promise<void> {
  const contact = await recipientContact(notice.recipientId);
  if (!contact) {
    await AttendanceNotice.updateOne(
      { _id: notice._id },
      { $set: { emailSentAt: new Date(), emailedSubjectIds: notice.subjectIds } },
    );
    return;
  }
  const template = getAttendanceNoticeEmailTemplate({
    recipientName: contact.name,
    title: notice.title,
    message,
    appUrl: `${appBaseUrl()}${notice.href}`,
  });
  const result = await sendCustomEmail(contact.email, template);
  if (!result.success) {
    console.warn(`[attendance-notice] Email failed for ${notice.recipientId}:`, result.error);
    return;
  }
  await AttendanceNotice.updateOne(
    { _id: notice._id },
    { $set: { emailSentAt: new Date(), emailedSubjectIds } },
  );
}

async function recipientRole(recipientId: string): Promise<string> {
  const row = await Employees.findById(recipientId)
    .select("role")
    .lean<{ role?: string } | null>();
  return row?.role ?? "";
}

async function emailPending(notice: AttendanceNoticeDoc): Promise<void> {
  if (notice.kind === "missing_login" || notice.kind === "missing_login_digest") {
    const allowed = missingLoginEmailAllowed({
      kind: notice.kind,
      title: notice.title,
      role: await recipientRole(notice.recipientId),
    });
    if (!allowed) {
      if (!notice.emailSentAt) {
        await AttendanceNotice.updateOne(
          { _id: notice._id },
          { $set: { emailSentAt: new Date(), emailedSubjectIds: notice.subjectIds } },
        );
      }
      return;
    }
  }
  const pendingIds = notice.subjectIds.filter((id) => !notice.emailedSubjectIds.includes(id));
  if (notice.kind === "missing_login_digest" && notice.emailSentAt && pendingIds.length === 0) return;
  if (notice.kind !== "missing_login_digest") {
    await deliverEmail(notice, notice.message, notice.subjectIds);
    return;
  }
  const names = await namesFor(pendingIds.length > 0 ? pendingIds : notice.subjectIds);
  const message = notice.emailSentAt
    ? missingLoginFollowUpMessage(names)
    : notice.message;
  await deliverEmail(notice, message, unionIds(notice.emailedSubjectIds, notice.subjectIds));
}

async function namesFor(ids: string[]): Promise<string[]> {
  if (ids.length === 0) return [];
  const rows = await Employees.find({ _id: { $in: ids } })
    .select("name")
    .lean<{ _id: unknown; name?: string }[]>();
  const byId = new Map(rows.map((row) => [String(row._id), row.name?.trim() || "Unnamed employee"]));
  return ids.map((id) => byId.get(id) || "Unnamed employee");
}

async function publishOnce(draft: NoticeDraft): Promise<boolean> {
  try {
    const created = await AttendanceNotice.create({
      ...draft,
      readAt: null,
      emailSentAt: null,
      emailedSubjectIds: [],
    });
    const view = toView(created);
    emitNotice(draft.recipientId, view);
    await emailPending(created);
    return true;
  } catch (error) {
    if (!isDuplicateKeyError(error)) throw error;
    return false;
  }
}

async function publishDigest(draft: NoticeDraft, namesById: Map<string, string>): Promise<void> {
  const existing = await AttendanceNotice.findOne({ dedupeKey: draft.dedupeKey });
  if (!existing) {
    const names = draft.subjectIds.map((id) => namesById.get(id) || "Unnamed employee");
    await publishOnce({
      ...draft,
      message: missingLoginDigestMessage(digestDateLabel(draft.relatedId), names),
    });
    return;
  }
  const merged = unionIds(existing.subjectIds, draft.subjectIds);
  const added = newDigestIds(existing.subjectIds, merged);
  if (added.length === 0) return;
  const unknown = merged.filter((id) => !namesById.has(id));
  if (unknown.length > 0) {
    const loaded = await namesFor(unknown);
    unknown.forEach((id, index) => namesById.set(id, loaded[index] || "Unnamed employee"));
  }
  const names = merged.map((id) => namesById.get(id) || "Unnamed employee");
  existing.subjectIds = merged;
  existing.message = missingLoginDigestMessage(digestDateLabel(draft.relatedId), names);
  existing.readAt = null;
  await existing.save();
  emitNotice(existing.recipientId, toView(existing));
  await emailPending(existing);
}

function digestDateLabel(date: string): string {
  return formatAttendanceDate(date);
}

export async function listAttendanceNotices(recipientId: string): Promise<{
  notices: AttendanceNoticeView[];
  unreadCount: number;
}> {
  await connectDb();
  const [rows, unreadCount] = await Promise.all([
    AttendanceNotice.find({ recipientId }).sort({ readAt: 1, createdAt: -1 }).limit(30).lean(),
    AttendanceNotice.countDocuments({ recipientId, readAt: null }),
  ]);
  return {
    notices: rows.map((row) => toView(row)),
    unreadCount,
  };
}

export async function markAttendanceNoticeRead(recipientId: string, noticeId: string): Promise<void> {
  await connectDb();
  await AttendanceNotice.updateOne(
    { _id: noticeId, recipientId, readAt: null },
    { $set: { readAt: new Date() } },
  );
}

export async function retryUnsentAttendanceNoticeEmails(): Promise<void> {
  await connectDb();
  const since = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
  const pending = await AttendanceNotice.find({
    createdAt: { $gte: since },
    $or: [{ emailSentAt: null }, { kind: "missing_login_digest" }],
  })
    .sort({ emailSentAt: 1, createdAt: 1 })
    .limit(40)
    .exec();
  for (const notice of pending) {
    const pendingIds = notice.subjectIds.filter((id) => !notice.emailedSubjectIds.includes(id));
    if (notice.emailSentAt && pendingIds.length === 0) continue;
    try {
      await emailPending(notice);
    } catch (error) {
      console.warn(`[attendance-notice] Retry failed for ${notice.dedupeKey}:`, error);
    }
  }
}

async function decisionMakerIds(): Promise<string[]> {
  const rows = await Employees.find({
    role: { $in: [...ATTENDANCE_DECISION_ROLES] },
    isActive: { $ne: false },
    email: { $ne: TEST_SUPERADMIN_EMAIL },
  })
    .select("_id")
    .lean<{ _id: unknown }[]>();
  return rows.map((row) => String(row._id));
}

async function employeeContext(employeeId: string): Promise<{
  name: string;
  managerId: string | null;
}> {
  const employee = await Employees.findById(employeeId)
    .select("name reportingManagerId")
    .lean<{ name?: string; reportingManagerId?: unknown } | null>();
  const name = employee?.name?.trim() || "An employee";
  const managerId =
    employee?.reportingManagerId != null ? String(employee.reportingManagerId) : null;
  if (!managerId) return { name, managerId: null };
  const manager = await Employees.findById(managerId)
    .select("isActive")
    .lean<{ isActive?: boolean } | null>();
  if (!manager || manager.isActive === false) return { name, managerId: null };
  return { name, managerId };
}

function leaveLabel(leaveType: string): string {
  return leaveType === "unplanned" ? "unplanned" : "planned";
}

function leaveCopy(input: {
  event: LeaveNoticeEvent;
  audience: NoticeAudience;
  employeeName: string;
  leaveType: string;
  fromDate: string;
  toDate: string;
}): { title: string; message: string } {
  const range =
    input.fromDate === input.toDate
      ? formatAttendanceDate(input.fromDate)
      : `${formatAttendanceDate(input.fromDate)} to ${formatAttendanceDate(input.toDate)}`;
  const kind = leaveLabel(input.leaveType);
  if (input.event === "requested") {
    return {
      title: "Leave request",
      message: `${input.employeeName} asked for ${kind} leave on ${range}.`,
    };
  }
  if (input.event === "approved") {
    return input.audience === "employee"
      ? { title: "Leave approved", message: `Your ${kind} leave on ${range} was approved.` }
      : {
          title: "Leave approved",
          message: `${input.employeeName}'s ${kind} leave on ${range} was approved.`,
        };
  }
  if (input.event === "rejected") {
    return input.audience === "employee"
      ? { title: "Leave rejected", message: `Your ${kind} leave on ${range} was rejected.` }
      : {
          title: "Leave rejected",
          message: `${input.employeeName}'s ${kind} leave on ${range} was rejected.`,
        };
  }
  return input.audience === "employee"
    ? { title: "Leave cancelled", message: `Your ${kind} leave on ${range} was cancelled.` }
    : {
        title: "Leave cancelled",
        message: `${input.employeeName} cancelled ${kind} leave on ${range}.`,
      };
}

function recipientsFor(
  event: LeaveNoticeEvent,
  input: { actorId: string; employeeId: string; managerId: string | null; decisionMakerIds: string[] },
): NoticeRecipient[] {
  if (event === "requested") {
    return leaveRequestedRecipients({
      actorId: input.actorId,
      managerId: input.managerId,
      decisionMakerIds: input.decisionMakerIds,
    });
  }
  if (event === "cancelled") {
    return leaveCancelledRecipients({
      actorId: input.actorId,
      employeeId: input.employeeId,
      managerId: input.managerId,
      decisionMakerIds: input.decisionMakerIds,
    });
  }
  return leaveDecidedRecipients({
    actorId: input.actorId,
    employeeId: input.employeeId,
    managerId: input.managerId,
  });
}

export async function notifyLeaveEvent(input: {
  event: LeaveNoticeEvent;
  leaveId: string;
  employeeId: string;
  actorId: string;
  fromDate: string;
  toDate: string;
  leaveType: string;
}): Promise<void> {
  try {
    await connectDb();
    const [context, makers] = await Promise.all([
      employeeContext(input.employeeId),
      input.event === "approved" || input.event === "rejected"
        ? Promise.resolve([])
        : decisionMakerIds(),
    ]);
    const recipients = recipientsFor(input.event, {
      actorId: input.actorId,
      employeeId: input.employeeId,
      managerId: context.managerId,
      decisionMakerIds: makers,
    });
    const kind = LEAVE_KIND[input.event];
    for (const recipient of recipients) {
      const copy = leaveCopy({
        event: input.event,
        audience: recipient.audience,
        employeeName: context.name,
        leaveType: input.leaveType,
        fromDate: input.fromDate,
        toDate: input.toDate,
      });
      await publishOnce({
        recipientId: recipient.id,
        kind,
        title: copy.title,
        message: copy.message,
        href: noticeHref(recipient.audience, input.employeeId, "leave"),
        relatedId: input.leaveId,
        dedupeKey: leaveDedupeKey(kind, input.leaveId, recipient.id),
        subjectIds: [],
      });
    }
  } catch (error) {
    console.warn("[attendance-notice] Leave notice failed:", error);
  }
}

export async function notifyMissingLogin(input: {
  employeeId: string;
  date: string;
}): Promise<boolean> {
  const dateLabel = formatAttendanceDate(input.date);
  return publishOnce({
    recipientId: input.employeeId,
    kind: "missing_login",
    title: `No login on ${dateLabel}`,
    message: `You have no login for ${dateLabel}. The cutoff for your shift has passed.`,
    href: noticeHref("employee", input.employeeId, "digest"),
    relatedId: input.date,
    dedupeKey: `missing_login:${input.employeeId}:${input.date}`,
    subjectIds: [input.employeeId],
  });
}

export async function notifyMissingLoginDigest(input: {
  recipientId: string;
  audience: Extract<NoticeAudience, "hr" | "manager">;
  date: string;
  subjectIds: string[];
  namesById: Map<string, string>;
}): Promise<void> {
  if (input.subjectIds.length === 0) return;
  const dateLabel = formatAttendanceDate(input.date);
  const names = input.subjectIds.map((id) => input.namesById.get(id) || "Unnamed employee");
  await publishDigest(
    {
      recipientId: input.recipientId,
      kind: "missing_login_digest",
      title: input.audience === "hr" ? "Employees have no login" : "Team has no login",
      message: missingLoginDigestMessage(dateLabel, names),
      href: noticeHref(input.audience, input.recipientId, "digest"),
      relatedId: input.date,
      dedupeKey: `missing_login_digest:${input.recipientId}:${input.date}`,
      subjectIds: input.subjectIds,
    },
    input.namesById,
  );
}

export async function loadDecisionMakerIds(): Promise<string[]> {
  await connectDb();
  return decisionMakerIds();
}
