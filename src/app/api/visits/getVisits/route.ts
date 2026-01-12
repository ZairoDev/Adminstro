import { type NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import Visits from "@/models/visit";
import Query from "@/models/query";
import Users from "@/models/user";
import { getDataFromToken } from "@/util/getDataFromToken";
import { applyLocationFilter, isLocationExempt } from "@/util/apiSecurity";

interface VisitLean {
  _id: Types.ObjectId;
  lead?: Types.ObjectId | { _id?: string; name?: string; phoneNo?: string; email?: string };
  visitStatus?: string;
  scheduledDate?: Date;
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
      visitCategory = "scheduled",
      location, // Optional location filter from request
    } = body;

    const filterQuery: Record<string, any> = {};

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

    const currentDate = new Date();
    const visitsToUpdate = [];
    const categorizedVisits = [];

    // Categorize visits and identify visits to update
    for (const visit of allVisits) {
      let shouldUpdate = false;
      let newStatus = visit.visitStatus;

      // Check if visit has a scheduled date
      if (visit.scheduledDate) {
        const scheduledDate = new Date(visit.scheduledDate);
        // If scheduled date has passed and visit is still "scheduled"
        // If 4 days have passed since the scheduled date and visit is still "scheduled"
        const diffInMs = currentDate.getTime() - scheduledDate.getTime();
        const diffInDays = diffInMs / (1000 * 60 * 60 * 24);

        if (diffInDays >= 4 && visit.visitStatus === "scheduled") {
          newStatus = "completed";
          shouldUpdate = true;
        }
      }

      // Update visit status if needed
      if (shouldUpdate) {
        visitsToUpdate.push({
          _id: visit._id,
          visitStatus: newStatus,
        });
        visit.visitStatus = newStatus; // Update the current object
      }

      // Filter based on category
      if (visitCategory === "scheduled" && visit.visitStatus === "scheduled") {
        categorizedVisits.push(visit);
      } else if (
        visitCategory === "completed" &&
        visit.visitStatus === "completed"
      ) {
        categorizedVisits.push(visit);
      }
    }

    // Bulk update visits that need status change
    if (visitsToUpdate.length > 0) {
      const bulkOps = visitsToUpdate.map((v) => ({
        updateOne: {
          filter: { _id: v._id },
          update: { $set: { visitStatus: v.visitStatus } },
        },
      }));

      await Visits.bulkWrite(bulkOps);
    }

    const totalVisits = categorizedVisits.length;
    const totalPages = Math.ceil(totalVisits / 50);

    return NextResponse.json(
      {
        data: categorizedVisits,
        totalPages,
        totalVisits,
        updatedCount: visitsToUpdate.length,
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.log("err in getting visits: ", err);
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
