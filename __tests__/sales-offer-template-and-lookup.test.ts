import { renderTemplate } from "@/util/templateEngine";
import { resolvePayNowUrl } from "@/util/payNowUrl";
import { computePlatformAvailability } from "@/util/salesOfferLookup";

describe("sales-offer template placeholders", () => {
  test("renderTemplate replaces payNowUrl and ownerName placeholders", () => {
    const html = `<a href="{{payNowUrl}}">Pay Now</a><p>{{ownerName}}</p>`;
    const rendered = renderTemplate(html, {
      payNowUrl: "https://example.com/pay-now",
      ownerName: "Alex",
    });

    expect(rendered).toContain(`href="https://example.com/pay-now"`);
    expect(rendered).toContain("<p>Alex</p>");
  });
});

describe("sales-offer pay-now url resolver", () => {
  const originalEnv = {
    VACATIONSAGA_PAY_NOW_URL: process.env.VACATIONSAGA_PAY_NOW_URL,
    HOLIDAYSERA_PAY_NOW_URL: process.env.HOLIDAYSERA_PAY_NOW_URL,
    HOUSINGSAGA_PAY_NOW_URL: process.env.HOUSINGSAGA_PAY_NOW_URL,
  };

  afterEach(() => {
    process.env.VACATIONSAGA_PAY_NOW_URL = originalEnv.VACATIONSAGA_PAY_NOW_URL;
    process.env.HOLIDAYSERA_PAY_NOW_URL = originalEnv.HOLIDAYSERA_PAY_NOW_URL;
    process.env.HOUSINGSAGA_PAY_NOW_URL = originalEnv.HOUSINGSAGA_PAY_NOW_URL;
  });

  test("uses org-specific env URL when configured", () => {
    process.env.HOLIDAYSERA_PAY_NOW_URL = "https://holidaysera.test/pay";
    const url = resolvePayNowUrl("Holidaysera", "https://fallback.local");
    expect(url).toBe("https://holidaysera.test/pay");
  });

  test("uses org default when env is missing", () => {
    process.env.HOUSINGSAGA_PAY_NOW_URL = "";
    const url = resolvePayNowUrl("HousingSaga", "https://property-link.local");
    expect(url).toBe("https://housingsaga.com/pricing");
  });

  test("uses VacationSaga and Holidaysera defaults when env is missing", () => {
    process.env.VACATIONSAGA_PAY_NOW_URL = "";
    process.env.HOLIDAYSERA_PAY_NOW_URL = "";
    expect(resolvePayNowUrl("VacationSaga", "#")).toBe("https://vacationsaga.com/subscription");
    expect(resolvePayNowUrl("Holidaysera", "#")).toBe(
      "https://holidaysera.com/subscriptions#perfect-plan",
    );
  });

  test("treats whitespace-only env as unset and uses org default", () => {
    process.env.VACATIONSAGA_PAY_NOW_URL = "   ";
    expect(resolvePayNowUrl("VacationSaga", "https://property.local")).toBe(
      "https://vacationsaga.com/subscription",
    );
  });
});

describe("sales-offer availability aggregation", () => {
  test("checks all matching records, not only first two", () => {
    const availability = computePlatformAvailability([
      { platform: "TechTunes" },
      { platform: "Holidaysera" },
      { platform: "VacationSaga" },
      { platform: "HousingSaga" },
    ]);

    expect(availability.availableOnVS).toBe(true);
    expect(availability.availableOnTT).toBe(true);
    expect(availability.availableOnHS).toBe(true);
  });
});
