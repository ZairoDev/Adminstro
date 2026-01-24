# WhatsApp Unified Search System - Complete Documentation

## 🎯 Overview

Production-grade, lightning-fast unified search system for WhatsApp chat application with sub-100ms response times. Searches intelligently across phone numbers, participant names, conversation metadata, and message content with real-time incremental results.

## ⚡ Performance Metrics

- **Target Response Time**: <100ms for typical searches
- **Maximum Response Time**: <250ms for complex multi-term searches
- **Search Timeout**: 3 seconds (returns partial results or error)
- **Rate Limiting**: 30 requests per minute per user
- **Cache TTL**: 60 seconds
- **Debounce Delay**: 300ms

## 🏗️ Architecture

### Multi-Layered Search Strategy

```
User Input → Debounce (300ms) → API Route → Parallel Queries
                                              ├─ Phone Number Search
                                              ├─ Conversation Search
                                              └─ Message Content Search
                                                      ↓
                                            Result Aggregation
                                                      ↓
                                            Relevance Ranking
                                                      ↓
                                            Cache & Return
```

### Components

1. **Backend API**: `/api/whatsapp/search`
2. **Search Utilities**: `/lib/whatsapp/searchUtils.ts`
3. **Frontend Hook**: `/hooks/useWhatsAppSearch.ts`
4. **Search Results UI**: `/components/SearchResults.tsx`
5. **Integration**: ConversationSidebar component

## 📊 Database Indexes

### WhatsAppConversation Collection

```javascript
// 1. Text search index (full-text)
{
  participantName: "text",
  participantPhone: "text",
  notes: "text"
}
// Weights: phone=10, name=5, notes=1

// 2. Phone number regex search
{ participantPhone: 1 }

// 3. Permission filtering + sorting
{ status: 1, lastMessageTime: -1, assignedAgent: 1 }

// 4. Location-based filtering
{ participantLocation: 1, status: 1 }

// 5. Tags array search
{ tags: 1 }
```

### WhatsAppMessage Collection

```javascript
// 1. Message content text search
{
  "content.text": "text",
  "content.caption": "text"
}

// 2. Conversation timeline
{ conversationId: 1, timestamp: -1 }

// 3. Type filtering (exclude reactions)
{ conversationId: 1, type: 1, timestamp: -1 }

// 4. Phone number search in messages
{ from: 1 }
{ to: 1 }

// 5. Direction + status filtering
{ direction: 1, status: 1, timestamp: -1 }
```

### Creating Indexes

```bash
# Run the index creation script
npx tsx src/scripts/createSearchIndexes.ts
```

## 🔍 Search Features

### 1. Phone Number Search (Highest Priority)

**Normalization**:
- Strips all non-digit characters: `+91-9876-543-210` → `919876543210`
- Handles formats: `+91`, `91`, `0091`, `(91)`, etc.

**Search Stages**:
1. **Exact Match**: Direct equality comparison
2. **Suffix Match**: Finds numbers ending with typed digits
3. **Contains Match**: Finds digits anywhere in number
4. **Message Mentions**: Searches message content for phone numbers

**Example**:
```
User types: "9999"
Results:
  1. Exact: +919876549999 (if exists)
  2. Suffix: +919123459999, +918765439999
  3. Contains: +919999123456
  4. Start New Chat: 9999 (if no matches)
```

### 2. Conversation Search

**Search Fields**:
- `participantName`: Case-insensitive partial matching
- `participantPhone`: Normalized phone matching
- `notes`: Agent-added metadata
- `tags`: Searchable labels
- `lastMessageContent`: Recent message preview

**Relevance Scoring**:
```typescript
Exact phone match:     100 points
Phone suffix match:     80 points
Exact name match:       90 points
Name prefix match:      70 points
Name contains match:    50 points
Notes match:            30 points
Tags match:             40 points
Last message match:     20 points
Recent (< 24h):        +10 points
Recent (< 1 week):      +5 points
```

**Result Format**:
```typescript
{
  _id: "conversationId",
  participantPhone: "+919876543210",
  participantName: "John Doe",
  participantProfilePic: "url",
  lastMessageContent: "Hello, how are you?",
  lastMessageTime: "2026-01-24T10:30:00Z",
  unreadCount: 3,
  score: 95,
  matchedIn: "name" | "phone" | "notes" | "tags" | "content"
}
```

### 3. Message Content Search

**Search Strategy**:
- Full-text search using MongoDB text indexes
- Searches `content.text` and `content.caption` fields
- Excludes `reaction` type messages
- Respects conversation permissions

**Snippet Extraction**:
- 30 characters before match
- 30 characters after match
- Adds ellipsis if truncated
- Highlights search term with `<mark>` tags

**Grouping**:
- Groups messages by conversation
- Shows up to 3 messages per conversation initially
- "Show more" button reveals additional matches
- Total match count per conversation

