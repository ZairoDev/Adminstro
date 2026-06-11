"use client";
import { useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, Copy, KeyRound, Loader2, MoreHorizontal, Trash } from "lucide-react";
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
import axios from "@/util/axios";
import { AddPropertyLink } from "./AddPropertyLink";
import { useToast } from "@/hooks/use-toast";

const renderCell = (value: any) => (value ? value : "NA");

const handleDelete = (id: string) => async () => {
  const confirmed = window.confirm("Are you sure you want to delete this user?");
  if (!confirmed) return;
  try {
    await axios.delete(`/api/user/deleteUser/${id}`);
  } catch (error) {
    console.log(error);
  }
};

function OwnerPasswordCell({
  user,
  setData,
}: {
  user: UserInterface;
  setData: React.Dispatch<React.SetStateAction<UserInterface[]>>;
}) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const displayedPassword = user.password?.trim() || "";

  const resetPassword = async () => {
    const confirmed = window.confirm(
      `Reset password for ${user.name || "this owner"}? The previous password cannot be recovered.`,
    );
    if (!confirmed) return;

    setLoading(true);
    try {
      const response = await axios.post("/api/user/resetPassword", {
        userId: user._id,
      });
      const newPassword = response.data.newPassword as string;

      setData((prev) =>
        prev.map((row) =>
          row._id === user._id ? { ...row, password: newPassword } : row,
        ),
      );

      toast({
        title: "Password reset",
        description: `New password for ${user.name || user.email}: ${newPassword}`,
      });
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } };
      toast({
        variant: "destructive",
        title: "Failed to reset password",
        description: err.response?.data?.error ?? "Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const copyPassword = async () => {
    if (!displayedPassword) return;
    try {
      await navigator.clipboard.writeText(displayedPassword);
      toast({ description: "Password copied to clipboard" });
    } catch {
      toast({
        variant: "destructive",
        title: "Could not copy password",
      });
    }
  };

  return (
    <div className="flex min-w-[10rem] flex-col gap-2">
      <div className="flex items-center gap-2">
        <code className="rounded bg-muted px-2 py-1 text-xs font-medium">
          {displayedPassword || "Reset to view"}
        </code>
        {displayedPassword ? (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-7 w-7 shrink-0"
            onClick={copyPassword}
            title="Copy password"
          >
            <Copy className="h-3.5 w-3.5" />
          </Button>
        ) : null}
      </div>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="h-8 w-fit gap-1.5"
        onClick={resetPassword}
        disabled={loading}
      >
        {loading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <KeyRound className="h-3.5 w-3.5" />
        )}
        Reset password
      </Button>
    </div>
  );
}

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
    id: "ownerPassword",
    header: "Password",
    cell: ({ row }) => {
      const user = row.original;
      if (user.role !== "Owner") return "—";
      return <OwnerPasswordCell user={user} setData={setData} />;
    },
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
            <DropdownMenuItem asChild>
              <AddPropertyLink userId={user._id} />
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
            <DropdownMenuItem>
              <button onClick={handleDelete(user._id)}>Delete User</button>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
