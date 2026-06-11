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
  getDefaultPhoneId,
  getRetargetPhoneId,
  FULL_ACCESS_ROLES,
  INTERNAL_YOU_PHONE_ID,
} from "@/lib/whatsapp/config";
import { canAccessConversationAsync } from "@/lib/whatsapp/access";
import {
  assertLocationAllowedForCreate,
} from "@/lib/whatsapp/locationAccess";
import {
  buildInboxListQueryAsync,
  parseInboxListParams,
} from "@/lib/whatsapp/inboxQuery";
import {
  normalizeWhatsAppToken,
  resolveAllowedPhoneIdsAsync,
} from "@/lib/whatsapp/apiContext";
import { canUserAccessPhoneId } from "@/lib/whatsapp/phoneAreaConfigService";
import {
  isLocationAllowedForPhone,
} from "@/lib/whatsapp/phoneAreaConfigService";
import {
  inferChannelTypeFromConversation,
  resolveWhatsappChannel,
} from "@/lib/whatsapp/channelService";
import {
  assertCanInitiateGuestConversation,
  recordGuestInitiation,
} from "@/lib/whatsapp/initiationLimitService";
import { resolveCreateConversationRentalType } from "@/lib/whatsapp/rentalTypeAccess";
import {
  applyPhoneMaskToConversation,
  resolveMaskRulesForToken,
} from "@/lib/whatsapp/phoneMask";
import {
  getGuestOutboundStatsByConversationIds,
  mergeGuestOutboundStats,
} from "@/lib/whatsapp/guestOutboundStats";
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

    const normalizedToken = normalizeWhatsAppToken(token);
    const userRole = normalizedToken.role || "";
    const userAreas = normalizedToken.allotedArea;
    let allowedPhoneIds = await resolveAllowedPhoneIdsAsync(normalizedToken);
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

        const allowed = await canAccessConversationAsync(token, convDoc);
        if (!allowed) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const phoneMaskRules = await resolveMaskRulesForToken(token);
        let maskedConv = applyPhoneMaskToConversation(
          convDoc,
          phoneMaskRules,
          userRole,
        ) as Record<string, unknown>;

        if (maskedConv.conversationType === "guest") {
          const statsMap = await getGuestOutboundStatsByConversationIds([
            convDoc._id as mongoose.Types.ObjectId,
          ]);
          const [withStats] = mergeGuestOutboundStats([maskedConv], statsMap);
          maskedConv = withStats as Record<string, unknown>;
        }

        return NextResponse.json({
          success: true,
          conversations: [maskedConv],
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

    const limit = parseInt(searchParams.get("limit") || "25");
    const status = searchParams.get("status") || "active";
    const search = searchParams.get("search") || "";
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

    const inboxParams = parseInboxListParams(searchParams);
    inboxParams.status = status;
    inboxParams.search = search;
    inboxParams.conversationType = conversationType;
    inboxParams.retargetOnly = retargetOnly;

    const { canAccessWhatsAppAdminQueue } = await import(
      "@/lib/whatsapp/participantLocationPrivileges"
    );
    if (
      inboxParams.adminQueue &&
      !canAccessWhatsAppAdminQueue({
        role: userRole,
        email: (token as { email?: string }).email,
        allotedArea: normalizedToken.allotedArea,
      })
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const visibilityQuery = await buildInboxListQueryAsync(normalizedToken, inboxParams);
    if (visibilityQuery._id === null) {
      return NextResponse.json({
        success: true,
        conversations: [],
        archivedCount: 0,
        pagination: { limit: 25, hasMore: false, nextCursor: null },
      });
    }

    const query: Record<string, unknown> = { ...visibilityQuery };

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
        
        // Use stored conversationType when set (migration, manual meta, create flows).
        // Only infer from first template when missing.
        let conversationType: "owner" | "guest" =
          conv.conversationType === "owner" || conv.conversationType === "guest"
            ? conv.conversationType
            : "guest";

        if (conv.conversationType !== "owner" && conv.conversationType !== "guest") {
          const firstTemplateMessage = await WhatsAppMessage.findOne({
            conversationId: conv._id,
            direction: "outgoing",
            type: "template",
            templateName: { $exists: true, $ne: null },
          })
            .sort({ timestamp: 1 })
            .select("templateName")
            .lean() as { templateName?: string } | null;

          if (firstTemplateMessage?.templateName) {
            const templateName = String(firstTemplateMessage.templateName).toLowerCase();
            conversationType =
              templateName.includes("owners_template") || templateName.startsWith("owner")
                ? "owner"
                : "guest";
          }

          if (conv.conversationType !== conversationType) {
            await WhatsAppConversation.findByIdAndUpdate(
              conv._id,
              { conversationType },
              { new: false },
            );
          }
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

    const guestIdsForStats = conversationsWithStatus
      .filter(
        (c: { conversationType?: string; source?: string }) =>
          c.conversationType === "guest" && c.source !== "internal",
      )
      .map((c: { _id: mongoose.Types.ObjectId }) => c._id);
    let conversationsWithGuestStats = conversationsWithStatus;
    try {
      const guestStatsMap = await getGuestOutboundStatsByConversationIds(guestIdsForStats);
      conversationsWithGuestStats = mergeGuestOutboundStats(
        conversationsWithStatus,
        guestStatsMap,
      );
    } catch (statsErr) {
      console.warn("Guest outbound stats aggregation failed:", statsErr);
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
          // Drop any stale internal rows (e.g. before source filter) so "You" appears once
          const youId = youConversation._id?.toString();
          for (let i = conversationsWithGuestStats.length - 1; i >= 0; i--) {
            const row = conversationsWithGuestStats[i] as {
              _id?: { toString?: () => string };
              source?: string;
              businessPhoneId?: string;
            };
            if (
              row.source === "internal" ||
              row.businessPhoneId === INTERNAL_YOU_PHONE_ID ||
              (youId && row._id?.toString?.() === youId)
            ) {
              conversationsWithGuestStats.splice(i, 1);
            }
          }
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
          conversationsWithGuestStats.unshift(youConversation);
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

    const phoneMaskRules = await resolveMaskRulesForToken(token);
    const maskedConversations = conversationsWithGuestStats.map((conv: Record<string, unknown>) =>
      applyPhoneMaskToConversation(conv, phoneMaskRules, userRole),
    );

    return NextResponse.json({
      success: true,
      conversations: maskedConversations,
      phoneMaskRules,
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
      rentalType: requestedRentalType,
      channelType: requestedChannelType,
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
    
    const allowedPhoneIds = await resolveAllowedPhoneIdsAsync({
      role: userRole,
      allotedArea: userAreas,
    });

    const resolvedLocation = (participantLocation || leadLocation || "").trim();
    const conversationRentalType = resolveCreateConversationRentalType({
      userRole,
      userRentalType: token.rentalType,
      requestedRentalType,
    });

    const explicitType =
      conversationType === "owner" || conversationType === "guest"
        ? conversationType
        : undefined;

    const effectiveChannelType = inferChannelTypeFromConversation({
      channelType: requestedChannelType ?? null,
      conversationType: explicitType ?? null,
    });

    if (explicitType && !resolvedLocation) {
      return NextResponse.json(
        { error: "Location is required when adding an owner or guest" },
        { status: 400 }
      );
    }

    // Bug 1 fix: contacts MUST be scoped to a specific WhatsApp account
    // (phone_number_id). Order of resolution:
    //   1. Explicit phoneNumberId from client (the inbox the user is viewing)
    //   2. Phone ID derived from the lead's location
    //   3. Default phone ID, ONLY if the user has exactly one allowed phone
    //      or is a full-access role. If the user can access multiple phones
    //      and did not disambiguate, reject the request so we do not silently
    //      place the contact under the wrong account.
    let selectedPhoneId: string | null = null;
    let channelFromRouting: Awaited<ReturnType<typeof resolveWhatsappChannel>> = null;

    if (resolvedLocation) {
      channelFromRouting = await resolveWhatsappChannel({
        location: resolvedLocation,
        rentalType: conversationRentalType,
        channelType: effectiveChannelType,
      });
      if (channelFromRouting?.phoneNumberId) {
        selectedPhoneId = channelFromRouting.phoneNumberId;
      }
    }

    if (!selectedPhoneId && phoneNumberId) {
      selectedPhoneId = phoneNumberId;
    }

    if (!selectedPhoneId) {
      // NOTE: The old rentalType-blind resolvePhoneIdForLocation fallback has been removed.
      // When location-based routing fails to find a channel (because rentalType/channelType
      // is not configured or no active channel exists for the triple), we now require the
      // caller to provide an explicit phoneNumberId rather than silently using whichever
      // phone happens to be first for that location.
      const isFullAccess = (FULL_ACCESS_ROLES as readonly string[]).includes(userRole);
      if (isFullAccess) {
        selectedPhoneId = getDefaultPhoneId(userRole, userAreas);
      } else if (allowedPhoneIds.length === 1) {
        // Only one possible account - safe to default.
        selectedPhoneId = allowedPhoneIds[0];
      } else {
        return NextResponse.json(
          {
            error:
              resolvedLocation
                ? `No active WhatsApp channel found for location "${resolvedLocation}" (${conversationRentalType}${effectiveChannelType ? `, ${effectiveChannelType}` : ""}). Please configure a channel or select one explicitly.`
                : "Please select which WhatsApp account this contact should be created under.",
            code: "PHONE_ID_REQUIRED",
          },
          { status: 400 }
        );
      }
    }

    if (!selectedPhoneId) {
      return NextResponse.json(
        { error: "No valid phone number available" },
        { status: 400 }
      );
    }

    // Prevent Sales from hijacking an existing retarget row on this same
    // WhatsApp account before Advert hands it over. Scoped by business phone
    // so a retarget on another line does not block creating an owner here.
    const existingRetargetSameAccount = await WhatsAppConversation.findOne({
      participantPhone: normalizedPhone,
      isRetarget: true,
      businessPhoneId: selectedPhoneId,
    }).lean() as { retargetStage?: string } | null;
    if (
      existingRetargetSameAccount &&
      userRole === "Sales" &&
      existingRetargetSameAccount.retargetStage !== "handed_to_sales"
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Verify user can access this phone (legacy area config + channel routing).
    if (
      !(await canUserAccessPhoneId(selectedPhoneId, userRole, userAreas, {
        userRentalType: token.rentalType,
      }))
    ) {
      return NextResponse.json(
        { error: "You don't have permission to use this WhatsApp number (area mismatch)" },
        { status: 403 }
      );
    }

    if (resolvedLocation) {
      try {
        assertLocationAllowedForCreate(token, resolvedLocation, selectedPhoneId);
      } catch (locErr: unknown) {
        const err = locErr as { message?: string; status?: number };
        return NextResponse.json(
          { error: err.message || "Location not allowed" },
          { status: err.status || 400 }
        );
      }
      // Channel routing already validated location + rental type; legacy path
      // still checks phone-area config.
      if (!channelFromRouting) {
        const onPhone = await isLocationAllowedForPhone(selectedPhoneId, resolvedLocation);
        if (!onPhone) {
          return NextResponse.json(
            { error: "Location is not assigned to this WhatsApp phone line" },
            { status: 400 }
          );
        }
      }
    }


    // Bug 2 fix: deduplicate BEFORE creating. If a conversation already
    // exists for this phone in the same account, just reuse it and tell
    // the client so it can open the existing chat instead of creating a
    // redundant record.
    const existingSameAccount = await WhatsAppConversation.findOne({
      participantPhone: normalizedPhone,
      businessPhoneId: selectedPhoneId,
    }).lean() as any;

    // Also detect the same phone living under a DIFFERENT WhatsApp account,
    // purely so the UI can surface an informational warning. We do NOT
    // return that conversation here because it belongs to a different
    // account - contacts are strictly scoped per account.
    const existsInOtherAccount = !existingSameAccount
      ? Boolean(
          await WhatsAppConversation.exists({
            participantPhone: normalizedPhone,
            businessPhoneId: { $ne: selectedPhoneId },
            source: { $ne: "internal" },
          })
        )
      : false;

    if (!existingSameAccount) {
      const initiationCheck = await assertCanInitiateGuestConversation({
        employeeId: String(token.id || token._id),
        userRole,
        guestPhone: normalizedPhone,
        conversationType: explicitType ?? "guest",
      });
      if (!initiationCheck.allowed) {
        return NextResponse.json(
          {
            error: initiationCheck.message,
            code: initiationCheck.code,
          },
          { status: 403 },
        );
      }
    }

    // Find or create conversation with snapshot semantics.
    // This path is considered a trusted creation flow (manual / lead).
    const conversation = await findOrCreateConversationWithSnapshot({
      participantPhone: normalizedPhone,
      businessPhoneId: selectedPhoneId,
      participantName,
      participantLocation: resolvedLocation || undefined,
      participantProfilePic: participantProfilePic || undefined,
      conversationType: explicitType,
      referenceLink,
      rentalType: conversationRentalType,
      channelType: effectiveChannelType ?? undefined,
      snapshotSource: "trusted",
    });

    if (!existingSameAccount && conversation?._id) {
      await recordGuestInitiation({
        employeeId: String(token.id || token._id),
        guestPhone: normalizedPhone,
        conversationId: String(conversation._id),
      });
    }

    return NextResponse.json({
      success: true,
      conversation,
      alreadyExisted: Boolean(existingSameAccount),
      existsInOtherAccount,
    });
  } catch (error: any) {
    console.error("Create conversation error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
