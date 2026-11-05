import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/util/db";
import { getDataFromToken } from "@/util/getDataFromToken";
import Employees from "@/models/employee";
import HousingCollaborator from "@/models/housingCollaborator";
import {
  HOUSING_COLLABORATOR_ACCOUNT_TYPE,
  HOUSING_COLLABORATOR_ROLE,
} from "@/schemas/housingCollaborator.schema";
import {
  PROFILE_PHOTO_MAX_BYTES,
  profilePhotoContentType,
  uploadProfilePicture,
} from "@/lib/uploads/profilePicture";

export const dynamic = "force-dynamic";

type AuthPayload = {
  id?: string;
  role?: string;
  accountType?: string;
};

function isCollaborator(auth: AuthPayload): boolean {
  return (
    auth.accountType === HOUSING_COLLABORATOR_ACCOUNT_TYPE ||
    auth.role === HOUSING_COLLABORATOR_ROLE
  );
}

async function readAuth(request: NextRequest): Promise<AuthPayload | NextResponse> {
  try {
    const auth = (await getDataFromToken(request)) as AuthPayload;
    if (!auth.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return auth;
  } catch (error: unknown) {
    const authError = error as { status?: number; code?: string };
    return NextResponse.json(
      { error: "Unauthorized", code: authError.code ?? "AUTH_FAILED" },
      { status: authError.status ?? 401 },
    );
  }
}

async function currentPhoto(auth: AuthPayload): Promise<string> {
  await connectDb();
  if (isCollaborator(auth)) {
    const collaborator = await HousingCollaborator.findById(auth.id)
      .select("profilePic")
      .lean<{ profilePic?: string | null } | null>();
    return collaborator?.profilePic?.trim() ?? "";
  }
  const employee = await Employees.findById(auth.id)
    .select("profilePic")
    .lean<{ profilePic?: string | null } | null>();
  return employee?.profilePic?.trim() ?? "";
}

/** GET /api/user/profile-picture — the signed-in user's photo. */
export async function GET(request: NextRequest) {
  const auth = await readAuth(request);
  if (auth instanceof NextResponse) return auth;
  if (auth.id === "test-superadmin") {
    return NextResponse.json({ success: true, photoUrl: "" });
  }

  try {
    return NextResponse.json({
      success: true,
      photoUrl: await currentPhoto(auth),
    });
  } catch (error) {
    console.error("[profile-picture] read failed:", error);
    return NextResponse.json(
      { error: "Could not load the profile picture" },
      { status: 500 },
    );
  }
}

/** POST /api/user/profile-picture — replace the signed-in user's photo. */
export async function POST(request: NextRequest) {
  const auth = await readAuth(request);
  if (auth instanceof NextResponse) return auth;
  if (auth.id === "test-superadmin") {
    return NextResponse.json(
      { error: "This account cannot save a profile picture" },
      { status: 400 },
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Choose a photo to upload" }, { status: 400 });
    }

    const contentType = profilePhotoContentType(file);
    if (!contentType) {
      return NextResponse.json(
        { error: "Use a JPEG, PNG, or WebP image" },
        { status: 400 },
      );
    }
    if (file.size <= 0 || file.size > PROFILE_PHOTO_MAX_BYTES) {
      return NextResponse.json(
        { error: "Photo must be smaller than 5 MB" },
        { status: 400 },
      );
    }

    const photoUrl = await uploadProfilePicture({
      bytes: Buffer.from(await file.arrayBuffer()),
      contentType,
    });

    await connectDb();
    const updated = isCollaborator(auth)
      ? await HousingCollaborator.findByIdAndUpdate(
          auth.id,
          { $set: { profilePic: photoUrl } },
          { new: true },
        ).select("_id")
      : await Employees.findByIdAndUpdate(
          auth.id,
          { $set: { profilePic: photoUrl } },
          { new: true },
        ).select("_id");

    if (!updated) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, photoUrl });
  } catch (error) {
    console.error("[profile-picture] upload failed:", error);
    const message = error instanceof Error ? error.message : "Could not update the profile picture";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
