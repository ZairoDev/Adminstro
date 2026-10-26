import { NextRequest, NextResponse } from "next/server";
import {
  listMailboxes,
  mailboxAuthError,
  requireSuperAdmin,
} from "@/lib/email/mailbox.service";

export async function GET(request: NextRequest) {
  try {
    await requireSuperAdmin(request);
    const mailboxes = await listMailboxes();
    return NextResponse.json({ success: true, mailboxes });
  } catch (error) {
    const auth = mailboxAuthError(error);
    if (auth.status === 401 || auth.status === 403) {
      return NextResponse.json(auth.body, { status: auth.status });
    }
    console.error("GET /api/email-mailboxes", error);
    return NextResponse.json(
      { success: false, message: "Failed to load email accounts" },
      { status: 500 },
    );
  }
}
