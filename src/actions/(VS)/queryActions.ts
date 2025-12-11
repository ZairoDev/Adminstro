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
import WebsiteLeads from "@/models/websiteLeads";

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
        const now2 = new Date();
        const startUTC = new Date(Date.UTC(
          now2.getUTCFullYear(),
          now2.getUTCMonth(),
          1,
          0, 0, 0, 0
        ));
        const endUTC = new Date(Date.UTC(
          now2.getUTCFullYear(),
          now2.getUTCMonth() + 1,
          0,
          23, 59, 59, 999
        ));
        filters.createdAt = {
          $gte: startUTC,
          $lte: endUTC,
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

  const pipeline = [
    {
      $match: filters,
    },
    {
      $group: {
        _id: "$location",
        count: { $sum: 1 },
      },
    },
  ];

  const leadsByLocation = await Query.aggregate(pipeline);
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
        const now2 = new Date();
        const startUTC = new Date(
          Date.UTC(now2.getUTCFullYear(), now2.getUTCMonth(), 1, 0, 0, 0, 0)
        );
        const endUTC = new Date(
          Date.UTC(
            now2.getUTCFullYear(),
            now2.getUTCMonth() + 1,
            0,
            23,
            59,
            59,
            999
          )
        );
        filters.createdAt = {
          $gte: startUTC,
          $lte: endUTC,
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
  const now2 = new Date();
  const startUTC = new Date(Date.UTC(
    now2.getUTCFullYear(),
    now2.getUTCMonth(),
    1,
    0, 0, 0, 0
  ));
  const endUTC = new Date(Date.UTC(
    now2.getUTCFullYear(),
    now2.getUTCMonth() + 1,
    0,
    23, 59, 59, 999
  ));
  filters.createdAt = {
    $gte: startUTC,
    $lte: endUTC,
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

export const getAverage = async () => {
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

  const totalTarget = await MonthlyTarget.aggregate(pipeline2);

  return { totalTarget: totalTarget[0].totalLeads };
};

export const getLocationLeadStats = async (selectedMonth?: Date) => {
  // console.log("selectedMonth RAW:", selectedMonth);

  const reference = selectedMonth ? new Date(selectedMonth) : new Date();
  // console.log("referenceDate:", reference);

  // always use UTC-safe boundaries
  const year = reference.getUTCFullYear();
  const month = reference.getUTCMonth();

  const startOfMonth = new Date(Date.UTC(year, month, 1, 0, 0, 0));
  // console.log("startOfMonth:", startOfMonth);
  const endOfMonth = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999));
  // console.log("endOfMonth:", endOfMonth);

  const today = new Date();
  const todayUTC = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())
  );

  const yesterdayUTC = new Date(todayUTC);
  yesterdayUTC.setUTCDate(todayUTC.getUTCDate() - 1);

  const isCurrentMonth =
    today.getUTCFullYear() === year && today.getUTCMonth() === month;

  const startOfToday = new Date(
    Date.UTC(
      today.getUTCFullYear(),
      today.getUTCMonth(),
      today.getUTCDate(),
      0,
      0,
      0
    )
  );

  const endOfToday = new Date(
    Date.UTC(
      today.getUTCFullYear(),
      today.getUTCMonth(),
      today.getUTCDate(),
      23,
      59,
      59,
      999
    )
  );

  const startOfYesterday = new Date(
    Date.UTC(
      yesterdayUTC.getUTCFullYear(),
      yesterdayUTC.getUTCMonth(),
      yesterdayUTC.getUTCDate(),
      0,
      0,
      0
    )
  );

  const endOfYesterday = new Date(
    Date.UTC(
      yesterdayUTC.getUTCFullYear(),
      yesterdayUTC.getUTCMonth(),
      yesterdayUTC.getUTCDate(),
      23,
      59,
      59,
      999
    )
  );



  const facet: any = {
    month: [
      { $match: { createdAt: { $gte: startOfMonth, $lte: endOfMonth } } },
      {
        $group: {
          _id: { $toLower: "$location" },
          monthCount: { $sum: 1 },
        },
      },
    ],
  };

  if (isCurrentMonth) {
    facet.today = [
      { $match: { createdAt: { $gte: startOfToday, $lte: endOfToday } } },
      {
        $group: {
          _id: { $toLower: "$location" },
          todayCount: { $sum: 1 },
        },
      },
    ];

    facet.yesterday = [
      {
        $match: { createdAt: { $gte: startOfYesterday, $lte: endOfYesterday } },
      },
      {
        $group: {
          _id: { $toLower: "$location" },
          yesterdayCount: { $sum: 1 },
        },
      },
    ];
  }

  const queryAgg = await Query.aggregate([{ $facet: facet }]);

  const monthMap = Object.fromEntries(
    queryAgg[0].month.map((d: any) => [d._id, d.monthCount])
  );

  const todayMap = isCurrentMonth
    ? Object.fromEntries(
        queryAgg[0].today.map((d: any) => [d._id, d.todayCount])
      )
    : {};

  const yesterdayMap = isCurrentMonth
    ? Object.fromEntries(
        queryAgg[0].yesterday.map((d: any) => [d._id, d.yesterdayCount])
      )
    : {};

  const monthlyTargets = await MonthlyTarget.find({}).lean();

  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const dayToday = today.getUTCDate();
  const daysPassed = isCurrentMonth ? dayToday : daysInMonth;

  const visits = monthlyTargets.map((mt) => {
    const loc = mt.city.toLowerCase();
    const target = mt.leads;
    const achieved = monthMap[loc] || 0;

    const dailyRequired = Math.ceil(target / daysInMonth);
    const currentAvg = (achieved / daysPassed).toFixed(2);

    return {
      location: mt.city,
      target,
      achieved,
      today: todayMap[loc] || 0,
      yesterday: yesterdayMap[loc] || 0,
      dailyrequired: dailyRequired,
      currentAverage: Number(currentAvg),
      rate: target > 0 ? Math.round((achieved / target) * 100) : 0,
    };
  });

  return { visits };
};

