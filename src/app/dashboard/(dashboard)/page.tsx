"use client";

import { useState } from "react";
import { DateRange } from "react-day-picker";
import { Loader2, RotateCw } from "lucide-react";

import {
  Select,
  SelectItem,
  SelectValue,
  SelectGroup,
  SelectLabel,
  SelectTrigger,
  SelectContent,
} from "@/components/ui/select"
import useLeads from "@/hooks/(VS)/useLeads";
import { Button } from "@/components/ui/button";
import useTodayLeads from "@/hooks/(VS)/useTodayLead";
import { LeadsByAgent } from "@/components/VS/dashboard/lead-by-agents";
import { DatePickerWithRange } from "@/components/Date-picker-with-range";
import { CustomStackBarChart } from "@/components/charts/StackedBarChart";
import { LeadsByLocation } from "@/components/VS/dashboard/lead-by-location";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import ActiveEmployeeList from "@/components/VS/dashboard/active-employee-list";


const Dashboard = () => {

  const [date, setDate] = useState<DateRange | undefined>(undefined);

  const { leads, isLoading, isError, error, refetch, reset } = useLeads({ date });
  const {
    leads: todayLeads,
    totalLeads: totalTodayLeads,
    refetch: refetchTodayLeads,
    isLoading: isLoadingTodayLeads
  } = useTodayLeads();


  const todaysLeadChartData = todayLeads?.map((lead) => {
    const label = lead.createdBy;
    const categories = lead.locations.map((location) => ({ field: location.location, count: location.count }));
    return { label, categories }
  })

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

  const handleDateFilter = (value: string) => {
    const days = Number(value.split(" ")[0]);

    const today = new Date();
    const startDate = new Date(today.setDate(today.getDate() - days));
    const endDate = new Date();
    
    setDate({ from: startDate, to: endDate });
  }

  return (

    <div className="container mx-auto p-4 md:p-6">
      <h1 className="text-3xl font-bold mb-6">Lead Generation Dashboard</h1>

      {/* Daily Leads by Agent */}
      <div className=" w-full flex justify-between gap-x-2 h-[350px] lg:h-[520px]">
        <div className=" w-2/3 flex justify-center relative">
          <CustomStackBarChart
            heading={`Today Leads - ${totalTodayLeads}`}
            subHeading="Leads by Agent"
            chartData={todaysLeadChartData ? todaysLeadChartData : []}
          />
          <Button
            size={"sm"}
            onClick={refetchTodayLeads}
            className="absolute top-0 right-0"
          >
            <RotateCw className={`${isLoadingTodayLeads ? "animate-spin" : ""}`} />
          </Button>
        </div>

        {/* Active Employees */}
        <div className=" h-full border rounded-md w-72">
          <ActiveEmployeeList />
        </div>
      </div>


      {/* Date Filter */}
      <div className="flex justify-end gap-4 mt-4">
        <Select onValueChange={(value) => handleDateFilter(value)}>
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="Select filter" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>Fruits</SelectLabel>
              <SelectItem value="7 days">7 days</SelectItem>
              <SelectItem value="10 days">10 days</SelectItem>
              <SelectItem value="15 days">15 days</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
        <div>
          <DatePickerWithRange date={date} setDate={setDate} className="" />
        </div>

        <Button onClick={refetch}>Apply</Button>
        <Button onClick={reset}>Reset</Button>
      </div>


      {/* Leads by Location and Agent */}
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