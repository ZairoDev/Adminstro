import { NextRequest, NextResponse } from "next/server";
import { getDataFromToken } from "@/util/getDataFromToken";
import { connectDb } from "@/util/db";
import WhatsAppConversation from "@/models/whatsappConversation";
import { findOrCreateConversationWithSnapshot } from "@/lib/whatsapp/conversationHelper";
import { normalizePhone } from "@/lib/whatsapp/normalizePhone";
import {
  getAllowedPhoneIds,
  getDefaultPhoneId,
  getRetargetPhoneId,
  FULL_ACCESS_ROLES,
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
  getChannelByPhoneNumberId,
} from "@/lib/whatsapp/channelService";
import {
  assertCanInitiateGuestConversation,
} from "@/lib/whatsapp/initiationLimitService";
import { resolveLeadLinkedConversationRentalType } from "@/lib/whatsapp/rentalTypeAccess";
import {
  applyPhoneMaskToConversation,
  resolveMaskRulesForToken,
} from "@/lib/whatsapp/phoneMask";
import {
  isLeadGenInboxRestrictedRole,
  leadGenCreateHandoffFields,
} from "@/lib/whatsapp/leadGenHandoff";
import {
  getGuestOutboundStatsByConversationIds,
  mergeGuestOutboundStats,
} from "@/lib/whatsapp/guestOutboundStats";
import {
  enrichInboxConversationPage,
  applyLeadProfilePicsToInboxPage,
  fetchInboxConversationPage,
  aggregateInboxConversationCounts,
  loadGlobalArchivedConversationIds,
  scheduleConversationTypeUpdates,
  EMPTY_INBOX_CONVERSATION_COUNTS,
  type InboxConversationLean,
} from "@/lib/whatsapp/conversationsListEnrichment";
import {
  fetchUnreadInboxConversationPage,
  aggregateUnreadInboxConversationCount,
} from "@/lib/whatsapp/inboxUnreadQuery";
import { buildInboxUnreadBadgeMongoQuery } from "@/lib/whatsapp/inboxUnreadBadgeQuery";
import { isUnreadInboxLabelFilter } from "@/lib/whatsapp/crmLabels";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";

/** Cap wait time for non-critical enrichments (profile pics, guest stats). */
const ENRICHMENT_TIMEOUT_MS = 800;

