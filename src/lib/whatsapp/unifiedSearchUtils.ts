/**
 * Unified Conversation-Centric Search Utilities
 * Implements intelligent deduplication and result merging
 */

import { escapeRegex } from "./searchUtils";

// ============================================================================
// UNIFIED RESULT TYPES
// ============================================================================

export interface UnifiedSearchMatch {
  // Phone match details
  matchedInPhone: boolean;
  phoneMatchType?: 'exact' | 'suffix' | 'contains';
  phoneMatchedText?: string;
  
  // Name match details
  matchedInName: boolean;
  nameMatchedText?: string;
  
  // Notes match details
  matchedInNotes: boolean;
  notesSnippet?: string;
  
  // Message matches
  matchedMessages: Array<{
    messageId: string;
    snippet: string;
    timestamp: Date;
    direction: 'incoming' | 'outgoing';
    mediaUrl?: string;
  }>;
  totalMessageMatches: number;
  
  // Composite relevance score
  relevanceScore: number;
}

export interface UnifiedConversationResult {
  conversationId: string;
  participantPhone: string;
  participantName: string;
  participantProfilePic?: string;
  lastMessageContent?: string;
  lastMessageTime: Date;
  unreadCount: number;
  conversationType?: 'owner' | 'guest';
  assignedAgent?: string;
  status?: string;
  
  // Aggregated match information
  matches: UnifiedSearchMatch;
  
  // Human-readable match context
  matchContext: string;
}

export interface UnifiedSearchResults {
  conversations: UnifiedConversationResult[];
  totalResults: number;
  searchTime: number;
  hasStartNewChat?: boolean;
  startNewChatPhone?: string;
}

// ============================================================================
// RELEVANCE SCORING
// ============================================================================

export function calculateUnifiedRelevanceScore(matches: {
  phoneMatch?: 'exact' | 'suffix' | 'contains';
  nameMatch?: boolean;
  notesMatch?: boolean;
  messageMatchCount?: number;
}): number {
  let score = 0;
  
  // Phone match scoring (highest priority)
  if (matches.phoneMatch === 'exact') score += 100;
  else if (matches.phoneMatch === 'suffix') score += 50;
  else if (matches.phoneMatch === 'contains') score += 30;
  
  // Name match scoring
  if (matches.nameMatch) score += 40;
  
  // Message matches (10 points each, max 30)
  if (matches.messageMatchCount) {
    score += Math.min(matches.messageMatchCount * 10, 30);
  }
  
  // Notes match scoring
  if (matches.notesMatch) score += 5;
  
  return score;
}

// ============================================================================
// MATCH CONTEXT GENERATION
// ============================================================================

export function generateMatchContext(matches: UnifiedSearchMatch, query: string): string {
  const contexts: string[] = [];
  
  // Phone match context (highest priority)
  if (matches.matchedInPhone) {
    if (matches.phoneMatchType === 'exact') {
      contexts.push('Exact phone match');
    } else if (matches.phoneMatchType === 'suffix') {
      contexts.push(`Phone ends with ${query}`);
    } else {
      contexts.push('Phone number matches');
    }
  }
  
  // Name match context
  if (matches.matchedInName) {
    contexts.push(`Name contains '${matches.nameMatchedText || query}'`);
  }
  
  // Message match context
  if (matches.totalMessageMatches > 0) {
    if (matches.totalMessageMatches === 1) {
      contexts.push('1 message mentions this');
    } else {
      contexts.push(`${matches.totalMessageMatches} messages mention this`);
    }
  }
  
  // Notes match context
  if (matches.matchedInNotes) {
    contexts.push('Found in notes');
  }
  
  return contexts.join(' • ');
}

// ============================================================================
// MESSAGE SNIPPET EXTRACTION
// ============================================================================