export const getLocationVisitStats = async (selectedMonth?: Date) => {
  // Use provided month or default to current month
  const referenceDate = selectedMonth || new Date();

  // Create a new date at the start of the selected month
  const monthStart = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    1
  );

  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  // Determine if we're looking at the current month
  const isCurrentMonth =
    referenceDate.getFullYear() === today.getFullYear() &&
    referenceDate.getMonth() === today.getMonth();

  // UTC safe boundaries for the selected month
  const startOfMonth = new Date(
    Date.UTC(referenceDate.getFullYear(), referenceDate.getMonth(), 1, 0, 0, 0)
  );

  // End of month should be either today (if current month) or last day of that month
  const lastDayOfMonth = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth() + 1,
    0
  ).getDate();
  const endOfMonth = isCurrentMonth
    ? new Date(
        Date.UTC(
          today.getFullYear(),
          today.getMonth(),
          today.getDate(),
          23,
          59,
          59,
          999
        )
      )
    : new Date(
        Date.UTC(
          referenceDate.getFullYear(),
          referenceDate.getMonth(),
          lastDayOfMonth,
          23,
          59,
          59,
          999
        )
      );

  // Today boundaries (only relevant for current month)
  const startOfToday = new Date(
    Date.UTC(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0)
  );
  const endOfToday = new Date(
    Date.UTC(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
      23,
      59,
      59,
      999
    )
  );

  // Yesterday boundaries (only relevant for current month)
  const startOfYesterday = new Date(
    Date.UTC(
      yesterday.getFullYear(),
      yesterday.getMonth(),
      yesterday.getDate(),
      0,
      0,
      0
    )
  );
  const endOfYesterday = new Date(
    Date.UTC(
      yesterday.getFullYear(),
      yesterday.getMonth(),
      yesterday.getDate(),
      23,
      59,
      59,
      999
    )
  );

  const daysInMonth = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth() + 1,
    0
  ).getDate();

  // Days passed in the selected month
  const daysPassedInMonth = isCurrentMonth ? today.getDate() : lastDayOfMonth;

  // ----------------------------
  // Aggregation with correct lookup and grouping by `leadInfo.location`
  // ----------------------------
  const facetStages: any = {
    month: [
      { $match: { createdAt: { $gte: startOfMonth, $lte: endOfMonth } } },
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
  };

  // Only add today and yesterday facets if we're viewing the current month
  if (isCurrentMonth) {
    facetStages.today = [
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
    ];

    facetStages.yesterday = [
      {
        $match: { createdAt: { $gte: startOfYesterday, $lte: endOfYesterday } },
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
          yesterdayCount: { $sum: 1 },
        },
      },
    ];
  }

  const visitAgg = await Visits.aggregate([
    {
      $facet: facetStages,
    },
  ]);

  // ----------------------------
  // Convert to maps for easy lookup
  // ----------------------------
  const todayMap =
    isCurrentMonth && visitAgg[0].today
      ? Object.fromEntries(
          visitAgg[0].today.map((d: any) => [d._id, d.todayCount])
        )
      : {};
  const yesterdayMap =
    isCurrentMonth && visitAgg[0].yesterday
      ? Object.fromEntries(
          visitAgg[0].yesterday.map((d: any) => [d._id, d.yesterdayCount])
        )
      : {};
  const monthMap = Object.fromEntries(
    visitAgg[0].month.map((d: any) => [d._id, d.monthCount])
  );

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
    const currentAverage =
      daysPassedInMonth > 0 ? (achieved / daysPassedInMonth).toFixed(2) : "0";
    const successRate =
      target > 0 ? ((achieved / target) * 100).toFixed(2) : "0";

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

  return { visits };
};

