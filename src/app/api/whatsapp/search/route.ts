import { NextRequest, NextResponse } from "next/server";
import { getDataFromToken } from "@/util/getDataFromToken";
import { connectDb } from "@/util/db";
import WhatsAppConversation from "@/models/whatsappConversation";
import WhatsAppMessage from "@/models/whatsappMessage";
import ConversationArchiveState from "@/models/conversationArchiveState";
import mongoose from "mongoose";
import {
  normalizePhoneNumber,
  isPhoneQuery,
  generatePhoneSearchPatterns,
  calculateRelevanceScore,
  extractMessageSnippet,
  highlightSearchTerm,
  groupMessagesByConversation,
  buildPermissionFilter,
  searchCache,
} from "@/lib/whatsapp/searchUtils";

connectDb();

// Rate limiting map (in-memory, per-user)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 30; // requests per minute
const RATE_WINDOW = 60 * 1000; // 1 minute

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const userLimit = rateLimitMap.get(userId);

  if (!userLimit || now > userLimit.resetAt) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + RATE_WINDOW });
    return true;
  }

  if (userLimit.count >= RATE_LIMIT) {
    return false;
  }

  userLimit.count++;
  return true;
}

/**
 * GET /api/whatsapp/search
 * Unified search across conversations and messages
 */
export async function GET(req: NextRequest) {
  const startTime = Date.now();

  try {
    // 1. Authentication
    const token = await getDataFromToken(req) as any;
    if (!token) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const userId = token.id || token._id;

    // 2. Rate limiting
    if (!checkRateLimit(String(userId))) {
      return NextResponse.json(
        {
          success: false,
          error: "Rate limit exceeded. Please try again later.",
        },
        { status: 429 }
      );
    }

    // 3. Parse query parameters
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("query")?.trim();
    const type = searchParams.get("type") || "all"; // all, conversations, messages, phone
    const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "10"), 1), 50);
    const offset = Math.max(parseInt(searchParams.get("offset") || "0"), 0);
    const conversationId = searchParams.get("conversationId"); // For scoped search
    const includeArchived = searchParams.get("includeArchived") === "true";

    // Validate query
    if (!query || query.length < 1) {
      return NextResponse.json(
        { success: false, error: "Query parameter is required (min 1 character)" },
        { status: 400 }
      );
    }

    // Validate type
    if (!["all", "conversations", "messages", "phone"].includes(type)) {
      return NextResponse.json(
        { success: false, error: "Invalid type parameter" },
        { status: 400 }
      );
    }

    // Validate conversationId if provided
    if (conversationId && !mongoose.Types.ObjectId.isValid(conversationId)) {
      return NextResponse.json(
        { success: false, error: "Invalid conversationId" },
        { status: 400 }
      );
    }

    // 4. Check cache
    const cacheKey = `${userId}:${query}:${type}:${limit}:${offset}:${includeArchived}`;
    const cached = searchCache.get(cacheKey);
    if (cached) {
      return NextResponse.json({
        ...cached,
        cached: true,
        searchTime: Date.now() - startTime,
      });
    }

    // 5. Build permission filter
    const permissionFilter = buildPermissionFilter(token);

    // 7. Execute parallel searches based on type
    const promises: Promise<any>[] = [];

    if (type === "all" || type === "phone") {
      promises.push(searchPhoneNumbers(query, permissionFilter, limit, includeArchived));
    }

    if (type === "all" || type === "conversations") {
      promises.push(searchConversations(query, permissionFilter, limit, offset, includeArchived));
    }

    if (type === "all" || type === "messages") {
      promises.push(
        searchMessages(query, permissionFilter, limit, offset, conversationId, includeArchived)
      );
    }

    // Add timeout to all promises
    const timeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Search timeout")), 3000)
    );

    const results = await Promise.race([Promise.all(promises), timeout]);

    // 8. Structure response
    let phoneNumbers: any[] = [];
    let conversations: any[] = [];
    let messages: any[] = [];

    if (type === "all") {
      [phoneNumbers, conversations, messages] = results as [any[], any[], any[]];
    } else if (type === "phone") {
      phoneNumbers = (results as any[])[0];
    } else if (type === "conversations") {
      conversations = (results as any[])[0];
    } else if (type === "messages") {
      messages = (results as any[])[0];
    }

    const response = {
      success: true,
      query,
      results: {
        phoneNumbers,
        conversations,
        messages,
      },
      totalResults: {
        phoneNumbers: phoneNumbers.length,
        conversations: conversations.length,
        messages: messages.length,
        total: phoneNumbers.length + conversations.length + messages.length,
      },
      searchTime: Date.now() - startTime,
    };

    // 9. Cache the result
    searchCache.set(cacheKey, response);

    return NextResponse.json(response);
  } catch (error: any) {
    console.error("[Search API] Error:", error);

    return NextResponse.json(
      {
        success: false,
        error: error.message === "Search timeout" 
          ? "Search took too long. Please try a more specific query."
          : "An error occurred during search. Please try again.",
        searchTime: Date.now() - startTime,
      },
      { status: 500 }
    );
  }
}

