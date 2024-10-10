"use client";
import React from "react";
import { Button } from "@/components/ui/button";
import { CiViewColumn } from "react-icons/ci";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ColumnDef,
  flexRender,
  SortingState,
  ColumnFiltersState,
  VisibilityState,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus } from "lucide-react";
import Link from "next/link";
import { UserInterface } from "@/util/type";
import Loader from "@/components/loader";
import Heading from "@/components/Heading";

interface DataTableProps {
  columns: ColumnDef<UserInterface, any>[];
  data: UserInterface[];
  setPage: React.Dispatch<React.SetStateAction<number>>;
  setSearch: React.Dispatch<React.SetStateAction<string>>;
  setQueryType: React.Dispatch<React.SetStateAction<string>>;
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
  search,
  queryType,
  currentPage,
  totalPages,
  totalUser,
  loading, // Destructure loading prop
}: DataTableProps) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});

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

  return (
    <>
      <Heading
        heading="All users"
        subheading="You will get the list of all users here"
      />
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-x-2 mb-2">
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
            />
          </div>
          <div>
            <Link
              className="flex items-center justify-center gap-x-2"
              href="/dashboard/createnewuser"
            >
              <Button className="w-full sm:flex items-center gap-x-1 hidden">
                Add user <Plus size={16} />
              </Button>
            </Link>
            <Link
              className="flex items-center justify-center gap-x-2"
              href="/dashboard/createnewuser"
            >
              <Button className="sm:hidden">
                <Plus size={18} />
              </Button>
            </Link>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <div>
              <Button
                variant="secondary"
                size="sm"
                className="ml-auto hidden sm:block"
              >
                Column
              </Button>
              <Button variant="secondary" className="ml-auto mb-2 sm:hidden">
                <CiViewColumn size={18} />
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
                  onCheckedChange={(value) => column.toggleVisibility(!!value)}
                >
                  {column.id}
                </DropdownMenuCheckboxItem>
              ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="rounded-md border">
        {loading ? (
          <div className="text-center py-4 h-screen flex  justify-center">
            <Loader />
          </div>
        ) : data.length === 0 ? (
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
              {table.getRowModel().rows.map((row) => (
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
        <div className="ml-1 text-xs">
          <p>
            Page {currentPage} out of {totalPages}
          </p>
          <p>
            Total user <span className="text-primary">{totalUser}</span>{" "}
          </p>
        </div>
        <div className="flex items-center justify-end space-x-2 py-4">
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
