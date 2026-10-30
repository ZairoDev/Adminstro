"use client";

import { useCallback, useEffect, useState } from "react";
import axios from "@/util/axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { JobIdentitySelects } from "@/components/departments/job-identity-selects";
import { Switch } from "@/components/ui/switch";
import { ShareJobButton } from "@/components/careers/share-job-button";
import { formatJobExperience } from "@/lib/careers/experience";
import { employmentTypeLabel, workModeLabel } from "@/lib/careers/jobTypes";
import { EMPLOYMENT_TYPES, WORK_MODES, type JobEmploymentType, type JobWorkMode } from "@/lib/careers/jobTypes";

type JobRow = {
  _id: string;
  title: string;
  slug: string;
  departmentId: string;
  jobPositionId: string;
  departmentName: string;
  positionName: string;
  summary: string;
  description: string;
  responsibilities: string;
  requirements: string;
  location: string;
  employmentType: JobEmploymentType | null;
  workMode: JobWorkMode | null;
  experienceLevel: "fresher" | "range" | null;
  experienceMin: number | null;
  experienceMax: number | null;
  isPublished: boolean;
};

const emptyDraft = {
  title: "",
  departmentId: "",
  jobPositionId: "",
  summary: "",
  description: "",
  responsibilities: "",
  requirements: "",
  location: "",
  employmentType: "" as "" | JobEmploymentType,
  workMode: "" as "" | JobWorkMode,
  experienceLevel: "fresher" as "fresher" | "range",
  experienceMin: "",
  experienceMax: "",
  isPublished: false,
};