export const getMonthlyVisitStats = async (monthName?: string) => {
  const today = new Date();

  // 🗓️ Determine month and year
  const monthNames = [
    "january",
    "february",
    "march",
    "april",
    "may",
    "june",
    "july",
    "august",
    "september",
    "october",
    "november",
    "december",
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
  const endOfMonth = new Date(
    Date.UTC(year, monthIndex + 1, 0, 23, 59, 59, 999)
  );

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

      case "this month":
  const now2 = new Date();
  const startUTC = new Date(Date.UTC(
    now2.getUTCFullYear(),
    now2.getUTCMonth(),
    1,
    0, 0, 0, 0
  ));
  const endUTC = new Date(Date.UTC(
    now2.getUTCFullYear(),
    now2.getUTCMonth() + 1,
    0,
    23, 59, 59, 999
  ));
  filters.createdAt = {
    $gte: startUTC,
    $lte: endUTC,
  };
  break;


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

export const getListingCounts = async ({ days }: { days?: string }) => {
  await connectDb();
  const now = new Date();
  let start = new Date();
  let end = new Date();
  let groupFormat: any;

  switch (days?.toLowerCase()) {
    case "this month":
      start = new Date(now.getFullYear(), now.getMonth(), 1);
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
      }; // monthly
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
      }; // yearly
      break;

    default:
      throw new Error(
        "Invalid period. Use 'this month', '12 days', '1 year', or 'last 3 years'."
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
  ]);

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

  const resultMap = new Map<
    string,
    { shortTerm: number; longTerm: number; total: number }
  >();

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

  if (days === "this month" || days === "12 days") {
    const temp = new Date(start);
    while (temp <= end) {
      const key = temp.toLocaleDateString("en-CA", {
        timeZone: "Asia/Kolkata",
      });
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
      const dateKey = `${start.getFullYear()}-${String(i + 1).padStart(
        2,
        "0"
      )}`;
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

  return output;
};

export const getLocationWeeklyTargets = async ({
  viewMode = "weekly",
  month = new Date().getMonth(),
  year = new Date().getFullYear(),
}: {
  viewMode?: "weekly" | "10-day";
  month?: number;
  year?: number;
}) => {
  await connectDb();

  const monthStart = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
  const monthEnd = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999));

  // ---------------------------------
  // 📊 Fetch ALL Location Targets
  // ---------------------------------
  const monthlyTargets = await MonthlyTarget.find({}).lean();

  if (!monthlyTargets || monthlyTargets.length === 0) {
    return {
      locations: [],
      month: getMonthName(month),
      year,
      viewMode,
    };
  }

  // Create a map for quick target lookup (case-insensitive)
  const targetMap = new Map<string, number>();
  monthlyTargets.forEach((target) => {
    if (target.city) {
      targetMap.set(target.city.toLowerCase(), target.sales || 0);
    }
  });

  // ---------------------------------
  // 🗓️ Generate Periods (Weekly or 10-Day)
  // ---------------------------------
  const periods = generatePeriods(viewMode, monthStart, monthEnd);

  // ---------------------------------
  // 📈 Fetch ALL Bookings Grouped by Location & Period
  // ---------------------------------
  const locationResults: Map<
    string,
    {
      location: string;
      monthlyTarget: number;
      weeks: Array<{
        weekNumber: number;
        weekLabel: string;
        achieved: number;
        startDate: string;
        endDate: string;
      }>;
    }
  > = new Map();

  // Initialize all locations from targets
  monthlyTargets.forEach((target) => {
    if (target.city) {
      locationResults.set(target.city.toLowerCase(), {
        location: target.city,
        monthlyTarget: target.sales || 0,
        weeks: periods.map((period, index) => ({
          weekNumber: index + 1,
          weekLabel: period.periodLabel,
          achieved: 0,
          startDate: period.startDate.toISOString(),
          endDate: period.endDate.toISOString(),
        })),
      });
    }
  });

  // Process each period
  for (let periodIndex = 0; periodIndex < periods.length; periodIndex++) {
    const period = periods[periodIndex];

    const pipeline: PipelineStage[] = [
      // Join with queries to get location
      {
        $lookup: {
          from: "queries",
          localField: "lead",
          foreignField: "_id",
          as: "leadData",
        },
      },
      { $unwind: "$leadData" },

      // Unwind history (preserve empty arrays)
      {
        $unwind: {
          path: "$travellerPayment.history",
          preserveNullAndEmptyArrays: true,
        },
      },

      // Create unified paymentDate field
      {
        $addFields: {
          paymentDate: {
            $cond: {
              if: {
                $eq: [{ $type: "$travellerPayment.history.date" }, "date"],
              },
              then: "$travellerPayment.history.date",
              else: {
                $toDate: {
                  $ifNull: ["$travellerPayment.history.date", "$createdAt"],
                },
              },
            },
          },
          // Determine if this payment is paid
          isPaid: {
            $or: [
              { $eq: ["$travellerPayment.history.status", "paid"] },
              { $eq: ["$travellerPayment.status", "paid"] },
            ],
          },
          // Get the payment amount
          paymentAmount: {
            $cond: [
              { $ifNull: ["$travellerPayment.history.amount", false] },
              "$travellerPayment.history.amount",
              "$travellerPayment.amountReceived",
            ],
          },
        },
      },

      // Filter by date range and paid status
      {
        $match: {
          isPaid: true,
          paymentDate: {
            $gte: period.startDate,
            $lte: period.endDate,
          },
          "leadData.location": { $exists: true, $ne: null },
        },
      },

      // Group by location
      {
        $group: {
          _id: { $toLower: "$leadData.location" }, // Case-insensitive grouping
          originalLocation: { $first: "$leadData.location" }, // Keep original case
          totalPaid: { $sum: "$paymentAmount" },
          count: { $sum: 1 },
        },
      },
    ];

    const results = await Bookings.aggregate(pipeline);

    // Update the location results with achieved amounts
    results.forEach((result) => {
      const locationKey = result._id; // This is already lowercase
      const locationData = locationResults.get(locationKey);

      if (locationData && locationData.weeks[periodIndex]) {
        locationData.weeks[periodIndex].achieved = result.totalPaid || 0;
      } else {
        // Location exists in bookings but not in targets - add it with 0 target
        const existingData = locationResults.get(locationKey);
        if (!existingData) {
          locationResults.set(locationKey, {
            location: result.originalLocation,
            monthlyTarget: 0,
            weeks: periods.map((p, idx) => ({
              weekNumber: idx + 1,
              weekLabel: p.periodLabel,
              achieved: idx === periodIndex ? result.totalPaid || 0 : 0,
              startDate: p.startDate.toISOString(),
              endDate: p.endDate.toISOString(),
            })),
          });
        }
      }
    });

    console.log(
      `📊 Period ${periodIndex + 1} (${period.periodLabel}):`,
      results.map((r) => ({
        location: r.originalLocation,
        achieved: r.totalPaid,
      }))
    );
  }

  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  // Convert Map to Array and sort by location name
  const finalLocations = Array.from(locationResults.values()).sort((a, b) =>
    a.location.localeCompare(b.location)
  );

  return {
    locations: finalLocations,
    month: monthNames[month],
    year,
    viewMode,
  };
};

