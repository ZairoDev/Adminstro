"use client";

import axios from "axios";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";

import { IQuery } from "@/util/type";
import ReminderTable from "@/components/reminderTable/ReminderTable";
import { LucideLoader2 } from "lucide-react";

const ReminderPage = () => {
  const { toast } = useToast();

  const [allReminders, setAllReminders] = useState<IQuery[]>([]);
  const [reminderLoading, setReminderLoading] = useState(false);

  const fetchReminderLeads = async () => {
    try {
      setReminderLoading(true);
      const response = await axios.get("/api/sales/reminders/getAllReminders");
      setAllReminders(response.data.allReminders);
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: err.message,
      });
    } finally {
      setReminderLoading(false);
    }
  };

  useEffect(() => {
    fetchReminderLeads();
  }, []);

  return (
    <div className=" w-full h-[90vh] flex justify-center items-center">
      {reminderLoading ? (
        <LucideLoader2 className=" animate-spin" />
      ) : (
        <ReminderTable queries={allReminders} />
      )}
    </div>
  );
};

export default ReminderPage;
