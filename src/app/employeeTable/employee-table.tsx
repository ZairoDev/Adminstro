"use client";

import PeopleEmployeeTable from "@/features/people/components/EmployeeTable";
import { UserInterface } from "@/util/type";

export default function EmployeeTable({
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
      showInactive={false}
      showLockControls
      showPasswordRegen
    />
  );
}
