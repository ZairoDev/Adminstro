import type { OfferCallbackEntry, OfferDoc } from "./type";

/**
 * On-read backfill: if a lead has no modern `callbacks[]` entries but has a
 * legacy `callBackDate`, synthesize a "Callback 1" entry so the UI can display
 * it without requiring a DB migration.
 *
 * The DB is left untouched — this runs purely in the response serialisation layer.
 */
export function backfillCallbacks(offer: OfferDoc): OfferDoc {
  if (offer.callbacks && offer.callbacks.length > 0) return offer;
  if (!offer.callBackDate) return offer;

  const synthetic: OfferCallbackEntry = {
    callbackNo: 1,
    date: offer.callBackDate,
    time: offer.callBackTime ?? "",
    note: offer.note ?? "",
    createdByName: offer.sentBySnapshot?.name ?? "",
    createdAt: offer.callBackDate,
  };

  return { ...offer, callbacks: [synthetic] };
}

/**
 * Backfill an array of offers (for list API responses).
 */
export function backfillOffersCallbacks(offers: OfferDoc[]): OfferDoc[] {
  return offers.map(backfillCallbacks);
}
