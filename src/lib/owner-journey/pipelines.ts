import type { PipelineStage } from "mongoose";

import HolidayUsers from "@/models/holidayUsers";
import { Payment } from "@/models/housingPayment";
import { HousingUsers } from "@/models/housingUser";
import Subscription from "@/models/holidaySubscription";

/** Collection names for $lookup (aligned with registered Mongoose models). */
export function ownerJourneyCollectionNames(): {
  properties: string;
  listings: string;
  holidayusers: string;
  housingusers: string;
  subscriptions: string;
  payments: string;
} {
  return {
    properties: "properties",
    listings: "listings",
    holidayusers: HolidayUsers.collection.collectionName,
    housingusers: HousingUsers.collection.collectionName,
    subscriptions: Subscription.collection.collectionName,
    payments: Payment.collection.collectionName,
  };
}

/**
 * Appended after the existing vsids/vsids2 lookups in user aggregates.
 * Assumes the root document is a `Users` row with `email` and `_id`.
 */
/** Housing-only: attach captured payments for stats / stage computation. */
/** Property/listing lookups when the aggregation root is a `holidayUsers` document. */
export function holidayUserRootPropertyLookupStages(): PipelineStage[] {
  const c = ownerJourneyCollectionNames();
  return [
    {
      $lookup: {
        from: c.properties,
        let: { uid: { $toString: "$_id" } },
        pipeline: [
          { $match: { $expr: { $eq: ["$userId", "$$uid"] } } },
          { $project: { VSID: 1 } },
        ],
        as: "holidayVsids",
      },
    },
    {
      $lookup: {
        from: c.listings,
        let: { uid: { $toString: "$_id" } },
        pipeline: [
          { $match: { $expr: { $eq: ["$userId", "$$uid"] } } },
          { $project: { VSID: 1 } },
        ],
        as: "holidayVsids2",
      },
    },
  ];
}

export function housingOwnerPaymentLookupStages(): PipelineStage[] {
  const c = ownerJourneyCollectionNames();
  return [
    {
      $lookup: {
        from: c.payments,
        let: { hid: { $toString: "$_id" } },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$userId", "$$hid"] },
                  { $eq: ["$status", "captured"] },
                ],
              },
            },
          },
          { $limit: 1 },
          { $project: { userId: 1, status: 1 } },
        ],
        as: "housingCapturedPayment",
      },
    },
  ];
}

export function ownerJourneyUserLookupStages(): PipelineStage[] {
  const c = ownerJourneyCollectionNames();

  return [
    {
      $lookup: {
        from: c.subscriptions,
        let: { uid: "$_id" },
        pipeline: [
          { $match: { $expr: { $eq: ["$userId", "$$uid"] } } },
          { $sort: { updatedAt: -1, createdAt: -1 } },
          { $limit: 8 },
          {
            $project: {
              planId: 1,
              planName: 1,
              status: 1,
              razorpayPaymentId: 1,
              razorpaySignature: 1,
            },
          },
        ],
        as: "ownerSubscriptions",
      },
    },
    {
      $lookup: {
        from: c.holidayusers,
        let: {
          userEmail: {
            $toLower: { $trim: { input: { $toString: { $ifNull: ["$email", ""] } } } },
          },
        },
        pipeline: [
          {
            $match: {
              $expr: {
                $eq: [
                  { $toLower: { $trim: { input: { $toString: { $ifNull: ["$email", ""] } } } } },
                  "$$userEmail",
                ],
              },
            },
          },
          { $limit: 1 },
          {
            $project: {
              role: 1,
              isProfileComplete: 1,
              subscription: 1,
              Payment: 1,
            },
          },
        ],
        as: "holidayUserMatch",
      },
    },
    {
      $lookup: {
        from: c.properties,
        let: {
          hid: {
            $cond: {
              if: { $gt: [{ $size: { $ifNull: ["$holidayUserMatch", []] } }, 0] },
              then: { $toString: { $arrayElemAt: ["$holidayUserMatch._id", 0] } },
              else: "",
            },
          },
        },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [{ $ne: ["$$hid", ""] }, { $eq: ["$userId", "$$hid"] }],
              },
            },
          },
          { $project: { VSID: 1 } },
        ],
        as: "holidayVsids",
      },
    },
    {
      $lookup: {
        from: c.listings,
        let: {
          hid: {
            $cond: {
              if: { $gt: [{ $size: { $ifNull: ["$holidayUserMatch", []] } }, 0] },
              then: { $toString: { $arrayElemAt: ["$holidayUserMatch._id", 0] } },
              else: "",
            },
          },
        },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [{ $ne: ["$$hid", ""] }, { $eq: ["$userId", "$$hid"] }],
              },
            },
          },
          { $project: { VSID: 1 } },
        ],
        as: "holidayVsids2",
      },
    },
    {
      $lookup: {
        from: c.housingusers,
        let: {
          userEmail: {
            $toLower: { $trim: { input: { $toString: { $ifNull: ["$email", ""] } } } },
          },
        },
        pipeline: [
          {
            $match: {
              $expr: {
                $eq: [
                  { $toLower: { $trim: { input: { $toString: { $ifNull: ["$email", ""] } } } } },
                  "$$userEmail",
                ],
              },
            },
          },
          { $limit: 1 },
          {
            $project: {
              role: 1,
              onboarded: 1,
              subscriptionPlan: 1,
              subscriptionValidTill: 1,
              paymentStatus: 1,
              paidListingAddresses: 1,
            },
          },
        ],
        as: "housingUserMatch",
      },
    },
    {
      $lookup: {
        from: c.payments,
        let: {
          hid: {
            $cond: {
              if: { $gt: [{ $size: { $ifNull: ["$housingUserMatch", []] } }, 0] },
              then: { $toString: { $arrayElemAt: ["$housingUserMatch._id", 0] } },
              else: "",
            },
          },
        },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $ne: ["$$hid", ""] },
                  { $eq: ["$userId", "$$hid"] },
                  { $eq: ["$status", "captured"] },
                ],
              },
            },
          },
          { $limit: 1 },
          { $project: { userId: 1, status: 1 } },
        ],
        as: "housingCapturedPayment",
      },
    },
  ];
}
