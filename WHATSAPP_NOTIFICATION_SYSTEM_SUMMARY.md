# WhatsApp & Notification System - Complete Summary

## 🏗️ Architecture Overview

The system uses a **per-user read state** model where:
- **Messages are global** (immutable, stored once)
- **Read state is per-user** (each employee has their own read/unread state)
- **Notifications are per-user events** (emitted only to users who haven't read)

---

## 📥 Backend Flow: Incoming Message Processing

### 1. Webhook Receives Message (`/api/whatsapp/webhook`)

When WhatsApp sends a webhook for an incoming message:

1. **Message Extraction**
   - Extracts `message.id` (wamid) as `rawMessageId` - **CRITICAL: This is the unique identifier**
   - Validates phone number (E.164 format)
   - Extracts message content (text, media, buttons, interactive)

2. **Conversation Management**
   - Finds or creates `WhatsAppConversation` based on `participantPhone` + `businessPhoneId`
   - Updates conversation metadata (lastMessageId, lastMessageTime, etc.)
   - **NO global unreadCount** - that's per-user now

3. **Automation Logic** (Runs BEFORE deduplication)
   - Detects "Yes, I'm Interested" button clicks
   - Sends `guest_questions` template automatically
   - Runs even on duplicate webhooks (ensures automation always works)

4. **Atomic Message Insertion** (Deduplication)
   ```typescript
   try {
     savedMessage = await WhatsAppMessage.create({
       messageId: rawMessageId,  // Uses message.id (wamid), NOT context.id
       conversationId: conversation._id,
       // ... other fields
     });
     isNewMessage = true;  // Insert succeeded = NEW message
   } catch (err) {
     if (err.code === 'E11000') {
       // Duplicate key error = message already exists
       isNewMessage = false;
       return;  // STOP - no side effects
     }
   }
   ```
   - Uses MongoDB unique index on `{ messageId, businessPhoneId }`
   - If insert succeeds → message is NEW
   - If insert fails (E11000) → message is DUPLICATE → **STOP (zero side effects)**

5. **Per-User Notification Emission** (Only if `isNewMessage === true`)
   - Gets all eligible users via `getEligibleUsersForNotification()`
   - For each eligible user:
     - Checks their `ConversationReadState` for this conversation
     - If `message.timestamp > lastReadAt` → user hasn't read → emit notification
     - If `message.timestamp <= lastReadAt` → user already read → skip
   - Generates stable `eventId = ${conversationId}:${messageId}:${userId}`
   - Emits socket event `whatsapp-new-message` with:
     ```typescript
     {
       eventId,              // For deduplication
       conversationId,
       userId,              // Target user
       message: { ... },
       participantName,
       lastMessagePreview,
       // ...
     }
     ```

---

## 👥 User Eligibility System

### `getEligibleUsersForNotification()` Logic

Determines which employees should receive notifications for a conversation:

1. **SuperAdmin/Admin/Developer**
   - Always eligible (full access)

2. **Sales Role**
   - Eligible if:
     - Conversation is assigned to them (`assignedAgent === userId`), OR
     - Conversation is unassigned (`assignedAgent === null`)
     - AND user has access to the phone's area

3. **Sales-TeamLead/LeadGen-TeamLead/LeadGen**
   - Eligible if user has access to the phone's area (location-based)

4. **Location Filtering**
   - Uses `getAllowedPhoneIds(role, allotedArea)` to check area access
   - Each phone number is mapped to an area (athens, thessaloniki, crete, all)

---

## 📖 Per-User Read State System

### `ConversationReadState` Model

```typescript
{
  conversationId: ObjectId,
  userId: ObjectId,           // Employee ID
  lastReadMessageId: string, // Last read message's wamid
  lastReadAt: Date           // Timestamp of last read
}
```

- **Unique index** on `{ conversationId, userId }` (one read state per user per conversation)
- Tracks when each employee last read each conversation
- Used to determine if a notification should be emitted

### Mark as Read (`/api/whatsapp/conversations/read`)

When a user opens a conversation:
1. Finds latest incoming message in conversation
2. Upserts `ConversationReadState` with:
   - `lastReadMessageId` = latest message's wamid
   - `lastReadAt` = current timestamp
3. Emits `whatsapp-conversation-read` socket event (to that user only)

---

## 🔔 Frontend Notification System

### Socket Connection

- Client joins `join-whatsapp-room` on connection
- Listens for `whatsapp-new-message` events
- **Critical**: Socket listeners use empty dependency arrays `[]` to prevent re-attachment

### Notification Handler (`handleWhatsAppMessage`)

1. **User Filtering**
   - Checks if `data.userId === currentUserId`
   - Only processes notifications meant for current user

2. **Event Deduplication** (Synchronous, using ref)
   ```typescript
   if (seenEventIdsRef.current.has(eventId)) {
     return;  // Already processed
   }
   seenEventIdsRef.current.add(eventId);  // Mark as seen immediately
   ```
   - Uses `useRef` for synchronous checks (prevents race conditions)
   - Keeps last 1000 event IDs (prevents memory leak)

3. **Message Deduplication**
   - Checks if message ID already exists in existing notification
   - Prevents duplicate messages in grouped notifications

4. **Location/Role Filtering** (Double-check)
   - Sales users: only assigned conversations
   - Location-based filtering for other roles

5. **Mute Check**
   - Skips if conversation is muted (stored in localStorage)

6. **Notification Normalization**
   - Converts to `UnifiedNotification` format
   - Groups WhatsApp messages by `conversationId` (within 10s window)

---

## 🎨 Notification Display & Queue Engine

### Queue Engine Configuration

```typescript
{
  maxVisible: 4,              // Max 4 notifications on screen
  minVisibleDurationMs: 0,     // No minimum duration
  groupWindowMs: 10000         // 10s window for WhatsApp grouping
}
```

### Notification Stacking

- Multiple messages from same conversation within 10 seconds → grouped into one notification
- Shows: "3 new messages from John"
- Updates existing notification in-place (no flickering)

### Auto-Dismiss (Inactivity-Based)

- **6 seconds of inactivity** → auto-dismiss
- **Interaction tracking**:
  - `onMouseEnter` → resets timer
  - `onMouseMove` → resets timer
  - `onClick` → resets timer
- **Critical notifications** never auto-dismiss
- Checks every 500ms for inactive notifications

### Visibility Management

- Max 4 notifications visible at once
- Queue engine manages order and visibility
- Dismissed notifications can be revived by new messages in same conversation

---

## 🧹 Clear Notifications

### `/api/whatsapp/notifications/clear`

- **UI-only** (does NOT affect read state)
- Supports:
  - `{ conversationId }` → clear one conversation
  - `{ clearAll: true }` → clear all (SuperAdmin only)
- Emits `whatsapp-notifications-cleared` socket event
- Frontend removes notifications from visible/queue

---

## 🔒 Key Design Principles

### 1. Atomic Operations
- Message insertion is atomic (MongoDB unique index)
- Deduplication determined by insert success/failure
- No race conditions

### 2. Per-User State
- Read state is per-user (not global)
- Notifications are per-user events
- Each employee sees their own unread state

### 3. Event-Driven Notifications
- Notifications = events (happen once)
- Read state = state (can be fetched many times)
- Never mix these concepts

### 4. Deduplication Layers
- **Backend**: Atomic insert (prevents duplicate DB entries)
- **Frontend**: `eventId` deduplication (prevents duplicate UI)
- **Message-level**: Message ID check (prevents duplicate in groups)

### 5. No Jitter Guarantees
- Socket listeners never re-attach (empty dependency arrays)
- Handlers use refs for stable references
- Synchronous deduplication checks
- No replay from fetch/summary APIs

---

## 📊 Data Flow Diagram

```
WhatsApp Webhook
    ↓
Extract message.id (wamid)
    ↓
Run Automation Logic (before deduplication)
    ↓
Atomic Insert: WhatsAppMessage.create()
    ↓
    ├─ Success → isNewMessage = true
    │   ↓
    │   Get Eligible Users
    │   ↓
    │   For each user:
    │   ├─ Check ConversationReadState
    │   ├─ If unread → Emit notification (eventId)
    │   └─ If read → Skip
    │
    └─ E11000 Error → isNewMessage = false → STOP
```

```
Socket Event (whatsapp-new-message)
    ↓
Frontend Handler
    ↓
Check userId match
    ↓
Check eventId deduplication (ref)
    ↓
Check message ID deduplication
    ↓
Normalize & Add to Queue
    ↓
Display (max 4 visible)
    ↓
Auto-dismiss after 6s inactivity
```

---

## 🎯 Success Criteria

✅ **Correct unread state per employee**
- Each employee sees their own read/unread state
- Multiple employees can view same conversation independently

✅ **No missed notifications**
- Atomic insert ensures messages are saved
- Per-user read state ensures notifications are emitted correctly
- Event deduplication prevents duplicates

✅ **No jitter/flickering**
- Socket listeners never re-attach
- Synchronous deduplication
- In-place updates for grouped messages

✅ **Scales to any number of employees**
- Per-user read state (not global counters)
- Efficient queries with indexes
- No performance degradation with more users

---

## 🔧 Key Files

- **Backend**:
  - `src/app/api/whatsapp/webhook/route.ts` - Message processing & notification emission
  - `src/app/api/whatsapp/conversations/read/route.ts` - Mark as read
  - `src/app/api/whatsapp/notifications/clear/route.ts` - Clear notifications (UI-only)
  - `src/models/conversationReadState.ts` - Per-user read state model

- **Frontend**:
  - `src/components/Notifications/SystemNotificationToast.tsx` - Notification display & handling
  - `src/lib/notifications/queueEngine.ts` - Queue management
  - `src/lib/notifications/normalize.ts` - Notification normalization

---

## 🚨 Important Notes

1. **Always use `message.id` (wamid) for uniqueness** - Never use `context.id`
2. **Atomic insert determines newness** - Don't use `findOne` for deduplication
3. **Read state is per-user** - No global `unreadCount` in conversations
4. **Notifications are events** - Emit only when unread, not on every message
5. **Socket listeners must have `[]` dependency array** - Prevents re-attachment
6. **Use refs for synchronous checks** - Prevents race conditions in deduplication
