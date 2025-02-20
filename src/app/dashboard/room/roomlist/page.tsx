"use client";

import axios from "axios";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowUpDown, ChevronDown, MoreHorizontal } from "lucide-react";

import {
  Table,
  TableRow,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
} from "@/components/ui/table";
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
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import { RoomInterface } from "@/util/type";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/hooks/use-confirm";

const RoomList = () => {
  const columns: ColumnDef<any>[] = [
    { header: "S.No", cell: ({ row }) => <div>{row.index + 1 + (page - 1) * 10}</div> },
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => <div className="capitalize">{row.getValue("name")}</div>,
    },
    {
      accessorKey: "createdAt",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className=" text-left"
          >
            Created On
            <ArrowUpDown />
          </Button>
        );
      },
      cell: ({ row }) => {
        const createdDate: string = new Date(
          row.getValue("createdAt")
        ).toLocaleDateString("en-GB");

        return <div className="capitalize text-center">{createdDate}</div>;
      },
    },
    {
      accessorKey: "updatedAt",
      header: "Last Updated",
      cell: ({ row }) => {
        const lastUpdatedDate: string = new Date(
          row.getValue("updatedAt")
        ).toLocaleDateString("en-GB");
        return <div className="capitalize">{lastUpdatedDate}</div>;
      },
    },
    {
      accessorKey: "showcaseProperties",
      header: "Properties",
      cell: ({ row }) => {
        const showcaseProperties: [] = row.getValue("showcaseProperties");
        const propertyCount: number = showcaseProperties.length;

        return <div className=" text-center">{propertyCount}</div>;
      },
    },
    {
      accessorKey: "participants",
      header: "Created By",
      cell: ({ row }) => {
        const lead: [string] = row.getValue("participants");
        const createdBy = lead[0];

        return <div>{createdBy}</div>;
      },
    },
    {
      accessorKey: "password",
      header: () => <div className="text-right">Password</div>,
      cell: ({ row }) => {
        const password: number = row.getValue("password");

        return <div className="font-medium text-right">{password}</div>;
      },
    },
    {
      id: "actions",
      enableHiding: false,
      header: () => <div className="text-right">Actions</div>,
      cell: ({ row }) => {
        const room = row.original;

        let roomLink = `${process.env.NEXT_PUBLIC_URL}/dashboard/room/${room._id}-${room.password}`;
        const leadLink = `${process.env.NEXT_PUBLIC_URL}/dashboard/createquery/${room.lead}`;

        return (
          <div className=" text-right">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <span className="sr-only">Open menu</span>
                  <MoreHorizontal />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => navigator.clipboard.writeText(roomLink)}>
                  Copy Room Link
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <Link href={leadLink}>
                  <DropdownMenuItem>View Lead</DropdownMenuItem>
                </Link>
                <Link href={roomLink} target="_blank">
                  <DropdownMenuItem>Join Room</DropdownMenuItem>
                </Link>
                <DropdownMenuItem onClick={() => deleteRoom(room._id)}>
                  Delete Room
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    },
  ];

  const { toast } = useToast();

  const [rowSelection, setRowSelection] = useState({});
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});

  const [page, setPage] = useState(1);
  const [phone, setPhone] = useState("");
  const [allRooms, setAllRooms] = useState([]);
  const [totalRooms, setTotalRooms] = useState(0);
  const [DeleteDialog, confirmDelete] = useConfirm(
    "Delete Room",
    "Are you sure you want to delete this room?",
    "destructive"
  );

  {
    /*Fetch Rooms*/
  }
  const getAllRooms = async () => {
    try {
      const response = await axios.post("/api/room/getAllRooms", { page, phone });
      setAllRooms(response.data.rooms);
      setTotalRooms(response.data.totalRooms);
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Unable to fetch rooms",
      });
    }
  };

  {
    /*Delete Room*/
  }
  const deleteRoom = async (roomId: string) => {
    const ok = await confirmDelete();
    if (!ok) return;
    try {
      const response = await axios.delete(`/api/room/deleteRoom/?roomId=${roomId}`);

      setAllRooms((prevRooms) =>
        prevRooms.filter((room: RoomInterface) => room._id !== roomId)
      );

      toast({
        variant: "default",
        title: "Success",
        description: "Room Deleted",
      });
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Unable to delete room",
      });
    }
  };

  const table = useReactTable({
    data: allRooms,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
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

  useEffect(() => {
    const timer = setTimeout(getAllRooms, 500);

    return () => clearTimeout(timer);
  }, [page, phone]);

  return (
    <div className="w-full">
      <DeleteDialog />
      {/* Filter & columns*/}
      <div className="flex items-center py-4">
        <Input
          placeholder="Filter By Phone Number..."
          // value={(table.getColumn("name")?.getFilterValue() as string) ?? ""}
          value={phone}
          onChange={(event) =>
            // table.getColumn("name")?.setFilterValue(event.target.value)
            setPhone(event.target.value)
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

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id} className=" ">
                      <span className=" left-0 text-left ">
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                      </span>
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

      {/* Footer */}
      <div className="flex items-center justify-end space-x-2 py-4">
        <div className="flex-1 text-sm text-muted-foreground">
          {table.getFilteredSelectedRowModel().rows.length} of{" "}
          {table.getFilteredRowModel().rows.length} row(s) selected.
        </div>
        <div className="space-x-2">
          <Button
            variant="outline"
            size="sm"
            // onClick={() => table.previousPage()}
            onClick={() => setPage((prev) => prev - 1)}
            disabled={page === 1}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            // onClick={() => table.nextPage()}
            onClick={() => setPage((prev) => prev + 1)}
            disabled={totalRooms <= page * 10}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
};
export default RoomList;
