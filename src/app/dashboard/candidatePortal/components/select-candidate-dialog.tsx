"use client";

import type React from "react";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Check, X, AlertTriangle } from "lucide-react";

interface SelectCandidateDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: SelectionData) => Promise<void>;
  loading: boolean;
  candidatePosition?: string; // Candidate's position to prefill role
}

export interface SelectionData {
  positionType: "fulltime" | "intern";
  trainingDate: string;
  trainingPeriod: string;
  role: string;
  salary?: number;
  duration?: string; // Training duration (e.g., "12:00 pm to 4:00 pm")
}

export function SelectCandidateDialog({
  open,
  onClose,
  onSubmit,
  loading,
  candidatePosition,
}: SelectCandidateDialogProps) {
  const [positionType, setPositionType] = useState<"fulltime" | "intern">(
    "fulltime"
  );
  const [trainingDate, setTrainingDate] = useState("");
  const [trainingPeriod, setTrainingPeriod] = useState("5 days");
  const [role, setRole] = useState("");
  const [salary, setSalary] = useState("");
  const [duration, setDuration] = useState("");

  // Update role when candidatePosition changes (when dialog opens with different candidate)
  useEffect(() => {
    if (candidatePosition && open) {
      // Map candidate position to role dropdown value
      // Candidate position might be "HR", "Sales", "LeadGen", etc.
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
      
      if (matchedRole) {
        setRole(matchedRole);
      } else {
        // If no match found, set it anyway (user can see it and change if needed)
        // But first check if it's a valid option
        setRole(candidatePosition);
      }
    }
  }, [candidatePosition, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!trainingDate.trim() || !trainingPeriod.trim() || !role.trim() || !duration.trim()) {
      alert("Please fill in all fields including duration");
      return;
    }

    // Validate salary if provided (required here as part of selection)
    const parsedSalary = salary === "" ? NaN : Number(salary);
    if (Number.isNaN(parsedSalary) || parsedSalary < 0) {
      alert("Please enter a valid non-negative salary");
      return;
    }

    await onSubmit({
      positionType,
      trainingDate,
      trainingPeriod,
      role,
      salary: Number.isNaN(parsedSalary) ? undefined : parsedSalary,
      duration,
    });

    // Reset form
    setPositionType("fulltime");
    setTrainingDate("");
    setTrainingPeriod("5 days");
    setRole("");
    setSalary("");
    setDuration("");
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
          {/* Safety Check Warning */}
          {/* {candidatePosition && role && role.trim() !== "" && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-500 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-yellow-800 dark:text-yellow-200 mb-1">
                    Role Mismatch Warning
                  </h4>
                  <div className="text-sm text-yellow-700 dark:text-yellow-300 space-y-1">
                    <p>
                      <span className="font-medium">Candidate's Current Role:</span>{" "}
                      <span className="font-semibold">{candidatePosition}</span>
                    </p>
                    <p>
                      <span className="font-medium">Selected Role for Training:</span>{" "}
                      <span className="font-semibold">{role}</span>
                    </p>
                    {candidatePosition.toLowerCase() !== role.toLowerCase() && (
                      <p className="mt-2 font-medium">
                        ⚠️ The candidate's current role ({candidatePosition}) does not match the selected role for training ({role}). Please verify this is intentional.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )} */}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                disabled
                className="w-full px-3 py-2 border border-muted rounded bg-muted text-foreground cursor-not-allowed opacity-60"
              >
                <option value="">Select a Role</option>
                <option value="LeadGen">LeadGen</option>
                <option value="Marketing">Marketing</option>
                <option value="HR">Human Resource(HR)</option>
                <option value="Developer">Developer</option>
                <option value="Sales">Sales</option>
                {/* Add candidate position as option if it doesn't match existing options */}
                {candidatePosition && 
                 role === candidatePosition &&
                 !["LeadGen", "Marketing", "HR", "Developer", "Sales"].includes(candidatePosition) && (
                  <option value={candidatePosition}>{candidatePosition}</option>
                )}
              </select>
              <p className="text-xs text-muted-foreground mt-1">
                Role is locked to candidate's current position. Use "Edit Role" to change it first.
              </p>
            </div>

            {/* Salary Input */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Salary
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="Enter salary"
                value={salary}
                onChange={(e) => setSalary(e.target.value)}
                className="w-full px-3 py-2 border border-muted rounded bg-background text-foreground placeholder-muted-foreground focus:border-primary focus:outline-none"
              />
            </div>

            {/* Duration Selection */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Training Duration
              </label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setDuration("12:00 pm to 4:00 pm")}
                  className={`flex-1 py-2 px-3 rounded border transition ${
                    duration === "12:00 pm to 4:00 pm"
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-muted text-muted-foreground hover:border-primary"
                  }`}
                >
                  12:00 pm to 4:00 pm
                </button>
                <button
                  type="button"
                  onClick={() => setDuration("4:00 pm to 8:00 pm")}
                  className={`flex-1 py-2 px-3 rounded border transition ${
                    duration === "4:00 pm to 8:00 pm"
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-muted text-muted-foreground hover:border-primary"
                  }`}
                >
                  4:00 pm to 8:00 pm
                </button>
              </div>
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
