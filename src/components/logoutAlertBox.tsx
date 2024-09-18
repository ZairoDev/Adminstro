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
import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import axios from "axios";
export function LogoutButton() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Function to handle logout
  const handleLogout = async () => {
    setLoading(true);
    try {
      const response = await axios.get("/api/employeelogout", {
        withCredentials: true,
      });
      console.log("try");
      console.log("response: ", response);
      setLoading(false);
      setOpen(false);
      router.push("/login");
    } catch (error) {
      console.error("Logout error:", error);
      setLoading(false);
      alert("An error occurred. Please try again.");
    }
  };

  return (
    <div>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogTrigger asChild>
          <div>
            <Button className="w-full">Logout</Button>
            <Button variant="destructive" className="sm:hidden">
              <LogOut />
            </Button>
          </div>
        </AlertDialogTrigger>

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
              <Button
                variant="ghost"
                onClick={() => setOpen(false)}
                disabled={loading}
              >
                Cancel
              </Button>
            </AlertDialogCancel>

            {/* Confirm (Logout) button */}
            <AlertDialogAction asChild>
              <Button onClick={handleLogout} disabled={loading}>
                {loading ? "Logging out..." : "Logout"}
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
