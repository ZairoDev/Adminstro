# WhatsApp Business System - Complete Summary

## 📋 Overview

This is a comprehensive WhatsApp Business API integration system built with Next.js, MongoDB, and Socket.IO. It provides a complete messaging platform for managing customer conversations, sending templates, handling media, retargeting campaigns, and monitoring phone number health.

---

## 🏗️ System Architecture

### **Technology Stack**
- **Frontend**: Next.js (React), TypeScript, Shadcn UI components
- **Backend**: Next.js API Routes, MongoDB (Mongoose)
- **Real-time**: Socket.IO for live updates
- **External APIs**: Meta WhatsApp Cloud API (v24.0)
- **Storage**: Bunny CDN for media files
- **Authentication**: JWT-based role-based access control

### **Core Models**
1. **WhatsAppConversation** - Stores conversation metadata (participant, phone ID, last message, unread count, etc.)
2. **WhatsAppMessage** - Stores individual messages (content, type, direction, status, media URLs)
3. **Query/Lead** - Customer leads with retargeting tracking
4. **UnregisteredOwner** - Owner records for retargeting

---

## 🔄 Data Flow & How It Works

### **1. Incoming Messages (Webhook → Database → Real-time)**

```
Meta WhatsApp API → Webhook Endpoint → Process Message → Save to DB → Emit Socket Event → Update UI
```

**Process:**
1. Meta sends webhook to `/api/whatsapp/webhook`
2. `processIncomingMessage()` extracts message data
3. Downloads media (if any) from WhatsApp → Uploads to Bunny CDN for permanent storage
4. Creates/finds conversation by phone number + business phone ID
5. Saves message to `WhatsAppMessage` collection
6. Updates `WhatsAppConversation` (lastMessageTime, unreadCount, lastCustomerMessageAt)
7. Emits `whatsapp-new-message` via Socket.IO
8. Frontend receives event and updates UI in real-time

**Special Logic:**
- If customer replies "Yes" to `first_template`, automatically sends `guest_questions` template
- Tracks 24-hour messaging window (expires after last customer message)
- Updates `conversationType` (owner/guest) based on first template sent

### **2. Outgoing Messages (UI → API → Meta → Database → Real-time)**

```
User Input → Send API → Meta API → Save to DB → Emit Socket Event → Update UI
```

**Process:**
1. User sends message via `/api/whatsapp/send-message` or `/api/whatsapp/send-template`
2. API validates permissions (role + location-based phone access)
3. Sends to Meta WhatsApp Cloud API
4. Saves message to database with `sentBy` (agent ID)
5. Updates conversation `lastMessageTime`
6. Emits socket event for real-time UI update
7. Status updates come via webhook (`processStatusUpdate()`)

**Message Types Supported:**
- Text messages
- Media (images, videos, audio, documents) - via `/api/whatsapp/send-media`
- Templates (pre-approved by Meta) - via `/api/whatsapp/send-template`
- Interactive messages (buttons, lists) - via `/api/whatsapp/send-interactive`

### **3. Conversation Management**

**Infinite Scroll (Conversations):**
- Cursor-based pagination using `lastMessageTime`
- Initial load: 25 conversations
- Auto-loads more on scroll
- Sorted by `lastMessageTime` descending (latest activity first)
- Database-driven counts (total, owner, guest) - always accurate

**Progressive Message Loading:**
- Initial load: Latest 20 messages
- "Load older messages" button at top
- Cursor-based using `beforeMessageId` or `beforeTimestamp`
- Messages returned in chronological order (oldest first)

### **4. Real-time Updates (Socket.IO)**

**Events Emitted:**
- `whatsapp-new-message` - New incoming/outgoing message
- `whatsapp-message-status` - Message status update (sent → delivered → read)
- `whatsapp-conversation-update` - Conversation metadata changed
- `whatsapp-message-echo` - Message sent from another device/interface

