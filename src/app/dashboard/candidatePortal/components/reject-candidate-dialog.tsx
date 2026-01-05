"use client";

import type React from "react";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { X } from "lucide-react";

interface RejectCandidateDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: RejectionData) => Promise<void>;
  loading: boolean;
  title?: string;
  submitButtonText?: string;
}

export interface RejectionData {
  reason: string;
}

export function RejectCandidateDialog({
  open,
  onClose,
  onSubmit,
  loading,
  title = "Reject Candidate",
  submitButtonText = "Reject",
}: RejectCandidateDialogProps) {
  const [reason, setReason] = useState("");

  const rejectionReasons = [
    "Experience mismatch",
    "Skills not aligned",
    "Failed interview",
    "Salary expectations too high",
    "Relocation not feasible",
    "Better candidates found",
    "Position filled",
    "Other",
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      alert("Please select or specify a rejection reason");
      return;
    }

    await onSubmit({ reason });
    setReason("");
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md p-6 max-h-96 overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-foreground">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Rejection Reason */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-3">
              Rejection Reason
            </label>

            {/* Quick selection buttons */}
            <div className="grid grid-cols-2 gap-2 mb-3">
              {rejectionReasons.slice(0, 6).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setReason(r)}
                  className={`py-2 px-2 text-xs rounded border transition ${
                    reason === r
                      ? "border-red-500 bg-red-50 text-red-700"
                      : "border-muted text-muted-foreground hover:border-red-300"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>

            {/* Text input for custom reason */}
            <textarea
              placeholder="Or enter a custom reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-muted rounded bg-background text-foreground placeholder-muted-foreground focus:border-red-300 focus:outline-none resize-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1 bg-transparent"
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="destructive"
              disabled={loading}
              className="flex-1 gap-2"
            >
              <X className="w-4 h-4" />
              {loading ? `${submitButtonText}ing...` : submitButtonText}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
