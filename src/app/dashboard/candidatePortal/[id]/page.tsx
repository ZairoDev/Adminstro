"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Download,
  Linkedin,
  Globe,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SelectCandidateDialog, SelectionData } from "../components/select-candidate-dialog";
import { ShortlistCandidateDialog, ShortlistData } from "../components/shortlist-candidate-dialog";
import { RejectCandidateDialog, RejectionData } from "../components/reject-candidate-dialog";


interface Candidate {
  _id: string;
  name: string;
  email: string;
  phone: string;
  position: string;
  experience: number;
  address: string;
  city: string;
  country: string;
  coverLetter?: string;
  linkedin?: string;
  portfolio?: string;
  resumeUrl: string;
  status: "pending" | "shortlisted" | "selected" | "rejected";
  createdAt: string;
}

export default function CandidateDetailPage() {
  const params = useParams();
  const router = useRouter();
  const candidateId = params.id as string;

  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectDialogOpen, setSelectDialogOpen] = useState(false);
  const [shortlistDialogOpen, setShortlistDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);

  useEffect(() => {
    const fetchCandidate = async () => {
      try {
        const response = await fetch(`/api/candidates/${candidateId}`);
        const result = await response.json();

        if (result.success) {
          setCandidate(result.data);
        }
      } catch (error) {
        console.error("Error fetching candidate:", error);
      } finally {
        setLoading(false);
      }
    };

    if (candidateId) {
      fetchCandidate();
    }
  }, [candidateId]);

  const handleSelectCandidate = async (data: SelectionData) => {
    setActionLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/candidates/${candidateId}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "selected",
          selectionDetails: {
            positionType: data.positionType,
            duration: data.duration,
            trainingPeriod: data.trainingPeriod,
            role: data.role,
          },
        }),
      });

      const result = await response.json();
      if (result.success) {
        setCandidate(result.data);
        setSelectDialogOpen(false);
      } else {
        setError(result.error || "Failed to select candidate");
      }
    } catch (err) {
      console.error("Error selecting candidate:", err);
      setError("An error occurred while selecting the candidate");
    } finally {
      setActionLoading(false);
    }
  };

  const handleShortlistCandidate = async (data: ShortlistData) => {
    setActionLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/candidates/${candidateId}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "shortlisted",
          shortlistDetails: {
            suitableRoles: data.suitableRoles,
            notes: data.notes,
          },
        }),
      });

      const result = await response.json();
      if (result.success) {
        setCandidate(result.data);
        setShortlistDialogOpen(false);
      } else {
        setError(result.error || "Failed to shortlist candidate");
      }
    } catch (err) {
      console.error("Error shortlisting candidate:", err);
      setError("An error occurred while shortlisting the candidate");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectCandidate = async (data: RejectionData) => {
    setActionLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/candidates/${candidateId}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "rejected",
          rejectionDetails: {
            reason: data.reason,
          },
        }),
      });

      const result = await response.json();
      if (result.success) {
        setCandidate(result.data);
        setRejectDialogOpen(false);
      } else {
        setError(result.error || "Failed to reject candidate");
      }
    } catch (err) {
      console.error("Error rejecting candidate:", err);
      setError("An error occurred while rejecting the candidate");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!candidate) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="max-w-7xl mx-auto">
          <p className="text-muted-foreground">Candidate not found</p>
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "selected":
        return "bg-green-100 text-green-800";
      case "shortlisted":
        return "bg-blue-100 text-blue-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      case "pending":
      default:
        return "bg-yellow-100 text-yellow-800";
    }
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header with Back Button */}
        <div className="mb-8">
          <Link href="/">
            <Button variant="ghost" className="gap-2 mb-4">
              <ArrowLeft className="w-4 h-4" />
              Back to Candidates
            </Button>
          </Link>
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">
                {candidate.name}
              </h1>
              <p className="text-muted-foreground">{candidate.position}</p>
            </div>
            <Badge className={getStatusColor(candidate.status)}>
              {candidate?.status?.charAt(0)?.toUpperCase() +
                candidate?.status?.slice(1)}
            </Badge>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded flex items-center gap-2 text-red-700">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Candidate Info */}
          <div className="lg:col-span-1 space-y-6">
            {/* Contact Information */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4">
                Contact Information
              </h2>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Email</p>
                  <a
                    href={`mailto:${candidate?.email}`}
                    className="text-primary hover:underline"
                  >
                    {candidate.email}
                  </a>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Phone</p>
                  <a
                    href={`tel:${candidate?.phone}`}
                    className="text-primary hover:underline"
                  >
                    {candidate.phone}
                  </a>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Location</p>
                  <p className="text-foreground">
                    {candidate?.city}, {candidate?.country}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Address</p>
                  <p className="text-foreground text-sm">
                    {candidate?.address}
                  </p>
                </div>
              </div>
            </Card>

            {/* Experience */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4">
                Experience
              </h2>
              <p className="text-3xl font-bold text-primary">
                {candidate.experience}
              </p>
              <p className="text-sm text-muted-foreground">
                {candidate.experience === 1 ? "year" : "years"} of experience
              </p>
            </Card>

            {/* Links */}
            {(candidate.linkedin || candidate.portfolio) && (
              <Card className="p-6">
                <h2 className="text-lg font-semibold text-foreground mb-4">
                  Links
                </h2>
                <div className="space-y-2">
                  {candidate.linkedin && (
                    <a
                      href={candidate.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-primary hover:underline"
                    >
                      <Linkedin className="w-4 h-4" />
                      LinkedIn Profile
                    </a>
                  )}
                  {candidate.portfolio && (
                    <a
                      href={candidate.portfolio}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-primary hover:underline"
                    >
                      <Globe className="w-4 h-4" />
                      Portfolio
                    </a>
                  )}
                </div>
              </Card>
            )}

            {/* Actions */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4">
                Actions
              </h2>
              <div className="space-y-2">
                <Button
                  onClick={() => setShortlistDialogOpen(true)}
                  disabled={actionLoading || candidate.status === "shortlisted"}
                  variant={
                    candidate.status === "shortlisted" ? "default" : "outline"
                  }
                  className="w-full"
                >
                  Shortlist
                </Button>
                <Button
                  onClick={() => setSelectDialogOpen(true)}
                  disabled={actionLoading || candidate.status === "selected"}
                  variant={
                    candidate.status === "selected" ? "default" : "outline"
                  }
                  className="w-full"
                >
                  Select
                </Button>
                <Button
                  onClick={() => setRejectDialogOpen(true)}
                  disabled={actionLoading || candidate.status === "rejected"}
                  variant={
                    candidate.status === "rejected" ? "destructive" : "outline"
                  }
                  className="w-full"
                >
                  Reject
                </Button>
              </div>
            </Card>
          </div>

          {/* Right Column - Resume and Cover Letter */}
          <div className="lg:col-span-2 space-y-6">
            {/* Cover Letter */}
            {candidate.coverLetter && (
              <Card className="p-6">
                <h2 className="text-lg font-semibold text-foreground mb-4">
                  Cover Letter
                </h2>
                <div className="prose prose-sm max-w-none text-foreground">
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">
                    {candidate.coverLetter}
                  </p>
                </div>
              </Card>
            )}

            {/* Resume Preview */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-foreground">
                  Resume
                </h2>
                <a
                  href={candidate.resumeUrl}
                  download
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 bg-transparent"
                  >
                    <Download className="w-4 h-4" />
                    Download
                  </Button>
                </a>
              </div>

              {/* Resume Preview - PDF Iframe */}
              <div className="bg-muted rounded-lg overflow-hidden">
                <iframe
                  src={`${candidate.resumeUrl}#toolbar=0`}
                  className="w-full h-[620px] border-0"
                  title="Resume Preview"
                />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                If the preview doesn&apos;t load, please{" "}
                <a
                  href={candidate.resumeUrl}
                  className="text-primary hover:underline"
                >
                  download the resume
                </a>
                .
              </p>
            </Card>
          </div>
        </div>
      </div>

      <SelectCandidateDialog
        open={selectDialogOpen}
        onClose={() => setSelectDialogOpen(false)}
        onSubmit={handleSelectCandidate}
        loading={actionLoading}
      />
      <ShortlistCandidateDialog
        open={shortlistDialogOpen}
        onClose={() => setShortlistDialogOpen(false)}
        onSubmit={handleShortlistCandidate}
        loading={actionLoading}
      />
      <RejectCandidateDialog
        open={rejectDialogOpen}
        onClose={() => setRejectDialogOpen(false)}
        onSubmit={handleRejectCandidate}
        loading={actionLoading}
      />
    </div>
  );
}