async function runWithOptionalTimeout(
  task: Promise<void>,
  timeoutMs: number,
): Promise<void> {
  await Promise.race([
    task,
    new Promise<void>((resolve) => {
      setTimeout(resolve, timeoutMs);
    }),
  ]);
}

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
    // Global archive IDs only (isArchived=true — indexed, not full table scan)
    // =========================================================
    const { archivedConversationIds, archivedCount } =
      await loadGlobalArchivedConversationIds();

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

    const visibilityQuery = await buildInboxListQueryAsync(
      normalizedToken,
      inboxParams,
    );
    if (visibilityQuery._id === null) {
      return NextResponse.json({
        success: true,
        conversations: [],
        archivedCount: 0,
        counts: EMPTY_INBOX_CONVERSATION_COUNTS,
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
          counts: EMPTY_INBOX_CONVERSATION_COUNTS,
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

    const unreadInboxFilter = isUnreadInboxLabelFilter(inboxParams.labelFilter);
    const includeUnread = searchParams.get("includeUnread") === "true";

    const unreadCountPromise = includeUnread
      ? (async () => {
          const unreadCountQuery = await buildInboxUnreadBadgeMongoQuery(
            normalizedToken,
            inboxParams,
            archivedConversationIds,
            { archivedOnly, includeArchived },
          );
          if (!unreadCountQuery) return 0;
          return aggregateUnreadInboxConversationCount(
            unreadCountQuery,
            userId,
          );
        })()
      : Promise.resolve(null);

    const [conversationsRaw, tabCounts, unreadCountResult] = await Promise.all([
      unreadInboxFilter
        ? fetchUnreadInboxConversationPage(query, userId, limit)
        : fetchInboxConversationPage(query, limit),
      aggregateInboxConversationCounts(visibilityQuery),
      unreadCountPromise,
    ]);

    const counts = {
      ...tabCounts,
      ...(unreadCountResult !== null ? { unreadCount: unreadCountResult } : {}),
    };

    const hasMore = conversationsRaw.length > limit;
    const conversationsPage = (
      hasMore ? conversationsRaw.slice(0, limit) : conversationsRaw
    ) as InboxConversationLean[];

    const nextCursor =
      conversationsPage.length > 0
        ? (
            conversationsPage[conversationsPage.length - 1].lastMessageTime as
              | Date
              | undefined
          )?.toISOString() ?? null
        : null;

    const { enriched: enrichedPage, typeUpdates } =
      await enrichInboxConversationPage(conversationsPage, userId);

    scheduleConversationTypeUpdates(typeUpdates);

    const includeProfilePics = searchParams.get("profilePics") !== "false";
    const includeGuestStats = searchParams.get("guestStats") !== "false";

    let conversationsResult = unreadInboxFilter
      ? enrichedPage.filter((conv) => (conv.unreadCount || 0) > 0)
      : enrichedPage;

    if (process.env.NODE_ENV === "development" && conversationsResult[0]) {
      console.log(
        "[whatsapp/conversations] enriched fields:",
        Object.keys(conversationsResult[0]),
      );
    }

    const guestIdsForStats = conversationsResult
      .filter(
        (c) =>
          c.conversationType === "guest" && c.source !== "internal",
      )
      .map((c) => c._id);

    const nonCriticalTasks: Promise<void>[] = [];

    if (includeProfilePics) {
      nonCriticalTasks.push(
        applyLeadProfilePicsToInboxPage(conversationsResult).catch((err) => {
          console.warn("Lead profile picture enrichment failed:", err);
        }),
      );
    }

    if (includeGuestStats && guestIdsForStats.length > 0) {
      nonCriticalTasks.push(
        getGuestOutboundStatsByConversationIds(guestIdsForStats)
          .then((guestStatsMap) => {
            conversationsResult = mergeGuestOutboundStats(
              conversationsResult,
              guestStatsMap,
            ) as InboxConversationLean[];
          })
          .catch((statsErr) => {
            console.warn("Guest outbound stats aggregation failed:", statsErr);
          }),
      );
    }

    const phoneMaskRulesPromise = resolveMaskRulesForToken(token);

    if (nonCriticalTasks.length > 0) {
      await runWithOptionalTimeout(
        Promise.all(nonCriticalTasks).then(() => undefined),
        ENRICHMENT_TIMEOUT_MS,
      );
    }

    const phoneMaskRules = await phoneMaskRulesPromise;
    const maskedConversations = conversationsResult.map(
      (conv: Record<string, unknown>) =>
        applyPhoneMaskToConversation(conv, phoneMaskRules, userRole),
    );

    return NextResponse.json({
      success: true,
      conversations: maskedConversations,
      phoneMaskRules,
      archivedCount,
      counts,
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
    const normalizedPhone = normalizePhone(participantPhone);
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
    const conversationRentalType = resolveLeadLinkedConversationRentalType({
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
      if (conversationType === "guest" || conversationType === "owner" || effectiveChannelType) {
        return NextResponse.json(
          {
            error:
              resolvedLocation
                ? `No active WhatsApp channel found for location "${resolvedLocation}" (${conversationRentalType}${effectiveChannelType ? `, ${effectiveChannelType}` : ""}). Please configure a channel or select one explicitly.`
                : "Please select which WhatsApp account this contact should be created under.",
            code: "CHANNEL_NOT_FOUND",
          },
          { status: 400 },
        );
      }

      const isFullAccess = (FULL_ACCESS_ROLES as readonly string[]).includes(userRole);
      if (isFullAccess) {
        selectedPhoneId = getDefaultPhoneId(userRole, userAreas);
      } else if (allowedPhoneIds.length === 1) {
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
          { status: 400 },
        );
      }
    }

    if (!selectedPhoneId) {
      return NextResponse.json(
        { error: "No valid phone number available" },
        { status: 400 }
      );
    }

    let resolvedWhatsappChannelId: string | null =
      channelFromRouting?.channelId ?? null;
    if (!resolvedWhatsappChannelId) {
      const byPhone = await getChannelByPhoneNumberId(selectedPhoneId);
      resolvedWhatsappChannelId = byPhone?.channelId ?? null;
    }

    if (!resolvedWhatsappChannelId) {
      return NextResponse.json(
        {
          error: "No WhatsApp channel configured for the selected phone line",
          code: "CHANNEL_NOT_FOUND",
        },
        { status: 400 },
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
      whatsappChannelId: resolvedWhatsappChannelId,
    }).lean() as Record<string, unknown> | null;

    const existsInOtherAccount = !existingSameAccount
      ? Boolean(
          await WhatsAppConversation.exists({
            participantPhone: normalizedPhone,
            whatsappChannelId: { $ne: resolvedWhatsappChannelId },
            source: { $ne: "internal" },
          })
        )
      : false;

    if (!existingSameAccount && explicitType !== "owner") {
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

    if (
      existingSameAccount &&
      isLeadGenInboxRestrictedRole(userRole) &&
      (existingSameAccount as { handedToSales?: boolean }).handedToSales !== false
    ) {
      return NextResponse.json(
        {
          error:
            "This conversation belongs to the Sales team. LeadGen can only open chats they are still working on.",
          code: "HANDED_TO_SALES",
        },
        { status: 403 },
      );
    }

    // Find or create conversation with snapshot semantics.
    // This path is considered a trusted creation flow (manual / lead).
    const conversation = await findOrCreateConversationWithSnapshot({
      participantPhone: normalizedPhone,
      whatsappChannelId: resolvedWhatsappChannelId,
      businessPhoneId: selectedPhoneId,
      participantName,
      participantLocation: resolvedLocation || undefined,
      participantProfilePic: participantProfilePic || undefined,
      conversationType: explicitType,
      referenceLink,
      rentalType: conversationRentalType,
      channelType: effectiveChannelType ?? undefined,
      snapshotSource: "trusted",
      ...leadGenCreateHandoffFields(userRole),
    });

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