export function extractMessageSnippet(
  messageText: string,
  searchTerm: string,
  beforeChars: number = 30,
  afterChars: number = 50
): string {
  if (!messageText || !searchTerm) return messageText || '';
  
  const lowerText = messageText.toLowerCase();
  const lowerTerm = searchTerm.toLowerCase();
  const matchIndex = lowerText.indexOf(lowerTerm);
  
  if (matchIndex === -1) return messageText.substring(0, beforeChars + afterChars) + '...';
  
  const startIndex = Math.max(0, matchIndex - beforeChars);
  const endIndex = Math.min(messageText.length, matchIndex + searchTerm.length + afterChars);
  
  let snippet = messageText.substring(startIndex, endIndex);
  
  // Add ellipsis
  if (startIndex > 0) snippet = '...' + snippet;
  if (endIndex < messageText.length) snippet = snippet + '...';
  
  return snippet;
}

// ============================================================================
// HIGHLIGHTING
// ============================================================================

export function highlightSearchTerm(text: string, searchTerm: string): string {
  if (!text || !searchTerm) return text || '';
  
  const escapedTerm = escapeRegex(searchTerm);
  const regex = new RegExp(`(${escapedTerm})`, 'gi');
  
  return text.replace(regex, '<mark>$1</mark>');
}

// ============================================================================
// DEDUPLICATION
// ============================================================================

export function deduplicateConversations(
  conversations: UnifiedConversationResult[]
): UnifiedConversationResult[] {
  const seen = new Map<string, UnifiedConversationResult>();
  
  for (const conv of conversations) {
    const existing = seen.get(conv.conversationId);
    
    if (!existing) {
      seen.set(conv.conversationId, conv);
    } else {
      // Merge matches if somehow we got duplicates
      const merged = mergeConversationMatches(existing, conv);
      seen.set(conv.conversationId, merged);
    }
  }
  
  return Array.from(seen.values());
}

function mergeConversationMatches(
  conv1: UnifiedConversationResult,
  conv2: UnifiedConversationResult
): UnifiedConversationResult {
  return {
    ...conv1,
    matches: {
      matchedInPhone: conv1.matches.matchedInPhone || conv2.matches.matchedInPhone,
      phoneMatchType: conv1.matches.phoneMatchType || conv2.matches.phoneMatchType,
      phoneMatchedText: conv1.matches.phoneMatchedText || conv2.matches.phoneMatchedText,
      
      matchedInName: conv1.matches.matchedInName || conv2.matches.matchedInName,
      nameMatchedText: conv1.matches.nameMatchedText || conv2.matches.nameMatchedText,
      
      matchedInNotes: conv1.matches.matchedInNotes || conv2.matches.matchedInNotes,
      notesSnippet: conv1.matches.notesSnippet || conv2.matches.notesSnippet,
      
      matchedMessages: [
        ...conv1.matches.matchedMessages,
        ...conv2.matches.matchedMessages
      ].slice(0, 10), // Keep top 10
      
      totalMessageMatches: conv1.matches.totalMessageMatches + conv2.matches.totalMessageMatches,
      
      relevanceScore: Math.max(conv1.matches.relevanceScore, conv2.matches.relevanceScore),
    },
    matchContext: generateMatchContext(
      {
        ...conv1.matches,
        matchedInPhone: conv1.matches.matchedInPhone || conv2.matches.matchedInPhone,
        matchedInName: conv1.matches.matchedInName || conv2.matches.matchedInName,
        matchedInNotes: conv1.matches.matchedInNotes || conv2.matches.matchedInNotes,
        totalMessageMatches: conv1.matches.totalMessageMatches + conv2.matches.totalMessageMatches,
      } as UnifiedSearchMatch,
      ''
    ),
  };
}

// ============================================================================
// PHONE NUMBER NORMALIZATION
// ============================================================================

export function normalizePhoneForDeduplication(phone: string): string {
  if (!phone) return '';
  
  // Remove all non-digit characters
  let normalized = phone.replace(/\D/g, '');
  
  // Remove common country codes to deduplicate 9999999999, 919999999999, +919999999999
  // This helps ensure all variations of the same number are treated as one
  if (normalized.startsWith('91') && normalized.length > 10) {
    // Check if removing 91 gives us a valid 10-digit Indian number
    const without91 = normalized.substring(2);
    if (without91.length === 10) {
      normalized = without91;
    }
  }
  
  return normalized;
}