**Result Format**:
```typescript
{
  conversationId: "id",
  participantPhone: "+919876543210",
  participantName: "John Doe",
  participantProfilePic: "url",
  messages: [
    {
      messageId: "msgId",
      snippet: "...looking for <mark>property</mark> in...",
      timestamp: "2026-01-24T10:30:00Z",
      direction: "incoming" | "outgoing",
      type: "text",
      mediaUrl: "url" // if has media
    }
  ],
  totalMatches: 15
}
```

## 🔐 Permission System

### Role-Based Access

```typescript
// SuperAdmin: Sees everything
permissionFilter = {}

// Sales-TeamLead: Assigned + location-based
permissionFilter = {
  $or: [
    { assignedAgent: userId },
    { participantLocation: { $in: userAreas } }
  ]
}

// Sales: Only assigned conversations
permissionFilter = {
  assignedAgent: userId
}
```

### Archive Handling

- By default, excludes archived conversations
- `includeArchived=true` parameter includes them
- Archive state checked via `ConversationArchiveState` collection

## 🚀 API Usage

### Request

```http
GET /api/whatsapp/search?query=john&type=all&limit=10&offset=0&includeArchived=false
```

### Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `query` | string | required | Search term (min 1 char) |
| `type` | enum | `all` | `all`, `conversations`, `messages`, `phone` |
| `limit` | number | `10` | Results per category (1-50) |
| `offset` | number | `0` | Pagination offset |
| `conversationId` | string | - | Scope search to conversation |
| `includeArchived` | boolean | `false` | Include archived conversations |

### Response

```typescript
{
  success: true,
  query: "john",
  results: {
    phoneNumbers: [...],
    conversations: [...],
    messages: [...]
  },
  totalResults: {
    phoneNumbers: 2,
    conversations: 5,
    messages: 15,
    total: 22
  },
  searchTime: 87, // milliseconds
  cached: false
}
```

### Error Response

```typescript
{
  success: false,
  error: "Rate limit exceeded. Please try again later.",
  searchTime: 5
}
```

## 💻 Frontend Integration

### Using the Hook

```typescript
import { useWhatsAppSearch } from '@/hooks/useWhatsAppSearch';

function MyComponent() {
  const {
    query,
    results,
    totalResults,
    loading,
    error,
    searchTime,
    isSearchMode,
    search,
    clearSearch,
  } = useWhatsAppSearch({
    debounceMs: 300,
    type: "all",
    includeArchived: false,
  });

  return (
    <div>
      <input
        value={query}
        onChange={(e) => search(e.target.value)}
        placeholder="Search..."
      />
      
      {isSearchMode && (
        <SearchResults
          results={results}
          totalResults={totalResults}
          query={query}
          loading={loading}
          onSelectConversation={handleSelect}
          onStartNewChat={handleNewChat}
          onJumpToMessage={handleJumpToMessage}
          searchTime={searchTime}
        />
      )}
    </div>
  );
}
```

### Search Results Component

```typescript
<SearchResults
  results={{
    phoneNumbers: [...],
    conversations: [...],
    messages: [...]
  }}
  totalResults={{
    phoneNumbers: 2,
    conversations: 5,
    messages: 15,
    total: 22
  }}
  query="john"
  loading={false}
  onSelectConversation={(conv) => {
    // Handle conversation selection
  }}
  onStartNewChat={(phone) => {
    // Handle new chat creation
  }}
  onJumpToMessage={(convId, msgId) => {
    // Handle jump to specific message
  }}
  searchTime={87}
/>
```

## 🎨 UI/UX Features

### Search Input

- **Debounced**: 300ms delay after typing stops
- **Loading Indicator**: Spinner while searching
- **Clear Button**: X icon to clear search
- **Keyboard Navigation**: Arrow keys + Enter + Escape

### Results Display

- **Collapsible Sections**: Phone Numbers, Conversations, Messages
- **Result Counts**: Badge showing count per category
- **Highlighting**: Search terms highlighted in yellow
- **Empty States**: Friendly messages when no results
- **Performance Badge**: Shows search time if <1000ms

### Phone Number Results

- **Green WhatsApp Icon**: For existing conversations
- **Plus Icon**: For new chat suggestions
- **Status Indicator**: "Open conversation" or "Start new chat"
- **Click Action**: Opens conversation or new chat form

### Conversation Results

- **Avatar**: Profile picture or initials
- **Name + Phone**: Primary and secondary info
- **Last Message**: Truncated preview
- **Timestamp**: Relative time (e.g., "2h ago")
- **Unread Badge**: Green badge with count
- **Match Indicator**: Shows where match occurred

### Message Results

- **Grouped by Conversation**: Expandable accordion
- **Match Count Badge**: Total matches per conversation
- **Message Snippets**: Context around search term
- **Direction Badge**: "Received" or "Sent"
- **Media Indicator**: Shows if message has media
- **Jump to Message**: Opens conversation and scrolls

## 🔧 Performance Optimization

### Backend Optimizations

