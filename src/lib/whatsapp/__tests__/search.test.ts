import { andMerge, isDenyAllFilter } from "../mongoMerge";
import {
  buildInboxContactSearchClause,
  buildPhoneMatchClauses,
  classifyPhoneMatch,
  normalizePhoneSearchDigits,
} from "../searchUtils";

describe("andMerge", () => {
  it("never overwrites an existing visibility $or", () => {
    const visibility = {
      status: "active",
      $or: [{ businessPhoneId: "p1" }, { whatsappChannelId: { $in: ["c1"] } }],
    };
    const search = { $or: [{ participantName: /x/i }] };

    const merged = andMerge(visibility, search);

    expect(merged.$or).toEqual(visibility.$or);
    expect(merged.$and).toEqual([search]);
  });

  it("appends to an existing $and without mutating the input", () => {
    const base = { $and: [{ a: 1 }] };
    const merged = andMerge(base, { b: 2 });

    expect(merged.$and).toEqual([{ a: 1 }, { b: 2 }]);
    expect(base.$and).toEqual([{ a: 1 }]);
  });

  it("ignores empty clauses", () => {
    expect(andMerge({ a: 1 }, {})).toEqual({ a: 1 });
    expect(andMerge({ a: 1 }, null)).toEqual({ a: 1 });
  });

  it("detects the deny-all sentinel", () => {
    expect(isDenyAllFilter({ _id: null })).toBe(true);
    expect(isDenyAllFilter({})).toBe(false);
  });
});

describe("phone search normalization", () => {
  it("strips formatting and the 00 dialing prefix", () => {
    expect(normalizePhoneSearchDigits("+48 512-831-150")).toBe("48512831150");
    expect(normalizePhoneSearchDigits("0048512831150")).toBe("48512831150");
  });
});

describe("buildPhoneMatchClauses", () => {
  it("uses exact + contains for 4+ digits", () => {
    const clauses = buildPhoneMatchClauses("5128");
    expect(clauses[0]).toEqual({ participantPhone: "5128" });
    expect(clauses[1]).toEqual({ participantPhone: { $regex: "5128" } });
  });

  it("uses an anchored prefix for short digit input", () => {
    const clauses = buildPhoneMatchClauses("48");
    expect(clauses[1]).toEqual({ participantPhone: { $regex: "^48" } });
  });

  it("adds a last-10 suffix branch for long numbers", () => {
    const clauses = buildPhoneMatchClauses("48512831150");
    expect(clauses).toContainEqual({ participantPhone: { $regex: "8512831150$" } });
  });

  it("escapes regex metacharacters in text queries", () => {
    const clause = buildInboxContactSearchClause("a+(b") as { $or: Array<Record<string, unknown>> };
    expect(clause.$or[0]).toEqual({
      participantName: { $regex: "a\\+\\(b", $options: "i" },
    });
  });

  it("includes phone predicates only for phone-like queries", () => {
    const text = buildInboxContactSearchClause("Jakub") as { $or: unknown[] };
    const phone = buildInboxContactSearchClause("48512831150") as { $or: unknown[] };
    expect(text.$or).toHaveLength(2);
    expect(phone.$or.length).toBeGreaterThan(2);
  });
});

describe("classifyPhoneMatch", () => {
  const stored = "48512831150";

  it("classifies exact, suffix and contains", () => {
    expect(classifyPhoneMatch(stored, "+48 512 831 150")).toBe("exact");
    expect(classifyPhoneMatch(stored, "512831150")).toBe("suffix");
    expect(classifyPhoneMatch(stored, "51283")).toBe("contains");
  });

  it("bridges country-code differences via last 10 digits", () => {
    expect(classifyPhoneMatch("8512831150", "48512831150")).toBe("suffix");
  });

  it("treats short digit input as prefix only", () => {
    expect(classifyPhoneMatch(stored, "48")).toBe("contains");
    expect(classifyPhoneMatch(stored, "51")).toBeUndefined();
  });

  it("returns undefined when nothing matches", () => {
    expect(classifyPhoneMatch(stored, "99999")).toBeUndefined();
  });
});
