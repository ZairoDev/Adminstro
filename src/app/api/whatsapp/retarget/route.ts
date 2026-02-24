import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/util/db";
import { getDataFromToken } from "@/util/getDataFromToken";
import Query from "@/models/query";
import { unregisteredOwner } from "@/models/unregisteredOwner";

connectDb();

// =========================================================
// CONFIGURATION: Retargeting Safety Limits
// =========================================================
const MAX_RETARGET_COUNT = 3; // Maximum retarget attempts per lead
const COOLDOWN_HOURS = 24;    // Hours between retarget attempts
const BLOCKING_ERROR_CODES = [131049, 131021, 131215]; // Permanent block codes

const normalizePhone = (phone: string | undefined) => {
  if (!phone) return "";
  return phone.replace(/\D/g, "");
};

/**
 * Derive retargeting state from lead data (STEP 5)
 * - PENDING: retargetCount === 0 && !blocked
 * - RETARGETED: retargetCount > 0 && !blocked
 * - BLOCKED: whatsappBlocked === true
 */
function deriveRetargetState(lead: any): "pending" | "retargeted" | "blocked" {
  if (lead.whatsappBlocked === true) return "blocked";
  if ((lead.whatsappRetargetCount || 0) > 0) return "retargeted";
  return "pending";
}

/**
 * STEP 4: Safe Retargeting Filter (NON-NEGOTIABLE)
 * =================================================
 * Fetches leads for retargeting with STRICT safety filters.
 * 
 * SAFETY RULES (ALL must be true):
 * 1. whatsappBlocked !== true
 * 2. whatsappRetargetCount < MAX_ALLOWED (3)
 * 3. whatsappLastErrorCode NOT IN [131049, 131021, 131215]
 * 4. Last retarget was more than 24 hours ago
 * 5. Lead has WhatsApp engagement (opted-in OR replied)
 * 
 * EXPLICIT EXCLUSIONS:
 * - Blocked leads (whatsappBlocked === true)
 * - Leads with blocking error codes
 * - Leads with no WhatsApp engagement ever
 * - Leads retargeted within 24h
 * - Leads at max retarget count (3)
 */
