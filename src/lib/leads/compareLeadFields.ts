/**
 * Fields required by Compare Leads monthly-stats (compareTable.tsx).
 */
export const COMPARE_LEAD_LIST_PROJECTION = {
  _id: 1,
  name: 1,
  phoneNo: 1,
  location: 1,
  leadQualityByCreator: 1,
  leadQualityByReviewer: 1,
  leadStatus: 1,
  reason: 1,
  salesPriority: 1,
  createdBy: 1,
  createdAt: 1,
} as const;

/**
 * Fields rendered in Compare Leads daily / month-to-date report rows.
 * Same as monthly list fields — no WA batch or full document payload.
 */
export const COMPARE_DAILY_PROJECTION = {
  ...COMPARE_LEAD_LIST_PROJECTION,
} as const;

export type CompareDailyProjectionKey = keyof typeof COMPARE_DAILY_PROJECTION;
