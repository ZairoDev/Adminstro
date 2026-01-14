import { NextRequest, NextResponse } from "next/server";
import { getDataFromToken } from "@/util/getDataFromToken";
import { connectDb } from "@/util/db";
import WhatsAppMessage from "@/models/whatsappMessage";
import WhatsAppConversation from "@/models/whatsappConversation";
import { emitWhatsAppEvent, WHATSAPP_EVENTS } from "@/lib/pusher";
import {
  canAccessPhoneId,
  getAllowedPhoneIds,
  getDefaultPhoneId,
  getWhatsAppToken,
  WHATSAPP_API_BASE_URL,
} from "@/lib/whatsapp/config";
import mongoose from "mongoose";

connectDb();

/**
 * Forward one or more messages to one or more conversations
 * 
 * Rules:
 * - Each forwarded message creates a NEW WhatsAppMessage document
 * - Reuses existing Bunny CDN URL (no re-upload)
 * - Sends via Meta WhatsApp API
 * - Does NOT reuse original messageId
 * - Does NOT emit notifications for own messages
 */
export async function POST(req: NextRequest) {
  try {
    const token = await getDataFromToken(req) as any;
    if (!token) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { 
      messageIds, // Array of message IDs to forward
      conversationIds, // Array of target conversation IDs
      phoneNumberId: requestedPhoneId,
    } = await req.json();

    if (!messageIds || !Array.isArray(messageIds) || messageIds.length === 0) {
      return NextResponse.json(
        { error: "At least one message ID is required" },
        { status: 400 }
      );
    }

    if (!conversationIds || !Array.isArray(conversationIds) || conversationIds.length === 0) {
      return NextResponse.json(
        { error: "At least one target conversation ID is required" },
        { status: 400 }
      );
    }

    // Get user's allowed phone IDs
    const userRole = token.role || "";
    const userAreas = token.allotedArea || [];
    const allowedPhoneIds = getAllowedPhoneIds(userRole, userAreas);

    if (allowedPhoneIds.length === 0) {
      return NextResponse.json(
        { error: "No WhatsApp access for your role/area" },
        { status: 403 }
      );
    }

    // Determine which phone ID to use
    let phoneNumberId = requestedPhoneId;
    if (!phoneNumberId) {
      phoneNumberId = getDefaultPhoneId(userRole, userAreas);
    }

    // Verify permission
    if (!phoneNumberId || !canAccessPhoneId(phoneNumberId, userRole, userAreas)) {
      return NextResponse.json(
        { error: "You don't have permission to send from this WhatsApp number" },
        { status: 403 }
      );
    }

    const whatsappToken = getWhatsAppToken();
    if (!whatsappToken) {
      return NextResponse.json(
        { error: "WhatsApp configuration missing" },
        { status: 500 }
      );
    }

    // Fetch original messages
    const originalMessages = await WhatsAppMessage.find({
      _id: { $in: messageIds },
    }).lean() as any[];

    if (originalMessages.length !== messageIds.length) {
      return NextResponse.json(
        { error: "Some messages not found" },
        { status: 404 }
      );
    }

    // Fetch target conversations
    const targetConversations = await WhatsAppConversation.find({
      _id: { $in: conversationIds },
      businessPhoneId: phoneNumberId,
    }).lean() as any[];

    if (targetConversations.length !== conversationIds.length) {
      return NextResponse.json(
        { error: "Some target conversations not found or not accessible" },
        { status: 404 }
      );
    }

    const results: any[] = [];
    const errors: any[] = [];

    // Forward each message to each conversation
    for (const originalMessage of originalMessages) {
      const originalMessageId = (originalMessage._id as mongoose.Types.ObjectId).toString();
      
      for (const targetConversation of targetConversations) {
        try {
          const formattedPhone = targetConversation.participantPhone.replace(/[\s\-\+]/g, "");
          
          // Build message payload based on type
          let whatsappPayload: any = {
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: formattedPhone,
            type: originalMessage.type,
          };

          // Handle different message types
          if (originalMessage.type === "text") {
            const textContent = typeof originalMessage.content === "string" 
              ? originalMessage.content 
              : originalMessage.content?.text || "";
            whatsappPayload.text = { body: textContent };
          } else if (["image", "video", "audio", "document", "sticker"].includes(originalMessage.type)) {
            // For media, use the existing Bunny CDN URL
            if (!originalMessage.mediaUrl) {
              errors.push({
                messageId: originalMessageId,
                conversationId: targetConversation._id.toString(),
                error: "Original message has no media URL",
              });
              continue;
            }

            const mediaPayload: any = {
              link: originalMessage.mediaUrl, // Use Bunny CDN URL directly
            };

            // Add caption if present
            if (originalMessage.content && typeof originalMessage.content === "object") {
              const caption = originalMessage.content.caption;
              if (caption && (originalMessage.type === "image" || originalMessage.type === "video" || originalMessage.type === "document")) {
                mediaPayload.caption = caption;
              }
            }

            // Add filename for documents
            if (originalMessage.type === "document" && originalMessage.filename) {
              mediaPayload.filename = originalMessage.filename;
            }

            whatsappPayload[originalMessage.type] = mediaPayload;
          } else {
            // Unsupported type for forwarding
            errors.push({
              messageId: originalMessageId,
              conversationId: targetConversation._id.toString(),
              error: `Message type ${originalMessage.type} cannot be forwarded`,
            });
            continue;
          }

          // Send via Meta WhatsApp API
          const response = await fetch(
            `${WHATSAPP_API_BASE_URL}/${phoneNumberId}/messages`,
            {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${whatsappToken}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify(whatsappPayload),
            }
          );

          const data = await response.json();

          if (!response.ok) {
            console.error("WhatsApp Forward API Error:", data);
            errors.push({
              messageId: originalMessageId,
              conversationId: targetConversation._id.toString(),
              error: data.error?.message || "Failed to forward message",
            });
            continue;
          }

          const whatsappMessageId = data.messages?.[0]?.id;
          const timestamp = new Date();

          // Build content object for database
          let contentObj: any = {};
          if (originalMessage.content) {
            if (typeof originalMessage.content === "string") {
              contentObj.text = originalMessage.content;
            } else {
              contentObj = { ...originalMessage.content };
            }
          }

          // Create new message document (NOT reusing original messageId)
          const savedMessage = await WhatsAppMessage.create({
            conversationId: targetConversation._id,
            messageId: whatsappMessageId, // New messageId from Meta
            businessPhoneId: phoneNumberId,
            from: phoneNumberId,
            to: formattedPhone,
            type: originalMessage.type,
            content: contentObj,
            mediaUrl: originalMessage.mediaUrl || "", // Reuse Bunny CDN URL
            mediaId: "", // Not reusing mediaId
            mimeType: originalMessage.mimeType || "",
            filename: originalMessage.filename || "",
            status: "sent",
            statusEvents: [{ status: "sent", timestamp }],
            direction: "outgoing",
            timestamp,
            sentBy: token.id || token._id,
            conversationSnapshot: {
              participantPhone: formattedPhone,
              assignedAgent: targetConversation.assignedAgent,
            },
            // Mark as forwarded
            isForwarded: true,
            forwardedFrom: originalMessage._id,
          });

          // Update conversation last message
          const displayText = typeof originalMessage.content === "string"
            ? originalMessage.content
            : originalMessage.content?.caption || originalMessage.content?.text || `${originalMessage.type} message`;

          await WhatsAppConversation.findByIdAndUpdate(targetConversation._id, {
            lastMessageId: whatsappMessageId,
            lastMessageContent: displayText.substring(0, 100),
            lastMessageTime: timestamp,
            lastMessageDirection: "outgoing",
            lastMessageStatus: "sending",
            lastOutgoingMessageTime: timestamp,
          });

          // Emit socket event (but NO notification for own messages)
          emitWhatsAppEvent(WHATSAPP_EVENTS.NEW_MESSAGE, {
            conversationId: targetConversation._id.toString(),
            businessPhoneId: phoneNumberId,
            message: {
              id: savedMessage._id.toString(),
              messageId: whatsappMessageId,
              from: phoneNumberId,
              to: formattedPhone,
              type: originalMessage.type,
              content: contentObj,
              mediaUrl: originalMessage.mediaUrl || "",
              mediaId: "",
              filename: originalMessage.filename || "",
              status: "sent",
              direction: "outgoing",
              timestamp,
              senderName: token.name || "You",
              isForwarded: true,
              forwardedFrom: originalMessageId,
            },
          });

          results.push({
            messageId: originalMessageId,
            conversationId: targetConversation._id.toString(),
            forwardedMessageId: savedMessage._id.toString(),
            whatsappMessageId,
            success: true,
          });
        } catch (error: any) {
          console.error("Error forwarding message:", error);
          errors.push({
            messageId: originalMessageId,
            conversationId: targetConversation._id.toString(),
            error: error.message || "Internal error",
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      results,
      errors: errors.length > 0 ? errors : undefined,
      summary: {
        total: originalMessages.length * targetConversations.length,
        successful: results.length,
        failed: errors.length,
      },
    });
  } catch (error: any) {
    console.error("Forward message error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
