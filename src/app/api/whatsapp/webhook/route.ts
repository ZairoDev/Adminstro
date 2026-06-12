import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/util/db";
import WhatsAppMessage from "@/models/whatsappMessage";
import WhatsAppConversation from "@/models/whatsappConversation";
import { emitWhatsAppEvent, WHATSAPP_EVENTS } from "@/lib/pusher";
import { sendExpoPushToEmployee } from "@/services/push/expoPush.service";
import { getWhatsAppToken, WHATSAPP_API_BASE_URL, WHATSAPP_ACCESS_ROLES } from "@/lib/whatsapp/config";
import {
  getActiveChannelByPhoneNumberId,
  getOutboundTokenForPhoneId,
} from "@/lib/whatsapp/channelService";
import ConversationReadState from "@/models/conversationReadState";
import ConversationArchiveState from "@/models/conversationArchiveState";
import Employee from "@/models/employee";
import { findOrCreateConversationWithSnapshot } from "@/lib/whatsapp/conversationHelper";
import { resolveLocationFromLeadPhone } from "@/lib/whatsapp/locationAccess";
import { isLocationAllowedForPhone } from "@/lib/whatsapp/phoneAreaConfigService";
import { getWhatsAppErrorInfo } from "@/lib/whatsapp/errorHandler";
import crypto from "crypto";
import fs from "fs/promises";
import os from "os";
import path from "path";
import { spawn } from "child_process";
import ffmpegPath from "ffmpeg-static";
import {
  shouldEmitSdpAnswerAndMark,
  updateCallFromMetaStatus,
  recordUserInitiatedIncomingOffer,
  createIncomingCallInternalChatMessage,
} from "@/services/whatsapp-calling/callHistoryService";
import { getEligibleUsersForNotification } from "@/lib/whatsapp/notificationRecipients";
import { emitWhatsAppEventToEligibleUsers } from "@/lib/whatsapp/emitToEligibleUsers";

export const dynamic = "force-dynamic";

connectDb();

// Per-conversation emit debounce (prevents burst-spam)
// Key: `${conversationId}:${userId}`, Value: last emit timestamp
const lastEmitMap = new Map<string, number>();
const EMIT_DEBOUNCE_MS = 300;
const CLEANUP_INTERVAL = 60000;
let lastCleanup = 0;

function canEmit(conversationId: string, userId: string): boolean {
  const key = `${conversationId}:${userId}`;
  const now = Date.now();
  const last = lastEmitMap.get(key) ?? 0;

  if (now - last < EMIT_DEBOUNCE_MS) {
    return false;
  }
  
  lastEmitMap.set(key, now);
  
  if (lastEmitMap.size > 500 || now - lastCleanup > CLEANUP_INTERVAL) {
    const cutoff = now - CLEANUP_INTERVAL;
    for (const [k, v] of lastEmitMap.entries()) {
      if (v < cutoff) lastEmitMap.delete(k);
    }
    lastCleanup = now;
  }
  
  return true;
}