// ---------------------------------
// 🗓️ Helper: Generate Periods
// ---------------------------------
function generatePeriods(
  viewMode: "weekly" | "10-day",
  monthStart: Date,
  monthEnd: Date
): Array<{ periodLabel: string; startDate: Date; endDate: Date }> {
  const periods: Array<{
    periodLabel: string;
    startDate: Date;
    endDate: Date;
  }> = [];

  if (viewMode === "weekly") {
    let currentDate = new Date(monthStart);
    let weekNumber = 1;

    while (currentDate <= monthEnd) {
      const weekStart = new Date(currentDate);

      // Calculate end of week (6 days later or end of month, whichever is earlier)
      const weekEnd = new Date(currentDate);
      weekEnd.setUTCDate(weekEnd.getUTCDate() + 6);
      weekEnd.setUTCHours(23, 59, 59, 999);

      if (weekEnd > monthEnd) {
        weekEnd.setTime(monthEnd.getTime());
      }

      periods.push({
        periodLabel: `Week ${weekNumber}`,
        startDate: weekStart,
        endDate: weekEnd,
      });

      // Move to next week
      currentDate.setUTCDate(currentDate.getUTCDate() + 7);
      weekNumber++;
    }
  } else {
    // 10-day periods
    const year = monthStart.getUTCFullYear();
    const month = monthStart.getUTCMonth();
    const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();

    // Period 1: Day 1-10
    periods.push({
      periodLabel: "Period 1",
      startDate: new Date(Date.UTC(year, month, 1, 0, 0, 0, 0)),
      endDate: new Date(
        Date.UTC(year, month, Math.min(10, daysInMonth), 23, 59, 59, 999)
      ),
    });

    // Period 2: Day 11-20
    if (daysInMonth >= 11) {
      periods.push({
        periodLabel: "Period 2",
        startDate: new Date(Date.UTC(year, month, 11, 0, 0, 0, 0)),
        endDate: new Date(
          Date.UTC(year, month, Math.min(20, daysInMonth), 23, 59, 59, 999)
        ),
      });
    }

    // Period 3: Day 21-End
    if (daysInMonth >= 21) {
      periods.push({
        periodLabel: "Period 3",
        startDate: new Date(Date.UTC(year, month, 21, 0, 0, 0, 0)),
        endDate: new Date(Date.UTC(year, month, daysInMonth, 23, 59, 59, 999)),
      });
    }
  }

  return periods;
}

// ---------------------------------
// 📅 Helper: Get Month Name
// ---------------------------------
function getMonthName(monthIndex: number): string {
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  return months[monthIndex];
}

// ---------------------------------
// 📊 Get Weekly Target Stats (for single location or all)
// ---------------------------------
export const getWeeklyTargetStats = async ({
  viewMode = "weekly",
  location,
  month = new Date().getMonth(),
  year = new Date().getFullYear(),
}: {
  viewMode?: "weekly" | "10-day";
  location?: string;
  month?: number;
  year?: number;
}) => {
  await connectDb();

  const monthStart = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
  const monthEnd = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999));

  // Fetch target for specific location or aggregate all
  let monthlyTarget = 0;
  let locationName = "All Locations";

  if (location) {
    const target = (await MonthlyTarget.findOne({
      city: location,
    }).lean()) as any;
    monthlyTarget = target?.sales || 0;
    locationName = location;
  } else {
    const allTargets = await MonthlyTarget.find({}).lean();
    monthlyTarget = allTargets.reduce((sum, t) => sum + (t.sales || 0), 0);
  }

  const periods = generatePeriods(viewMode, monthStart, monthEnd);

  // Fetch achievements for each period
  const periodResults = await Promise.all(
    periods.map(async (period) => {
      const matchStage: any = {
        isPaid: true,
        paymentDate: {
          $gte: period.startDate,
          $lte: period.endDate,
        },
      };

      // Add location filter if specified
      if (location) {
        matchStage["leadData.location"] = {
          $regex: new RegExp(`^${location}$`, "i"),
        };
      }

      const pipeline: PipelineStage[] = [
        {
          $lookup: {
            from: "queries",
            localField: "lead",
            foreignField: "_id",
            as: "leadData",
          },
        },
        { $unwind: "$leadData" },

        // Keep history even if empty
        {
          $unwind: {
            path: "$travellerPayment.history",
            preserveNullAndEmptyArrays: true,
          },
        },

        // Create unified paymentDate (from history OR main payment)
        {
          $addFields: {
            paymentDate: {
              $cond: {
                if: {
                  $eq: [{ $type: "$travellerPayment.history.date" }, "date"],
                },
                then: "$travellerPayment.history.date",
                else: {
                  $toDate: {
                    $ifNull: ["$travellerPayment.history.date", "$createdAt"],
                  },
                },
              },
            },
            isPaid: {
              $or: [
                { $eq: ["$travellerPayment.history.status", "paid"] },
                { $eq: ["$travellerPayment.status", "paid"] },
              ],
            },
            paymentAmount: {
              $cond: [
                { $ifNull: ["$travellerPayment.history.amount", false] },
                "$travellerPayment.history.amount",
                "$travellerPayment.amountReceived",
              ],
            },
          },
        },

        { $match: matchStage },

        // Total paid logic
        {
          $group: {
            _id: null,
            totalPaid: { $sum: "$paymentAmount" },
          },
        },
      ];

      const result = await Bookings.aggregate(pipeline);
      const achieved = result[0]?.totalPaid || 0;
      const periodTarget = monthlyTarget / periods.length;
      const percentage = periodTarget > 0 ? (achieved / periodTarget) * 100 : 0;

      console.log("📥 Stats for period", period.periodLabel, ":", {
        achieved,
        periodTarget,
        percentage,
      });

      return {
        period: period.periodLabel,
        periodLabel: period.periodLabel,
        target: periodTarget,
        achieved,
        percentage,
        startDate: period.startDate.toISOString(),
        endDate: period.endDate.toISOString(),
      };
    })
  );

  const totalAchieved = periodResults.reduce((sum, p) => sum + p.achieved, 0);
  const overallPercentage =
    monthlyTarget > 0 ? (totalAchieved / monthlyTarget) * 100 : 0;

  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  return {
    periods: periodResults,
    totalTarget: monthlyTarget,
    totalAchieved,
    overallPercentage,
    location: locationName,
    month: monthNames[month],
    year,
  };
};