**How It Works:**
- Clients join `join-whatsapp-room` on connection
- Server emits events to all connected clients
- Frontend listens and updates UI without page refresh
- Location/ownership filtering happens server-side before emit

---

## 🔐 Access Control & Security

### **Role-Based Phone Access**

**Phone Number Configuration:**
- Each phone number mapped to area (athens, thessaloniki, crete, all)
- Stored in `WHATSAPP_PHONE_CONFIGS` array
- Special retarget phone ID for campaigns

**Access Rules:**
- **SuperAdmin/Admin/Developer**: Access to ALL phone numbers
- **Sales-TeamLead**: Access to team's location phones
- **Sales**: Access only to assigned location phones
- **LeadGen**: Similar area-based restrictions

**Implementation:**
- `getAllowedPhoneIds(userRole, userAreas)` - Returns accessible phone IDs
- All API endpoints filter conversations/messages by allowed phone IDs
- Server-side validation prevents unauthorized access

### **Location-Based Filtering**

**Conversations:**
- Sales users only see conversations for their location phones
- Team Leads see team location conversations
- SuperAdmin sees all

**Notifications:**
- Expiring conversations filtered by location
- Unread messages filtered by location + ownership (Sales see only assigned)
- Self-message suppression (never notify about own outgoing messages)

---

## 📱 Key Features

### **1. WhatsApp-Like UI**

**Conversation List:**
- Infinite scroll with cursor pagination
- Sorted by latest activity (`lastMessageTime`)
- Tabs: All, Owners, Guests (database-driven counts)
- Search functionality
- Unread count badges
- Connection status indicator

**Chat View:**
- WhatsApp-style message bubbles (sent right, received left)
- Date separators (Today, Yesterday, or formatted date)
- Progressive message loading ("Load older messages")
- Auto-scroll to latest on open
- Message status indicators (sent, delivered, read)
- Media preview (images, videos, documents)

**Message Composer:**
- Text input with send button
- Media upload (images, documents)
- Template selector with parameter input
- Interactive message builder
- 24-hour window warning dialog

### **2. Template Messaging**

**Features:**
- Fetch approved templates from Meta API (`/api/whatsapp/templates`)
- Dynamic parameter replacement (`{{1}}`, `{{2}}`, etc.)
- Preview before sending
- Automatic conversation type detection (owner/guest based on template name)
- Retarget phone ID support for campaign templates

**Template Flow:**
1. User selects template
2. System extracts parameters from template structure
3. User fills in parameters (header, body)
4. Preview generated
5. Send via Meta API
6. Conversation type updated if first template

### **3. Media Handling**

**Process:**
1. User uploads file via `/api/whatsapp/upload-media`
2. File uploaded to Bunny CDN
3. Returns permanent CDN URL
4. URL sent to Meta API
5. Meta downloads from CDN and delivers to customer
6. Incoming media: Downloaded from Meta → Uploaded to Bunny CDN → Permanent URL stored

**Supported Types:**
- Images (JPG, PNG, GIF)
- Videos (MP4, etc.)
- Audio (MP3, OGG, etc.)
- Documents (PDF, DOCX, etc.)

### **4. Retargeting System**

**Purpose:** Send follow-up messages to leads/owners who haven't engaged

**Safety Rules (NON-NEGOTIABLE):**
- Max 3 retarget attempts per lead
- 24-hour cooldown between attempts
- Blocks permanently blocked leads (`whatsappBlocked === true`)
- Blocks leads with permanent error codes (131049, 131021, 131215)
- Only retargets leads with WhatsApp engagement (opted-in OR replied)

**Process:**
1. User selects audience (leads or owners)
2. Applies filters (price, date, location, etc.)
3. `/api/whatsapp/retarget` fetches eligible recipients
4. Filters by state: `pending`, `retargeted`, `blocked`
5. User selects recipients and template
6. Sends via dedicated retarget phone ID
7. Tracks retarget count, last retarget time, error codes

