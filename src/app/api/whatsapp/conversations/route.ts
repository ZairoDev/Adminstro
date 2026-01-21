import { NextRequest, NextResponse } from "next/server";
import { getDataFromToken } from "@/util/getDataFromToken";
import { connectDb } from "@/util/db";
import WhatsAppMessage from "@/models/whatsappMessage";
import ConversationReadState from "@/models/conversationReadState";
import ConversationArchiveState from "@/models/conversationArchiveState";
import WhatsAppConversation from "@/models/whatsappConversation";
import Employee from "@/models/employee";
import { findOrCreateConversationWithSnapshot } from "@/lib/whatsapp/conversationHelper";
import { 
  getAllowedPhoneIds, 
  canAccessPhoneId,
  getDefaultPhoneId,
  WHATSAPP_PHONE_CONFIGS,
  getAllowedPhoneConfigs,
  INTERNAL_YOU_PHONE_ID,
} from "@/lib/whatsapp/config";
import { syncPhoneConfigsWithMeta } from "@/lib/whatsapp/phoneMetadataSync";
import mongoose from "mongoose";

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
    const userAreas = token.allotedArea || [];
    const allowedPhoneIds = getAllowedPhoneIds(userRole, userAreas);

    if (allowedPhoneIds.length === 0) {
      return NextResponse.json(
        { error: "No WhatsApp access for your role/area" },
        { status: 403 }
      );
    }

    const searchParams = req.nextUrl.searchParams;
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
    const query: any = { 
      status,
      businessPhoneId: phoneIdFilter && allowedPhoneIds.includes(phoneIdFilter)
        ? phoneIdFilter
        : { $in: allowedPhoneIds }
    };

    // Handle archive filtering (global archive)
    if (archivedOnly) {
      // Only show globally archived conversations
      if (archivedConversationIds.length === 0) {
        // Sync with Meta API - Meta is the ONLY source of truth
        const localPhoneConfigs = getAllowedPhoneConfigs(userRole, userAreas);
        const syncedPhoneConfigs = await syncPhoneConfigsWithMeta(localPhoneConfigs);
        
        return NextResponse.json({
          success: true,
          conversations: [],
          allowedPhoneConfigs: syncedPhoneConfigs,
          pagination: { limit, hasMore: false, nextCursor: null },
        });
      }
      query._id = { $in: archivedConversationIds };
    } else if (!includeArchived && archivedConversationIds.length > 0) {
      // Exclude archived conversations from main inbox (default behavior)
      query._id = { $nin: archivedConversationIds };
    }

    // Filter by conversation type if provided
    if (conversationType && (conversationType === "owner" || conversationType === "guest")) {
      query.conversationType = conversationType;
    }

    // Cursor-based pagination: if cursor provided, fetch conversations before this timestamp
    if (cursor) {
      const cursorDate = new Date(cursor);
      query.lastMessageTime = { $lt: cursorDate };
    }

    // Search filter (applied on frontend for infinite scroll, but can be used here too)
    // Note: For infinite scroll, we typically don't apply search on backend to maintain cursor consistency
    // But we'll support it for initial load
    if (search && !cursor) {
      query.$or = [
        { participantPhone: { $regex: search, $options: "i" } },
        { participantName: { $regex: search, $options: "i" } },
      ];
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

    // Get phone configs for response (exclude internal "You" from phone selection)
    // Internal "You" is handled automatically, not as a selectable phone number
    // CRITICAL: Sync with Meta API - Meta is the ONLY source of truth for phone metadata
    const localPhoneConfigs = getAllowedPhoneConfigs(userRole, userAreas);
    const allowedPhoneConfigs = await syncPhoneConfigsWithMeta(localPhoneConfigs);

    // Count archived conversations for badge display
    const archivedCount = archivedConversationIds.length;

    return NextResponse.json({
      success: true,
      conversations: conversationsWithStatus,
      allowedPhoneConfigs, // Send available phone configs to frontend (including internal)
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
    const userAreas = token.allotedArea || [];
    const allowedPhoneIds = getAllowedPhoneIds(userRole, userAreas);

    if (allowedPhoneIds.length === 0) {
      return NextResponse.json(
        { error: "No WhatsApp access for your role/area" },
        { status: 403 }
      );
    }

    // Use provided phoneNumberId or default to first allowed
    const selectedPhoneId = phoneNumberId && allowedPhoneIds.includes(phoneNumberId)
      ? phoneNumberId
      : getDefaultPhoneId(userRole, userAreas);

    if (!selectedPhoneId) {
      return NextResponse.json(
        { error: "No valid phone number available" },
        { status: 400 }
      );
    }

    // Verify user can access this phone ID
    if (!canAccessPhoneId(selectedPhoneId, userRole, userAreas)) {
      return NextResponse.json(
        { error: "You don't have permission to use this WhatsApp number" },
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
