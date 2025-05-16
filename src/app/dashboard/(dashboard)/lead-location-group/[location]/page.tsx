"use client";

import { useState } from "react";
import { Loader2, User } from "lucide-react"
import { DateRange } from "react-day-picker";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DatePickerWithRange } from "@/components/Date-picker-with-range";
import useLeadsGroupedByAgents from "@/hooks/(VS)/useLeadsGroupedByAgents";
import GroupedLeadTable from "@/components/VS/dashboard/grouped-lead-table";

interface PageProps {
  params: {
    location: string;
  }
}

function LeadLocationGroup({ params }: PageProps) {

  const [date, setDate] = useState<DateRange | undefined>(undefined);
  const { leads, isLoading, isError, error, refetch } = useLeadsGroupedByAgents({ date: date, location: params.location });
  const [selectedAgent, setSelectedAgent] = useState("");

  if (isLoading) {
    return (
      <div className=" w-full h-screen flex justify-center items-center">
        <Loader2 className=" animate-spin" />
      </div>
    )
  }
  // console.log("leads in lead-location-group: ", leads);
  if (isError) {
    return (
      <div className=" w-full h-screen flex justify-center items-center">
        <p>{error}</p>
      </div>
    )
  }

  if (!leads) {
    return null;
  }

  // console.log("leads in lead-location-group: ", leads);

  const totalLeads = leads.reduce((sum, item) => sum + item.count, 0)

  return (
    <div>

      <div className="flex justify-end gap-x-4 mt-4">
        <DatePickerWithRange date={date} setDate={setDate} />
        <Button onClick={refetch}>Refresh</Button>
      </div>

      <div className="space-y-4 border p-2 rounded-md max-w-xl mx-auto my-10">
        <h2>Leads of <span className=" font-semibold text-2xl text-blue-400">{params.location}</span></h2>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-muted-foreground">Total Leads</h3>
          <span className="text-3xl font-bold">{totalLeads}</span>
        </div>

        <div className="h-px bg-border my-4" />

        <ScrollArea className=" w-full h-80">
          <div className="space-y-3 px-3">
            {leads.map((item, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center gap-2 cursor-pointer" onClick={() => setSelectedAgent(item._id)}>
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span>{item._id ? item._id : "Null"}</span>
                </div>
                <span className="font-medium">{item.count}</span>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div >

      {selectedAgent && <GroupedLeadTable location={params.location} agent={selectedAgent} date={date} />}
    </div >
  )
}


export default LeadLocationGroup;