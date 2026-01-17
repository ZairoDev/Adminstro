# WhatsApp Archive & "You" Virtual Number System

## Overview

This document describes the WhatsApp-style Archive functionality and the internal "You" virtual number system implemented in the admin panel.

## 1. Archive Conversations (WhatsApp-style)

### Behavior

The archive feature works identically to WhatsApp Web:

- **Archived chats disappear from the main inbox** - They are hidden from the regular conversation list
- **They remain searchable** - Archive is per-user, not deletion
- **They do NOT trigger notifications** - Notifications are completely suppressed for archived conversations
- **Incoming messages do NOT auto-unarchive** - Unlike some messaging apps, new messages don't restore archived chats (WhatsApp-style)

### Per-User Archive State

Archive state is stored **per-user**, meaning:
- Each employee can archive/unarchive conversations independently
- Archiving by one user does NOT affect other users
- No global side effects

### Database Model

```typescript
// src/models/conversationArchiveState.ts
interface IConversationArchiveState {
  conversationId: ObjectId;
  userId: ObjectId;        // Employee ID
  isArchived: boolean;
  archivedAt?: Date;
  unarchivedAt?: Date;
}
```

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/whatsapp/conversations/archive` | POST | Archive a conversation |
| `/api/whatsapp/conversations/archive?conversationId=xxx` | DELETE | Unarchive a conversation |
| `/api/whatsapp/conversations/archive` | GET | Fetch all archived conversations |

### UI/UX

- Archive section at the bottom of the sidebar (like WhatsApp)
- Archive count badge shows number of archived chats
- Smooth transition between main inbox and archived view
- Clear "Unarchive" action in dropdown menu

---

## 2. "You" Virtual Number (Internal-Only)

### Purpose

The "You" virtual number is a special internal-only WhatsApp identity used for:
- Internal notes
- Internal replies and drafting
- Personal annotations on conversations

### Core Rules

- **"You" is NOT a Meta phone number** - No real WhatsApp account
- **No webhook, no WhatsApp API calls** - Messages never leave the system
- **Messages appear visually as outgoing** - Styled distinctly (yellow/amber note style)
- **Fully searchable and persistent** - Stored in DB just like real messages
- **Completely disabled notifications** - Never emits any notifications

### Configuration

```typescript
// src/lib/whatsapp/config.ts
export const INTERNAL_YOU_PHONE_ID = "internal-you";

export const INTERNAL_YOU_CONFIG: WhatsAppPhoneConfig = {
  phoneNumberId: INTERNAL_YOU_PHONE_ID,
  displayNumber: "Internal",
  displayName: "You (Internal Notes)",
  area: "all",
  businessAccountId: "",
  isInternal: true,
};
```

### Helper Functions

| Function | Description |
|----------|-------------|
| `isInternalPhoneId(id)` | Check if a phone ID is the internal "You" |
| `getAllPhoneConfigsWithInternal(role, areas)` | Get all phone configs including "You" |
| `getMetaOnlyPhoneConfigs(role, areas)` | Get only Meta phone configs (excludes "You") |

### API Endpoint

**Send Internal Message:** `POST /api/whatsapp/send-internal-message`

```json
{
  "conversationId": "xxx",
  "message": "This is an internal note",
  "type": "text"
}
```

---

## 3. Database Schema Updates

### WhatsAppConversation

Added `source` field:
```typescript
source?: "meta" | "internal";  // Default: "meta"
```

- `"meta"`: Real WhatsApp conversation via Meta API
- `"internal"`: Internal-only conversation

### WhatsAppMessage

Added `source` field:
```typescript
source?: "meta" | "internal";  // Default: "meta"
```

- `"meta"`: Real WhatsApp message via Meta API
- `"internal"`: Internal-only message (e.g., "You" messages, notes)

---

## 4. Notification Rules

### Archived Conversations

If a conversation is archived for a user:
- ✅ Skip notification emission completely
- ✅ Do not increment unread state
- ✅ Read state remains intact

### "You" Messages (Internal)

- ✅ Never emit notifications
- ✅ Never increment unread state
- ✅ Never affect read timestamps

---

## 5. Phone Health Dashboard

The "You" virtual number:
- ✅ Does NOT appear in Phone Health
- ✅ Does NOT sync with Meta
- ✅ Is clearly labeled as "Internal Only"

The dashboard uses `getMetaOnlyPhoneConfigs()` to exclude internal numbers.

---

## 6. Safety Guarantees

| Guarantee | Implementation |
|-----------|----------------|
| Internal messages can NEVER reach WhatsApp API | `source === "internal"` check before any Meta API call |
| Archived chats NEVER notify | Check `ConversationArchiveState` before emitting |
| Per-user archive state (no global side effects) | Separate model with `userId` + `conversationId` unique index |
| No Meta calls unless `source === "meta"` | Explicit check in all send functions |

---

## 7. UI Components Updated

### ConversationSidebar

- Added archive section at bottom
- Archive count badge
- Archive/Unarchive dropdown menu items
- Internal message indicator (blue badge)

### MessageList / MessageBubble

- Internal messages have distinct styling (yellow/amber note style)
- "📝 Internal Note" label
- No delivery status indicators for internal messages

### Main WhatsApp Component

- `archivedCount` state
- `showingArchived` toggle
- `archiveConversation()` function
- `unarchiveConversation()` function
- `toggleArchiveView()` function

---

## 8. File Changes Summary

### New Files

| File | Purpose |
|------|---------|
| `src/models/conversationArchiveState.ts` | Per-user archive state model |
| `src/app/api/whatsapp/conversations/archive/route.ts` | Archive API endpoints |
| `src/app/api/whatsapp/send-internal-message/route.ts` | Internal message API |

### Modified Files

| File | Changes |
|------|---------|
| `src/models/whatsappConversation.ts` | Added `source` field |
| `src/models/whatsappMessage.ts` | Added `source` field |
| `src/lib/whatsapp/config.ts` | Added "You" config and helper functions |
| `src/app/api/whatsapp/conversations/route.ts` | Archive state integration |
| `src/app/api/whatsapp/notifications/summary/route.ts` | Exclude archived/internal |
| `src/app/api/whatsapp/phone-health/route.ts` | Exclude internal phone |
| `src/app/whatsapp/types.ts` | Added archive/internal types |
| `src/app/whatsapp/components/ConversationSidebar.tsx` | Archive UI |
| `src/app/whatsapp/components/MessageList.tsx` | Internal message styling |
| `src/app/whatsapp/whatsapp.tsx` | Archive state management |

---

## 9. Design Principles

```
Meta = External Reality (Real WhatsApp messages via API)
You = Internal Reality (Notes, drafts, never leaves system)
Archive = User Preference (Per-user, no global effects)
Notifications = Per-user state, never global
```

---

## 10. Success Criteria

| Criteria | Status |
|----------|--------|
| Archived chats behave exactly like WhatsApp | ✅ |
| "You" messages are persistent but silent | ✅ |
| No accidental sends to Meta | ✅ |
| No notifications from archived or internal chats | ✅ |
| Phone Health remains clean and accurate | ✅ |
