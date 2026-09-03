import { type NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import Visits from "@/models/visit";
import Query from "@/models/query";
import Users from "@/models/user";
import Employees from "@/models/employee";
import { getDataFromToken } from "@/util/getDataFromToken";
import {
  applyLocationFilter,
  isLocationExempt,
  isSalesTeamRestricted,
} from "@/util/apiSecurity";
import {
  matchesVisitCategory,
} from "@/services/visits/visitService";
import {
  ACTIVE_VISIT_STATUSES,
  getVisitCloseCutoffDate,
  normalizeLegacyVisitStatus,
  VISIT_STATUS_LOCK_START,
} from "@/lib/visits/visitStatus";

interface VisitScheduleSlot {
  date?: Date;
  time?: string;
}

interface VisitLean {
  _id: Types.ObjectId;
  lead?: Types.ObjectId | { _id?: string; name?: string; phoneNo?: string; email?: string };
  visitStatus?: string;
  schedule?: VisitScheduleSlot[];
  createdBy?: string;
  createdByName?: string;
  [key: string]: unknown;
}

interface UserLean {
  _id: Types.ObjectId;
  name?: string;
  phone?: string;
  email?: string;
  role?: string;
}

export async function POST(req: NextRequest) {
  try {
    // Get user token for authorization
    const token = await getDataFromToken(req);
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role: string = (token.role || "") as string;
    const userEmail: string =
      typeof token.email === "string" ? token.email : "";
    const assignedArea: string | string[] | undefined = 
      token.allotedArea 
        ? (Array.isArray(token.allotedArea) 
            ? token.allotedArea 
            : typeof token.allotedArea === "string" 
            ? token.allotedArea 
            : undefined)
        : undefined;

    const body = await req.json();

    const {
      ownerName = "",
      ownerPhone = "",
      customerName = "",
      customerPhone = "",
      vsid = "",
      commissionFrom = "",
      commissionTo = "",
      visitCategory = "all",
      page = 1,
      limit = 50,
      location, // Optional location filter from request
      overdueOnly = false,
    } = body;

    const currentPage = Math.max(1, Number(page) || 1);
    const pageLimit = Math.max(1, Math.min(100, Number(limit) || 50));

    const filterQuery: Record<string, any> = {};

    // Sales users only see visits they created; SuperAdmin/other exempt roles see all
    if (isSalesTeamRestricted(role)) {
      if (!userEmail) {
        return NextResponse.json(
          {
            data: [],
            page: 1,
            limit: pageLimit,
            totalPages: 0,
            totalVisits: 0,
            updatedCount: 0,
          },
          { status: 200 }
        );
      }
      filterQuery.createdBy = userEmail;
    }

    // Apply location filtering for Sales users (non-exempt roles)
    // NOTE: Visits don't have a location field - location is on the lead (Query model)
    // So we need to filter by lead IDs that match the location
    let locationFilteredLeadIds: string[] | null = null;
    
    if (!isLocationExempt(role)) {
      // For non-exempt roles (Sales), filter by assigned areas
      const locationStr: string | undefined = typeof location === "string" ? location : undefined;
      
      // Build location filter for Query model
      const leadLocationFilter: Record<string, any> = {};
      applyLocationFilter(leadLocationFilter, role, assignedArea, locationStr);
      
      // If location filter was applied, find matching leads
      if (leadLocationFilter.location) {
        const matchingLeads = await Query.find(leadLocationFilter).select("_id").lean();
        locationFilteredLeadIds = matchingLeads.map((lead: any) => lead._id.toString());
        
        // If no leads match the location, return empty results
        if (locationFilteredLeadIds.length === 0) {
          return NextResponse.json(
            {
              data: [],
              page: 1,
              limit: pageLimit,
              totalPages: 0,
              totalVisits: 0,
              updatedCount: 0,
            },
            { status: 200 }
          );
        }
        
        // Filter visits by matching lead IDs (convert strings to ObjectIds)
        filterQuery.lead = { $in: locationFilteredLeadIds.map((id: string) => new Types.ObjectId(id)) };
      }
    } else if (location && typeof location === "string" && location !== "All") {
      // For exempt roles, allow location filtering if requested
      const matchingLeads = await Query.find({
        location: new RegExp(location, "i"),
      }).select("_id").lean();
      
      locationFilteredLeadIds = matchingLeads.map((lead: any) => lead._id.toString());
      
      if (locationFilteredLeadIds.length > 0) {
        filterQuery.lead = { $in: locationFilteredLeadIds.map((id: string) => new Types.ObjectId(id)) };
      } else {
        // No leads match the location
        return NextResponse.json(
          {
            data: [],
            page: 1,
            limit: pageLimit,
            totalPages: 0,
            totalVisits: 0,
            updatedCount: 0,
          },
          { status: 200 }
        );
      }
    }

    if (ownerName) {
      filterQuery.ownerName = { $regex: ownerName, $options: "i" };
    }

    if (ownerPhone) {
      filterQuery.ownerPhone = { $regex: ownerPhone, $options: "i" };
    }

    // Handle customer name and phone filtering
    if (customerName || customerPhone) {
      const leadQuery: any = {};

      if (customerName) {
        leadQuery.name = { $regex: customerName, $options: "i" };
      }

      if (customerPhone) {
        leadQuery.phoneNo = { $regex: customerPhone, $options: "i" };
      }

      // If location filtering was already applied, combine with it
      if (locationFilteredLeadIds && locationFilteredLeadIds.length > 0) {
        leadQuery._id = { $in: locationFilteredLeadIds.map((id: string) => new Types.ObjectId(id)) };
      }

      // Find matching lead IDs
      const matchingLeads = await Query.find(leadQuery).select("_id").lean();
      const leadIds = matchingLeads.map((lead: any) => lead._id.toString());

      // Combine with existing lead filter if it exists
      if (filterQuery.lead && Array.isArray(filterQuery.lead.$in)) {
        // Intersect the arrays to find common lead IDs
        const existingIds = filterQuery.lead.$in.map((id: any) => id.toString());
        const intersection = existingIds.filter((id: string) => leadIds.includes(id));
        
        if (intersection.length === 0) {
          return NextResponse.json(
            {
              data: [],
              page: 1,
              limit: pageLimit,
              totalPages: 0,
              totalVisits: 0,
              updatedCount: 0,
            },
            { status: 200 }
          );
        }
        
        filterQuery.lead = { $in: intersection.map((id: string) => new Types.ObjectId(id)) };
      } else {
        // Add lead IDs to the filter query
        if (leadIds.length === 0) {
          return NextResponse.json(
            {
              data: [],
              page: 1,
              limit: pageLimit,
              totalPages: 0,
              totalVisits: 0,
              updatedCount: 0,
            },
            { status: 200 }
          );
        }
        filterQuery.lead = { $in: leadIds.map((id: string) => new Types.ObjectId(id)) };
      }
    }

    if (vsid) {
      filterQuery.VSID = { $regex: vsid, $options: "i" };
    }

    if (overdueOnly === true) {
      filterQuery.visitStatus = { $in: ACTIVE_VISIT_STATUSES };
      filterQuery.createdAt = { $gte: VISIT_STATUS_LOCK_START };
      filterQuery["schedule.date"] = { $lte: getVisitCloseCutoffDate() };
    }

    if (commissionFrom || commissionTo) {
      const commissionConditions = [];

      if (commissionFrom) {
        commissionConditions.push({
          $gte: [
            {
              $add: [
                "$ownerCommission",
                "$travellerCommission",
                "$agentCommission",
              ],
            },
            Number.parseInt(commissionFrom),
          ],
        });
      }

      if (commissionTo) {
        commissionConditions.push({
          $lte: [
            {
              $add: [
                "$ownerCommission",
                "$travellerCommission",
                "$agentCommission",
              ],
            },
            Number.parseInt(commissionTo),
          ],
        });
      }

      if (commissionConditions.length > 0) {
        filterQuery.$expr =
          commissionConditions.length === 1
            ? commissionConditions[0]
            : { $and: commissionConditions };
      }
    }

    // First, fetch visits without populate to get raw lead IDs
    const visitsRaw = await Visits.find(filterQuery)
      .select("lead")
      .lean<VisitLean[]>()
      .sort({ createdAt: -1 });
    
    const leadIdMap = new Map<string, string>(); // visitId -> leadId
    for (const visit of visitsRaw) {
      if (visit.lead) {
        leadIdMap.set(visit._id.toString(), visit.lead.toString());
      }
    }

    // Fetch visits with Query populate
    const allVisits = await Visits.find(filterQuery)
      .populate({
        path: "lead",
        select: "name phoneNo email",
        model: Query,
      })
      .sort({ createdAt: -1 })
      .lean<VisitLean[]>();

    // Find visits with null leads (failed Query populate) - these might be brokers
    const nullLeadVisitIds: string[] = [];
    for (const visit of allVisits) {
      const lead = visit.lead;
      const isPopulated = lead && typeof lead === "object" && "name" in lead;
      if (!lead || !isPopulated || !lead.name) {
        nullLeadVisitIds.push(visit._id.toString());
      }
    }

    // Try to populate broker leads from User model for null leads
    if (nullLeadVisitIds.length > 0) {
      const brokerLeadIds = nullLeadVisitIds
        .map((visitId) => leadIdMap.get(visitId))
        .filter(Boolean) as string[];
      
      if (brokerLeadIds.length > 0) {
        const brokerLeads = await Users.find({
          _id: { $in: brokerLeadIds },
          role: "Broker",
        })
          .select("name phone email role")
          .lean<UserLean[]>();
        
        const brokerLeadMap = new Map(
          brokerLeads.map((broker) => [
            broker._id.toString(),
            {
              _id: broker._id.toString(),
              name: broker.name,
              phoneNo: broker.phone,
              email: broker.email,
            },
          ])
        );

        // Replace null leads with broker data
        for (const visit of allVisits) {
          const lead = visit.lead;
          const isPopulated = lead && typeof lead === "object" && "name" in lead;
          if (!lead || !isPopulated || !lead.name) {
            const leadId = leadIdMap.get(visit._id.toString());
            if (leadId && brokerLeadMap.has(leadId)) {
              visit.lead = brokerLeadMap.get(leadId);
            }
          }
        }
      }
    }

    const categorizedVisits: VisitLean[] = [];

    for (const visit of allVisits) {
      visit.visitStatus = normalizeLegacyVisitStatus(visit.visitStatus ?? "scheduled");

      if (matchesVisitCategory(visit.visitStatus ?? "scheduled", visitCategory)) {
        categorizedVisits.push(visit);
      }
    }

    const totalVisits = categorizedVisits.length;
    const totalPages = totalVisits === 0 ? 0 : Math.ceil(totalVisits / pageLimit);
    const safePage =
      totalPages === 0 ? 1 : Math.min(currentPage, totalPages);
    const startIndex = (safePage - 1) * pageLimit;
    const paginatedVisits = categorizedVisits.slice(
      startIndex,
      startIndex + pageLimit
    );

    // Resolve createdBy emails to employee names for the current page
    const creatorEmails = Array.from(
      new Set(
        paginatedVisits
          .map((visit) => visit.createdBy)
          .filter(
            (email): email is string =>
              typeof email === "string" && email.includes("@"),
          )
      )
    );

    if (creatorEmails.length > 0) {
      const employees = await Employees.find({
        email: { $in: creatorEmails },
      })
        .select("email name")
        .lean<{ email?: string; name?: string }[]>();

      const emailToName = new Map<string, string>();
      for (const employee of employees) {
        if (employee.email && employee.name) {
          emailToName.set(employee.email, employee.name);
        }
      }

      for (const visit of paginatedVisits) {
        if (visit.createdBy) {
          visit.createdByName =
            emailToName.get(visit.createdBy) || visit.createdBy;
        }
      }
    } else {
      for (const visit of paginatedVisits) {
        if (visit.createdBy) {
          visit.createdByName = visit.createdBy;
        }
      }
    }

    return NextResponse.json(
      {
        data: paginatedVisits,
        page: safePage,
        limit: pageLimit,
        totalPages,
        totalVisits,
        updatedCount: 0,
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.log("err in getting visits: ", err);
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
