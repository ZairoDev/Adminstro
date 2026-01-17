import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/util/db";
import WhatsAppMessage from "@/models/whatsappMessage";
import WhatsAppConversation from "@/models/whatsappConversation";
import { emitWhatsAppEvent, WHATSAPP_EVENTS } from "@/lib/pusher";
import { getWhatsAppToken, WHATSAPP_API_BASE_URL, getAllowedPhoneIds, WHATSAPP_ACCESS_ROLES } from "@/lib/whatsapp/config";
import ConversationReadState from "@/models/conversationReadState";
import ConversationArchiveState from "@/models/conversationArchiveState";
import Employee from "@/models/employee";
import { findOrCreateConversationWithSnapshot } from "@/lib/whatsapp/conversationHelper";

// Ensure database connection
connectDb();

// Per-conversation emit debounce (prevents burst-spam)
// Key: `${conversationId}:${userId}`, Value: last emit timestamp
const lastEmitMap = new Map<string, number>();
const EMIT_DEBOUNCE_MS = 300; // 300ms debounce per conversation per user

function canEmit(conversationId: string, userId: string): boolean {
  const key = `${conversationId}:${userId}`;
  const now = Date.now();
  const last = lastEmitMap.get(key) ?? 0;

  if (now - last < EMIT_DEBOUNCE_MS) {
    console.log(`⏸️ [DEBOUNCE] Skipping emit for ${key} (last emit ${now - last}ms ago)`);
    return false;
  }
  
  lastEmitMap.set(key, now);
  
  // Cleanup old entries (keep map size reasonable)
  if (lastEmitMap.size > 1000) {
    const entries = Array.from(lastEmitMap.entries());
    const cutoff = now - 60000; // Keep last minute
    lastEmitMap.clear();
    entries.forEach(([k, v]) => {
      if (v > cutoff) lastEmitMap.set(k, v);
    });
  }
  
  return true;
}