export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    
    const mode = searchParams.get("hub.mode");
    const token = searchParams.get("hub.verify_token");
    const challenge = searchParams.get("hub.challenge");



    // Your verify token - you can set this in your Meta Developer Console
    const VERIFY_TOKEN = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || "vacationsaga_whatsapp_webhook";

    if (mode === "subscribe" && token === VERIFY_TOKEN) {

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
  console.log("🚨 WEBHOOK ENTERED");
  try {
    const rawBody = await req.text();
    const body = JSON.parse(rawBody);

    console.log(
      "🚨 FULL WEBHOOK",
      JSON.stringify(body, null, 2),
    );

    await connectDb();

    const signature = req.headers.get('x-hub-signature-256');

    if (signature && process.env.WHATSAPP_APP_SECRET) {
      const expectedSignature = crypto
        .createHmac('sha256', process.env.WHATSAPP_APP_SECRET)
        .update(rawBody)
        .digest('hex');
      
      if (signature !== `sha256=${expectedSignature}`) {
        console.error('❌ Invalid webhook signature');
        return NextResponse.json({ error: 'Invalid signature' }, { status: 403 });
      }
    }

    // Process the webhook event
    if (body.object === "whatsapp_business_account") {
      const entries = body.entry || [];
      
      for (const entry of entries) {
        const changes = entry.changes || [];
        
        for (const change of changes) {
          
          if (change.field === "messages") {
            const value = change.value;
            console.log("📩 [webhook] messages change", {
              messagesCount: Array.isArray(value?.messages) ? value.messages.length : 0,
              statusesCount: Array.isArray(value?.statuses) ? value.statuses.length : 0,
              phoneNumberId: value?.metadata?.phone_number_id || null,
            });
            
            // Handle incoming messages
            if (value.messages && value.messages.length > 0) {
              for (const message of value.messages) {
                await processIncomingMessage(message, value.contacts?.[0], value.metadata);
              }
            }
            
            // Handle message status updates
            if (value.statuses && value.statuses.length > 0) {
              for (const status of value.statuses) {
                await processStatusUpdate(status);
              }
            }
          }

          // Handle calls webhook field (Subscribed)
          if (change.field === "calls") {
            await processCallEvent(change.value);
          }

          // Handle history webhook field (Subscribed)
          if (change.field === "history") {
            await processHistoryEvent(change.value, entry.id);
          }

          // Handle smb_app_state_sync webhook field (Subscribed)
          if (change.field === "smb_app_state_sync") {
            await processAppStateSyncEvent(change.value, entry.id);
          }

          // Handle smb_message_echoes webhook field (Subscribed)
          if (change.field === "smb_message_echoes") {
            await processMessageEchoEvent(change.value);
          }
        }
      }
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
  mimeTypeHint?: string,
  phoneNumberId?: string,
): Promise<{ url: string; mimeType: string } | null> {
  try {
    const whatsappToken = phoneNumberId
      ? await getOutboundTokenForPhoneId(phoneNumberId)
      : getWhatsAppToken();
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

    let mediaBuffer = await mediaResponse.arrayBuffer();

    // Step 4: Upload to Bunny CDN
    let finalMimeType = mimeType || "application/octet-stream";

    // iOS can't reliably play WhatsApp voice notes (audio/ogg; codecs=opus).
    // Transcode ogg/opus → m4a (aac) so mobile clients can play incoming voice notes.
    const isOggOpus =
      finalMimeType.includes("audio/ogg") ||
      finalMimeType.includes("audio/opus") ||
      finalMimeType.includes("ogg");

    if (isOggOpus && ffmpegPath) {
      try {
        const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "wa-audio-"));
        const inPath = path.join(tmpDir, `${mediaId}.ogg`);
        const outPath = path.join(tmpDir, `${mediaId}.m4a`);
        await fs.writeFile(inPath, Buffer.from(mediaBuffer));

        await new Promise<void>((resolve, reject) => {
          const args = [
            "-y",
            "-i",
            inPath,
            "-c:a",
            "aac",
            "-b:a",
            "128k",
            "-movflags",
            "+faststart",
            outPath,
          ];
          const p = spawn(ffmpegPath as string, args);
          let err = "";
          p.stderr.on("data", (d) => (err += String(d)));
          p.on("error", reject);
          p.on("close", (code) => {
            if (code === 0) return resolve();
            reject(new Error(`ffmpeg failed (${code}): ${err.slice(0, 400)}`));
          });
        });

        const outBuf = await fs.readFile(outPath);
        mediaBuffer = outBuf.buffer.slice(outBuf.byteOffset, outBuf.byteOffset + outBuf.byteLength);
        finalMimeType = "audio/mp4";
        await fs.rm(tmpDir, { recursive: true, force: true });
      } catch (e) {
        console.error("Audio transcode failed; falling back to original:", e);
      }
    }

    const ext =
      finalMimeType.startsWith("audio/") ? "m4a" : (finalMimeType.split("/")[1] || "bin");
    const filename = `whatsapp/${Date.now()}-${mediaId}.${ext}`;

    const uploadResponse = await fetch(
      `https://storage.bunnycdn.com/${storageZoneName}/${filename}`,
      {
        method: "PUT",
        headers: {
          AccessKey: accessKey,
          "Content-Type": finalMimeType || "application/octet-stream",
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
      mimeType: finalMimeType,
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
    const whatsappToken = await getOutboundTokenForPhoneId(phoneNumberId);
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

    // Emit socket event for real-time frontend updates (global)
    const emitPayload = {
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
    };
    emitWhatsAppEvent(WHATSAPP_EVENTS.NEW_MESSAGE, emitPayload);
    // Note: phone-specific room emission is handled centrally in lib/pusher.emitWhatsAppEvent

    console.log(`✅ guest_questions message saved to DB and emitted to frontend`);
  } catch (error) {
    console.error("❌ Error sending guest_questions template:", error);
  }
}

async function processIncomingMessage(
  message: any,
  contact: any,
  metadata: any
) {
  try {
    const phoneNumberId = metadata?.phone_number_id;
    console.log("📩 [webhook] processIncomingMessage", {
      phoneNumberId: phoneNumberId || null,
      messageId: message?.id || null,
      from: message?.from ? String(message.from).replace(/\d(?=\d{4})/g, "x") : null,
      type: message?.type || null,
    });
    let senderPhone = message.from;
    senderPhone = senderPhone.replace(/\D/g, "");
    if (senderPhone.length < 7 || senderPhone.length > 15) {
      console.error("❌ Invalid phone number length:", senderPhone);
      return;
    }
    const senderName = contact?.profile?.name || senderPhone;
    const timestamp = new Date(parseInt(message.timestamp) * 1000);

    // Minimal entry log - detailed logs only on success/failure

    // Validate required fields
    if (!senderPhone || !phoneNumberId) {
      console.error("❌ Missing required fields - senderPhone:", senderPhone, "phoneNumberId:", phoneNumberId);
      return;
    }

    const inboundChannel = await getActiveChannelByPhoneNumberId(String(phoneNumberId));
    if (!inboundChannel) {
      console.warn("⚠️ [webhook] phone_number_id not registered as active WhatsappChannel", {
        phoneNumberId,
      });
    }

    // Inbound webhooks never filter on legacy WHATSAPP_PHONE_CONFIGS — any Meta line is accepted.

    // Try to resolve participant location from CRM lead data (trusted backfill only)
    const rawLeadLocation = await resolveLocationFromLeadPhone(senderPhone);
    const leadLocation =
      rawLeadLocation &&
      (await isLocationAllowedForPhone(String(phoneNumberId), rawLeadLocation))
        ? rawLeadLocation
        : null;

    // Get or create conversation using snapshot-safe helper.
    // CRITICAL: Webhooks are "untrusted" - they must NEVER overwrite snapshot fields
    // on existing conversations. Only allowed to set snapshots on NEW conversations.
    // Exception: participantLocation backfill from CRM lead lookup uses "trusted"
    // semantics so new inbound conversations get location set automatically.
    //
    // isInboundWebhook: true → channel is resolved via getActiveChannelByPhoneNumberId
    // (phoneNumberId only — race-condition safe against admin remaps).
    const conversation = await findOrCreateConversationWithSnapshot({
      participantPhone: senderPhone,
      businessPhoneId: phoneNumberId,
      participantName: senderName,
      ...(leadLocation ? { participantLocation: leadLocation } : {}),
      snapshotSource: leadLocation ? "trusted" : "untrusted",
      isInboundWebhook: true,
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
          message.image?.mime_type,
          phoneNumberId,
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
          message.document?.mime_type,
          phoneNumberId,
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
          message.audio?.mime_type,
          phoneNumberId,
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
          message.video?.mime_type,
          phoneNumberId,
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
          message.sticker?.mime_type,
          phoneNumberId,
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
        if (message.interactive?.type === "call_permission_reply") {
          const reply = message.interactive?.call_permission_reply;
          const response = reply?.response || "unknown";
          const isPermanent = Boolean(reply?.is_permanent);
          const expirationTs = reply?.expiration_timestamp ? Number(reply.expiration_timestamp) : undefined;
          contentObj.text =
            response === "accept"
              ? `📞 Call permission granted (${isPermanent ? "permanent" : "temporary"})`
              : response === "reject"
                ? "📞 Call permission declined"
                : "📞 Call permission updated";
          contentObj.interactivePayload = message.interactive;

          // Persist permission state on conversation metadata for quick UI access
          try {
            await WhatsAppConversation.updateOne(
              { _id: conversation._id },
              {
                $set: {
                  "metadata.callPermission": {
                    status:
                      response === "accept"
                        ? isPermanent
                          ? "permanent"
                          : "temporary"
                        : "no_permission",
                    isPermanent,
                    ...(expirationTs ? { expirationTimestamp: expirationTs } : {}),
                    updatedAt: new Date(),
                    responseSource: reply?.response_source || null,
                  },
                },
              },
            );
          } catch (err) {
            console.error("Failed to persist call permission state:", err);
          }
        } else {
          contentObj.text =
            message.interactive?.button_reply?.title ||
            message.interactive?.button_reply?.id ||
            message.interactive?.list_reply?.title ||
            message.interactive?.list_reply?.id ||
            "Interactive response";
          contentObj.interactivePayload = message.interactive;
        }
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
      replyContext = {
        messageId: replyToMessageId,
      };
      console.log(`↩️ [REPLY] Message ${message.id} is a reply to ${replyToMessageId}`);
    }

    // ============================================================
    // ATOMIC UPSERT: Insert new message or detect duplicate
    // ============================================================
    const result = await WhatsAppMessage.findOneAndUpdate(
      { messageId: message.id, businessPhoneId: phoneNumberId },
      {
        $setOnInsert: {
          conversationId: conversation._id,
          businessPhoneId: phoneNumberId,
          from: senderPhone,
          to: phoneNumberId,
          type: message.type,
          content: contentObj,
          mediaUrl,
          mediaId,
          mimeType,
          filename,
          source: "meta",
          direction: "incoming",
          timestamp,
          status: "delivered",
          statusEvents: [{ status: "delivered", timestamp }],
          conversationSnapshot: {
            participantPhone: senderPhone,
            assignedAgent: conversation.assignedAgent,
          },
          ...(message.type === "reaction" && {
            reactedToMessageId: message.reaction?.message_id,
            reactionEmoji: message.reaction?.emoji || "👍",
          }),
          ...(replyToMessageId && {
            replyToMessageId,
            replyContext,
          }),
        },
      },
      { upsert: true, new: true, rawResult: true }
    ) as any;
    
    const isNewMessage = result.lastErrorObject?.upserted !== undefined;
    const savedMessage = result.value;
    
    // ============================================================
    // DUPLICATE MESSAGE HANDLING: Full idempotency using modifiedCount
    // ============================================================
    if (!isNewMessage) {
      // Use updateOne with modifiedCount for precise idempotency check
      const conversationUpdateResult = await WhatsAppConversation.updateOne(
        {
          _id: conversation._id,
          $or: [
            { lastMessageTime: { $lt: timestamp } },
            { lastMessageTime: { $exists: false } }
          ]
        },
        {
          $set: {
            lastMessageId: message.id,
            lastMessageContent: displayText.substring(0, 100),
            lastMessageTime: timestamp,
            lastIncomingMessageTime: timestamp,
            lastMessageDirection: "incoming",
            lastCustomerMessageAt: timestamp,
          }
        }
      );

      // CRITICAL IDEMPOTENCY CHECK: Skip all processing if nothing changed
      if (conversationUpdateResult.modifiedCount === 0) {
        // Silent skip - no log spam for true duplicates
        return;
      }

      // Conversation metadata was updated - now check if any users need notification
      const existingMessageRaw = await WhatsAppMessage.findOne({
        messageId: message.id,
        businessPhoneId: phoneNumberId,
      }).lean();

      const existingMessage = existingMessageRaw && !Array.isArray(existingMessageRaw)
        ? existingMessageRaw
        : null;
      
      if (!existingMessage) return;

      const eligibleUsers = await getEligibleUsersForNotification(conversation);
      if (!eligibleUsers.length) return;

      // Batch read-state query
      const userIds = eligibleUsers.map(u => u.userId);
      const readStates = await ConversationReadState.find({
        conversationId: conversation._id,
        userId: { $in: userIds }
      }).lean();

      const readStateMap = new Map(
        readStates.map((rs: any) => [rs.userId.toString(), rs.lastReadAt])
      );

      const timestampMs = timestamp.getTime();
      let emittedCount = 0;

      for (const user of eligibleUsers) {
        const lastReadAt = readStateMap.get(user.userId);
        const lastReadMs = lastReadAt ? new Date(lastReadAt).getTime() : 0;
        const isUnread = timestampMs > lastReadMs;

        if (!isUnread) continue;
        if (!canEmit(conversation._id.toString(), user.userId)) continue;

        const eventId = `${conversation._id}:${message.id}:${user.userId}:duplicate`;
        const deliveryId = `${eventId}:${Date.now()}`;

        emitWhatsAppEvent(WHATSAPP_EVENTS.NEW_MESSAGE, {
          deliveryId,
          eventId,
          conversationId: conversation._id.toString(),
          businessPhoneId: phoneNumberId,
          isRetarget: !!(conversation as any).isRetarget,
          retargetStage: (conversation as any).retargetStage,
          ownerRole: (conversation as any).ownerRole,
          userId: user.userId,
          participantName: senderName,
          lastMessagePreview: displayText.substring(0, 100),
          lastMessageTime: timestamp,
          message: {
            id: existingMessage._id,
            messageId: message.id,
            from: senderPhone,
            to: phoneNumberId,
            type: message.type,
            content: contentObj,
            mediaUrl,
            status: "delivered",
            direction: "incoming",
            timestamp,
          },
        });
        emittedCount += 1;
      }

      // Only log if something was actually emitted
      if (emittedCount > 0) {
        console.log(`📨 [DUP-EMIT] ${message.id} → ${emittedCount} user(s)`);
      }
      return;
    }
    
    // ============================================================
    // NEW MESSAGE PROCESSING
    // ============================================================
    // New message saved - continue to automation and notifications
    
    // ============================================================
    // AUTOMATION: Check for "Yes, I'm interested" and send follow-up
    // ============================================================
    const extractedText = 
      contentObj.text || 
      message.button?.text || 
      message.button?.payload || 
      message.interactive?.button_reply?.title ||
      message.interactive?.list_reply?.title ||
      message.interactive?.button_reply?.id ||
      "";

    const messageText = extractedText.trim().toLowerCase();
    
    const isYesInterested = 
      messageText === "yes, i'm interested" ||
      messageText === "yes im interested" ||
      messageText === "yes i am interested" ||
      messageText === "yes, im interested" ||
      messageText === "yes, i am interested" ||
      (messageText.includes("yes") && messageText.includes("interested"));

    if (isYesInterested) {
      const guestQuestionsAlreadySent = await WhatsAppMessage.findOne({
        conversationId: conversation._id,
        direction: "outgoing",
        type: "template",
        templateName: "guest_questions",
      }).lean();

      if (!guestQuestionsAlreadySent) {
        const lastOutgoingTemplate = await WhatsAppMessage.findOne({
          conversationId: conversation._id,
          direction: "outgoing",
          type: "template",
          templateName: "guest_greeting",
        }).sort({ timestamp: -1 }).lean() as any;

        if (lastOutgoingTemplate) {
          const QueryModel = (await import("@/models/query")).default;
          const normalizedSender = (senderPhone || "").toString().replace(/\D/g, "");
          const patterns = [
            normalizedSender,
            normalizedSender.slice(-10),
            normalizedSender.slice(-9),
            normalizedSender.slice(-8),
            normalizedSender.slice(-7),
          ].filter((p) => p.length >= 7);

          const lead = await QueryModel.findOne({
            $or: patterns.map((p) => ({ phoneNo: new RegExp(p + '$') }))
          });

          const leadName = lead?.name || conversation.participantName || senderPhone;
          
          await sendGuestQuestionsTemplate(
            senderPhone,
            leadName,
            phoneNumberId,
            conversation._id.toString()
          ).catch((err) => console.error("❌ [AUTOMATION] Error sending guest_questions:", err));
        }
      }
    }

    // ============================================================
    // UPDATE CONVERSATION METADATA
    // ============================================================
    const updatedConversation = await WhatsAppConversation.findOneAndUpdate(
      { 
        _id: conversation._id,
        $or: [
          { lastMessageTime: { $lt: timestamp } },
          { lastMessageTime: { $exists: false } }
        ]
      },
      {
        lastMessageId: message.id,
        lastMessageContent: displayText.substring(0, 100),
        lastMessageTime: timestamp,
        lastIncomingMessageTime: timestamp,
        lastMessageDirection: "incoming",
        lastCustomerMessageAt: timestamp,
      },
      { new: true }
    );

    if (!updatedConversation) {
      console.log(`⏭️ [SKIP] Conversation ${conversation._id} already has newer message`);
      return;
    }

    // ============================================================
    // GET ELIGIBLE USERS AND EMIT NOTIFICATIONS
    // ============================================================
    const eligibleUsers = await getEligibleUsersForNotification(conversation);

    if (!eligibleUsers.length) {
      console.log(`✅ [NEW] ${message.id} saved (no eligible users)`);
      return;
    }

    const archiveState = await ConversationArchiveState.findOne({
      conversationId: conversation._id,
      isArchived: true,
    }).lean() as any;

    const isArchived = !!archiveState;

    const userIds = eligibleUsers.map(u => u.userId);
    const readStates = await ConversationReadState.find({
      conversationId: conversation._id,
      userId: { $in: userIds }
    }).lean();

    const readStateMap = new Map(
      readStates.map((rs: any) => [rs.userId.toString(), rs.lastReadAt])
    );

    let notificationsEmitted = 0;
    const timestampMs = timestamp.getTime();
    const firstMessageTime = conversation.firstMessageTime || conversation.createdAt || timestamp;
    
    for (const user of eligibleUsers) {
      const lastReadAt = readStateMap.get(user.userId);
      const lastReadMs = lastReadAt ? new Date(lastReadAt).getTime() : 0;
      const isUnread = timestampMs > lastReadMs;

      if (!isUnread) continue;
      if (!canEmit(conversation._id.toString(), user.userId)) continue;
      
      const eventId = `${conversation._id}:${message.id}:${user.userId}`;
      const deliveryId = `${eventId}:${Date.now()}`;
      
      emitWhatsAppEvent(WHATSAPP_EVENTS.NEW_MESSAGE, {
        deliveryId,
        eventId,
        conversationId: conversation._id.toString(),
        businessPhoneId: phoneNumberId,
        assignedAgent: conversation.assignedAgent?.toString(),
        userId: user.userId,
        participantName: senderName,
        lastMessagePreview: displayText.substring(0, 100),
        lastMessageTime: timestamp,
        createdAt: firstMessageTime,
        isArchived,
        isRetarget: !!(conversation as any).isRetarget,
        retargetStage: (conversation as any).retargetStage,
        ownerRole: (conversation as any).ownerRole,
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
          ...(replyToMessageId && {
            replyToMessageId,
            replyContext,
          }),
        },
      });

      notificationsEmitted += 1;

      // Push notification to mobile devices (Expo Push), best-effort.
      try {
        const type = String(message.type || "text");
        const preview =
          type === "image"
            ? "📷 Image"
            : type === "document"
              ? "📄 Document"
              : type === "video"
                ? "🎥 Video"
                : type === "audio"
                  ? "🎵 Audio"
                  : displayText.substring(0, 100);

        await sendExpoPushToEmployee({
          employeeId: String(user.userId),
          title: senderName || senderPhone,
          body: preview,
          data: {
            conversationId: conversation._id.toString(),
            businessPhoneId: phoneNumberId,
            senderId: senderPhone,
            messageType: type,
            timestamp: timestamp.getTime(),
          },
          channelId: "whatsapp-messages",
        });
      } catch (err) {
        console.error("[push] failed", {
          conversationId: conversation._id.toString(),
          messageId: message.id,
          userId: String(user.userId),
          error: String((err as any)?.message ?? err),
        });
      }
      

    }

    // Concise success log
    console.log(`✅ [NEW] ${message.id} → ${notificationsEmitted}/${eligibleUsers.length} user(s)${mediaUrl ? ' +media' : ''}`);
    
    // ============================================================
    // UPDATE LEAD: Mark firstReply and whatsappOptIn
    // ============================================================
    try {
      const QueryModel = (await import("@/models/query")).default;
      const normalizedSender = (senderPhone || "").toString().replace(/\D/g, "");
      let lead: any = null;

      const patterns = [
        { value: normalizedSender, desc: 'full' },
        { value: normalizedSender.slice(-10), desc: 'last 10' },
        { value: normalizedSender.slice(-9), desc: 'last 9' },
        { value: normalizedSender.slice(-8), desc: 'last 8' },
        { value: normalizedSender.slice(-7), desc: 'last 7' },
      ].filter((p) => p.value.length >= 7);

      for (const { value, desc } of patterns) {
        const escapedDigits = value.split('').map((d:any) => d.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('\\D*');
        const regex = new RegExp(escapedDigits, 'i');
        lead = await QueryModel.findOne({ phoneNo: { $regex: regex } });
        if (lead) break;
      }

      if (lead && !lead.firstReply) {
        const updateResult = await QueryModel.updateOne(
          { _id: lead._id, firstReply: { $ne: true } },
          {
            $set: {
              firstReply: true,
              whatsappOptIn: true,
            }
          }
        );

        if (updateResult.modifiedCount > 0) {

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
    throw error;
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
    const newStatus = status.status;
    const timestamp = new Date(parseInt(status.timestamp) * 1000);
    const recipientId = status.recipient_id;
    const errorCode = status.errors?.[0]?.code;

    console.log("📩 [webhook] status update", {
      messageId,
      newStatus,
      recipientIdMasked: recipientId ? String(recipientId).replace(/\d(?=\d{4})/g, "x") : null,
      errorCode: errorCode || null,
      errorTitle: status.errors?.[0]?.title || null,
      errorMessage: status.errors?.[0]?.message || null,
    });
    
    if (errorCode && typeof errorCode === 'number') {
      await handleWhatsAppErrorCode(errorCode, recipientId, messageId).catch((err) => {
        console.error(`❌ Error handling error code ${errorCode}:`, err);
      });
    }

    // STEP 4: Find message first to check current status (idempotency check)
    const existingMessage = await WhatsAppMessage.findOne({ messageId });
    if (!existingMessage) {
      console.log("ℹ️ [webhook] status for unknown messageId (not in DB)", { messageId });
      return;
    }

    const previousStatus = existingMessage.status;

    // Skip if status hasn't changed (duplicate webhook) - silent skip
    if (previousStatus === newStatus) return;

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

    if (!message) return; // Status already up-to-date - silent skip

    console.log("✅ [webhook] status persisted", {
      messageId,
      previousStatus,
      newStatus,
      conversationId: message.conversationId?.toString?.() || null,
    });

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
    const emitted = emitWhatsAppEvent(WHATSAPP_EVENTS.MESSAGE_STATUS_UPDATE, {
      conversationId: message.conversationId.toString(),
      messageId,
      status: newStatus,
      previousStatus,
      timestamp,
      recipientId,
      errorCode: errorCode || null,
    });

    // Only log actual status changes (not duplicates)

  } catch (error) {
    console.error("Error processing status update:", error);
  }
}

/**
 * STEP 3: Error Code Driven Blocking (CRITICAL)
 * =============================================
 * Handle WhatsApp error codes using centralized error mapping.
 * All updates are IDEMPOTENT - never flip whatsappBlocked back to false.
 */
async function handleWhatsAppErrorCode(
  errorCode: number,
  recipientPhone: string,
  messageId: string
) {
  try {
    // Get error information from centralized mapping
    const errorInfo = getWhatsAppErrorInfo(errorCode);
    
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
    // ERROR CODE HANDLING (CRITICAL - uses centralized mapping)
    // =========================================================
    
    // Determine block reason based on error info
    if (errorInfo.shouldBlock) {
      updateFields.whatsappBlocked = true;
      
      // Map error code to block reason
      let blockReason = "unknown";
      if (errorCode === 131049) blockReason = "ecosystem_protection";
      else if (errorCode === 131021) blockReason = "number_not_on_whatsapp";
      else if (errorCode === 131215) blockReason = "groups_not_eligible";
      else if (errorCode === 131026) blockReason = "rate_limited";
      else blockReason = `error_${errorCode}`;
      
      updateFields.whatsappBlockReason = blockReason;
      console.log(`🚫 [AUDIT] Lead ${lead._id} BLOCKED: ${blockReason} (${errorCode}) - ${errorInfo.description}`);
    } else {
      console.log(`⚠️ [AUDIT] Lead ${lead._id} error ${errorCode} - ${errorInfo.description} (not blocking)`);
    }

    // Log critical errors for admin attention
    if (errorInfo.severity === "critical" && errorInfo.systemAction === "no_action") {
      console.log(`🔴 [CRITICAL] ${errorInfo.description} - Requires admin attention`);
      // Could integrate with Slack/email notification here
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

/** Socket call events: location-scoped when we have a conversation, else phone room only. */
async function emitCallEventForConversation(
  event: string,
  conversation: Record<string, unknown> | null,
  payload: Record<string, unknown>
): Promise<void> {
  const businessPhoneId =
    (conversation?.businessPhoneId as string | undefined) ||
    (payload.businessPhoneId as string | undefined) ||
    (payload.phoneNumberId as string | undefined);

  const base = {
    ...payload,
    ...(businessPhoneId ? { businessPhoneId } : {}),
    ...(conversation?._id != null
      ? { conversationId: String(conversation._id) }
      : {}),
  };

  if (conversation && conversation._id != null) {
    await emitWhatsAppEventToEligibleUsers(event, conversation, base);
    return;
  }

  emitWhatsAppEvent(event, base);
}

/**
 * Process incoming call events from the "calls" webhook field
 * Handles: incoming voice/video calls, missed calls, call status changes
 */
async function processCallEvent(value: any) {
  try {
    /** Meta usually puts this under `metadata`; some payloads expose it on the value root. */
    const phoneNumberId = String(
      value?.metadata?.phone_number_id ?? value?.phone_number_id ?? "",
    ).trim();
    const calls = Array.isArray(value.calls) ? value.calls : [];
    const statuses = Array.isArray(value.statuses) ? value.statuses : [];

    for (const call of calls) {
      // Business-initiated connect webhook includes SDP answer in call.session.sdp
      if (call?.event === "connect" && call?.session?.sdp_type === "answer" && call?.session?.sdp) {
        const conversationId = call?.biz_opaque_callback_data;
        const sdp = String(call.session.sdp);
        if (conversationId && call.id) {
          const shouldEmit = await shouldEmitSdpAnswerAndMark(String(call.id), sdp, {
            conversationId: String(conversationId),
            businessPhoneId: phoneNumberId ? String(phoneNumberId) : undefined,
          });
          if (shouldEmit) {
            const convForSdp = (await WhatsAppConversation.findById(conversationId).lean()) as Record<
              string,
              unknown
            > | null;
            await emitCallEventForConversation(WHATSAPP_EVENTS.CALL_SDP_ANSWER, convForSdp, {
              callId: call.id,
              phoneNumberId,
              sdpType: call.session.sdp_type,
              sdp,
              timestamp: call.timestamp ? new Date(parseInt(call.timestamp) * 1000) : new Date(),
              direction: call.direction || "BUSINESS_INITIATED",
            });
          }
        }
      }

      // Customer-initiated voice: Call Connect webhook carries an SDP **offer** (we answer with WebRTC + pre_accept/accept).
      if (
        call?.event === "connect" &&
        call?.session?.sdp_type === "offer" &&
        typeof call?.session?.sdp === "string" &&
        call.session.sdp.trim() &&
        call.id
      ) {
        const direction = String(call.direction || "").toUpperCase();
        if (direction === "USER_INITIATED") {
          const callerDigits = String(call.from ?? "").replace(/\D/g, "");
          if (!callerDigits) continue;
          if (!phoneNumberId) {
            console.error("[webhook] USER_INITIATED call: missing phone_number_id on webhook value", {
              valueKeys: value && typeof value === "object" ? Object.keys(value) : [],
            });
            continue;
          }

          const contactName = (value.contacts?.[0]?.profile?.name as string | undefined)?.trim() || "";

          type ConvLean = { _id: unknown; participantName?: string; businessPhoneId?: string } | null;
          let existing: ConvLean = (await WhatsAppConversation.findOne({
            businessPhoneId: String(phoneNumberId),
            $or: [{ participantPhone: callerDigits }, { participantPhone: `+${callerDigits}` }],
          }).lean()) as ConvLean;

          if (!existing?._id) {
            const rawCallerLocation = await resolveLocationFromLeadPhone(callerDigits);
            const callerLeadLocation =
              rawCallerLocation &&
              (await isLocationAllowedForPhone(String(phoneNumberId), rawCallerLocation))
                ? rawCallerLocation
                : null;
            const created = await findOrCreateConversationWithSnapshot({
              participantPhone: callerDigits,
              businessPhoneId: String(phoneNumberId),
              ...(contactName ? { participantName: contactName } : {}),
              ...(callerLeadLocation ? { participantLocation: callerLeadLocation } : {}),
              snapshotSource: callerLeadLocation ? "trusted" : "untrusted",
              isInboundWebhook: true,
            });
            existing = {
              _id: created._id,
              participantName: created.participantName,
              businessPhoneId: created.businessPhoneId,
            };
          }

          const conversationIdStr = String(existing._id);
          const callerLabel =
            contactName ||
            (typeof existing.participantName === "string" ? existing.participantName.trim() : "") ||
            callerDigits;

          try {
            await recordUserInitiatedIncomingOffer({
              callId: String(call.id),
              conversationId: conversationIdStr,
              businessPhoneId: String(phoneNumberId),
              participantPhone: callerDigits,
              ...(callerLabel && callerLabel !== callerDigits ? { participantName: callerLabel } : {}),
            });
          } catch (e) {
            console.warn("[webhook] user-initiated call log:", e);
          }

          try {
            await createIncomingCallInternalChatMessage({
              conversationId: conversationIdStr,
              callId: String(call.id),
              businessPhoneId: String(phoneNumberId),
              contactLabel: callerLabel,
            });
          } catch (e) {
            console.warn("[webhook] incoming call chat line:", e);
          }

          const convForOffer = (await WhatsAppConversation.findById(conversationIdStr).lean()) as Record<
            string,
            unknown
          > | null;
          await emitCallEventForConversation(WHATSAPP_EVENTS.CALL_INCOMING_OFFER, convForOffer, {
            businessPhoneId: String(phoneNumberId),
            callId: call.id,
            sdpType: call.session.sdp_type,
            sdp: String(call.session.sdp),
            direction: "USER_INITIATED",
            from: callerDigits,
            callerInfo: value.contacts?.[0] ?? null,
            contactLabel: callerLabel,
          });
        }
      }

      const callData = {
        callId: call.id,
        from: call.from,
        to: call.to || phoneNumberId,
        callType: call.type || "voice",
        callStatus: call.status,
        timestamp: call.timestamp ? new Date(parseInt(call.timestamp) * 1000) : new Date(),
        duration: call.duration || 0,
        phoneNumberId,
      };

      const conversation = phoneNumberId
        ? ((await WhatsAppConversation.findOne({
            businessPhoneId: phoneNumberId,
            $or: [
              { participantPhone: String(call.from ?? "").replace(/\D/g, "") },
              { participantPhone: call.from },
            ],
          }).lean()) as Record<string, unknown> | null)
        : null;

      const callPayload = {
        ...callData,
        ...(callData.callStatus === "ringing"
          ? { callerInfo: value.contacts?.[0] || null }
          : {}),
      };

      if (callData.callStatus === "ringing") {
        await emitCallEventForConversation(
          WHATSAPP_EVENTS.INCOMING_CALL,
          conversation,
          callPayload
        );
      } else if (callData.callStatus === "missed") {
        await emitCallEventForConversation(
          WHATSAPP_EVENTS.CALL_MISSED,
          conversation,
          callPayload
        );
      } else {
        await emitCallEventForConversation(
          WHATSAPP_EVENTS.CALL_STATUS_UPDATE,
          conversation,
          callPayload
        );
      }

      if (conversation?._id) {
        await WhatsAppConversation.findByIdAndUpdate(conversation._id, {
          lastCallTime: callData.timestamp,
          lastCallStatus: callData.callStatus,
        });
      }
    }

    // Status webhooks for calls (RINGING / ACCEPTED / REJECTED)
    for (const st of statuses) {
      const callData = {
        callId: st.id,
        callStatus: st.status,
        timestamp: st.timestamp ? new Date(parseInt(st.timestamp) * 1000) : new Date(),
        recipientId: st.recipient_id,
        phoneNumberId,
      };
      if (st.id && st.status) {
        try {
          await updateCallFromMetaStatus({
            callId: String(st.id),
            metaStatus: String(st.status),
            duration: typeof st.duration === "number" ? st.duration : undefined,
          });
        } catch (e) {
          console.warn("[webhook] call history status:", e);
        }
      }
      const statusConversation = phoneNumberId
        ? ((await WhatsAppConversation.findOne({
            businessPhoneId: phoneNumberId,
            ...(st.recipient_id
              ? {
                  $or: [
                    { participantPhone: String(st.recipient_id).replace(/\D/g, "") },
                    { participantPhone: st.recipient_id },
                  ],
                }
              : {}),
          }).lean()) as Record<string, unknown> | null)
        : null;
      await emitCallEventForConversation(
        WHATSAPP_EVENTS.CALL_STATUS_UPDATE,
        statusConversation,
        callData
      );
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
    const historyData = {
      accountId: entryId,
      syncType: value.sync_type || "messages",
      progress: value.progress || 0,
      messagesCount: value.messages_count || 0,
      timestamp: new Date(),
      status: value.status || "in_progress",
    };

    emitWhatsAppEvent(WHATSAPP_EVENTS.HISTORY_SYNC, {
      ...historyData,
      messages: value.messages || [],
    });
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
    const appStateData = {
      accountId: entryId,
      stateType: value.state_type,
      action: value.action,
      timestamp: new Date(),
      data: value.data || {},
    };

    emitWhatsAppEvent(WHATSAPP_EVENTS.APP_STATE_SYNC, appStateData);
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


      // Find or create conversation using snapshot-safe helper.
      // CRITICAL: Message echoes are "untrusted" - they must NEVER overwrite snapshot fields.
      // isInboundWebhook: true — channel resolved by phoneNumberId only.
      const conversation = await findOrCreateConversationWithSnapshot({
        participantPhone: recipientPhone,
        businessPhoneId: phoneNumberId,
        participantName: recipientPhone,
        snapshotSource: "untrusted",
        isInboundWebhook: true,
      }) as any;

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
          const imageMedia = await getMediaPermanentUrl(message.image?.id, message.image?.mime_type, phoneNumberId);
          if (imageMedia) {
            mediaUrl = imageMedia.url;
            mimeType = imageMedia.mimeType;
          }
          break;
        case "document":
          contentObj.caption = message.document?.caption || "";
          mediaId = message.document?.id;
          filename = message.document?.filename || "document";
          const docMedia = await getMediaPermanentUrl(message.document?.id, message.document?.mime_type, phoneNumberId);
          if (docMedia) {
            mediaUrl = docMedia.url;
            mimeType = docMedia.mimeType;
          }
          break;
        case "audio":
          contentObj.text = "🎵 Audio message";
          mediaId = message.audio?.id;
          const audioMedia = await getMediaPermanentUrl(message.audio?.id, message.audio?.mime_type, phoneNumberId);
          if (audioMedia) {
            mediaUrl = audioMedia.url;
            mimeType = audioMedia.mimeType;
          }
          break;
        case "video":
          contentObj.caption = message.video?.caption || "";
          mediaId = message.video?.id;
          const videoMedia = await getMediaPermanentUrl(message.video?.id, message.video?.mime_type, phoneNumberId);
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

        console.log(`📨 [ECHO] ${message.id} saved`);
      }
    }
  } catch (error) {
    console.error("❌ Error processing message echo:", error);
  }
}
