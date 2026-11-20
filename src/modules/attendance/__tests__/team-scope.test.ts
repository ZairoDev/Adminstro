import { descendantIds } from "@/modules/attendance/team-scope";

describe("reporting manager attendance scope", () => {
  const links = [
    { id: "lead", managerId: "manager" },
    { id: "ic", managerId: "lead" },
    { id: "peer", managerId: "other" },
    { id: "manager", managerId: "director" },
  ];

  it("includes direct reports and the teams under them", () => {
    expect(descendantIds("manager", links).sort()).toEqual(["ic", "lead"]);
  });

  it("does not include the manager, their own manager, or other teams", () => {
    const ids = descendantIds("manager", links);
    expect(ids).not.toContain("manager");
    expect(ids).not.toContain("director");
    expect(ids).not.toContain("peer");
  });

  it("stops on a reporting cycle", () => {
    expect(
      descendantIds("a", [
        { id: "b", managerId: "a" },
        { id: "a", managerId: "b" },
      ]).sort(),
    ).toEqual(["b"]);
  });
});
