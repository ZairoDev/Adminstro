import { NextRequest, NextResponse } from "next/server";
import { getDataFromToken } from "@/util/getDataFromToken";
import {
  getWhatsAppToken,
  WHATSAPP_API_BASE_URL,
  WHATSAPP_BUSINESS_ACCOUNT_ID,
} from "@/lib/whatsapp/config";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const token = await getDataFromToken(req);
    if (!token) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const businessAccountId = WHATSAPP_BUSINESS_ACCOUNT_ID;
    const whatsappToken = getWhatsAppToken();

    if (!businessAccountId || !whatsappToken) {
      return NextResponse.json(
        { error: "WhatsApp configuration missing" },
        { status: 500 }
      );
    }

    const response = await fetch(
      `${WHATSAPP_API_BASE_URL}/${businessAccountId}/message_templates`,
      {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${whatsappToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("WhatsApp Templates API Error:", data);
      return NextResponse.json(
        { error: data.error?.message || "Failed to fetch templates" },
        { status: response.status }
      );
    }

    return NextResponse.json({
      success: true,
      templates: data.data || [],
    });
  } catch (error: any) {
    console.error("Fetch templates error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
