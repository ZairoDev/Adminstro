import { isGoogleCalendarConfigured } from "@/lib/calendar/googleCalendar";
import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    success: true,
    configured: isGoogleCalendarConfigured(),
  });
}