export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    
    const mode = searchParams.get("hub.mode");
    const token = searchParams.get("hub.verify_token");
    const challenge = searchParams.get("hub.challenge");

    console.log("Webhook verification request:", { mode, token, challenge });

    // Your verify token - you can set this in your Meta Developer Console
    const VERIFY_TOKEN = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || "vacationsaga_whatsapp_webhook";

    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      console.log("✅ Webhook verified successfully");
      return new NextResponse(challenge, { status: 200 });
    }

    console.log("❌ Webhook verification failed - token mismatch");
    return NextResponse.json(
      { error: "Verification failed" },
      { status: 403 }
    );
  } catch (error: any) {
    console.error("❌ Webhook verification error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

// Handle incoming webhook events
export async function POST(req: NextRequest) {
  try {
    // Ensure DB connection is established
    await connectDb();
    
    const body = await req.json();
    
    // console.log("📩 Incoming webhook payload:", JSON.stringify(body, null, 2));

    // Process the webhook event
    if (body.object === "whatsapp_business_account") {
      const entries = body.entry || [];
      
      console.log(`Processing ${entries.length} entries`);
      
      for (const entry of entries) {
        const changes = entry.changes || [];
        
        console.log(`Processing ${changes.length} changes for entry ${entry.id}`);
        
        for (const change of changes) {
          console.log(`Change field: ${change.field}`);
          
          if (change.field === "messages") {
            const value = change.value;
            
            // Handle incoming messages
            if (value.messages && value.messages.length > 0) {
              console.log(`📥 Processing ${value.messages.length} incoming message(s)`);
              for (const message of value.messages) {
                console.log(`Message type: ${message.type}, from: ${message.from}, id: ${message.id}`);
                await processIncomingMessage(message, value.contacts?.[0], value.metadata);
              }
            }
            
            // Handle message status updates
            if (value.statuses && value.statuses.length > 0) {
              console.log(`📊 Processing ${value.statuses.length} status update(s)`);
              for (const status of value.statuses) {
                await processStatusUpdate(status);
              }
            }
          }

          // Handle calls webhook field (Subscribed)
          if (change.field === "calls") {
            const value = change.value;
            console.log(`📞 Processing calls webhook event`);
            await processCallEvent(value);
          }

          // Handle history webhook field (Subscribed)
          if (change.field === "history") {
            const value = change.value;
            console.log(`📜 Processing history sync event`);
            await processHistoryEvent(value, entry.id);
          }

          // Handle smb_app_state_sync webhook field (Subscribed)
          if (change.field === "smb_app_state_sync") {
            const value = change.value;
            console.log(`🔄 Processing SMB app state sync event`);
            await processAppStateSyncEvent(value, entry.id);
          }

          // Handle smb_message_echoes webhook field (Subscribed)
          if (change.field === "smb_message_echoes") {
            const value = change.value;
            console.log(`🔁 Processing SMB message echoes event`);
            await processMessageEchoEvent(value);
          }
        }
      }
    } else {
      console.log(`⚠️ Unknown webhook object: ${body.object}`);
    }

    // Always return 200 to acknowledge receipt
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error("❌ Webhook processing error:", error);
    // Still return 200 to prevent Meta from retrying
    return NextResponse.json({ success: true }, { status: 200 });
  }
}

/**
 * Download media from WhatsApp and upload to Bunny CDN for permanent storage
 * Only returns URL if successfully uploaded to Bunny CDN
 * @param mediaId - The WhatsApp media ID
 * @param mimeTypeHint - The mime type from webhook
 */
async function getMediaPermanentUrl(
  mediaId: string,
  mimeTypeHint?: string
): Promise<{ url: string; mimeType: string } | null> {
  try {
    const whatsappToken = getWhatsAppToken();
    if (!mediaId || !whatsappToken) {
      console.error("Missing mediaId or WhatsApp token");
      return null;
    }

    // Step 1: Get media metadata from WhatsApp API
    const metadataResponse = await fetch(
      `${WHATSAPP_API_BASE_URL}/${mediaId}`,
      {
        headers: {
          Authorization: `Bearer ${whatsappToken}`,
        },
      }
    );

    if (!metadataResponse.ok) {
      console.error("Failed to get media metadata:", await metadataResponse.text());
      return null;
    }

    const metadata = await metadataResponse.json();
    const tempUrl = metadata.url;
    const mimeType = metadata.mime_type || mimeTypeHint || "";

    if (!tempUrl) {
      console.error("No download URL in media metadata");
      return null;
    }

    // Step 2: Check Bunny CDN credentials
    const storageZoneName = process.env.NEXT_PUBLIC_BUNNY_STORAGE_ZONE;
    const accessKey = process.env.NEXT_PUBLIC_BUNNY_ACCESS_KEY;
    const cdnUrl = process.env.NEXT_PUBLIC_BUNNY_CDN_URL || `https://${storageZoneName}.b-cdn.net`;

    if (!storageZoneName || !accessKey) {
      console.error("❌ Bunny CDN credentials not configured");
      return null;
    }

    // Step 3: Download the media from WhatsApp
    const mediaResponse = await fetch(tempUrl, {
      headers: {
        Authorization: `Bearer ${whatsappToken}`,
      },
    });

    if (!mediaResponse.ok) {
      console.error("Failed to download media from WhatsApp");
      return null;
    }

    const mediaBuffer = await mediaResponse.arrayBuffer();

    // Step 4: Upload to Bunny CDN
    const ext = mimeType.split("/")[1] || "bin";
    const filename = `whatsapp/${Date.now()}-${mediaId}.${ext}`;

    const uploadResponse = await fetch(
      `https://storage.bunnycdn.com/${storageZoneName}/${filename}`,
      {
        method: "PUT",
        headers: {
          AccessKey: accessKey,
          "Content-Type": mimeType || "application/octet-stream",
        },
        body: mediaBuffer,
      }
    );
    console.log("uploadResponse", uploadResponse);

    if (!uploadResponse.ok) {
      console.error("Failed to upload to Bunny CDN:", await uploadResponse.text());
      return null;
    }

    const permanentUrl = `${cdnUrl}/${filename}`;
    console.log("📤 Media uploaded to Bunny CDN:", permanentUrl);

    return {
      url: permanentUrl,
      mimeType,
    };
  } catch (error) {
    console.error("Error in getMediaPermanentUrl:", error);
    return null;
  }
}

/**
 * Send guest_questions template after receiving "Yes, I'm Interested" reply to guest_greeting
 */
async function sendGuestQuestionsTemplate(
  recipientPhone: string,
  recipientName: string,
  phoneNumberId: string,
  conversationId: string
) {
  try {
    const whatsappToken = getWhatsAppToken();
    if (!whatsappToken) {
      console.error("❌ WhatsApp token not available");
      return;
    }

    // Format phone number (E.164)
    let formattedPhone = recipientPhone.replace(/\D/g, "");
    if (!/^[1-9][0-9]{6,14}$/.test(formattedPhone)) {
      console.error("❌ Invalid phone number format:", recipientPhone);
      return;
    }

    console.log(`📱 Sending guest_questions template to ${formattedPhone} for ${recipientName}`);

    const response = await fetch(
      `${WHATSAPP_API_BASE_URL}/${phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${whatsappToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: formattedPhone,
          type: "template",
          template: {
            name: "guest_questions",
            language: {
              code: "en",
            },
            components: [
              {
                type: "body",
                parameters: [
                  { type: "text", text: recipientName }
                ]
              }
            ]
          },
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("❌ WhatsApp Template API Error:", data);
      return;
    }

    const whatsappMessageId = data.messages?.[0]?.id;
    if (!whatsappMessageId) {
      console.error("❌ No message ID returned from WhatsApp API");
      return;
    }

    console.log(`✅ guest_questions template sent successfully:`, whatsappMessageId);

    const timestamp = new Date();
    const templateText = `Great, thank you ${recipientName}.\n\nTo help us find the most suitable apartment for you, could you please share the following details:\n\n• Number of people\n• Budget range\n• Duration of stay\n• Preferred location(s)\n\nYou may reply in a single message or one by one—whatever is convenient for you.`;

    // Get conversation
    const conversation = await WhatsAppConversation.findById(conversationId);
    if (!conversation) {
      console.error("❌ Conversation not found:", conversationId);
      return;
    }

    const contentObj = { text: templateText };

    // Save message to database
    const savedMessage = await WhatsAppMessage.create({
      conversationId: conversation._id,
      messageId: whatsappMessageId,
      businessPhoneId: phoneNumberId,
      from: phoneNumberId,
      to: formattedPhone,
      type: "template",
      content: contentObj,
      templateName: "guest_questions",
      templateLanguage: "en",
      status: "sent",
      statusEvents: [{ status: "sent", timestamp }],
      direction: "outgoing",
      timestamp,
      conversationSnapshot: {
        participantPhone: formattedPhone,
        assignedAgent: conversation.assignedAgent,
      },
    });

    // Update conversation last message
    await WhatsAppConversation.findByIdAndUpdate(conversation._id, {
      lastMessageId: whatsappMessageId,
      lastMessageContent: templateText.substring(0, 100),
      lastMessageTime: timestamp,
      lastMessageDirection: "outgoing",
      lastOutgoingMessageTime: timestamp,
    });

    // Emit socket event for real-time frontend updates
    emitWhatsAppEvent(WHATSAPP_EVENTS.NEW_MESSAGE, {
      conversationId: conversation._id.toString(),
      businessPhoneId: phoneNumberId,
      message: {
        id: savedMessage._id.toString(),
        messageId: whatsappMessageId,
        from: phoneNumberId,
        to: formattedPhone,
        type: "template",
        content: contentObj,
        status: "sent",
        direction: "outgoing",
        timestamp,
        senderName: "System (Auto)",
      },
    });

    console.log(`✅ guest_questions message saved to DB and emitted to frontend`);
  } catch (error) {
    console.error("❌ Error sending guest_questions template:", error);
  }
}

/**
 * Get all eligible users who should receive notifications for a conversation
 * Based on role, location, and assignment
 */
async function getEligibleUsersForNotification(
  conversation: any,
  businessPhoneId: string
): Promise<Array<{ userId: string; role: string; allotedArea: string[] }>> {
  const eligibleUsers: Array<{ userId: string; role: string; allotedArea: string[] }> = [];
  
  // Get phone config to determine area
  const { getAllowedPhoneConfigs } = await import("@/lib/whatsapp/config");
  const phoneConfig = getAllowedPhoneConfigs("SuperAdmin", []).find(
    (config) => config.phoneNumberId === businessPhoneId
  );
  
  if (!phoneConfig) {
    console.warn(`⚠️ Phone config not found for ${businessPhoneId}`);
    return eligibleUsers;
  }
  
  const area = phoneConfig.area;
  
  // Get all employees with WhatsApp access roles
  const employees = await Employee.find({
    role: { $in: WHATSAPP_ACCESS_ROLES },
    $or: [
      { isActive: { $exists: false } }, // If field doesn't exist, include
      { isActive: true }, // If field exists, must be true
    ],
  }).select("_id role allotedArea").lean();
  
  for (const employee of employees) {
    const employeeId = (employee._id as any)?.toString() || employee._id?.toString() || "";
    if (!employeeId) continue;
    
    const employeeRole = (employee.role as string) || "";
    const employeeAreas = Array.isArray(employee.allotedArea)
      ? employee.allotedArea
      : employee.allotedArea
        ? [employee.allotedArea]
        : [];
    
    // SuperAdmin/Admin/Developer: always eligible
    if (["SuperAdmin", "Admin", "Developer"].includes(employeeRole)) {
      eligibleUsers.push({
        userId: employeeId,
        role: employeeRole,
        allotedArea: employeeAreas,
      });
      continue;
    }
    
    // Sales: Check if user has access to this phone's area (area-based assignment, not conversation-based)
    if (employeeRole === "Sales") {
      // Normalize areas for comparison (case-insensitive)
      const normalizedEmployeeAreas = employeeAreas.map(a => a.toLowerCase().trim());
      const normalizedPhoneArea = area.toLowerCase().trim();
      
      // Check if employee has this area in their assigned areas
      // Also check for "all" or "both" which gives access to all areas
      const hasAreaAccess = 
        normalizedEmployeeAreas.includes(normalizedPhoneArea) ||
        normalizedEmployeeAreas.includes("all") ||
        normalizedEmployeeAreas.includes("both");
      
      if (hasAreaAccess) {
        eligibleUsers.push({
          userId: employeeId,
          role: employeeRole,
          allotedArea: employeeAreas,
        });
      }
      continue;
    }
    
    // Sales-TeamLead/LeadGen-TeamLead/LeadGen: check area access (area-based assignment)
    if (["Sales-TeamLead", "LeadGen-TeamLead", "LeadGen"].includes(employeeRole)) {
      // Normalize areas for comparison (case-insensitive)
      const normalizedEmployeeAreas = employeeAreas.map(a => a.toLowerCase().trim());
      const normalizedPhoneArea = area.toLowerCase().trim();
      
      // Check if employee has this area in their assigned areas
      // Also check for "all" or "both" which gives access to all areas
      const hasAreaAccess = 
        normalizedEmployeeAreas.includes(normalizedPhoneArea) ||
        normalizedEmployeeAreas.includes("all") ||
        normalizedEmployeeAreas.includes("both");
      
      if (hasAreaAccess) {
        eligibleUsers.push({
          userId: employeeId,
          role: employeeRole,
          allotedArea: employeeAreas,
        });
      }
    }
  }
  
  return eligibleUsers;
}

async function processIncomingMessage(
  message: any,
  contact: any,
  metadata: any
) {
  try {
    const phoneNumberId = metadata?.phone_number_id;
    // E.164 normalization: only digits, 7-15 digits, no leading zero
    let senderPhone = message.from;
    senderPhone = senderPhone.replace(/\D/g, "");
    if (!/^[1-9][0-9]{6,14}$/.test(senderPhone)) {
      console.error("❌ Invalid sender phone (not E.164):", senderPhone);
      return;
    }
    const senderName = contact?.profile?.name || senderPhone;
    const timestamp = new Date(parseInt(message.timestamp) * 1000);

    console.log(`📱 Processing message from ${senderPhone} (${senderName}) to phone ID: ${phoneNumberId}`);

    // Validate required fields
    if (!senderPhone || !phoneNumberId) {
      console.error("❌ Missing required fields - senderPhone:", senderPhone, "phoneNumberId:", phoneNumberId);
      return;
    }

    // Get or create conversation using snapshot-safe helper
    // CRITICAL: Webhooks are "untrusted" - they must NEVER overwrite snapshot fields
    // on existing conversations. Only allowed to set snapshots on NEW conversations.
    console.log(`📝 Finding or creating conversation for ${senderPhone}`);
    const conversation = await findOrCreateConversationWithSnapshot({
      participantPhone: senderPhone,
      businessPhoneId: phoneNumberId,
      participantName: senderName,
      // Webhook doesn't know location/role - leave undefined
      snapshotSource: "untrusted", // CRITICAL: Never overwrite existing snapshot fields
    }) as any; // Cast to any to access Mongoose document properties like _id

    // ============================================================
    // CRITICAL: Internal vs Meta Message Safety
    // ============================================================
    // If conversation.source === "internal", immediately return
    // Internal conversations must NEVER be processed by webhook logic
    if (conversation.source === "internal") {
      console.log(`⏭️ [SKIP] Internal conversation detected - skipping webhook processing for conversation ${conversation._id}`);
      return;
    }

    // Extract message content based on type
    let contentObj: { text?: string; caption?: string; location?: any; interactivePayload?: any } = {};
    let mediaUrl = "";
    let mediaId = "";
    let mimeType = "";
    let filename = "";

    switch (message.type) {
      case "text":
        contentObj.text = message.text?.body || "";
        break;
        
      case "image":
        contentObj.caption = message.image?.caption || "";
        mediaId = message.image?.id;
        // Get permanent CDN URL for the image
        const imageMedia = await getMediaPermanentUrl(
          message.image?.id,
          message.image?.mime_type
        );
        if (imageMedia) {
          mediaUrl = imageMedia.url;
          mimeType = imageMedia.mimeType || message.image?.mime_type;
        }
        break;
        
      case "document":
        contentObj.caption = message.document?.caption || "";
        mediaId = message.document?.id;
        filename = message.document?.filename || "document";
        // Get permanent CDN URL for the document
        const docMedia = await getMediaPermanentUrl(
          message.document?.id,
          message.document?.mime_type
        );
        if (docMedia) {
          mediaUrl = docMedia.url;
          mimeType = docMedia.mimeType || message.document?.mime_type;
        }
        break;
        
      case "audio":
        contentObj.text = "🎵 Audio message";
        mediaId = message.audio?.id;
        // Get permanent CDN URL for the audio
        const audioMedia = await getMediaPermanentUrl(
          message.audio?.id,
          message.audio?.mime_type
        );
        if (audioMedia) {
          mediaUrl = audioMedia.url;
          mimeType = audioMedia.mimeType || message.audio?.mime_type;
        }
        break;
        
      case "video":
        contentObj.caption = message.video?.caption || "";
        mediaId = message.video?.id;
        // Get permanent CDN URL for the video
        const videoMedia = await getMediaPermanentUrl(
          message.video?.id,
          message.video?.mime_type
        );
        if (videoMedia) {
          mediaUrl = videoMedia.url;
          mimeType = videoMedia.mimeType || message.video?.mime_type;
        }
        break;
        
      case "sticker":
        contentObj.text = "🎨 Sticker";
        mediaId = message.sticker?.id;
        // Get permanent CDN URL for the sticker
        const stickerMedia = await getMediaPermanentUrl(
          message.sticker?.id,
          message.sticker?.mime_type
        );
        if (stickerMedia) {
          mediaUrl = stickerMedia.url;
          mimeType = stickerMedia.mimeType || message.sticker?.mime_type;
        }
        break;
        
      case "location":
        contentObj.location = {
          latitude: message.location?.latitude,
          longitude: message.location?.longitude,
          name: message.location?.name,
          address: message.location?.address,
        };
        break;
        
      case "contacts":
        contentObj.text = `👤 Contact: ${message.contacts?.[0]?.name?.formatted_name || "Unknown"}`;
        break;
        
      case "button":
        // Extract text from button - prioritize text, then payload
        contentObj.text = message.button?.text || message.button?.payload || "Button response";
        break;
        
      case "interactive":
        // Extract text from interactive - check all possible sources
        contentObj.text = 
          message.interactive?.button_reply?.title || 
          message.interactive?.button_reply?.id ||
          message.interactive?.list_reply?.title ||
          message.interactive?.list_reply?.id ||
          "Interactive response";
        contentObj.interactivePayload = message.interactive;
        break;
        
      case "reaction":
        contentObj.text = `Reacted: ${message.reaction?.emoji || "👍"}`;
        // Store the original message ID that was reacted to
        break;
        
      default:
        contentObj.text = `${message.type} message`;
    }

    // Generate display text for conversation last message
    const displayText = contentObj.text || contentObj.caption || 
      (contentObj.location ? `📍 ${contentObj.location.name || 'Location'}` : '') ||
      `${message.type} message`;

    // ============================================================
    // REPLY CONTEXT EXTRACTION: Extract reply reference if present
    // ============================================================
    // WhatsApp webhook includes context.id when message is a reply
    // CRITICAL: Reply reference is CONTEXT ONLY, never use for deduplication
    let replyToMessageId: string | undefined;
    let replyContext: any = null;

    if (message.context?.id) {
      replyToMessageId = message.context.id;
      console.log(`↩️ [REPLY] Message ${message.id} is a reply to ${replyToMessageId}`);

      // Look up the original message to store context
      const originalMessage = await WhatsAppMessage.findOne({
        messageId: replyToMessageId,
      }).lean() as any;

      if (originalMessage) {
        replyContext = {
          messageId: originalMessage.messageId,
          from: originalMessage.from,
          type: originalMessage.type,
          content: {
            text: originalMessage.content?.text,
            caption: originalMessage.content?.caption,
          },
          mediaUrl: originalMessage.mediaUrl,
        };
        console.log(`↩️ [REPLY] Found original message context: type=${originalMessage.type}`);
      } else {
        // Original message not found - store minimal context
        replyContext = {
          messageId: replyToMessageId,
          from: "unknown",
          type: "unknown",
        };
        console.log(`⚠️ [REPLY] Original message not found: ${replyToMessageId}`);
      }
    }

    // ============================================================
    // AUTOMATION LOGIC: Run BEFORE deduplication
    // ============================================================
    // CRITICAL: Business logic must run even for duplicate webhooks
    // Extract message text from all possible sources
    const extractedText = 
      contentObj.text || 
      message.button?.text || 
      message.button?.payload || 
      message.interactive?.button_reply?.title ||
      message.interactive?.list_reply?.title ||
      message.interactive?.button_reply?.id ||
      "";

    const messageText = extractedText.trim().toLowerCase();
    
    // Check for "Yes, I'm Interested" reply after guest_greeting
    // This must run BEFORE deduplication to handle button clicks on duplicate webhooks
    const isYesInterested = 
      messageText === "yes, i'm interested" ||
      messageText === "yes im interested" ||
      messageText === "yes i am interested" ||
      messageText === "yes, im interested" ||
      messageText === "yes, i am interested" ||
      (messageText.includes("yes") && messageText.includes("interested"));

    if (isYesInterested) {
      try {
        console.log(`🤖 [AUTOMATION] Detected "Yes, I'm Interested" - checking if guest_questions should be sent`);
        
        // Check if guest_questions was already sent to prevent duplicates
        const guestQuestionsAlreadySent = await WhatsAppMessage.findOne({
          conversationId: conversation._id,
          direction: "outgoing",
          type: "template",
          templateName: "guest_questions",
        }).lean();

        if (guestQuestionsAlreadySent) {
          console.log(`⏭️ [AUTOMATION] guest_questions template already sent, skipping`);
        } else {
          // Find the last outgoing template message in this conversation
          const lastOutgoingTemplate = await WhatsAppMessage.findOne({
            conversationId: conversation._id,
            direction: "outgoing",
            type: "template",
            templateName: "guest_greeting",
          })
            .sort({ timestamp: -1 })
            .lean() as any;

          // If last template was guest_greeting, send guest_questions
          if (lastOutgoingTemplate) {
            console.log(`✅ [AUTOMATION] Detected "Yes, I'm Interested" reply after guest_greeting, sending guest_questions template`);
            
            // Get lead name from Query model or use conversation participant name
            const QueryModel = (await import("@/models/query")).default;
            const normalizedSender = (senderPhone || "").toString().replace(/\D/g, "");
            const tryLengths = [9, 8, 7];
            let lead: any = null;

            for (const len of tryLengths) {
              if (normalizedSender.length < len) continue;
              const lastDigits = normalizedSender.slice(-len);
              const regex = new RegExp(`${lastDigits}$`);
              lead = await QueryModel.findOne({ phoneNo: { $regex: regex } });
              if (lead) break;
            }

            const leadName = lead?.name || conversation.participantName || senderPhone;
            
            // Send guest_questions template (runs even for duplicate webhooks)
            await sendGuestQuestionsTemplate(
              senderPhone,
              leadName,
              phoneNumberId,
              conversation._id.toString()
            );
          } else {
            console.log(`⏭️ [AUTOMATION] Last template was not guest_greeting, skipping guest_questions`);
          }
        }
      } catch (err) {
        console.error("❌ [AUTOMATION] Error checking for Yes reply and sending guest_questions:", err);
        // Don't throw - automation errors shouldn't block message processing
      }
    }

    // ============================================================
    // ATOMIC INSERT-FIRST DEDUPLICATION: Let MongoDB decide
    // ============================================================
    // CRITICAL: Use atomic insert with unique index for deduplication
    // MongoDB unique index on { messageId, businessPhoneId } handles race conditions
    // If insert succeeds → NEW message (proceed with unreadCount & notification)
    // If insert fails with E11000 → DUPLICATE (skip ALL state changes)
    // 🚫 NEVER use findOne, findOneAndUpdate, or upsert for deduplication
    let savedMessage;
    let isNewMessage = false;
    
    try {
      console.log(`🔄 [ATOMIC INSERT] Attempting insert for messageId: ${message.id}`);
      
      savedMessage = await WhatsAppMessage.create({
        conversationId: conversation._id,
        messageId: message.id, // CRITICAL: Use message.id (wamid) for uniqueness
        businessPhoneId: phoneNumberId,
        from: senderPhone,
        to: phoneNumberId,
        type: message.type,
        content: contentObj,
        mediaUrl, // Permanent CDN URL
        mediaId,
        mimeType,
        filename,
        source: "meta", // CRITICAL: Explicitly set source for all webhook-created messages
        status: "delivered",
        statusEvents: [{ status: "delivered", timestamp }],
        direction: "incoming",
        timestamp,
        conversationSnapshot: {
          participantPhone: senderPhone,
          assignedAgent: conversation.assignedAgent,
        },
        // Store reaction data if this is a reaction message
        ...(message.type === "reaction" && {
          reactedToMessageId: message.reaction?.message_id,
          reactionEmoji: message.reaction?.emoji || "👍",
        }),
        // Store reply context if this message is a reply
        ...(replyToMessageId && {
          replyToMessageId,
          replyContext,
        }),
      });

      // Insert succeeded → NEW message
      isNewMessage = true;
      console.log(`✅ [NEW MESSAGE] Insert successful: messageId=${message.id}, type=${message.type}`);
    } catch (err: any) {
      // Check if error is duplicate key error (E11000)
      if (err.code === 11000 || err.code === 11001) {
        // Duplicate key error → message already exists
        isNewMessage = false;
        console.log(`⏭️ [DUPLICATE] Message already exists (E11000): messageId=${message.id} - skipping ALL state changes`);
        
        // Fetch existing message for reference (but don't use for deduplication logic)
        savedMessage = await WhatsAppMessage.findOne({ messageId: message.id });
        if (!savedMessage) {
          console.error(`❌ [ERROR] Duplicate key error but message not found: ${message.id}`);
          return;
        }
        console.log(`📋 [DUPLICATE] Using existing message: DB _id=${savedMessage._id}`);
        
        // CRITICAL: Duplicate webhooks cause ZERO side effects for DB/socket
        // DO NOT increment unreadCount, DO NOT update conversation, DO NOT emit notification
        // BUT: Automation logic already ran above, so we can safely return now
        return;
      } else {
        // Other error (validation, etc.) - rethrow
        console.error(`❌ [ERROR] Error inserting message ${message.id}:`, err);
        throw err;
      }
    }

    // ============================================================
    // PER-USER NOTIFICATION EMISSION: Only for NEW messages
    // ============================================================
    // CRITICAL: Notifications are per-user, based on read state
    // A notification fires ONLY if:
    // 1. Message is new (atomic insert succeeded)
    // 2. User hasn't read this message (message.timestamp > lastReadAt)
    if (isNewMessage) {
      // Update conversation metadata (no unreadCount - that's per-user now)
      // CRITICAL: Do NOT update participantName here - it's a snapshot field
      // Snapshot fields are immutable except through explicit user edits
      const updatedConversation = await WhatsAppConversation.findByIdAndUpdate(
        conversation._id,
        {
          // participantName is a SNAPSHOT field - never update from webhooks
          lastMessageId: message.id,
          lastMessageContent: displayText.substring(0, 100),
          lastMessageTime: timestamp,
          lastIncomingMessageTime: timestamp,
          lastMessageDirection: "incoming",
          lastCustomerMessageAt: timestamp,
        },
        { new: true } // Return updated document
      );

      if (!updatedConversation) {
        console.error(`❌ [ERROR] Failed to update conversation ${conversation._id}`);
        return;
      }

      // Get all eligible users for this conversation
      const eligibleUsers = await getEligibleUsersForNotification(
        conversation,
        phoneNumberId
      );

      console.log(`👥 [ELIGIBLE USERS] Found ${eligibleUsers.length} eligible users for conversation ${conversation._id}`);

      // For each eligible user, check read state and emit notification if unread
      let notificationsEmitted = 0;
      for (const user of eligibleUsers) {
        // ============================================================
        // CRITICAL: Archive State Enforcement
        // ============================================================
        // Check if this user has archived the conversation
        // Archived conversations NEVER trigger notifications
        const archiveState = await ConversationArchiveState.findOne({
          conversationId: conversation._id,
          userId: user.userId,
          isArchived: true,
        }).lean() as any;

        if (archiveState) {
          console.log(`⏭️ [SKIP] User ${user.userId} has archived conversation ${conversation._id} - skipping notification`);
          continue; // Skip this user, try next
        }

        // Get user's read state for this conversation
        const readState = await ConversationReadState.findOne({
          conversationId: conversation._id,
          userId: user.userId,
        }).lean() as any;

        // Check if message is unread for this user
        // CRITICAL: Count messages with timestamp > lastReadAt
        const isUnread = !readState || !readState.lastReadAt || timestamp > new Date(readState.lastReadAt);

        if (isUnread) {
          // CRITICAL: Per-conversation emit debounce (prevents burst-spam)
          if (!canEmit(conversation._id.toString(), user.userId)) {
            console.log(`⏸️ [DEBOUNCE] Skipping notification emit for conversation ${conversation._id} to user ${user.userId}`);
            continue; // Skip this user, try next
          }
          
          // Generate stable eventId for deduplication
          const eventId = `${conversation._id}:${message.id}:${user.userId}`;
          
          // Generate deliveryId for acknowledgement tracking
          const deliveryId = `${eventId}:${Date.now()}`;
          
          // FREEZE: Use first message time for stable notification identity
          const firstMessageTime = conversation.firstMessageTime || conversation.createdAt || timestamp;
          
          console.log(`🔔 [NOTIFICATION] Emitting to user ${user.userId} (${user.role}): eventId=${eventId}, deliveryId=${deliveryId}`);
          
          // Emit notification to this specific user only
          emitWhatsAppEvent(WHATSAPP_EVENTS.NEW_MESSAGE, {
            deliveryId, // For acknowledgement tracking
            eventId, // Stable event ID for deduplication
            conversationId: conversation._id.toString(),
            businessPhoneId: phoneNumberId,
            assignedAgent: conversation.assignedAgent?.toString(),
            userId: user.userId, // Target user
            participantName: senderName,
            lastMessagePreview: displayText.substring(0, 100),
            lastMessageTime: timestamp,
            createdAt: firstMessageTime, // FREEZE: Use first message time for stable identity
            // Include reply context if this is a reply (for notification preview)
            isReply: !!replyToMessageId,
            replyToPreview: replyContext?.content?.text?.substring(0, 50) || replyContext?.content?.caption?.substring(0, 50),
            message: {
              id: savedMessage._id,
              messageId: message.id,
              from: senderPhone,
              to: phoneNumberId,
              type: message.type,
              content: contentObj,
              mediaUrl,
              mediaId,
              mimeType,
              filename,
              status: "delivered",
              direction: "incoming",
              timestamp,
              senderName,
              // Include reply context in message payload
              ...(replyToMessageId && {
                replyToMessageId,
                replyContext,
              }),
            },
          });
          
          notificationsEmitted++;
        } else {
          console.log(`⏭️ [SKIP] User ${user.userId} has already read this conversation (lastReadAt: ${readState.lastReadAt})`);
        }
      }

      console.log(`✅ [SUCCESS] Message saved, ${notificationsEmitted}/${eligibleUsers.length} notifications emitted: ${message.id}`, mediaUrl ? `(with media: ${mediaUrl.substring(0, 50)}...)` : "");
    }
    
    // NOTE: Automation logic moved BEFORE deduplication to ensure it runs even for duplicate webhooks

        // STEP 5: First Reply Detection (Simple)
    // ========================================
    // When an INBOUND WhatsApp message arrives:
    // - If firstReply === false, set firstReply = true, whatsappOptIn = true
    // - This is a ONE-WAY FLAG - never flip it back
    // - Used for safe retargeting to only message engaged leads
    try {
      const QueryModel = (await import("@/models/query")).default;
      const normalizedSender = (senderPhone || "").toString().replace(/\D/g, "");
      const tryLengths = [9, 8, 7]; // try last N digits to find a match
      let lead: any = null;

      for (const len of tryLengths) {
        if (normalizedSender.length < len) continue;
        const lastDigits = normalizedSender.slice(-len);
        const regex = new RegExp(`${lastDigits}$`);
        lead = await QueryModel.findOne({ phoneNo: { $regex: regex } });
        if (lead) break;
      }

      if (!lead) {
        console.log(`⚠️ No matching lead found for incoming number ${senderPhone}`);
      }

      // STEP 5: Only update if firstReply is false (idempotent, one-way)
      if (lead && !lead.firstReply) {
        // Atomic update - prevents race conditions
        const updateResult = await QueryModel.updateOne(
          { _id: lead._id, firstReply: { $ne: true } }, // Only update if not already true
          {
            $set: {
              firstReply: true,
              whatsappOptIn: true, // STEP 5: Mark as opted-in for retargeting
            }
          }
        );

        if (updateResult.modifiedCount > 0) {
          console.log(`✅ [AUDIT] Lead ${lead._id} marked firstReply=true, whatsappOptIn=true for ${senderPhone}`);

          // Emit a conversation update so UIs can react in real time
          emitWhatsAppEvent(WHATSAPP_EVENTS.CONVERSATION_UPDATE, {
            conversationId: conversation._id.toString(),
            businessPhoneId: phoneNumberId,
            phone: senderPhone,
            queryId: lead._id?.toString(),
            firstReply: true,
            whatsappOptIn: true,
          });
        }
      }
    } catch (err) {
      console.error("Error updating Query firstReply:", err);
    }
  } catch (error) {
    console.error("❌ Error processing incoming message:", error);
    throw error; // Re-throw to see in main error handler
  }
}

/**
 * STEP 4 & 6: Idempotent status update with error code handling
 * - Uses findOneAndUpdate with condition to prevent duplicate status events
 * - Detects error codes 131049 (blocked) and 131026 (rate limit) and updates lead accordingly
 * - Only emits socket event if status actually changed
 */
async function processStatusUpdate(status: any) {
  try {
    const messageId = status.id;
    const newStatus = status.status; // sent, delivered, read, failed
    const timestamp = new Date(parseInt(status.timestamp) * 1000);
    const recipientId = status.recipient_id;
    const errorCode = status.errors?.[0]?.code;

    // STEP 4: Find message first to check current status (idempotency check)
    const existingMessage = await WhatsAppMessage.findOne({ messageId });
    if (!existingMessage) {
      console.log(`⚠️ Status update for unknown message: ${messageId}`);
      return;
    }

    const previousStatus = existingMessage.status;

    // Skip if status hasn't changed (duplicate webhook)
    if (previousStatus === newStatus) {
      console.log(`⏭️ Duplicate status webhook for ${messageId}: ${newStatus}`);
      return;
    }

    // Build update object with statusEvents push and failureReason
    const updateObj: any = { 
      status: newStatus,
      $push: {
        statusEvents: {
          status: newStatus,
          timestamp,
          ...(newStatus === "failed" && status.errors?.[0] && {
            error: status.errors[0].message || status.errors[0].title
          })
        }
      }
    };

    // Add failureReason if status is failed
    if (newStatus === "failed" && status.errors?.[0]) {
      updateObj.failureReason = {
        code: status.errors[0].code?.toString(),
        message: status.errors[0].message || status.errors[0].title,
        raw: status.errors[0]
      };
    }

    // STEP 4: Atomic update with condition (only update if status != newStatus)
    const message = await WhatsAppMessage.findOneAndUpdate(
      { messageId, status: { $ne: newStatus } }, // Only update if status changed
      updateObj,
      { new: true }
    );

    if (!message) {
      console.log(`⏭️ Status already up-to-date for ${messageId}`);
      return;
    }

    // STEP 6: Handle error codes and update lead accordingly
    if (newStatus === "failed" && errorCode) {
      await handleWhatsAppErrorCode(errorCode, recipientId, messageId);
    }

    // Update conversation lastMessageStatus if this is the last message
    if (message.conversationId) {
      const conversation = await WhatsAppConversation.findById(message.conversationId);
      if (conversation && conversation.lastMessageId === messageId) {
        await WhatsAppConversation.findByIdAndUpdate(message.conversationId, {
          lastMessageStatus: newStatus,
        });
      }
    }

    // STEP 9: Only emit socket event if status actually changed
    emitWhatsAppEvent(WHATSAPP_EVENTS.MESSAGE_STATUS_UPDATE, {
      conversationId: message.conversationId.toString(),
      messageId,
      status: newStatus,
      previousStatus,
      timestamp,
      recipientId,
      errorCode: errorCode || null,
    });

    console.log(`✅ Message status updated: ${messageId} ${previousStatus} → ${newStatus}`);
  } catch (error) {
    console.error("Error processing status update:", error);
  }
}

/**
 * STEP 3: Error Code Driven Blocking (CRITICAL)
 * =============================================
 * Handle WhatsApp error codes with specific block reasons.
 * All updates are IDEMPOTENT - never flip whatsappBlocked back to false.
 * 
 * ERROR CODES:
 * - 131049: ecosystem_protection → PERMANENT BLOCK
 * - 131021: number_not_on_whatsapp → PERMANENT BLOCK
 * - 131215: groups_not_eligible → PERMANENT BLOCK
 * - 131026: rate_limited → Log only, allow manual retry after 24-48h
 * - 131042: billing_issue → System alert, no retry
 */
async function handleWhatsAppErrorCode(
  errorCode: number,
  recipientPhone: string,
  messageId: string
) {
  try {
    const QueryModel = (await import("@/models/query")).default;
    const normalizedPhone = (recipientPhone || "").replace(/\D/g, "");

    // Find lead by phone (try last 9, 8, 7 digits)
    let lead: any = null;
    for (const len of [9, 8, 7]) {
      if (normalizedPhone.length < len) continue;
      const lastDigits = normalizedPhone.slice(-len);
      const regex = new RegExp(`${lastDigits}$`);
      lead = await QueryModel.findOne({ phoneNo: { $regex: regex } });
      if (lead) break;
    }

    if (!lead) {
      console.log(`⚠️ [AUDIT] No lead found for error handling: ${normalizedPhone}`);
      return;
    }

    // Skip if already blocked (idempotent - never flip back to false)
    if (lead.whatsappBlocked === true) {
      console.log(`⏭️ [AUDIT] Lead ${lead._id} already blocked, skipping error ${errorCode}`);
      return;
    }

    const updateFields: any = {
      whatsappLastErrorCode: errorCode,
    };

    // =========================================================
    // ERROR CODE HANDLING (CRITICAL - determines blocking)
    // =========================================================
    
    switch (errorCode) {
      case 131049:
        // ECOSYSTEM PROTECTION: User blocked us or Meta detected spam
        // Action: PERMANENT BLOCK - never message again
        updateFields.whatsappBlocked = true;
        updateFields.whatsappBlockReason = "ecosystem_protection";
        console.log(`🚫 [AUDIT] Lead ${lead._id} BLOCKED: ecosystem_protection (131049)`);
        break;

      case 131021:
        // NUMBER NOT ON WHATSAPP: Phone number doesn't have WhatsApp
        // Action: PERMANENT BLOCK - no point retrying
        updateFields.whatsappBlocked = true;
        updateFields.whatsappBlockReason = "number_not_on_whatsapp";
        console.log(`🚫 [AUDIT] Lead ${lead._id} BLOCKED: number_not_on_whatsapp (131021)`);
        break;

      case 131215:
        // GROUPS NOT ELIGIBLE: Cannot message groups
        // Action: PERMANENT BLOCK - system limitation
        updateFields.whatsappBlocked = true;
        updateFields.whatsappBlockReason = "groups_not_eligible";
        console.log(`🚫 [AUDIT] Lead ${lead._id} BLOCKED: groups_not_eligible (131215)`);
        break;

      case 131026:
        // RATE LIMITED or temporarily unavailable
        // Action: DO NOT permanently block, allow manual retry after 24-48h
        console.log(`⏳ [AUDIT] Lead ${lead._id} rate limited (131026) - manual retry allowed after 24h`);
        // Only update error code, don't block
        break;

      case 131042:
        // BILLING ISSUE: Account billing problem
        // Action: System-level alert, no retry until resolved
        console.log(`💳 [AUDIT] BILLING ISSUE detected (131042) - requires admin attention`);
        // Log billing issue for admin review (could integrate with Slack/email)
        // Note: Not emitting socket event as this is a system-level issue
        break;

      default:
        console.log(`⚠️ [AUDIT] Lead ${lead._id} unknown error ${errorCode}`);
    }

    // Idempotent update with condition (don't update if already blocked)
    await QueryModel.updateOne(
      { _id: lead._id, whatsappBlocked: { $ne: true } },
      { $set: updateFields }
    );
  } catch (err) {
    console.error("Error handling WhatsApp error code:", err);
  }
}

/**
 * Process incoming call events from the "calls" webhook field
 * Handles: incoming voice/video calls, missed calls, call status changes
 */
async function processCallEvent(value: any) {
  try {
    const phoneNumberId = value.metadata?.phone_number_id;
    const calls = value.calls || [];

    for (const call of calls) {
      const callData = {
        callId: call.id,
        from: call.from,
        to: call.to || phoneNumberId,
        callType: call.type || "voice", // voice, video
        callStatus: call.status, // ringing, answered, missed, declined, ended
        timestamp: call.timestamp ? new Date(parseInt(call.timestamp) * 1000) : new Date(),
        duration: call.duration || 0,
        phoneNumberId,
      };

      console.log(`📞 Call event: ${callData.callStatus} from ${callData.from}`);

      // Emit different events based on call status
      if (callData.callStatus === "ringing") {
        emitWhatsAppEvent(WHATSAPP_EVENTS.INCOMING_CALL, {
          ...callData,
          callerInfo: value.contacts?.[0] || null,
        });
      } else if (callData.callStatus === "missed") {
        emitWhatsAppEvent(WHATSAPP_EVENTS.CALL_MISSED, callData);
      } else {
        emitWhatsAppEvent(WHATSAPP_EVENTS.CALL_STATUS_UPDATE, callData);
      }

      // Optionally store call logs in conversation
      const conversation = await WhatsAppConversation.findOne({
        participantPhone: call.from,
        businessPhoneId: phoneNumberId,
      });

      if (conversation) {
        // Update conversation with call info
        await WhatsAppConversation.findByIdAndUpdate(conversation._id, {
          lastCallTime: callData.timestamp,
          lastCallStatus: callData.callStatus,
        });
      }
    }
  } catch (error) {
    console.error("❌ Error processing call event:", error);
  }
}

/**
 * Process history sync events from the "history" webhook field
 * Handles: message history synchronization from devices
 */
async function processHistoryEvent(value: any, entryId: string) {
  try {
    console.log(`📜 History sync event for account: ${entryId}`);
    
    const historyData = {
      accountId: entryId,
      syncType: value.sync_type || "messages",
      progress: value.progress || 0,
      messagesCount: value.messages_count || 0,
      timestamp: new Date(),
      status: value.status || "in_progress",
    };

    // Emit history sync event for UI updates
    emitWhatsAppEvent(WHATSAPP_EVENTS.HISTORY_SYNC, {
      ...historyData,
      messages: value.messages || [],
    });

    console.log(`✅ History sync: ${historyData.syncType} - ${historyData.progress}%`);
  } catch (error) {
    console.error("❌ Error processing history event:", error);
  }
}

/**
 * Process SMB app state sync events from the "smb_app_state_sync" webhook field
 * Handles: App state synchronization for small/medium businesses
 */
async function processAppStateSyncEvent(value: any, entryId: string) {
  try {
    console.log(`🔄 App state sync event for account: ${entryId}`);

    const appStateData = {
      accountId: entryId,
      stateType: value.state_type,
      action: value.action, // add, delete, update
      timestamp: new Date(),
      data: value.data || {},
    };

    // Emit app state sync event for UI updates
    emitWhatsAppEvent(WHATSAPP_EVENTS.APP_STATE_SYNC, appStateData);

    console.log(`✅ App state sync: ${appStateData.stateType} - ${appStateData.action}`);
  } catch (error) {
    console.error("❌ Error processing app state sync:", error);
  }
}

/**
 * Process message echo events from the "smb_message_echoes" webhook field
 * Handles: Messages sent from other devices/interfaces appearing in webhook
 */
async function processMessageEchoEvent(value: any) {
  try {
    const phoneNumberId = value.metadata?.phone_number_id;
    const messages = value.messages || [];

    for (const message of messages) {
        // E.164 normalization: only digits, 7-15 digits, no leading zero
        let recipientPhone = message.to;
        recipientPhone = recipientPhone.replace(/\D/g, "");
        if (!/^[1-9][0-9]{6,14}$/.test(recipientPhone)) {
          console.error("❌ Invalid recipient phone (not E.164):", recipientPhone);
          return;
        }
      const timestamp = message.timestamp ? new Date(parseInt(message.timestamp) * 1000) : new Date();

      console.log(`🔁 Message echo: ${message.type} to ${recipientPhone}`);

      // Find or create conversation using snapshot-safe helper
      // CRITICAL: Message echoes are "untrusted" - they must NEVER overwrite snapshot fields
      const conversation = await findOrCreateConversationWithSnapshot({
        participantPhone: recipientPhone,
        businessPhoneId: phoneNumberId,
        participantName: recipientPhone, // Fallback name for new conversations only
        snapshotSource: "untrusted", // CRITICAL: Never overwrite existing snapshot fields
      }) as any; // Cast to any to access Mongoose document properties like _id

      // Extract message content based on type
      let contentObj: { text?: string; caption?: string; location?: any; interactivePayload?: any } = {};
      let mediaUrl = "";
      let mediaId = "";
      let mimeType = "";
      let filename = "";

      switch (message.type) {
        case "text":
          contentObj.text = message.text?.body || "";
          break;
        case "image":
          contentObj.caption = message.image?.caption || "";
          mediaId = message.image?.id;
          const imageMedia = await getMediaPermanentUrl(message.image?.id, message.image?.mime_type);
          if (imageMedia) {
            mediaUrl = imageMedia.url;
            mimeType = imageMedia.mimeType;
          }
          break;
        case "document":
          contentObj.caption = message.document?.caption || "";
          mediaId = message.document?.id;
          filename = message.document?.filename || "document";
          const docMedia = await getMediaPermanentUrl(message.document?.id, message.document?.mime_type);
          if (docMedia) {
            mediaUrl = docMedia.url;
            mimeType = docMedia.mimeType;
          }
          break;
        case "audio":
          contentObj.text = "🎵 Audio message";
          mediaId = message.audio?.id;
          const audioMedia = await getMediaPermanentUrl(message.audio?.id, message.audio?.mime_type);
          if (audioMedia) {
            mediaUrl = audioMedia.url;
            mimeType = audioMedia.mimeType;
          }
          break;
        case "video":
          contentObj.caption = message.video?.caption || "";
          mediaId = message.video?.id;
          const videoMedia = await getMediaPermanentUrl(message.video?.id, message.video?.mime_type);
          if (videoMedia) {
            mediaUrl = videoMedia.url;
            mimeType = videoMedia.mimeType;
          }
          break;
        case "template":
          contentObj.text = `📋 Template: ${message.template?.name || "Unknown"}`;
          break;
        default:
          contentObj.text = `${message.type} message`;
      }

      // Generate display text for conversation last message
      const displayText = contentObj.text || contentObj.caption || `${message.type} message`;

      // Check if message already exists (avoid duplicates)
      const existingMessage = await WhatsAppMessage.findOne({ 
        messageId: message.id,
        businessPhoneId: phoneNumberId
      });
      
      if (!existingMessage) {
        // Save echoed message to database
        const savedMessage = await WhatsAppMessage.create({
          conversationId: conversation._id,
          messageId: message.id,
          businessPhoneId: phoneNumberId,
          from: phoneNumberId,
          to: recipientPhone,
          type: message.type,
          content: contentObj,
          mediaUrl,
          mediaId,
          mimeType,
          filename,
          status: "sent",
          statusEvents: [{ status: "sent", timestamp }],
          direction: "outgoing",
          timestamp,
          conversationSnapshot: {
            participantPhone: recipientPhone,
            assignedAgent: conversation.assignedAgent,
          },
        });

        // Update conversation last message
        await WhatsAppConversation.findByIdAndUpdate(conversation._id, {
          lastMessageId: message.id,
          lastMessageContent: displayText.substring(0, 100),
          lastMessageTime: timestamp,
          lastMessageDirection: "outgoing",
          lastOutgoingMessageTime: timestamp,
        });

        // Emit message echo event for real-time UI sync
        emitWhatsAppEvent(WHATSAPP_EVENTS.MESSAGE_ECHO, {
          conversationId: conversation._id.toString(),
          businessPhoneId: phoneNumberId,
          message: {
            id: savedMessage._id,
            messageId: message.id,
            from: phoneNumberId,
            to: recipientPhone,
            type: message.type,
            content: contentObj,
            mediaUrl,
            mediaId,
            mimeType,
            filename,
            status: "sent",
            direction: "outgoing",
            timestamp,
            isEcho: true,
          },
        });

        console.log(`✅ Message echo saved: ${message.id}`);
      } else {
        console.log(`⏭️ Message echo already exists: ${message.id}`);
      }
    }
  } catch (error) {
    console.error("❌ Error processing message echo:", error);
  }
}
