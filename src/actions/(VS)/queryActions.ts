"use server";

import { DateRange } from "react-day-picker";

import Query from "@/models/query";
import { connectDb } from "@/util/db";
import Employees from "@/models/employee";
import { Property } from "@/models/listing";
import axios from "axios";
import { from } from "form-data";
import Visits from "@/models/visit";
import { MonthlyTarget } from "@/models/monthlytarget";
import Bookings from "@/models/booking";
import { unregisteredOwner } from "@/models/unregisteredOwner";
import { RegistrationData } from "@/hooks/(VS)/useWeeksVisit";
import { startOfDay, endOfDay, subDays, subMonths } from "date-fns";
import { Boosters } from "@/models/propertyBooster";
import { PipelineStage } from "mongoose";

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

export const getLeadsByLocation = async ({
  days,
  createdBy,
}: {
  days?: string;
  createdBy?: string;
}) => {
  const filters: Record<string, any> = {};
  if (days) {
    switch (days) {
      case "yesterday":
        filters.createdAt = {
          $gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
        };
        break;
      case "last month":
        const now = new Date();
        const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfLastMonth = new Date(
          now.getFullYear(),
          now.getMonth() - 1,
          1
        );
        filters.createdAt = {
          $gte: startOfLastMonth,
          $lt: startOfThisMonth,
        };
        break;
      case "this month":
        const dt = new Date();
        dt.setDate(1);
        dt.setHours(0, 0, 0, 0);
        filters.createdAt = {
          $gte: dt,
        };
        break;
      case "10 days":
        filters.createdAt = {
          $gte: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        };
        break;
      case "15 days":
        filters.createdAt = {
          $gte: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
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

  if (createdBy && createdBy !== "All") {
    filters.createdBy = createdBy;
  }

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
  return leadsByLocation;
};

export const getAllAgent = async () => {
  const leadsByAgent = await Employees.find(
    {
      role: "LeadGen",
      isActive: true,
    },
    { email: 1, _id: 0 }
  );

  return leadsByAgent.map((emp) => emp.email);
};

export const getLeadsGroupCount = async ({
  days,
  location,
  createdBy,
}: {
  days?: string;
  location?: string;
  createdBy?: string;
}) => {
  const filters: Record<string, any> = {};
  if (days) {
    switch (days) {
      case "yesterday":
        filters.createdAt = {
          $gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
        };
        break;
      case "last month":
        const now = new Date();
        const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfLastMonth = new Date(
          now.getFullYear(),
          now.getMonth() - 1,
          1
        );
        filters.createdAt = {
          $gte: startOfLastMonth,
          $lt: startOfThisMonth,
        };
        break;
      case "this month":
        const dt = new Date();
        dt.setDate(1);
        dt.setHours(0, 0, 0, 0);
        filters.createdAt = {
          $gte: dt,
        };
        break;
      case "10 days":
        filters.createdAt = {
          $gte: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        };
        break;
      case "15 days":
        filters.createdAt = {
          $gte: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
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
  if (createdBy && createdBy !== "All") {
    filters.createdBy = createdBy;
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
  createdBy,
}: {
  days?: string;
  location?: string;
  createdBy?: string;
}) => {
  const filters: Record<string, any> = { leadStatus: "rejected" };
  if (days) {
    switch (days) {
      case "yesterday":
        filters.createdAt = {
          $gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
        };
        break;
      case "last month":
        const now = new Date();
        const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfLastMonth = new Date(
          now.getFullYear(),
          now.getMonth() - 1,
          1
        );
        filters.createdAt = {
          $gte: startOfLastMonth,
          $lt: startOfThisMonth,
        };
        break;
      case "this month":
        const dt = new Date();
        dt.setDate(1);
        dt.setHours(0, 0, 0, 0);
        filters.createdAt = {
          $gte: dt,
        };
        break;
      case "10 days":
        filters.createdAt = {
          $gte: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        };
        break;
      case "15 days":
        filters.createdAt = {
          $gte: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
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
  if (createdBy && createdBy !== "All") {
    filters.createdBy = createdBy;
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
        isActive: employee?.isActive,
      };
    })
  );

  return { dashboardData };
};

export const getLeadGenLeadsCount = async (
  period: "month" | "year" | "30days"
) => {
  let dateFormat: string;
  let matchStage: Record<string, any> = {};

  const now = new Date();

  if (period === "month") {
    dateFormat = "%Y-%m-%d";
    matchStage = {
      createdAt: {
        $gte: new Date(now.getFullYear(), now.getMonth(), 1),
        $lt: new Date(now.getFullYear(), now.getMonth() + 1, 1),
      },
    };
  } else if (period === "year") {
    dateFormat = "%Y-%m";
    matchStage = {
      createdAt: {
        $gte: new Date(now.getFullYear(), 0, 1),
        $lt: new Date(now.getFullYear() + 1, 0, 1),
      },
    };
  } else if (period === "30days") {
    dateFormat = "%Y-%m-%d";
    matchStage = {
      createdAt: {
        $gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
        $lt: now,
      },
    };
  } else {
    throw new Error("Invalid period. Use 'month', 'year', or '30days'");
  }

  const result = await Query.aggregate([
  { $match: matchStage },

  // 🔹 Lookup Employee collection to get active employee name
  {
    $lookup: {
      from: "employees", // collection name
      let: { createdByEmail: "$createdBy" },
      pipeline: [
        {
          $match: {
            $expr: {
              $and: [
                { $eq: ["$email", "$$createdByEmail"] },
                { $eq: ["$isActive", true] }, // ✅ Only active employees
              ],
            },
          },
        },
        {
          $project: {
            name: 1,
            email: 1,
            isActive: 1,
          },
        },
      ],
      as: "employeeInfo",
    },
  },

  // 🔹 Unwind to access employeeInfo directly
  { $unwind: { path: "$employeeInfo", preserveNullAndEmptyArrays: false } }, // 👈 no inactive/nulls now

  // 🔹 Group by employee name and date
  {
    $group: {
      _id: {
        createdBy: "$employeeInfo.name",
        date: { $dateToString: { format: dateFormat, date: "$createdAt" } },
      },
      count: { $sum: 1 },
    },
  },

  // 🔹 Regroup by date to show all employees for that date
  {
    $group: {
      _id: "$_id.date",
      counts: {
        $push: {
          createdBy: { $ifNull: ["$_id.createdBy", "Unknown"] },
          count: "$count",
        },
      },
    },
  },

  // 🔹 Sort and format output
  { $sort: { _id: 1 } },
  {
    $project: {
      date: "$_id",
      counts: 1,
      _id: 0,
    },
  },
]);

  const chartData: Record<string, any>[] = [];

  result.forEach((entry) => {
    const dataPoint: Record<string, any> = { date: entry.date };
    entry.counts.forEach((c: any) => {
      dataPoint[c.createdBy || "Unknown"] = c.count;
    });
    chartData.push(dataPoint);
  });

  // console.log(chartData);
  return { chartData };
};



export const getTodayLeads = async () => {
  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);

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



export const getAverage = async()=>{
  const start = new Date(new Date().setDate(new Date().getDate() - 7));
  const end = new Date();

  // const pipeline1 = [
  //   {
  //     $match: {
  //       createdAt: {
  //         $gte: start,
  //         $lte: end,
  //       },
  //     },
  //   },
  //   {
  //     $group: {
  //       _id: null,
  //       average: { $avg: "$leadQualityByReviewer" },
  //     },
  //   },
  // ];
  const pipeline2 = [
    {
      $group: {
        _id: null,
        totalLeads: { $sum: "$leads" },
      },
    },
  ];
  // const weeklyAverage = await Query.aggregate(pipeline1);                
  // console.log(weeklyAverage);
  const totalTarget = await MonthlyTarget.aggregate(pipeline2);
  // console.log(totalTarget);
  return { totalTarget: totalTarget[0].totalLeads };
}



export const getLocationLeadStats = async () => {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  // UTC safe boundaries
  const startOfToday = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0));
  const endOfToday = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999));

  const startOfYesterday = new Date(Date.UTC(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 0, 0, 0));
  const endOfYesterday = new Date(Date.UTC(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 23, 59, 59, 999));

  const startOfMonth = new Date(Date.UTC(today.getFullYear(), today.getMonth(), 1, 0, 0, 0));
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const daysPassedInMonth = today.getDate(); // current day of the month

  // ----------------------------
  // Queries aggregation (case-insensitive)
  // ----------------------------
  const queryAgg = await Query.aggregate([
    {
      $facet: {
        today: [
          { $match: { createdAt: { $gte: startOfToday, $lte: endOfToday } } },
          {
            $group: {
              _id: { $toLower: "$location" },
              todayCount: { $sum: 1 }
            }
          },
        ],
        yesterday: [
          { $match: { createdAt: { $gte: startOfYesterday, $lte: endOfYesterday } } },
          {
            $group: {
              _id: { $toLower: "$location" },
              yesterdayCount: { $sum: 1 }
            }
          },
        ],
        month: [
          { $match: { createdAt: { $gte: startOfMonth, $lte: endOfToday } } },
          {
            $group: {
              _id: { $toLower: "$location" },
              monthCount: { $sum: 1 }
            }
          },
        ],
      },
    },
  ]);

  // console.log("queryAgg: ", queryAgg);

  // Maps for quick lookup
  const todayMap = Object.fromEntries(queryAgg[0].today.map((d: any) => [d._id, d.todayCount]));
  const yesterdayMap = Object.fromEntries(queryAgg[0].yesterday.map((d: any) => [d._id, d.yesterdayCount]));
  const monthMap = Object.fromEntries(queryAgg[0].month.map((d: any) => [d._id, d.monthCount]));

  // ----------------------------
  // Monthly targets
  // ----------------------------
  const monthlyTargets = await MonthlyTarget.find({}).lean();

  // ----------------------------
  // Merge results
  // ----------------------------
  const visits = monthlyTargets.map(mt => {
    const loc = mt.city.toLowerCase();
    const target = mt.leads;
    const achieved = monthMap[loc] || 0;
    const todayCount = todayMap[loc] || 0;
    const yesterdayCount = yesterdayMap[loc] || 0;
    const dailyRequired = Math.ceil(target / daysInMonth);
    const rate = target > 0 ? Math.round((achieved / target) * 100) : 0;

    // New metrics
    const currentAverage = daysPassedInMonth > 0 ? (achieved / daysPassedInMonth).toFixed(2) : 0;
    const successRate = target > 0 ? ((achieved / target) * 100).toFixed(2) : 0;

    return {
      location: mt.city,
      target,
      achieved,
      today: todayCount,
      yesterday: yesterdayCount,
      dailyrequired: dailyRequired,
      rate,
      currentAverage: Number(currentAverage),
      successRate: Number(successRate),
    };
  });

  // console.log(visits);
  return { visits };
};



export const getLocationVisitStats = async () => {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  // UTC boundaries
  const startOfToday = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0));
  const endOfToday = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999));

  const startOfYesterday = new Date(Date.UTC(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 0, 0, 0));
  const endOfYesterday = new Date(Date.UTC(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 23, 59, 59, 999));

  const startOfMonth = new Date(Date.UTC(today.getFullYear(), today.getMonth(), 1, 0, 0, 0));
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const daysPassedInMonth = today.getDate();

  // ----------------------------
  // Aggregation with correct lookup and grouping by `leadInfo.location`
  // ----------------------------
  const visitAgg = await Visits.aggregate([
    {
      $facet: {
        today: [
          { $match: { createdAt: { $gte: startOfToday, $lte: endOfToday } } },
          {
            $lookup: {
              from: "queries",
              localField: "lead",
              foreignField: "_id",
              as: "leadInfo",
            },
          },
          { $unwind: "$leadInfo" },
          {
            $group: {
              _id: { $toLower: "$leadInfo.location" },
              todayCount: { $sum: 1 },
            },
          },
        ],
        yesterday: [
          { $match: { createdAt: { $gte: startOfYesterday, $lte: endOfYesterday } } },
          {
            $lookup: {
              from: "queries",
              localField: "lead",
              foreignField: "_id",
              as: "leadInfo",
            },
          },
          { $unwind: "$leadInfo" },
          {
            $group: {
              _id: { $toLower: "$leadInfo.location" },
              yesterdayCount: { $sum: 1 },
            },
          },
        ],
        month: [
          { $match: { createdAt: { $gte: startOfMonth, $lte: endOfToday } } },
          {
            $lookup: {
              from: "queries",
              localField: "lead",
              foreignField: "_id",
              as: "leadInfo",
            },
          },
          { $unwind: "$leadInfo" },
          {
            $group: {
              _id: { $toLower: "$leadInfo.location" },
              monthCount: { $sum: 1 },
            },
          },
        ],
      },
    },
  ]);

  // console.log("🔍 visit aggregation result:", JSON.stringify(visitAgg, null, 2));

  // ----------------------------
  // Convert to maps for easy lookup
  // ----------------------------
  const todayMap = Object.fromEntries(visitAgg[0].today.map((d: any) => [d._id, d.todayCount]));
  const yesterdayMap = Object.fromEntries(visitAgg[0].yesterday.map((d: any) => [d._id, d.yesterdayCount]));
  const monthMap = Object.fromEntries(visitAgg[0].month.map((d: any) => [d._id, d.monthCount]));

  // ----------------------------
  // Get monthly targets
  // ----------------------------
  const monthlyTargets = await MonthlyTarget.find({}).lean();

  // ----------------------------
  // Merge and calculate stats
  // ----------------------------
  const visits = monthlyTargets.map((mt) => {
    const loc = mt.city.toLowerCase();
    const target = mt.visits || 0;
    const achieved = monthMap[loc] || 0;
    const todayCount = todayMap[loc] || 0;
    const yesterdayCount = yesterdayMap[loc] || 0;
    const dailyRequired = target > 0 ? Math.ceil(target / daysInMonth) : 0;
    const rate = target > 0 ? Math.round((achieved / target) * 100) : 0;
    const currentAverage = daysPassedInMonth > 0 ? (achieved / daysPassedInMonth).toFixed(2) : 0;
    const successRate = target > 0 ? ((achieved / target) * 100).toFixed(2) : 0;

    return {
      location: mt.city,
      target,
      achieved,
      today: todayCount,
      yesterday: yesterdayCount,
      dailyRequired,
      rate,
      currentAverage: Number(currentAverage),
      successRate: Number(successRate),
    };
  });

  // console.log("📊 Final visits data:", visits);
  return { visits };
};

