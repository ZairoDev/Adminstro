"use client";
import { useState } from "react";
import { Button } from "./ui/button";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
  AlertDialogTrigger,
} from "./ui/alert-dialog";
import { Delete, LogOut } from "lucide-react";

export function LogoutButton() {
  const [open, setOpen] = useState(false);

  return (
    <div>
      {/* Button to trigger the alert dialog */}
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogTrigger asChild>
          <div>
            <Button variant="destructive" className="sm:block hidden">
              Logout
            </Button>
            <Button variant="destructive" className="sm:hidden">
              <LogOut />
            </Button>
          </div>
        </AlertDialogTrigger>

        {/* Alert dialog content */}
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to logout? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            {/* Cancel button */}
            <AlertDialogCancel asChild>
              <Button variant="ghost" onClick={() => setOpen(false)}>
                Cancel
              </Button>
            </AlertDialogCancel>

            {/* Confirm (Logout) button */}
            <AlertDialogAction asChild>
              <Button onClick={() => setOpen(false)}>Logout</Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
