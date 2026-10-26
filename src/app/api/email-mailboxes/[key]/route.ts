import { NextRequest, NextResponse } from "next/server";
import { isMailboxKey } from "@/lib/email/mailbox-config";
import { updateMailboxSchema } from "@/lib/email/mailbox.schema";
import {
  mailboxAuthError,
  requireSuperAdmin,
  updateMailbox,
} from "@/lib/email/mailbox.service";

type RouteContext = { params: Promise<{ key: string }> };

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const auth = await requireSuperAdmin(request);
    const { key } = await context.params;
    if (!isMailboxKey(key)) {
      return NextResponse.json(
        { success: false, message: "Unknown email account" },
        { status: 404 },
      );
    }

    const body: unknown = await request.json();
    const parsed = updateMailboxSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid email account",
          errors: parsed.error.flatten(),
        },
        { status: 400 },
      );
    }

    const mailbox = await updateMailbox(key, parsed.data, auth.id ?? null);
    return NextResponse.json({ success: true, mailbox });
  } catch (error) {
    const auth = mailboxAuthError(error);
    if (auth.status === 401 || auth.status === 403) {
      return NextResponse.json(auth.body, { status: auth.status });
    }
    const message = error instanceof Error ? error.message : "Failed to save email account";
    const status = message.includes("must be") || message.includes("not valid") ? 400 : 500;
    if (status === 500) console.error("PUT /api/email-mailboxes/[key]", error);
    return NextResponse.json({ success: false, message }, { status });
  }
}
