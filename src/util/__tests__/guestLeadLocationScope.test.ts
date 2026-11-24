import {
  applyGuestLeadLocationToQuery,
  leadAreaMatchRegex,
} from "@/util/guestLeadLocationScope";

describe("allotted city matches the area dropdown", () => {
  const locations = ["thessaloniki", "Thessaloniki", " thessaloniki "];

  it("uses the same matcher for an explicit city and a default allotment", () => {
    const explicit: Record<string, unknown> = {};
    applyGuestLeadLocationToQuery(explicit, {
      role: "SuperAdmin",
      assignedArea: [],
      uiAllotedArea: "thessaloniki",
    });

    const allotted: Record<string, unknown> = {};
    applyGuestLeadLocationToQuery(allotted, {
      role: "Sales",
      assignedArea: ["Thessaloniki"],
      uiAllotedArea: "",
    });

    const explicitRegex = explicit.location as RegExp;
    const allottedRegex = allotted.location as RegExp;

    for (const location of locations) {
      expect(explicitRegex.test(location)).toBe(true);
      expect(allottedRegex.test(location)).toBe(true);
    }
  });

  it("still matches a city stored with surrounding text", () => {
    expect(leadAreaMatchRegex("thessaloniki").test("north thessaloniki")).toBe(true);
  });
});
