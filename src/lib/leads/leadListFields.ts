/**
 * Fields rendered in LeadTable / GoodTable list rows (not expanded detail panels).
 */
export const LEAD_LIST_PROJECTION = {
  _id: 1,
  messageStatus: 1,
  reminder: 1,
  salesPriority: 1,
  leadQualityByTeamLead: 1,
  BoostID: 1,
  isViewed: 1,
  priority: 1,
  name: 1,
  bookingTerm: 1,
  typeOfProperty: 1,
  guest: 1,
  noOfBeds: 1,
  maxBudget: 1,
  minBudget: 1,
  propertyType: 1,
  billStatus: 1,
  duration: 1,
  startDate: 1,
  location: 1,
  area: 1,
  zone: 1,
  createdBy: 1,
  leadQualityByReviewer: 1,
  whatsappReplyStatus: 1,
  phoneNo: 1,
  rejectionReason: 1,
  leadStatus: 1,
  roomDetails: 1,
  updatedAt: 1,
  createdAt: 1,
} as const;

/** IST display field appended after projection in list aggregates. */
export const LEAD_LIST_IST_ADD_FIELDS = {
  istCreatedAt: {
    $dateToString: {
      date: { $add: ["$createdAt", 5.5 * 60 * 60 * 1000] },
      format: "%Y-%m-%d %H:%M:%S",
      timezone: "UTC",
    },
  },
} as const;
