"use client";
import Heading from "@/components/Heading";
import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useDebounce } from "use-debounce";
import { useToast } from "@/hooks/use-toast";

const HrPortal = () => {
  const { toast } = useToast();
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalCandidates: 0,
    hasMore: false,
  });
  const [debouncedSearchTerm] = useDebounce(searchTerm, 2000);
  const fetchCandidates = async (page = 1, search = "") => {
    try {
      setLoading(true);
      const response = await axios.get(
        `/api/hrportal/getCandidate?page=${page}&search=${search}`
      );
      setCandidates(response.data.candidates);
      setPagination(response.data.pagination);
      setLoading(false);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch candidates. Please try again later.",
      });
      setLoading(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCandidates(currentPage, debouncedSearchTerm);
  }, [currentPage, debouncedSearchTerm]);

  const handleSearch = (e: any) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const handleNextPage = () => {
    if (pagination.hasMore) {
      setCurrentPage((prev) => prev + 1);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage((prev) => prev - 1);
    }
  };

  return (
    <>
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="animate-spin" size={18} />
        </div>
      ) : (
        <div className="w-full space-y-4">
          <div className="flex md:items-center flex-col md:flex-row w-full justify-between">
            <Heading
              heading="HR Portal"
              subheading="Candidates in queue are shown below. Take the required actions."
            />
            <div className=" md:w-auto w-full">
              <Input
                placeholder="Search by email or name"
                value={searchTerm}
                onChange={handleSearch}
                className="w-full"
              />
            </div>
          </div>
          {candidates.length === 0 ? (
            <div className="text-center mt-2 ">No candidates found.</div>
          ) : (
            <>
              <div className="overflow-x-auto border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Position</TableHead>
                      <TableHead>Queue Number</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {candidates.map((candidate: any) => (
                      <TableRow key={candidate?._id}>
                        <TableCell>{candidate?.name}</TableCell>
                        <TableCell>{candidate?.email}</TableCell>
                        <TableCell>{candidate?.phone}</TableCell>
                        <TableCell>{candidate?.position}</TableCell>
                        <TableCell>{candidate?.queueNumber}</TableCell>
                        <TableCell>{candidate?.status}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between px-2">
                <div className="text-sm text-gray-500">
                  Total Candidates: {pagination.totalCandidates}
                </div>
                <div className="flex items-center gap-4">
                  <Button
                    variant="outline"
                    onClick={handlePrevPage}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  <span className="text-sm">
                    Page {pagination.currentPage} of {pagination.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    onClick={handleNextPage}
                    disabled={!pagination.hasMore}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
};

export default HrPortal;
