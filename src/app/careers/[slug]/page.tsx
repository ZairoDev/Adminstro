"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Briefcase, MapPin } from "lucide-react";
import JobApplicationForm from "@/components/careers/job-application-form";
import { CareerHeader } from "@/components/careers/career-header";
import { ShareJobButton } from "@/components/careers/share-job-button";

type CareerJob = {
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
  employmentType: "fulltime" | "intern" | null;
};

function lines(value: string): string[] {
  return value
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function employmentLabel(value: CareerJob["employmentType"]): string {
  if (value === "intern") return "Internship";
  if (value === "fulltime") return "Full time";
  return "";
}

export default function CareerJobPage() {
  const params = useParams<{ slug: string }>();
  const slug = typeof params?.slug === "string" ? params.slug : "";
  const [job, setJob] = useState<CareerJob | null>(null);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);
  const [showApplyBar, setShowApplyBar] = useState(true);

  useEffect(() => {
    if (!slug) return;
    const load = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/job-openings/by-slug/${encodeURIComponent(slug)}`);
        const result = (await response.json()) as { success?: boolean; data?: CareerJob };
        if (!response.ok || !result.success || !result.data) {
          setMissing(true);
          setJob(null);
          return;
        }
        setJob(result.data);
        setMissing(false);
      } catch (error) {
        console.error("Failed to load job:", error);
        setMissing(true);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [slug]);

  useEffect(() => {
    if (!job) return;
    const node = document.getElementById("apply");
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        setShowApplyBar(!entry.isIntersecting);
      },
      { threshold: 0.12 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [job]);

  const responsibilityLines = lines(job?.responsibilities || "");
  const requirementLines = lines(job?.requirements || "");
  const typeLabel = employmentLabel(job?.employmentType ?? null);

  return (
    <div className={`min-h-dvh bg-background ${showApplyBar && job ? "pb-24 md:pb-10" : "pb-10"}`}>
      <CareerHeader />
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
        <Link
          href="/careers"
          className="inline-flex h-11 items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <ArrowLeft className="h-4 w-4" />
          All open roles
        </Link>

        {loading ? (
          <div className="mt-8 h-64 animate-pulse rounded-2xl border border-border bg-muted/40" aria-busy="true" />
        ) : missing || !job ? (
          <div className="mt-8 rounded-2xl border border-border bg-card p-8">
            <h1 className="text-2xl font-semibold text-foreground">This role is not open</h1>
            <p className="mt-2 max-w-lg text-sm leading-relaxed text-muted-foreground">
              It may have been closed. You can look at the roles that are still open.
            </p>
            <Link
              href="/careers"
              className="mt-6 inline-flex h-11 items-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground"
            >
              Back to open roles
            </Link>
          </div>
        ) : (
          <div className="mt-6 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
            <article>
              <p className="text-sm text-muted-foreground">
                {job.positionName}
                {job.departmentName ? ` · ${job.departmentName}` : ""}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                  {job.title}
                </h1>
                <ShareJobButton title={job.title} slug={job.slug} />
              </div>
              <p className="mt-4 max-w-2xl text-base leading-relaxed text-foreground">{job.summary}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {job.location ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    {job.location}
                  </span>
                ) : null}
                {typeLabel ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-sm text-muted-foreground">
                    <Briefcase className="h-4 w-4" />
                    {typeLabel}
                  </span>
                ) : null}
              </div>

              <div className="mt-8 max-w-2xl space-y-8 text-base leading-relaxed text-foreground">
                <section>
                  <h2 className="text-lg font-semibold">About the role</h2>
                  <p className="mt-2 whitespace-pre-wrap">{job.description}</p>
                </section>
                {responsibilityLines.length > 0 ? (
                  <section>
                    <h2 className="text-lg font-semibold text-foreground">What you will do</h2>
                    <ul className="mt-3 space-y-2">
                      {responsibilityLines.map((line) => (
                        <li key={line} className="flex gap-3">
                          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-foreground" aria-hidden />
                          <span>{line}</span>
                        </li>
                      ))}
                    </ul>
                  </section>
                ) : null}
                {requirementLines.length > 0 ? (
                  <section>
                    <h2 className="text-lg font-semibold text-foreground">What we look for</h2>
                    <ul className="mt-3 space-y-2">
                      {requirementLines.map((line) => (
                        <li key={line} className="flex gap-3">
                          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-foreground" aria-hidden />
                          <span>{line}</span>
                        </li>
                      ))}
                    </ul>
                  </section>
                ) : null}
              </div>
            </article>

            <aside>
              <div className="hidden rounded-2xl border border-border bg-card p-5 lg:block">
                <p className="text-sm text-muted-foreground">Apply for</p>
                <p className="mt-1 text-lg font-semibold text-foreground">{job.title}</p>
                <a
                  href="#apply"
                  className="mt-4 inline-flex h-12 w-full items-center justify-center rounded-xl bg-primary text-sm font-semibold text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  Continue to application
                </a>
                <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                  The form is on this page. Your application is saved against this role.
                </p>
              </div>
            </aside>

            <div className="lg:col-span-2">
              <JobApplicationForm
                embedded
                lockedJob={{
                  id: job._id,
                  title: job.title,
                  departmentId: job.departmentId,
                  jobPositionId: job.jobPositionId,
                  departmentName: job.departmentName,
                  positionName: job.positionName,
                }}
              />
            </div>
          </div>
        )}
      </main>

      {job && showApplyBar ? (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-background/95 p-3 backdrop-blur md:hidden">
          <a
            href="#apply"
            className="flex h-12 items-center justify-center rounded-xl bg-primary text-sm font-semibold text-primary-foreground"
          >
            Apply for this role
          </a>
        </div>
      ) : null}
    </div>
  );
}
