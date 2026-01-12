# Notification System Upgrade - Complete Documentation

## 🎯 Overview

The notification system has been upgraded to a **high-reliability, smooth, real-time broadcast engine** with advanced features for zero missed notifications, graceful burst handling, and superior UX.

---

## 🏗️ Architecture

### Core Infrastructure

1. **Normalization Layer** (`src/lib/notifications/normalize.ts`)
   - Converts all notifications (System + WhatsApp) into unified `UnifiedNotification` format
   - Eliminates UI branching and jitter
   - Single source of truth for notification structure

2. **Deduplication Guard** (`src/lib/notifications/deduplication.ts`)
   - Tracks last 100 notification IDs
   - Prevents duplicate webhooks and double socket emits
   - 5-second deduplication window

3. **Micro-Batching System** (`src/lib/notifications/microBatch.ts`)
   - Batches notifications arriving within 300ms
   - Releases at 150ms intervals
   - Prevents UI spam and animation collisions

4. **Advanced Queue Engine** (`src/lib/notifications/queueEngine.ts`)
   - Max 3 visible notifications
   - 4-second minimum visible duration
   - Smart WhatsApp grouping (10-second window)
   - Critical notifications jump to front

5. **Socket Replay System** (`src/lib/notifications/replay.ts`)
   - Fetches missed notifications on reconnect
   - Persists last notification timestamps
   - Zero loss during refresh/network drops

6. **Rate Limiter & Logger** (`src/lib/notifications/rateLimiter.ts`)
   - Max 20 notifications per minute per source
   - Comprehensive logging (sent, received, rendered, dismissed)
   - Performance monitoring

---

## 🔄 Notification Flow

### System Notifications

```
1. HR/SuperAdmin creates notification
   ↓
2. POST /api/notifications/broadcast
   ↓
3. Saved to MongoDB
   ↓
4. Socket.IO emit: "system-notification"
   ↓
5. Client receives → Normalize → Deduplicate → Micro-batch → Queue
   ↓
6. Display in toast (max 3 visible)
```

### WhatsApp Notifications

```
1. WhatsApp webhook receives message
   ↓
2. POST /api/whatsapp/webhook
   ↓
3. Saved to MongoDB
   ↓
4. Socket.IO emit: "whatsapp-new-message"
   ↓
5. Client receives → Filter (role/location) → Normalize → Deduplicate → Micro-batch → Queue
   ↓
6. Smart grouping (if multiple messages in 10s window)
   ↓
7. Display in toast (max 3 visible)
```

---

## 🎨 Visual Hierarchy

| Type | Color | Motion | Special Rules |
|------|-------|--------|---------------|
| Info | Blue | Soft slide | Can be muted |
| Warning | Amber | Slight pulse | Can be muted |
| Critical | Red | Sticky + pulse | Cannot be muted, cannot be dismissed |
| WhatsApp | Green | Familiar tone | Can be muted, grouped |

---

## 🛡️ Access Control

### System Notifications
- **Broadcast**: SuperAdmin, HR only
- **View**: All authenticated users (filtered by role/location)
- **SuperAdmin**: Receives ALL notifications (no filtering)

### WhatsApp Notifications
- **View**: SuperAdmin, Sales-TeamLead, Sales only
- **SuperAdmin**: Receives ALL messages (no location/agent filtering)
- **Sales**: Only assigned conversations + location filtering
- **Sales-TeamLead**: Team conversations + location filtering

---

## ⚡ Key Features

### 1. Zero Missed Notifications
- Socket replay on reconnect
- Fetches missed notifications since last timestamp
- Persists state in localStorage

### 2. Smooth Burst Handling
- Micro-batching prevents UI spam
- 300ms batch window
- 150ms release intervals

### 3. Smart WhatsApp Grouping
- Groups multiple messages from same conversation (10s window)
- Shows: "Message (3 new messages)"
- Expand to see all messages

### 4. Critical Notification Protection
- Cannot be muted
- Cannot be dismissed silently
- Jump to front of queue
- Visual ring indicator

### 5. Deduplication
- Prevents duplicate webhooks
- Prevents double socket emits
- Rolling cache of last 100 IDs

### 6. Rate Limiting
- Max 20 notifications/minute per source
- Automatic throttling
- Performance protection

---

## 📊 Notification Center Enhancements

### New Features
- **Severity Filters**: All / Critical / Warning / Info
- **Mark All as Read**: Bulk action for unread notifications
- **Read Progress**: Shows "X/Y read" indicator
- **Critical Badge**: Visual indicator for critical notifications
- **No Dismiss for Critical**: Critical notifications cannot be dismissed

### Existing Features (Maintained)
- Real-time updates via Socket.IO
- Auto-refresh every 5 minutes
- Latest first sorting
- Dismiss functionality (non-critical only)

---

## 🔧 Configuration

