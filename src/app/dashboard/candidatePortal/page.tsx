"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Search, ChevronLeft, ChevronRight, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Candidate {
  _id: string;
  name: string;
  email: string;
  position: string;
  experience: number;
  status: "pending" | "shortlisted" | "selected" | "rejected";
  createdAt: string;
}

interface PaginationData {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export default function CandidatesPage() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<PaginationData | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchCandidates = async (searchTerm: string, pageNum: number) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pageNum.toString(),
        limit: "10",
      });
      if (searchTerm) {
        params.append("search", searchTerm);
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
      fetchCandidates(search, 1);
      setPage(1);
    }, 500);

    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    fetchCandidates(search, page);
  }, [page]);

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

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className=" mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Candidates
          </h1>
          <p className="text-muted-foreground">
            Manage and review job applications
          </p>
        </div>

        {/* Search Bar */}
        <Card className="mb-6 p-4">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, or position..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </Card>

        {/* Table */}
        <Card className="overflow-hidden">
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
                    Position
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">
                    Experience
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">
                    Applied
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center">
                      <div className="flex justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                      </div>
                    </td>
                  </tr>
                ) : candidates.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-6 py-8 text-center text-muted-foreground"
                    >
                      No candidates found
                    </td>
                  </tr>
                ) : (
                  candidates.map((candidate) => (
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
                        {candidate.email}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-foreground">
                          {candidate.position}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-foreground">
                          {candidate.experience}{" "}
                          {candidate.experience === 1 ? "year" : "years"}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <Badge className={getStatusColor(candidate.status)}>
                          {candidate?.status?.charAt(0).toUpperCase() +
                            candidate?.status?.slice(1)}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">
                        {formatDate(candidate.createdAt)}
                      </td>
                      <td className="px-6 py-4">
                        <Link href={`candidatePortal/${candidate._id}`}>
                          <Button variant="ghost" size="sm" className="gap-2">
                            <Eye className="w-4 h-4" />
                            View
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination && pagination.pages > 1 && (
            <div className="px-6 py-4 border-t border-border flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Showing {(page - 1) * pagination.limit + 1} to{" "}
                {Math.min(page * pagination.limit, pagination.total)} of{" "}
                {pagination.total} candidates
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
                <div className="flex items-center gap-2">
                  {Array.from({ length: pagination.pages }).map((_, i) => (
                    <Button
                      key={i + 1}
                      variant={page === i + 1 ? "default" : "outline"}
                      size="sm"
                      onClick={() => setPage(i + 1)}
                    >
                      {i + 1}
                    </Button>
                  ))}
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
    </div>
  );
}