// ---------------------------------
// 📍 Get Available Locations
// ---------------------------------
export const getAvailableLocations = async (): Promise<string[]> => {
  await connectDb();
  const targets = await MonthlyTarget.find({}).lean();
  return targets.map((t) => t.city).filter(Boolean);
};




export const getBookingStats = async ({
  days,
  location,
  comparisonMonth,
  comparisonYear,
  weekOffset = 0,
  monthOffset = 0,
  yearOffset = 0,
}: {
  days?: "12 days" | "1 year" | "last 3 years" | "this month" | "week";
  location?: string;
  comparisonMonth?: number; // 0-11
  comparisonYear?: number;
  weekOffset?: number; // For week navigation
  monthOffset?: number; // For month navigation
  yearOffset?: number; // For year navigation
}) => {
  await connectDb();
  const now = new Date();
  let start = new Date();
  const end = new Date();
  let groupFormat: any;

  // ------------------------------
  // 🧠 Determine grouping and range
  // ------------------------------
  switch (days?.toLowerCase()) {
    case "week":
      // Calculate week based on offset (0 = current week, -1 = last week, etc.)
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay() + weekOffset * 7);
      weekStart.setHours(0, 0, 0, 0);

      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);

      start = weekStart;
      end.setTime(weekEnd.getTime());

      groupFormat = {
        $dateToString: {
          format: "%Y-%m-%d",
          date: "$travellerPayment.history.date",
          timezone: "Asia/Kolkata",
        },
      };
      break;

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
      // Apply year offset
      const targetYear = now.getFullYear() + yearOffset;
      start = new Date(targetYear, 0, 1); // Jan 1 of target year
      end.setFullYear(targetYear, 11, 31);
      end.setHours(23, 59, 59, 999);
      groupFormat = {
        $dateToString: {
          format: "%Y-%m", // group by month
          date: "$travellerPayment.history.date",
          timezone: "Asia/Kolkata",
        },
      };
      break;

    case "last 3 years":
      start = new Date(now.getFullYear() - 2, 0, 1); // include 3 full years
      start.setHours(0, 0, 0, 0);
      end.setFullYear(now.getFullYear(), 11, 31);
      end.setHours(23, 59, 59, 999);
      groupFormat = {
        $dateToString: {
          format: "%Y", // group by year
          date: "$travellerPayment.history.date",
          timezone: "Asia/Kolkata",
        },
      };
      break;

    case "this month":
      // Apply month offset
      const targetMonth = new Date(
        now.getFullYear(),
        now.getMonth() + monthOffset,
        1
      );
      start = new Date(targetMonth.getFullYear(), targetMonth.getMonth(), 1);
      start.setHours(0, 0, 0, 0);
      end.setTime(
        new Date(
          targetMonth.getFullYear(),
          targetMonth.getMonth() + 1,
          0,
          23,
          59,
          59,
          999
        ).getTime()
      );
      groupFormat = {
        $dateToString: {
          format: "%Y-%m-%d", // group by day
          date: "$travellerPayment.history.date",
          timezone: "Asia/Kolkata",
        },
      };
      break;

    default:
      throw new Error(
        "Invalid period. Use '12 days', '1 year', 'last 3 years', 'this month', or 'week'."
      );
  }

  // ------------------------------
  // 🧩 Main (selected) aggregation
  // ------------------------------
  const pipeline: PipelineStage[] = [
    {
      $lookup: {
        from: "queries",
        localField: "lead",
        foreignField: "_id",
        as: "leadData",
      },
    },
    { $unwind: "$leadData" },
    { $unwind: "$travellerPayment.history" },
    {
      $match: {
        "travellerPayment.history.status": "paid",
        "travellerPayment.history.date": { $gte: start, $lte: end },
        ...(location ? { "leadData.location": location } : {}),
      },
    },
    {
      $group: {
        _id: groupFormat,
        totalPaid: { $sum: "$travellerPayment.history.amount" },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ];

  const result = await Bookings.aggregate(pipeline as PipelineStage[]);

  // ------------------------------
  // 📍 Location Breakdown (only when no specific location is selected)
  // ------------------------------
  let locationBreakdownResult = null;

  if (!location) {
    const locationPipeline: PipelineStage[] = [
      {
        $lookup: {
          from: "queries",
          localField: "lead",
          foreignField: "_id",
          as: "leadData",
        },
      },
      { $unwind: "$leadData" },
      { $unwind: "$travellerPayment.history" },
      {
        $match: {
          "travellerPayment.history.status": "paid",
          "travellerPayment.history.date": { $gte: start, $lte: end },
        },
      },
      {
        $group: {
          _id: "$leadData.location",
          totalPaid: { $sum: "$travellerPayment.history.amount" },
          count: { $sum: 1 },
        },
      },
      { $sort: { totalPaid: -1 } },
    ];

    locationBreakdownResult = await Bookings.aggregate(
      locationPipeline as PipelineStage[]
    );

    // Transform location breakdown
    locationBreakdownResult = locationBreakdownResult.map((item: any) => ({
      location: item._id,
      totalPaid: item.totalPaid,
      count: item.count,
    }));


  }

  // ------------------------------
  // 📊 Comparison dataset handling
  // ------------------------------
  let comparisonResult = null;

  // Only fetch comparison if explicitly requested (not for "1 year" auto-comparison)
  if (comparisonMonth !== undefined && comparisonYear !== undefined) {
    const comparisonStart = new Date(comparisonYear, comparisonMonth, 1);
    comparisonStart.setHours(0, 0, 0, 0);
    const comparisonEnd = new Date(comparisonYear, comparisonMonth + 1, 0);
    comparisonEnd.setHours(23, 59, 59, 999);

    const comparisonPipeline: PipelineStage[] = [
      {
        $lookup: {
          from: "queries",
          localField: "lead",
          foreignField: "_id",
          as: "leadData",
        },
      },
      { $unwind: "$leadData" },
      { $unwind: "$travellerPayment.history" },
      {
        $match: {
          "travellerPayment.history.status": "paid",
          "travellerPayment.history.date": {
            $gte: comparisonStart,
            $lte: comparisonEnd,
          },
          ...(location ? { "leadData.location": location } : {}),
        },
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format:
                days === "12 days" || days === "this month" || days === "week"
                  ? "%Y-%m-%d"
                  : days === "1 year"
                  ? "%Y-%m"
                  : "%Y",
              date: "$travellerPayment.history.date",
              timezone: "Asia/Kolkata",
            },
          },
          totalPaid: { $sum: "$travellerPayment.history.amount" },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ];

    comparisonResult = await Bookings.aggregate(
      comparisonPipeline as PipelineStage[]
    );


  }

  // ------------------------------
  // ✅ Return results
  // ------------------------------
  return {
    selectedData: result,
    comparisonData: comparisonResult,
    locationBreakdown: locationBreakdownResult,
  };
};

