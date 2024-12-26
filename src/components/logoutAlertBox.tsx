"use client";

import axios from "axios";
import { useRef, useState } from "react";
import { CircleHelp } from "lucide-react";
import { useRouter } from "next/navigation";

import { useAuthStore } from "@/AuthStore";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "./ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { Button } from "./ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";

export function LogoutButton() {
  const { clearToken } = useAuthStore();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const router = useRouter();

  const handleLogout = async () => {
    try {
      setLoading(true);
      const response = await axios.get("/api/employeelogout", {
        withCredentials: true,
      });
      clearToken();
      setOpen(false);
      setDropdownOpen(false);
      router.push("/login");
    } catch (error) {
      console.error("Logout error:", error);
      alert("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setOpen(false);
    setDropdownOpen(false);
  };

  return (
    <div className="relative">
      <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
        <DropdownMenuTrigger asChild>
          <Avatar className="cursor-pointer">
            <AvatarImage src="https://github.com/shadcn.png" />
            <AvatarFallback>A</AvatarFallback>
          </Avatar>
        </DropdownMenuTrigger>

        <DropdownMenuContent>
          <DropdownMenuLabel>User Menu</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="cursor-pointer"
            onSelect={() => {
              setOpen(true);
              setDropdownOpen(false);
            }}
          >
            Sign out
          </DropdownMenuItem>
          <DropdownMenuItem className="cursor-pointer">
            Profile
          </DropdownMenuItem>
          <DropdownMenuItem className="cursor-pointer">
            Billing
          </DropdownMenuItem>
          <DropdownMenuItem className="cursor-pointer">Team</DropdownMenuItem>
          <DropdownMenuItem className="cursor-pointer">
            Subscription
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent className="z-[1050]">
          <AlertDialogHeader>
            <div className="flex items-center sm:items-start justify-center sm:justify-start">
              <div className="h-14 relative w-14 rounded-lg bg-primary/50 flex items-center justify-center">
                <CircleHelp className="text-foreground h-8 w-8" />
              </div>
            </div>

            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to logout? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel asChild>
              <Button variant="ghost" onClick={handleCancel} disabled={loading}>
                Cancel
              </Button>
            </AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button
                variant="destructive"
                onClick={handleLogout}
                disabled={loading}
              >
                {loading ? "Logging out..." : "Logout"}
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
