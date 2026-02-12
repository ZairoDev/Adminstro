import { NextRequest, NextResponse } from "next/server";

import Query from "@/models/query";
import { connectDb } from "@/util/db";
import {
  subDays,
  addHours,
  setHours,
  
  setMinutes,
  setSeconds,
  setMilliseconds,
} from "date-fns";
import Employee from "@/models/employee";
import { getDataFromToken } from "@/util/getDataFromToken";
import { batchComputeWhatsAppReplyStatus } from "@/lib/whatsapp/replyStatusResolver";
connectDb();
export const dynamic = "force-dynamic";

/**
 * Properly converts a date string (YYYY-MM-DD) to IST start of day in UTC
 * This ensures consistent date boundaries regardless of server timezone
 * 
 * IST is UTC+5:30, so IST midnight (00:00:00 IST) = 18:30:00 UTC previous day
 * Example: "2026-02-04" 00:00:00 IST = "2026-02-03" 18:30:00 UTC
 */
function getISTStartOfDay(dateInput: Date | string): Date {
  let year: number, month: number, day: number;
  
  if (typeof dateInput === 'string') {
    // Parse date string "YYYY-MM-DD"
    const parts = dateInput.split('-').map(Number);
    year = parts[0];
    month = parts[1] - 1; // JavaScript months are 0-indexed
    day = parts[2];
  } else {
    // Extract date components from Date object (in local timezone)
    year = dateInput.getFullYear();
    month = dateInput.getMonth();
    day = dateInput.getDate();
  }
  
  // Create UTC date representing IST midnight for the given date
  // IST midnight = UTC date at (year, month, day) 00:00:00 - 5.5 hours
  // This gives us the UTC timestamp for IST midnight
  const utcDate = Date.UTC(year, month, day, 0, 0, 0, 0);
  const istMidnightUTC = new Date(utcDate - (5.5 * 60 * 60 * 1000));
  
  return istMidnightUTC;
}

/**
 * Gets IST end of day (start of next day) in UTC
 * This returns the exclusive upper bound for the date range query
 */
