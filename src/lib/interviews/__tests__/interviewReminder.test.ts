import {
  decideInterviewReminder,
  formatInterviewSlot,
  interviewReminderNote,
  interviewReminderTitle,
  interviewStartInstant,
  type InterviewReminderSnapshot,
} from "@/lib/interviews/interviewReminder";

const employeeId = "64b000000000000000000001";
const otherEmployeeId = "64b000000000000000000002";

function desiredAt(iso: string) {
  const scheduledAtMs = new Date(iso).getTime();
  return {
    employeeId,
    scheduledAtMs,
    title: "Interview: Ada — Engineer",
    note: "You are the interviewer for Ada.",
  };
}

describe("interview reminder instant", () => {
  it("stores 10:00 IST as 04:30 UTC", () => {
    const instant = interviewStartInstant("2026-11-06", "10:00");
    expect(instant?.toISOString()).toBe("2026-11-06T04:30:00.000Z");
  });

  it("keeps 00:15 IST on the same calendar day", () => {
    const instant = interviewStartInstant("2026-11-06", "0:15");
    expect(instant?.toISOString()).toBe("2026-11-05T18:45:00.000Z");
  });

  it("rejects a calendar day that does not exist", () => {
    expect(interviewStartInstant("2026-02-31", "10:00")).toBeNull();
    expect(interviewStartInstant("tomorrow", "10:00")).toBeNull();
  });
});

describe("interview reminder copy", () => {
  it("names the interviewer duty, round, and slot", () => {
    expect(interviewReminderTitle("second", "Ada", "Engineer")).toBe(
      "Second round interview: Ada — Engineer",
    );
    expect(formatInterviewSlot("2026-11-06", "9:05")).toBe("6 Nov 2026, 09:05 IST");
    const note = interviewReminderNote({
      candidateName: "Ada",
      position: "Engineer",
      round: "first",
      scheduledDate: "2026-11-06",
      scheduledTime: "10:00",
      interviewMode: "virtual",
      googleMeetLink: "https://meet.example/ada",
    });
    expect(note).toContain("You are the interviewer for Ada.");
    expect(note).toContain("Round: First round");
    expect(note).toContain("When: 6 Nov 2026, 10:00 IST");
    expect(note).toContain("Meet: https://meet.example/ada");
  });
});

describe("decideInterviewReminder", () => {
  const nowMs = new Date("2026-11-06T04:00:00.000Z").getTime();
  const future = desiredAt("2026-11-06T04:30:00.000Z");

  it("creates a reminder when the interview is still ahead", () => {
    expect(decideInterviewReminder(null, future, nowMs).type).toBe("upsert");
  });

  it("does not create a reminder after the interview time", () => {
    const past = desiredAt("2026-11-06T03:00:00.000Z");
    expect(decideInterviewReminder(null, past, nowMs)).toEqual({ type: "skip" });
  });

  it("leaves an existing due reminder in place", () => {
    const past = desiredAt("2026-11-06T03:00:00.000Z");
    const existing: InterviewReminderSnapshot = {
      employeeId,
      scheduledAtMs: past.scheduledAtMs,
      status: "pending",
    };
    expect(decideInterviewReminder(existing, past, nowMs)).toEqual({ type: "skip" });
  });

  it("keeps a dismissed or cancelled reminder for the same slot", () => {
    const existing: InterviewReminderSnapshot = {
      employeeId,
      scheduledAtMs: future.scheduledAtMs,
      status: "cancelled",
    };
    expect(decideInterviewReminder(existing, future, nowMs)).toEqual({ type: "skip" });
  });

  it("reopens when the interview moves or the interviewer changes", () => {
    const existing: InterviewReminderSnapshot = {
      employeeId,
      scheduledAtMs: future.scheduledAtMs,
      status: "sent",
    };
    const moved = desiredAt("2026-11-06T06:30:00.000Z");
    expect(decideInterviewReminder(existing, moved, nowMs).type).toBe("upsert");

    const reassigned = { ...future, employeeId: otherEmployeeId };
    const decision = decideInterviewReminder(existing, reassigned, nowMs);
    expect(decision).toMatchObject({ type: "upsert", employeeId: otherEmployeeId });
  });
});
