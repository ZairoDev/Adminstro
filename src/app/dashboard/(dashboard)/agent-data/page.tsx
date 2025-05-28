"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { DateRange } from "react-day-picker";

import { Button } from "@/components/ui/button";
import useDashboardData from "@/hooks/(VS)/useDashboardData"
import { DatePickerWithRange } from "@/components/Date-picker-with-range";
import { EmployeeLeadCard } from "@/components/VS/dashboard/EmployeeLeadCard";

const AgentWiseData = () => {

  const [date, setDate] = useState<DateRange | undefined>(undefined);
  const { dashboardData, isLoading, isError, error, refetch, reset } = useDashboardData({ date });


  if (isLoading) return (
    <div className=" w-full h-[80vh] flex justify-center items-center">
      <Loader2 className=" animate-spin" size={48} />
    </div>
  )
  if (isError) return <div>{error}</div>;
  if (!dashboardData) return <div>No Data</div>

  dashboardData.sort((a, b) => {
    const nameA = a.employee?.toLowerCase() || "";
    const nameB = b.employee?.toLowerCase() || "";
    return nameA.localeCompare(nameB);
  })

  return (
    <div>
      <div className="flex justify-end gap-4 m-4">
        <DatePickerWithRange date={date} setDate={setDate} />
        <Button onClick={refetch}>Apply</Button>
        <Button onClick={reset}>Reset</Button>
      </div>
      <div className=" grid md:grid-cols-2 gap-4">
        {dashboardData?.map((employee) => (
          <EmployeeLeadCard key={employee._id} data={employee} />
        ))}
      </div>
    </div>
  )
}
export default AgentWiseData