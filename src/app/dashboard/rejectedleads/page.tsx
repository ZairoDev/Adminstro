"use client";

import LeadTable from "@/components/leadTable/LeadTable";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
} from "@/components/ui/pagination";
import { useToast } from "@/hooks/use-toast";
import { IQuery } from "@/util/type";
import axios from "axios";
import debounce from "lodash.debounce";
import { useCallback, useEffect, useState } from "react";

const RejectedLeads = () => {
  const { toast } = useToast();
  const [rejectedLeads, setRejectedLeads] = useState<IQuery[]>([]);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [skip, setSkip] = useState(0);
  const [page, setPage] = useState<number>(1);

  const fetchRejectedLeads = async () => {
    try {
      const response = await axios.post("/api/sales/getRejectedLeads", {
        page,
        skip,
      });
      setRejectedLeads(response.data.rejectedLeads);
      setTotalPages(Math.ceil(response.data.totalRejectedLeads / 10));
    } catch (err: any) {
      toast({
        variant: "destructive",
        description: err.message,
      });
    }
  };

  useEffect(() => {
    fetchRejectedLeads();
  }, [page]);

  // useEffect(() => {
  //   fetchRejectedLeads();
  // }, []);

  const renderPaginationItems = () => {
    let items = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(1, page - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    if (startPage > 1) {
      items.push(
        <PaginationItem key="start-ellipsis">
          <PaginationEllipsis />
        </PaginationItem>
      );
    }
    for (let i = startPage; i <= endPage; i++) {
      items.push(
        <PaginationItem key={i}>
          <PaginationLink
            href="#"
            isActive={page === i}
            onClick={(e) => {
              e.preventDefault();
              setPage(i);
            }}
          >
            {i}
          </PaginationLink>
        </PaginationItem>
      );
    }
    if (endPage < totalPages) {
      items.push(
        <PaginationItem key="end-ellipsis">
          <PaginationEllipsis />
        </PaginationItem>
      );
    }
    return items;
  };

  return (
    <div className="mt-2 border rounded-lg min-h-[90vh]">
      {rejectedLeads.length > 0 && <LeadTable queries={rejectedLeads} />}
      <Pagination className="flex items-center">
        <PaginationContent className="text-xs flex flex-wrap justify-end w-full md:w-auto">
          {renderPaginationItems()}
        </PaginationContent>
      </Pagination>
    </div>
  );
};

export default RejectedLeads;
