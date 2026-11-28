import {
  isHeldLead,
  mergeReleasedLeadFilter,
  releasedLeadFilter,
  salesBoardHidesUnapprovedLeads,
} from "@/lib/leads/leadApprovalGate";

describe("lead approval gate", () => {
  it("hides unapproved leads only on the sales boards", () => {
    expect(salesBoardHidesUnapprovedLeads("Sales")).toBe(true);
    expect(salesBoardHidesUnapprovedLeads("Sales-TeamLead")).toBe(true);
    expect(salesBoardHidesUnapprovedLeads("LeadGen-TeamLead")).toBe(false);
    expect(salesBoardHidesUnapprovedLeads("SuperAdmin")).toBe(false);
  });

  it("holds a stamped lead until it is approved and the city gate is on", () => {
    const keys = ["athens"];
    expect(
      isHeldLead(
        { approvalRequired: true, location: "Athens", leadQualityByTeamLead: null },
        keys,
      ),
    ).toBe(true);
    expect(
      isHeldLead(
        {
          approvalRequired: true,
          location: "athens",
          leadQualityByTeamLead: "Not Approved",
        },
        keys,
      ),
    ).toBe(true);
    expect(
      isHeldLead(
        {
          approvalRequired: true,
          location: "athens",
          leadQualityByTeamLead: "Approved",
        },
        keys,
      ),
    ).toBe(false);
    expect(
      isHeldLead(
        { approvalRequired: true, location: "milan", leadQualityByTeamLead: null },
        keys,
      ),
    ).toBe(false);
    expect(
      isHeldLead({ approvalRequired: false, location: "athens" }, keys),
    ).toBe(false);
    expect(
      isHeldLead(
        { approvalRequired: true, location: "athens" },
        [],
      ),
    ).toBe(false);
  });

  it("skips the mongo clause when no city requires approval", () => {
    expect(releasedLeadFilter([])).toBeNull();
    expect(mergeReleasedLeadFilter({ leadStatus: "fresh" }, null)).toEqual({
      leadStatus: "fresh",
    });
  });

  it("ands the release clause onto an existing match", () => {
    const filter = releasedLeadFilter(["athens"]);
    const merged = mergeReleasedLeadFilter(
      { leadStatus: "fresh", $and: [{ guest: 2 }] },
      filter,
    );
    expect(merged.leadStatus).toBe("fresh");
    expect(merged.$and).toEqual([{ guest: 2 }, filter]);
  });
});
