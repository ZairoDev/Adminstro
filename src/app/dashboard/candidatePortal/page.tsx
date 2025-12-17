"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Eye,
  MoreVertical,
  UserPlus,
  Users,
  Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface Candidate {
  _id: string;
  name: string;
  email: string;
  phone: string;
  position: string;
  experience: number;
  status: "pending" | "shortlisted" | "selected" | "rejected";
  createdAt: string;
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

export default function CandidatesPage() {
  const router = useRouter();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<PaginationData | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "all" | "shortlisted" | "selected" | "rejected"
  >("all");
  const [editRoleDialogOpen, setEditRoleDialogOpen] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [newRole, setNewRole] = useState("");
  const [updatingRole, setUpdatingRole] = useState(false);

  const fetchCandidates = async (
    searchTerm: string,
    pageNum: number,
    statusFilter?: string
  ) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pageNum.toString(),
        limit: "10",
      });
      if (searchTerm) {
        params.append("search", searchTerm);
      }
      if (statusFilter && statusFilter !== "all") {
        params.append("status", statusFilter);
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
      fetchCandidates(search, 1, activeTab);
      setPage(1);
    }, 500);

    return () => clearTimeout(timer);
  }, [search, activeTab]);

  useEffect(() => {
    fetchCandidates(search, page, activeTab);
  }, [page]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "selected":
        return "bg-green-100 text-green-800 hover:bg-green-200";
      case "shortlisted":
        return "bg-blue-100 text-blue-800 hover:bg-blue-200";
      case "rejected":
        return "bg-red-100 text-red-800 hover:bg-red-200";
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

  const handleCreateEmployee = (candidateId: string) => {
    // Navigate to employee creation page with candidate ID
    router.push(`/employees/create?candidateId=${candidateId}`);
  };

  const handleEditRole = (candidate: Candidate) => {
    setSelectedCandidate(candidate);
    setNewRole(candidate.position);
    setEditRoleDialogOpen(true);
  };

  const handleUpdateRole = async () => {
    if (!selectedCandidate || !newRole) return;

    setUpdatingRole(true);
    try {
      const response = await fetch(`/api/candidates/${selectedCandidate._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ position: newRole }),
      });

      const result = await response.json();
      if (result.success) {
        setCandidates((prev) =>
          prev.map((c) =>
            c._id === selectedCandidate._id ? { ...c, position: newRole } : c
          )
        );
        toast.success("Role updated successfully");
        setEditRoleDialogOpen(false);
      } else {
        toast.error(result.error || "Failed to update role");
      }
    } catch (error) {
      console.error("Error updating role:", error);
      toast.error("Failed to update role");
    } finally {
      setUpdatingRole(false);
    }
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
              Applied
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
                <td className="px-6 py-4 text-sm text-muted-foreground">
                  {candidate.phone}
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
                          href={`candidatePortal/${candidate._id}`}
                          className="flex items-center cursor-pointer"
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          View Details
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleEditRole(candidate)}
                        className="flex items-center cursor-pointer"
                      >
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit Role
                      </DropdownMenuItem>
                      {candidate.status === "selected" && (
                        <DropdownMenuItem
                          onClick={() => handleCreateEmployee(candidate._id)}
                          className="flex items-center cursor-pointer"
                        >
                          <UserPlus className="mr-2 h-4 w-4" />
                          Create Employee
                        </DropdownMenuItem>
                      )}
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
                placeholder="Search by name, email, or role..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </Card>

        {/* Tabs and Table */}
        <Tabs
          value={activeTab}
          onValueChange={(value) => {
            setActiveTab(value as typeof activeTab);
            setPage(1);
          }}
          className="w-full"
        >
          <TabsList className="grid w-full max-w-md grid-cols-4 mb-6">
            <TabsTrigger value="all" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              All
            </TabsTrigger>
            <TabsTrigger value="shortlisted">Shortlisted</TabsTrigger>
            <TabsTrigger value="selected">Selected</TabsTrigger>
            <TabsTrigger value="rejected">Rejected</TabsTrigger>
          </TabsList>

          <Card className="overflow-hidden">
            <TabsContent value="all" className="m-0">
              <CandidateTable />
            </TabsContent>
            <TabsContent value="shortlisted" className="m-0">
              <CandidateTable />
            </TabsContent>
            <TabsContent value="selected" className="m-0">
              <CandidateTable />
            </TabsContent>
            <TabsContent value="rejected" className="m-0">
              <CandidateTable />
            </TabsContent>

            {/* Pagination */}
            {pagination && pagination.pages > 1 && (
              <div className="px-6 py-4 border-t border-border flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  Showing {(page - 1) * pagination.limit + 1} to{" "}
                  {Math.min(page * pagination.limit, pagination.total)} of{" "}
                  {pagination.total} {activeTab !== "all" ? activeTab : ""}{" "}
                  candidates
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
        </Tabs>
      </div>

      {/* Edit Role Dialog */}
      <Dialog open={editRoleDialogOpen} onOpenChange={setEditRoleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Role</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <label className="text-sm font-medium mb-2 block">
              Role for {selectedCandidate?.name}
            </label>
            <Select value={newRole} onValueChange={setNewRole}>
              <SelectTrigger>
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                {/* Include current role if not in options */}
                {selectedCandidate?.position &&
                  !ROLE_OPTIONS.includes(selectedCandidate.position) && (
                    <SelectItem value={selectedCandidate.position}>
                      {selectedCandidate.position} (Current)
                    </SelectItem>
                  )}
                {ROLE_OPTIONS.map((role) => (
                  <SelectItem key={role} value={role}>
                    {role}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditRoleDialogOpen(false)}
              disabled={updatingRole}
            >
              Cancel
            </Button>
            <Button onClick={handleUpdateRole} disabled={updatingRole}>
              {updatingRole ? "Updating..." : "Update Role"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
