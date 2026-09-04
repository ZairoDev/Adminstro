"use client";

import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft,
  Download,
  Linkedin,
  Globe,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Candidate } from "../types";
import { formatEmploymentType, getStatusColor, getStatusLabel } from "../constants";

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

export function CandidateHeader({
  candidate,
  showBack = true,
  backHref,
  backLabel = "Back to profile",
  trailing,
}: CandidateHeaderProps) {
  const href = backHref ?? null;
  const shouldShowBack = showBack && Boolean(href);
  const meta = [
    candidate.position,
    formatEmploymentType(candidate.employmentType) !== "—"
      ? formatEmploymentType(candidate.employmentType)
      : null,
    candidate.experience === 0
      ? "Fresher"
      : `${candidate.experience} ${candidate.experience === 1 ? "year" : "years"}`,
    [candidate.city, candidate.country].filter(Boolean).join(", ") || null,
  ].filter(Boolean);

  return (
    <header className="border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="mx-auto w-full max-w-5xl px-4 py-5 sm:px-6">
        {shouldShowBack && href ? (
          <Link
            href={href}
            className="mb-4 inline-flex h-9 items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {backLabel}
          </Link>
        ) : null}

        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-4">
            {candidate.photoUrl ? (
              <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-2xl border border-border/70">
                <Image
                  src={candidate.photoUrl}
                  alt={candidate.name}
                  fill
                  className="object-cover"
                />
              </div>
            ) : (
              <div
                aria-hidden
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-muted text-sm font-medium text-muted-foreground"
              >
                {initials(candidate.name)}
              </div>
            )}
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                  {candidate.name}
                </h1>
                <Badge
                  variant="outline"
                  className={`${getStatusColor(candidate.status)} font-medium`}
                >
                  {getStatusLabel(candidate.status)}
                </Badge>
              </div>
              {meta.length > 0 ? (
                <p className="mt-1.5 text-sm leading-6 text-muted-foreground">
                  {meta.join("  ·  ")}
                </p>
              ) : null}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            {trailing}
            <a
              href={candidate.resumeUrl}
              download
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="outline" size="sm" className="h-9 gap-1.5">
                <Download className="h-3.5 w-3.5" />
                Resume
              </Button>
            </a>
            {candidate.linkedin ? (
              <a
                href={candidate.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="LinkedIn profile"
              >
                <Button variant="ghost" size="icon" className="h-9 w-9">
                  <Linkedin className="h-4 w-4" />
                </Button>
              </a>
            ) : null}
            {candidate.portfolio ? (
              <a
                href={candidate.portfolio}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Portfolio"
              >
                <Button variant="ghost" size="icon" className="h-9 w-9">
                  <Globe className="h-4 w-4" />
                </Button>
              </a>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}
