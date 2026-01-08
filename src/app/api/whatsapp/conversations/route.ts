import { NextRequest, NextResponse } from "next/server";
import { getDataFromToken } from "@/util/getDataFromToken";
import { connectDb } from "@/util/db";
import WhatsAppConversation from "@/models/whatsappConversation";
import WhatsAppMessage from "@/models/whatsappMessage";
import { 
  getAllowedPhoneIds, 
  canAccessPhoneId,
  getDefaultPhoneId,
  WHATSAPP_PHONE_CONFIGS 
} from "@/lib/whatsapp/config";

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

    // Build query - filter by allowed phone IDs
    const query: any = { 
      status,
      businessPhoneId: phoneIdFilter && allowedPhoneIds.includes(phoneIdFilter)
        ? phoneIdFilter
        : { $in: allowedPhoneIds }
    };

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

    // Populate lastMessageStatus and determine conversation type (owner/guest)
    const conversationsWithStatus = await Promise.all(
      conversations.map(async (conv: any) => {
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
        
        return conv;
      })
    );

    // Get phone configs for response
    const allowedPhoneConfigs = WHATSAPP_PHONE_CONFIGS.filter(
      config => allowedPhoneIds.includes(config.phoneNumberId)
    );

    return NextResponse.json({
      success: true,
      conversations: conversationsWithStatus,
      allowedPhoneConfigs, // Send available phone configs to frontend
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

    const { participantPhone, participantName, phoneNumberId, referenceLink, conversationType } = await req.json();

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


    // Find or create conversation
    let conversation = await WhatsAppConversation.findOne({
      participantPhone: normalizedPhone,
      businessPhoneId: selectedPhoneId,
    });

    if (!conversation) {
      conversation = await WhatsAppConversation.create({
        participantPhone: normalizedPhone,
        participantName: participantName || `+${normalizedPhone}`,
        businessPhoneId: selectedPhoneId,
        status: "active",
        unreadCount: 0,
        conversationType: conversationType || "guest", // Use provided type or default to guest
        referenceLink: referenceLink || undefined,
      });
    } else {
      // Update reference link if provided and conversation exists
      if (referenceLink) {
        conversation = await WhatsAppConversation.findByIdAndUpdate(
          conversation._id,
          { referenceLink },
          { new: true }
        );
      }
    }

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
