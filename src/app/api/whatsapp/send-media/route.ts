import { NextRequest, NextResponse } from "next/server";
import { getDataFromToken } from "@/util/getDataFromToken";
import { connectDb } from "@/util/db";
import WhatsAppMessage from "@/models/whatsappMessage";
import WhatsAppConversation from "@/models/whatsappConversation";
import { emitWhatsAppEvent, WHATSAPP_EVENTS } from "@/lib/pusher";
import {
  getWhatsAppToken,
  WHATSAPP_API_BASE_URL,
  INTERNAL_YOU_PHONE_ID,
} from "@/lib/whatsapp/config";
import { findOrCreateConversationWithSnapshot } from "@/lib/whatsapp/conversationHelper";
import { normalizePhone } from "@/lib/whatsapp/normalizePhone";
import crypto from "crypto";
import { canAccessConversationAsync } from "@/lib/whatsapp/access";
import { normalizeWhatsAppToken, resolveAllowedPhoneIdsAsync } from "@/lib/whatsapp/apiContext";
import { isSalesWhatsAppRole } from "@/lib/whatsapp/config";
import { resolveOutboundBusinessPhoneId } from "@/lib/whatsapp/resolveOutboundPhone";
import { getChannelByPhoneNumberId, getOutboundTokenForPhoneId } from "@/lib/whatsapp/channelService";
import fs from "fs/promises";
import os from "os";
import path from "path";
import { spawn } from "child_process";
import ffmpegPath from "ffmpeg-static";

connectDb();

type MediaType = "image" | "document" | "audio" | "video" | "sticker";

interface MediaPayload {
  link?: string;
  id?: string;
  caption?: string;
  filename?: string;
}

async function uploadToBunny(params: {
  buffer: ArrayBuffer;
  mimeType: string;
  fileName: string;
}): Promise<string | null> {
  const storageZoneName = process.env.NEXT_PUBLIC_BUNNY_STORAGE_ZONE;
  const accessKey = process.env.NEXT_PUBLIC_BUNNY_ACCESS_KEY;
  const cdnUrl = process.env.NEXT_PUBLIC_BUNNY_CDN_URL || `https://${storageZoneName}.b-cdn.net`;
  if (!storageZoneName || !accessKey) return null;

  const uploadResponse = await fetch(
    `https://storage.bunnycdn.com/${storageZoneName}/${params.fileName}`,
    {
      method: "PUT",
      headers: {
        AccessKey: accessKey,
        "Content-Type": params.mimeType || "application/octet-stream",
      },
      body: params.buffer,
    }
  );

  if (!uploadResponse.ok) {
    console.error("Failed Bunny upload:", await uploadResponse.text());
    return null;
  }
  return `${cdnUrl}/${params.fileName}`;
}

