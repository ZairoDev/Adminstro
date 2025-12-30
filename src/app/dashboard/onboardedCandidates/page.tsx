"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Eye,
  MoreVertical,
  Mail,
  CheckCircle2,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";
import { NotesModal } from "../candidatePortal/components/notes-modal";

interface Candidate {
  _id: string;
  name: string;
  email: string;
  phone: string;
  position: string;
  experience: number;
  status: "pending" | "shortlisted" | "selected" | "rejected" | "onboarding";
  createdAt: string;
  onboardingDetails?: {
    onboardingComplete?: boolean;
    completedAt?: string;
  };
}

const ROLE_OPTIONS = [
  "Developer",
  "LeadGen",
  "Sales",
  "Marketing",
  "HR",
];

interface PaginationData {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export default function OnboardedCandidatesPage() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<PaginationData | null>(null);
  const [loading, setLoading] = useState(false);
  const [notesDialogOpen, setNotesDialogOpen] = useState(false);
  const [notesCandidate, setNotesCandidate] = useState<Candidate | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>("all");
  const [experienceFilter, setExperienceFilter] = useState<string>("all");
  const [availableRoles, setAvailableRoles] = useState<string[]>(ROLE_OPTIONS);

  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const response = await fetch("/api/candidates/positions");
        const result = await response.json();
        if (result.success && result.data.length > 0) {
          setAvailableRoles(result.data);
        }
      } catch (error) {
        console.error("Error fetching roles:", error);
      }
    };
    fetchRoles();
  }, []);

  const fetchCandidates = async (
    searchTerm: string,
    pageNum: number,
    roleFilter?: string,
    expFilter?: string
  ) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pageNum.toString(),
        limit: "10",
        onboarded: "true",
      });
      if (searchTerm) {
        params.append("search", searchTerm);
      }
      if (roleFilter && roleFilter !== "all") {
        params.append("position", roleFilter);
      }
      if (expFilter && expFilter !== "all") {
        params.append("experienceFilter", expFilter);
      }

      const response = await fetch(`/api/candidates?${params}`);
      const result = await response.json();

      if (result.success) {
        setCandidates(result.data);
        setPagination(result.pagination);
      }
    } catch (error) {
      console.error("Error fetching candidates:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCandidates(search, 1, selectedRole, experienceFilter);
      setPage(1);
    }, 500);

    return () => clearTimeout(timer);
  }, [search, selectedRole, experienceFilter]);

  useEffect(() => {
    fetchCandidates(search, page, selectedRole, experienceFilter);
  }, [page]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "selected":
        return "bg-green-100 text-green-800 hover:bg-green-200";
      case "shortlisted":
        return "bg-blue-100 text-blue-800 hover:bg-blue-200";
      case "rejected":
        return "bg-red-100 text-red-800 hover:bg-red-200";
      case "onboarding":
        return "bg-purple-100 text-purple-800 hover:bg-purple-200";
      case "pending":
      default:
        return "bg-yellow-100 text-yellow-800 hover:bg-yellow-200";
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const handleAddNote = (candidate: Candidate) => {
    setNotesCandidate(candidate);
    setNotesDialogOpen(true);
  };

  const CandidateTable = () => (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-muted border-b border-border">
          <tr>
            <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">
              Name
            </th>
            <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">
              Email
            </th>
            <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">
              Phone
            </th>
            <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">
              Role
            </th>
            <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">
              Experience
            </th>
            <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">
              Status
            </th>
            <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">
              Onboarded
            </th>
            <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {loading ? (
            <tr>
              <td colSpan={8} className="px-6 py-8 text-center">
                <div className="flex justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              </td>
            </tr>
          ) : candidates.length === 0 ? (
            <tr>
              <td
                colSpan={8}
                className="px-6 py-8 text-center text-muted-foreground"
              >
                No onboarded candidates found
              </td>
            </tr>
          ) : (
            candidates.map((candidate: Candidate) => (
              <tr
                key={candidate._id}
                className="hover:bg-muted/50 transition-colors"
              >
                <td className="px-6 py-4">
                  <div className="font-medium text-foreground">
                    {candidate.name}
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-muted-foreground">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          className="flex items-center gap-2 hover:text-foreground transition-colors"
                          onClick={() => {
                            navigator.clipboard.writeText(candidate.email);
                            toast.success("Email copied to clipboard");
                          }}
                        >
                          <Mail className="h-4 w-4" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{candidate.email}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </td>
                <td className="px-6 py-4 text-sm text-muted-foreground">
                  ****{candidate.phone?.slice(-4)}
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-foreground">
                    {candidate.position}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-foreground">
                    {candidate.experience === 0
                      ? "Fresher"
                      : `${candidate.experience} ${candidate.experience === 1 ? "year" : "years"}`}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <Badge className={getStatusColor(candidate.status)}>
                    {candidate.status === "selected"
                      ? "Selected for Training"
                      : candidate.status === "onboarding"
                      ? "Onboarding"
                      : candidate?.status?.charAt(0).toUpperCase() +
                        candidate?.status?.slice(1)}
                  </Badge>
                </td>
                <td className="px-6 py-4 text-sm text-muted-foreground">
                  {candidate.onboardingDetails?.completedAt
                    ? formatDate(candidate.onboardingDetails.completedAt)
                    : "N/A"}
                </td>
                <td className="px-6 py-4">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <span className="sr-only">Open menu</span>
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link
                          href={`/dashboard/candidatePortal/${candidate._id}`}
                          className="flex items-center cursor-pointer"
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          View Details
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleAddNote(candidate)}
                        className="flex items-center cursor-pointer"
                      >
                        <FileText className="mr-2 h-4 w-4" />
                        Add Note
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-2">
            <CheckCircle2 className="h-8 w-8" />
            Onboarded Candidates
          </h1>
          <p className="text-muted-foreground">
            View and manage candidates who have completed onboarding
          </p>
        </div>

        {/* Search Bar and Filters */}
        <Card className="mb-6 p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, or role..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2 w-full lg:w-auto">
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger className="h-10 w-full lg:w-[150px]">
                  <SelectValue placeholder="Filter by Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  {availableRoles.map((role) => (
                    <SelectItem key={role} value={role}>
                      {role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={experienceFilter}
                onValueChange={setExperienceFilter}
              >
                <SelectTrigger className="h-10 w-full lg:w-[150px]">
                  <SelectValue placeholder="Experience" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Experience</SelectItem>
                  <SelectItem value="fresher">Fresher</SelectItem>
                  <SelectItem value="experienced">Experienced</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>

        {/* Table */}
        <Card className="overflow-hidden">
          <CandidateTable />

          {/* Pagination */}
          {pagination && pagination.pages > 1 && (
            <div className="px-6 py-4 border-t border-border flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Showing {(page - 1) * pagination.limit + 1} to{" "}
                {Math.min(page * pagination.limit, pagination.total)} of{" "}
                {pagination.total} onboarded candidates
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, pagination.pages) }).map(
                    (_, i) => {
                      let pageNum;
                      if (pagination.pages <= 5) {
                        pageNum = i + 1;
                      } else if (page <= 3) {
                        pageNum = i + 1;
                      } else if (page >= pagination.pages - 2) {
                        pageNum = pagination.pages - 4 + i;
                      } else {
                        pageNum = page - 2 + i;
                      }

                      return (
                        <Button
                          key={pageNum}
                          variant={page === pageNum ? "default" : "outline"}
                          size="sm"
                          onClick={() => setPage(pageNum)}
                          className="w-8"
                        >
                          {pageNum}
                        </Button>
                      );
                    }
                  )}
                  {pagination.pages > 5 && page < pagination.pages - 2 && (
                    <>
                      <span className="px-2">...</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(pagination.pages)}
                        className="w-8"
                      >
                        {pagination.pages}
                      </Button>
                    </>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page + 1)}
                  disabled={page === pagination.pages}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Notes Modal */}
      {notesCandidate && (
        <NotesModal
          open={notesDialogOpen}
          onOpenChange={setNotesDialogOpen}
          candidateId={notesCandidate._id}
          candidateName={notesCandidate.name}
        />
      )}
    </div>
  );
}

