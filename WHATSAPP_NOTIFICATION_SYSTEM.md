# WhatsApp Notification System - Complete Architecture Documentation

## 📋 Table of Contents

1. [System Overview](#system-overview)
2. [Architecture Components](#architecture-components)
3. [Data Flow](#data-flow)
4. [Cross-Tab Coordination](#cross-tab-coordination)
5. [Per-User Correctness](#per-user-correctness)
6. [Notification Decision Logic](#notification-decision-logic)
7. [Edge Cases & Safety](#edge-cases--safety)
8. [Why These Design Decisions](#why-these-design-decisions)

---

## 🎯 System Overview

The WhatsApp notification system ensures that:
- **Notifications appear even when the user is on another browser tab** (like YouTube)
- **Only ONE browser notification per message** (no duplicates across tabs)
- **Per-user correctness** (each employee sees only their own notifications)
- **Zero jitter** (no flickering, no duplicate toasts)
- **Respects user preferences** (archive, mute, read state)

### Key Design Principles

1. **Events, Not State**: Notifications are one-time events, not persistent state
2. **Single Source of Truth**: Backend emits `whatsapp-new-message` socket events only
3. **Cross-Tab Leadership**: One tab is elected "leader" to show browser notifications
4. **Per-Tab Deduplication**: Each tab deduplicates by `eventId` independently
5. **No Replay**: Notifications never replay after being processed

---

## 🏗️ Architecture Components

### 1. Backend (`/api/whatsapp/webhook/route.ts`)

**Responsibility**: Emit per-user notification events

**How it works**:
- When a new WhatsApp message arrives via webhook:
  1. Atomically inserts message (MongoDB unique index prevents duplicates)
  2. For each eligible user (based on role, location, assignment):
     - Checks their `ConversationReadState` (per-user read tracking)
     - If `message.timestamp > user.lastReadAt` → user hasn't read it
     - Generates stable `eventId = ${conversationId}:${messageId}:${userId}`
     - Emits socket event `whatsapp-new-message` with:
       ```typescript
       {
         eventId: "conv123:msg456:user789",  // Stable, unique per user
         conversationId: "conv123",
         userId: "user789",                   // Target user
         message: { ... },
         participantName: "John Doe",
         lastMessagePreview: "Hello...",
         // ... other fields
       }
       ```

**Why per-user events?**
- Each employee has their own read state
- Same message can be "unread" for User A but "read" for User B
- Backend already knows who should be notified (read state check)

---

### 2. WhatsApp Chat Component (`whatsapp.tsx`)

**Responsibility**: Initialize controller + forward socket events

**Key Code**:

```typescript
// 1. Initialize controller with user context
useEffect(() => {
  const notificationController = getWhatsAppNotificationController();
  
  notificationController.init({
    hasWhatsAppAccess: token?.role === "SuperAdmin" || ...,
    userId: token?.id,
    userRole: token?.role,
    userLocations: [...],
    getMuted: () => { /* read from localStorage */ },
    getArchived: () => { /* read from localStorage */ },
    getLastReadAt: (convId) => { /* read from localStorage */ },
    getActiveConversationId: () => { /* read from localStorage */ },
    isTabVisible: () => document.visibilityState === "visible",
    isOnWhatsAppRoute: () => window.location.pathname.startsWith("/whatsapp"),
    onInApp: (raw) => { /* log only - toast component handles it */ },
    onBrowser: (raw) => { /* show native browser notification */ },
  });
}, [token, router]);

// 2. Forward socket events to controller
socket.on("whatsapp-new-message", (data) => {
  console.log("🔥 RAW SOCKET EVENT RECEIVED:", data);
  
  // Pass to controller (handles all filtering + routing)
  const notificationController = getWhatsAppNotificationController();
  notificationController.process(data);
  
  // Also update conversation list UI (separate concern)
  // ... existing UI update logic
});
```

**Why initialize here?**
- `WhatsAppChat` has access to `token` (user context)
- Controller needs user context to filter notifications
- Initialization happens before socket events arrive

---

### 3. Notification Controller (`whatsappNotificationController.ts`)

**Responsibility**: Centralized notification routing + cross-tab leadership

**Singleton Pattern**:
```typescript
let singleton: WhatsAppNotificationController | null = null;
export function getWhatsAppNotificationController() {
  if (!singleton) {
    singleton = new WhatsAppNotificationController();
  }
  return singleton;
}
```

**Why singleton?**
- One controller instance per tab (not per component render)
- Prevents re-initialization on re-renders
- Stable across component lifecycle

#### 3.1 Leader Election

**How it works**:

1. **BroadcastChannel** (primary): Real-time cross-tab communication
   ```typescript
   this.channel = new BroadcastChannel("whatsapp-notification-bus");
   ```

2. **localStorage** (fallback): For tabs that miss BroadcastChannel messages
   ```typescript
   localStorage.setItem("whatsapp_notification_leader", JSON.stringify({
     tabId: "tab-123456",
     ts: Date.now()
   }));
   ```

3. **Heartbeat System**:
   - Leader tab broadcasts heartbeat every 3 seconds
   - Other tabs listen for heartbeats
   - If no heartbeat for 8 seconds → leader is stale, another tab can claim

4. **Leadership Claim**:
   ```typescript
   private tryAssumeLeadership() {
     this.leaderId = this.tabId;  // Claim leadership
     this.broadcast({ type: "claim", tabId: this.tabId, ts: Date.now() });
     this.persistLeader();  // Write to localStorage
   }
   ```

**Why leader election?**
- Browser notifications should appear **only once** per message
- Without leadership: All tabs would show browser notifications → 7 duplicates
- With leadership: Only leader tab shows browser notification → 1 notification

#### 3.2 Notification Processing (`process()` method)

**Step-by-step flow**:

```typescript
process(raw: RawWhatsAppMessage) {
  // 1. Basic guards
  if (!this.options) return;  // Not initialized
  if (!hasWhatsAppAccess) return;
  if (!conversationId || !message || message.direction !== "incoming") return;

  // 2. Eligibility gates (skip if any true)
  if (getArchived().has(conversationId)) return;  // Archived
  if (getMuted().has(conversationId)) return;     // Muted
  if (isInternalMessage) return;                  // Internal/"You" messages
  if (lastRead && messageTimestamp <= lastRead) return;  // Already read

  // 3. Per-user filter (CRITICAL)
  const targetUserId = raw.userId;
  const currentUserId = this.options.userId;
  if (targetUserId && currentUserId && targetUserId !== currentUserId.toString()) {
    return;  // Skip notifications meant for other users
  }

  // 4. Decision: Browser vs In-App
  const isLeader = this.isLeader();
  const tabVisible = isTabVisible();
  const onWhatsApp = isOnWhatsAppRoute();
  const viewingSameConversation = tabVisible && activeConversationId === conversationId;

  const shouldShowBrowser =
    isLeader &&                                    // Only leader can show browser notifications
    Notification.permission === "granted" &&      // Permission granted
    !viewingSameConversation &&                    // Not viewing that conversation
    (!tabVisible || !onWhatsApp);                  // Tab hidden OR not on WhatsApp route

  if (shouldShowBrowser) {
    onBrowser(raw);  // Show native browser notification
    return;
  }

  const shouldShowInApp = tabVisible && !viewingSameConversation;
  if (shouldShowInApp) {
    onInApp(raw);  // Allow in-app toast (handled by SystemNotificationToast)
  }
}
```

**Why these gates?**
- **Archive/Mute**: User explicitly said "don't notify me"
- **Internal messages**: "You" messages are notes, not real messages
- **Read state**: If user already read it, don't notify again
- **Per-user filter**: Backend sends same message to 7 users; each tab only processes its own
- **Leader check**: Prevents duplicate browser notifications
- **Viewing same conversation**: If user is already in that chat, don't notify

---

### 4. System Notification Toast (`SystemNotificationToast.tsx`)

**Responsibility**: Render in-app toast notifications

**Key Features**:

1. **Separate Socket Listener**:
   ```typescript
   socket.on("whatsapp-new-message", (data) => {
     notificationController.process(data);  // Controller handles routing
     // But we also have our own listener for in-app toasts
   });
   ```

2. **Per-Tab Deduplication**:
   ```typescript
   const seenEventIdsRef = useRef<Set<string>>(new Set());
   
   if (eventId && seenEventIdsRef.current.has(eventId)) {
     return;  // Already processed this event
   }
   seenEventIdsRef.current.add(eventId);
   ```

3. **Notification Queue Engine**:
   - Groups messages from same conversation
   - Max 4 visible notifications
   - Auto-dismiss after inactivity
   - Updates existing notifications (no flicker)

**Why separate listener?**
- Controller decides **whether** to show notification
- Toast component decides **how** to render it (stacking, animations, etc.)
- Separation of concerns: routing vs. rendering

---

## 🔄 Data Flow

### Complete Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         BACKEND                                  │
│  Webhook receives WhatsApp message                               │
│  ↓                                                                │
│  Atomic insert (prevents duplicates)                             │
│  ↓                                                                │
│  For each eligible user:                                         │
│    - Check ConversationReadState                                 │
│    - If unread → emit socket event                               │
│    - eventId = "conv:msg:user" (stable, unique)                 │
└─────────────────────────────────────────────────────────────────┘
                            ↓
                    Socket.IO Event
                    "whatsapp-new-message"
                            ↓
        ┌───────────────────┴───────────────────┐
        │                                       │
   Tab 1 (User A)                          Tab 2 (User A)
   ┌─────────────────┐                  ┌─────────────────┐
   │ WhatsAppChat    │                  │ WhatsAppChat    │
   │ receives event  │                  │ receives event  │
   │ ↓               │                  │ ↓               │
   │ Controller      │                  │ Controller      │
   │ .process(data)  │                  │ .process(data)  │
   │ ↓               │                  │ ↓               │
   │ Filter by       │                  │ Filter by       │
   │ userId          │                  │ userId          │
   │ ↓               │                  │ ↓               │
   │ Check gates     │                  │ Check gates     │
   │ ↓               │                  │ ↓               │
   │ isLeader?       │                  │ isLeader?       │
   │ YES → Browser   │                  │ NO → Skip       │
   │ NO → In-App?    │                  │ YES → In-App?   │
   └─────────────────┘                  └─────────────────┘
```

### Example: Message Arrives

**Scenario**: User A has 2 tabs open, User B has 1 tab open. Message arrives.

1. **Backend emits 2 events**:
   - Event 1: `{ eventId: "conv:msg:userA", userId: "userA", ... }`
   - Event 2: `{ eventId: "conv:msg:userB", userId: "userB", ... }`

2. **Tab 1 (User A)**:
   - Receives Event 1 → Controller processes → `userId` matches → Passes gates
   - `isLeader()` = true → Shows browser notification
   - Also allows in-app toast (if tab visible)

3. **Tab 2 (User A)**:
   - Receives Event 1 → Controller processes → `userId` matches → Passes gates
   - `isLeader()` = false → Skips browser notification
   - Allows in-app toast (if tab visible)

4. **Tab 3 (User B)**:
   - Receives Event 2 → Controller processes → `userId` matches → Passes gates
   - `isLeader()` = false (Tab 1 is leader) → Skips browser notification
   - Allows in-app toast (if tab visible)

**Result**: 
- ✅ 1 browser notification (from leader tab)
- ✅ In-app toasts in visible tabs (if not viewing that conversation)

---

## 🔀 Cross-Tab Coordination

### Leader Election Algorithm

```typescript
// Every 3 seconds, leader tab broadcasts heartbeat
setInterval(() => {
  if (this.isLeader()) {
    this.broadcast({ type: "heartbeat", tabId: this.tabId, ts: Date.now() });
    this.persistLeader();  // Update localStorage
  }
}, 3000);

// Every tab checks if leader is stale
setInterval(() => {
  if (!this.leaderId || Date.now() - this.lastHeartbeat > 8000) {
    this.tryAssumeLeadership();  // Claim leadership
  }
}, 3000);
```

**Why 3s heartbeat + 8s stale threshold?**
- 3s: Frequent enough to detect leader quickly
- 8s: Gives leader 2-3 missed heartbeats before takeover
- Prevents rapid leader switching

### BroadcastChannel vs localStorage

**BroadcastChannel** (preferred):
- Real-time, instant cross-tab communication
- No polling needed
- Modern browsers support it

**localStorage** (fallback):
- Works in all browsers
- Storage events fire when other tabs write
- Used as backup if BroadcastChannel unavailable

**Why both?**
- BroadcastChannel is faster but not universal
- localStorage ensures compatibility
- Redundancy prevents leader election failures

---

## 👤 Per-User Correctness

### The Problem

Backend sends **one event per user** for the same message:
```
Message "Hello" arrives
  → Event 1: { userId: "userA", eventId: "conv:msg:userA" }
  → Event 2: { userId: "userB", eventId: "conv:msg:userB" }
  → Event 3: { userId: "userC", eventId: "conv:msg:userC" }
  ...
```

**Without filtering**: User A's browser would process all 7 events → 7 notifications

### The Solution

**Controller filters by `userId`**:
```typescript
const targetUserId = raw.userId;        // From event
const currentUserId = this.options.userId;  // From logged-in user

if (targetUserId && currentUserId && targetUserId !== currentUserId.toString()) {
  return;  // Skip - this event is for a different user
}
```

**Result**: Each user's browser only processes events meant for them

### Per-User State

All state is **per-user, per-tab**:

1. **Read State**: `localStorage.getItem("whatsapp_last_read_at")`
   - Format: `{ "convId1": "2026-01-21T10:00:00Z", ... }`
   - Updated when user opens conversation

2. **Archive State**: `localStorage.getItem("whatsapp_archived_conversations")`
   - Format: `["convId1", "convId2", ...]`
   - Updated when user archives conversation

3. **Mute State**: `localStorage.getItem("whatsapp_muted_conversations")`
   - Format: `{ "convId1": 1234567890, ... }` (timestamp)
   - Expires after 30 minutes

4. **Active Conversation**: `localStorage.getItem("whatsapp_active_conversation")`
   - Format: `{ "conversationId": "convId1", "updatedAt": 1234567890 }`
   - Updated when user opens/closes conversation

**Why localStorage?**
- Persists across page refreshes
- Shared across tabs (via StorageEvent)
- Fast, synchronous access
- No server round-trip needed

---

## 🚦 Notification Decision Logic

### Decision Tree

```
Message arrives
  ↓
Is controller initialized? → NO → Skip
  ↓ YES
Has WhatsApp access? → NO → Skip
  ↓ YES
Is conversation archived? → YES → Skip
  ↓ NO
Is conversation muted? → YES → Skip
  ↓ NO
Is message internal? → YES → Skip
  ↓ NO
Is message already read? → YES → Skip
  ↓ NO
Is event for current user? → NO → Skip
  ↓ YES
Is user viewing this conversation? → YES → Skip
  ↓ NO
Is tab visible? → YES → Show in-app toast
  ↓ NO
Is this tab the leader? → NO → Skip
  ↓ YES
Is notification permission granted? → NO → Skip
  ↓ YES
Show browser notification
```

### Browser Notification Conditions

```typescript
shouldShowBrowser =
  isLeader &&                    // Only leader tab
  permission === "granted" &&    // User granted permission
  !viewingSameConversation &&    // Not already in that chat
  (!tabVisible || !onWhatsApp);  // Tab hidden OR not on WhatsApp route
```

**Why these conditions?**
- **Leader**: Prevents duplicates
- **Permission**: Browser requirement
- **Not viewing**: Don't notify if user is already there
- **Tab hidden OR not on WhatsApp**: Show browser notification when user is away

### In-App Toast Conditions

```typescript
shouldShowInApp = tabVisible && !viewingSameConversation;
```

**Why these conditions?**
- **Tab visible**: Only show toasts when tab is active
- **Not viewing**: Don't show if user is already in that conversation

---

## 🛡️ Edge Cases & Safety

### 1. Multiple Tabs Open

**Scenario**: User has 3 tabs open, all on WhatsApp page

**Behavior**:
- One tab becomes leader (via election)
- Leader shows browser notifications (if tab hidden)
- All visible tabs show in-app toasts (if not viewing that conversation)

**Why safe?**
- Leader election ensures only one browser notification
- Per-tab deduplication prevents duplicate toasts

### 2. Leader Tab Closes

**Scenario**: Leader tab is closed

**Behavior**:
- `beforeunload` event fires → `releaseLeadership()` called
- Other tabs detect stale leader (no heartbeat for 8s)
- Next tab assumes leadership

**Why safe?**
- Automatic failover
- No manual intervention needed

### 3. Duplicate Webhooks

**Scenario**: WhatsApp sends same webhook twice

**Behavior**:
- Backend: MongoDB unique index prevents duplicate message insert
- Frontend: `eventId` deduplication prevents duplicate processing

**Why safe?**
- Atomic backend insert = no duplicate events
- Frontend dedup = no duplicate UI

### 4. User Switches Tabs

**Scenario**: User is on YouTube, message arrives

**Behavior**:
- Leader tab detects `tabVisible = false`
- Shows browser notification
- User clicks notification → Focuses tab → Navigates to conversation

**Why safe?**
- Browser notification works even when tab is hidden
- Click handler focuses window automatically

### 5. User Already Viewing Conversation

**Scenario**: User is in conversation, new message arrives

**Behavior**:
- `getActiveConversationId()` returns conversation ID
- `viewingSameConversation = true`
- Both browser and in-app notifications skipped

**Why safe?**
- User is already there, no need to notify
- Prevents notification spam

### 6. Permission Denied

**Scenario**: User denied notification permission

**Behavior**:
- `Notification.permission === "denied"`
- Browser notifications skipped
- In-app toasts still work

**Why safe?**
- Graceful degradation
- User can still see notifications in-app

### 7. Socket Reconnection

**Scenario**: Socket disconnects and reconnects

**Behavior**:
- Backend does NOT replay WhatsApp notifications (by design)
- Only system notifications are replayed (if any)
- New messages trigger new events

**Why safe?**
- Prevents notification spam on reconnect
- Only real-time events trigger notifications

---

## 💡 Why These Design Decisions

### 1. Why Singleton Controller?

**Problem**: If controller was recreated on every render, it would lose leader state

**Solution**: Singleton pattern ensures one instance per tab, stable across renders

**Benefit**: Leader election works correctly, no state loss

### 2. Why Leader Election?

**Problem**: Without leadership, all tabs show browser notifications → duplicates

**Solution**: Elect one leader tab, only leader shows browser notifications

**Benefit**: Exactly one browser notification per message

### 3. Why Per-User Events?

**Problem**: Same message needs different handling per user (read state, archive, etc.)

**Solution**: Backend emits one event per user with per-user context

**Benefit**: Each user gets correct notifications based on their state

### 4. Why Controller in WhatsAppChat?

**Problem**: Controller needs user context (`token`, `userId`, etc.)

**Solution**: Initialize in `WhatsAppChat` where `token` is available

**Benefit**: Controller has all context it needs to filter correctly

### 5. Why Separate Toast Component?

**Problem**: Controller should route, not render

**Solution**: Controller decides whether to notify, toast component renders

**Benefit**: Separation of concerns, easier to maintain

### 6. Why localStorage for State?

**Problem**: Need cross-tab state sharing without server round-trips

**Solution**: Use localStorage + StorageEvent for cross-tab sync

**Benefit**: Fast, synchronous, works offline, shared across tabs

### 7. Why No Replay?

**Problem**: Replaying notifications on reconnect would spam users

**Solution**: Backend never replays, frontend never replays

**Benefit**: Only real-time events trigger notifications, no duplicates

### 8. Why Per-Tab Deduplication?

**Problem**: Same event might arrive multiple times (race conditions, reconnects)

**Solution**: Each tab maintains `seenEventIdsRef` Set

**Benefit**: Prevents duplicate processing within a tab

---

## 📊 Summary

### What Works

✅ **Cross-tab browser notifications**: Leader tab shows notifications even when hidden  
✅ **No duplicates**: Leader election + per-tab dedup ensures one notification per message  
✅ **Per-user correctness**: Each user only sees their own notifications  
✅ **Respects preferences**: Archive, mute, read state all respected  
✅ **Zero jitter**: No flickering, no duplicate toasts  
✅ **Graceful degradation**: Works even if permission denied or BroadcastChannel unavailable

### Key Files

- **`whatsappNotificationController.ts`**: Cross-tab coordination + routing
- **`whatsapp.tsx`**: Controller initialization + socket forwarding
- **`SystemNotificationToast.tsx`**: In-app toast rendering
- **`/api/whatsapp/webhook/route.ts`**: Backend event emission

### Testing Checklist

- [ ] Open 2 tabs, send message → Only 1 browser notification
- [ ] Switch to YouTube tab, send message → Browser notification appears
- [ ] Archive conversation, send message → No notification
- [ ] Mute conversation, send message → No notification
- [ ] Open conversation, send message → No notification (already viewing)
- [ ] Close leader tab → Another tab becomes leader
- [ ] Deny permission → Browser notifications skip, toasts still work

---

**Last Updated**: 2026-01-21  
**Author**: System Architecture Documentation
