"use client";

import * as React from "react";
import { format } from "date-fns";

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
  Dialog,
  DialogTitle,
  DialogFooter,
  DialogHeader,
  DialogTrigger,
  DialogContent,
  DialogDescription,
} from "@/components/ui/dialog";
import { useRouter } from "next/navigation";
import { ChevronDown, MoreHorizontal, Phone } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableRow,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
} from "@/components/ui/table";
import { OwnerInterface } from "@/util/type";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useCopyToClipboard } from "@/hooks/component-hooks/useCopyToClipboard";

import { addCallback, addDisposition, addEmail, addNote } from "../ownerActions";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import Link from "next/link";

export const columns: ColumnDef<OwnerInterface>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "propertyName",
    header: "Property Name",
    cell: ({ row }) => <div className=" ">{row.getValue("propertyName")}</div>,
  },
  {
    accessorKey: "phoneNumber",
    header: () => <div className=" flex justify-center">Phone Number</div>,
    cell: ({ row }) => {
      const { copy, isCopied } = useCopyToClipboard();
      return (
        <div className=" flex justify-center relative">
          <Phone
            className=" cursor-pointer"
            onClick={() => copy(row.getValue("phoneNumber") as string)}
          />
          {isCopied && <span className=" absolute bottom-6 bg-black/30">Copied!</span>}
        </div>
      );
    },
  },
  {
    accessorKey: "country",
    header: () => <div className=" flex justify-center">Location</div>,
    cell: ({ row }) => {
      const { area, city, state, country } = row.original;
      return (
        <div className=" flex justify-center">
          {area}, {city}, {state}, {country}
        </div>
      );
    },
  },
  {
    id: "actions",
    header: () => <div>Actions</div>,
    enableHiding: false,
    cell: ({ row }) => {
      // const payment = row.original;
      const [isDropdownOpen, setIsDropdownOpen] = React.useState(false);
      const [isNoteDialogOpen, setIsNoteDialogOpen] = React.useState(false);
      const [isContractDialogOpen, setIsContractDialogOpen] = React.useState(false);
      const [isCallbackDialogOpen, setIsCallbackDialogOpen] = React.useState(false);
      const noteRef = React.useRef<HTMLTextAreaElement>(null);
      const [isPending, startTransition] = React.useTransition();
      const [callBackDate, setCallBackDate] = React.useState<Date | undefined>(undefined);
      const [callBackTime, setCallBackTime] = React.useState<string | null>(null);

      const owner = row.original;

      const handleDisposition = (ownerId: string, disposition: string) => {
        startTransition(() => {
          addDisposition(ownerId, disposition);
        });
      };
      const handleEmail = (ownerId: string, email: string) => {
        startTransition(() => {
          addEmail(ownerId, email);
        });
      };

      const handleNote = (ownerId: string, note: string) => {
        if (!note.trim()) return;
        startTransition(() => {
          addNote(ownerId, note.trim());
        });
      };

      const handleCallback = (ownerId: string) => {
        const callback = `${format(callBackDate!, "yyyy-MM-dd")} ${callBackTime}`;
        startTransition(() => {
          addCallback(ownerId, callback);
        });
      };

      return (
        <>
          {/* Note Dialog */}
          <Dialog open={isNoteDialogOpen} onOpenChange={setIsNoteDialogOpen}>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Add Note</DialogTitle>
                <DialogDescription>Add a note to the owner.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <Textarea ref={noteRef} placeholder="Enter the note" />
              </div>
              <DialogFooter>
                <Button
                  type="submit"
                  disabled={isPending}
                  onClick={() => handleNote(owner._id!, noteRef.current?.value!)}
                >
                  {isPending ? "Saving..." : "Save changes"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Contract Dialog */}
          <Dialog open={isContractDialogOpen} onOpenChange={setIsNoteDialogOpen}>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Send Contract</DialogTitle>
                <DialogDescription>
                  Send a contract to the owner via email.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="name" className="text-right">
                    Name
                  </Label>
                  <Input id="name" value="Pedro Duarte" className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="username" className="text-right">
                    Username
                  </Label>
                  <Input id="username" value="@peduarte" className="col-span-3" />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit">Save changes</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Callback Dialog */}
          <Dialog open={isCallbackDialogOpen} onOpenChange={setIsCallbackDialogOpen}>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Add Callback Date & Time</DialogTitle>
                <DialogDescription>Add a time to contact the owner</DialogDescription>
              </DialogHeader>
              <div className=" mx-auto">
                <h4 className=" font-semibold">Callback Date</h4>
                <Calendar
                  mode="single"
                  selected={callBackDate}
                  onSelect={setCallBackDate}
                  className="rounded-md border shadow"
                />
                <h4 className=" mt-4 font-semibold">Callback Time</h4>
                <Input type="time" onChange={(e) => setCallBackTime(e.target.value)} />
              </div>
              <DialogFooter>
                <Button
                  type="submit"
                  disabled={isPending}
                  onClick={() => handleCallback(owner._id!)}
                >
                  {isPending ? "Saving..." : "Save changes"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Action Dropdown */}
          <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="h-8 w-8 p-0"
                onClick={() => setIsDropdownOpen(true)}
              >
                <span className="sr-only">Open menu</span>
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem>
                <Link href={`/dashboard/owners/owner-list/${owner._id}`} target="_blank">
                  Edit Details
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setIsContractDialogOpen(true)}>
                Send Contract
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => handleDisposition(owner._id!, "Not Interested")}
              >
                Not Interested
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleDisposition(owner._id!, "Not Connected")}
              >
                Not Connected
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setIsDropdownOpen(false);
                  setIsCallbackDialogOpen(true);
                }}
              >
                Callback
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setIsDropdownOpen(false);
                  setIsNoteDialogOpen(true);
                }}
              >
                Note
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </>
      );
    },
  },
];

export function OwnerTable({
  owners,
  page,
  totalPages,
}: {
  owners: OwnerInterface[];
  page: number;
  totalPages: number;
}) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});

  const router = useRouter();

  const goToPage = (page: number) => {
    router.push(`?page=${page}`);
  };

  const table = useReactTable({
    data: owners,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    rowCount: 20,
    getSortedRowModel: getSortedRowModel(),
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
    <div className="w-full">
      <div className="flex items-center py-4">
        <Input
          placeholder="Filter emails..."
          value={(table.getColumn("phoneNumber")?.getFilterValue() as string) ?? ""}
          onChange={(event) =>
            table.getColumn("phoneNumber")?.setFilterValue(event.target.value)
          }
          className="max-w-sm"
        />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="ml-auto">
              Columns <ChevronDown />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {table
              .getAllColumns()
              .filter((column) => column.getCanHide())
              .map((column) => {
                return (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    className="capitalize"
                    checked={column.getIsVisible()}
                    onCheckedChange={(value) => column.toggleVisibility(!!value)}
                  >
                    {column.id}
                  </DropdownMenuCheckboxItem>
                );
              })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-end space-x-2 py-4">
        <div className="flex-1 text-sm text-muted-foreground">
          {table.getFilteredSelectedRowModel().rows.length} of{" "}
          {table.getFilteredRowModel().rows.length} row(s) selected.
        </div>
        <div className="space-x-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 1}
            onClick={() => goToPage(page - 1)}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => goToPage(page + 1)}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
