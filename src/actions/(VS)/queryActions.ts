"use server";

import { DateRange } from "react-day-picker";

import Query from "@/models/query";
import { connectDb } from "@/util/db";
import Employees from "@/models/employee";
import { Property } from "@/models/listing";

connectDb();

export const getGroupedLeads = async ({
  date,
}: {
  date: DateRange | undefined;
}) => {
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

export const getLeadsGroupCount = async ({
  days,
  location,
}: {
  days?: string;
  location?: string;
}) => {
  const filters: Record<string, any> = {};
  if (days) {
    switch (days) {
      case "10 days":
        filters.createdAt = {
          $gte: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        };
        break;
      case "1 month":
        filters.createdAt = {
          $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        };
        break;
      case "3 months":
        filters.createdAt = {
          $gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
        };
        break;
    }
  }

  if (location && location !== "All") {
    filters.location = new RegExp(location, "i");
  }

  const pipeline = [
    {
      $match: filters,
    },
    {
      $group: {
        _id: "$leadStatus",
        count: { $sum: 1 },
      },
    },
  ];

  const tempLeadsGroupCount = await Query.aggregate(pipeline);
  const leadsGroupCount = tempLeadsGroupCount.map((item) => ({
    label: item._id as string,
    count: item.count,
  }));

  return {
    leadsGroupCount,
  };
};

export const getRejectedLeadGroup = async ({
  days,
  location,
}: {
  days?: string;
  location?: string;
}) => {
  const filters: Record<string, any> = { leadStatus: "rejected" };
  if (days) {
    switch (days) {
      case "10 days":
        filters.createdAt = {
          $gte: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        };
        break;
      case "1 month":
        filters.createdAt = {
          $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        };
        break;
      case "3 months":
        filters.createdAt = {
          $gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
        };
        break;
    }
  }

  if (location && location !== "All") {
    filters.location = new RegExp(location, "i");
  }

  const pipeline = [
    {
      $match: filters,
    },
    {
      $group: {
        _id: "$reason",
        count: {
          $sum: 1,
        },
      },
    },
  ];
  const tempRejectedLeadGroup = await Query.aggregate(pipeline);
  const rejectedLeadGroup = tempRejectedLeadGroup.map((item) => ({
    reason: item._id,
    count: item.count,
  }));

  return { rejectedLeadGroup };
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
    roomDetails: doc.roomDetails
      ? JSON.parse(JSON.stringify(doc.roomDetails))
      : null,
  }));

  return { serializedLeads, totalLeads };
};

export const getDashboardData = async ({
  date,
}: {
  date: DateRange | undefined;
}) => {
  const filters = date ? { createdAt: { $gte: date.from, $lte: date.to } } : {};
  const dashboardLeads = await Query.aggregate([
    {
      $match: filters,
    },
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

  const dashboardData = await Promise.all(
    dashboardLeads.map(async (lead) => {
      const employee = await Employees.findOne({ email: lead._id });
      return {
        ...lead,
        employee: employee?.name,
      };
    })
  );

  return { dashboardData };
};

export const getTodayLeads = async () => {
  const today = new Date();
  const startOfDay = new Date(today.setHours(0, 0, 0, 0));
  const endOfDay = new Date(today.setHours(23, 59, 59, 999));

  const pipeline = [
    {
      $match: {
        createdAt: {
          $gte: startOfDay,
          $lte: endOfDay,
        },
      },
    },
    {
      $group: {
        _id: {
          agent: "$createdBy",
          location: "$location",
        },
        count: { $sum: 1 },
      },
    },
    {
      $group: {
        _id: "$_id.agent",
        locations: {
          $push: {
            location: "$_id.location",
            count: "$count",
          },
        },
        total: { $sum: "$count" },
      },
    },
    {
      $project: {
        _id: 0,
        agent: "$_id",
        total: 1,
        locations: 1,
      },
    },
  ];

  const todayLeads = await Query.aggregate(pipeline);

  const leadsByAgentName = await Promise.all(
    todayLeads.map(async (lead) => {
      const employee = await Employees.findOne({ email: lead.agent });
      return {
        ...lead,
        createdBy: employee?.name,
      };
    })
  );

  const totalLeads = todayLeads.reduce((acc, lead) => acc + lead.total, 0);

  return { serializedLeads: leadsByAgentName, totalLeads };
};

export const getPropertyCount = async () => {
  const pipeline = [
    {
      $group: {
        _id: "$country",
        count: { $sum: 1 },
      },
    },
    {
      $sort: {
        count: -1 as const,
      },
    },
    {
      $limit: 5,
    },
  ];

  const propertyCount = await Property.aggregate(pipeline);
  const totalPropertyCount = await Property.countDocuments({});

  return { propertyCount, totalPropertyCount };
};

export const getCountryWisePropertyCount = async ({
  country,
}: {
  country: string;
}) => {
  const pipeline = [
    {
      $match: {
        country: country,
      },
    },
    {
      $group: {
        _id: "$city",
        count: {
          $sum: 1,
        },
      },
    },
    {
      $sort: {
        count: -1 as const,
      },
    },
    {
      $limit: 5,
    },
  ];

  const countryWisePropertyCount = await Property.aggregate(pipeline);
  const totalPropertyCount = await Property.countDocuments({
    country: country,
  });

  return { countryWisePropertyCount, totalPropertyCount };
};
