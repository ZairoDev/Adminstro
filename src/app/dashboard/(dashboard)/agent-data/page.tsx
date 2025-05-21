"use client";

import useDashboardData from "@/hooks/(VS)/useDashboardData"
import { EmployeeLeadCard } from "@/components/VS/dashboard/EmployeeLeadCard";

const AgentWiseData = () => {

  const { dashboardData, isLoading, isError, error, refetch } = useDashboardData();

  if (isLoading) return <div>Loading...</div>;
  if (isError) return <div>{error}</div>;


  return (
    <div className=" grid md:grid-cols-2 gap-4">
      {dashboardData?.map((employee) => (
        <EmployeeLeadCard key={employee._id} data={employee} />
      ))}
    </div>
  )
}
export default AgentWiseData