**Tracking Fields:**
- `whatsappRetargetCount` - Number of retarget attempts
- `whatsappLastRetargetAt` - Timestamp of last retarget
- `whatsappBlocked` - Permanent block flag
- `whatsappLastErrorCode` - Last API error code

### **5. Monitoring & Health**

**Phone Number Health (`/api/whatsapp/phone-health`):**
- Fetches Meta-verified metrics (quality_rating, status, throughput_level)
- Health classification: 🟢 Good, 🟡 Warning, 🔴 Danger
- 6-hour cache (stale after 12 hours)
- Manual refresh for SuperAdmin
- Location-scoped visibility

**Conversation Expiry Alerts:**
- Tracks 24-hour messaging window
- Flags conversations expiring within 3 hours
- Severity levels: Critical (<1h), Urgent (1-3h)
- Notification dropdown in navbar
- Real-time updates via Socket.IO

**Notification System:**
- WhatsApp icon in navbar with badge count
- Dropdown shows expiring + unread conversations
- Persistent popups for new incoming messages
- Self-message suppression
- Location + ownership filtering
- Mute conversation (30-min TTL)

### **6. Add New Owner/Conversation**

**Flow:**
1. Click "Add New Owner" button
2. Modal opens with fields:
   - Phone number (required, E.164 validation)
   - Owner name (optional)
   - Reference link (optional, URL validation)
3. Submit creates/finds conversation
4. Auto-navigates to chat
5. Reference link displayed in chat header

**Validation:**
- E.164 phone format (7-15 digits, no leading zero)
- URL validation for reference link
- Prevents duplicate conversations (finds existing by phone + phone ID)

---

## 🔌 API Endpoints

### **Conversations**
- `GET /api/whatsapp/conversations` - List conversations (cursor pagination, location filtered)
- `POST /api/whatsapp/conversations` - Create/find conversation
- `GET /api/whatsapp/conversations/counts` - Database-driven counts (total, owner, guest)
- `GET /api/whatsapp/conversations/[id]/messages` - Get messages (cursor pagination)

### **Messaging**
- `POST /api/whatsapp/send-message` - Send text message
- `POST /api/whatsapp/send-media` - Send media message
- `POST /api/whatsapp/send-template` - Send template message
- `POST /api/whatsapp/send-interactive` - Send interactive message
- `POST /api/whatsapp/upload-media` - Upload media to Bunny CDN

### **Templates**
- `GET /api/whatsapp/templates` - List approved templates from Meta

### **Retargeting**
- `POST /api/whatsapp/retarget` - Fetch eligible recipients with safety filters

### **Webhooks**
- `GET /api/whatsapp/webhook` - Webhook verification (Meta)
- `POST /api/whatsapp/webhook` - Process incoming events:
  - Incoming messages
  - Message status updates
  - Call events
  - History sync
  - Message echoes
  - App state sync

### **Monitoring**
- `GET /api/whatsapp/phone-health` - Meta-verified phone health metrics
- `GET /api/whatsapp/notifications/summary` - Aggregated notifications (expiring + unread)

---

## 🎯 Key Business Logic

### **24-Hour Messaging Window**
- Starts when customer sends last message
- Expires 24 hours after last customer message
- Free-form messages only allowed within window
- Templates can be sent anytime (outside window)
- Warning dialog shown when window expired

### **Conversation Type Detection**
- Determined by first outgoing template message
- If template name contains "owners_template" or starts with "owner" → `owner`
- Otherwise → `guest`
- Stored in `conversationType` field
- Used for filtering in UI tabs

### **Unread Count Management**
- Incremented on incoming messages (if conversation not selected)
- Reset to 0 when conversation opened
- Updated via Socket.IO in real-time
- Only counts incoming messages (`lastMessageDirection === "incoming"`)

### **Message Status Tracking**
- Statuses: `sending` → `sent` → `delivered` → `read`
- Updated via webhook `statuses` field
- Stored in `statusEvents` array with timestamps
- Real-time updates via Socket.IO

