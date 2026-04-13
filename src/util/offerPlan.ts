export type OfferPlanOption = {
  planName: string;
  duration: string;
  price: number;
  currency: string;
};

export type PlanFeaturePlaceholders = {
  planFeature1: string;
  planFeature2: string;
  planFeature3: string;
  planFeature4: string;
  planFeature5: string;
  planFeature6: string;
  planFeature7: string;
  planFeature8: string;
  planFeature9: string;
};

export function serializeOfferPlan(plan: OfferPlanOption): string {
  return `${plan.planName}-${plan.duration}-${plan.price}-${plan.currency}`;
}

export function parseOfferPlan(serialized: string): OfferPlanOption | null {
  const value = serialized.trim();
  if (!value) return null;

  const parts = value.split("-");
  if (parts.length < 4) return null;

  const currency = parts.pop() ?? "";
  const priceRaw = parts.pop() ?? "";
  const duration = parts.pop() ?? "";
  const planName = parts.join("-").trim();
  const price = Number(priceRaw);

  if (!planName || !duration || Number.isNaN(price) || price < 0) return null;
  return {
    planName,
    duration,
    price,
    currency: currency || "EUR",
  };
}

const ACTION_PLAN_FEATURES: readonly string[] = [
  "12 Months Premium Listing",
  "Personal Account Manager",
  "34 Professional HD Photographs",
  "Unlimited Property Description",
  "Upload Property Video (1080p)",
  "Social Media Marketing Campaign",
  "2 Detailed Promotion Reports",
  "10 Qualified Booking Inquiries",
  "2 Guaranteed Reservations (1-3 Weeks Each)",
] as const;

const GAME_PLAN_FEATURES: readonly string[] = [
  "18 Months Premium Listing",
  "Priority Account Manager",
  "Unlimited Professional HD Photographs",
  "Unlimited Property Description",
  "Upload Property Video (4K Quality)",
  "Advanced Social Media Marketing",
  "3 Comprehensive Promotion Reports",
  "15 Qualified Booking Inquiries",
  "3 Guaranteed Reservations (1-3 Weeks Each)",
] as const;

const MASTER_PLAN_FEATURES: readonly string[] = [
  "24 Months Premium Listing",
  "Dedicated Account Manager (24/7)",
  "Unlimited Professional HD Photographs",
  "Unlimited Property Description",
  "Upload Property Video (4K + Drone)",
  "Premium Social Media Marketing",
  "4 In-Depth Promotion Reports",
  "20 Qualified Booking Inquiries",
  "4 Guaranteed Reservations (1-3 Weeks Each)",
] as const;

function toPlanFeaturePlaceholders(features: readonly string[]): PlanFeaturePlaceholders {
  return {
    planFeature1: features[0] ?? "",
    planFeature2: features[1] ?? "",
    planFeature3: features[2] ?? "",
    planFeature4: features[3] ?? "",
    planFeature5: features[4] ?? "",
    planFeature6: features[5] ?? "",
    planFeature7: features[6] ?? "",
    planFeature8: features[7] ?? "",
    planFeature9: features[8] ?? "",
  };
}

export function getHolidayseraPlanFeaturePlaceholders(
  plan: string | OfferPlanOption | null | undefined,
): PlanFeaturePlaceholders {
  const parsed = typeof plan === "string" ? parseOfferPlan(plan) : plan;
  const normalizedPlanName = String(parsed?.planName ?? "").trim().toLowerCase();

  if (normalizedPlanName.includes("master")) {
    return toPlanFeaturePlaceholders(MASTER_PLAN_FEATURES);
  }
  if (normalizedPlanName.includes("game")) {
    return toPlanFeaturePlaceholders(GAME_PLAN_FEATURES);
  }
  if (normalizedPlanName.includes("action")) {
    return toPlanFeaturePlaceholders(ACTION_PLAN_FEATURES);
  }

  return toPlanFeaturePlaceholders(ACTION_PLAN_FEATURES);
}