/**
 * Search phone numbers across conversations and messages
 */
async function searchPhoneNumbers(
  query: string,
  permissionFilter: any,
  limit: number,
  includeArchived: boolean
): Promise<any[]> {
  const normalizedQuery = normalizePhoneNumber(query);
  if (!normalizedQuery) return [];

  const { exact, suffix, contains } = generatePhoneSearchPatterns(normalizedQuery);
  const results: any[] = [];

  // Build archive filter
  const archiveFilter = includeArchived
    ? {}
    : {
        $or: [
          { _id: { $nin: await getArchivedConversationIds() } },
        ],
      };

  // 1. Exact match in participantPhone
  const exactMatch: any = await WhatsAppConversation.findOne({
    ...permissionFilter,
    ...archiveFilter,
    participantPhone: { $regex: new RegExp(`^${exact}$`, "i") },
  })
    .select("participantPhone participantName participantProfilePic lastMessageTime")
    .lean()
    .exec();

  if (exactMatch) {
    results.push({
      type: "exact",
      phone: exactMatch.participantPhone,
      name: exactMatch.participantName,
      profilePic: exactMatch.participantProfilePic,
      conversationId: exactMatch._id,
      conversationExists: true,
      score: 100,
    });
  } else {
    // Number doesn't exist - suggest starting new chat
    results.push({
      type: "new",
      phone: query,
      name: null,
      profilePic: null,
      conversationId: null,
      conversationExists: false,
      score: 50,
    });
  }

  // 2. Suffix matches (e.g., searching "9999" finds "+919876549999")
  const suffixMatches: any[] = await WhatsAppConversation.find({
    ...permissionFilter,
    ...archiveFilter,
    participantPhone: suffix,
    _id: { $ne: exactMatch?._id }, // Exclude exact match
  })
    .select("participantPhone participantName participantProfilePic lastMessageTime")
    .sort({ lastMessageTime: -1 })
    .limit(limit)
    .lean()
    .exec();

  results.push(
    ...suffixMatches.map((conv: any) => ({
      type: "suffix",
      phone: conv.participantPhone,
      name: conv.participantName,
      profilePic: conv.participantProfilePic,
      conversationId: conv._id,
      conversationExists: true,
      score: 80,
    }))
  );

  // 3. Contains matches (broader search)
  if (results.length < limit) {
    const containsMatches: any[] = await WhatsAppConversation.find({
      ...permissionFilter,
      ...archiveFilter,
      participantPhone: contains,
      _id: { $nin: [exactMatch?._id, ...suffixMatches.map((c: any) => c._id)].filter(Boolean) },
    })
      .select("participantPhone participantName participantProfilePic lastMessageTime")
      .sort({ lastMessageTime: -1 })
      .limit(limit - results.length)
      .lean()
      .exec();

    results.push(
      ...containsMatches.map((conv: any) => ({
        type: "contains",
        phone: conv.participantPhone,
        name: conv.participantName,
        profilePic: conv.participantProfilePic,
        conversationId: conv._id,
        conversationExists: true,
        score: 60,
      }))
    );
  }

  return results.sort((a, b) => b.score - a.score);
}

/**
 * Search conversations by name, phone, notes, tags
 */