export const getBoostCounts = async ({ days }: { days?: string }) => {
  await connectDb();
  const now = new Date();
  let start = new Date();
  let end = new Date();
  let groupFormat: any;

  switch (days?.toLowerCase()) {
    case "this month":
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      groupFormat = {
        $dateToString: {
          format: "%Y-%m-%d",
          date: "$effectiveDate",
          timezone: "Asia/Kolkata",
        },
      };
      break;

    case "12 days":
      start.setDate(now.getDate() - 11);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      groupFormat = {
        $dateToString: {
          format: "%Y-%m-%d",
          date: "$effectiveDate",
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
          date: "$effectiveDate",
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
          date: "$effectiveDate",
          timezone: "Asia/Kolkata",
        },
      };
      break;

    default:
      throw new Error(
        "Invalid period. Use 'this month', '12 days', '1 year', or 'last 3 years'."
      );
  }

  // --- Aggregations remain unchanged ---
  const reboostResult = await Boosters.aggregate([
    {
      $addFields: {
        effectiveDate: {
          $cond: {
            if: {
              $and: [
                { $eq: ["$reboost", true] },
                { $ne: ["$lastReboostedAt", null] },
              ],
            },
            then: "$lastReboostedAt",
            else: "$createdAt",
          },
        },
        reboost: { $ifNull: ["$reboost", false] },
      },
    },
    { $match: { effectiveDate: { $gte: start, $lte: end } } },
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

  const postedResult = await Boosters.aggregate([
    {
      $addFields: {
        effectiveDate: {
          $cond: {
            if: {
              $and: [
                { $eq: ["$reboost", true] },
                { $ne: ["$lastReboostedAt", null] },
              ],
            },
            then: "$lastReboostedAt",
            else: "$createdAt",
          },
        },
        isPosted: {
          $cond: {
            if: {
              $and: [
                { $ne: ["$url", null] },
                { $ne: ["$url", ""] },
                { $gt: [{ $strLenCP: { $ifNull: ["$url", ""] } }, 0] },
              ],
            },
            then: true,
            else: false,
          },
        },
      },
    },
    { $match: { effectiveDate: { $gte: start, $lte: end } } },
    {
      $group: {
        _id: { date: groupFormat, isPosted: "$isPosted" },
        count: { $sum: 1 },
      },
    },
    {
      $group: {
        _id: "$_id.date",
        counts: { $push: { isPosted: "$_id.isPosted", count: "$count" } },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  const reboostMap = new Map<string, any>();
  const postedMap = new Map<string, any>();

  for (const item of reboostResult) {
    const newBoosts =
      item.counts.find((c: any) => c.reboost === false)?.count || 0;
    const reboosts =
      item.counts.find((c: any) => c.reboost === true)?.count || 0;
    reboostMap.set(item._id, { newBoosts, reboosts, total: item.total });
  }

  for (const item of postedResult) {
    const posted =
      item.counts.find((c: any) => c.isPosted === true)?.count || 0;
    const notPosted =
      item.counts.find((c: any) => c.isPosted === false)?.count || 0;
    postedMap.set(item._id, { posted, notPosted });
  }

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

  const output: any[] = [];

  if (days === "this month" || days === "12 days") {
    const temp = new Date(start);
    while (temp <= end) {
      const key = temp.toLocaleDateString("en-CA", {
        timeZone: "Asia/Kolkata",
      });
      const reboostData = reboostMap.get(key);
      const postedData = postedMap.get(key);
      const formattedDate = `${temp.getDate()} ${months[temp.getMonth()]}`;
      output.push({
        date: formattedDate,
        newBoosts: reboostData?.newBoosts ?? 0,
        reboosts: reboostData?.reboosts ?? 0,
        posted: postedData?.posted ?? 0,
        notPosted: postedData?.notPosted ?? 0,
        total: reboostData?.total ?? 0,
      });
      temp.setDate(temp.getDate() + 1);
    }
  } else if (days === "1 year") {
    for (let i = 0; i < 12; i++) {
      const dateKey = `${start.getFullYear()}-${String(i + 1).padStart(
        2,
        "0"
      )}`;
      const reboostData = reboostMap.get(dateKey);
      const postedData = postedMap.get(dateKey);
      output.push({
        date: months[i],
        newBoosts: reboostData?.newBoosts ?? 0,
        reboosts: reboostData?.reboosts ?? 0,
        posted: postedData?.posted ?? 0,
        notPosted: postedData?.notPosted ?? 0,
        total: reboostData?.total ?? 0,
      });
    }
  } else if (days === "last 3 years") {
    const currentYear = now.getFullYear();
    for (let i = currentYear - 3 + 1; i <= currentYear; i++) {
      const reboostData = reboostMap.get(String(i));
      const postedData = postedMap.get(String(i));
      output.push({
        date: String(i),
        newBoosts: reboostData?.newBoosts ?? 0,
        reboosts: reboostData?.reboosts ?? 0,
        posted: postedData?.posted ?? 0,
        notPosted: postedData?.notPosted ?? 0,
        total: reboostData?.total ?? 0,
      });
    }
  }

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

  const resultMap = new Map<string, number>();
  for (const item of result) {
    resultMap.set(item._id, item.owners);
  }

  const output: { date: string; owners: number }[] = [];

  if (days === "12 days") {
    const temp = new Date(start);
    while (temp <= end) {
      const key = temp.toLocaleDateString("en-CA", {
        timeZone: "Asia/Kolkata",
      });
      const owners = resultMap.get(key) ?? 0;
      const formattedDate = `${temp.getDate()} ${months[temp.getMonth()]}`;
      output.push({ date: formattedDate, owners });
      temp.setDate(temp.getDate() + 1);
    }
  } else if (days === "1 year") {
    for (let i = 0; i < 12; i++) {
      const dateKey = `${start.getFullYear()}-${String(i + 1).padStart(
        2,
        "0"
      )}`;
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

  return output;
};

export const getVisitsToday = async ({ days }: { days?: string }) => {
  const now = new Date();
  let start = new Date();
  let end = new Date();
  if (days) {
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
        end = new Date(
          now.getFullYear(),
          now.getMonth() + 1,
          0,
          23,
          59,
          59,
          999
        );
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
        end = new Date(); // Now
        break;
    }
  }

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
    },
    {
      $sort: {
        count: -1 as const,
      },
    },
  ];
  const count = await Visits.aggregate(pipeline);
  return { count };
};
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
      $sort: { total: -1 as const },
    },
    {
      $limit: 5,
    },
  ];

  const propertyCount = await Property.aggregate(pipeline);

  const totalPropertyCount = await Property.countDocuments({});

  return { propertyCount, totalPropertyCount };
};

export const getReviews = async ({
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
      $group: {
        _id: "$leadQualityByReviewer",
        count: { $sum: 1 },
      },
    },
  ];

  const reviews = await Query.aggregate(pipeline);
  return { reviews };
};

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
};

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

  return res[0];
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

  const cityFilter =
    location && location !== "All" ? { location: location } : {};
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

