"use server";

import Query from "@/models/query";
import { connectDb } from "@/util/db";
import { DateRange } from "react-day-picker";

connectDb();

export const getGroupedLeads = async ({ date }: { date: DateRange | undefined }) => {
  const filters = date ? { createdAt: { $gte: date.from, $lte: date.to } } : {};

  const leadsByAgent = await Query.aggregate([
    {
      $match: filters,
    },
    {
      $group: {
        _id: "$createdBy",
        count: { $sum: 1 },
      },
    },
  ]);

  const leadsByLocation = await Query.aggregate([
    {
      $match: filters,
    },
    {
      $group: {
        _id: "$location",
        count: { $sum: 1 },
      },
    },
  ]);

  return {
    leadsByAgent,
    leadsByLocation,
  };
};

export const getGroupedLeadsByAgents = async ({
  location,
  date,
}: {
  location: string;
  date: DateRange | undefined;
}) => {
  let filters: Record<string, any> = {};
  if (date) {
    filters.createdAt = { $gte: date.from, $lte: date.to };
  }
  if (location) {
    filters.location = location;
  }

  const leadsByLocation = await Query.aggregate(
    [
      {
        $match: filters,
      },
      {
        $group: {
          _id: "$createdBy",
          count: { $sum: 1 },
        },
      },
    ],
    { lean: true }
  );

  return leadsByLocation;
};

export const getGroupedLeadsByLocation = async ({
  agentEmail,
  date,
}: {
  agentEmail: string;
  date: DateRange | undefined;
}) => {
  let filters: Record<string, any> = {};

  if (date) {
    filters.createdAt = { $gte: date.from, $lte: date.to };
  }
  if (agentEmail) {
    filters.createdBy = agentEmail;
  }

  const leadsByAgent = await Query.aggregate(
    [
      {
        $match: filters,
      },
      {
        $group: {
          _id: "$location",
          count: { $sum: 1 },
        },
      },
    ],
    { lean: true }
  );

  return leadsByAgent;
};

export const getLeadsByAgent = async (
  agentEmail: string,
  location: string,
  date: DateRange | undefined,
  page: number
) => {
  let filters: Record<string, any> = {};
  if (date) {
    filters.createdAt = { $gte: date.from, $lte: date.to };
  }
  if (location) {
    filters.location = location;
  }
  if (agentEmail) {
    filters.createdBy = agentEmail;
  }
  const leads = await Query.aggregate(
    [
      {
        $match: filters,
      },
      {
        $skip: (page - 1) * 10,
      },
      {
        $limit: 10,
      },
    ],
    { lean: true }
  );

  const totalLeads = await Query.countDocuments(filters);

  // Serialize the MongoDB documents to plain objects
  const serializedLeads = leads.map((doc) => ({
    ...doc,
    _id: doc._id.toString(), // Convert ObjectId to string
    createdAt: doc.createdAt?.toISOString(), // Convert Date to ISO string
    updatedAt: doc.updatedAt?.toISOString(), // Convert Date to ISO string
    roomDetails: doc.roomDetails ? JSON.parse(JSON.stringify(doc.roomDetails)) : null,
  }));

  return { serializedLeads, totalLeads };
};

export const getDashboardData = async () => {
  const tempData = await Query.aggregate([
    {
      $group: {
        _id: "$createdBy",
        totalLeads: { $sum: 1 },
        byQuality: {
          $push: "$leadQualityByReviewer",
        },
        athensCount: {
          $sum: {
            $cond: [{ $eq: ["$location", "athens"] }, 1, 0],
          },
        },
        chaniaCount: {
          $sum: {
            $cond: [{ $eq: ["$location", "chania"] }, 1, 0],
          },
        },
      },
    },
  ]);
  console.log("temp Data: ", tempData);

  const dashboardData = await Query.aggregate([
    {
      $group: {
        _id: "$createdBy",
        totalLeads: { $sum: 1 },
        byQuality: {
          // $push: "$leadQualityByReviewer",
          $push: {
            $cond: [
              { $ne: ["$leadQualityByReviewer", null] },
              "$leadQualityByReviewer",
              "$$REMOVE",
            ],
          },
        },
        athensCount: {
          $sum: {
            $cond: [{ $eq: ["$location", "athens"] }, 1, 0],
          },
        },
        chaniaCount: {
          $sum: {
            $cond: [{ $eq: ["$location", "chania"] }, 1, 0],
          },
        },
      },
    },
    {
      $project: {
        employee: "$_id",
        totalLeads: 1,
        leadQualityCounts: {
          $arrayToObject: {
            $map: {
              input: { $setUnion: ["$byQuality"] },
              as: "quality",
              in: {
                k: "$$quality",
                v: {
                  $size: {
                    $filter: {
                      input: "$byQuality",
                      as: "q",
                      cond: { $eq: ["$$q", "$$quality"] },
                    },
                  },
                },
              },
            },
          },
        },
        athensCount: 1,
        chaniaCount: 1,
      },
    },
  ]);

  return { dashboardData };
};
