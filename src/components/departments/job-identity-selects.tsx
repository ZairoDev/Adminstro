"use client";

import { useEffect, useMemo, useState } from "react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type JobPositionOption = {
  _id: string;
  name: string;
  isActive: boolean;
};

export type DepartmentOption = {
  _id: string;
  name: string;
  isActive: boolean;
  positions: JobPositionOption[];
};

type JobIdentitySelectsProps = {
  departmentId: string;
  jobPositionId: string;
  onDepartmentChange: (departmentId: string) => void;
  onPositionChange: (jobPositionId: string) => void;
  /** Public application form only lists active departments and positions. */
  activeOnly?: boolean;
  departmentLabel?: string;
  positionLabel?: string;
};

export function JobIdentitySelects({
  departmentId,
  jobPositionId,
  onDepartmentChange,
  onPositionChange,
  activeOnly = false,
  departmentLabel = "Department",
  positionLabel = "Job title",
}: JobIdentitySelectsProps) {
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setLoadError("");
      try {
        const query = activeOnly ? "?active=1" : "";
        const response = await fetch(`/api/departments${query}`);
        const result = (await response.json()) as {
          success?: boolean;
          data?: DepartmentOption[];
          error?: string;
        };
        if (!response.ok || !result.success || !Array.isArray(result.data)) {
          throw new Error(result.error || "Failed to load departments");
        }
        if (!cancelled) setDepartments(result.data);
      } catch (error) {
        if (!cancelled) {
          setDepartments([]);
          setLoadError(error instanceof Error ? error.message : "Failed to load departments");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [activeOnly]);

  const positions = useMemo(() => {
    return departments.find((department) => department._id === departmentId)?.positions ?? [];
  }, [departments, departmentId]);

  return (
    <>
      <div className="space-y-2">
        <Label>{departmentLabel}</Label>
        <Select
          value={departmentId || undefined}
          onValueChange={onDepartmentChange}
          disabled={loading || departments.length === 0}
        >
          <SelectTrigger className="h-11">
            <SelectValue
              placeholder={loading ? "Loading departments..." : "Select department"}
            />
          </SelectTrigger>
          <SelectContent>
            {departments.map((department) => (
              <SelectItem key={department._id} value={department._id}>
                {department.name}
                {department.isActive ? "" : " (inactive)"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>{positionLabel}</Label>
        <Select
          value={jobPositionId || undefined}
          onValueChange={onPositionChange}
          disabled={loading || !departmentId || positions.length === 0}
        >
          <SelectTrigger className="h-11">
            <SelectValue
              placeholder={
                departmentId ? "Select job title" : "Select a department first"
              }
            />
          </SelectTrigger>
          <SelectContent>
            {positions.map((position) => (
              <SelectItem key={position._id} value={position._id}>
                {position.name}
                {position.isActive ? "" : " (inactive)"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {loadError ? <p className="text-red-500 text-xs">{loadError}</p> : null}
      </div>
    </>
  );
}
