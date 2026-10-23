"use client";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface InterviewerOption {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface InterviewerSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: InterviewerOption[];
  loading: boolean;
}

export function InterviewerSelect({
  value,
  onChange,
  options,
  loading,
}: InterviewerSelectProps) {
  return (
    <div>
      <Label className="text-sm font-medium mb-2 block">Interviewer *</Label>
      <Select
        value={value || undefined}
        onValueChange={onChange}
        disabled={loading || options.length === 0}
      >
        <SelectTrigger>
          <SelectValue
            placeholder={loading ? "Loading interviewers..." : "Select interviewer"}
          />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.id} value={option.id}>
              {option.name}
              {option.role ? ` (${option.role})` : ""}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {!loading && options.length === 0 ? (
        <p className="text-xs text-muted-foreground mt-2">
          No active employees with an email were found.
        </p>
      ) : null}
    </div>
  );
}
