"use client";
import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, MoreHorizontal, RefreshCcw } from "lucide-react";
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
import { toast } from "@/hooks/use-toast";
import axios from "axios";
import { useState } from "react";

const renderCell = (value: any) => {
  return value ? value : "NA";
};

export const columns: ColumnDef<UserInterface>[] = [
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
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Email
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ getValue }) => renderCell(getValue()),
  },
  {
    accessorKey: "role",
    header: "Role",
    cell: ({ getValue }) => renderCell(getValue()),
  },
  {
    accessorKey: "password",
    header: "Passwords",
    cell: ({ row }) => {
      // const password = renderCell(getValue());
      const user = row.original;

      const passwordGeneration = async () => {
        try {
          const response = await axios.post("/api/generateNewpassword", {
            employeeId: user._id,
          });
          user.password = response.data.newPassword;
          // setNewPassword(resposne.data.newPassword);
        } catch (error: any) {
          console.log(error, "Password error will be render here");
          return error;
        }
      };
      return (
        <div className=" flex items-center gap-x-2 justify-center">
          <p>{user.password}</p>
          <RefreshCcw
            size={16}
            className={`cursor-pointer`}
            onClick={passwordGeneration}
          />
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
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel className="">Options</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => {
                const textToCopy = `${user.email} ${user.password}`;
                navigator.clipboard
                  .writeText(textToCopy)
                  .then(() => {
                    toast({
                      description: "Credentials copied to clipboard",
                    });
                  })
                  .catch((err) => {
                    console.error("Error copying text: ", err);
                  });
              }}
            >
              Copy Credentials
            </DropdownMenuItem>
            {/* <DropdownMenuSeparator /> */}
            <DropdownMenuItem>
              <Link href={`/dashboard/editemployeedetails/${user._id}`}>
                Edit Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Link href={`/dashboard/employeedetails/${user._id}`}>
                Actions
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
