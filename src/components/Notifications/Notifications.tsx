import axios from "axios";
import { useEffect, useState, useCallback } from "react";
import { BellDot, ExternalLink, LucideLoader2, Clock, CalendarDays } from "lucide-react";

import { Button } from "@/components/ui/button";
import { IQuery } from "@/util/type";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Separator } from "../ui/separator";
import { Badge } from "../ui/badge";
import Link from "next/link";

export function Notifications() {
  const [fourDaysReminders, setFourDaysReminders] = useState<IQuery[]>([]);
  const [loading, setLoading] = useState(false);
  const [reminderCount, setReminderCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  const fetchReminders = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        "/api/sales/reminders/getThreeDaysReminders"
      );
      const reminders = response.data.allReminders || [];
      setFourDaysReminders(reminders);
      setReminderCount(response.data.count || reminders.length || 0);
    } catch (err: any) {
      console.log("err: ", err);
      setFourDaysReminders([]);
      setReminderCount(0);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch reminder count on component mount and every 5 minutes
  useEffect(() => {
    fetchReminders();
    
    // Refresh every 5 minutes to keep count updated
    const interval = setInterval(fetchReminders, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [fetchReminders]);

  // Helper to get reminder date from either reminder field (new) or reason field (old)
  const getReminderDate = (query: IQuery): Date | null => {
    // Try reminder field first (new format)
    if (query?.reminder) {
      const d = new Date(query.reminder);
      if (!isNaN(d.getTime())) return d;
    }
    // Fallback to reason field (old format - stored as ISO string)
    if (query?.reason) {
      const d = new Date(query.reason);
      if (!isNaN(d.getTime())) return d;
    }
    return null;
  };

  const remainingDays = (query: IQuery) => {
    const reminderDate = getReminderDate(query);
    if (!reminderDate) return "N/A";
    
    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);
    
    const reminderDateCopy = new Date(reminderDate);
    reminderDateCopy.setHours(0, 0, 0, 0);

    const timeDiff: number = reminderDateCopy.getTime() - todayDate.getTime();
    const daysDifference = Math.floor(timeDiff / (1000 * 3600 * 24));

    if (daysDifference < 0) return "Overdue";
    if (daysDifference === 0) return "Today";
    if (daysDifference === 1) return "Tomorrow";
    return `${daysDifference} days`;
  };

  const getDayBadgeColor = (query: IQuery) => {
    const reminderDate = getReminderDate(query);
    if (!reminderDate) return "bg-gray-500";
    
    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);
    
    const reminderDateCopy = new Date(reminderDate);
    reminderDateCopy.setHours(0, 0, 0, 0);
    
    const timeDiff = reminderDateCopy.getTime() - todayDate.getTime();
    const daysDifference = Math.floor(timeDiff / (1000 * 3600 * 24));
    
    if (daysDifference < 0) return "bg-red-600";
    if (daysDifference === 0) return "bg-red-500";
    if (daysDifference === 1) return "bg-orange-500";
    return "bg-green-500";
  };

  const formatReminderDate = (query: IQuery) => {
    const reminderDate = getReminderDate(query);
    if (!reminderDate) return "";
    return reminderDate.toLocaleDateString("en-GB", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      setIsOpen(open);
      if (open) fetchReminders();
    }}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          className="relative rounded-3xl bg-gradient-to-r from-[#99f2c8] to-[#1f4037] text-black font-semibold flex gap-x-1 hover:scale-105 transition-transform"
        >
          <BellDot className={reminderCount > 0 ? "animate-pulse" : ""} />
          Reminders
          {reminderCount > 0 && (
            <Badge 
              className="absolute -top-2 -right-2 min-w-[20px] h-5 flex items-center justify-center bg-red-500 text-white text-xs font-bold rounded-full px-1.5 animate-bounce"
            >
              {reminderCount > 99 ? "99+" : reminderCount}
            </Badge>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[900px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            Upcoming Reminders
            {reminderCount > 0 && (
              <Badge className="bg-primary text-primary-foreground">
                {reminderCount} upcoming
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            These are your upcoming reminders for the next 4 days. Stay on top of your leads!
          </DialogDescription>
        </DialogHeader>
        {loading ? (
          <div className="flex flex-col items-center justify-center py-8">
            <LucideLoader2 className="animate-spin h-8 w-8 text-primary" />
            <p className="mt-2 text-sm text-muted-foreground">Loading reminders...</p>
          </div>
        ) : fourDaysReminders && fourDaysReminders.length > 0 ? (
          <div className="flex flex-col gap-y-3">
            {fourDaysReminders.map((reminder, index) => (
              <div
                key={reminder._id || index}
                className="border border-neutral-700 rounded-xl flex flex-wrap md:flex-nowrap justify-between items-center gap-2 p-3 hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-center gap-2 min-w-[120px]">
                  <Badge className={`${getDayBadgeColor(reminder)} text-white whitespace-nowrap`}>
                    <Clock className="h-3 w-3 mr-1" />
                    {remainingDays(reminder)}
                  </Badge>
                </div>
                <Separator orientation="vertical" className="h-8 hidden md:block" />
                <div className="flex-1 min-w-[100px]">
                  <p className="text-xs text-muted-foreground">Name</p>
                  <p className="font-medium truncate">{reminder?.name}</p>
                </div>
                <Separator orientation="vertical" className="h-8 hidden md:block" />
                <div className="min-w-[80px]">
                  <p className="text-xs text-muted-foreground">Budget</p>
                  <p className="font-medium">€{reminder?.maxBudget || reminder?.budget}</p>
                </div>
                <Separator orientation="vertical" className="h-8 hidden md:block" />
                <div className="min-w-[100px]">
                  <p className="text-xs text-muted-foreground">Location</p>
                  <p className="font-medium truncate">
                    {reminder?.location}{reminder?.area ? ` / ${reminder?.area}` : ""}
                  </p>
                </div>
                <Separator orientation="vertical" className="h-8 hidden md:block" />
                <div className="min-w-[90px]">
                  <p className="text-xs text-muted-foreground">Date</p>
                  <p className="font-medium text-sm">{formatReminderDate(reminder)}</p>
                </div>
                <Link
                  href={`/dashboard/createquery/${reminder?._id}`}
                  target="_blank"
                  className="p-2 hover:bg-primary/10 rounded-full transition-colors"
                >
                  <ExternalLink size={18} className="text-primary" />
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <BellDot className="h-16 w-16 text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-semibold text-muted-foreground">No Upcoming Reminders</h3>
            <p className="text-sm text-muted-foreground/70 mt-1">
              You don&apos;t have any reminders scheduled for the next 4 days.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