async function getPermanentUrlFromWhatsAppMedia(params: {
  mediaId: string;
  mimeTypeHint?: string;
}): Promise<{ url: string; mimeType: string } | null> {
  const whatsappToken = getWhatsAppToken();
  if (!params.mediaId || !whatsappToken) return null;

  const metadataResponse = await fetch(`${WHATSAPP_API_BASE_URL}/${params.mediaId}`, {
    headers: { Authorization: `Bearer ${whatsappToken}` },
  });
  if (!metadataResponse.ok) return null;
  const metadata = await metadataResponse.json();
  const tempUrl = metadata?.url;
  const mimeType = metadata?.mime_type || params.mimeTypeHint || "";
  if (!tempUrl) return null;

  const mediaResponse = await fetch(tempUrl, {
    headers: { Authorization: `Bearer ${whatsappToken}` },
  });
  if (!mediaResponse.ok) return null;

  let mediaBuffer = await mediaResponse.arrayBuffer();
  let finalMimeType = mimeType || "application/octet-stream";

  const isOggOpus =
    finalMimeType.includes("audio/ogg") ||
    finalMimeType.includes("audio/opus") ||
    finalMimeType.includes("ogg");

  if (isOggOpus && ffmpegPath) {
    try {
      const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "wa-audio-"));
      const inPath = path.join(tmpDir, `${params.mediaId}.ogg`);
      const outPath = path.join(tmpDir, `${params.mediaId}.m4a`);
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
      console.error("Outgoing audio transcode failed; fallback original:", e);
    }
  }

  const ext =
    finalMimeType.startsWith("audio/") ? "m4a" : (finalMimeType.split("/")[1] || "bin");
  const fileName = `whatsapp/${Date.now()}-${params.mediaId}.${ext}`;
  const url = await uploadToBunny({ buffer: mediaBuffer, mimeType: finalMimeType, fileName });
  if (!url) return null;
  return { url, mimeType: finalMimeType };
}

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
      to, 
      mediaType, 
      mediaUrl, 
      mediaId,
      caption, 
      filename,
      conversationId,
      phoneNumberId: requestedPhoneId,
    } = await req.json();

    if (!to || !mediaType || (!mediaUrl && !mediaId)) {
      return NextResponse.json(
        { error: "Phone number, media type, and media URL or ID are required" },
        { status: 400 }
      );
    }

    const validMediaTypes: MediaType[] = ["image", "document", "audio", "video", "sticker"];
    if (!validMediaTypes.includes(mediaType)) {
      return NextResponse.json(
        { error: "Invalid media type. Must be one of: image, document, audio, video, sticker" },
        { status: 400 }
      );
    }

    // =========================================================
    // CRITICAL: Check if this is a "You" conversation FIRST
    // "You" conversations should NEVER call WhatsApp API - only save to DB
    // =========================================================
    let conversation;
    if (conversationId) {
      conversation = await WhatsAppConversation.findById(conversationId);
    }

    // Enforce conversation-level access rules if conversation exists
    if (conversation) {
      const convLean = conversation.toObject ? conversation.toObject() : conversation;
      const allowed = await canAccessConversationAsync(normalizeWhatsAppToken(token), convLean);
      if (!allowed) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      // Block Advert after handover
      if ((token.role || "") === "Advert" && convLean.isRetarget && convLean.retargetStage === "handed_to_sales") {
        return NextResponse.json({ error: "Advert cannot send after handover" }, { status: 403 });
      }

      // Block Sales before handover
      if (isSalesWhatsAppRole(token.role || "") && convLean.isRetarget && convLean.retargetStage !== "handed_to_sales") {
        return NextResponse.json({ error: "Sales cannot send to retarget conversation before handover" }, { status: 403 });
      }
    }

    // Check if this is a "You" conversation BEFORE any WhatsApp API setup
    const isYouConversation = conversation && (
      conversation.source === "internal" || 
      conversation.businessPhoneId === INTERNAL_YOU_PHONE_ID
    );

    if (isYouConversation) {
      // =========================================================
      // "You" conversation - Save to DB ONLY, NO WhatsApp API
      // =========================================================
      const internalMessageId = `internal_${crypto.randomUUID()}`;
      const timestamp = new Date();

      // Build content object
      const contentObj: { text?: string; caption?: string } = {};
      if (caption) {
        contentObj.caption = caption;
      } else {
        contentObj.text = `${mediaType.charAt(0).toUpperCase() + mediaType.slice(1)}`;
      }

      const displayText = caption || `${mediaType.charAt(0).toUpperCase() + mediaType.slice(1)}`;

      // Save message to database ONLY (no WhatsApp API call)
      const savedMessage = await WhatsAppMessage.create({
        conversationId: conversation._id,
        messageId: internalMessageId,
        businessPhoneId: INTERNAL_YOU_PHONE_ID,
        from: INTERNAL_YOU_PHONE_ID,
        to: conversation.participantPhone,
        type: mediaType,
        content: contentObj,
        mediaUrl: mediaUrl || "",
        mediaId: mediaId || "",
        filename: filename || "",
        source: "internal",
        status: "sent",
        statusEvents: [],
        direction: "outgoing",
        timestamp,
        sentBy: token.id || token._id,
        conversationSnapshot: {
          participantPhone: conversation.participantPhone,
          assignedAgent: conversation.assignedAgent,
        },
      });

      // Update conversation last message
      await WhatsAppConversation.findByIdAndUpdate(conversation._id, {
        lastMessageId: internalMessageId,
        lastMessageContent: displayText.substring(0, 100),
        lastMessageTime: timestamp,
        lastMessageDirection: "outgoing",
        lastOutgoingMessageTime: timestamp,
      });

      // Emit socket event for real-time UI updates
      emitWhatsAppEvent(WHATSAPP_EVENTS.NEW_MESSAGE, {
        conversationId: conversation._id.toString(),
        businessPhoneId: INTERNAL_YOU_PHONE_ID,
        isInternal: true,
        message: {
          id: savedMessage._id.toString(),
          messageId: internalMessageId,
          from: INTERNAL_YOU_PHONE_ID,
          to: conversation.participantPhone,
          type: mediaType,
          content: contentObj,
          mediaUrl: mediaUrl || "",
          mediaId: mediaId || "",
          filename: filename || "",
          source: "internal",
          status: "sent",
          direction: "outgoing",
          timestamp,
          senderName: token.name || "You",
          isInternal: true,
        },
      });

      return NextResponse.json({
        success: true,
        messageId: internalMessageId,
        savedMessageId: savedMessage._id,
        conversationId: conversation._id,
        source: "internal",
        timestamp: timestamp.toISOString(),
      });
    }

    // =========================================================
    // Regular WhatsApp conversation - Continue with Meta API
    // =========================================================

    const normalizedToken = normalizeWhatsAppToken(token);
    const userRole = normalizedToken.role || "";
    const allowedPhoneIds = await resolveAllowedPhoneIdsAsync(normalizedToken);
    if (allowedPhoneIds.length === 0 && userRole !== "Advert") {
      return NextResponse.json(
        { error: "No WhatsApp access for your role/area" },
        { status: 403 }
      );
    }

    const phoneResolution = await resolveOutboundBusinessPhoneId({
      token: normalizedToken,
      conversation: conversation
        ? (conversation.toObject ? conversation.toObject() : conversation)
        : null,
      requestedPhoneId,
      requireConversation: Boolean(conversationId),
    });

    if ("error" in phoneResolution) {
      return NextResponse.json(
        { error: phoneResolution.error },
        { status: phoneResolution.status }
      );
    }

    const phoneNumberId = phoneResolution.phoneNumberId;

    const whatsappToken = await getOutboundTokenForPhoneId(phoneNumberId);
    if (!whatsappToken) {
      return NextResponse.json(
        { error: "WhatsApp configuration missing" },
        { status: 500 }
      );
    }

    // Format phone number
    const formattedPhone = normalizePhone(String(to ?? ""));

    // Build media payload
    const mediaPayload: MediaPayload & { voice?: boolean } = {};
    
    if (mediaId) {
      mediaPayload.id = mediaId;
    } else {
      mediaPayload.link = mediaUrl;
    }

    // Make WhatsApp render audio as a voice note (not an audio file)
    if (mediaType === "audio") {
      (mediaPayload as any).voice = true;
    }

    if (caption && (mediaType === "image" || mediaType === "video" || mediaType === "document")) {
      mediaPayload.caption = caption;
    }

    if (filename && mediaType === "document") {
      mediaPayload.filename = filename;
    }

    const response = await fetch(
      `${WHATSAPP_API_BASE_URL}/${phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${whatsappToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: formattedPhone,
          type: mediaType,
          [mediaType]: mediaPayload,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("WhatsApp Media API Error:", data);
      return NextResponse.json(
        { error: data.error?.message || "Failed to send media message" },
        { status: response.status }
      );
    }

    const whatsappMessageId = data.messages?.[0]?.id;
    const timestamp = new Date();

    // If the client passed a WhatsApp temp URL (not publicly playable) or only mediaId,
    // resolve a permanent Bunny CDN URL so mobile can play sent voice notes.
    let permanentMediaUrl = mediaUrl || "";
    if (mediaId) {
      try {
        const permanent = await getPermanentUrlFromWhatsAppMedia({
          mediaId,
        });
        if (permanent?.url) {
          permanentMediaUrl = permanent.url;
        }
      } catch {
        // non-blocking; keep the provided URL if any
      }
    }

    // Get or create conversation if not already loaded
    if (!conversation) {
      if (conversationId) {
        conversation = await WhatsAppConversation.findById(conversationId);
      }

      if (!conversation) {
        const phoneChannel = await getChannelByPhoneNumberId(phoneNumberId);
        if (!phoneChannel) {
          return NextResponse.json(
            { error: "No WhatsApp channel configured for this phone line" },
            { status: 400 },
          );
        }
        conversation = await findOrCreateConversationWithSnapshot({
          participantPhone: formattedPhone,
          whatsappChannelId: phoneChannel.channelId,
          businessPhoneId: phoneNumberId,
          participantName: formattedPhone,
          channelType: phoneChannel.channelType,
          rentalType: phoneChannel.rentalType,
          snapshotSource: "trusted",
        });
      }
    }

    // Build content object
    const contentObj: { text?: string; caption?: string } = {};
    if (caption) {
      contentObj.caption = caption;
    } else {
      contentObj.text = `${mediaType.charAt(0).toUpperCase() + mediaType.slice(1)}`;
    }

    const displayText = caption || `${mediaType.charAt(0).toUpperCase() + mediaType.slice(1)}`;

    // Save message to database
    const savedMessage = await WhatsAppMessage.create({
      conversationId: conversation._id,
      messageId: whatsappMessageId,
      businessPhoneId: phoneNumberId,
      from: phoneNumberId,
      to: formattedPhone,
      type: mediaType,
      content: contentObj,
      mediaUrl: permanentMediaUrl || "",
      mediaId: mediaId || "",
      filename: filename || "",
      status: "sent",
      statusEvents: [{ status: "sent", timestamp }],
      direction: "outgoing",
      timestamp,
      sentBy: token.id || token._id,
      conversationSnapshot: {
        participantPhone: formattedPhone,
        assignedAgent: conversation.assignedAgent,
      },
    });

    // Update conversation last message
    await WhatsAppConversation.findByIdAndUpdate(conversation._id, {
      lastMessageId: whatsappMessageId,
      lastMessageContent: displayText.substring(0, 100),
      lastMessageTime: timestamp,
      lastMessageDirection: "outgoing",
      lastMessageStatus: "sending",
      lastOutgoingMessageTime: timestamp,
    });

    // Emit socket event for real-time updates
    emitWhatsAppEvent(WHATSAPP_EVENTS.NEW_MESSAGE, {
      conversationId: conversation._id.toString(),
      businessPhoneId: phoneNumberId,
      message: {
        id: savedMessage._id.toString(),
        messageId: whatsappMessageId,
        from: phoneNumberId,
        to: formattedPhone,
        type: mediaType,
        content: contentObj,
        mediaUrl: permanentMediaUrl || "",
        mediaId: mediaId || "",
        filename: filename || "",
        status: "sent",
        direction: "outgoing",
        timestamp,
        senderName: token.name || "You",
      },
    });

    return NextResponse.json({
      success: true,
      messageId: whatsappMessageId,
      savedMessageId: savedMessage._id,
      conversationId: conversation._id,
      timestamp: timestamp.toISOString(),
      data,
    });
  } catch (error: any) {
    console.error("Send media error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
