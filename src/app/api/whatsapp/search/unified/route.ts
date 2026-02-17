/**
 * Unified WhatsApp Search API - Conversation-Centric Deduplication
 * Single aggregation pipeline that returns each conversation exactly once
 * with all match information aggregated
 */

import { NextRequest, NextResponse } from "next/server";
import { getDataFromToken } from "@/util/getDataFromToken";
import { connectDb } from "@/util/db";

export const dynamic = "force-dynamic";
import WhatsAppConversation from "@/models/whatsappConversation";
import { normalizePhoneNumber, isPhoneQuery } from "@/lib/whatsapp/searchUtils";
import {
  calculateUnifiedRelevanceScore,
  generateMatchContext,
  extractMessageSnippet,
  highlightSearchTerm,
  deduplicateConversations,
  normalizePhoneForDeduplication,
  type UnifiedConversationResult,
  type UnifiedSearchResults,
} from "@/lib/whatsapp/unifiedSearchUtils";

const SEARCH_TIMEOUT = 3000; // 3 seconds
const MAX_RESULTS_PER_QUERY = 50;
const MAX_MESSAGES_PER_CONVERSATION = 3; // Show top 3 message matches per conversation

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // ========================================================================
    // 1. VALIDATE REQUEST
    // ========================================================================
    
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get("query");
    const phoneIdFilter = searchParams.get("phoneId") || "";
    const limit = Math.min(
      parseInt(searchParams.get("limit") || String(MAX_RESULTS_PER_QUERY)),
      MAX_RESULTS_PER_QUERY
    );
    const includeArchived = searchParams.get("includeArchived") === "true";
    
    if (!query || query.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: "Query parameter is required" },
        { status: 400 }
      );
    }
    
    // ========================================================================
    // 2. AUTHENTICATE & AUTHORIZE
    // ========================================================================
    
    const user = await getDataFromToken(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }
    
    const userRole = user.role;
    const userAreas = user.allotedArea;
    
    // Verify WhatsApp access
    // Allow SuperAdmin / Sales roles, and allow Advert only for phone-query searches.
    const baseAccessRoles = ["SuperAdmin", "Sales-TeamLead", "Sales"];
    const hasAccess =
      baseAccessRoles.includes(userRole as string) ||
      (userRole === "Advert" && isPhoneQuery(query || ""));

    if (!hasAccess) {
      return NextResponse.json(
        { success: false, error: "No WhatsApp access" },
        { status: 403 }
      );
    }
    
    await connectDb();
    
    // ========================================================================
    // 3. PREPARE SEARCH PARAMETERS
    // ========================================================================
    
    const normalizedQuery = query.trim();
    const isPhone = isPhoneQuery(normalizedQuery);
    const normalizedPhone = isPhone ? normalizePhoneNumber(normalizedQuery) : null;
    
    // ========================================================================
    // 4. BUILD SINGLE UNIFIED AGGREGATION PIPELINE
    // ========================================================================
    
    // Permission filter
    const permissionMatch: any = {};
    
    if (userRole === "Sales") {
      permissionMatch.assignedAgent = user.email;
    } else if (userRole === "Sales-TeamLead" && userAreas) {
      const areas = Array.isArray(userAreas) ? userAreas : [userAreas];
      permissionMatch.$or = [
        { assignedAgent: user.email },
        { location: { $in: areas } },
      ];
    }
    
    // Filter by businessPhoneId if provided
    if (phoneIdFilter) {
      permissionMatch.businessPhoneId = phoneIdFilter;
    }
    
    // Status filter
    permissionMatch.status = { $in: ["active", "pending"] };
    
    // Archive filter
    if (!includeArchived) {
      permissionMatch.archived = { $ne: true };
    }
    
    // Build the aggregation pipeline
    const pipeline: any[] = [
      // Stage 1: Initial permission filter (use index)
      {
        $match: permissionMatch,
      },
      
      // Stage 2: Limit working set early for performance
      {
        $limit: 500, // Process max 500 conversations
      },
      
      // Stage 3: Add computed match fields
      {
        $addFields: {
          // Phone number matching
          phoneExactMatch: isPhone
            ? { $eq: ["$participantPhone", normalizedPhone] }
            : false,
          phoneSuffixMatch: isPhone
            ? {
                $regexMatch: {
                  input: "$participantPhone",
                  regex: `${normalizedPhone}$`,
                  options: "i",
                },
              }
            : false,
          phoneContainsMatch: isPhone
            ? {
                $regexMatch: {
                  input: "$participantPhone",
                  regex: normalizedPhone!,
                  options: "i",
                },
              }
            : false,
          
          // Name matching (case-insensitive)
          nameMatch: {
            $regexMatch: {
              input: "$participantName",
              regex: normalizedQuery,
              options: "i",
            },
          },
          
          // Notes matching
          notesMatch: {
            $regexMatch: {
              input: { $ifNull: ["$notes", ""] },
              regex: normalizedQuery,
              options: "i",
            },
          },
        },
      },
      
      // Stage 4: Lookup matching messages
      {
        $lookup: {
          from: "whatsappmessages",
          let: { convId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$conversationId", "$$convId"] },
                type: { $nin: ["reaction", "system"] },
                $or: [
                  {
                    "content.text": {
                      $regex: normalizedQuery,
                      $options: "i",
                    },
                  },
                  {
                    "content.caption": {
                      $regex: normalizedQuery,
                      $options: "i",
                    },
                  },
                ],
              },
            },
            {
              $sort: { timestamp: -1 }, // Most recent first
            },
            {
              $limit: 10, // Get top 10 message matches
            },
            {
              $project: {
                _id: 1,
                content: 1,
                timestamp: 1,
                direction: 1,
                mediaUrl: 1,
              },
            },
          ],
          as: "matchedMessages",
        },
      },
      
      // Stage 5: Filter out conversations with no matches
      {
        $match: {
          $or: [
            { phoneExactMatch: true },
            { phoneSuffixMatch: true },
            { phoneContainsMatch: true },
            { nameMatch: true },
            { notesMatch: true },
            { matchedMessages: { $ne: [] } },
          ],
        },
      },
      
      // Stage 6: Calculate relevance score
      {
        $addFields: {
          relevanceScore: {
            $add: [
              // Phone match scores
              { $cond: [{ $eq: ["$phoneExactMatch", true] }, 100, 0] },
              {
                $cond: [
                  {
                    $and: [
                      { $eq: ["$phoneExactMatch", false] },
                      { $eq: ["$phoneSuffixMatch", true] },
                    ],
                  },
                  50,
                  0,
                ],
              },
              {
                $cond: [
                  {
                    $and: [
                      { $eq: ["$phoneExactMatch", false] },
                      { $eq: ["$phoneSuffixMatch", false] },
                      { $eq: ["$phoneContainsMatch", true] },
                    ],
                  },
                  30,
                  0,
                ],
              },
              
              // Name match score
              { $cond: [{ $eq: ["$nameMatch", true] }, 40, 0] },
              
              // Message matches score (10 per match, max 30)
              {
                $min: [
                  { $multiply: [{ $size: "$matchedMessages" }, 10] },
                  30,
                ],
              },
              
              // Notes match score
              { $cond: [{ $eq: ["$notesMatch", true] }, 5, 0] },
            ],
          },
        },
      },
      
      // Stage 7: Sort by relevance and recency
      {
        $sort: {
          relevanceScore: -1,
          lastMessageTime: -1,
        },
      },
      
      // Stage 8: Limit results
      {
        $limit: limit,
      },
      
      // Stage 9: Project final shape
      {
        $project: {
          conversationId: { $toString: "$_id" },
          participantPhone: 1,
          participantName: 1,
          participantProfilePic: 1,
          lastMessageContent: 1,
          lastMessageTime: 1,
          unreadCount: 1,
          conversationType: 1,
          assignedAgent: 1,
          status: 1,
          
          // Match details
          phoneExactMatch: 1,
          phoneSuffixMatch: 1,
          phoneContainsMatch: 1,
          nameMatch: 1,
          notesMatch: 1,
          matchedMessages: 1,
          relevanceScore: 1,
          
          _id: 0,
        },
      },
    ];
    
    // ========================================================================
    // 5. EXECUTE AGGREGATION WITH TIMEOUT
    // ========================================================================
    
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Search timeout")), SEARCH_TIMEOUT)
    );
    
    const searchPromise = WhatsAppConversation.aggregate(pipeline)
      .allowDiskUse(false) // Force memory-only execution
      .exec();
    
    const rawResults = await Promise.race([searchPromise, timeoutPromise]) as any[];
    
    // ========================================================================
    // 6. TRANSFORM TO UNIFIED RESULT FORMAT
    // ========================================================================
    
    const conversations: UnifiedConversationResult[] = rawResults.map((conv) => {
      // Determine phone match type
      let phoneMatchType: 'exact' | 'suffix' | 'contains' | undefined;
      if (conv.phoneExactMatch) phoneMatchType = 'exact';
      else if (conv.phoneSuffixMatch) phoneMatchType = 'suffix';
      else if (conv.phoneContainsMatch) phoneMatchType = 'contains';
      
      // Process message matches
      const processedMessages = conv.matchedMessages.slice(0, MAX_MESSAGES_PER_CONVERSATION).map((msg: any) => {
        const text = msg.content?.text || msg.content?.caption || '';
        const snippet = extractMessageSnippet(text, normalizedQuery);
        
        return {
          messageId: msg._id.toString(),
          snippet: highlightSearchTerm(snippet, normalizedQuery),
          timestamp: msg.timestamp,
          direction: msg.direction,
          mediaUrl: msg.mediaUrl,
        };
      });
      
      const matches = {
        matchedInPhone: !!phoneMatchType,
        phoneMatchType,
        phoneMatchedText: phoneMatchType ? conv.participantPhone : undefined,
        
        matchedInName: conv.nameMatch,
        nameMatchedText: conv.nameMatch
          ? highlightSearchTerm(conv.participantName, normalizedQuery)
          : undefined,
        
        matchedInNotes: conv.notesMatch,
        notesSnippet: conv.notesMatch ? `Found in notes` : undefined,
        
        matchedMessages: processedMessages,
        totalMessageMatches: conv.matchedMessages.length,
        
        relevanceScore: conv.relevanceScore,
      };
      
      return {
        conversationId: conv.conversationId,
        participantPhone: conv.participantPhone,
        participantName: conv.participantName,
        participantProfilePic: conv.participantProfilePic,
        lastMessageContent: conv.lastMessageContent,
        lastMessageTime: conv.lastMessageTime,
        unreadCount: conv.unreadCount || 0,
        conversationType: conv.conversationType,
        assignedAgent: conv.assignedAgent,
        status: conv.status,
        
        matches,
        matchContext: generateMatchContext(matches, normalizedQuery),
      };
    });
    
    // ========================================================================
    // 7. DEDUPLICATION (SAFETY NET)
    // ========================================================================
    
    const deduplicated = deduplicateConversations(conversations);
    
    // Verify no duplicates (development assertion)
    if (process.env.NODE_ENV === 'development') {
      const ids = new Set(deduplicated.map(c => c.conversationId));
      if (ids.size !== deduplicated.length) {
        console.error('DEDUPLICATION FAILED: Found duplicate conversation IDs');
      }
    }
    
    // ========================================================================
    // 8. CHECK FOR "START NEW CHAT" OPTION
    // ========================================================================
    
    let hasStartNewChat = false;
    let startNewChatPhone: string | undefined;
    
    if (isPhone && normalizedPhone) {
      // Check if any result is an exact phone match
      const hasExactMatch = deduplicated.some(
        c => c.matches.phoneMatchType === 'exact'
      );
      
      if (!hasExactMatch) {
        hasStartNewChat = true;
        startNewChatPhone = normalizedPhone;
      }
    }
    
    // ========================================================================
    // 9. RETURN RESULTS
    // ========================================================================
    
    const searchTime = Date.now() - startTime;
    
    const response: UnifiedSearchResults = {
      conversations: deduplicated,
      totalResults: deduplicated.length,
      searchTime,
      hasStartNewChat,
      startNewChatPhone,
    };
    
    return NextResponse.json({
      success: true,
      query: normalizedQuery,
      results: response,
    });
    
  } catch (error: any) {
    console.error("Unified search error:", error);
    
    const searchTime = Date.now() - startTime;
    
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Search failed",
        searchTime,
      },
      { status: 500 }
    );
  }
}