async function searchConversations(
  query: string,
  permissionFilter: any,
  limit: number,
  offset: number,
  includeArchived: boolean
): Promise<any[]> {
  const normalizedPhone = normalizePhoneNumber(query);
  const isPhone = isPhoneQuery(query);

  // Build archive filter
  const archivedIds = includeArchived ? [] : await getArchivedConversationIds();

  // Build search conditions
  const searchConditions: any[] = [];

  // Name search (case-insensitive)
  searchConditions.push({
    participantName: { $regex: query, $options: "i" },
  });

  // Phone search
  if (isPhone && normalizedPhone) {
    searchConditions.push({
      participantPhone: { $regex: normalizedPhone, $options: "i" },
    });
  }

  // Notes search
  searchConditions.push({
    notes: { $regex: query, $options: "i" },
  });

  // Tags search
  searchConditions.push({
    tags: { $regex: query, $options: "i" },
  });

  // Last message content
  searchConditions.push({
    lastMessageContent: { $regex: query, $options: "i" },
  });

  // Execute search
  const conversations = await WhatsAppConversation.find({
    ...permissionFilter,
    $or: searchConditions,
    ...(archivedIds.length > 0 ? { _id: { $nin: archivedIds } } : {}),
  })
    .select(
      "participantPhone participantName participantProfilePic lastMessageContent lastMessageTime lastMessageDirection unreadCount notes tags conversationType"
    )
    .sort({ lastMessageTime: -1 })
    .skip(offset)
    .limit(limit)
    .lean()
    .exec();

  // Calculate relevance scores and add match info
  return conversations.map((conv: any) => {
    const score = calculateRelevanceScore(query, conv);
    let matchedIn = "content";

    // Determine what matched
    if (conv.participantName && conv.participantName.toLowerCase().includes(query.toLowerCase())) {
      matchedIn = "name";
    } else if (normalizedPhone && normalizePhoneNumber(conv.participantPhone).includes(normalizedPhone)) {
      matchedIn = "phone";
    } else if (conv.notes && conv.notes.toLowerCase().includes(query.toLowerCase())) {
      matchedIn = "notes";
    } else if (conv.tags && conv.tags.some((t: string) => t.toLowerCase().includes(query.toLowerCase()))) {
      matchedIn = "tags";
    }

    return {
      ...conv,
      _id: conv._id.toString(),
      score,
      matchedIn,
      // Truncate last message
      lastMessageContent: conv.lastMessageContent
        ? conv.lastMessageContent.length > 50
          ? conv.lastMessageContent.substring(0, 50) + "..."
          : conv.lastMessageContent
        : null,
    };
  }).sort((a, b) => b.score - a.score);
}

/**
 * Search message content with snippets and highlighting
 */
async function searchMessages(
  query: string,
  permissionFilter: any,
  limit: number,
  offset: number,
  conversationId: string | null,
  includeArchived: boolean
): Promise<any[]> {
  // First, get accessible conversation IDs
  const archivedIds = includeArchived ? [] : await getArchivedConversationIds();
  
  const accessibleConversations = await WhatsAppConversation.find({
    ...permissionFilter,
    ...(archivedIds.length > 0 ? { _id: { $nin: archivedIds } } : {}),
  })
    .select("_id participantPhone participantName participantProfilePic")
    .lean()
    .exec();

  const conversationIds = accessibleConversations.map((c: any) => c._id);
  const conversationMap = new Map(
    accessibleConversations.map((c: any) => [c._id.toString(), c])
  );

  if (conversationIds.length === 0) return [];

  // Build message query
  const messageQuery: any = {
    conversationId: conversationId 
      ? new mongoose.Types.ObjectId(conversationId)
      : { $in: conversationIds },
    type: { $nin: ["reaction"] }, // Exclude reactions
    $or: [
      { "content.text": { $regex: query, $options: "i" } },
      { "content.caption": { $regex: query, $options: "i" } },
    ],
  };

  // Search messages
  const messages = await WhatsAppMessage.find(messageQuery)
    .select("conversationId content.text content.caption type direction timestamp mediaUrl from to")
    .sort({ timestamp: -1 })
    .skip(offset)
    .limit(limit * 3) // Fetch more to account for grouping
    .lean()
    .exec();

  // Group by conversation and create snippets
  const grouped = groupMessagesByConversation(messages);
  const results: any[] = [];

  for (const [convId, msgs] of grouped.entries()) {
    const conversation = conversationMap.get(convId);
    if (!conversation) continue;

    const groupedMessages = msgs.slice(0, 3).map((msg: any) => {
      const text = msg.content?.text || msg.content?.caption || "";
      const snippet = extractMessageSnippet(text, query);
      const highlightedSnippet = highlightSearchTerm(snippet, query);

      return {
        messageId: msg._id.toString(),
        conversationId: convId,
        snippet: highlightedSnippet,
        timestamp: msg.timestamp,
        direction: msg.direction,
        type: msg.type,
        mediaUrl: msg.mediaUrl,
        from: msg.from,
        to: msg.to,
      };
    });

    results.push({
      conversationId: convId,
      participantPhone: conversation.participantPhone,
      participantName: conversation.participantName,
      participantProfilePic: conversation.participantProfilePic,
      messages: groupedMessages,
      totalMatches: msgs.length,
    });
  }

  return results.slice(0, limit);
}

/**
 * Get archived conversation IDs
 */
async function getArchivedConversationIds(): Promise<mongoose.Types.ObjectId[]> {
  const archived = await ConversationArchiveState.find({ isArchived: true })
    .select("conversationId")
    .lean()
    .exec();

  return archived.map((a: any) => a.conversationId);
}