export const getMonthlyVisitStats = async (monthName?: string) => {
  const today = new Date();

  // 🗓️ Determine month and year
  const monthNames = [
    "january", "february", "march", "april", "may", "june",
    "july", "august", "september", "october", "november", "december"
  ];

  let monthIndex = today.getMonth(); // default current month
  let year = today.getFullYear();

  if (monthName) {
    const idx = monthNames.indexOf(monthName.toLowerCase());
    if (idx !== -1) {
      monthIndex = idx;
      // handle case where month is in future (previous year)
      if (idx > today.getMonth()) {
        year = year - 1;
      }
    }
  }

  // 🕐 Start & end of month (UTC safe)
  const startOfMonth = new Date(Date.UTC(year, monthIndex, 1, 0, 0, 0));
  const endOfMonth = new Date(Date.UTC(year, monthIndex + 1, 0, 23, 59, 59, 999));

  // console.log(`📆 Fetching visits for: ${monthNames[monthIndex]} ${year}`);
  // console.log(`Range: ${startOfMonth.toISOString()} → ${endOfMonth.toISOString()}`);

  // ----------------------------
  // MongoDB aggregation pipeline
  // ----------------------------
  const result = await Visits.aggregate([
    {
      $match: {
        createdAt: { $gte: startOfMonth, $lte: endOfMonth },
      },
    },
    {
      $lookup: {
        from: "queries",
        localField: "lead",
        foreignField: "_id",
        as: "leadInfo",
      },
    },
    { $unwind: "$leadInfo" },
    {
      $group: {
        _id: { $toLower: "$leadInfo.location" },
        visits: { $sum: 1 },
      },
    },
    {
      $project: {
        _id: 0,
        location: { $ifNull: ["$_id", "Unknown"] },
        visits: 1,
      },
    },
    { $sort: { visits: -1 } },
  ]);

  // console.log("📊 Monthly Visit Stats:", result);
  return result;
};



