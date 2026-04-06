export type {
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
export type { AggregatedUserForJourney } from "./compute";
export {
  buildOwnerJourneyHolidayUserOnly,
  buildOwnerJourneyPayload,
  computeHolidaySeraStageFromHolidayUser,
  computeHousingSagaStage,
  computeVacationSagaStage,
  isHolidaySeraOrigin,
  normalizeEmail,
  stageLabel,
  stripJourneyAggregationFields,
} from "./compute";

// NOTE: Do not re-export `./pipelines` here. It imports Mongoose models and must only be used
// from server code (API routes). Client components import this barrel; pulling pipelines would
// bundle mongoose into the browser and break hydration.
