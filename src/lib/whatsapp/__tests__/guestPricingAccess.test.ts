import { isLeadAllowedByPricingRules } from "@/util/leadBudgetBand";

/**
 * WhatsApp guest pricing uses the same band helper as lead lists.
 * These cases mirror Sales inbox visibility for Athens 600–1200.
 */
describe("whatsapp guest pricing band", () => {
  const rules = {
    byLocation: { athens: { enabled: false, min: 600, max: 1200 } },
    all: { enabled: true, min: 600, max: 1200 },
  };

  it("keeps a chat whose lead ceiling is inside the band", () => {
    expect(
      isLeadAllowedByPricingRules({
        pricingRules: rules,
        location: "athens",
        maxBudget: 900,
      }),
    ).toBe(true);
  });

  it("hides a chat whose lead ceiling is outside the band", () => {
    expect(
      isLeadAllowedByPricingRules({
        pricingRules: rules,
        location: "athens",
        maxBudget: 350,
      }),
    ).toBe(false);
    expect(
      isLeadAllowedByPricingRules({
        pricingRules: rules,
        location: "athens",
        maxBudget: 2400,
      }),
    ).toBe(false);
  });
});