export async function POST(req: NextRequest) {
  try {
    const token = await getDataFromToken(req);
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      audience = "leads", // "leads" | "owners"
      priceFrom,
      priceTo,
      fromDate,
      toDate,
      location,
      limit = 10000, // Increased limit - no practical cap
      // Tab filter: "pending" | "retargeted" | "blocked" | "all"
      stateFilter = "all",
      // Additional filters for leads
      area,
      zone,
      metroZone,
      bookingTerm,
      propertyType,
      typeOfProperty,
      priority,
      minGuests,
      maxGuests,
      // Additional filters for owners (based on unregisteredOwner schema)
      propertyType: ownerPropertyType,
      availability: ownerAvailability,
      area: ownerArea,
    } = body || {};

    const cappedLimit = Number(limit) || 10000; // Remove practical cap

    const dateFilter: Record<string, any> = {};
    if (fromDate) {
      dateFilter.$gte = new Date(fromDate);
    }
    if (toDate) {
      const end = new Date(toDate);
      end.setHours(23, 59, 59, 999);
      dateFilter.$lte = end;
    }

    const locationFilter = location
      ? { location: { $regex: location, $options: "i" } }
      : undefined;

    // =========================================================
    // OWNERS: Fetch from unregisteredOwner with retarget tracking fields
    // Deduplicate by phoneNumber so each owner appears only once
    // =========================================================
    if (audience === "owners") {
      const matchStage: any = {
        phoneNumber: { $exists: true, $nin: [null, ""] },
      };
      if (Object.keys(dateFilter).length) {
        matchStage.createdAt = dateFilter;
      }
      if (location) {
        matchStage.location = { $regex: location, $options: "i" };
      }
      // Owner-specific filters from unregisteredOwner schema
      if (ownerPropertyType) {
        matchStage.propertyType = { $regex: ownerPropertyType, $options: "i" };
      }
      if (ownerAvailability) {
        matchStage.availability = { $regex: ownerAvailability, $options: "i" };
      }
      if (ownerArea) {
        matchStage.area = { $regex: ownerArea, $options: "i" };
      }
      
      // Apply state filter for owners
      if (stateFilter === "pending") {
        matchStage.whatsappBlocked = { $ne: true };
        matchStage.$or = [
          { whatsappRetargetCount: 0 },
          { whatsappRetargetCount: { $exists: false } },
        ];
      } else if (stateFilter === "retargeted") {
        matchStage.whatsappBlocked = { $ne: true };
        matchStage.whatsappRetargetCount = { $gte: 1 };
      } else if (stateFilter === "blocked") {
        matchStage.whatsappBlocked = true;
      }
      
      // Aggregation pipeline to deduplicate by phoneNumber
      // Use $max for retarget count to ensure we capture retargeted status across all properties
      const owners = await unregisteredOwner.aggregate([
        { $match: matchStage },
        { $sort: { whatsappRetargetCount: -1, createdAt: -1 } }, // Sort by retarget count first to prioritize retargeted entries
          {
          $group: {
            _id: "$phoneNumber", // Group by phone number
            docId: { $first: "$_id" },
            name: { $first: "$name" },
            phoneNumber: { $first: "$phoneNumber" },
            location: { $first: "$location" },
            address: { $first: "$address" },
            area: { $first: "$area" },
            propertyType: { $first: "$propertyType" },
            availability: { $first: "$availability" },
            createdAt: { $first: "$createdAt" },
            whatsappBlocked: { $max: "$whatsappBlocked" }, // Use max to catch any blocked status
            whatsappBlockReason: { $first: "$whatsappBlockReason" },
            whatsappRetargetCount: { 
              $max: {
                $ifNull: ["$whatsappRetargetCount", 0] // Treat null as 0 for max calculation
              }
            }, // Use max to get highest retarget count
            whatsappLastRetargetAt: { $max: "$whatsappLastRetargetAt" }, // Use max to get most recent retarget date
            whatsappLastErrorCode: { $first: "$whatsappLastErrorCode" },
            propertyCount: { $sum: 1 }, // Count how many properties this owner has
          },
        },
        // Ensure retargeted owners still have retargetCount >= 1 after grouping
        {
          $addFields: {
            whatsappRetargetCount: {
              $ifNull: ["$whatsappRetargetCount", 0]
            }
          }
        },
        // Post-filter: For "retargeted" state, ensure retargetCount >= 1 after grouping
        ...(stateFilter === "retargeted" ? [{
          $match: {
            whatsappRetargetCount: { $gte: 1 }
          }
        }] : []),
        { $sort: { createdAt: -1 } },
        { $limit: cappedLimit },
      ]);

      let skippedCount = 0;
      let blockedCount = 0;
      let pendingCount = 0;
      let retargetedCount = 0;
      
      const recipients = owners
        .map((o: any) => {
          const phone = normalizePhone(o.phoneNumber);
          const isValidPhone = /^[1-9][0-9]{6,14}$/.test(phone);
          
          if (!isValidPhone) {
            skippedCount++;
            return null;
          }
          
          const state = deriveRetargetState(o);
          if (state === "blocked") blockedCount++;
          if (state === "pending") pendingCount++;
          if (state === "retargeted") retargetedCount++;
          
          const retargetCount = o.whatsappRetargetCount || 0;
          const canRetarget = 
            state !== "blocked" &&
            retargetCount < MAX_RETARGET_COUNT &&
            !BLOCKING_ERROR_CODES.includes(o.whatsappLastErrorCode);
          
        return {
          id: String(o.docId),
          name: o.name || "Owner",
          phone,
          source: "owner" as const,
          createdAt: o.createdAt,
          location: o.location || "",
          address: o.address || "",
          area: o.area || "",
          propertyType: o.propertyType || "",
          availability: o.availability || "",
          propertyCount: o.propertyCount || 1,
          // Retarget-specific fields
          state,
          retargetCount,
          lastRetargetAt: o.whatsappLastRetargetAt || null,
          blocked: o.whatsappBlocked || false,
          blockReason: o.whatsappBlockReason || null,
          lastErrorCode: o.whatsappLastErrorCode || null,
          canRetarget,
        };
        })
        .filter(Boolean);



      return NextResponse.json({ 
        success: true, 
        recipients,
        meta: {
          total: owners.length,
          returned: recipients.length,
          skipped: skippedCount,
          blocked: blockedCount,
          pending: pendingCount,
          retargeted: retargetedCount,
          maxRetargetAllowed: MAX_RETARGET_COUNT,
        }
      });
    }

    // =========================================================
    // LEADS: Apply STRICT safety filters
    // =========================================================
    const leadQuery: any = {};

    // User-provided filters
    if (priceFrom) {
      leadQuery.minBudget = { $gte: Number(priceFrom) };
    }
    if (priceTo) {
      leadQuery.maxBudget = { ...(leadQuery.maxBudget || {}), $lte: Number(priceTo) };
    }
    if (Object.keys(dateFilter).length) {
      leadQuery.createdAt = dateFilter;
    }
    if (location) {
      leadQuery.location = { $regex: location, $options: "i" };
    }
    if (area) {
      leadQuery.area = { $regex: area, $options: "i" };
    }
    if (zone) {
      leadQuery.zone = zone;
    }
    if (metroZone) {
      leadQuery.metroZone = metroZone;
    }
    if (bookingTerm) {
      leadQuery.bookingTerm = bookingTerm;
    }
    if (propertyType) {
      leadQuery.propertyType = propertyType;
    }
    if (typeOfProperty) {
      leadQuery.typeOfProperty = typeOfProperty;
    }
    if (priority) {
      leadQuery.priority = priority;
    }
    if (minGuests) {
      leadQuery.guest = { $gte: Number(minGuests) };
    }
    if (maxGuests) {
      leadQuery.guest = { ...(leadQuery.guest || {}), $lte: Number(maxGuests) };
    }

    // =========================================================
    // STATE-BASED FILTERING (for UI tabs)
    // =========================================================
    if (stateFilter === "pending") {
      // PENDING: Never retargeted, not blocked
      leadQuery.whatsappBlocked = { $ne: true };
      leadQuery.$or = [
        { whatsappRetargetCount: 0 },
        { whatsappRetargetCount: { $exists: false } },
      ];
    } else if (stateFilter === "retargeted") {
      // RETARGETED: Has been retargeted at least once, not blocked
      leadQuery.whatsappBlocked = { $ne: true };
      leadQuery.whatsappRetargetCount = { $gte: 1 };
    } else if (stateFilter === "blocked") {
      // BLOCKED: Show blocked leads (read-only view)
      leadQuery.whatsappBlocked = true;
    } else {
      // "all" or "eligible" - apply SAFETY FILTERS for messaging
      
      // RULE 1: NEVER message blocked leads
      leadQuery.whatsappBlocked = { $ne: true };
      
      // RULE 2: Max retarget count check
      leadQuery.$or = [
        { whatsappRetargetCount: { $lt: MAX_RETARGET_COUNT } },
        { whatsappRetargetCount: { $exists: false } },
      ];
      
      // RULE 3: Exclude blocking error codes
      leadQuery.whatsappLastErrorCode = { $nin: BLOCKING_ERROR_CODES };
      
      // RULE 4: 24-hour cooldown on retargeting
      const cooldownDate = new Date(Date.now() - COOLDOWN_HOURS * 60 * 60 * 1000);
      leadQuery.$and = [
        {
          $or: [
            { whatsappLastRetargetAt: { $lt: cooldownDate } },
            { whatsappLastRetargetAt: null },
            { whatsappLastRetargetAt: { $exists: false } },
          ]
        }
      ];
      
      // RULE 5: Must have WhatsApp engagement
      // WHY: Don't cold-message leads who never engaged on WhatsApp
      leadQuery.$and.push({
        $or: [
          { whatsappOptIn: true },
          { firstReply: true },
        ]
      });
    }

    // Fetch leads with all retarget-related fields
    const leads = await Query.find(leadQuery)
      .sort({ createdAt: -1 })
      .limit(cappedLimit)
      .select(`
        _id name phoneNo email minBudget maxBudget createdAt area location zone metroZone
        bookingTerm propertyType typeOfProperty priority guest startDate endDate
        whatsappOptIn firstReply whatsappBlocked whatsappBlockReason
        whatsappRetargetCount whatsappLastRetargetAt whatsappLastErrorCode
      `)
      .lean();

    // Process and enrich leads
    let skippedCount = 0;
    let blockedCount = 0;
    let maxRetargetCount = 0;
    let pendingCount = 0;
    let retargetedCount = 0;

    const recipients = leads
      .map((q: any) => {
        const phone = normalizePhone(q.phoneNo);
        const isValidPhone = /^[1-9][0-9]{6,14}$/.test(phone);
        
        if (!isValidPhone) {
          skippedCount++;

          return null;
        }

        const state = deriveRetargetState(q);
        if (state === "blocked") blockedCount++;
        if (state === "pending") pendingCount++;
        if (state === "retargeted") retargetedCount++;
        
        const retargetCount = q.whatsappRetargetCount || 0;
        if (retargetCount >= MAX_RETARGET_COUNT) maxRetargetCount++;
        
        // Determine if lead can be retargeted
        const canRetarget = 
          state !== "blocked" &&
          retargetCount < MAX_RETARGET_COUNT &&
          !BLOCKING_ERROR_CODES.includes(q.whatsappLastErrorCode);
        
        return {
          id: String(q._id),
          name: q.name || "Lead",
          phone,
          email: q.email || "",
          source: "lead" as const,
          minBudget: q.minBudget,
          maxBudget: q.maxBudget,
          createdAt: q.createdAt,
          area: q.area || "",
          location: q.location || "",
          zone: q.zone || "",
          metroZone: q.metroZone || "",
          bookingTerm: q.bookingTerm || "",
          propertyType: q.propertyType || "",
          typeOfProperty: q.typeOfProperty || "",
          priority: q.priority || "",
          guest: q.guest || 0,
          startDate: q.startDate || "",
          endDate: q.endDate || "",
          // Retarget-specific fields for UI
          state,
          retargetCount,
          lastRetargetAt: q.whatsappLastRetargetAt || null,
          blocked: q.whatsappBlocked || false,
          blockReason: q.whatsappBlockReason || null,
          lastErrorCode: q.whatsappLastErrorCode || null,
          canRetarget,
          hasEngagement: q.whatsappOptIn || q.firstReply || false,
        };
      })
      .filter(Boolean);

    console.log(`📋 [AUDIT] Retarget fetch: ${recipients.length} leads, ${skippedCount} invalid, ${blockedCount} blocked, ${maxRetargetCount} at max`);

    return NextResponse.json({ 
      success: true, 
      recipients,
      meta: {
        total: leads.length,
        returned: recipients.length,
        skipped: skippedCount,
        blocked: blockedCount,
        pending: pendingCount,
        retargeted: retargetedCount,
        atMaxRetarget: maxRetargetCount,
        maxRetargetAllowed: MAX_RETARGET_COUNT,
        cooldownHours: COOLDOWN_HOURS,
      }
    });
  } catch (error: any) {
    console.error("Retarget list error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch recipients" },
      { status: 500 }
    );
  }
}

