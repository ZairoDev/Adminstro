const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

const EXTENSION_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export const PROFILE_PHOTO_MAX_BYTES = 5 * 1024 * 1024;

export function profilePhotoContentType(file: File): string | null {
  const type = file.type.trim().toLowerCase();
  if (ALLOWED_TYPES.has(type)) return type;
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  return null;
}

export async function uploadProfilePicture(input: {
  bytes: Buffer;
  contentType: string;
}): Promise<string> {
  const storageZoneName = process.env.NEXT_PUBLIC_BUNNY_STORAGE_ZONE?.trim();
  const accessKey = process.env.NEXT_PUBLIC_BUNNY_ACCESS_KEY?.trim();
  const cdnBase = (
    process.env.NEXT_PUBLIC_BUNNY_CDN_URL?.trim() || "https://vacationsaga.b-cdn.net"
  ).replace(/\/$/, "");

  if (!storageZoneName || !accessKey) {
    throw new Error("Photo storage is not configured");
  }

  const extension = EXTENSION_BY_TYPE[input.contentType] ?? "jpg";
  const filename = `ProfilePictures/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${extension}`;

  const uploadResponse = await fetch(
    `https://storage.bunnycdn.com/${storageZoneName}/${filename}`,
    {
      method: "PUT",
      headers: {
        AccessKey: accessKey,
        "Content-Type": input.contentType,
      },
      body: new Uint8Array(input.bytes),
    },
  );

  if (!uploadResponse.ok) {
    throw new Error("Could not upload the photo");
  }

  return `${cdnBase}/${filename}`;
}
