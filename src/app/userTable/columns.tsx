"use client";
import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, MoreHorizontal, Trash } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";
import { UserInterface } from "@/util/type";
import axios from "axios";

const renderCell = (value: any) => (value ? value : "NA");

export const columns = (
  setData: React.Dispatch<React.SetStateAction<UserInterface[]>>
): ColumnDef<UserInterface>[] => [
  {
    accessorKey: "name",
    header: "Name",
    cell: ({ getValue }) => renderCell(getValue()),
  },
  {
    accessorKey: "phone",
    header: "Contact",
    cell: ({ getValue }) => renderCell(getValue()),
  },
  {
    accessorKey: "email",
    header: ({ column }) => (
      <Button
        variant="ghost"
        className="flex items-center gap-1"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Email <ArrowUpDown className="h-4 w-4" />
      </Button>
    ),
    cell: ({ getValue }) => renderCell(getValue()),
  },
  {
    accessorKey: "nationality",
    header: "Nationality",
    cell: ({ getValue }) => renderCell(getValue()),
  },
  {
    accessorKey: "role",
    header: "Role",
    cell: ({ getValue }) => renderCell(getValue()),
  },
  {
    accessorKey: "vsids",
    header: "New VSIDs",
    cell: ({ getValue, row }) => {
      const vsids = getValue() as { _id: string; VSID: string }[];
      if (!vsids || vsids.length === 0) return "NA";

      const handleDelete = async (id: string) => {
        const confirmed = window.confirm(
          "Are you sure you want to delete this New VSID?"
        );
        if (!confirmed) return;

        try {
          const res = await axios.delete(`/api/user/properties/${id}`);
          if (res.status === 200) {
            // Remove deleted VSID from state
            setData((prev) =>
              prev.map((user) =>
                user._id === row.original._id
                  ? {
                      ...user,
                      vsids: user?.vsids?.filter((v) => v._id !== id),
                    }
                  : user  
              )
            );
          } else {
            alert(res.data?.message || "Failed to delete");
          }
        } catch (error: any) {
          console.error("Delete error:", error);
          alert(error.response?.data?.message || error.message);
        }
      };

      return (
        <div className="flex flex-col gap-2">
          {vsids.map((v) => (
            <div
              key={v._id}
              className="flex items-center justify-between gap-2 px-2 py-1 border rounded-md hover:bg-gray-50"
            >
              <Link
                href={`https://www.vacationsaga.com/listing-stay-detail/${v._id}`}
                className="text-blue-600 underline hover:text-blue-800 transition"
                target="_blank"
              >
                {v.VSID}
              </Link>
              <Button
                size="sm"
                variant="destructive"
                className="p-1"
                onClick={() => handleDelete(v._id)}
                title="Delete VSID"
              >
                <Trash size={14} />
              </Button>
            </div>
          ))}
        </div>
      );
    },
  },
  {
    accessorKey: "vsids2",
    header: "Old VSIDs",
    cell: ({ getValue, row }) => {
      const vsids = getValue() as { _id: string; VSID: string }[];
      if (!vsids || vsids.length === 0) return "NA";

      const handleDelete = async (id: string) => {
        const confirmed = window.confirm(
          "Are you sure you want to delete this Old VSID?"
        );
        if (!confirmed) return;

        try {
          const res = await axios.delete(`/api/user/listings/${id}`);
          if (res.status === 200) {
            setData((prev) =>
              prev.map((user) =>
                user._id === row.original._id
                  ? {
                      ...user,
                      vsids2: user?.vsids2?.filter((v) => v._id !== id),
                    }
                  : user
              )
            );
          } else {
            alert(res.data?.message || "Failed to delete");
          }
        } catch (error: any) {
          console.error("Delete error:", error);
          alert(error.response?.data?.message || error.message);
        }
      };

      return (
        <div className="flex flex-col gap-2">
          {vsids.map((v) => (
            <div
              key={v._id}
              className="flex items-center justify-between gap-2 px-2 py-1 border rounded-md hover:bg-gray-50"
            >
              <Link
                href={`https://www.vacationsaga.com/listing-stay-detail?id=${v._id}`}
                className="text-blue-600 underline hover:text-blue-800 transition"
                target="_blank"
              >
                {v.VSID}
              </Link>
              <Button
                size="sm"
                variant="destructive"
                className="p-1"
                onClick={() => handleDelete(v._id)}
                title="Delete VSID"
              >
                <Trash size={14} />
              </Button>
            </div>
          ))}
        </div>
      );
    },
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => {
      const user = row.original;
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="h-8 w-8 p-0 hover:bg-gray-100"
              title="More actions"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() => navigator.clipboard.writeText(user._id)}
            >
              Copy userId
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <Link
                href={{
                  pathname: `/dashboard/add-listing/1/`,
                  query: { userId: user._id },
                }}
              >
                Add Property
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Link href={`/dashboard/edituserdetails/${user._id}`}>
                Edit Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Link href={`/dashboard/userdetails/${user._id}`}>
                User Details
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Link href="/">Ban User</Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
