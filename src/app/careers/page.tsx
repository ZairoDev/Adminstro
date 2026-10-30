"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, Briefcase, Building2, Clock, MapPin } from "lucide-react";
import { CareerHeader } from "@/components/careers/career-header";
import { ShareJobButton } from "@/components/careers/share-job-button";
import { formatJobExperience } from "@/lib/careers/experience";
import {
  EMPLOYMENT_TYPES,
  WORK_MODES,
  employmentTypeLabel,
  workModeLabel,
  type JobEmploymentType,
  type JobWorkMode,
} from "@/lib/careers/jobTypes";

type CareerJob = {
  _id: string;
  title: string;
  slug: string;
  summary: string;
  departmentName: string;
  positionName: string;
  location: string;
  employmentType: JobEmploymentType | null;
  workMode: JobWorkMode | null;
  experienceLevel: "fresher" | "range" | null;
  experienceMin: number | null;
  experienceMax: number | null;
};

function employmentLabel(value: CareerJob["employmentType"]): string {
  return employmentTypeLabel(value);
}

export default function CareersPage() {
  const [jobs, setJobs] = useState<CareerJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [department, setDepartment] = useState("all");
  const [employment, setEmployment] = useState<"all" | JobEmploymentType>("all");
  const [workMode, setWorkMode] = useState<"all" | JobWorkMode>("all");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setFailed(false);
      try {
        const response = await fetch("/api/job-openings?published=1");
        const result = (await response.json()) as { success?: boolean; data?: CareerJob[] };
        if (!response.ok || !result.success || !Array.isArray(result.data)) {
          setFailed(true);
          setJobs([]);
          return;
        }
        setJobs(result.data);
      } catch (error) {
        console.error("Failed to load careers:", error);
        setFailed(true);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const departments = useMemo(() => {
    return [...new Set(jobs.map((job) => job.departmentName).filter(Boolean))].sort();
  }, [jobs]);

  const visibleJobs = jobs.filter((job) => {
    if (department !== "all" && job.departmentName !== department) return false;
    if (employment !== "all" && job.employmentType !== employment) return false;
    if (workMode !== "all" && job.workMode !== workMode) return false;
    return true;
  });

  return (
    <div className="min-h-dvh bg-background">
      <CareerHeader />
      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
        <div className="max-w-2xl">
          <p className="text-sm font-medium text-muted-foreground">Zairo International</p>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
            Open roles
          </h1>
          <p className="mt-3 text-base leading-relaxed text-muted-foreground">
            Read what a role involves, then apply on that page. Each application is tied to one job.
          </p>
        </div>

        {loading ? (
          <div className="mt-10 grid gap-4" aria-busy="true" aria-live="polite">
            {[0, 1, 2].map((item) => (
              <div key={item} className="h-36 animate-pulse rounded-2xl border border-border bg-muted/40" />
            ))}
          </div>
        ) : failed ? (
          <div className="mt-10 rounded-2xl border border-border bg-card p-8">
            <h2 className="text-lg font-semibold text-foreground">We could not load open roles</h2>
            <p className="mt-2 text-sm text-muted-foreground">Refresh the page and try again.</p>
          </div>
        ) : jobs.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-border bg-card p-8">
            <h2 className="text-lg font-semibold text-foreground">No open roles right now</h2>
            <p className="mt-2 max-w-lg text-sm leading-relaxed text-muted-foreground">
              New jobs appear here when a team is hiring. You can come back later.
            </p>
          </div>
        ) : (
          <>
            <div className="mt-8">
              <p className="text-sm text-muted-foreground">
                {visibleJobs.length} {visibleJobs.length === 1 ? "role" : "roles"}
              </p>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <FilterSelect
                  id="career-department"
                  label="Department"
                  value={department}
                  onChange={setDepartment}
                >
                  <option value="all">All departments</option>
                  {departments.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </FilterSelect>
                <FilterSelect
                  id="career-employment"
                  label="Employment type"
                  value={employment}
                  onChange={(value) => setEmployment(value as "all" | JobEmploymentType)}
                >
                  <option value="all">All employment types</option>
                  {EMPLOYMENT_TYPES.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </FilterSelect>
                <FilterSelect
                  id="career-job-type"
                  label="Job type"
                  value={workMode}
                  onChange={(value) => setWorkMode(value as "all" | JobWorkMode)}
                >
                  <option value="all">All job types</option>
                  {WORK_MODES.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </FilterSelect>
              </div>
            </div>

            {visibleJobs.length === 0 ? (
              <p className="mt-6 text-sm text-muted-foreground">No roles match these filters.</p>
            ) : (
            <ul className="mt-4 grid gap-3">
              {visibleJobs.map((job) => {
                const typeLabel = employmentLabel(job.employmentType);
                const experienceLabel = formatJobExperience(job);
                return (
                  <li
                    key={job._id}
                    className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <Link
                      href={`/careers/${job.slug}`}
                      className="group min-w-0 flex-1 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      <h2 className="text-xl font-semibold text-foreground">{job.title}</h2>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {job.positionName}
                        {job.departmentName ? ` · ${job.departmentName}` : ""}
                      </p>
                      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-foreground">{job.summary}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {job.location ? <Meta icon={<MapPin className="h-3.5 w-3.5" />} label={job.location} /> : null}
                        {typeLabel ? <Meta icon={<Briefcase className="h-3.5 w-3.5" />} label={typeLabel} /> : null}
                        {workModeLabel(job.workMode) ? (
                          <Meta icon={<Building2 className="h-3.5 w-3.5" />} label={workModeLabel(job.workMode)} />
                        ) : null}
                        {experienceLabel ? <Meta icon={<Clock className="h-3.5 w-3.5" />} label={experienceLabel} /> : null}
                      </div>
                    </Link>
                    <div className="flex shrink-0 flex-col gap-2 sm:items-stretch">
                      <Link
                        href={`/careers/${job.slug}`}
                        className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      >
                        View role
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                      <ShareJobButton title={job.title} slug={job.slug} />
                    </div>
                  </li>
                );
              })}
            </ul>
            )}
          </>
        )}
      </main>
    </div>
  );
}

function FilterSelect({
  id,
  label,
  value,
  onChange,
  children,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
}) {
  return (
    <label htmlFor={id} className="block space-y-1.5">
      <span className="text-sm font-medium text-foreground">{label}</span>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-md border border-border bg-background px-3 text-base text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:text-sm"
      >
        {children}
      </select>
    </label>
  );
}

function Meta({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
      {icon}
      {label}
    </span>
  );
}
