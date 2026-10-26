import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { isMailboxKey } from "@/lib/email/mailbox-config";
import { verifyMailboxSchema } from "@/lib/email/mailbox.schema";
import {
  credentialsForVerify,
  mailboxAuthError,
  requireSuperAdmin,
} from "@/lib/email/mailbox.service";

type RouteContext = { params: Promise<{ key: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    await requireSuperAdmin(request);
    const { key } = await context.params;
    if (!isMailboxKey(key)) {
      return NextResponse.json(
        { success: false, message: "Unknown email account" },
        { status: 404 },
      );
    }

    const raw: unknown = await request.json().catch(() => ({}));
    const parsed = verifyMailboxSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid connection test",
          errors: parsed.error.flatten(),
        },
        { status: 400 },
      );
    }

    const { user, pass } = await credentialsForVerify(key, parsed.data);
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user, pass },
    });
    await transporter.verify();

    return NextResponse.json({
      success: true,
      message: `Signed in as ${user}`,
    });
  } catch (error) {
    const auth = mailboxAuthError(error);
    if (auth.status === 401 || auth.status === 403) {
      return NextResponse.json(auth.body, { status: auth.status });
    }
    const message =
      error instanceof Error ? error.message : "Could not sign in with this account";
    return NextResponse.json({ success: false, message }, { status: 400 });
  }
}