export const getWeeksVisit = async ({ days }: { days?: string }) => {
  const filters: Record<string, any> = {};

  if (days) {
    const now = new Date();

    switch (days.toLowerCase()) {
      case "today": {
        const start = new Date();
        start.setHours(0, 0, 0, 0);

        const end = new Date();
        end.setHours(23, 59, 59, 999);

        filters.createdAt = {
          $gte: start,
          $lte: end,
        };
        break;
      }

      case "yesterday": {
        const start = new Date();
        start.setDate(start.getDate() - 1);
        start.setHours(0, 0, 0, 0);

        const end = new Date();
        end.setDate(end.getDate() - 1);
        end.setHours(23, 59, 59, 999);

        filters.createdAt = {
          $gte: start,
          $lte: end,
        };
        break;
      }

      case "last month": {
        const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfLastMonth = new Date(
          now.getFullYear(),
          now.getMonth() - 1,
          1
        );

        filters.createdAt = {
          $gte: startOfLastMonth,
          $lt: startOfThisMonth,
        };
        break;
      }

      case "this month": {
        const dt = new Date(now.getFullYear(), now.getMonth(), 1);
        filters.createdAt = {
          $gte: dt,
        };
        break;
      }

      case "10 days": {
        const start = new Date();
        start.setDate(start.getDate() - 10);
        start.setHours(0, 0, 0, 0);

        filters.createdAt = {
          $gte: start,
        };
        break;
      }

      case "15 days": {
        const start = new Date();
        start.setDate(start.getDate() - 15);
        start.setHours(0, 0, 0, 0);

        filters.createdAt = {
          $gte: start,
        };
        break;
      }

      case "1 month": {
        const start = new Date();
        start.setMonth(start.getMonth() - 1);
        start.setHours(0, 0, 0, 0);

        filters.createdAt = {
          $gte: start,
        };
        break;
      }

      case "3 months": {
        const start = new Date();
        start.setMonth(start.getMonth() - 3);
        start.setHours(0, 0, 0, 0);

        filters.createdAt = {
          $gte: start,
        };
        break;
      }

      default:
        break;
    }
  }

  const pipeline = [
    {
      $match: filters,
    },
    {
      $lookup: {
        from: "queries",
        localField: "lead",
        foreignField: "_id",
        as: "leadData",
      },
    },
    { $unwind: "$leadData" },
    {
      $group: {
        _id: "$leadData.location",
        count: { $sum: 1 },
      },
    },
    {
      $sort: {
        count: -1 as const,
      },
    },
  ];

  const visits = await Visits.aggregate(pipeline);
  return { visits };
};

