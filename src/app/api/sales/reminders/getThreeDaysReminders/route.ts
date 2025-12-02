import Query from "@/models/query";
import { connectDb } from "@/util/db";
import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";

connectDb();

export async function GET(req: NextRequest) {
  try {
    // Get start of today in UTC
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    
    // Get end of 4 days from now (covering upcoming 4 days)
    const fourDaysLater = new Date(todayStart);
    fourDaysLater.setDate(fourDaysLater.getDate() + 4);
    fourDaysLater.setHours(23, 59, 59, 999);

    // First, get all leads with reminder status
    const allReminderLeads = await Query.find({
      leadStatus: "reminder"
    });

    // Filter leads that have valid reminder dates within the next 4 days
    // Check both `reminder` field (new format) and `reason` field (old format)
    const filteredReminders = allReminderLeads.filter((lead) => {
      let reminderDate: Date | null = null;

      // Try to get date from reminder field first (new format)
      if (lead.reminder) {
        const d = new Date(lead.reminder);
        if (!isNaN(d.getTime())) {
          reminderDate = d;
        }
      }
      
      // Fallback to reason field (old format - stored as ISO string)
      if (!reminderDate && lead.reason) {
        const d = new Date(lead.reason);
        if (!isNaN(d.getTime())) {
          reminderDate = d;
        }
      }

      // If no valid date found, exclude this lead
      if (!reminderDate) return false;

      // Check if the reminder is within the next 4 days
      return reminderDate >= todayStart && reminderDate <= fourDaysLater;
    });

    // Sort by reminder date (earliest first)
    filteredReminders.sort((a, b) => {
      const getDate = (lead: any): number => {
        if (lead.reminder) {
          const d = new Date(lead.reminder);
          if (!isNaN(d.getTime())) return d.getTime();
        }
        if (lead.reason) {
          const d = new Date(lead.reason);
          if (!isNaN(d.getTime())) return d.getTime();
        }
        return Infinity;
      };
      return getDate(a) - getDate(b);
    });

    // Return the filtered and sorted reminders
    return NextResponse.json({ 
      allReminders: filteredReminders || [], 
      count: filteredReminders?.length || 0 
    }, { status: 200 });
  } catch (err: any) {
    console.error("Error fetching reminders:", err);
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
