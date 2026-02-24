import { NextRequest, NextResponse } from "next/server";
import { getDataFromToken } from "@/util/getDataFromToken";
import { connectDb } from "@/util/db";
import WhatsAppMessage from "@/models/whatsappMessage";
import ConversationReadState from "@/models/conversationReadState";
import ConversationArchiveState from "@/models/conversationArchiveState";
import WhatsAppConversation from "@/models/whatsappConversation";
import Employee from "@/models/employee";
import Query from "@/models/query";
import { findOrCreateConversationWithSnapshot } from "@/lib/whatsapp/conversationHelper";
import { 
  getAllowedPhoneIds, 
  canAccessPhoneId,
  getDefaultPhoneId,
  getPhoneIdForLocation,
  getRetargetPhoneId,
  getPhoneConfigById,
  FULL_ACCESS_ROLES,
  INTERNAL_YOU_PHONE_ID,
} from "@/lib/whatsapp/config";
import { canAccessConversation } from "@/lib/whatsapp/access";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";

connectDb();


// Get all conversations (filtered by user's allowed phone IDs)
export async function GET(req: NextRequest) {
  try {
    const token = await getDataFromToken(req) as any;
    if (!token) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get user's allowed phone IDs based on role and area
    const userRole = token.role || "";
    
    // Normalize userAreas - handle string, array, or comma-separated string
    // This ensures consistent behavior between local and production environments
    let userAreas: string[] = [];
    if (token.allotedArea) {
      if (Array.isArray(token.allotedArea)) {
        userAreas = token.allotedArea.map((a: any) => String(a).trim()).filter(Boolean);
      } else if (typeof token.allotedArea === 'string') {
        // Handle comma-separated string (e.g., "athens,thessaloniki") or single string
        userAreas = token.allotedArea.split(',').map((a: any) => a.trim()).filter(Boolean);
      }
    }
    
    // Determine allowed phone IDs (not used to block access; area-based allocation is used)
    let allowedPhoneIds = getAllowedPhoneIds(userRole, userAreas);
    // Debug: log role, areas, and initial allowed phone IDs
    // console.log(`[DEBUG][conversations][GET] role=${userRole} areas=${JSON.stringify(userAreas)} allowedPhoneIdsInitial=${JSON.stringify(allowedPhoneIds)}`);

    const searchParams = req.nextUrl.searchParams;
    const retargetOnly = searchParams.get("retargetOnly") === "1" || searchParams.get("retargetOnly") === "true";

    // If client requested a specific conversation by id, return that conversation only (with access check)
    const convIdParam = searchParams.get("conversation") || searchParams.get("conversationId");
    if (convIdParam) {
      try {
        const convDoc = await WhatsAppConversation.findById(convIdParam).lean() as any;
        if (!convDoc) {
          return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
        }

        const allowed = await canAccessConversation(token, convDoc);
        if (!allowed) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        // Wrap in same response shape as list endpoint and return the phone context
        return NextResponse.json({
          success: true,
          conversations: [convDoc],
          contextPhoneId: convDoc.businessPhoneId || null,
          archivedCount: 0,
          pagination: { limit: 1, hasMore: false, nextCursor: null },
        });
      } catch (err: any) {
        console.error("Error fetching conversation by id:", err);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
      }
    }

    // Advert role: only allowed when retargetOnly=1, grant access to the retarget phone
    if (allowedPhoneIds.length === 0 && retargetOnly) {
      const retargetPhoneId = getRetargetPhoneId();
      if (retargetPhoneId) {
        allowedPhoneIds = [retargetPhoneId];
      }
    }

    // If a specific phoneId is requested and it matches the retarget phone id,
    // allow Advert to access it even when retargetOnly flag wasn't provided.
    const requestedPhoneIdParam = searchParams.get("phoneId") || "";
    if (allowedPhoneIds.length === 0 && requestedPhoneIdParam) {
      const retargetPhoneId = getRetargetPhoneId();
      if (retargetPhoneId && requestedPhoneIdParam === retargetPhoneId) {
        allowedPhoneIds = [retargetPhoneId];

      }
    }

 

    const limit = parseInt(searchParams.get("limit") || "25");
    const status = searchParams.get("status") || "active";
    const search = searchParams.get("search") || "";
    const phoneIdFilter = searchParams.get("phoneId") || ""; // Optional filter by specific phone
    const cursor = searchParams.get("cursor"); // Cursor for pagination (lastMessageTime timestamp)
    const conversationType = searchParams.get("conversationType") || ""; // Filter by owner/guest
    const includeArchived = searchParams.get("includeArchived") === "true"; // Include archived conversations
    const archivedOnly = searchParams.get("archivedOnly") === "true"; // Only archived conversations

    const userId = token.id || token._id;

    // =========================================================
    // Get global archive states (shared across all users)
    // =========================================================
    const archiveStates = await ConversationArchiveState.find({})
      .select("conversationId isArchived archivedAt archivedBy")
      .lean();

    const archiveStateMap = new Map<string, any>();
    const archivedConversationIds: mongoose.Types.ObjectId[] = [];
    
    for (const state of archiveStates) {
      archiveStateMap.set(String(state.conversationId), state);
      if (state.isArchived) {
        archivedConversationIds.push(state.conversationId);
      }
    }

    // Build query - filter by allowed phone IDs
    const query: any = { status };
    // If client requested a specific phoneId, filter by it (no global blocking)
    if (phoneIdFilter) {
      query.businessPhoneId = phoneIdFilter;
    }

    // Handle archive filtering (global archive)
    if (archivedOnly) {
      // Only show globally archived conversations
      if (archivedConversationIds.length === 0) {
        // No archived conversations - return empty result
        return NextResponse.json({
          success: true,
          conversations: [],
          archivedCount: 0,
          pagination: { limit, hasMore: false, nextCursor: null },
        });
      }
      query._id = { $in: archivedConversationIds };
    } else if (!includeArchived && archivedConversationIds.length > 0) {
      // CRITICAL: When searching, include archived conversations so they can be found
      // Search is universal - it should search across all conversations (archived and non-archived)
      // Only exclude archived conversations when NOT searching (normal inbox view)
      if (!search) {
        // Exclude archived conversations from main inbox (default behavior when not searching)
        query._id = { $nin: archivedConversationIds };
      }
      // If search is present, don't exclude archived conversations - let them appear in search results
    }

    // Filter by conversation type if provided
    if (conversationType && (conversationType === "owner" || conversationType === "guest")) {
      query.conversationType = conversationType;
    }

    // If retargetOnly, restrict to conversations flagged as retarget
    if (retargetOnly) {
      query.isRetarget = true;
    }

    // Advert should only see retarget conversations (server-enforced)
    if (userRole === "Advert") {
      query.isRetarget = true;

    }

    // Sales visibility rules: Sales must never see retarget conversations before handover
    if (userRole === "Sales") {
      // Ensure Sales only see non-retarget OR retarget conversations that have been handed to sales
      query.$and = query.$and || [];
      query.$and.push({
        $or: [
          { isRetarget: false },
          { isRetarget: true, retargetStage: "handed_to_sales" },
        ],
      });
    }
    if (search) {
      query.$or = [
        { participantPhone: { $regex: search, $options: "i" } },
        { participantName: { $regex: search, $options: "i" } },
      ];
    }

    // Cursor-based pagination: if cursor provided, fetch conversations before this timestamp
    // Note: When searching, cursor is typically not used (search resets pagination)
    if (cursor && !search) {
      const cursorDate = new Date(cursor);
      query.lastMessageTime = { $lt: cursorDate };
    }

    // Always sort by lastMessageTime descending (latest activity first)
    const conversations = await WhatsAppConversation.find(query)
      .sort({ lastMessageTime: -1 })
      .limit(limit + 1) // Fetch one extra to determine if there are more
      .lean();

    // Check if there are more conversations
    const hasMore = conversations.length > limit;
    const conversationsToReturn = hasMore ? conversations.slice(0, limit) : conversations;

    // Get the cursor for next page (last message time of the last conversation)
    const nextCursor = conversationsToReturn.length > 0
      ? conversationsToReturn[conversationsToReturn.length - 1].lastMessageTime?.toISOString()
      : null;

    // Preload per-user read state for these conversations (per-employee unread tracking)
    const conversationIds = conversationsToReturn.map((c: any) => c._id);
    const readStates = await ConversationReadState.find({
      conversationId: { $in: conversationIds },
      userId: userId,
    })
      .select("conversationId lastReadMessageId lastReadAt")
      .lean();

    const readStateMap = new Map<string, any>();
    for (const rs of readStates) {
      readStateMap.set(String(rs.conversationId), rs);
    }

    // Populate lastMessageStatus, determine conversation type, and compute per-user unreadCount
    const conversationsWithStatus = await Promise.all(
      conversationsToReturn.map(async (conv: any) => {
        if (conv.lastMessageDirection === "outgoing" && conv.lastMessageId) {
          const lastMessage = await WhatsAppMessage.findOne({
            messageId: conv.lastMessageId,
          })
            .select("status")
            .lean();
          
          if (lastMessage && typeof lastMessage === "object" && "status" in lastMessage) {
            conv.lastMessageStatus = (lastMessage as any).status;
          }
        }
        
        // Determine conversation type - always recalculate to ensure accuracy
        // Find the first outgoing message with a template
        const firstTemplateMessage = await WhatsAppMessage.findOne({
          conversationId: conv._id,
          direction: "outgoing",
          type: "template",
          templateName: { $exists: true, $ne: null },
        })
          .sort({ timestamp: 1 }) // Get the earliest template message
          .select("templateName")
          .lean() as any;
        
        let conversationType: "owner" | "guest";
        
        // If first template contains "owners_template" or starts with "owner" (case-insensitive), it's an owner conversation
        // Otherwise, it's a guest conversation
        if (firstTemplateMessage && firstTemplateMessage.templateName) {
          const templateName = String(firstTemplateMessage.templateName).toLowerCase();
          // Check if template name contains "owners_template" or starts with "owner"
          // This handles variations like "owners_template", "owners_template_1", "owner_message", etc.
          conversationType = (templateName.includes("owners_template") || templateName.startsWith("owner")) 
            ? "owner" 
            : "guest";
        } else {
          // Default to guest if no template found
          conversationType = "guest";
        }
        
        // Update conversation type in database if it has changed or doesn't exist
        if (conv.conversationType !== conversationType) {
          await WhatsAppConversation.findByIdAndUpdate(conv._id, {
            conversationType,
          }, { new: false }); // Don't return updated doc, just update
        }
        
        conv.conversationType = conversationType;

        // ---- Per-employee unread logic (WhatsApp-style) ----
        // Default to zero; we'll compute based on read state and incoming messages.
        let unreadCount = 0;
        const readState = readStateMap.get(String(conv._id));

        // Only client (incoming) messages can make a conversation unread.
        if (conv.lastMessageDirection === "incoming" && conv.lastMessageId) {
          const lastReadMessageId = readState?.lastReadMessageId;

          // If no read state exists, or the last message differs from lastReadMessageId,
          // this conversation is unread for this employee.
          if (!lastReadMessageId || lastReadMessageId !== conv.lastMessageId) {
            const msgQuery: any = {
              conversationId: conv._id,
              direction: "incoming",
            };

            // If we have a lastReadAt timestamp, only count messages after that.
            if (readState?.lastReadAt) {
              msgQuery.timestamp = { $gt: readState.lastReadAt };
            }

            unreadCount = await WhatsAppMessage.countDocuments(msgQuery);
          }
        }

        // Override stored unreadCount with per-employee value
        conv.unreadCount = unreadCount;

        // Add global archive state
        const archiveState = archiveStateMap.get(String(conv._id));
        conv.isArchivedByUser = archiveState?.isArchived || false; // Keep field name for backward compatibility
        conv.archivedAt = archiveState?.archivedAt || null;
        conv.archivedBy = archiveState?.archivedBy?.toString() || null; // Track who archived

        // Flag internal conversations
        conv.isInternal = conv.source === "internal";

        return conv;
      })
    );

    // Enrich participantProfilePic from leads (Query) when available (non-fatal)
    try {
      const participantPhones = [...new Set(conversationsWithStatus
        .filter((c: any) => c.participantPhone && c.source !== "internal")
        .map((c: any) => c.participantPhone.replace(/\D/g, "")))];
      if (participantPhones.length > 0) {
        const leads = await Query.find({
          phoneNo: { $in: participantPhones },
          profilePicture: { $exists: true, $ne: "" },
        })
          .select("phoneNo profilePicture")
          .lean();
        const phoneToProfilePic = new Map<string, string>();
        for (const lead of leads as any[]) {
          const normalized = String(lead.phoneNo || "").replace(/\D/g, "");
          if (normalized && lead.profilePicture) phoneToProfilePic.set(normalized, lead.profilePicture);
        }
        for (const conv of conversationsWithStatus as any[]) {
          if (conv.source === "internal") continue;
          const normalized = (conv.participantPhone || "").replace(/\D/g, "");
          const pic = phoneToProfilePic.get(normalized);
          if (pic) conv.participantProfilePic = pic;
        }
      }
    } catch (enrichErr) {
      console.warn("Lead profile picture enrichment failed:", enrichErr);
    }

    // =========================================================
    // Get or create "You" conversation (WhatsApp-style Message Yourself)
    // =========================================================
    let youConversation: any = null;
    try {
      // Get user's phone number from employee record
      const employee = await Employee.findById(userId).select("phone name").lean() as any;
      if (employee && employee.phone) {
        const userPhone = employee.phone.replace(/\D/g, ""); // Normalize phone
        
        // Find or create "You" conversation
        youConversation = await WhatsAppConversation.findOne({
          participantPhone: userPhone,
          source: "internal",
          businessPhoneId: INTERNAL_YOU_PHONE_ID,
        }).lean();

        if (!youConversation) {
          // Create the "You" conversation
          const newYouConv = await WhatsAppConversation.create({
            participantPhone: userPhone,
            participantName: employee.name || "You",
            businessPhoneId: INTERNAL_YOU_PHONE_ID,
            source: "internal",
            status: "active",
            unreadCount: 0,
            lastMessageTime: new Date(),
          });
          youConversation = newYouConv.toObject();
        }

        // Check if "You" conversation is globally archived
        const youArchiveState = await ConversationArchiveState.findOne({
          conversationId: youConversation._id,
          isArchived: true,
        }).lean();

        // Only include "You" conversation if not globally archived and not in archived-only view
        if (!archivedOnly && !youArchiveState) {
          // Get read state for "You" conversation
          const youReadState = await ConversationReadState.findOne({
            conversationId: youConversation._id,
            userId: new mongoose.Types.ObjectId(userId),
          }).lean();

          // Get last message for "You" conversation to set proper lastMessageTime
          const lastMessage = await WhatsAppMessage.findOne({
            conversationId: youConversation._id,
          })
            .sort({ timestamp: -1 })
            .select("timestamp content type")
            .lean() as any;

          // Calculate unread count (should always be 0 for "You" since messages are outgoing)
          youConversation.unreadCount = 0;
          youConversation.isArchivedByUser = false;
          youConversation.isInternal = true;
          youConversation.participantName = "You"; // Always show as "You"
          
          // Set last message info if exists
          if (lastMessage) {
            youConversation.lastMessageTime = lastMessage.timestamp;
            const messageContent = lastMessage.content;
            youConversation.lastMessageContent = 
              typeof messageContent === "string"
                ? messageContent
                : (messageContent?.text || messageContent?.caption || `${lastMessage.type} message`);
            youConversation.lastMessageDirection = "outgoing";
            youConversation.lastMessageStatus = undefined; // No status for internal
          }

          // Add to conversations list (at the top, like WhatsApp)
          conversationsWithStatus.unshift(youConversation);
        }
      }
    } catch (error) {
      console.error("Error getting/creating 'You' conversation:", error);
      // Continue without "You" conversation if there's an error
    }

    // NOTE: Phone configs are now loaded independently via /api/whatsapp/phone-configs
    // This endpoint only returns conversations - clean separation of concerns
    // Phone configs are source of truth, conversations consume them

    // Count archived conversations for badge display
    const archivedCount = archivedConversationIds.length;

    return NextResponse.json({
      success: true,
      conversations: conversationsWithStatus,
      archivedCount, // Number of archived conversations for this user
      pagination: {
        limit,
        hasMore,
        nextCursor,
      },
    });
  } catch (error: any) {
    console.error("Get conversations error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

// Create or get conversation
export async function POST(req: NextRequest) {
  try {
    const token = await getDataFromToken(req) as any;
    if (!token) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const {
      participantPhone,
      participantName,
      phoneNumberId,
      referenceLink,
      conversationType,
      participantLocation,
      participantProfilePic,
      location: leadLocation, // Lead's location – conversation will use the phone number assigned to this location
    } = await req.json();

    if (!participantPhone) {
      return NextResponse.json(
        { error: "Participant phone number is required" },
        { status: 400 }
      );
    }
    // E.164 validation: only digits, 7-15 digits, no leading zero
    const normalizedPhone = participantPhone.replace(/\D/g, "");
    if (!/^[1-9][0-9]{6,14}$/.test(normalizedPhone)) {
      return NextResponse.json(
        { error: "Phone number must be in E.164 format (country code + number, 7-15 digits, no leading zero)." },
        { status: 400 }
      );
    }

    // Get user's allowed phone IDs
    const userRole = token.role || "";
    
    // Normalize userAreas - handle string, array, or comma-separated string
    // This ensures consistent behavior between local and production environments
    let userAreas: string[] = [];
    if (token.allotedArea) {
      if (Array.isArray(token.allotedArea)) {
        userAreas = token.allotedArea.map((a: any) => String(a).trim()).filter(Boolean);
      } else if (typeof token.allotedArea === 'string') {
        // Handle comma-separated string (e.g., "athens,thessaloniki") or single string
        userAreas = token.allotedArea.split(',').map((a: any) => a.trim()).filter(Boolean);
      }
    }
    
    const allowedPhoneIds = getAllowedPhoneIds(userRole, userAreas);
    // Debug: log role, areas, and allowed phone IDs for POST requests


    // Prevent Sales from opening existing retarget conversations via direct create
    const existingConv = await WhatsAppConversation.findOne({
      participantPhone: normalizedPhone,
      isRetarget: true,
    }).lean() as any;
    if (existingConv && existingConv.isRetarget && (userRole === "Sales") && existingConv.retargetStage !== "handed_to_sales") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Use: explicit phoneNumberId > phone for lead's location > default
    let selectedPhoneId: string | null = null;
    if (phoneNumberId) {
      selectedPhoneId = phoneNumberId;
    } else if (leadLocation?.trim()) {
      // Use the phone number configured for this lead's location
      const phoneIdForLocation = getPhoneIdForLocation(leadLocation);
      if (phoneIdForLocation) {
        selectedPhoneId = phoneIdForLocation;
      }
    }
    // Fallback to default if no location match
    if (!selectedPhoneId) {
      selectedPhoneId = getDefaultPhoneId(userRole, userAreas);
    }

    if (!selectedPhoneId) {
      return NextResponse.json(
        { error: "No valid phone number available" },
        { status: 400 }
      );
    }

    // Verify user can access this phone ID based on area mapping or full-access role
    const phoneConfig = getPhoneConfigById(selectedPhoneId);
    const normalizedUserAreas = userAreas.map(a => a.toLowerCase());
    let phoneAllowed = false;
    if (!phoneConfig) {
      phoneAllowed = false;
    } else if ((FULL_ACCESS_ROLES as readonly string[]).includes(userRole)) {
      phoneAllowed = true;
    } else {
      const cfgAreas = Array.isArray(phoneConfig.area) ? phoneConfig.area : [phoneConfig.area];
      const normalizedCfgAreas = cfgAreas.map((a: any) => String(a).toLowerCase());
      phoneAllowed = normalizedCfgAreas.some((a: string) => normalizedUserAreas.includes(a));
    }

    if (!phoneAllowed) {
      return NextResponse.json(
        { error: "You don't have permission to use this WhatsApp number (area mismatch)" },
        { status: 403 }
      );
    }


    // Find or create conversation with snapshot semantics.
    // This path is considered a trusted creation flow (manual / lead).
    const conversation = await findOrCreateConversationWithSnapshot({
      participantPhone: normalizedPhone,
      businessPhoneId: selectedPhoneId,
      participantName,
      participantLocation,
      participantProfilePic: participantProfilePic || undefined,
      participantRole: conversationType === "owner" || conversationType === "guest"
        ? conversationType
        : undefined,
      referenceLink,
      snapshotSource: "trusted",
    });

    return NextResponse.json({
      success: true,
      conversation,
    });
  } catch (error: any) {
    console.error("Create conversation error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
