export type ShortTermJourneyStepKey =
  | "accountCreated"
  | "propertyRegistered"
  | "profileComplete"
  | "serviceAgreement"
  | "partnerAgreement"
  | "icalConfigured"
  | "liveOnVacationSaga";

export interface ShortTermJourneyStep {
  key: ShortTermJourneyStepKey;
  label: string;
  complete: boolean;
  completedAt?: string | null;
}

export interface ShortTermOwnerReadiness {
  steps: ShortTermJourneyStep[];
  readyToGoLive: boolean;
  missingSteps: string[];
  ownerUserId: string;
  propertyMongoId: string;
  vsid: string;
  isLive: boolean;
}

type UserLike = {
  _id?: unknown;
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  nationality?: string;
  bankDetails?: unknown;
  isProfileComplete?: boolean;
  ownerProfileCompletedAt?: Date | string | null;
};

type PropertyLike = {
  _id?: unknown;
  VSID?: string;
  isLive?: boolean;
  icalLinks?: Map<string, string> | Record<string, string>;
  ownerOnboarding?: {
    serviceAgreementAcceptedAt?: Date | string | null;
    partnerAgreementAcceptedAt?: Date | string | null;
    icalSkippedAt?: Date | string | null;
  };
  listingSource?: string;
};

type SheetRowLike = {
  ownerUserId?: string;
  propertyMongoId?: string;
  advertListingStatus?: string;
  VSID?: string;
};

function hasText(value: unknown): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

export function isShortTermOwnerProfileComplete(
  user: UserLike | null | undefined,
): boolean {
  if (!user?.ownerProfileCompletedAt) return false;
  const d =
    user.ownerProfileCompletedAt instanceof Date
      ? user.ownerProfileCompletedAt
      : new Date(user.ownerProfileCompletedAt);
  return !Number.isNaN(d.getTime());
}

/** Short-term checklist only — requires owner submission on Vacation Saga */
export function isOwnerProfileComplete(user: UserLike | null | undefined): boolean {
  return isShortTermOwnerProfileComplete(user);
}

function hasIcalLinks(property: PropertyLike | null | undefined): boolean {
  if (!property?.icalLinks) return false;
  const links = property.icalLinks;
  if (links instanceof Map) {
    for (const value of links.values()) {
      if (hasText(value)) return true;
    }
    return false;
  }
  return Object.values(links).some((v) => hasText(v));
}

function toIso(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export function computeShortTermOwnerReadiness({
  sheetRow,
  user,
  property,
}: {
  sheetRow: SheetRowLike;
  user: UserLike | null;
  property: PropertyLike | null;
}): ShortTermOwnerReadiness {
  const ownerUserId = String(sheetRow.ownerUserId ?? "").trim();
  const propertyMongoId = String(sheetRow.propertyMongoId ?? "").trim();
  const vsid = String(property?.VSID ?? sheetRow.VSID ?? "").trim();
  const isLive = property?.isLive === true;

  const accountCreated = ownerUserId.length > 0;
  const propertyRegistered =
    propertyMongoId.length > 0 &&
    (sheetRow.advertListingStatus === "listed_draft" ||
      sheetRow.advertListingStatus === "live");
  const profileComplete = isOwnerProfileComplete(user);
  const serviceAgreement = Boolean(
    property?.ownerOnboarding?.serviceAgreementAcceptedAt,
  );
  const partnerAgreement = Boolean(
    property?.ownerOnboarding?.partnerAgreementAcceptedAt,
  );
  const icalConfigured = hasIcalLinks(property);

  const steps: ShortTermJourneyStep[] = [
    { key: "accountCreated", label: "Owner account created", complete: accountCreated },
    {
      key: "propertyRegistered",
      label: "Property registered (draft)",
      complete: propertyRegistered,
    },
    {
      key: "profileComplete",
      label: "Owner confirmed profile on VS",
      complete: profileComplete,
      completedAt: toIso(
        user?.ownerProfileCompletedAt as Date | string | null | undefined,
      ),
    },
    {
      key: "serviceAgreement",
      label: "Service agreement accepted",
      complete: serviceAgreement,
      completedAt: toIso(property?.ownerOnboarding?.serviceAgreementAcceptedAt),
    },
    {
      key: "partnerAgreement",
      label: "Partner agreement accepted",
      complete: partnerAgreement,
      completedAt: toIso(property?.ownerOnboarding?.partnerAgreementAcceptedAt),
    },
    {
      key: "icalConfigured",
      label: "Calendar link added (optional)",
      complete: icalConfigured,
    },
    {
      key: "liveOnVacationSaga",
      label: "Live on Vacation Saga",
      complete: isLive,
    },
  ];

  const missingSteps = steps
    .filter(
      (s) =>
        !s.complete &&
        s.key !== "liveOnVacationSaga" &&
        s.key !== "icalConfigured" &&
        ["profileComplete", "serviceAgreement", "partnerAgreement"].includes(
          s.key,
        ),
    )
    .map((s) => s.label);

  const readyToGoLive =
    accountCreated &&
    propertyRegistered &&
    profileComplete &&
    serviceAgreement &&
    partnerAgreement &&
    !isLive;

  return {
    steps,
    readyToGoLive,
    missingSteps,
    ownerUserId,
    propertyMongoId,
    vsid,
    isLive,
  };
}
