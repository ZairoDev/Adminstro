import {
  leaveCancelledRecipients,
  leaveDecidedRecipients,
  leaveDedupeKey,
  leaveRequestedRecipients,
  missingLoginDedupeKey,
  missingLoginDigestMessage,
  newDigestIds,
  noticeHref,
  shouldNotifyMissingLogin,
  unionIds,
  type MissingLoginCheck,
} from "@/modules/attendance/notices/rules";

const hr = ["hr-1", "hr-2"];

function check(overrides: Partial<MissingLoginCheck> = {}): MissingLoginCheck {
  return {
    now: new Date("2026-11-20T19:00:00+05:30"),
    attendanceDate: "2026-11-20",
    cutoff: new Date("2026-11-20T18:30:00+05:30"),
    holiday: false,
    weeklyOff: false,
    joiningDate: "2026-01-01",
    exitDate: null,
    hasLogin: false,
    onApprovedLeave: false,
    ...overrides,
  };
}

describe("attendance notice recipients", () => {
  it("tells HR and the reporting manager about a request, not the person who filed it", () => {
    expect(
      leaveRequestedRecipients({
        actorId: "employee",
        managerId: "manager",
        decisionMakerIds: hr,
      }).map((recipient) => recipient.id),
    ).toEqual(["hr-1", "hr-2", "manager"]);
  });

  it("keeps one notice when the reporting manager is also HR, and links them to the leave queue", () => {
    const recipients = leaveRequestedRecipients({
      actorId: "employee",
      managerId: "hr-1",
      decisionMakerIds: hr,
    });
    expect(recipients).toEqual([
      { id: "hr-1", audience: "hr" },
      { id: "hr-2", audience: "hr" },
    ]);
    expect(noticeHref("hr", "employee", "leave")).toBe("/dashboard/attendance/leaves");
    expect(noticeHref("manager", "employee", "leave")).toBe("/dashboard/attendance/employee");
  });

  it("does not tell someone about a decision they made themselves", () => {
    expect(
      leaveDecidedRecipients({
        actorId: "hr-1",
        employeeId: "employee",
        managerId: "manager",
      }).map((recipient) => [recipient.id, recipient.audience]),
    ).toEqual([
      ["employee", "employee"],
      ["manager", "manager"],
    ]);
    expect(
      leaveDecidedRecipients({
        actorId: "employee",
        employeeId: "employee",
        managerId: "manager",
      }).map((recipient) => recipient.id),
    ).toEqual(["manager"]);
  });

  it("tells the employee when someone else cancels, and HR plus the manager when the employee cancels", () => {
    expect(
      leaveCancelledRecipients({
        actorId: "hr-1",
        employeeId: "employee",
        managerId: "manager",
        decisionMakerIds: hr,
      }).map((recipient) => recipient.id),
    ).toEqual(["employee"]);
    expect(
      leaveCancelledRecipients({
        actorId: "employee",
        employeeId: "employee",
        managerId: "manager",
        decisionMakerIds: hr,
      }).map((recipient) => recipient.id),
    ).toEqual(["manager", "hr-1", "hr-2"]);
  });
});

describe("missing login notices", () => {
  it("sends a notice only after cutoff on a working day with no login and no approved leave", () => {
    expect(shouldNotifyMissingLogin(check())).toBe(true);
    expect(
      shouldNotifyMissingLogin(
        check({ now: new Date("2026-11-20T18:00:00+05:30") }),
      ),
    ).toBe(false);
    expect(shouldNotifyMissingLogin(check({ holiday: true }))).toBe(false);
    expect(shouldNotifyMissingLogin(check({ weeklyOff: true }))).toBe(false);
    expect(shouldNotifyMissingLogin(check({ hasLogin: true }))).toBe(false);
    expect(shouldNotifyMissingLogin(check({ onApprovedLeave: true }))).toBe(false);
    expect(shouldNotifyMissingLogin(check({ joiningDate: "2026-11-21" }))).toBe(false);
    expect(shouldNotifyMissingLogin(check({ exitDate: "2026-11-19" }))).toBe(false);
  });

  it("uses one dedupe key per employee per day, and only emails new digest names", () => {
    expect(missingLoginDedupeKey("employee", "2026-11-20")).toBe(
      "missing_login:employee:2026-11-20",
    );
    expect(missingLoginDedupeKey("employee", "2026-11-21")).not.toBe(
      missingLoginDedupeKey("employee", "2026-11-20"),
    );
    expect(leaveDedupeKey("leave_approved", "leave-1", "employee")).toBe(
      "leave_approved:leave-1:employee",
    );
    expect(unionIds(["a"], ["a", "b"])).toEqual(["a", "b"]);
    expect(newDigestIds(["a"], ["a", "b"])).toEqual(["b"]);
    expect(newDigestIds(["a", "b"], ["a"])).toEqual([]);
    expect(missingLoginDigestMessage("20 Nov 2026", ["Asha", "Ravi"])).toBe(
      "Asha, Ravi have no login for 20 Nov 2026.",
    );
  });
});
