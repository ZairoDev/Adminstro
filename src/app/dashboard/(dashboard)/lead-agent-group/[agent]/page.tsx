"use client";

import { useState } from "react";
import { DateRange } from "react-day-picker";
import { Loader2, MapPin } from "lucide-react"

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DatePickerWithRange } from "@/components/Date-picker-with-range";
import GroupedLeadTable from "@/components/VS/dashboard/grouped-lead-table";
import useLeadsGroupedByLocation from "@/hooks/(VS)/useLeadsGroupedByLocation";

interface PageProps {
  params: {
    agent: string;
  }
}

function LeadAgentGroup({ params }: PageProps) {

  const [date, setDate] = useState<DateRange | undefined>(undefined);
  const { leads, isLoading, isError, error, refetch } = useLeadsGroupedByLocation({
    date: date, agentEmail: `${params.agent}@gmail.com`
  })
  const [selectedLocation, setSelectedLocation] = useState("");


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

  const totalLeads = leads.reduce((sum, item) => sum + item.count, 0)

  return (
    <div>

      {/* Date Filter */}
      <div className="flex justify-end gap-x-4 mt-4">
        <DatePickerWithRange date={date} setDate={setDate} />
        <Button onClick={refetch}>Refresh</Button>
      </div>

      <div className="space-y-4 border rounded-md p-2 max-w-xl mx-auto my-10">
        <h2>Leads of <span className=" font-semibold text-2xl text-blue-400">{params.agent}@gmail.com</span></h2>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-muted-foreground">Total Leads</h3>
          <span className="text-3xl font-bold">{totalLeads}</span>
        </div>

        <div className="h-px bg-border my-4" />

        <ScrollArea className=" w-full h-80">
          <div className="space-y-3 md:px-3">
            {leads.map((item, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center gap-2 cursor-pointer" onClick={() => setSelectedLocation(item._id)}>
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>{item._id ?? "Null"}</span>
                </div>
                <span className="font-medium">{item.count}</span>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      {selectedLocation && <GroupedLeadTable location={selectedLocation} agent={`${params.agent}@gmail.com`} date={date} />}
    </div>
  )
}



export default LeadAgentGroup;