export const getSalesCardDetails = async ({ days }: { days?: string }) => {
  await connectDb();

  const now = new Date();

  // Default: leads created today
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);

  // Yesterday’s range
  const yesterdayStart = new Date(todayStart);
  yesterdayStart.setDate(todayStart.getDate() - 1);

  const yesterdayEnd = new Date(todayEnd);
  yesterdayEnd.setDate(todayEnd.getDate() - 1);

  // If days is provided, adjust the range (e.g., last 7 days)
  let queryRange = { $gte: todayStart, $lte: todayEnd };
  if (days) {
    const pastDate = new Date(now);
    pastDate.setDate(now.getDate() - Number(days));
    queryRange = { $gte: pastDate, $lte: now };
  }

  // Fetch today’s leads (or leads within given range)
  const leadsToday = await Query.find({
    createdAt: queryRange,
  }).lean();

  // Fetch yesterday’s leads
  const leadsYesterday = await Query.find({
    createdAt: { $gte: yesterdayStart, $lte: yesterdayEnd },
  }).lean();

  const todayCount = leadsToday.length;
  const yesterdayCount = leadsYesterday.length;

  // Calculate difference percentage or absolute
  const difference = todayCount - yesterdayCount;
  const percentageChange =
    yesterdayCount === 0
      ? 100
      : ((difference / yesterdayCount) * 100).toFixed(2);

  // ✅ Fix: convert ObjectIds and Dates to plain strings
  const safeLeads = leadsToday.map((lead) => ({
    ...lead,
    _id: lead._id?.toString(),
    createdAt: lead.createdAt?.toISOString?.() ?? null,
    updatedAt: lead.updatedAt?.toISOString?.() ?? null,
  }));

  return {
    todayCount,
    yesterdayCount,
    difference,
    percentageChange: Number(percentageChange),
    leads: safeLeads, // ✅ safe, serializable leads
  };
};


// const formatDate = (date: Date) =>
//   date.toLocaleDateString("en-US", { timeZone: "Asia/Kolkata" });

export const getListingCounts = async ({
  days,
}: {
  days?: string;  
}) => {
  await connectDb();
  const now = new Date();
  let start = new Date();
  let end = new Date();
  let groupFormat: any;

  switch (days?.toLowerCase()) {
    case "12 days":
      start.setDate(now.getDate() - 11); // last 12 days including today
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      groupFormat = {
        $dateToString: { format: "%Y-%m-%d", date: "$createdAt" ,timezone: "Asia/Kolkata", },
      };
      break;

    case "1 year":
      start.setFullYear(now.getFullYear() - 1);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      groupFormat = { $dateToString: { format: "%Y-%m", date: "$createdAt" ,timezone: "Asia/Kolkata",} }; // monthly
      break;

    case "last 3 years":
      start.setFullYear(now.getFullYear() - 3);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      groupFormat = { $dateToString: { format: "%Y", date: "$createdAt" ,timezone: "Asia/Kolkata",} }; // yearly
      break;

    default:
      throw new Error(
        "Invalid period. Use '12 days', '1 year', or 'last 3 years'."
      );
  }

  const result = await Property.aggregate([
   
  { $match: { createdAt: { $gte: start, $lte: end } } },
  {
    $group: {
      _id: { date: groupFormat, type: "$rentalType" },
      count: { $sum: 1 },
    },
  },
  {
    $group: {
      _id: "$_id.date",
      counts: { $push: { type: "$_id.type", count: "$count" } },
      total: { $sum: "$count" },
    },
  },
  { $sort: { _id: 1 } },
]
  );

  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  const resultMap = new Map<string, { shortTerm: number; longTerm: number; total: number }>();

for (const item of result) {
  const shortTerm =
    item.counts.find((c: any) => c.type === "Short Term")?.count || 0;
  const longTerm =
    item.counts.find((c: any) => c.type === "Long Term")?.count || 0;
  resultMap.set(item._id, {
    shortTerm,
    longTerm,
    total: item.total,
  });
}

  

  const output: any[] = [];
if (days === "12 days") {
  const temp = new Date(start);
  while (temp <= end) {
    const key = temp.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }); 

    const item = resultMap.get(key);
    const formattedDate = `${temp.getDate()} ${months[temp.getMonth()]}`;
    output.push({
      date: formattedDate,
      shortTerm: item?.shortTerm ?? 0,
      longTerm: item?.longTerm ?? 0,
      total: item?.total ?? 0,
    });
    temp.setDate(temp.getDate() + 1);
  }
} else if (days === "1 year") {
  for (let i = 0; i < 12; i++) {
    const dateKey = `${start.getFullYear()}-${String(i + 1).padStart(2, "0")}`;
    const item = resultMap.get(dateKey);
    output.push({
      date: months[i],
      shortTerm: item?.shortTerm ?? 0,
      longTerm: item?.longTerm ?? 0,
      total: item?.total ?? 0,
    });
  }
} else if (days === "last 3 years") {
  const currentYear = now.getFullYear();
  for (let i = currentYear - 3 + 1; i <= currentYear; i++) {
    const item = resultMap.get(String(i));
    output.push({
      date: String(i),
      shortTerm: item?.shortTerm ?? 0,
      longTerm: item?.longTerm ?? 0,
      total: item?.total ?? 0,
    });
  }
}
// console.log("here is the output",output);
return output;
};

