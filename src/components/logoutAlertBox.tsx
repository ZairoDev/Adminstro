"use client";

import axios from "@/util/axios";
import { useEffect, useRef, useState } from "react";
import { CircleHelp, ImagePlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { useAuthStore } from "@/AuthStore";
import { clearMonthlyTargetGateSkip } from "@/lib/monthly-target-gate-skip";
import { clearVisitStatusGateSkip } from "@/lib/visits/visit-status-gate-skip";
import { allowIntentionalUnload } from "@/components/SessionHeartbeat";
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
  const { clearToken, token } = useAuthStore();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [photoUrl, setPhotoUrl] = useState("");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const initials = token?.name?.trim()?.charAt(0)?.toUpperCase() || "U";

  useEffect(() => {
    if (!token?.id) {
      setPhotoUrl("");
      return;
    }
    let cancelled = false;
    axios
      .get<{ photoUrl?: string }>("/api/user/profile-picture")
      .then((response) => {
        if (!cancelled) setPhotoUrl(response.data.photoUrl?.trim() ?? "");
      })
      .catch(() => {
        if (!cancelled) setPhotoUrl("");
      });
    return () => {
      cancelled = true;
    };
  }, [token?.id]);

  const handlePhotoChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);
    setUploadingPhoto(true);
    try {
      const response = await axios.post<{ photoUrl?: string }>(
        "/api/user/profile-picture",
        formData,
      );
      setPhotoUrl(response.data.photoUrl?.trim() ?? "");
      toast.success("Profile picture updated");
    } catch (error: unknown) {
      const message =
        axios.isAxiosError(error) && typeof error.response?.data?.error === "string"
          ? error.response.data.error
          : "Could not update the profile picture";
      toast.error(message);
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleLogout = async () => {
    try {
      setLoading(true);
      // Deliberate logout — don't nag with the "still logged in" warning.
      allowIntentionalUnload();
      const isCollaborator = token?.role === "HCollaborator";
      await axios.post(
        isCollaborator ? "/api/housingsaga/logout" : "/api/employeelogout",
        {},
        { withCredentials: true },
      ).catch(async () => {
        if (!isCollaborator) {
          await axios.get("/api/employeelogout", { withCredentials: true });
        }
      });
      if (token?.id) {
        clearMonthlyTargetGateSkip(String(token.id));
        clearVisitStatusGateSkip(String(token.id));
      }
      clearToken();
      setOpen(false);
      setDropdownOpen(false);
      router.push(isCollaborator ? "/housingsaga/login" : "/login");
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
      <input
        ref={photoInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        onChange={(event) => {
          void handlePhotoChange(event);
        }}
      />
      <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
        <DropdownMenuTrigger asChild>
          <Avatar className="cursor-pointer">
            <AvatarImage src={photoUrl || undefined} alt={token?.name || "Profile"} />
            <AvatarFallback>{uploadingPhoto ? "…" : initials}</AvatarFallback>
          </Avatar>
        </DropdownMenuTrigger>

        <DropdownMenuContent>
          <DropdownMenuLabel>{token?.name || "User menu"}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="cursor-pointer"
            disabled={uploadingPhoto}
            onSelect={() => {
              setDropdownOpen(false);
              window.setTimeout(() => photoInputRef.current?.click(), 0);
            }}
          >
            <ImagePlus className="mr-2 h-4 w-4" />
            {uploadingPhoto ? "Uploading photo..." : "Update profile picture"}
          </DropdownMenuItem>
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
