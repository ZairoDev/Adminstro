# ConversationReadState - How It Works

## 📖 Overview

`ConversationReadState` is a **per-user, per-conversation** tracking system that records when each employee has last read a WhatsApp conversation. This enables:
- **Per-user unread state** (each employee sees their own read/unread status)
- **Smart notification delivery** (only notify users who haven't read)
- **Multi-employee support** (multiple employees can view same conversation independently)

---

## 🗄️ Database Schema

```typescript
{
  conversationId: ObjectId,      // Which conversation
  userId: ObjectId,               // Which employee
  lastReadMessageId: string,     // Last read message's wamid
  lastReadAt: Date              // When it was read
}
```

**Unique Index**: `{ conversationId: 1, userId: 1 }`
- Ensures one read state record per user per conversation
- Prevents duplicates

---

## 🔄 How It's Updated

### 1. **When User Opens Conversation** (`/api/whatsapp/conversations/read`)

**Trigger**: User clicks "Open" on notification or navigates to conversation

**Process**:
```typescript
1. Find latest incoming message in conversation
2. Get its messageId (wamid)
3. Upsert ConversationReadState:
   - conversationId: conversation._id
   - userId: current user's ID
   - lastReadMessageId: latest message's wamid
   - lastReadAt: current timestamp
4. Emit socket event (whatsapp-conversation-read) to that user only
```

**Code Location**: `src/app/api/whatsapp/conversations/read/route.ts`

**Example**:
```typescript
// User opens conversation
POST /api/whatsapp/conversations/read
{ conversationId: "507f1f77bcf86cd799439011" }

// Backend updates:
ConversationReadState.findOneAndUpdate(
  { conversationId, userId },
  { lastReadMessageId: "wamid.ABC123", lastReadAt: new Date() },
  { upsert: true }
)
```

---

### 2. **When Checking Notification Eligibility** (Webhook)

**Trigger**: New incoming WhatsApp message arrives

**Process**:
```typescript
For each eligible user:
  1. Query ConversationReadState.findOne({ conversationId, userId })
  2. Compare:
     - If no readState exists → user never read → NOTIFY
     - If message.timestamp > readState.lastReadAt → user hasn't read → NOTIFY
     - If message.timestamp <= readState.lastReadAt → user already read → SKIP
```

**Code Location**: `src/app/api/whatsapp/webhook/route.ts` (lines 773-779)

**Example**:
```typescript
// New message arrives at 2:00 PM
const readState = await ConversationReadState.findOne({
  conversationId: conversation._id,
  userId: "employee123"
});

// Employee last read at 1:30 PM
if (message.timestamp > readState.lastReadAt) {
  // 2:00 PM > 1:30 PM → NOTIFY
  emitNotification();
} else {
  // Already read → SKIP
}
```

---

## 🎯 Key Features

### **Per-User Independence**
- Each employee has their own read state
- Employee A reading doesn't affect Employee B's unread status
- Multiple employees can view same conversation simultaneously

### **Automatic Tracking**
- Read state is updated when user opens conversation
- No manual "mark as read" button needed
- Uses latest message's wamid for precise tracking

### **Notification Filtering**
- Backend checks read state before emitting notifications
- Only users who haven't read receive notifications
- Prevents notification spam for already-read messages

---

## 📊 Data Flow

```
1. User Opens Conversation
   ↓
   POST /api/whatsapp/conversations/read
   ↓
   ConversationReadState.findOneAndUpdate()
   ↓
   lastReadAt = now
   lastReadMessageId = latest message wamid
   ↓
   Socket: whatsapp-conversation-read (to that user)

2. New Message Arrives
   ↓
   Webhook: processIncomingMessage()
   ↓
   For each eligible user:
     ConversationReadState.findOne({ conversationId, userId })
     ↓
     Compare: message.timestamp vs lastReadAt
     ↓
     If unread → emit notification
     If read → skip
```

---

## 🔍 Query Examples

### **Check if user has read conversation**:
```typescript
const readState = await ConversationReadState.findOne({
  conversationId: "507f1f77bcf86cd799439011",
  userId: "employee123"
});

if (!readState) {
  // User never read this conversation
} else {
  // User last read at: readState.lastReadAt
  // Last read message: readState.lastReadMessageId
}
```

### **Get all unread conversations for a user**:
```typescript
// Find conversations where last message is newer than lastReadAt
const unreadConversations = await WhatsAppConversation.aggregate([
  {
    $lookup: {
      from: "conversationreadstates",
      let: { convId: "$_id" },
      pipeline: [
        {
          $match: {
            $expr: {
              $and: [
                { $eq: ["$conversationId", "$$convId"] },
                { $eq: ["$userId", userId] }
              ]
            }
          }
        }
      ],
      as: "readState"
    }
  },
  {
    $match: {
      $or: [
        { readState: { $size: 0 } }, // Never read
        { $expr: { $gt: ["$lastMessageTime", { $arrayElemAt: ["$readState.lastReadAt", 0] }] } } // New messages
      ]
    }
  }
]);
```

---

## ⚠️ Important Notes

1. **Read state is per-user**: Each employee has independent read/unread status
2. **Automatic updates**: Read state updates when user opens conversation (via API call)
3. **Timestamp-based**: Uses `message.timestamp` vs `lastReadAt` for comparison
4. **No global unreadCount**: Read state replaces global unread counters
5. **Unique constraint**: One read state per user per conversation (enforced by unique index)

---

## 🛠️ Maintenance

### **Cleanup Old Read States** (Optional)
```typescript
// Remove read states for archived conversations
await ConversationReadState.deleteMany({
  conversationId: { $in: archivedConversationIds }
});
```

### **Migration** (If needed)
If migrating from global unreadCount:
1. Create ConversationReadState records for existing conversations
2. Set lastReadAt based on last message time (or conversation creation)
3. Remove unreadCount from WhatsAppConversation model

---

## 📝 Summary

**ConversationReadState** = Per-user bookmark tracking when each employee last read each conversation.

- **Updated**: When user opens conversation (via `/api/whatsapp/conversations/read`)
- **Checked**: When new message arrives (in webhook, before emitting notifications)
- **Purpose**: Determine if user should receive notification for new message
- **Key**: `{ conversationId, userId }` (unique per user per conversation)
