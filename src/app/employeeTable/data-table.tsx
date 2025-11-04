"use client";

import axios from "axios";
import Link from "next/link";
import { Plus } from "lucide-react";
import { CiViewColumn } from "react-icons/ci";
import React, { useEffect, useRef, useState } from "react";

import {
  Select,
  SelectItem,
  SelectValue,
  SelectTrigger,
  SelectContent,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogTitle,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogDescription,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import {
  ColumnDef,
  flexRender,
  SortingState,
  useReactTable,
  VisibilityState,
  getCoreRowModel,
  getSortedRowModel,
  ColumnFiltersState,
  getFilteredRowModel,
  getPaginationRowModel,
} from "@tanstack/react-table";
import {
  Table,
  TableRow,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
} from "@/components/ui/table";
import Loader from "@/components/loader";
import { toast } from "@/hooks/use-toast";
import Heading from "@/components/Heading";
import { UserInterface } from "@/util/type";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { employeeRoles } from "@/models/employee";

interface DataTableProps {
  columns: ColumnDef<UserInterface, any>[];
  data: UserInterface[];
  setPage: React.Dispatch<React.SetStateAction<number>>;
  setSearch: React.Dispatch<React.SetStateAction<string>>;
  setQueryType: React.Dispatch<React.SetStateAction<string>>;
  setRole: React.Dispatch<
    React.SetStateAction<(typeof employeeRoles)[number] | "">
  >;
  search: string;
  queryType: string;
  currentPage: number;
  totalPages: number;
  totalUser: number;
  loading: boolean;
}

export function DataTable({
  columns,
  data,
  setPage,
  setSearch,
  setQueryType,
  setRole,
  search,
  queryType,
  currentPage,
  totalPages,
  loading,
}: DataTableProps) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  );
  const [selectedRole, setSelectedRole] = useState("");
  const [isPasswordGenerating, setIsPasswordGenerating] = React.useState(false);
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const router = useRouter();

  // Serial number column definition
  const serialNumberColumn: ColumnDef<UserInterface, any> = {
    header: "S.No.",
    cell: ({ row }) => {
      const serialNumber =
        (currentPage - 1) * table.getState().pagination.pageSize +
        row.index +
        1;
      return serialNumber;
    },
  };

  const table = useReactTable({
    data,
    columns: [serialNumberColumn, ...columns],
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
  });

  const searchInputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.key === "j") {
        event.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const ResetAllPasswords = async () => {
    try {
      setIsPasswordGenerating(true);
      const response = await axios.get("/api/resetAllPasswords");
      if (response.status === 200) {
        toast({
          variant: "default",
          title: "Passwords Changed !",
          description: "Please refresh the window to get the new passwords.",
        });
      } else {
        throw new Error("Error in resetting password");
      }
    } catch (err: any) {
      toast({
        variant: "destructive",
        description: "Error in resetting password toast",
      });
    } finally {
      setIsPasswordGenerating(false);
    }
  };

  return (
    <>
      <Heading
        heading="All Employees"
        subheading="You will get the list of all employees here"
      />
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-x-2 pb-2">
          <div>
            <Select
              value={queryType}
              onValueChange={(value) => setQueryType(value)}
            >
              <SelectTrigger>
                <span>{queryType}</span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="phone">Phone</SelectItem>
                <SelectItem value="name">Name</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex w-full items-center ">
            <Input
              placeholder="Search..."
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
              }}
              className="max-w-xl"
              ref={searchInputRef}
            />
          </div>
          <div>
            <Link
              className="flex items-center justify-center gap-x-2"
              href="/dashboard/createnewEmployee"
            >
              <Button className="w-full sm:flex items-center gap-x-1 hidden">
                Add Employee
                <Plus size={18} />
              </Button>
            </Link>
            <Link
              className="flex items-center justify-center gap-x-2"
              href="/dashboard/createnewEmployee"
            >
              <Button className="sm:hidden">
                <Plus size={18} />
              </Button>
            </Link>
          </div>
        </div>
        <div className="flex gap-x-2 items-center mb-2">
          <Select
            onValueChange={(value) => {
              setRole(value as (typeof employeeRoles)[number]);
              setSelectedRole(value);
            }}
          >
            <SelectTrigger className="w-[100px]">
              <SelectValue placeholder="Role" />
            </SelectTrigger>
            <SelectContent>
              {employeeRoles.map((role, index) => (
                <SelectItem key={index} value={role}>
                  {role}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <div>
                <Button
                  variant="secondary"
                  size="sm"
                  className="ml-auto mb-2 hidden sm:block"
                >
                  Column
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  className="ml-auto mb-2 sm:hidden"
                >
                  <CiViewColumn />
                </Button>
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {table
                .getAllColumns()
                .filter((column) => column.getCanHide())
                .map((column) => (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    className="capitalize"
                    checked={column.getIsVisible()}
                    onCheckedChange={(value) =>
                      column.toggleVisibility(!!value)
                    }
                  >
                    {column.id}
                  </DropdownMenuCheckboxItem>
                ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <div>
            <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <AlertDialogTrigger asChild>
                <Button className="hidden md:block mb-2">
                  {isPasswordGenerating
                    ? "Generating ..."
                    : "Generate Passwords"}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    Confirm Password Generation
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to generate new passwords for all
                    users? This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => {
                      ResetAllPasswords();
                      setIsDialogOpen(false);
                    }}
                  >
                    Yes, Generate
                  </Button>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </div>

      <div className="rounded-md border">
        {loading ? (
          <div className="text-center py-4 h-screen flex justify-center">
            <Loader />
          </div>
        ) : data?.length === 0 ? (
          <div className="text-center py-4 h-screen flex items-center justify-center">
            No results.
          </div>
        ) : (
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table?.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
      <div className="flex items-center justify-between">
        <div className="ml-1">
          <p>
            Page {currentPage} out of {totalPages}
          </p>
        </div>
        <div className="flex items-center justify-end space-x-2 py-4">
          <Button
            onClick={() => {
              const specificRows = data?.filter(
                (row) => row.role === selectedRole
              );
              const copyPasswords = specificRows.map(
                (row) => `${row.email} : ${row.password}`
              );
              navigator.clipboard.writeText(
                JSON.stringify(copyPasswords, null, 2)
              );
            }}
          >
            Copy Passwords
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((prev) => prev + 1)}
            disabled={!table.getCanNextPage()}
          >
            Next
          </Button>
        </div>
      </div>
    </>
  );
}
