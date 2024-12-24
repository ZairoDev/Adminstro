import axios from "axios";
import { useEffect, useState } from "react";
import { BellDot, ExternalLink, LucideLoader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { IQuery } from "@/util/type";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Separator } from "../ui/separator";
import Link from "next/link";

export function Notifications() {
  const [threeDaysReminders, setThreeDaysReminders] = useState<IQuery[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchReminderOfThreeDays = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        "/api/sales/reminders/getThreeDaysReminders"
      );
      setThreeDaysReminders(response.data.allReminders);
    } catch (err: any) {
      console.log("No Reminders");
    } finally {
      setLoading(false);
    }
  };

  const remainingDays = (date: Date) => {
    const todayDate = new Date();
    const reminderDate = new Date(date);

    todayDate.setHours(0, 0, 0, 0);
    reminderDate.setHours(0, 0, 0, 0);

    const timeDiff: number = reminderDate.getTime() - todayDate.getTime();
    const daysDifference = timeDiff / (1000 * 3600 * 24);

    return Math.floor(daysDifference);
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          className=" rounded-3xl bg-gradient-to-r from-[#99f2c8] to-[#1f4037] text-black font-semibold flex gap-x-1"
          onClick={fetchReminderOfThreeDays}
        >
          <BellDot />
          Reminders
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[800px]">
        <DialogHeader>
          <DialogTitle>Reminders</DialogTitle>
          <DialogDescription>
            Thsese are the Upcoming Reminders of 3 days
          </DialogDescription>
        </DialogHeader>
        {loading ? (
          <LucideLoader2 className=" animate-spin mx-auto w-full" />
        ) : (
          <div className=" flex flex-col  gap-y-2">
            {threeDaysReminders?.map((reminder, index) => (
              <div
                key={index}
                className=" border border-neutral-700 rounded-xl flex justify-between items-center gap-x-2 p-2"
              >
                <p>
                  Name - <span className=" text-xs">{reminder?.name}</span>
                </p>
                <Separator orientation="vertical" className="" />
                <p>
                  Budget - <span className=" text-xs">{reminder?.budget}</span>
                </p>
                <Separator orientation="vertical" className="" />
                <p>
                  Area -{" "}
                  <span className=" text-xs">
                    {reminder?.location} / {reminder?.area}
                  </span>
                </p>
                <Separator orientation="vertical" className="" />
                <p className=" text-sm">
                  {remainingDays(reminder?.reminder)}&nbsp; Days To Go
                </p>
                <Link
                  href={`/dashboard/createquery/${reminder?._id}`}
                  target="_blank"
                >
                  <ExternalLink size={18} />
                </Link>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
