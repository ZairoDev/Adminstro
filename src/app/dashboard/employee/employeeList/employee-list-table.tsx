"use client";

import PeopleEmployeeTable from "@/features/people/components/EmployeeTable";
import { UserInterface } from "@/util/type";

export default function EmployeeListTable({
  employees,
  role,
}: {
  employees: UserInterface[];
  role: string;
}) {
  return (
    <PeopleEmployeeTable
      employees={employees}
      role={role}
      showInactive
      showLockControls={false}
      showPasswordRegen={false}
    />
  );
}
