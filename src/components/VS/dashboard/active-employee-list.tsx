import { useActiveEmployees } from "@/hooks/employee/useActiveEmployee";
import Link from "next/link";
import { useEffect } from "react";

const ActiveEmployeeList = () => {

  const { employees, refetch } = useActiveEmployees();

  useEffect(() => {
    refetch({
      isActive: true,
      role: "LeadGen"
    })
  }, [])

  return (
    <div className="px-2">
      {employees.map((employee) => (
        <div key={employee._id} className=" p-1 rounded-md bg-gray-500/10 my-2">
          <Link href={`/dashboard/lead-agent-group/${employee.email.split("@")[0]}`} target="_blank">
            {employee.name}
          </Link>
        </div>
      ))}
    </div>
  )
}
export default ActiveEmployeeList;