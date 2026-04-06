import type {
  HolidayUserLike,
  HousingPaymentLike,
  HousingUserLike,
  OwnerJourneyPayload,
  OwnerJourneyStage,
  OwnerSiteKey,
  SiteJourney,
  SubscriptionLike,
  VsIdRef,
} from "./types";

const STAGE_LABELS: Record<OwnerJourneyStage, string> = {
  1: "Profile created",
  2: "Property registered",
  3: "Plan selected",
  4: "Payment completed",
};

export function stageLabel(stage: OwnerJourneyStage): string {
  return STAGE_LABELS[stage];
}

export function normalizeEmail(email: string | undefined | null): string {
  return String(email ?? "")
    .trim()
    .toLowerCase();
}

export function isHolidaySeraOrigin(origin: unknown): boolean {
  if (typeof origin !== "string") return false;
  return origin.trim().toLowerCase() === "holidaysera";
}

function siteJourney(site: OwnerSiteKey, stage: OwnerJourneyStage): SiteJourney {
  return { site, stage };
}

function propertyCount(vsids: VsIdRef[] | undefined, vsids2: VsIdRef[] | undefined): number {
  return (vsids?.length ?? 0) + (vsids2?.length ?? 0);
}

function pickBestSubscription(subs: SubscriptionLike[]): SubscriptionLike | undefined {
  if (!subs.length) return undefined;
  const ranked = [...subs].sort((a, b) => {
    const score = (s: SubscriptionLike) => {
      if (s.status === "active" && s.razorpayPaymentId) return 4;
      if (s.status === "active") return 3;
      if (s.status === "pending") return 2;
      return 1;
    };
    return score(b) - score(a);
  });
  return ranked[0];
}

/** VacationSaga / generic Users row: uses properties + listings + Subscription on Users._id */
export function computeVacationSagaStage(
  role: string | undefined,
  vsids: VsIdRef[] | undefined,
  vsids2: VsIdRef[] | undefined,
  subscriptions: SubscriptionLike[] | undefined,
): OwnerJourneyStage {
  if (role !== "Owner") return 1;
  let stage: OwnerJourneyStage = 1;
  if (propertyCount(vsids, vsids2) > 0) stage = 2;
  const sub = pickBestSubscription(subscriptions ?? []);
  if (
    sub &&
    (Boolean(sub.planId?.trim()) || Boolean(sub.planName?.trim())) &&
    (sub.status === "pending" || sub.status === "active")
  ) {
    stage = 3;
  }
  if (sub && sub.status === "active" && Boolean(sub.razorpayPaymentId?.trim())) {
    stage = 4;
  }
  return stage;
}

function holidayPaymentIndicatesSuccess(payment: Record<string, unknown> | null | undefined): boolean {
  if (!payment || typeof payment !== "object") return false;
  const status = payment.status;
  if (status === "captured" || status === "success" || status === "paid") return true;
  const pid = payment.razorpayPaymentId;
  if (typeof pid === "string" && pid.trim().length > 0) return true;
  return false;
}

/** HolidaySera: prefers holidayUsers document; uses that user's property lookups when present */
export function computeHolidaySeraStageFromHolidayUser(
  doc: HolidayUserLike,
  holidayVsids: VsIdRef[] | undefined,
  holidayVsids2: VsIdRef[] | undefined,
): OwnerJourneyStage {
  if (doc.role !== "Owner" || doc.isProfileComplete !== true) return 1;
  let stage: OwnerJourneyStage = 1;
  if (propertyCount(holidayVsids, holidayVsids2) > 0) stage = 2;
  const sub = doc.subscription;
  const hasPlan =
    Boolean(sub?.planId?.trim()) ||
    Boolean(sub?.planName?.trim());
  const st = sub?.status;
  if (hasPlan && st !== undefined && st !== "none") {
    stage = 3;
  }
  if (st === "active" || holidayPaymentIndicatesSuccess(doc.Payment ?? null)) {
    stage = 4;
  }
  return stage;
}

/** HousingSaga from housing user + optional captured payment rows */
export function computeHousingSagaStage(
  housing: HousingUserLike | undefined,
  capturedPayments: HousingPaymentLike[] | undefined,
): OwnerJourneyStage | null {
  if (!housing) return null;
  if (housing.role !== "owner") return null;
  let stage: OwnerJourneyStage = 1;
  if (housing.onboarded === true || (housing.paidListingAddresses?.length ?? 0) > 0) {
    stage = 2;
  }
  if (Boolean(housing.subscriptionPlan?.trim())) {
    stage = 3;
  }
  if (
    housing.paymentStatus === "active" ||
    (capturedPayments?.length ?? 0) > 0
  ) {
    stage = 4;
  }
  return stage;
}

export interface AggregatedUserForJourney {
  role?: string;
  origin?: string;
  email?: string;
  vsids?: VsIdRef[];
  vsids2?: VsIdRef[];
  ownerSubscriptions?: SubscriptionLike[];
  holidayUserMatch?: HolidayUserLike[];
  holidayVsids?: VsIdRef[];
  holidayVsids2?: VsIdRef[];
  housingUserMatch?: HousingUserLike[];
  housingCapturedPayment?: HousingPaymentLike[];
}

/** Owner journey for a `holidayUsers` document + property lookups (HolidaySera guests API). */
export function buildOwnerJourneyHolidayUserOnly(
  doc: HolidayUserLike,
  holidayVsids: VsIdRef[] | undefined,
  holidayVsids2: VsIdRef[] | undefined,
): OwnerJourneyPayload {
  const stage = computeHolidaySeraStageFromHolidayUser(doc, holidayVsids, holidayVsids2);
  return { holidaySera: siteJourney("holidaySera", stage) };
}

export function buildOwnerJourneyPayload(row: AggregatedUserForJourney): OwnerJourneyPayload {
  const out: OwnerJourneyPayload = {};
  const holidayDoc = row.holidayUserMatch?.[0];
  const housingDoc = row.housingUserMatch?.[0];

  if (!isHolidaySeraOrigin(row.origin)) {
    const stage = computeVacationSagaStage(
      row.role,
      row.vsids,
      row.vsids2,
      row.ownerSubscriptions,
    );
    out.vacationSaga = siteJourney("vacationSaga", stage);
  }

  if (isHolidaySeraOrigin(row.origin) || holidayDoc !== undefined) {
    let stage: OwnerJourneyStage;
    if (holidayDoc) {
      stage = computeHolidaySeraStageFromHolidayUser(
        holidayDoc,
        row.holidayVsids,
        row.holidayVsids2,
      );
    } else {
      stage = computeVacationSagaStage(
        row.role,
        row.vsids,
        row.vsids2,
        row.ownerSubscriptions,
      );
    }
    out.holidaySera = siteJourney("holidaySera", stage);
  }

  if (housingDoc) {
    const hStage = computeHousingSagaStage(housingDoc, row.housingCapturedPayment);
    if (hStage !== null) {
      out.housingSaga = siteJourney("housingSaga", hStage);
    }
  }

  return out;
}

export function stripJourneyAggregationFields<T extends Record<string, unknown>>(
  doc: T,
): Omit<
  T,
  | "ownerSubscriptions"
  | "holidayUserMatch"
  | "holidayVsids"
  | "holidayVsids2"
  | "housingUserMatch"
  | "housingCapturedPayment"
> {
  const {
    ownerSubscriptions: _os,
    holidayUserMatch: _hm,
    holidayVsids: _hv,
    holidayVsids2: _hv2,
    housingUserMatch: _hum,
    housingCapturedPayment: _hcp,
    ...rest
  } = doc;
  return rest;
}
