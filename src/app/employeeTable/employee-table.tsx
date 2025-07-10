import axios from "axios";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Ellipsis, RefreshCcw } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import {
  Table,
  TableRow,
  TableCell,
  TableHead,
  TableBody,
  TableHeader,
} from "@/components/ui/table";
import {
  Select,
  SelectItem,
  SelectValue,
  SelectTrigger,
  SelectContent,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuGroup,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { UserInterface } from "@/util/type";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { employeeRoles } from "@/models/employee";

export default function EmployeeTable({
  employees,
}: {
  employees: UserInterface[];
}) {
  const [employeeList, setEmployeeList] = useState<UserInterface[]>();
  const [filteredEmployee, setFilteredEmployee] = useState<UserInterface[]>([]);

  const [queryType, setQueryType] = useState("name");
  const [loadingIndex, setLoadingIndex] = useState("-1");

  const ellipsisRef = useRef<HTMLButtonElement>(null);

  {
    /* Regenerate Individual Password */
  }
  const regeneratePassword = async (employee: UserInterface) => {
    try {
      setLoadingIndex(employee._id);
      const response = await axios.post("/api/generateNewpassword", {
        employeeId: employee._id,
      });

      const updatedEmployeeList = employeeList?.map((emp) =>
        employee._id === emp._id
          ? { ...emp, password: response.data.newPassword }
          : emp
      );
      setEmployeeList(updatedEmployeeList);
      setFilteredEmployee(updatedEmployeeList ?? []);
    } catch (error: any) {
      console.log(error, "Password error will be render here");
      return error;
    } finally {
      setLoadingIndex("-1");
    }
  };

  useEffect(() => {
    setEmployeeList(employees);
    setFilteredEmployee(employees);
  }, [employees]);

  return (
    <div className=" w-full ">
      <div className=" flex justify-between">
        <div className=" flex gap-x-2">
          {/* Search Type */}
          <Select
            value={queryType}
            onValueChange={(value) => setQueryType(value)}
          >
            <SelectTrigger>
              <span>{queryType}</span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="email">Email</SelectItem>
              <SelectItem value="phone">Phone</SelectItem>
            </SelectContent>
          </Select>

          {/* Search Bar */}
          <Input
            className=" border border-white w-48"
            onChange={(e) => {
              const value = e.target.value.trim().toLowerCase();
              if (value.length === 0) {
                setFilteredEmployee(employeeList ?? []);
                return;
              }
              const updatedEmployeeList = filteredEmployee?.filter((emp) =>
                (emp[queryType as "name" | "email" | "phone"] as string)
                  .toLowerCase()
                  .includes(value)
              );
              setFilteredEmployee(updatedEmployeeList ?? []);
            }}
            placeholder="Search..."
          />
        </div>

        <div className=" flex gap-x-2">
          {/* Role Filter */}
          <Select
            onValueChange={(value) => {
              if (value === "All") {
                setFilteredEmployee(employeeList ?? []);
                return;
              }
              const empList = employeeList?.filter((emp) => emp.role === value);
              setFilteredEmployee(empList ?? []);
            }}
          >
            <SelectTrigger className="w-[100px]">
              <SelectValue placeholder="Role" />
            </SelectTrigger>
            <SelectContent>
              {["All", ...employeeRoles].map((role, index) => (
                <SelectItem key={index} value={role}>
                  {role}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Copy Passwords */}
          <Button
            onClick={() => {
              const copyPasswords = filteredEmployee?.map(
                (row) => `${row.email} : ${row.password}`
              );
              navigator.clipboard.writeText(
                JSON.stringify(copyPasswords, null, 2)
              );
            }}
          >
            Copy Passwords
          </Button>
        </div>
      </div>

      {/* Employee Table */}
      <Table>
        <TableHeader>
          {/* Columns */}
          <TableRow>
            <TableHead>S.No.</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Contact</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Passwords</TableHead>
            <TableHead>Actions </TableHead>
          </TableRow>
        </TableHeader>

        {/* Rows */}
        <TableBody>
          {filteredEmployee?.map((employee, index) => (
            <TableRow key={employee?._id}>
              <TableCell>{index + 1}</TableCell>
              <TableCell>{employee.name}</TableCell>
              <TableCell>{employee.phone}</TableCell>
              <TableCell>{employee.email}</TableCell>
              <TableCell>{employee.role}</TableCell>
              <TableCell className="flex h-[70px] gap-x-2 my-auto items-center">
                <p>{employee?.password}</p>
                <RefreshCcw
                  size={16}
                  className={`cursor-pointer ${
                    employee._id === loadingIndex ? "animate-spin" : ""
                  } `}
                  onClick={() => regeneratePassword(employee)}
                />
              </TableCell>

              {/* Actions */}
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      ref={ellipsisRef}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Ellipsis size={18} />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="">
                    <DropdownMenuLabel>My Account</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuGroup>
                      <DropdownMenuItem
                        onClick={() => {
                          const textToCopy = `${employee.email} ${employee.password}`;
                          navigator.clipboard.writeText(textToCopy);
                        }}
                      >
                        Copy Credentials
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Link
                          href={`/dashboard/editemployeedetails/${employee._id}`}
                        >
                          Edit Profile
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Link
                          href={`/dashboard/employeedetails/${employee._id}`}
                        >
                          Actions
                        </Link>
                      </DropdownMenuItem>
                    </DropdownMenuGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