export const getGoodVisitsCount = async ({ days }: { days?: string }) => {
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
      $match: filters,
    },
    {
      $group: {
        _id: {
          leadStatus: "$leadStatus",
          propertyShown: "$propertyShown",
        },
        count: { $sum: 1 },
      },
    },
    {
      $project: {
        _id: 0,
        propertyShown: "$_id.propertyShown",
        count: 1,
      },
    },
  ];

  const count = await Query.aggregate(pipeline);
  return { count };
};

export const getCountryWisePropertyCount = async ({
  country,
}: {
  country: string;
}) => {
  const pipeline = [
    // Step 1: filter by country
    {
      $match: { country: country },
    },
    // Step 2: group by city and rentalType
    {
      $group: {
        _id: { city: "$city", rentalType: "$rentalType" },
        count: { $sum: 1 },
      },
    },
    // Step 3: group by city, pushing rentalType counts
    {
      $group: {
        _id: "$_id.city",
        counts: {
          $push: {
            k: { $ifNull: ["$_id.rentalType", "Unknown"] },
            v: "$count",
          },
        },
      },
    },
    // Step 4: convert counts array to object
    {
      $addFields: { counts: { $arrayToObject: "$counts" } },
    },
    // Step 5: ensure Short Term and Long Term exist
    {
      $addFields: {
        "Short Term": { $ifNull: ["$counts.Short Term", 0] },
        "Long Term": { $ifNull: ["$counts.Long Term", 0] },
      },
    },
    // Step 6: total per city
    {
      $addFields: { total: { $add: ["$Short Term", "$Long Term"] } },
    },
    // Step 7: project final fields
    {
      $project: {
        _id: 0,
        city: "$_id",
        "Short Term": 1,
        "Long Term": 1,
        total: 1,
      },
    },
    // Step 8: sort by total descending
    {
      $sort: { total: -1 as const },
    },
    // Step 9: limit top 5 cities
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

// ==================== CANDIDATE COUNTS FOR HR DASHBOARD ====================
export const getCandidateCounts = async ({ 
  days, 
  position 
}: { 
  days?: string; 
  position?: string;
}) => {
  await connectDb();
  const Candidate = (await import("@/models/candidate")).default;
  
  const now = new Date();
  let start = new Date();
  let end = new Date();
  let groupFormat: any;

  switch (days?.toLowerCase()) {
    case "this month":
      start = new Date(now.getFullYear(), now.getMonth(), 1);
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

    case "12 days":
      start.setDate(now.getDate() - 11);
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
      // Default to this month
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      groupFormat = {
        $dateToString: {
          format: "%Y-%m-%d",
          date: "$createdAt",
          timezone: "Asia/Kolkata",
        },
      };
  }

  // Build match query
  const matchQuery: any = { createdAt: { $gte: start, $lte: end } };
  if (position && position !== "All") {
    matchQuery.position = { $regex: position, $options: "i" };
  }

  const result = await Candidate.aggregate([
    { $match: matchQuery },
    {
      $group: {
        _id: { date: groupFormat, status: "$status" },
        count: { $sum: 1 },
      },
    },
    {
      $group: {
        _id: "$_id.date",
        counts: { $push: { status: "$_id.status", count: "$count" } },
        total: { $sum: "$count" },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];

  const resultMap = new Map<
    string,
    { pending: number; shortlisted: number; selected: number; rejected: number; onboarding: number; total: number }
  >();

  for (const item of result) {
    const pending = item.counts.find((c: any) => c.status === "pending")?.count || 0;
    const shortlisted = item.counts.find((c: any) => c.status === "shortlisted")?.count || 0;
    const selected = item.counts.find((c: any) => c.status === "selected")?.count || 0;
    const rejected = item.counts.find((c: any) => c.status === "rejected")?.count || 0;
    const onboarding = item.counts.find((c: any) => c.status === "onboarding")?.count || 0;
    resultMap.set(item._id, {
      pending,
      shortlisted,
      selected,
      rejected,
      onboarding,
      total: item.total,
    });
  }

  const output: any[] = [];

  if (days === "this month" || days === "12 days" || !days) {
    const temp = new Date(start);
    while (temp <= end) {
      const key = temp.toLocaleDateString("en-CA", {
        timeZone: "Asia/Kolkata",
      });
      const item = resultMap.get(key);
      const formattedDate = `${temp.getDate()} ${months[temp.getMonth()]}`;
      output.push({
        date: formattedDate,
        pending: item?.pending ?? 0,
        shortlisted: item?.shortlisted ?? 0,
        selected: item?.selected ?? 0,
        rejected: item?.rejected ?? 0,
        onboarding: item?.onboarding ?? 0,
        total: item?.total ?? 0,
      });
      temp.setDate(temp.getDate() + 1);
    }
  } else if (days === "1 year") {
    for (let i = 0; i < 12; i++) {
      const month = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
      const key = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}`;
      const item = resultMap.get(key);
      output.push({
        date: `${months[month.getMonth()]} ${month.getFullYear()}`,
        pending: item?.pending ?? 0,
        shortlisted: item?.shortlisted ?? 0,
        selected: item?.selected ?? 0,
        rejected: item?.rejected ?? 0,
        onboarding: item?.onboarding ?? 0,
        total: item?.total ?? 0,
      });
    }
  } else if (days === "last 3 years") {
    for (let i = 0; i < 4; i++) {
      const year = now.getFullYear() - 3 + i;
      const key = `${year}`;
      const item = resultMap.get(key);
      output.push({
        date: key,
        pending: item?.pending ?? 0,
        shortlisted: item?.shortlisted ?? 0,
        selected: item?.selected ?? 0,
        rejected: item?.rejected ?? 0,
        onboarding: item?.onboarding ?? 0,
        total: item?.total ?? 0,
      });
    }
  }

  return output;
};

// Get all unique positions for filter dropdown
export const getCandidatePositions = async () => {
  await connectDb();
  const Candidate = (await import("@/models/candidate")).default;
  
  const positions = await Candidate.distinct("position");
  return positions.filter((p: string) => p && p.trim() !== "").sort();
};

// Get summary stats for candidates (current totals by status)
export const getCandidateSummary = async ({ position }: { position?: string } = {}) => {
  await connectDb();
  const Candidate = (await import("@/models/candidate")).default;

  const matchQuery: any = {};
  if (position && position !== "All") {
    matchQuery.position = { $regex: position, $options: "i" };
  }

  const summary = await Candidate.aggregate([
    { $match: matchQuery },
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 },
      },
    },
  ]);

  const result = {
    pending: 0,
    shortlisted: 0,
    selected: 0,
    rejected: 0,
    onboarding: 0,
    total: 0,
  };

  for (const item of summary) {
    if (item._id === "pending") result.pending = item.count;
    else if (item._id === "shortlisted") result.shortlisted = item.count;
    else if (item._id === "selected") result.selected = item.count;
    else if (item._id === "rejected") result.rejected = item.count;
    else if (item._id === "onboarding") result.onboarding = item.count;
    result.total += item.count;
  }

  return result;
};

// Website Leads Counts
export const getWebsiteLeadsCounts = async ({ days }: { days?: string }) => {
  await connectDb();
  const now = new Date();
  let start = new Date();
  let end = new Date();
  let groupFormat: any;

  switch (days?.toLowerCase()) {
    case "this month":
      start = new Date(now.getFullYear(), now.getMonth(), 1);
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

    case "12 days":
      start.setDate(now.getDate() - 11);
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
        "Invalid period. Use 'this month', '12 days', '1 year', or 'last 3 years'."
      );
  }

  // Aggregate website leads by date
  const leadsResult = await WebsiteLeads.aggregate([
    { $match: { createdAt: { $gte: start, $lte: end } } },
    {
      $group: {
        _id: groupFormat,
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  const leadsMap = new Map<string, number>();
  for (const item of leadsResult) {
    leadsMap.set(item._id, item.count);
  }

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

  const output: { date: string; leads: number }[] = [];

  if (days === "this month" || days === "12 days") {
    const temp = new Date(start);
    while (temp <= end) {
      const key = temp.toLocaleDateString("en-CA", {
        timeZone: "Asia/Kolkata",
      });
      const formattedDate = `${temp.getDate()} ${months[temp.getMonth()]}`;
      output.push({
        date: formattedDate,
        leads: leadsMap.get(key) ?? 0,
      });
      temp.setDate(temp.getDate() + 1);
    }
  } else if (days === "1 year") {
    for (let i = 0; i < 12; i++) {
      const dateKey = `${start.getFullYear()}-${String(i + 1).padStart(
        2,
        "0"
      )}`;
      output.push({
        date: months[i],
        leads: leadsMap.get(dateKey) ?? 0,
      });
    }
  } else if (days === "last 3 years") {
    const currentYear = now.getFullYear();
    for (let i = currentYear - 3 + 1; i <= currentYear; i++) {
      output.push({
        date: String(i),
        leads: leadsMap.get(String(i)) ?? 0,
      });
    }
  }

  return output;
};
