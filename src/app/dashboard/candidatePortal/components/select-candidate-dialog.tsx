"use client";

import type React from "react";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Check, X } from "lucide-react";

interface SelectCandidateDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: SelectionData) => Promise<void>;
  loading: boolean;
}

export interface SelectionData {
  positionType: "fulltime" | "intern";
  trainingDate: string;
  trainingPeriod: string;
  role: string;
}

export function SelectCandidateDialog({
  open,
  onClose,
  onSubmit,
  loading,
}: SelectCandidateDialogProps) {
  const [positionType, setPositionType] = useState<"fulltime" | "intern">(
    "fulltime"
  );
  const [trainingDate, setTrainingDate] = useState("");
  const [trainingPeriod, setTrainingPeriod] = useState("");
  const [role, setRole] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!trainingDate.trim() || !trainingPeriod.trim() || !role.trim()) {
      alert("Please fill in all fields");
      return;
    }

    await onSubmit({
      positionType,
      trainingDate,
      trainingPeriod,
      role,
    });

    // Reset form
    setPositionType("fulltime");
    setTrainingDate("");
    setTrainingPeriod("");
    setRole("");
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md p-6 max-h-96 overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-foreground">
            Select Candidate
          </h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Position Type Selection */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Position Type
            </label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setPositionType("fulltime")}
                className={`flex-1 py-2 px-3 rounded border transition ${
                  positionType === "fulltime"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-muted text-muted-foreground hover:border-primary"
                }`}
              >
                Full Time
              </button>
              <button
                type="button"
                onClick={() => setPositionType("intern")}
                className={`flex-1 py-2 px-3 rounded border transition ${
                  positionType === "intern"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-muted text-muted-foreground hover:border-primary"
                }`}
              >
                Intern
              </button>
            </div>
          </div>

          {/* Training Date */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Training Start Date
            </label>
            <input
              type="date"
              value={trainingDate}
              onChange={(e) => setTrainingDate(e.target.value)}
              className="w-full px-3 py-2 border border-muted rounded bg-background text-foreground focus:border-primary focus:outline-none"
            />
          </div>

          {/* Training Period */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Training Period
            </label>
            <input
              type="text"
              placeholder="e.g., 2 weeks, 1 month"
              value={trainingPeriod}
              onChange={(e) => setTrainingPeriod(e.target.value)}
              className="w-full px-3 py-2 border border-muted rounded bg-background text-foreground placeholder-muted-foreground focus:border-primary focus:outline-none"
            />
          </div>

          {/* Role Dropdown */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Role/Designation
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full px-3 py-2 border border-muted rounded bg-background text-foreground focus:border-primary focus:outline-none"
            >
              <option value="">Select a Role</option>
              <option value="LeadGen">LeadGen</option>
              <option value="Marketing">Marketing</option>
              <option value="Developer">Developer</option>
              <option value="Sales">Sales</option>
            </select>
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
              {loading ? "Selecting..." : "Select"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
