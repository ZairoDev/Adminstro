import { NextRequest, NextResponse } from "next/server";

import Employees from "@/models/employee";
import { connectDb } from "@/util/db";
import { getDataFromToken } from "@/util/getDataFromToken";
import type { WhatsAppPhoneMaskRules } from "@/lib/whatsapp/phoneMask";

export const dynamic = "force-dynamic";

function ensureHrOrSuperAdmin(role: unknown) {
  const r = String(role || "");
  if (r !== "HR" && r !== "SuperAdmin") {
    return NextResponse.json(
      { error: "Unauthorized. Only HR/SuperAdmin can manage WhatsApp phone masking." },
      { status: 403 },
    );
  }
  return null;
}

export async function GET(request: NextRequest) {
  try {
    const token = await getDataFromToken(request);
    await connectDb();

    const { searchParams } = new URL(request.url);
    const requestedId = String(searchParams.get("employeeId") || "").trim();
    const tokenId = String((token as { id?: string; _id?: string }).id || (token as { _id?: string })._id || "");
    const role = (token as { role?: string }).role || "";

    let employeeId = requestedId || tokenId;
    if (!employeeId) {
      return NextResponse.json({ error: "employeeId is required" }, { status: 400 });
    }

    const isSelf = employeeId === tokenId;
    if (!isSelf) {
      const deny = ensureHrOrSuperAdmin(role);
      if (deny) return deny;
    }

    const employee = await Employees.findById(employeeId)
      .select("_id name email whatsappPhoneMask")
      .lean();

    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    const m = (employee as { whatsappPhoneMask?: Partial<WhatsAppPhoneMaskRules> }).whatsappPhoneMask;
    const whatsappPhoneMask: WhatsAppPhoneMaskRules = {
      maskOwnerPhones: Boolean(m?.maskOwnerPhones),
      maskGuestPhones: Boolean(m?.maskGuestPhones),
    };

    return NextResponse.json({
      success: true,
      employeeId: String((employee as { _id: unknown })._id),
      name: (employee as { name?: string }).name,
      email: (employee as { email?: string }).email,
      whatsappPhoneMask,
    });
  } catch (error: unknown) {
    const err = error as { status?: number; code?: string; message?: string };
    if (err?.status === 401 || err?.code) {
      return NextResponse.json(
        { code: err.code || "AUTH_FAILED" },
        { status: err.status || 401 },
      );
    }
    console.error("whatsapp-phone-mask GET error:", error);
    return NextResponse.json(
      { error: err?.message || "Failed to load phone mask settings" },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const token = await getDataFromToken(request);
    const deny = ensureHrOrSuperAdmin((token as { role?: string }).role);
    if (deny) return deny;

    await connectDb();
    const body = await request.json();
    const employeeId = String(body?.employeeId || "").trim();

    if (!employeeId) {
      return NextResponse.json({ error: "employeeId is required" }, { status: 400 });
    }

    const whatsappPhoneMask: WhatsAppPhoneMaskRules = {
      maskOwnerPhones: Boolean(body?.maskOwnerPhones),
      maskGuestPhones: Boolean(body?.maskGuestPhones),
    };

    const updated = await Employees.findByIdAndUpdate(
      employeeId,
      { $set: { whatsappPhoneMask } },
      { new: true },
    ).select("_id name email whatsappPhoneMask");

    if (!updated) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, employee: updated });
  } catch (error: unknown) {
    const err = error as { status?: number; code?: string; message?: string };
    if (err?.status === 401 || err?.code) {
      return NextResponse.json(
        { code: err.code || "AUTH_FAILED" },
        { status: err.status || 401 },
      );
    }
    console.error("whatsapp-phone-mask PUT error:", error);
    return NextResponse.json(
      { error: err?.message || "Failed to update phone mask settings" },
      { status: 500 },
    );
  }
}
