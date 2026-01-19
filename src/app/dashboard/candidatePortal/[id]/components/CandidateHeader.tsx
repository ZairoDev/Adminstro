"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Download, Linkedin, Globe, Briefcase, Clock, MapPin, GraduationCap, IndianRupee } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Candidate } from "../types";
import { getStatusColor, getStatusLabel } from "../constants";
import { formatSalary } from "../utils/time-utils";

interface CandidateHeaderProps {
  candidate: Candidate;
}

export function CandidateHeader({ candidate }: CandidateHeaderProps) {
  return (
    <div className="border-b bg-card sticky top-0 z-10">
      <div className="max-w-[1600px] mx-auto px-6 py-3">
        <div className="flex items-center justify-between mb-2">
          <Link href="/dashboard/candidatePortal">
            <Button variant="ghost" size="sm" className="gap-1.5 h-8">
              <ArrowLeft className="w-3.5 h-3.5" />
              Back
            </Button>
          </Link>
          <Badge className={`${getStatusColor(candidate.status)} text-xs px-3 py-1`}>
            {getStatusLabel(candidate.status)}
          </Badge>
        </div>
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            {candidate.photoUrl && (
              <div className="relative w-20 h-20 rounded-full overflow-hidden border-2 border-border flex-shrink-0">
                <Image
                  src={candidate.photoUrl}
                  alt={candidate.name}
                  fill
                  className="object-cover"
                />
              </div>
            )}
            <div>
              <h1 className="text-2xl font-bold text-foreground leading-tight">
                {candidate.name}
              </h1>
              <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Briefcase className="w-3.5 h-3.5" />
                  {candidate.position}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {candidate.experience === 0
                    ? "Fresher"
                    : `${candidate.experience} ${candidate.experience === 1 ? "year" : "years"} exp`}
                </span>
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" />
                  {candidate.city}, {candidate.country}
                </span>
                {candidate.college && (
                  <span className="flex items-center gap-1">
                    <GraduationCap className="w-3.5 h-3.5" />
                    {candidate.college}
                  </span>
                )}
                {candidate.selectionDetails?.salary && (
                  <span className="flex items-center gap-1">
                    <IndianRupee className="w-3.5 h-3.5" />
                    {formatSalary(candidate.selectionDetails.salary)}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={candidate.resumeUrl}
              download
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="outline" size="sm" className="gap-1.5 h-8">
                <Download className="w-3.5 h-3.5" />
                Resume
              </Button>
            </a>
            {(candidate.linkedin || candidate.portfolio) && (
              <div className="flex gap-1">
                {candidate.linkedin && (
                  <a
                    href={candidate.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <Linkedin className="w-4 h-4" />
                    </Button>
                  </a>
                )}
                {candidate.portfolio && (
                  <a
                    href={candidate.portfolio}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <Globe className="w-4 h-4" />
                    </Button>
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

