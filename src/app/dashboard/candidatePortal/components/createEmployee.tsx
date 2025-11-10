"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import NewUser, { CandidateLite } from "./new-user";

interface CreateEmployeeDialogProps {
  open: boolean;
  onClose: () => void;
  candidate: CandidateLite | null;
  onCreated?: (payload: { employeeId?: string; employee?: any }) => void;
}

export function CreateEmployeeDialog({
  open,
  onClose,
  candidate,
  onCreated,
}: CreateEmployeeDialogProps) {
  const handleCreated = (payload: { employeeId?: string; employee?: any }) => {
    onCreated?.(payload);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0">
        <ScrollArea className="h-[90vh]">
          <div className="p-6">
            <DialogHeader className="mb-6">
              <DialogTitle>Create Employee from Candidate</DialogTitle>
              <DialogDescription>
                Fill in the form below to create a new employee. The form is
                pre-filled with candidate information.
              </DialogDescription>
            </DialogHeader>
            {/* <CHANGE> Render NewUser component with candidate data prefilled */}
            <div className="py-4">
              <NewUser candidate={candidate} onCreated={handleCreated} />
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
