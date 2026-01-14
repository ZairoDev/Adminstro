import { NextRequest, NextResponse } from "next/server";
import { getDataFromToken } from "@/util/getDataFromToken";
import { connectDb } from "@/util/db";

connectDb();

/**
 * Upload file directly to Bunny CDN for WhatsApp media
 * This is used for drag & drop uploads before sending via WhatsApp API
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

    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { error: "File is required" },
        { status: 400 }
      );
    }

    // Check Bunny CDN credentials
    const storageZoneName = process.env.NEXT_PUBLIC_BUNNY_STORAGE_ZONE;
    const accessKey = process.env.NEXT_PUBLIC_BUNNY_ACCESS_KEY;
    const cdnUrl = process.env.NEXT_PUBLIC_BUNNY_CDN_URL || `https://${storageZoneName}.b-cdn.net`;

    if (!storageZoneName || !accessKey) {
      return NextResponse.json(
        { error: "Bunny CDN credentials not configured" },
        { status: 500 }
      );
    }

    // Validate file type
    const validTypes = [
      // Images
      "image/jpeg", "image/png", "image/webp", "image/gif",
      // Videos: mp4, mov, webm (if compatible)
      "video/mp4", "video/quicktime", // mov files
      "video/webm", "video/3gp",
      // Audio: mp3, m4a, ogg, wav
      "audio/mpeg", // mp3
      "audio/mp4", // m4a
      "audio/aac", "audio/ogg", "audio/wav", "audio/wave", "audio/x-wav",
      "audio/amr",
      // Documents
      "application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-powerpoint", "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "text/plain",
    ];

    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { error: `File type ${file.type} is not supported` },
        { status: 400 }
      );
    }

    // Validate file size (max 100MB for documents, 16MB for media)
    const maxSize = file.type.startsWith("application/") ? 100 * 1024 * 1024 : 16 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: `File size exceeds maximum allowed size (${maxSize / 1024 / 1024}MB)` },
        { status: 400 }
      );
    }

    // Get file buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Determine file extension
    const ext = file.name.split('.').pop() || file.type.split('/')[1] || 'bin';
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 9);
    const filename = `whatsapp/${timestamp}-${randomString}.${ext}`;

    // Upload to Bunny CDN
    const uploadResponse = await fetch(
      `https://storage.bunnycdn.com/${storageZoneName}/${filename}`,
      {
        method: "PUT",
        headers: {
          AccessKey: accessKey,
          "Content-Type": file.type || "application/octet-stream",
        },
        body: buffer,
      }
    );

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error("Failed to upload to Bunny CDN:", errorText);
      return NextResponse.json(
        { error: "Failed to upload file to CDN" },
        { status: 500 }
      );
    }

    const permanentUrl = `${cdnUrl}/${filename}`;
    console.log("📤 File uploaded to Bunny CDN:", permanentUrl);

    return NextResponse.json({
      success: true,
      url: permanentUrl,
      filename: file.name,
      mimeType: file.type,
      size: file.size,
    });
  } catch (error: any) {
    console.error("Upload to Bunny error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
