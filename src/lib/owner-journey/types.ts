export type OwnerJourneyStage = 1 | 2 | 3 | 4;

export type OwnerSiteKey = "vacationSaga" | "holidaySera" | "housingSaga";

export interface SiteJourney {
  site: OwnerSiteKey;
  stage: OwnerJourneyStage;
}

export interface OwnerJourneyPayload {
  vacationSaga?: SiteJourney;
  holidaySera?: SiteJourney;
  housingSaga?: SiteJourney;
}

/** Minimal subscription doc from Mongo (users ↔ Subscription collection) */
export interface SubscriptionLike {
  planId?: string;
  planName?: string;
  status?: string;
  razorpayPaymentId?: string;
  razorpaySignature?: string;
}

/** Minimal holiday user doc (holidayUsers collection) */
export interface HolidayUserLike {
  role?: string | null;
  isProfileComplete?: boolean;
  subscription?: {
    planId?: string;
    planName?: string;
    status?: "active" | "expired" | "cancelled" | "none" | string;
  };
  Payment?: Record<string, unknown> | null;
}

/** Minimal housing owner doc */
export interface HousingUserLike {
  role?: string | null;
  onboarded?: boolean;
  subscriptionPlan?: string | null;
  subscriptionValidTill?: Date | string | null;
  paymentStatus?: "active" | "inactive" | null;
  paidListingAddresses?: string[];
}

export interface HousingPaymentLike {
  userId?: string;
  status?: string;
}

export interface VsIdRef {
  _id?: unknown;
  VSID?: string;
}
