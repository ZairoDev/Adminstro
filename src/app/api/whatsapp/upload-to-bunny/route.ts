import { NextRequest, NextResponse } from "next/server";
import { getDataFromToken } from "@/util/getDataFromToken";
import { connectDb } from "@/util/db";

connectDb();

/**
 * Upload file directly to Bunny CDN for WhatsApp media
 * This is used for drag & drop uploads before sending via WhatsApp API
 */

// Force dynamic rendering since this route handles file uploads
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
// Increase max duration for large file uploads (default is 10s, max is 300s)
export const maxDuration = 3000;

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
      console.error("❌ No file in form data");
      return NextResponse.json(
        { error: "File is required" },
        { status: 400 }
      );
    }

    // Check Bunny CDN credentials
    const storageZoneName = process.env.NEXT_PUBLIC_BUNNY_STORAGE_ZONE;
    const accessKey = process.env.NEXT_PUBLIC_BUNNY_ACCESS_KEY;
    const cdnUrl = process.env.NEXT_PUBLIC_BUNNY_CDN_URL || `https://${storageZoneName}.b-cdn.net`;

    console.log("📤 Upload request:", {
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      hasStorageZone: !!storageZoneName,
      hasAccessKey: !!accessKey,
    });

    if (!storageZoneName || !accessKey) {
      console.error("❌ Bunny CDN credentials missing:", {
        hasStorageZone: !!storageZoneName,
        hasAccessKey: !!accessKey,
        storageZoneName: storageZoneName || "MISSING",
      });
      return NextResponse.json(
        { 
          error: "Bunny CDN credentials not configured",
          details: "Please check environment variables: NEXT_PUBLIC_BUNNY_STORAGE_ZONE and NEXT_PUBLIC_BUNNY_ACCESS_KEY"
        },
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

    // Handle empty or undefined file type (try to infer from extension)
    let fileType = file.type;
    if (!fileType || fileType === "" || fileType === "application/octet-stream") {
      const ext = file.name.split('.').pop()?.toLowerCase();
      const mimeTypeMap: Record<string, string> = {
        // Images
        'jpg': 'image/jpeg', 'jpeg': 'image/jpeg', 'png': 'image/png', 'gif': 'image/gif', 'webp': 'image/webp',
        // Videos
        'mp4': 'video/mp4', 'mov': 'video/quicktime', 'webm': 'video/webm', '3gp': 'video/3gp',
        // Audio
        'mp3': 'audio/mpeg', 'm4a': 'audio/mp4', 'ogg': 'audio/ogg', 'wav': 'audio/wav', 'aac': 'audio/aac', 'amr': 'audio/amr',
        // Documents
        'pdf': 'application/pdf', 'doc': 'application/msword', 'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'xls': 'application/vnd.ms-excel', 'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'ppt': 'application/vnd.ms-powerpoint', 'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'txt': 'text/plain',
      };
      if (ext && mimeTypeMap[ext]) {
        fileType = mimeTypeMap[ext];
        console.log(`📝 Inferred MIME type: ${fileType} from extension: ${ext}`);
      }
    }

    if (!validTypes.includes(fileType)) {
      console.error("❌ Unsupported file type:", {
        providedType: file.type,
        inferredType: fileType,
        fileName: file.name,
        validTypes: validTypes.slice(0, 5), // Log first 5 for reference
      });
      return NextResponse.json(
        { 
          error: `File type ${fileType || file.type || 'unknown'} is not supported`,
          providedType: file.type,
          fileName: file.name,
        },
        { status: 400 }
      );
    }

    // Validate file size (max 100MB for documents, 16MB for media)
    const maxSize = fileType.startsWith("application/") ? 100 * 1024 * 1024 : 200 * 1024 * 1024;
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
          "Content-Type": fileType || file.type || "application/octet-stream",
        },
        body: buffer,
      }
    );

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      const statusCode = uploadResponse.status;
      console.error("❌ Failed to upload to Bunny CDN:", {
        status: statusCode,
        statusText: uploadResponse.statusText,
        error: errorText,
        filename: file.name,
        fileType: file.type,
        fileSize: file.size,
        storageZone: storageZoneName,
      });
      return NextResponse.json(
        { 
          error: "Failed to upload file to CDN",
          details: errorText || `HTTP ${statusCode}: ${uploadResponse.statusText}`,
          statusCode,
        },
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
    console.error("❌ Upload to Bunny error:", {
      message: error.message,
      stack: error.stack,
      name: error.name,
    });
    return NextResponse.json(
      { 
        error: error.message || "Internal server error",
        details: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
