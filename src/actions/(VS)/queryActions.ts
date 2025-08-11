"use server";

import { DateRange } from "react-day-picker";

import Query from "@/models/query";
import { connectDb } from "@/util/db";
import Employees from "@/models/employee";
import { Property } from "@/models/listing";
import axios from "axios";
import { from } from "form-data";
import Visits from "@/models/visit";

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

// const formatDate = (date: Date) =>
//   date.toLocaleDateString("en-US", { timeZone: "Asia/Kolkata" });

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
  // console.log("count: ", count);
  return { count };
}
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
  // console.log("reviews: ", reviews);
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
        _id: "$ownerPhone", // Use ownerPhone as _id
        ownerName: { $first: "$ownerName" }, // Capture first occurrence of ownerName
      },
    },
    {
      $lookup: {
        from: "owners",
        localField: "_id", // _id holds ownerPhone
        foreignField: "phoneNumber",
        as: "result",
      },
    },
    {
      $match: {
        result: { $eq: [] }, // Only where no match found in owners
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

  const unregisteredOwners = await Visits.aggregate(pipeline);
  console.log("unregisteredOwners: ", unregisteredOwners);
  return { unregisteredOwners };
}

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
      // leadStatus: "$_id.leadStatus",
      propertyShown: "$_id.propertyShown",
      count: 1
    }
  }
];

const count = await Query.aggregate(pipeline);
console.log("count: ", count);
return { count };
}

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