### Queue Engine Config
```typescript
{
  maxVisible: 3,              // Max toasts visible
  minVisibleDurationMs: 4000, // 4 seconds minimum
  groupWindowMs: 10000        // 10 seconds for WhatsApp grouping
}
```

### Micro-Batching Config
```typescript
BATCH_WINDOW_MS = 300      // 300ms batch window
RELEASE_INTERVAL_MS = 150  // 150ms release interval
```

### Deduplication Config
```typescript
MAX_TRACKED = 100          // Last 100 IDs
DEDUP_WINDOW_MS = 5000     // 5 second window
```

### Rate Limiting Config
```typescript
MAX_PER_MINUTE = 20        // Per source
WINDOW_MS = 60000          // 1 minute window
```

---

## 🧪 Edge Cases Handled

✅ **Page refresh during burst** → Replay system fetches missed notifications  
✅ **Socket reconnect** → Automatic replay of missed notifications  
✅ **Multiple tabs open** → Each tab maintains independent state  
✅ **Same user logged in twice** → Both sessions receive notifications  
✅ **Admin sending to themselves** → Handled gracefully (no self-suppression)  
✅ **Expired notifications mid-session** → Filtered out automatically  

---

## 📁 File Structure

```
src/
├── lib/notifications/
│   ├── types.ts              # Unified notification types
│   ├── normalize.ts          # Normalization layer
│   ├── deduplication.ts     # Deduplication guard
│   ├── microBatch.ts        # Micro-batching system
│   ├── queueEngine.ts       # Advanced queue engine
│   ├── replay.ts            # Socket replay system
│   └── rateLimiter.ts       # Rate limiting & logging
├── components/Notifications/
│   ├── SystemNotificationToast.tsx    # Main toast component (upgraded)
│   ├── SystemNotificationCenter.tsx    # Notification center (enhanced)
│   └── BroadcastNotificationForm.tsx   # Broadcast form
└── app/api/notifications/
    ├── route.ts              # GET/POST (with replay support)
    ├── broadcast/route.ts   # Broadcast endpoint
    ├── read/route.ts         # Mark as read
    └── all/route.ts          # SuperAdmin view all
```

---

## 🚀 Performance Improvements

1. **Server-side filtering** (preferred) → Reduces payload size
2. **Client-side final gate** → SuperAdmin bypass, mute check, deduplication
3. **Micro-batching** → Prevents UI flooding
4. **Smart grouping** → Reduces notification count
5. **Rate limiting** → Prevents spam
6. **Efficient queue management** → O(1) operations

---

## ✅ Success Criteria Met

✅ **No missed notifications** → Replay system ensures zero loss  
✅ **No UI flooding** → Micro-batching + queue limits  
✅ **Smooth animations** → Staggered release intervals  
✅ **Clear hierarchy** → Visual distinction by severity  
✅ **Predictable behavior** → Consistent rules, no jitter  
✅ **Scales with load** → Rate limiting + efficient queue  

---

## 🔄 Migration Notes

- **Backward Compatible**: All existing functionality preserved
- **No Breaking Changes**: Existing API endpoints unchanged
- **Enhanced Features**: New capabilities added on top
- **Gradual Rollout**: Can be enabled/disabled via feature flags

---

## 📝 Usage Examples

### Creating a System Notification
```typescript
// Via BroadcastNotificationForm component
// Or POST /api/notifications/broadcast
{
  title: "System Maintenance",
  message: "Scheduled maintenance tonight",
  type: "warning",
  targetRoles: ["Sales"],
  targetLocations: ["Athens"],
  allUsers: false
}
```

### WhatsApp Notification (Automatic)
- Triggered by incoming WhatsApp message
- Automatically normalized and queued
- Grouped if multiple messages in 10s window

---

## 🐛 Debugging

### Enable Debug Logs
Set `NODE_ENV=development` to see:
- Notification sent/received/rendered/dismissed
- Queue statistics
- Rate limit status
- Deduplication cache size

### Check Queue Stats
```typescript
queueEngineRef.current.getStats()
// Returns: { queueLength, visibleCount, groupedCount }
```

### Check Rate Limit Stats
```typescript
rateLimiterRef.current.getStats()
// Returns: Record of source counts
```

---

## 🎓 Best Practices

1. **Use server-side filtering** when possible
2. **Respect rate limits** (20/min per source)
3. **Critical notifications** should be used sparingly
4. **Group related messages** (automatic for WhatsApp)
5. **Monitor queue stats** in production
6. **Test reconnect scenarios** regularly

---

## 🔮 Future Enhancements (Optional)

- [ ] Persist last 10 WhatsApp notifications per session
- [ ] Sound notifications (optional, respect mute)
- [ ] Notification templates
- [ ] Scheduled notifications
- [ ] Notification analytics dashboard
- [ ] A/B testing for notification timing

---

**Version**: 2.0.0  
**Last Updated**: 2025-01-09  
**Status**: ✅ Production Ready



