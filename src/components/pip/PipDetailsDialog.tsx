"use client";
import { Eye, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { PipRecordCard } from "@/components/pip/PipRecordCard";
import type { PIPRecord } from "@/util/type";
interface PipDetailsDialogProps {
  pips: PIPRecord[];
}
export function PipDetailsDialog({ pips }: PipDetailsDialogProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="min-h-11 border-amber-500/40 bg-amber-500/10 text-amber-800 hover:bg-amber-500/20 hover:text-amber-900 dark:text-amber-300 dark:hover:text-amber-200"
          aria-label="View active Performance Improvement Plan details"
        >
          <ShieldAlert className="mr-2 h-4 w-4" aria-hidden="true" />
          <span className="font-medium">On PIP</span>
          <span className="mx-2 h-4 w-px bg-amber-500/40" aria-hidden="true" />
          <Eye className="mr-1.5 h-4 w-4" aria-hidden="true" />
          <span className="text-xs">View details</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] max-w-3xl overflow-y-auto p-0">
        <DialogHeader className="sticky top-0 z-10 border-b bg-background/95 px-5 py-4 pr-12 text-left backdrop-blur-sm sm:px-6">
          <DialogTitle className="flex items-center gap-2">
            <ShieldAlert
              className="h-5 w-5 text-amber-700 dark:text-amber-400"
              aria-hidden="true"
            />
            Your Performance Improvement Plan
          </DialogTitle>
          <DialogDescription>
            Review the current expectations and concerns shared with you.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 p-4 sm:p-6">
          {pips.map((pip) => (
            <PipRecordCard
              key={pip._id ?? `${pip.startDate}-${pip.pipLevel}`}
              pip={pip}
              compact
            />
          ))}
          <p className="text-sm leading-6 text-muted-foreground">
            If you need clarification or support, please contact HR directly.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}