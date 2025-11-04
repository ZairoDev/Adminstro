"use client";

import type React from "react";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Check, X } from "lucide-react";

interface ShortlistCandidateDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: ShortlistData) => Promise<void>;
  loading: boolean;
}

export interface ShortlistData {
  suitableRoles: string[];
  notes: string;
}

export function ShortlistCandidateDialog({
  open,
  onClose,
  onSubmit,
  loading,
}: ShortlistCandidateDialogProps) {
  const [roles, setRoles] = useState("");
  const [notes, setNotes] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roles.trim()) {
      alert("Please specify at least one suitable role");
      return;
    }

    const suitableRoles = roles
      .split(",")
      .map((role) => role.trim())
      .filter((role) => role.length > 0);

    await onSubmit({
      suitableRoles,
      notes,
    });

    setRoles("");
    setNotes("");
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md p-6 max-h-96 overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-foreground">
            Shortlist Candidate
          </h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Suitable Roles */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Suitable Roles
            </label>
            <textarea
              placeholder="Enter roles separated by comma. e.g., Frontend Developer, UI Developer, React Developer"
              value={roles}
              onChange={(e) => setRoles(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-muted rounded bg-background text-foreground placeholder-muted-foreground focus:border-primary focus:outline-none resize-none"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Separate multiple roles with commas
            </p>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Notes (Optional)
            </label>
            <textarea
              placeholder="Add any additional notes about this candidate"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-muted rounded bg-background text-foreground placeholder-muted-foreground focus:border-primary focus:outline-none resize-none"
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
            <Button type="submit" disabled={loading} className="flex-1 gap-2">
              <Check className="w-4 h-4" />
              {loading ? "Shortlisting..." : "Shortlist"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
