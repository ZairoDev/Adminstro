import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/util/db";
import { getDataFromToken } from "@/util/getDataFromToken";
import Query from "@/models/query";
import Users from "@/models/user";

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
      limit = 200,
      // Tab filter: "pending" | "retargeted" | "blocked" | "all"
      stateFilter = "all",
    } = body || {};

    const cappedLimit = Math.min(Number(limit) || 200, 500);

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
      ? { address: { $regex: location, $options: "i" } }
      : undefined;

    // =========================================================
    // OWNERS: Fetch with retarget tracking fields
    // =========================================================
    if (audience === "owners") {
      const userQuery: any = { role: "Owner" };
      if (Object.keys(dateFilter).length) {
        userQuery.createdAt = dateFilter;
      }
      if (location) {
        userQuery.$or = [
          { address: { $regex: location, $options: "i" } },
          { "properties.location": { $regex: location, $options: "i" } },
        ];
      }
      
      // Apply state filter for owners
      if (stateFilter === "pending") {
        userQuery.whatsappBlocked = { $ne: true };
        userQuery.$or = [
          { whatsappRetargetCount: 0 },
          { whatsappRetargetCount: { $exists: false } },
        ];
      } else if (stateFilter === "retargeted") {
        userQuery.whatsappBlocked = { $ne: true };
        userQuery.whatsappRetargetCount = { $gte: 1 };
      } else if (stateFilter === "blocked") {
        userQuery.whatsappBlocked = true;
      }
      
      const owners = await Users.find(userQuery)
        .sort({ createdAt: -1 })
        .limit(cappedLimit)
        .select("_id name phone address createdAt whatsappBlocked whatsappBlockReason whatsappRetargetCount whatsappLastRetargetAt whatsappLastErrorCode")
        .lean();

      let skippedCount = 0;
      let blockedCount = 0;
      
      const recipients = owners
        .map((o: any) => {
          const phone = normalizePhone(o.phone);
          const isValidPhone = /^[1-9][0-9]{6,14}$/.test(phone);
          
          if (!isValidPhone) {
            skippedCount++;
            return null;
          }
          
          const state = deriveRetargetState(o);
          if (state === "blocked") blockedCount++;
          
          const retargetCount = o.whatsappRetargetCount || 0;
          const canRetarget = 
            state !== "blocked" &&
            retargetCount < MAX_RETARGET_COUNT &&
            !BLOCKING_ERROR_CODES.includes(o.whatsappLastErrorCode);
          
          return {
            id: String(o._id),
            name: o.name || "Owner",
            phone,
            source: "owner" as const,
            createdAt: o.createdAt,
            address: o.address || "",
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

      console.log(`📋 [AUDIT] Retarget owners fetch: ${recipients.length} owners, ${skippedCount} invalid, ${blockedCount} blocked`);

      return NextResponse.json({ 
        success: true, 
        recipients,
        meta: {
          total: owners.length,
          returned: recipients.length,
          skipped: skippedCount,
          blocked: blockedCount,
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
        _id name phoneNo minBudget maxBudget createdAt 
        whatsappOptIn firstReply whatsappBlocked whatsappBlockReason
        whatsappRetargetCount whatsappLastRetargetAt whatsappLastErrorCode
      `)
      .lean();

    // Process and enrich leads
    let skippedCount = 0;
    let blockedCount = 0;
    let maxRetargetCount = 0;

    const recipients = leads
      .map((q: any) => {
        const phone = normalizePhone(q.phoneNo);
        const isValidPhone = /^[1-9][0-9]{6,14}$/.test(phone);
        
        if (!isValidPhone) {
          skippedCount++;
          console.log(`⏭️ [AUDIT] Skipping lead ${q._id}: invalid phone format`);
          return null;
        }

        const state = deriveRetargetState(q);
        if (state === "blocked") blockedCount++;
        
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
          source: "lead" as const,
          minBudget: q.minBudget,
          maxBudget: q.maxBudget,
          createdAt: q.createdAt,
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

