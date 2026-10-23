"use client";

import Link from "next/link";
import { ArrowLeft, Download, Linkedin, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProfilePhotoPopup } from "@/components/profile-photo-popup";
import { Candidate } from "../types";
import {
  formatEmploymentType,
  getCandidateStatusLabel,
  getStatusColor,
} from "../constants";

interface CandidateHeaderProps {
  candidate: Candidate;
  showBack?: boolean;
  backHref?: string | null;
  backLabel?: string;
  trailing?: React.ReactNode;
}

function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function formatWhen(value?: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function stageSummary(candidate: Candidate): string {
  const second = candidate.secondRoundInterviewDetails;
  if (second?.scheduledDate) {
    const when = [
      formatWhen(second.scheduledDate),
      second.scheduledTime,
      second.interviewMode,
    ]
      .filter(Boolean)
      .join(", ");
    return when ? `Second round ${when}.` : "Second round scheduled.";
  }

  const interview = candidate.interviewDetails;
  const interviewWhen = [
    formatWhen(interview?.scheduledDate),
    interview?.scheduledTime,
    interview?.interviewMode,
  ]
    .filter(Boolean)
    .join(", ");

  switch (candidate.status) {
    case "pending":
      return interview?.scheduledDate
        ? `Interview set for ${interviewWhen}.`
        : "No interview scheduled yet.";
    case "interview":
      return interviewWhen ? `Interview ${interviewWhen}.` : "Interview scheduled.";
    case "shortlisted": {
      const roles =
        candidate.shortlistDetails?.suitableRoles?.filter(Boolean) ?? [];
      return roles.length
        ? `Shortlisted for ${roles.join(", ")}.`
        : "Shortlisted.";
    }
    case "selected":
      return candidate.selectionDetails?.role
        ? `Selected for training as ${candidate.selectionDetails.role}.`
        : "Selected for training.";
    case "onboarding":
      return candidate.onboardingDetails?.onboardingComplete
        ? "Onboarding is complete."
        : "Onboarding is in progress.";
    case "rejected":
      return candidate.rejectionDetails?.reason || "Rejected.";
    default:
      return "";
  }
}

export function CandidateHeader({
  candidate,
  showBack = true,
  backHref,
  backLabel = "Back to profile",
  trailing,
}: CandidateHeaderProps) {
  const href = backHref ?? null;
  const shouldShowBack = showBack && Boolean(href);
  const employment = formatEmploymentType(candidate.employmentType);
  const place = [candidate.city, candidate.country].filter(Boolean).join(", ");
  const experience =
    candidate.experience === 0
      ? "a fresher"
      : `with ${candidate.experience} ${candidate.experience === 1 ? "year" : "years"} of experience`;
  const roleLine = [candidate.position, employment !== "—" ? employment.toLowerCase() : null]
    .filter(Boolean)
    .join(" ");
  const who = [
    roleLine ? `${roleLine.charAt(0).toUpperCase()}${roleLine.slice(1)}` : null,
    place ? `based in ${place}` : null,
    experience,
  ]
    .filter(Boolean)
    .join(", ");
  const studied = candidate.college ? `Studied at ${candidate.college}.` : null;
  const applied = formatWhen(candidate.createdAt)
    ? `Applied ${formatWhen(candidate.createdAt)}.`
    : null;
  const portrait = [who ? `${who}.` : null, studied, applied].filter(Boolean).join(" ");
  const summary = stageSummary(candidate);
  const statusLabel = getCandidateStatusLabel(
    candidate.status,
    candidate.rejectionDetails?.category
  );

  return (
    <header className="border-b border-black/10 bg-white dark:border-white/10 dark:bg-background">
      <div className="mx-auto w-full max-w-[1400px] px-4 py-3 sm:px-6 lg:px-8">
        {shouldShowBack && href ? (
          <Link
            href={href}
            className="mb-2 inline-flex h-8 items-center gap-1.5 rounded-md text-sm text-[#636366] hover:text-[#1d1d1f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1d1d1f] focus-visible:ring-offset-2 dark:text-[#aeaeb2] dark:hover:text-[#f5f5f7] dark:focus-visible:ring-[#f5f5f7]"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            {backLabel}
          </Link>
        ) : null}

        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between lg:gap-6">
          <div className="flex min-w-0 items-start gap-3 sm:gap-4">
            {candidate.photoUrl ? (
              <ProfilePhotoPopup
                src={candidate.photoUrl}
                alt={candidate.name}
                className="h-11 w-11 rounded-full border border-black/[0.08] dark:border-white/10"
              />
            ) : (
              <div
                aria-hidden
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#f2f2f7] text-sm font-semibold text-[#1d1d1f] dark:bg-[#2c2c2e] dark:text-[#f5f5f7]"
              >
                {initials(candidate.name)}
              </div>
            )}
            <div className="min-w-0">
              <h1 className="break-words text-xl font-semibold leading-tight tracking-tight text-[#1d1d1f] dark:text-[#f5f5f7]">
                {candidate.name}
              </h1>
              {portrait ? (
                <p className="mt-1 max-w-2xl text-sm leading-6 text-[#3a3a3c] dark:text-[#d1d1d6]">
                  {portrait}
                </p>
              ) : null}
              <p
                className={`mt-2 inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-sm font-medium ${getStatusColor(candidate.status)}`}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
                {statusLabel}
              </p>
              {summary ? (
                <p className="mt-2 max-w-2xl text-sm leading-6 text-[#1d1d1f] dark:text-[#f5f5f7]">
                  {summary}
                </p>
              ) : null}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {trailing}
            <a href={candidate.resumeUrl} download target="_blank" rel="noopener noreferrer">
              <Button variant="outline" className="h-8 gap-1.5 bg-white px-2.5 text-sm dark:bg-[#2c2c2e]">
                <Download className="h-4 w-4" aria-hidden />
                Resume
              </Button>
            </a>
            {candidate.linkedin ? (
              <a href={candidate.linkedin} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" className="h-8 gap-1.5 bg-white px-2.5 text-sm dark:bg-[#2c2c2e]">
                  <Linkedin className="h-4 w-4" aria-hidden />
                  LinkedIn
                </Button>
              </a>
            ) : null}
            {candidate.portfolio ? (
              <a href={candidate.portfolio} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" className="h-8 gap-1.5 bg-white px-2.5 text-sm dark:bg-[#2c2c2e]">
                  <Globe className="h-4 w-4" aria-hidden />
                  Portfolio
                </Button>
              </a>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}
