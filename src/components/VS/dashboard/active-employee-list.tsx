import Link from "next/link";
import { useEffect } from "react";
import { RotateCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useActiveEmployees } from "@/hooks/employee/useActiveEmployee";

const ActiveEmployeeList = () => {

  const { employees, refetch, isLoading } = useActiveEmployees();

  useEffect(() => {
    refetch({
      isActive: true,
      role: "LeadGen"
    })
  }, [])

  return (
    <div className="px-2 py-1 flex flex-col justify-between overflow-hidden h-full">
      <h2 className=" font-semibold text-lg py-1">Active Employees
        <span className=" text-sm">{" "}(Lead Gen)</span>
      </h2>
      <div className="h-[90%] overflow-y-scroll">
        {employees?.map((employee) => (
          <div key={employee._id} className=" p-1 rounded-md bg-gray-500/10 my-2 flex gap-x-2">
            <Link href={`/dashboard/lead-agent-group/${employee.email.split("@")[0]}`} target="_blank">
              {employee.name}
            </Link>
            <p>({employee.leads})</p>
          </div>
        ))}
      </div>

      <Button onClick={() => refetch({ isActive: true, role: "LeadGen" })} className=" w-full ">
        <RotateCw className={`${isLoading ? "animate-spin" : ""}`} />
      </Button>

    </div>
  )
}
export default ActiveEmployeeList;