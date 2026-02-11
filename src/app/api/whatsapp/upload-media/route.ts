import { NextRequest, NextResponse } from "next/server";
import { getDataFromToken } from "@/util/getDataFromToken";
import { connectDb } from "@/util/db";
import {
  canAccessPhoneId,
  getAllowedPhoneIds,
  getDefaultPhoneId,
  getRetargetPhoneId,
  getWhatsAppToken,
  WHATSAPP_API_BASE_URL,
} from "@/lib/whatsapp/config";

export const dynamic = "force-dynamic";

connectDb();

/**
 * Upload media to WhatsApp for later use in messages
 * 
 * Accepts multipart/form-data with:
 * - file: The media file to upload
 * - phoneNumberId: (optional) Which phone number to upload from
 * 
 * Returns:
 * - mediaId: The WhatsApp media ID to use in send-message
 * - url: Temporary download URL (use getMediaUrl for permanent CDN URL)
 * 
 * Supported formats:
 * - Images: image/jpeg, image/png (max 5MB)
 * - Documents: application/pdf, doc, docx, etc. (max 100MB)
 * - Audio: audio/aac, audio/mp4, audio/mpeg, audio/amr, audio/ogg (max 16MB)
 * - Video: video/mp4, video/3gp (max 16MB)
 * - Stickers: image/webp (max 500KB for static, 1MB for animated)
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

    // Get user's allowed phone IDs
    const userRole = token.role || "";
    const userAreas = token.allotedArea || [];
    let allowedPhoneIds = getAllowedPhoneIds(userRole, userAreas);

    // Advert role: allow uploading media for retarget conversations
    if (allowedPhoneIds.length === 0 && userRole === "Advert") {
      const retargetPhoneId = getRetargetPhoneId();
      if (retargetPhoneId) {
        allowedPhoneIds = [retargetPhoneId];
      }
    }

    if (allowedPhoneIds.length === 0) {
      return NextResponse.json(
        { error: "No WhatsApp access for your role/area" },
        { status: 403 }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;
    const requestedPhoneId = formData.get("phoneNumberId") as string;

    if (!file) {
      return NextResponse.json(
        { error: "File is required" },
        { status: 400 }
      );
    }

    // Determine phone ID to use
    const phoneNumberId = requestedPhoneId && allowedPhoneIds.includes(requestedPhoneId)
      ? requestedPhoneId
      : getDefaultPhoneId(userRole, userAreas);

    if (!phoneNumberId || !canAccessPhoneId(phoneNumberId, userRole, userAreas)) {
      return NextResponse.json(
        { error: "You don't have permission to upload to this WhatsApp number" },
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

    // Get file buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Upload to WhatsApp Media API
    const uploadFormData = new FormData();
    uploadFormData.append("messaging_product", "whatsapp");
    uploadFormData.append("file", new Blob([buffer], { type: file.type }), file.name);
    uploadFormData.append("type", file.type);

    const response = await fetch(
      `${WHATSAPP_API_BASE_URL}/${phoneNumberId}/media`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${whatsappToken}`,
        },
        body: uploadFormData,
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("WhatsApp Upload Error:", data);
      return NextResponse.json(
        { error: data.error?.message || "Failed to upload media" },
        { status: response.status }
      );
    }

    const mediaId = data.id;

    // Optionally retrieve the media URL
    let mediaUrl = "";
    if (mediaId) {
      const urlResponse = await fetch(
        `${WHATSAPP_API_BASE_URL}/${mediaId}`,
        {
          headers: {
            Authorization: `Bearer ${whatsappToken}`,
          },
        }
      );

      if (urlResponse.ok) {
        const urlData = await urlResponse.json();
        mediaUrl = urlData.url || "";
      }
    }

    return NextResponse.json({
      success: true,
      mediaId,
      url: mediaUrl,
      mimeType: file.type,
      filename: file.name,
      size: file.size,
      phoneNumberId,
    });
  } catch (error: any) {
    console.error("Upload media error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * Get media URL from media ID
 * WhatsApp media URLs are temporary and expire after some time
 * Use this to get a fresh URL when needed
 */
export async function GET(req: NextRequest) {
  try {
    const token = await getDataFromToken(req) as any;
    if (!token) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
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

    const searchParams = req.nextUrl.searchParams;
    const mediaId = searchParams.get("mediaId");

    if (!mediaId) {
      return NextResponse.json(
        { error: "Media ID is required" },
        { status: 400 }
      );
    }

    const whatsappToken = getWhatsAppToken();
    if (!whatsappToken) {
      return NextResponse.json(
        { error: "WhatsApp configuration missing" },
        { status: 500 }
      );
    }

    // Get media URL from WhatsApp
    const response = await fetch(
      `${WHATSAPP_API_BASE_URL}/${mediaId}`,
      {
        headers: {
          Authorization: `Bearer ${whatsappToken}`,
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("WhatsApp Get Media Error:", data);
      return NextResponse.json(
        { error: data.error?.message || "Failed to get media URL" },
        { status: response.status }
      );
    }

    return NextResponse.json({
      success: true,
      mediaId,
      url: data.url,
      mimeType: data.mime_type,
      sha256: data.sha256,
      fileSize: data.file_size,
    });
  } catch (error: any) {
    console.error("Get media URL error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
