"use client";
import { LockKeyhole, LogOut } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
interface PipIssueConfirmationDialogProps {
  open: boolean;
  employeeName: string;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}
export function PipIssueConfirmationDialog({
  open,
  employeeName,
  onOpenChange,
  onConfirm,
}: PipIssueConfirmationDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-full bg-amber-500/10">
            <LockKeyhole
              className="h-5 w-5 text-amber-700 dark:text-amber-400"
              aria-hidden="true"
            />
          </div>
          <AlertDialogTitle>Issue this PIP and lock the profile?</AlertDialogTitle>
          <AlertDialogDescription className="space-y-3 text-left leading-6">
            <span className="block">
              Issuing this plan will immediately lock {employeeName || "the employee"}
              &apos;s profile.
            </span>
            <span className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-foreground">
              <LogOut
                className="mt-0.5 h-4 w-4 shrink-0 text-amber-700 dark:text-amber-400"
                aria-hidden="true"
              />
              Any active dashboard session will end. HR must manually unlock the
              profile before the employee can sign in and acknowledge the PIP.
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Go back</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-amber-700 text-white hover:bg-amber-800"
          >
            Issue PIP and lock profile
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}