### **Media Permanent Storage**
- Incoming media: WhatsApp → Download → Upload to Bunny CDN → Store URL
- Outgoing media: Upload to Bunny CDN → Send URL to Meta → Meta fetches
- All media URLs are permanent (not temporary WhatsApp URLs)
- Stored in `mediaUrl` field

---

## 🔄 Real-time Communication Flow

### **Socket.IO Events**

**Client → Server:**
- `join-whatsapp-room` - Join room for WhatsApp updates

**Server → Client:**
- `whatsapp-new-message` - New message (incoming or outgoing)
- `whatsapp-message-status` - Status update (delivered, read)
- `whatsapp-conversation-update` - Conversation metadata changed
- `whatsapp-message-echo` - Message sent from another device

**Frontend Handling:**
- Listens to socket events
- Updates conversations list (sort by latest activity)
- Adds messages to current conversation if selected
- Updates unread counts
- Shows notifications for new incoming messages
- Updates message status indicators

---

## 📊 Database Schema Highlights

### **WhatsAppConversation**
```typescript
{
  participantPhone: string (E.164, indexed)
  participantName: string
  businessPhoneId: string (indexed)
  assignedAgent: ObjectId (indexed)
  lastMessageTime: Date (indexed, for sorting)
  lastMessageDirection: "incoming" | "outgoing"
  lastCustomerMessageAt: Date (for 24h window)
  unreadCount: number
  conversationType: "owner" | "guest" (indexed)
  referenceLink: string
  status: "active" | "archived" | "blocked"
}
```

### **WhatsAppMessage**
```typescript
{
  conversationId: ObjectId (indexed)
  messageId: string (unique with businessPhoneId)
  businessPhoneId: string
  from: string (sender phone)
  to: string (recipient phone)
  type: "text" | "image" | "template" | etc.
  content: { text?, caption?, location?, interactivePayload? }
  mediaUrl: string (Bunny CDN permanent URL)
  direction: "incoming" | "outgoing" (indexed)
  status: "sending" | "sent" | "delivered" | "read" | "failed"
  sentBy: ObjectId (agent ID, for outgoing only)
  timestamp: Date (indexed, for pagination)
}
```

---

## 🛡️ Security & Best Practices

1. **Server-Side Validation**: All permissions checked server-side
2. **E.164 Phone Normalization**: Consistent phone format across system
3. **Idempotent Webhooks**: Duplicate webhook handling via `messageId` uniqueness
4. **Media Security**: Permanent URLs stored, no temporary access
5. **Role-Based Access**: Strict location and phone ID filtering
6. **Self-Message Suppression**: Never notify about own messages
7. **Retargeting Safety**: Multiple safety checks prevent spam/blocking
8. **24-Hour Window Enforcement**: Prevents sending outside window

---

## 🚀 Performance Optimizations

1. **Cursor-Based Pagination**: Efficient for large datasets
2. **Database Indexes**: On `lastMessageTime`, `conversationId`, `messageId`, `businessPhoneId`
3. **Infinite Scroll**: Loads data progressively, no full reloads
4. **Socket.IO Broadcasting**: Real-time updates without polling
5. **Caching**: Phone health data cached 6 hours
6. **Deduplication**: Prevents duplicate conversations/messages
7. **Lazy Loading**: Messages loaded on-demand (20 at a time)

---

## 📝 Summary

This WhatsApp system provides a complete business messaging platform with:
- ✅ Real-time messaging (incoming/outgoing)
- ✅ Template management and sending
- ✅ Media handling (permanent storage)
- ✅ Retargeting campaigns (with safety limits)
- ✅ Role-based access control (location-scoped)
- ✅ Conversation management (infinite scroll, progressive loading)
- ✅ Monitoring (phone health, expiry alerts)
- ✅ WhatsApp-like UI/UX
- ✅ 24-hour window tracking
- ✅ Self-message suppression
- ✅ Database-driven accuracy

The system is production-ready, scalable, and follows Meta's best practices for WhatsApp Business API usage.

