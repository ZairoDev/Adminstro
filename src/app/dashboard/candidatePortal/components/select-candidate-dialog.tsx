"use client";

import type React from "react";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Check, X } from "lucide-react";

interface SelectCandidateDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: SelectionData) => Promise<void>;
  loading: boolean;
  candidatePosition?: string; // Candidate's position to prefill role
  candidateEmploymentType?: "fulltime" | "intern" | null;
}

export interface SelectionData {
  positionType: "fulltime" | "intern";
  dateOfJoining: string;
  role: string;
  annualCtc: number;
  workingHours: string;
}

const DEFAULT_WORKING_HOURS = "11:00 AM to 8:00 PM";

export function SelectCandidateDialog({
  open,
  onClose,
  onSubmit,
  loading,
  candidatePosition,
  candidateEmploymentType,
}: SelectCandidateDialogProps) {
  const [positionType, setPositionType] = useState<"fulltime" | "intern">(
    candidateEmploymentType === "intern" || candidateEmploymentType === "fulltime"
      ? candidateEmploymentType
      : "fulltime"
  );
  const [dateOfJoining, setDateOfJoining] = useState("");
  const [role, setRole] = useState("");
  const [annualCtc, setAnnualCtc] = useState("");
  const [workingHours, setWorkingHours] = useState(DEFAULT_WORKING_HOURS);

  useEffect(() => {
    if (open) {
      setRole(candidatePosition?.trim() || "");
    }
  }, [candidatePosition, open]);

  useEffect(() => {
    if (open && (candidateEmploymentType === "intern" || candidateEmploymentType === "fulltime")) {
      setPositionType(candidateEmploymentType);
    }
  }, [candidateEmploymentType, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!dateOfJoining.trim() || !role.trim() || !workingHours.trim()) {
      alert("Please fill in designation, date of joining, and working hours");
      return;
    }

    const parsedCtc = annualCtc === "" ? NaN : Number(annualCtc);
    if (Number.isNaN(parsedCtc) || parsedCtc < 0) {
      alert("Please enter a valid annual CTC");
      return;
    }

    await onSubmit({
      positionType,
      dateOfJoining,
      role,
      annualCtc: parsedCtc,
      workingHours: workingHours.trim(),
    });

    setPositionType("fulltime");
    setDateOfJoining("");
    setRole("");
    setAnnualCtc("");
    setWorkingHours(DEFAULT_WORKING_HOURS);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl p-6">
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Designation
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                disabled
                className="w-full px-3 py-2 border border-muted rounded bg-muted text-foreground cursor-not-allowed opacity-60"
              >
                <option value="">No job title</option>
                {role ? <option value={role}>{role}</option> : null}
              </select>
              <p className="text-xs text-muted-foreground mt-1">
                This is the job title from the application.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Date of joining
              </label>
              <input
                type="date"
                value={dateOfJoining}
                onChange={(e) => setDateOfJoining(e.target.value)}
                className="w-full px-3 py-2 border border-muted rounded bg-background text-foreground focus:border-primary focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Working hours
              </label>
              <input
                type="text"
                placeholder="11:00 AM to 8:00 PM"
                value={workingHours}
                onChange={(e) => setWorkingHours(e.target.value)}
                className="w-full px-3 py-2 border border-muted rounded bg-background text-foreground placeholder-muted-foreground focus:border-primary focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Annual CTC
              </label>
              <input
                type="number"
                min="0"
                step="1"
                placeholder="156000"
                value={annualCtc}
                onChange={(e) => setAnnualCtc(e.target.value)}
                className="w-full px-3 py-2 border border-muted rounded bg-background text-foreground placeholder-muted-foreground focus:border-primary focus:outline-none"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Yearly cost to the company, in rupees.
              </p>
            </div>
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