export default function CareersAdminPage() {
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState(emptyDraft);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get("/api/job-openings");
      setJobs(Array.isArray(response.data?.data) ? response.data.data : []);
    } catch {
      toast({ title: "Unable to load jobs", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const startEdit = (job: JobRow) => {
    setEditingId(job._id);
    setDraft({
      title: job.title,
      departmentId: job.departmentId,
      jobPositionId: job.jobPositionId,
      summary: job.summary,
      description: job.description,
      responsibilities: job.responsibilities,
      requirements: job.requirements,
      location: job.location,
      employmentType: job.employmentType || "",
      workMode: job.workMode || "",
      experienceLevel: job.employmentType === "intern" ? "fresher" : job.experienceLevel || "fresher",
      experienceMin: job.experienceMin == null ? "" : String(job.experienceMin),
      experienceMax: job.experienceMax == null ? "" : String(job.experienceMax),
      isPublished: job.isPublished,
    });
  };

  const setActive = async (job: JobRow, isPublished: boolean) => {
    const previous = jobs;
    setJobs((current) =>
      current.map((row) => (row._id === job._id ? { ...row, isPublished } : row)),
    );
    if (editingId === job._id) {
      setDraft((current) => ({ ...current, isPublished }));
    }
    try {
      await axios.patch(`/api/job-openings/${job._id}`, { isPublished });
    } catch (error: unknown) {
      setJobs(previous);
      const message =
        axios.isAxiosError(error) && typeof error.response?.data?.error === "string"
          ? error.response.data.error
          : "Unable to update this job";
      toast({ title: message, variant: "destructive" });
    }
  };

  const save = async () => {
    if (!draft.title.trim() || !draft.departmentId || !draft.jobPositionId) {
      toast({ title: "Title, department, and job position are required", variant: "destructive" });
      return;
    }
    if (!draft.summary.trim() || !draft.description.trim()) {
      toast({ title: "Add a summary and a description", variant: "destructive" });
      return;
    }

    if (!draft.employmentType) {
      toast({ title: "Choose an employment type", variant: "destructive" });
      return;
    }
    if (!draft.workMode) {
      toast({ title: "Choose a job type", variant: "destructive" });
      return;
    }

    const isIntern = draft.employmentType === "intern";
    const experienceMin = draft.experienceMin === "" ? null : Number(draft.experienceMin);
    const experienceMax = draft.experienceMax === "" ? null : Number(draft.experienceMax);
    if (!isIntern && draft.experienceLevel === "range") {
      if (
        experienceMin == null ||
        experienceMax == null ||
        !Number.isInteger(experienceMin) ||
        !Number.isInteger(experienceMax)
      ) {
        toast({ title: "Enter the minimum and maximum years", variant: "destructive" });
        return;
      }
      if (experienceMin > experienceMax) {
        toast({ title: "Minimum experience cannot be higher than the maximum", variant: "destructive" });
        return;
      }
    }

    const payload = {
      title: draft.title.trim(),
      departmentId: draft.departmentId,
      jobPositionId: draft.jobPositionId,
      summary: draft.summary.trim(),
      description: draft.description.trim(),
      responsibilities: draft.responsibilities.trim(),
      requirements: draft.requirements.trim(),
      location: draft.location.trim(),
      employmentType: draft.employmentType,
      workMode: draft.workMode,
      experienceLevel: isIntern ? "fresher" : draft.experienceLevel,
      experienceMin: isIntern || draft.experienceLevel !== "range" ? null : experienceMin,
      experienceMax: isIntern || draft.experienceLevel !== "range" ? null : experienceMax,
      isPublished: draft.isPublished,
    };

    setSaving(true);
    try {
      if (editingId) {
        await axios.patch(`/api/job-openings/${editingId}`, payload);
        toast({ title: "Job updated" });
      } else {
        await axios.post("/api/job-openings", payload);
        toast({ title: "Job created" });
      }
      setEditingId(null);
      setDraft(emptyDraft);
      await load();
    } catch (error: unknown) {
      const message =
        axios.isAxiosError(error) && typeof error.response?.data?.error === "string"
          ? error.response.data.error
          : "Unable to save job";
      toast({ title: message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 px-4 py-6">
      <div>
        <h1 className="text-2xl font-semibold">Careers</h1>
        <p className="text-sm text-muted-foreground">
          Create a job, write what the role is, then publish it. Applicants open that job and apply from its page.
        </p>
      </div>

      <section className="grid gap-4 rounded-md border p-4 lg:grid-cols-2">
        <div className="space-y-2">
          <Label>Public title</Label>
          <Input
            value={draft.title}
            onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
            placeholder="Business Development Executive"
          />
        </div>
        <div className="space-y-2">
          <Label>Location</Label>
          <Input
            value={draft.location}
            onChange={(event) => setDraft((current) => ({ ...current, location: event.target.value }))}
            placeholder="Kanpur"
          />
        </div>
        <JobIdentitySelects
          departmentId={draft.departmentId}
          jobPositionId={draft.jobPositionId}
          departmentLabel="Department"
          positionLabel="Job position"
          onDepartmentChange={(departmentId) =>
            setDraft((current) => ({ ...current, departmentId, jobPositionId: "" }))
          }
          onPositionChange={(jobPositionId) =>
            setDraft((current) => ({ ...current, jobPositionId }))
          }
        />
        <div className="space-y-2">
          <Label>Employment type</Label>
          <select
            value={draft.employmentType}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                employmentType: event.target.value as "" | JobEmploymentType,
                ...(event.target.value === "intern"
                  ? { experienceLevel: "fresher" as const, experienceMin: "", experienceMax: "" }
                  : {}),
              }))
            }
            className="h-11 w-full rounded-md border bg-background px-3 text-sm"
          >
            <option value="">Select employment type</option>
            {EMPLOYMENT_TYPES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="job-type">Job type</Label>
          <select
            id="job-type"
            value={draft.workMode}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                workMode: event.target.value as "" | JobWorkMode,
              }))
            }
            className="h-11 w-full rounded-md border bg-background px-3 text-sm"
          >
            <option value="">Select job type</option>
            {WORK_MODES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-3 lg:col-span-2">
          <Label>Experience</Label>
          {draft.employmentType === "intern" ? (
            <p className="text-sm text-muted-foreground">Internships are always for freshers.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                aria-pressed={draft.experienceLevel === "fresher"}
                onClick={() =>
                  setDraft((current) => ({
                    ...current,
                    experienceLevel: "fresher",
                    experienceMin: "",
                    experienceMax: "",
                  }))
                }
                className={`h-11 rounded-md border px-4 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                  draft.experienceLevel === "fresher"
                    ? "border-foreground bg-foreground text-background"
                    : "border-border bg-background text-foreground"
                }`}
              >
                Fresher
              </button>
              <button
                type="button"
                aria-pressed={draft.experienceLevel === "range"}
                onClick={() =>
                  setDraft((current) => ({ ...current, experienceLevel: "range" }))
                }
                className={`h-11 rounded-md border px-4 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                  draft.experienceLevel === "range"
                    ? "border-foreground bg-foreground text-background"
                    : "border-border bg-background text-foreground"
                }`}
              >
                Experience range
              </button>
            </div>
          )}
          {draft.employmentType !== "intern" && draft.experienceLevel === "range" ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="experience-min">Minimum years</Label>
                <Input
                  id="experience-min"
                  inputMode="numeric"
                  value={draft.experienceMin}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      experienceMin: event.target.value.replace(/[^\d]/g, ""),
                    }))
                  }
                  placeholder="1"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="experience-max">Maximum years</Label>
                <Input
                  id="experience-max"
                  inputMode="numeric"
                  value={draft.experienceMax}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      experienceMax: event.target.value.replace(/[^\d]/g, ""),
                    }))
                  }
                  placeholder="3"
                />
              </div>
            </div>
          ) : null}
        </div>
        <div className="space-y-2 lg:col-span-2">
          <Label>Short summary</Label>
          <Textarea
            value={draft.summary}
            onChange={(event) => setDraft((current) => ({ ...current, summary: event.target.value }))}
            placeholder="One or two sentences shown on the careers list."
          />
        </div>
        <div className="space-y-2 lg:col-span-2">
          <Label>About the role</Label>
          <Textarea
            value={draft.description}
            onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))}
            placeholder="What this job is and who it is for."
            className="min-h-28"
          />
        </div>
        <div className="space-y-2">
          <Label>What they will do</Label>
          <Textarea
            value={draft.responsibilities}
            onChange={(event) =>
              setDraft((current) => ({ ...current, responsibilities: event.target.value }))
            }
            placeholder={"One point per line"}
            className="min-h-28"
          />
        </div>
        <div className="space-y-2">
          <Label>What you look for</Label>
          <Textarea
            value={draft.requirements}
            onChange={(event) => setDraft((current) => ({ ...current, requirements: event.target.value }))}
            placeholder={"One point per line"}
            className="min-h-28"
          />
        </div>
        <div className="flex min-h-11 items-center justify-between gap-4 rounded-md border px-3 py-2 lg:col-span-2">
          <div>
            <Label htmlFor="job-active">Active on the careers page</Label>
            <p className="text-sm text-muted-foreground">
              Inactive jobs stay in this list and are hidden from applicants.
            </p>
          </div>
          <Switch
            id="job-active"
            checked={draft.isPublished}
            onCheckedChange={(checked) =>
              setDraft((current) => ({ ...current, isPublished: checked }))
            }
            aria-label="Active on the careers page"
          />
        </div>
        <div className="flex gap-2 lg:col-span-2">
          <Button type="button" onClick={() => void save()} disabled={saving}>
            {editingId ? "Save job" : "Create job"}
          </Button>
          {editingId ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setEditingId(null);
                setDraft(emptyDraft);
              }}
            >
              Cancel edit
            </Button>
          ) : null}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Jobs</h2>
        {loading ? (
          <div className="grid gap-3" aria-busy="true">
            {[0, 1, 2].map((item) => (
              <div key={item} className="h-20 animate-pulse rounded-md border bg-muted/40" />
            ))}
          </div>
        ) : jobs.length === 0 ? (
          <p className="text-sm text-muted-foreground">No jobs yet. Create one above, then turn it active.</p>
        ) : (
          jobs.map((job) => (
            <div key={job._id} className="flex flex-col gap-3 rounded-md border p-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="font-medium">{job.title}</p>
                <p className="text-sm text-muted-foreground">
                  {job.positionName}
                  {job.departmentName ? ` · ${job.departmentName}` : ""}
                  {job.location ? ` · ${job.location}` : ""}
                  {employmentTypeLabel(job.employmentType) ? ` · ${employmentTypeLabel(job.employmentType)}` : ""}
                  {workModeLabel(job.workMode) ? ` · ${workModeLabel(job.workMode)}` : ""}
                  {formatJobExperience(job) ? ` · ${formatJobExperience(job)}` : ""}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex min-h-11 items-center gap-2 rounded-md border px-3">
                  <Switch
                    id={`job-active-${job._id}`}
                    checked={job.isPublished}
                    onCheckedChange={(checked) => void setActive(job, checked)}
                    aria-label={`${job.isPublished ? "Deactivate" : "Activate"} ${job.title}`}
                  />
                  <Label htmlFor={`job-active-${job._id}`} className="text-sm font-medium text-foreground">
                    {job.isPublished ? "Active" : "Inactive"}
                  </Label>
                </div>
                {job.isPublished ? <ShareJobButton title={job.title} slug={job.slug} /> : null}
                {job.isPublished ? (
                  <Button type="button" variant="outline" asChild>
                    <a href={`/careers/${job.slug}`} target="_blank" rel="noreferrer">
                      Open page
                    </a>
                  </Button>
                ) : null}
                <Button type="button" variant="secondary" onClick={() => startEdit(job)}>
                  Edit
                </Button>
              </div>
            </div>
          ))
        )}
      </section>
    </div>
  );
}
