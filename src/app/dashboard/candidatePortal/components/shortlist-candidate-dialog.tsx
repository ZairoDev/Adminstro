"use client";

import type React from "react";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Check, X, AlertTriangle } from "lucide-react";

interface ShortlistCandidateDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: ShortlistData) => Promise<void>;
  loading: boolean;
  candidatePosition?: string; // Candidate's position to prefill roles
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
  candidatePosition,
}: ShortlistCandidateDialogProps) {
  const availableRoles = ["LeadGen", "Marketing", "HR", "Developer", "Sales"];
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [notes, setNotes] = useState("");

  // Prefill roles with candidate position when dialog opens
  useEffect(() => {
    if (candidatePosition && open) {
      // Map candidate position to available roles
      const positionMap: Record<string, string> = {
        "HR": "HR",
        "Sales": "Sales",
        "LeadGen": "LeadGen",
        "Marketing": "Marketing",
        "Developer": "Developer",
      };
      
      // Try exact match first, then try case-insensitive match
      const matchedRole = positionMap[candidatePosition] || 
                         Object.keys(positionMap).find(key => 
                           key.toLowerCase() === candidatePosition.toLowerCase()
                         );
      
      if (matchedRole && availableRoles.includes(matchedRole)) {
        setSelectedRoles([matchedRole]);
      } else if (candidatePosition && !availableRoles.includes(candidatePosition)) {
        // If candidate position doesn't match, add it to selected roles anyway
        setSelectedRoles([candidatePosition]);
      }
    } else if (open && !candidatePosition) {
      // Reset if no candidate position
      setSelectedRoles([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candidatePosition, open]);

  const toggleRole = (role: string) => {
    setSelectedRoles((prev) =>
      prev.includes(role)
        ? prev.filter((r) => r !== role)
        : [...prev, role]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedRoles.length === 0) {
      alert("Please select at least one suitable role");
      return;
    }

    await onSubmit({
      suitableRoles: selectedRoles,
      notes,
    });

    setSelectedRoles([]);
    setNotes("");
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl p-6">
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
          {/* Safety Check Warning */}
          {candidatePosition && selectedRoles.length > 0 && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-500 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-yellow-800 dark:text-yellow-200 mb-1">
                    Role Mismatch Warning
                  </h4>
                  <div className="text-sm text-yellow-700 dark:text-yellow-300 space-y-1">
                    <p>
                      <span className="font-medium">Candidate&apos;s Current Role:</span>{" "}
                      <span className="font-semibold">{candidatePosition}</span>
                    </p>
                    <p>
                      <span className="font-medium">Selected Roles for Shortlisting:</span>{" "}
                      <span className="font-semibold">{selectedRoles.join(", ")}</span>
                    </p>
                    {!selectedRoles.includes(candidatePosition) && (
                      <p className="mt-2 font-medium">
                        ⚠️ The candidate&apos;s current role ({candidatePosition}) is not included in the selected roles. Please verify this is intentional.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Suitable Roles */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Suitable Roles
            </label>
            <div className="space-y-2 border border-muted rounded p-3 bg-background">
              {availableRoles.map((role) => (
                <label
                  key={role}
                  className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 p-2 rounded transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={selectedRoles.includes(role)}
                    onChange={() => toggleRole(role)}
                    className="w-4 h-4 rounded border-muted text-primary focus:ring-primary focus:ring-offset-0 cursor-pointer"
                  />
                  <span className="text-sm text-foreground">{role}</span>
                </label>
              ))}
              {/* Show candidate position if it doesn't match available roles */}
              {candidatePosition && 
               !availableRoles.includes(candidatePosition) && 
               candidatePosition && (
                <label className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 p-2 rounded transition-colors">
                  <input
                    type="checkbox"
                    checked={selectedRoles.includes(candidatePosition)}
                    onChange={() => toggleRole(candidatePosition)}
                    className="w-4 h-4 rounded border-muted text-primary focus:ring-primary focus:ring-offset-0 cursor-pointer"
                  />
                  <span className="text-sm text-foreground">
                    {candidatePosition} <span className="text-xs text-muted-foreground">(from candidate)</span>
                  </span>
                </label>
              )}
            </div>
            {candidatePosition && selectedRoles.includes(candidatePosition) && (
              <p className="text-xs text-muted-foreground mt-1">
                Candidate&apos;s position ({candidatePosition}) is pre-selected
              </p>
            )}
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
