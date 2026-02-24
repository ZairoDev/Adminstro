import axios from "axios";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Ellipsis, Plus, RefreshCcw, Lock } from "lucide-react";

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
import { ToggleButton } from "@/components/toggle_button";
import { useToast } from "@/hooks/use-toast";

/** Employee row may include pips from API */
type EmployeeRow = UserInterface & {
  pips?: { status: string; endDate: string; pipLevel?: string }[];
};

/**
 * Utility function to check if HR user is viewing SuperAdmin account
 * @param viewerRole - Role of the currently logged-in user
 * @param employeeRole - Role of the employee being viewed
 * @returns true if HR is trying to view SuperAdmin, false otherwise
 */
const isHRViewingSuperAdmin = (viewerRole: string, employeeRole: string): boolean => {
  return viewerRole === "HR" && employeeRole === "SuperAdmin";
};

/** True when employee has an active PIP whose end date has passed (duration over, not cleared) */
function hasOverdueActivePIP(employee: EmployeeRow): boolean {
  const pips = employee.pips || [];
  const startOfToday = new Date();
  startOfToday.setUTCHours(0, 0, 0, 0);
  return pips.some(
    (p) => p.status === "active" && new Date(p.endDate) < startOfToday
  );
}

export default function EmployeeTable({
  employees,
  role,
}: {
  employees: EmployeeRow[];
  role: string;
}) {
  const { toast } = useToast();
  const [employeeList, setEmployeeList] = useState<EmployeeRow[]>();
  const [filteredEmployee, setFilteredEmployee] = useState<EmployeeRow[]>([]);

  const [queryType, setQueryType] = useState("name");
  const [loadingIndex, setLoadingIndex] = useState("-1");
  const [revealedContactId, setRevealedContactId] = useState<string | null>(null);
  const [revealedEmailId, setRevealedEmailId] = useState<string | null>(null);

  const ellipsisRef = useRef<HTMLButtonElement>(null);

  {
    /* Regenerate Individual Password */
  }
  const regeneratePassword = async (employee: UserInterface) => {
    // Prevent HR from regenerating SuperAdmin passwords
    if (isHRViewingSuperAdmin(role, employee.role)) {
      return;
    }

    try {
      setLoadingIndex(employee._id);
      const response = await axios.post("/api/generateNewpassword", {
        employeeId: employee._id,
      });

      const updatedEmployeeList = filteredEmployee?.map((emp) =>
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

  const updateEmployee = async(employeeId: string, data: any) => {
    try {
      const response = await axios.put("/api/employee/editEmployee", {
        _id: employeeId,
        ...data,
      });
      // if (response.status === 200) {
      //   toast({
      //     title: "Employee updated successfully",
      //     description: "Employee has been updated successfully",
      //   });
      // }
      return response.data;
    } catch (error: any) {
      console.log(error, "Error updating employee");
      return error;
    }
  };

  useEffect(() => {
    setEmployeeList(employees);
    setFilteredEmployee(employees);
  }, [employees]);

  const maskPhone = (phone?: string | number) => {
    if (phone === undefined || phone === null) return "";
    const phoneStr = String(phone);
    const cleaned = phoneStr.replace(/\s+/g, "");
    if (cleaned.length <= 4) return "****";
    const last = cleaned.slice(-4);
    return `****${last}`;
  };

  const maskEmail = (email?: string) => {
    if (!email) return "";
    const parts = email.split("@");
    if (parts.length !== 2) return "****";
    const name = parts[0];
    const domain = parts[1];
    if (name.length <= 2) return `${name[0]}****@${domain}`;
    return `${name[0]}****${name.slice(-1)}@${domain}`;
  };

  return (
    <div className=" w-full mt-2">
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

          <Link
            className="flex items-center justify-center gap-x-2"
            href="/dashboard/createnewEmployee"
          >
            <Button className="w-full sm:flex items-center gap-x-1 hidden">
              Add Employee
              <Plus size={18} />
            </Button>
          </Link>
        </div>

        <div className=" flex gap-x-2">
          {/* Role Filter */}
          {role !== "LeadGen-TeamLead" && (
            <Select
              onValueChange={(value) => {
                if (value === "All") {
                  setFilteredEmployee(employeeList ?? []);
                  return;
                }
                const empList = employeeList?.filter(
                  (emp) => emp.role === value
                );
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
          )}

          {/* Copy Passwords */}
          <Button
            onClick={() => {
              // Exclude SuperAdmin accounts when HR is viewing
              const copyPasswords = filteredEmployee
                ?.filter((row) => !isHRViewingSuperAdmin(role, row.role))
                .map((row) => `${row.email} : ${row.password}`);
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
            <TableHead>Status</TableHead>
            <TableHead>Passwords</TableHead>
            <TableHead>Actions </TableHead>
          </TableRow>
        </TableHeader>

        {/* Rows */}
        <TableBody>
          {filteredEmployee?.map((employee, index) => {
            const isRestricted = isHRViewingSuperAdmin(role, employee.role);
            
            return (
              <TableRow key={employee?._id}>
                <TableCell>{index + 1}</TableCell>
                <TableCell
                  className={`${employee.isActive ? "text-green-600" : "text-red-600"}`}
                >
                  {employee.name}
                </TableCell>
                <TableCell>
                  {isRestricted ? (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Lock size={16} />
                      <span>Restricted</span>
                    </div>
                  ) : (
                    <span
                      className="cursor-pointer text-sm text-gray-700 dark:text-gray-200"
                      onClick={(e) => {
                        e.stopPropagation();
                        setRevealedContactId((prev) =>
                          prev === employee._id ? null : employee._id
                        );
                      }}
                    >
                      {revealedContactId === employee._id
                        ? employee.phone
                        : maskPhone(employee.phone)}
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  {isRestricted ? (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Lock size={16} />
                      <span>Restricted</span>
                    </div>
                  ) : (
                    <span
                      className="cursor-pointer text-sm text-gray-700 dark:text-gray-200"
                      onClick={(e) => {
                        e.stopPropagation();
                        setRevealedEmailId((prev) =>
                          prev === employee._id ? null : employee._id
                        );
                      }}
                    >
                      {revealedEmailId === employee._id
                        ? employee.email
                        : maskEmail(employee.email)}
                    </span>
                  )}
                </TableCell>
                <TableCell>{employee.role}</TableCell>
                <TableCell>
                  {hasOverdueActivePIP(employee) && employee.isLocked ? (
                    <div
                      className="flex items-center gap-2 text-amber-600 cursor-help"
                      title="Clear the PIP or raise second/third PIP to unlock. For Level 3: Clear PIP or Terminate employee."
                      onClick={() => {
                        const isLevel3 = (employee.pips || []).some((p) => p.pipLevel === "level3" && p.status === "active" && new Date(p.endDate) < new Date());
                        toast({
                          variant: "destructive",
                          title: "Profile locked – PIP overdue",
                          description: isLevel3
                            ? "Clear the PIP or terminate the employee from the Actions page to unlock."
                            : "Clear the PIP or raise second/third PIP from the Actions page to unlock.",
                        });
                      }}
                    >
                      <Lock size={16} />
                      <span className="text-xs font-medium">PIP Overdue</span>
                    </div>
                  ) : (
                    <ToggleButton
                      value={employee.isLocked}
                      onChange={async (value) => {
                        // Optimistically update UI
                        setEmployeeList(employeeList?.map((emp) => emp._id === employee._id ? { ...emp, isLocked: value } : emp));
                        setFilteredEmployee(filteredEmployee?.map((emp) => emp._id === employee._id ? { ...emp, isLocked: value } : emp));
                        try {
                          const res = await updateEmployee(employee._id, { isLocked: value });
                          // If employee was locked, force logout their sessions
                          if (value === true) {
                            try {
                              await axios.post("/api/employee/forceLogout", { employeeId: employee._id });
                              toast({ title: "Employee force-logged out", description: `${employee.name} has been logged out.` });
                            } catch (err: any) {
                              console.warn("Force logout API failed:", err);
                              toast({ title: "Warning", description: "Employee locked but force-logout failed. They will be logged out on next request.", variant: "destructive" });
                            }
                          }
                          return res;
                        } catch (error) {
                          setEmployeeList(employeeList?.map((emp) => emp._id === employee._id ? { ...emp, isLocked: !value } : emp));
                          setFilteredEmployee(filteredEmployee?.map((emp) => emp._id === employee._id ? { ...emp, isLocked: !value } : emp));
                          console.error("Failed to update isLocked status", error);
                        }
                      }}
                    />
                  )}
                </TableCell>
                <TableCell className="flex h-[70px] gap-x-2 my-auto items-center">
                  {isRestricted ? (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Lock size={16} />
                      <span>Restricted</span>
                    </div>
                  ) : (
                    <>
                      <p>{employee?.password}</p>
                      <RefreshCcw
                        size={16}
                        className={`cursor-pointer ${
                          employee._id === loadingIndex ? "animate-spin" : ""
                        } `}
                        onClick={() => regeneratePassword(employee)}
                      />
                    </>
                  )}
                </TableCell>

                {/* Actions */}
                <TableCell>
                  {isRestricted ? (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Lock size={16} />
                      <span className="text-xs">Restricted</span>
                    </div>
                  ) : (
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
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