export const getBookingStats = async ({
  days,
  location,
}: {
  days?: "12 days" | "1 year" | "last 3 years" | "this month";
  location?: string;
}) => {
  await connectDb();
  const now = new Date();
  let start = new Date();
  const end = new Date();
  let groupFormat: any;

  // Determine the grouping format based on days
  switch (days?.toLowerCase()) {
    case "12 days":
      start.setDate(now.getDate() - 11);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      groupFormat = {
        $dateToString: {
          format: "%Y-%m-%d",
          date: "$travellerPayment.history.date",
          timezone: "Asia/Kolkata",
        },
      };
      break;

    case "1 year":
      start.setFullYear(now.getFullYear() - 1);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      groupFormat = {
        $dateToString: {
          format: "%Y-%m",
          date: "$travellerPayment.history.date",
          timezone: "Asia/Kolkata",
        },
      };
      break;

    case "last 3 years":
      start.setFullYear(now.getFullYear() - 3);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      groupFormat = {
        $dateToString: {
          format: "%Y",
          date: "$travellerPayment.history.date",
          timezone: "Asia/Kolkata",
        },
      };
      break;

    case "this month":
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      groupFormat = {
        $dateToString: {
          format: "%Y-%m-%d",
          date: "$travellerPayment.history.date",
          timezone: "Asia/Kolkata",
        },
      };
      break;

    default:
      throw new Error(
        "Invalid period. Use '12 days', '1 year', or 'last 3 years'."
      );
  }

  // Build the aggregation pipeline
  const pipeline: PipelineStage[] = [
    // 1️⃣ Join lead to get location
    {
      $lookup: {
        from: "queries", // collection name of your leads
        localField: "lead",
        foreignField: "_id",
        as: "leadData",
      },
    },
    { $unwind: "$leadData" },

    // 2️⃣ Unwind payment history
    { $unwind: "$travellerPayment.history" },

    // 3️⃣ Match paid payments + date range + optional location
    {
      $match: {
        "travellerPayment.history.status": "paid",
        "travellerPayment.history.date": { $gte: start, $lte: end },
        ...(location ? { "leadData.location": location } : {}),
      },
    },

    // 4️⃣ Group by day/month/year
    {
      $group: {
        _id: groupFormat,
        totalPaid: { $sum: "$travellerPayment.history.amount" },
        count: { $sum: 1 },
      },
    },

    // 5️⃣ Sort by date
    { $sort: { _id: 1 } },
  ];

  const result = await Bookings.aggregate(pipeline as PipelineStage[]);
  return result;
};