1. **Parallel Queries**: Execute all searches concurrently
2. **Database Indexes**: Optimized for search patterns
3. **Query Hints**: Force index usage when needed
4. **Cursor-Based Pagination**: Efficient for large result sets
5. **Connection Pooling**: Reuse MongoDB connections
6. **Timeout Handling**: 3-second limit with graceful degradation

### Caching Strategy

```typescript
// In-memory LRU cache
const searchCache = new SearchCache(100, 60000);

// Cache key format
const cacheKey = `${userId}:${query}:${type}:${limit}:${offset}:${includeArchived}`;

// Cache hit returns immediately
if (cached) {
  return { ...cached, cached: true };
}
```

### Frontend Optimizations

1. **Debouncing**: 300ms delay prevents excessive requests
2. **Request Cancellation**: Aborts previous requests
3. **Client-Side Caching**: React state caching
4. **Virtual Scrolling**: For large result sets
5. **Lazy Loading**: Message details loaded on expand
6. **Memoization**: React.memo for result components

## 📈 Monitoring & Analytics

### Metrics to Track

```typescript
// Log search performance
console.log('[Search]', {
  query,
  searchTime,
  resultCounts: totalResults,
  cached,
  userId,
});

// Track slow queries
if (searchTime > 200) {
  console.warn('[Slow Search]', {
    query,
    searchTime,
    type,
  });
}
```

### Performance Targets

| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| Average Response Time | <100ms | >200ms |
| P95 Response Time | <250ms | >500ms |
| Cache Hit Rate | >40% | <20% |
| Error Rate | <1% | >5% |
| Timeout Rate | <0.1% | >1% |

## 🐛 Troubleshooting

### Slow Searches

**Symptoms**: Search takes >250ms consistently

**Solutions**:
1. Check if indexes exist: `db.whatsapconversations.getIndexes()`
2. Verify index usage: Add `.explain()` to queries
3. Check database load: Monitor CPU/memory
4. Review query patterns: Look for missing indexes
5. Increase cache TTL: Reduce database hits

### No Results Found

**Symptoms**: Valid queries return empty results

**Solutions**:
1. Check permission filters: Verify user has access
2. Test without filters: Confirm data exists
3. Check archived state: Try `includeArchived=true`
4. Verify normalization: Check phone number format
5. Review regex patterns: Ensure proper escaping

### Rate Limiting

**Symptoms**: 429 errors after multiple searches

**Solutions**:
1. Increase rate limit: Adjust `RATE_LIMIT` constant
2. Implement user-specific limits: Based on role
3. Add exponential backoff: Client-side retry logic
4. Use Redis: For distributed rate limiting

## 🔒 Security Considerations

### Input Validation

- Minimum query length: 1 character
- Maximum query length: 100 characters
- Sanitize special regex characters
- Validate ObjectId formats
- Check type enum values

### Permission Enforcement

- **Database-Level Filtering**: Never client-side
- **Role-Based Access**: Enforced in aggregation pipeline
- **Location Filtering**: Based on user's allotted areas
- **Archived Conversations**: Respect archive state

### Rate Limiting

- **Per-User Limits**: 30 requests/minute
- **IP-Based Limits**: Consider for public APIs
- **Exponential Backoff**: Suggest to clients
- **DDoS Protection**: Use reverse proxy

## 📝 Best Practices

### For Developers

1. **Always use indexes**: Check with `.explain()`
2. **Test with real data**: Use production-like datasets
3. **Monitor performance**: Track search times
4. **Handle errors gracefully**: User-friendly messages
5. **Document changes**: Update this file

### For Users

1. **Be specific**: More specific queries are faster
2. **Use phone numbers**: Most accurate search
3. **Try different terms**: If no results, rephrase
4. **Check archived**: Toggle to include archived chats
5. **Clear search**: Use X button to reset

## 🚀 Future Enhancements

### Planned Features

- [ ] **Fuzzy Matching**: Handle typos and misspellings
- [ ] **Search Suggestions**: Auto-complete based on history
- [ ] **Advanced Filters**: Date range, message type, etc.
- [ ] **Search History**: Recent searches per user
- [ ] **Saved Searches**: Bookmark frequent queries
- [ ] **Bulk Actions**: Select multiple results
- [ ] **Export Results**: Download search results
- [ ] **Search Analytics**: Track popular queries

### Performance Improvements

- [ ] **Redis Caching**: Distributed cache layer
- [ ] **Elasticsearch**: For advanced full-text search
- [ ] **Read Replicas**: Offload search queries
- [ ] **Query Optimization**: Continuous profiling
- [ ] **CDN Caching**: For static search data

## 📚 References

- [MongoDB Text Search](https://docs.mongodb.com/manual/text-search/)
- [MongoDB Aggregation Pipeline](https://docs.mongodb.com/manual/aggregation/)
- [React Performance Optimization](https://react.dev/learn/render-and-commit)
- [Debouncing in JavaScript](https://www.freecodecamp.org/news/javascript-debounce-example/)

---

**Version**: 1.0.0  
**Last Updated**: January 24, 2026  
**Maintainer**: Development Team

