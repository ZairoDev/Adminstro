import { getIstDayBounds } from "@/util/employeeActivitySession";

describe("getIstDayBounds", () => {
  it("uses IST midnight (18:30 UTC previous day) as the start of 17 Sep 2026", () => {
    // 17 Sep 2026 10:35 IST = 17 Sep 2026 05:05 UTC
    const now = new Date("2026-09-17T05:05:00.000Z");
    const { start, end } = getIstDayBounds(now);

    expect(start.toISOString()).toBe("2026-09-16T18:30:00.000Z");
    expect(end.toISOString()).toBe("2026-09-17T18:30:00.000Z");
  });

  it("keeps a login just after IST midnight on the new day", () => {
    const now = new Date("2026-09-16T18:30:00.000Z");
    const { start, end } = getIstDayBounds(now);

    expect(start.toISOString()).toBe("2026-09-16T18:30:00.000Z");
    expect(end.toISOString()).toBe("2026-09-17T18:30:00.000Z");
  });

  it("keeps a login just before IST midnight on the previous day", () => {
    const now = new Date("2026-09-16T18:29:59.999Z");
    const { start, end } = getIstDayBounds(now);

    expect(start.toISOString()).toBe("2026-09-15T18:30:00.000Z");
    expect(end.toISOString()).toBe("2026-09-16T18:30:00.000Z");
  });
});
