"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { DateRange } from "react-day-picker";

import { Button } from "@/components/ui/button";
import useAgentLeads from "@/hooks/(VS)/useAgentLeads";
import { LeadCard } from "@/app/dashboard/guest-window/lead-card";

interface PageProps {
  location: string;
  agent: string;
  date: DateRange | undefined
}

const GroupedLeadTable = ({ location, agent, date }: PageProps) => {
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [location, agent]);

  const { leads, totalLeads, isError, isLoading, error } = useAgentLeads(agent, location, date, page);

  // console.log("leads in grouped-lead-table: ", leads);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="animate-spin" />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p>{error}</p>
      </div>
    )
  }


  return (
    <div className=" border rounded-md p-4 relative">
      <h1>Leads of <span className=" text-xl font-bold text-emerald-500">{agent}</span> in <span className=" font-bold text-xl text-yellow-500">{location}</span></h1>
      <div className=" flex flex-col gap-y-2 items-center mt-4">
        {leads?.map((lead, index) => (
          <div key={lead._id} className=" flex justify-between relative">
            <p className=" absolute -top-3 left-4 font-semibold p-2 rounded-md w-6 h-6 bg-white text-black flex items-center justify-center text-xs">{index + (page - 1) * 10 + 1}</p>
            <LeadCard lead={lead} />
          </div>
        ))}
      </div>
      <div className=" flex gap-x-2 absolute bottom-2 right-2">
        <Button onClick={() => setPage(page - 1)} disabled={page === 1}>Previous</Button>
        <Button onClick={() => setPage(page + 1)} disabled={page === Math.ceil(totalLeads / 10)}>Next</Button>
      </div>
    </div>
  )
}
export default GroupedLeadTable;