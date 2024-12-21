import axios from "axios";
import { useEffect, useState } from "react";
import { BellDot } from "lucide-react";

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

export function Notifications() {
  const [threeDaysReminders, setThreeDaysReminders] = useState<IQuery[]>([]);

  const fetchReminderOfThreeDays = async () => {
    try {
      const response = await axios.get(
        "/api/sales/reminders/getThreeDaysReminders"
      );
      setThreeDaysReminders(response.data.allReminders);
    } catch (err: any) {
      console.log("No Reminders");
    }
  };

  useEffect(() => {
    fetchReminderOfThreeDays();
  }, []);

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
        <div>
          {threeDaysReminders?.map((reminder, index) => (
            <div
              key={index}
              className=" border rounded-3xl text-sm flex gap-x-2 p-2"
            >
              <p>{reminder?.name}</p>
              <Separator orientation="vertical" className="" />
              <p>{reminder?.propertyType}</p>
              <Separator orientation="vertical" className="" />
              <p>{reminder?.guest}</p>
              <Separator orientation="vertical" className="" />
              <p>{reminder?.noOfBeds}</p>
              <Separator orientation="vertical" className="" />
              <p>{reminder?.budget}</p>
              <Separator orientation="vertical" className="" />
              <p>
                {reminder?.location} / {reminder?.area}
              </p>

              <p>{remainingDays(reminder?.reminder)}&nbsp; Days To Go</p>
            </div>
          ))}
        </div>
        {/* <DialogFooter>
          <Button type="submit">Save changes</Button>
        </DialogFooter> */}
      </DialogContent>
    </Dialog>
  );
}
