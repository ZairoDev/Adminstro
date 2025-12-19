import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/util/db";
import WhatsAppMessage from "@/models/whatsappMessage";
import WhatsAppConversation from "@/models/whatsappConversation";
import { emitWhatsAppEvent, WHATSAPP_EVENTS } from "@/lib/pusher";
import { getWhatsAppToken, WHATSAPP_API_BASE_URL } from "@/lib/whatsapp/config";

// Ensure database connection
connectDb();


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
    
    console.log("📩 Incoming webhook payload:", JSON.stringify(body, null, 2));

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

async function processIncomingMessage(
  message: any,
  contact: any,
  metadata: any
) {
  try {
    const phoneNumberId = metadata?.phone_number_id;
    const senderPhone = message.from;
    const senderName = contact?.profile?.name || senderPhone;
    const timestamp = new Date(parseInt(message.timestamp) * 1000);

    console.log(`📱 Processing message from ${senderPhone} (${senderName}) to phone ID: ${phoneNumberId}`);

    // Validate required fields
    if (!senderPhone || !phoneNumberId) {
      console.error("❌ Missing required fields - senderPhone:", senderPhone, "phoneNumberId:", phoneNumberId);
      return;
    }

    // Get or create conversation
    let conversation = await WhatsAppConversation.findOne({
      participantPhone: senderPhone,
      businessPhoneId: phoneNumberId,
    });

    if (!conversation) {
      console.log(`📝 Creating new conversation for ${senderPhone}`);
      conversation = await WhatsAppConversation.create({
        participantPhone: senderPhone,
        participantName: senderName,
        businessPhoneId: phoneNumberId,
        status: "active",
        unreadCount: 1,
      });

      // Emit new conversation event via Socket.io
      emitWhatsAppEvent(WHATSAPP_EVENTS.NEW_CONVERSATION, {
        conversation: {
          id: conversation._id,
          participantPhone: senderPhone,
          participantName: senderName,
          unreadCount: 1,
          lastMessageTime: timestamp,
          businessPhoneId: phoneNumberId,
        },
      });
    } else {
      console.log(`📝 Updating existing conversation ${conversation._id} for ${senderPhone}`);
      // Update conversation with new message info
      await WhatsAppConversation.findByIdAndUpdate(conversation._id, {
        participantName: senderName,
        $inc: { unreadCount: 1 },
      });
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
        contentObj.text = message.button?.text || "Button response";
        break;
        
      case "interactive":
        contentObj.text = message.interactive?.button_reply?.title || 
                  message.interactive?.list_reply?.title || 
                  "Interactive response";
        contentObj.interactivePayload = message.interactive;
        break;
        
      case "reaction":
        contentObj.text = `Reacted: ${message.reaction?.emoji || "👍"}`;
        break;
        
      default:
        contentObj.text = `${message.type} message`;
    }

    // Generate display text for conversation last message
    const displayText = contentObj.text || contentObj.caption || 
      (contentObj.location ? `📍 ${contentObj.location.name || 'Location'}` : '') ||
      `${message.type} message`;

    // Save message to database with permanent media URL
    const savedMessage = await WhatsAppMessage.create({
      conversationId: conversation._id,
      messageId: message.id,
      businessPhoneId: phoneNumberId,
      from: senderPhone,
      to: phoneNumberId,
      type: message.type,
      content: contentObj,
      mediaUrl, // Permanent CDN URL
      mediaId,
      mimeType,
      filename,
      status: "delivered",
      statusEvents: [{ status: "delivered", timestamp }],
      direction: "incoming",
      timestamp,
      conversationSnapshot: {
        participantPhone: senderPhone,
        assignedAgent: conversation.assignedAgent,
      },
    });

    // Update conversation last message
    await WhatsAppConversation.findByIdAndUpdate(conversation._id, {
      lastMessageId: message.id,
      lastMessageContent: displayText.substring(0, 100),
      lastMessageTime: timestamp,
      lastMessageDirection: "incoming",
      lastCustomerMessageAt: timestamp,
      lastIncomingMessageTime: timestamp,
    });

    // Emit new message via Socket.io
    emitWhatsAppEvent(WHATSAPP_EVENTS.NEW_MESSAGE, {
      conversationId: conversation._id.toString(),
      businessPhoneId: phoneNumberId,
      message: {
        id: savedMessage._id,
        messageId: message.id,
        from: senderPhone,
        to: phoneNumberId,
        type: message.type,
        content: contentObj,
        mediaUrl, // Include permanent URL in socket event
        mediaId,
        mimeType,
        filename,
        status: "delivered",
        direction: "incoming",
        timestamp,
        senderName,
      },
    });

    console.log("✅ Message saved and broadcasted:", message.id, mediaUrl ? `(with media: ${mediaUrl.substring(0, 50)}...)` : "");
  } catch (error) {
    console.error("❌ Error processing incoming message:", error);
    throw error; // Re-throw to see in main error handler
  }
}

async function processStatusUpdate(status: any) {
  try {
    const messageId = status.id;
    const newStatus = status.status; // sent, delivered, read, failed
    const timestamp = new Date(parseInt(status.timestamp) * 1000);
    const recipientId = status.recipient_id;

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

    // Update message status in database
    const message = await WhatsAppMessage.findOneAndUpdate(
      { messageId },
      updateObj,
      { new: true }
    );

    if (message) {
      // Emit status update via Socket.io
      emitWhatsAppEvent(WHATSAPP_EVENTS.MESSAGE_STATUS_UPDATE, {
        conversationId: message.conversationId.toString(),
        messageId,
        status: newStatus,
        timestamp,
        recipientId,
      });

      console.log("Message status updated:", messageId, newStatus);
    }
  } catch (error) {
    console.error("Error processing status update:", error);
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
      const recipientPhone = message.to;
      const timestamp = message.timestamp ? new Date(parseInt(message.timestamp) * 1000) : new Date();

      console.log(`🔁 Message echo: ${message.type} to ${recipientPhone}`);

      // Find or create conversation
      let conversation = await WhatsAppConversation.findOne({
        participantPhone: recipientPhone,
        businessPhoneId: phoneNumberId,
      });

      if (!conversation) {
        conversation = await WhatsAppConversation.create({
          participantPhone: recipientPhone,
          participantName: recipientPhone,
          businessPhoneId: phoneNumberId,
          status: "active",
          unreadCount: 0,
        });
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