function getISTEndOfDay(dateInput: Date | string): Date {
  let year: number, month: number, day: number;
  
  if (typeof dateInput === 'string') {
    const parts = dateInput.split('-').map(Number);
    year = parts[0];
    month = parts[1] - 1;
    day = parts[2];
  } else {
    year = dateInput.getFullYear();
    month = dateInput.getMonth();
    day = dateInput.getDate();
  }
  
  // Get next day's IST start (which is the exclusive end of current day)
  // Use UTC to calculate next day to avoid timezone issues
  const nextDayUTC = Date.UTC(year, month, day + 1, 0, 0, 0, 0);
  const nextDayDate = new Date(nextDayUTC);
  const nextYear = nextDayDate.getUTCFullYear();
  const nextMonth = nextDayDate.getUTCMonth() + 1;
  const nextDay = nextDayDate.getUTCDate();
  
  return getISTStartOfDay(`${nextYear}-${String(nextMonth).padStart(2, '0')}-${String(nextDay).padStart(2, '0')}`);
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const token = await getDataFromToken(request);
  try {
    const url = request.nextUrl;
    const fromDate = url.searchParams.get("fromDate");
    const toDate = url.searchParams.get("toDate");
    
    // CRITICAL FIX: When querying by specific date range (fromDate === toDate), 
    // return ALL results without pagination limit to ensure consistency
    const isDateSpecificQuery = fromDate && toDate && fromDate === toDate;
    
    const page = Number(url.searchParams.get("page")) || 1;
    // Use a very high limit (or no limit) for date-specific queries to get all results
    const defaultLimit = isDateSpecificQuery ? 10000 : 50;
    const limit = Number(url.searchParams.get("limit")) || defaultLimit;
    const skip = (page - 1) * limit;
    
    if (isDateSpecificQuery) {
      console.log(`[getquery] Date-specific query detected: fromDate=${fromDate}, toDate=${toDate}`);
      console.log(`[getquery] Using limit=${limit} to fetch all results (default would be 50)`);
    }
    const searchTerm = url.searchParams.get("searchTerm") || "";
    const searchType = url.searchParams.get("searchType") || "name";
    const dateFilter = url.searchParams.get("dateFilter") || "";
    const customDays = Number(url.searchParams.get("customDays")) || 0;
    const startDate = url.searchParams.get("startDate");
    const endDate = url.searchParams.get("endDate");
    const createdBy = url.searchParams.get("createdBy");

    const regex = new RegExp(searchTerm, "i");
    let query: Record<string, any> = {};

    if (searchTerm) {

        query[searchType] = regex;
      
    }

    // console.log("search query: ", query);

    let dateQuery: any = {};
    
    // Handle date filtering - prioritize fromDate/toDate over dateFilter
    if (fromDate && toDate) {
      // CRITICAL FIX: Properly handle date range with IST timezone
      const istStartDate = getISTStartOfDay(fromDate);
      const istEndDate = getISTEndOfDay(toDate); // This gives us start of next day (end of current day)
      
      dateQuery = {
        createdAt: {
          $gte: istStartDate,
          $lt: istEndDate,
        },
      };
      
      // Enhanced debug logging to help diagnose issues
      console.log(`[getquery] ===== DATE QUERY DEBUG =====`);
      console.log(`[getquery] Input: fromDate=${fromDate}, toDate=${toDate}`);
      console.log(`[getquery] IST Start (UTC): ${istStartDate.toISOString()}`);
      console.log(`[getquery] IST End (UTC): ${istEndDate.toISOString()}`);
      console.log(`[getquery] Query: createdAt >= ${istStartDate.toISOString()} AND < ${istEndDate.toISOString()}`);
      console.log(`[getquery] ============================`);
    } else {
      // Handle dateFilter parameter (for backward compatibility)
      const today = new Date();
      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      const yesterday = subDays(today, 1);
      const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
      
      switch (dateFilter) {
        case "today":
          dateQuery = {
            createdAt: {
              $gte: getISTStartOfDay(todayStr),
              $lt: getISTEndOfDay(todayStr),
            },
          };
          break;
        case "yesterday":
          dateQuery = {
            createdAt: {
              $gte: getISTStartOfDay(yesterdayStr),
              $lt: getISTEndOfDay(yesterdayStr),
            },
          };
          break;
        case "lastDays":
          if (customDays > 0) {
            const pastDate = subDays(today, customDays);
            const pastDateStr = `${pastDate.getFullYear()}-${String(pastDate.getMonth() + 1).padStart(2, '0')}-${String(pastDate.getDate()).padStart(2, '0')}`;
            dateQuery = {
              createdAt: {
                $gte: getISTStartOfDay(pastDateStr),
              },
            };
          }
          break;
        case "customRange":
          if (startDate && endDate) {
            const istStartDate = getISTStartOfDay(startDate);
            const istEndDate = getISTEndOfDay(endDate);
            dateQuery = {
              createdAt: {
                $gte: istStartDate,
                $lt: istEndDate,
              },
            };
          }
          break;
        default:
          break;
      }
    }
    query = { ...query, ...dateQuery };

   // Handle employee filter
   // CRITICAL FIX: Handle createdBy parameter if provided (overrides default filter)
   if (createdBy) {
     // If specific employee is requested, use that
     query.createdBy = createdBy;
     console.log(`[getquery] Filtering by specific employee: ${createdBy}`);
   } else {
     // Default behavior: filter by LeadGen employees
     const leadGenEmployees = await Employee.find({ role: "LeadGen" }).select("email");
     const leadGenEmails = leadGenEmployees.map((emp) => emp.email);
     
     console.log(`[getquery] LeadGen employees found: ${leadGenEmails.length}`);
     console.log(`[getquery] User role: ${token.role}, User email: ${token.email}`);

     if(token.role === "LeadGen"){
       query.createdBy = token.email;
       console.log(`[getquery] Filtering by LeadGen user's own email: ${token.email}`);
     }
     else{
       query.createdBy = { $in: leadGenEmails };
       console.log(`[getquery] Filtering by LeadGen employees list (${leadGenEmails.length} employees)`);
     }
   }
   
   console.log(`[getquery] Final query filter:`, JSON.stringify(query, null, 2));

    // CRITICAL FIX: For date-specific queries, skip pagination to get all results
    const aggregationPipeline: any[] = [
      { $match: query },
      { $sort: { _id: -1 } },
    ];
    
    // Only apply skip/limit if NOT a date-specific query (to maintain pagination for other queries)
    if (!isDateSpecificQuery) {
      aggregationPipeline.push({ $skip: skip });
      aggregationPipeline.push({ $limit: limit });
    } else {
      // For date-specific queries, still apply a safety limit but make it very high
      aggregationPipeline.push({ $limit: Math.max(limit, 10000) });
    }
    
    aggregationPipeline.push(
      {
        $addFields: {
          istCreatedAt: {
            $dateToString: {
              date: { $add: ["$createdAt", 5.5 * 60 * 60 * 1000] },
              format: "%Y-%m-%d %H:%M:%S",
              timezone: "UTC",
            },
          },
        },
      },
    );
    
    const allquery = await Query.aggregate(aggregationPipeline);  

    // Compute WhatsApp reply status for all leads dynamically from message history
    const phoneNumbers = allquery.map((q: any) => String(q.phoneNo || "")).filter(Boolean);
    const statusMap = await batchComputeWhatsAppReplyStatus(phoneNumbers);

    // Add whatsappReplyStatus to each query
    const queriesWithStatus = allquery.map((q: any) => ({
      ...q,
      whatsappReplyStatus: statusMap.get(String(q.phoneNo || "")) || null,
    }));

    const totalQueries = await Query.countDocuments(query);
    const totalPages = Math.ceil(totalQueries / limit);
    
    console.log(`[getquery] Query results: ${queriesWithStatus.length} returned, ${totalQueries} total matches`);
    if (queriesWithStatus.length > 0) {
      console.log(`[getquery] First result createdAt: ${queriesWithStatus[0].createdAt}`);
      console.log(`[getquery] Last result createdAt: ${queriesWithStatus[queriesWithStatus.length - 1].createdAt}`);
    }

    return NextResponse.json({
      data: queriesWithStatus,
      page,
      totalPages,
      totalQueries,
    });
  } catch (error: any) {
    console.error("Error in GET request:", error);
    return NextResponse.json(
      {
        message: "Failed to fetch properties from the database",
        error: error.message,
      },
      { status: 500 }
    );
  }
}
  