export const getBoostCounts = async ({
  days,
}: {
  days?: string;
}) => {
  await connectDb();
  const now = new Date();
  let start = new Date();
  let end = new Date();
  let groupFormat: any;

  switch (days?.toLowerCase()) {
    case "12 days":
      start.setDate(now.getDate() - 11);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      groupFormat = {
        $dateToString: { format: "%Y-%m-%d", date: "$effectiveDate", timezone: "Asia/Kolkata" },
      };
      break;

    case "1 year":
      start.setFullYear(now.getFullYear() - 1);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      groupFormat = { $dateToString: { format: "%Y-%m", date: "$effectiveDate", timezone: "Asia/Kolkata" } };
      break;

    case "last 3 years":
      start.setFullYear(now.getFullYear() - 3);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      groupFormat = { $dateToString: { format: "%Y", date: "$effectiveDate", timezone: "Asia/Kolkata" } };
      break;

    default:
      throw new Error(
        "Invalid period. Use '12 days', '1 year', or 'last 3 years'."
      );
  }

  const result = await Boosters.aggregate([
    {
      $addFields: {
        // Use lastReboostedAt if it exists and reboost is true, otherwise use createdAt
        effectiveDate: {
          $cond: {
            if: { $and: [{ $eq: ["$reboost", true] }, { $ne: ["$lastReboostedAt", null] }] },
            then: "$lastReboostedAt",
            else: "$createdAt"
          }
        },
        // Ensure reboost field exists and defaults to false
        reboost: { $ifNull: ["$reboost", false] }
      }
    },
    { 
      $match: { 
        effectiveDate: { $gte: start, $lte: end } 
      } 
    },
    {
      $group: {
        _id: { date: groupFormat, reboost: "$reboost" },
        count: { $sum: 1 },
      },
    },
    {
      $group: {
        _id: "$_id.date",
        counts: { $push: { reboost: "$_id.reboost", count: "$count" } },
        total: { $sum: "$count" },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  console.log("Aggregation result:", JSON.stringify(result, null, 2));

  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  const resultMap = new Map<string, { newBoosts: number; reboosts: number; total: number }>();

  for (const item of result) {
    const newBoosts =
      item.counts.find((c: any) => c.reboost === false)?.count || 0;
    const reboosts =
      item.counts.find((c: any) => c.reboost === true)?.count || 0;
    
    resultMap.set(item._id, {
      newBoosts,
      reboosts,
      total: newBoosts + reboosts,
    });
  }

  const output: any[] = [];
  
  if (days === "12 days") {
    const temp = new Date(start);
    while (temp <= end) {
      const key = temp.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

      const item = resultMap.get(key);
      const formattedDate = `${temp.getDate()} ${months[temp.getMonth()]}`;
      output.push({
        date: formattedDate,
        newBoosts: item?.newBoosts ?? 0,
        reboosts: item?.reboosts ?? 0,
        total: (item?.newBoosts ?? 0) + (item?.reboosts ?? 0),
      });
      temp.setDate(temp.getDate() + 1);
    }
  } else if (days === "1 year") {
    for (let i = 0; i < 12; i++) {
      const dateKey = `${start.getFullYear()}-${String(i + 1).padStart(2, "0")}`;
      const item = resultMap.get(dateKey);
      output.push({
        date: months[i],
        newBoosts: item?.newBoosts ?? 0,
        reboosts: item?.reboosts ?? 0,
        total: (item?.newBoosts ?? 0) + (item?.reboosts ?? 0),
      });
    }
  } else if (days === "last 3 years") {
    const currentYear = now.getFullYear();
    for (let i = currentYear - 3 + 1; i <= currentYear; i++) {
      const item = resultMap.get(String(i));
      output.push({
        date: String(i),
        newBoosts: item?.newBoosts ?? 0,
        reboosts: item?.reboosts ?? 0,
        total: (item?.newBoosts ?? 0) + (item?.reboosts ?? 0),
      });
    }
  }
  
  console.log("output from the getBoost", output);
  return output;
};

export const getUnregisteredOwnerCounts = async ({
  days,
}: {
  days?: string;
}) => {
  await connectDb();
  const now = new Date();
  let start = new Date();
  let end = new Date();
  let groupFormat: any;

  switch (days?.toLowerCase()) {
    case "12 days":
      start.setDate(now.getDate() - 11); // last 12 days including today
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      groupFormat = {
        $dateToString: {
          format: "%Y-%m-%d",
          date: "$createdAt",
          timezone: "Asia/Kolkata",
        },
      };
      break;

    case "1 year":
      start.setFullYear(now.getFullYear() - 1);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      groupFormat = {
        $dateToString: {
          format: "%Y-%m",
          date: "$createdAt",
          timezone: "Asia/Kolkata",
        },
      };
      break;

    case "last 3 years":
      start.setFullYear(now.getFullYear() - 3);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      groupFormat = {
        $dateToString: {
          format: "%Y",
          date: "$createdAt",
          timezone: "Asia/Kolkata",
        },
      };
      break;

    default:
      throw new Error(
        "Invalid period. Use '12 days', '1 year', or 'last 3 years'."
      );
  }

  // ---------- AGGREGATION PIPELINE ----------
  const result = await unregisteredOwner.aggregate([
    { $match: { createdAt: { $gte: start, $lte: end } } },
    {
      $group: {
        _id: groupFormat,
        owners: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  // ---------- FORMAT OUTPUT ----------
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];

  const resultMap = new Map<string, number>();
  for (const item of result) {
    resultMap.set(item._id, item.owners);
  }

  const output: { date: string; owners: number }[] = [];

  if (days === "12 days") {
    const temp = new Date(start);
    while (temp <= end) {
      const key = temp.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
      const owners = resultMap.get(key) ?? 0;
      const formattedDate = `${temp.getDate()} ${months[temp.getMonth()]}`;
      output.push({ date: formattedDate, owners });
      temp.setDate(temp.getDate() + 1);
    }
  } else if (days === "1 year") {
    for (let i = 0; i < 12; i++) {
      const dateKey = `${start.getFullYear()}-${String(i + 1).padStart(2, "0")}`;
      const owners = resultMap.get(dateKey) ?? 0;
      output.push({ date: months[i], owners });
    }
  } else if (days === "last 3 years") {
    const currentYear = now.getFullYear();
    for (let i = currentYear - 3 + 1; i <= currentYear; i++) {
      const owners = resultMap.get(String(i)) ?? 0;
      output.push({ date: String(i), owners });
    }
  }

  console.log("Unregistered Owner Counts Output:", output);
  return output;
};


export const getVisitsToday = async({days}:{days?:string})=>{
   const now = new Date();
  let start = new Date();
  let end = new Date();
  if(days){
    

  switch (days.toLowerCase()) {
    case "today":
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;

    case "tomorrow":
      start.setDate(start.getDate() + 1);
      end.setDate(end.getDate() + 1);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;

    case "yesterday":
      start.setDate(start.getDate() - 1);
      end.setDate(end.getDate() - 1);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;

    case "last month":
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      break;

    case "this month":
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      break;

    case "10 days":
      start.setDate(now.getDate() - 9); // last 10 days including today
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;

    case "15 days":
      start.setDate(now.getDate() - 14); // last 15 days
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;

    case "1 month":
      start.setMonth(now.getMonth() - 1);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;

    case "3 months":
      start.setMonth(now.getMonth() - 3);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;

    default:
      // If no filter, return all time
      start = new Date(0); // Epoch start
      end = new Date();    // Now
      break;
  }

  }
  // console.log("date: ", start, end);
  const pipeline = [
    {
      $match: {
        "schedule.date": { $gte: start, $lte: end },
        // "schedule.visitStatus": "scheduled",
      },
    },
    {
      $lookup: {
        from: "queries",
        localField: "lead",
        foreignField: "_id",
        as: "leadData",
      },
    },
    { $unwind: "$leadData" },
    {
      $group: {
        _id: "$leadData.location",
        count: { $sum: 1 },
      },
    },{
      $sort:{
        count:-1 as const
      }
    }
  ];
  const count = await Visits.aggregate(pipeline);
  return { count };
}
export const getPropertyCount = async () => {
  const pipeline = [
  {
    $group: {
      _id: { country: "$country", rentalType: "$rentalType" },
      count: { $sum: 1 },
    },
  },
  {
    $group: {
      _id: "$_id.country",
      counts: {
        $push: {
          k: { $ifNull: ["$_id.rentalType", "Unknown"] },
          v: "$count",
        },
      },
    },
  },
  {
    $addFields: { counts: { $arrayToObject: "$counts" } },
  },
  {
    $addFields: {
      "Short Term": { $ifNull: ["$counts.Short Term", 0] },
      "Long Term": { $ifNull: ["$counts.Long Term", 0] },
    },
  },
  {
    $addFields: { total: { $add: ["$Short Term", "$Long Term"] } },
  },
  {
    $project: {
      _id: 0,
      country: "$_id",
      "Short Term": 1,
      "Long Term": 1,
      total: 1,
    },
  },
  {
    $sort: { total: -1 as const},
  },
  {
    $limit: 5,
  },
];


  const propertyCount = await Property.aggregate(pipeline);

  const totalPropertyCount = await Property.countDocuments({});

  return { propertyCount, totalPropertyCount };
};

export const getReviews = async({days,location,createdBy}:{days?:string;location?:string;createdBy?:string})=>{
  const filters: Record<string, any> = {};
  if(days && days !== "All"){
    switch (days){
      case "yesterday":
        filters.createdAt = {
          $gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
        };
        break;
      case "last month":
        const now = new Date();
        const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfLastMonth = new Date(
          now.getFullYear(),
          now.getMonth() - 1,
          1
        );
        filters.createdAt = {
          $gte: startOfLastMonth,
          $lt: startOfThisMonth,
        };
        break;
      case "this month":
        const dt = new Date();
        dt.setDate(1);
        dt.setHours(0, 0, 0, 0);
        filters.createdAt = {
          $gte: dt,
        };
        break;
      case "10 days":
        filters.createdAt = {
          $gte: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        };
        break;
      case "15 days":
        filters.createdAt = {
          $gte: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
        };
        break;
      case "1 month":
        filters.createdAt = {
          $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    }
  }
}
  if(location){
    filters.location = location
  }
  if(createdBy){
    filters.createdBy = createdBy
  }

  const pipeline = [
    {
      $match: filters,
    },
    {
      $group: {
        _id: "$leadQualityByReviewer",
        count: { $sum: 1 },
      },
    },
  ];

  const reviews = await Query.aggregate(pipeline);
  return {reviews}
}

export const getUnregisteredOwners = async () => {
  
  const pipeline = [
    {
      $match: {
        VSID: "",
        propertyId: "",
        ownerPhone: { $exists: true },
      },
    },
    {
      $group: {
        _id: "$ownerPhone",
        ownerName: { $first: "$ownerName" }, 
      },
    },
    {
      $lookup: {
        from: "owners",
        localField: "_id",
        foreignField: "phoneNumber",
        as: "result",
      },
    },
    {
      $match: {
        result: { $eq: [] }, 
      },
    },
    {
      $project: {
        _id: 0,
        ownerPhone: "$_id",
        ownerName: 1,
      },
    },
  ];

  const pipeline2 = [
    {
      $match: {
        link: { $in: [null, ""] },
        $or: [{ imageUrls: { $exists: false } }, { imageUrls: { $size: 0 } }],
      },
    },
    {
      $project: {
        _id: 0,
        ownerPhone: "$phoneNumber",
        ownerName: "$name", 
      },
    },
  ];

  const unregisteredOwners1 = await Visits.aggregate(pipeline);
  const unregisteredOwners2 = await unregisteredOwner.aggregate(pipeline2);
  const unregisteredOwners = [...unregisteredOwners1, ...unregisteredOwners2];
  return { unregisteredOwners };
}

export const OwnersCount = async (): Promise<RegistrationData> => {
  const pipeline = [
    {
      $addFields: {
        isRegistered: {
          $or: [
            { $and: [{ $ifNull: ["$link", false] }, { $ne: ["$link", ""] }] },
            { $and: [{ $ifNull: ["$VSID", false] }, { $ne: ["$VSID", ""] }] },
          ],
        },
        hasReference: {
          $and: [
            { $ifNull: ["$referenceLink", false] },
            { $ne: ["$referenceLink", ""] },
          ],
        },
        hasImages: {
          $gt: [{ $size: { $ifNull: ["$imageUrls", []] } }, 0],
        },
      },
    },
    {
      $facet: {
        byCity: [
          {
            $group: {
              _id: "$location",
              registeredCount: { $sum: { $cond: ["$isRegistered", 1, 0] } },
              unregisteredCount: { $sum: { $cond: ["$isRegistered", 0, 1] } },

              // unregistered with only referenceLink
              unregisteredWithReferenceLink: {
                $sum: {
                  $cond: [
                    {
                      $and: [
                        { $eq: ["$isRegistered", false] },
                        "$hasReference",
                        { $not: ["$hasImages"] },
                      ],
                    },
                    1,
                    0,
                  ],
                },
              },

              // unregistered with only images
              unregisteredWithImages: {
                $sum: {
                  $cond: [
                    {
                      $and: [
                        { $eq: ["$isRegistered", false] },
                        "$hasImages",
                        { $not: ["$hasReference"] },
                      ],
                    },
                    1,
                    0,
                  ],
                },
              },

              // unregistered with both
              unregisteredWithBoth: {
                $sum: {
                  $cond: [
                    {
                      $and: [
                        { $eq: ["$isRegistered", false] },
                        "$hasReference",
                        "$hasImages",
                      ],
                    },
                    1,
                    0,
                  ],
                },
              },
            },
          },
          {
            $project: {
              city: "$_id",
              registeredCount: 1,
              unregisteredCount: 1,
              unregisteredWithReferenceLink: 1,
              unregisteredWithImages: 1,
              unregisteredWithBoth: 1,
              _id: 0,
            },
          },
        ],
        totals: [
          {
            $group: {
              _id: null,
              totalRegistered: { $sum: { $cond: ["$isRegistered", 1, 0] } },
              totalUnregistered: { $sum: { $cond: ["$isRegistered", 0, 1] } },

              totalUnregisteredWithReferenceLink: {
                $sum: {
                  $cond: [
                    {
                      $and: [
                        { $eq: ["$isRegistered", false] },
                        "$hasReference",
                        { $not: ["$hasImages"] },
                      ],
                    },
                    1,
                    0,
                  ],
                },
              },
              totalUnregisteredWithImages: {
                $sum: {
                  $cond: [
                    {
                      $and: [
                        { $eq: ["$isRegistered", false] },
                        "$hasImages",
                        { $not: ["$hasReference"] },
                      ],
                    },
                    1,
                    0,
                  ],
                },
              },
              totalUnregisteredWithBoth: {
                $sum: {
                  $cond: [
                    {
                      $and: [
                        { $eq: ["$isRegistered", false] },
                        "$hasReference",
                        "$hasImages",
                      ],
                    },
                    1,
                    0,
                  ],
                },
              },
            },
          },
          {
            $project: {
              _id: 0,
              totalRegistered: 1,
              totalUnregistered: 1,
              totalUnregisteredWithReferenceLink: 1,
              totalUnregisteredWithImages: 1,
              totalUnregisteredWithBoth: 1,
            },
          },
        ],
      },
    },
  ];

  const res = await unregisteredOwner.aggregate(pipeline).exec();

  return (
    res[0]
  );
};

export const getNewOwnersCount = async ({
  days,
  location,
}: {
  days?: string;
  location?: string;
}) => {
  const dateFilter: Record<string, any> = {};
  if (days && days !== "All") {
    let fromDate: Date | undefined;
    let toDate: Date = new Date();

    
  switch (days.toLowerCase()) {
    case "today":
      fromDate = new Date();
      fromDate.setHours(0, 0, 0, 0); 
      toDate = new Date();
      toDate.setHours(23, 59, 59, 999); 
      break;

    case "15 days":
      fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - 15);
      break;

    case "1 month":
      fromDate = new Date();
      fromDate.setMonth(fromDate.getMonth() - 1);
      break;

    case "3 months":
      fromDate = new Date();
      fromDate.setMonth(fromDate.getMonth() - 3);
      break;
  }

  if (fromDate) {
    dateFilter.createdAt = { $gte: fromDate, $lte: toDate };
  }

  }

  
  const cityFilter = location && location !== "All" ? { location: location } : {};
  const pipeline2 = [
    {
      $match: {
        ...dateFilter,
        ...cityFilter,
      },
    },
    {
      $project: {
        _id: 0,
        ownerPhone: "$phoneNumber",
        ownerName: "$name",
        location: 1,
        createdAt: 1,
      },
    },
  ];

  const newOwnersCount = await unregisteredOwner.aggregate(pipeline2);
  return { newOwnersCount: newOwnersCount }; 
};


export const getGoodVisitsCount = async({days}:{days?:string})=>{
  const filters: Record<string, any> = {};
  if (days) {
    const now = new Date();

    switch (days.toLowerCase()) {
      case "today": {
        const start = new Date();
        start.setHours(0, 0, 0, 0);

        const end = new Date();
        end.setHours(23, 59, 59, 999);

        filters.createdAt = {
          $gte: start,
          $lte: end,
        };
        break;
      }

      case "yesterday": {
        const start = new Date();
        start.setDate(start.getDate() - 1);
        start.setHours(0, 0, 0, 0);

        const end = new Date();
        end.setDate(end.getDate() - 1);
        end.setHours(23, 59, 59, 999);

        filters.createdAt = {
          $gte: start,
          $lte: end,
        };
        break;
      }

      case "last month": {
        const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfLastMonth = new Date(
          now.getFullYear(),
          now.getMonth() - 1,
          1
        );

        filters.createdAt = {
          $gte: startOfLastMonth,
          $lt: startOfThisMonth,
        };
        break;
      }

      case "this month": {
        const dt = new Date(now.getFullYear(), now.getMonth(), 1);
        filters.createdAt = {
          $gte: dt,
        };
        break;
      }

      case "10 days": {
        const start = new Date();
        start.setDate(start.getDate() - 10);
        start.setHours(0, 0, 0, 0);

        filters.createdAt = {
          $gte: start,
        };
        break;
      }

      case "15 days": {
        const start = new Date();
        start.setDate(start.getDate() - 15);
        start.setHours(0, 0, 0, 0);

        filters.createdAt = {
          $gte: start,
        };
        break;
      }

      case "1 month": {
        const start = new Date();
        start.setMonth(start.getMonth() - 1);
        start.setHours(0, 0, 0, 0);

        filters.createdAt = {
          $gte: start,
        };
        break;
      }

      case "3 months": {
        const start = new Date();
        start.setMonth(start.getMonth() - 3);
        start.setHours(0, 0, 0, 0);

        filters.createdAt = {
          $gte: start,
        };
        break;
      }

      default:
        break;
    }
  }
  filters.leadStatus = "active";
  const pipeline = [
  {
    $match: filters
  },
  {
    $group: {
      _id: {
        leadStatus: "$leadStatus",
        propertyShown: "$propertyShown"
      },
      count: { $sum: 1 }
    }
  },
  {
    $project: {
      _id: 0,
      propertyShown: "$_id.propertyShown",
      count: 1
    }
  }
];

const count = await Query.aggregate(pipeline);
return { count };
}

export const getCountryWisePropertyCount = async ({
  country,
}: {
  country: string;
}) => {
  const pipeline = [
  // Step 1: filter by country
  {
    $match: { country: country }
  },
  // Step 2: group by city and rentalType
  {
    $group: {
      _id: { city: "$city", rentalType: "$rentalType" },
      count: { $sum: 1 }
    }
  },
  // Step 3: group by city, pushing rentalType counts
  {
    $group: {
      _id: "$_id.city",
      counts: {
        $push: {
          k: { $ifNull: ["$_id.rentalType", "Unknown"] },
          v: "$count"
        }
      }
    }
  },
  // Step 4: convert counts array to object
  {
    $addFields: { counts: { $arrayToObject: "$counts" } }
  },
  // Step 5: ensure Short Term and Long Term exist
  {
    $addFields: {
      "Short Term": { $ifNull: ["$counts.Short Term", 0] },
      "Long Term": { $ifNull: ["$counts.Long Term", 0] }
    }
  },
  // Step 6: total per city
  {
    $addFields: { total: { $add: ["$Short Term", "$Long Term"] } }
  },
  // Step 7: project final fields
  {
    $project: {
      _id: 0,
      city: "$_id",
      "Short Term": 1,
      "Long Term": 1,
      total: 1
    }
  },
  // Step 8: sort by total descending
  {
    $sort: { total: -1 as const }
  },
  // Step 9: limit top 5 cities
  {
    $limit: 5
  }
];

  const countryWisePropertyCount = await Property.aggregate(pipeline);
  const totalPropertyCount = await Property.countDocuments({
    country: country,
  });

  return { countryWisePropertyCount, totalPropertyCount };
};

export const getAmountDetails = async ({
  days,
  location,
  createdBy,
}: {
  days?: string;
  location?: string;
  createdBy?: string;
}) => {
  const filters: Record<string, any> = {};
  if (days && days !== "All") {
    switch (days.toLowerCase()) {
      case "today": {
        const start = new Date();
        start.setHours(0, 0, 0, 0);

        const end = new Date();
        end.setHours(23, 59, 59, 999);

        filters.createdAt = {
          $gte: start,
          $lte: end,
        };
        break;
      }
      case "yesterday":
        filters.createdAt = {
          $gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
        };
        break;
      case "last month":
        const now = new Date();
        const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfLastMonth = new Date(
          now.getFullYear(),
          now.getMonth() - 1,
          1
        );
        filters.createdAt = {
          $gte: startOfLastMonth,
          $lt: startOfThisMonth,
        };
        break;
      case "this month":
        const dt = new Date();
        dt.setDate(1);
        dt.setHours(0, 0, 0, 0);
        filters.createdAt = {
          $gte: dt,
        };
        break;
      case "10 days":
        filters.createdAt = {
          $gte: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        };
        break;
      case "15 days":
        filters.createdAt = {
          $gte: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
        };
        break;
      case "1 month":
        filters.createdAt = {
          $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        };
    }
  }
  if (location) {
    filters.location = location;
  }
  if (createdBy) {
    filters.createdBy = createdBy;
  }
  const pipeline = [
    {
      $match: filters,
    },
    {
      $lookup: {
        from: "visits",
        localField: "visit",
        foreignField: "_id",
        as: "visitDetails",
      },
    },
    {
      $unwind: {
        path: "$visitDetails",
        preserveNullAndEmptyArrays: true, 
      },
    },
    {
      $group: {
        _id: null,
        totalAmount: { $sum: "$finalAmount" },
        ownerAmount: { $sum: "$ownerPayment.finalAmount" },
        totalOwnerReceived: { $sum: "$ownerPayment.amountRecieved" },
        travellerAmount: { $sum: "$travellerPayment.finalAmount" },
        totalTravellerReceived: { $sum: "$travellerPayment.amountRecieved" },
        totalAgentCommission: { $sum: "$visitDetails.agentCommission" },
        totalDocumentationCommission: {
          $sum: "$visitDetails.documentationCharges",
        },
      },
    },
  ];
  

  const amountDetails = await Bookings.aggregate(pipeline);
  return { amountDetails };
};
