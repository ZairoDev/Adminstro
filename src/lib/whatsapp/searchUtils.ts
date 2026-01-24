/**
 * WhatsApp Search Utilities
 * Production-grade phone normalization, query parsing, and result ranking
 */

/**
 * Normalize phone number by stripping all non-digit characters
 * Handles international formats: +91, 91, 0091, (91), etc.
 */
export function normalizePhoneNumber(phone: string): string {
  if (!phone) return "";
  // Strip all non-digit characters
  return phone.replace(/\D/g, "");
}

/**
 * Detect if query looks like a phone number
 * Returns true if >50% of characters are digits
 */
export function isPhoneQuery(query: string): boolean {
  if (!query) return false;
  const digitCount = (query.match(/\d/g) || []).length;
  return digitCount / query.length > 0.5;
}

/**
 * Generate phone search patterns for MongoDB regex
 * Returns patterns for: exact, suffix, contains
 */
export function generatePhoneSearchPatterns(normalizedDigits: string): {
  exact: string;
  suffix: RegExp;
  contains: RegExp;
} {
  return {
    exact: normalizedDigits, // Direct equality match
    suffix: new RegExp(`${escapeRegex(normalizedDigits)}$`, "i"), // Ends with
    contains: new RegExp(escapeRegex(normalizedDigits), "i"), // Anywhere
  };
}

/**
 * Escape special regex characters
 */
export function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Calculate relevance score for search results
 * Higher score = more relevant
 */
export interface SearchMatch {
  type: "exact" | "prefix" | "suffix" | "contains" | "note" | "tag";
  field: string;
  score: number;
}

export function calculateRelevanceScore(
  query: string,
  conversation: any
): number {
  let score = 0;
  const lowerQuery = query.toLowerCase();
  const normalizedQuery = normalizePhoneNumber(query);

  // Phone number matches (highest priority)
  if (normalizedQuery) {
    const normalizedPhone = normalizePhoneNumber(conversation.participantPhone || "");
    if (normalizedPhone === normalizedQuery) {
      score += 100; // Exact phone match
    } else if (normalizedPhone.endsWith(normalizedQuery)) {
      score += 80; // Phone suffix match
    } else if (normalizedPhone.includes(normalizedQuery)) {
      score += 60; // Phone contains match
    }
  }

  // Name matches
  if (conversation.participantName) {
    const lowerName = conversation.participantName.toLowerCase();
    if (lowerName === lowerQuery) {
      score += 90; // Exact name match
    } else if (lowerName.startsWith(lowerQuery)) {
      score += 70; // Name prefix match
    } else if (lowerName.includes(lowerQuery)) {
      score += 50; // Name contains match
    }
  }

  // Notes matches
  if (conversation.notes && conversation.notes.toLowerCase().includes(lowerQuery)) {
    score += 30;
  }

  // Tags matches
  if (conversation.tags && conversation.tags.some((tag: string) => 
    tag.toLowerCase().includes(lowerQuery)
  )) {
    score += 40;
  }

  // Last message content match (lower priority)
  if (conversation.lastMessageContent && 
      conversation.lastMessageContent.toLowerCase().includes(lowerQuery)) {
    score += 20;
  }

  // Boost recent conversations
  if (conversation.lastMessageTime) {
    const hoursSinceLastMessage = 
      (Date.now() - new Date(conversation.lastMessageTime).getTime()) / (1000 * 60 * 60);
    if (hoursSinceLastMessage < 24) score += 10;
    else if (hoursSinceLastMessage < 168) score += 5; // Within a week
  }

  return score;
}

/**
 * Highlight search term in text by wrapping with <mark> tags
 */
export function highlightSearchTerm(text: string, query: string): string {
  if (!text || !query) return text || "";
  
  const regex = new RegExp(`(${escapeRegex(query)})`, "gi");
  return text.replace(regex, "<mark>$1</mark>");
}

/**
 * Extract message snippet with context around search term
 * Returns 30 chars before and after the match
 */
export function extractMessageSnippet(
  text: string,
  query: string,
  contextLength: number = 30
): string {
  if (!text || !query) return text || "";
  
  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const matchIndex = lowerText.indexOf(lowerQuery);
  
  if (matchIndex === -1) {
    // No match found, return start of text
    return text.length > contextLength * 2 
      ? text.substring(0, contextLength * 2) + "..."
      : text;
  }
  
  const start = Math.max(0, matchIndex - contextLength);
  const end = Math.min(text.length, matchIndex + query.length + contextLength);
  
  let snippet = text.substring(start, end);
  
  // Add ellipsis if truncated
  if (start > 0) snippet = "..." + snippet;
  if (end < text.length) snippet = snippet + "...";
  
  return snippet;
}

/**
 * Deduplicate search results by conversation ID
 * Keeps the highest scoring result for each conversation
 */
export function deduplicateByConversation<T extends { conversationId?: any; _id?: any; score?: number }>(
  results: T[]
): T[] {
  const seen = new Map<string, T>();
  
  for (const result of results) {
    const id = String(result.conversationId || result._id);
    const existing = seen.get(id);
    
    if (!existing || (result.score || 0) > (existing.score || 0)) {
      seen.set(id, result);
    }
  }
  
  return Array.from(seen.values());
}

/**
 * Group messages by conversation
 */
export function groupMessagesByConversation(messages: any[]): Map<string, any[]> {
  const groups = new Map<string, any[]>();
  
  for (const message of messages) {
    const convId = String(message.conversationId);
    if (!groups.has(convId)) {
      groups.set(convId, []);
    }
    groups.get(convId)!.push(message);
  }
  
  return groups;
}

/**
 * Build permission filter for MongoDB query based on user role
 */
export function buildPermissionFilter(user: any): any {
  const userId = user.id || user._id;
  const role = user.role;
  const allotedArea = user.allotedArea;

  // SuperAdmin sees everything
  if (role === "SuperAdmin") {
    return {};
  }

  // Sales-TeamLead sees their assigned conversations + conversations in their area
  if (role === "Sales-TeamLead") {
    const filter: any = {
      $or: [
        { assignedAgent: userId },
      ],
    };

    // Add location filter if user has allotted areas
    if (allotedArea && allotedArea.length > 0) {
      const areas = Array.isArray(allotedArea) ? allotedArea : [allotedArea];
      filter.$or.push({ participantLocation: { $in: areas } });
    }

    return filter;
  }

  // Sales agents see only their assigned conversations
  if (role === "Sales") {
    return { assignedAgent: userId };
  }

  // Default: no access
  return { _id: null };
}

/**
 * In-memory LRU cache for search results
 */
export class SearchCache {
  private cache: Map<string, { result: any; timestamp: number }>;
  private maxSize: number;
  private ttlMs: number;

  constructor(maxSize: number = 100, ttlMs: number = 60000) {
    this.cache = new Map();
    this.maxSize = maxSize;
    this.ttlMs = ttlMs;
  }

  get(key: string): any | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // Check if expired
    if (Date.now() - entry.timestamp > this.ttlMs) {
      this.cache.delete(key);
      return null;
    }

    // Move to end (LRU)
    this.cache.delete(key);
    this.cache.set(key, entry);
    return entry.result;
  }

  set(key: string, value: any): void {
    // Remove oldest if at capacity
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(key, {
      result: value,
      timestamp: Date.now(),
    });
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

// Global cache instance
export const searchCache = new SearchCache(100, 60000); // 100 entries, 60s TTL

