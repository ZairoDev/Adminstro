"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { DateRange } from "react-day-picker";

import useLeads from "@/hooks/(VS)/useLeads";
import { Button } from "@/components/ui/button";
import { LeadsByAgent } from "@/components/VS/dashboard/lead-by-agents";
import { DatePickerWithRange } from "@/components/Date-picker-with-range";
import { LeadsByLocation } from "@/components/VS/dashboard/lead-by-location";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// import { getRandomColor } from "@/lib/utils";
// import { LabelledPieChart } from "@/components/charts/LabelledPieChart";
// import { LabelledBarChart } from "@/components/charts/LabelledBarChart";
// import useLeadsGroupedByAgents from "@/hooks/(VS)/useLeadsGroupedByAgents";
// import useLeadsGroupedByLocation from "@/hooks/(VS)/useLeadsGroupedByLocation";

const Dashboard = () => {

  const [date, setDate] = useState<DateRange | undefined>(undefined);

  const { leads, isLoading, isError, error, refetch } = useLeads({ date });

  if (isLoading) {
    return (
      <div className=" w-full h-screen flex justify-center items-center">
        <Loader2 className=" animate-spin" />
      </div>
    )
  }

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

  // const chartData = leads.leadsByLocation.map((item) => ({
  //   label: item._id,
  //   count: item.count,
  //   fill: getRandomColor(),
  // }));

  return (

    <div className="container mx-auto p-4 md:p-6">
      <h1 className="text-3xl font-bold mb-6">Lead Generation Dashboard</h1>

      {/* Date Filter */}
      <div className="flex justify-end gap-x-4">
        <DatePickerWithRange date={date} setDate={setDate} />
        <Button onClick={refetch}>Refresh</Button>
      </div>


      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
        {/* Left Column */}
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>Leads by Location</CardTitle>
          </CardHeader>
          <CardContent>
            <LeadsByLocation leadsByLocation={leads.leadsByLocation} />
          </CardContent>
        </Card>

        {/* Right Column */}
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>Leads by Agent</CardTitle>
          </CardHeader>
          <CardContent>
            <LeadsByAgent leadsByAgent={leads.leadsByAgent} />
          </CardContent>
        </Card>
      </div>

      {/* <LabelledPieChart chartData={chartData} /> */}
      {/* <LabelledBarChart chartData={chartData} /> */}
    </div>

  )
}
export default Dashboard  