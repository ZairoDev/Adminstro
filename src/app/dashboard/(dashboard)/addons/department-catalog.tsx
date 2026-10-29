"use client";

import { useCallback, useEffect, useState } from "react";
import axios from "@/util/axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { InfinityLoader } from "@/components/Loaders";

type JobPositionRow = {
  _id: string;
  name: string;
  isActive: boolean;
};

type DepartmentRow = {
  _id: string;
  name: string;
  isActive: boolean;
  positions: JobPositionRow[];
};

export default function DepartmentCatalog() {
  const [departments, setDepartments] = useState<DepartmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [departmentName, setDepartmentName] = useState("");
  const [savingDepartment, setSavingDepartment] = useState(false);
  const [positionDrafts, setPositionDrafts] = useState<Record<string, string>>({});
  const [savingPositionFor, setSavingPositionFor] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get("/api/departments");
      setDepartments(Array.isArray(response.data?.data) ? response.data.data : []);
    } catch {
      toast({ title: "Unable to fetch departments", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const createDepartment = async () => {
    const name = departmentName.trim();
    if (!name) return;
    setSavingDepartment(true);
    try {
      await axios.post("/api/departments", { name, isActive: true });
      setDepartmentName("");
      toast({ title: "Department created" });
      await load();
    } catch (error: unknown) {
      const message =
        axios.isAxiosError(error) && typeof error.response?.data?.error === "string"
          ? error.response.data.error
          : "Unable to create department";
      toast({ title: message, variant: "destructive" });
    } finally {
      setSavingDepartment(false);
    }
  };

  const updateDepartment = async (
    department: DepartmentRow,
    patch: { name?: string; isActive?: boolean },
  ) => {
    try {
      await axios.patch(`/api/departments/${department._id}`, patch);
      await load();
    } catch (error: unknown) {
      const message =
        axios.isAxiosError(error) && typeof error.response?.data?.error === "string"
          ? error.response.data.error
          : "Unable to update department";
      toast({ title: message, variant: "destructive" });
    }
  };

  const createPosition = async (departmentId: string) => {
    const name = (positionDrafts[departmentId] || "").trim();
    if (!name) return;
    setSavingPositionFor(departmentId);
    try {
      await axios.post(`/api/departments/${departmentId}/positions`, {
        name,
        isActive: true,
      });
      setPositionDrafts((current) => ({ ...current, [departmentId]: "" }));
      toast({ title: "Job position created" });
      await load();
    } catch (error: unknown) {
      const message =
        axios.isAxiosError(error) && typeof error.response?.data?.error === "string"
          ? error.response.data.error
          : "Unable to create job position";
      toast({ title: message, variant: "destructive" });
    } finally {
      setSavingPositionFor(null);
    }
  };

  const updatePosition = async (
    departmentId: string,
    position: JobPositionRow,
    patch: { name?: string; isActive?: boolean },
  ) => {
    try {
      await axios.patch(
        `/api/departments/${departmentId}/positions/${position._id}`,
        patch,
      );
      await load();
    } catch (error: unknown) {
      const message =
        axios.isAxiosError(error) && typeof error.response?.data?.error === "string"
          ? error.response.data.error
          : "Unable to update job position";
      toast({ title: message, variant: "destructive" });
    }
  };

  return (
    <section className="mt-8 w-full basis-full rounded-md border p-4">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Departments and job titles</h2>
          <p className="text-sm text-muted-foreground">
            Create a department, then add the job positions that belong to it.
            Login roles stay separate.
          </p>
        </div>
        <div className="flex w-full gap-2 sm:w-auto">
          <Input
            value={departmentName}
            onChange={(event) => setDepartmentName(event.target.value)}
            placeholder="New department"
            className="sm:w-56"
          />
          <Button
            type="button"
            onClick={() => void createDepartment()}
            disabled={savingDepartment || !departmentName.trim()}
          >
            Add department
          </Button>
        </div>
      </div>

      {loading ? (
        <InfinityLoader className="h-12 w-16" />
      ) : departments.length === 0 ? (
        <p className="text-sm text-muted-foreground">No departments yet.</p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {departments.map((department) => (
            <div key={department._id} className="rounded-md border p-3">
              <div className="mb-3 flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-medium">{department.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {department.isActive ? "Active" : "Inactive"}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    void updateDepartment(department, { isActive: !department.isActive })
                  }
                >
                  {department.isActive ? "Deactivate" : "Activate"}
                </Button>
              </div>

              <ul className="mb-3 space-y-2">
                {department.positions.length === 0 ? (
                  <li className="text-xs text-muted-foreground">No job positions yet.</li>
                ) : (
                  department.positions.map((position) => (
                    <li
                      key={position._id}
                      className="flex items-center justify-between gap-2 rounded border px-2 py-1.5"
                    >
                      <span className="truncate text-sm">
                        {position.name}
                        {position.isActive ? "" : " · Inactive"}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          void updatePosition(department._id, position, {
                            isActive: !position.isActive,
                          })
                        }
                      >
                        {position.isActive ? "Hide" : "Show"}
                      </Button>
                    </li>
                  ))
                )}
              </ul>

              <div className="flex gap-2">
                <Input
                  value={positionDrafts[department._id] || ""}
                  onChange={(event) =>
                    setPositionDrafts((current) => ({
                      ...current,
                      [department._id]: event.target.value,
                    }))
                  }
                  placeholder="Job position"
                />
                <Button
                  type="button"
                  variant="secondary"
                  disabled={
                    savingPositionFor === department._id ||
                    !(positionDrafts[department._id] || "").trim()
                  }
                  onClick={() => void createPosition(department._id)}
                >
                  Add
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
