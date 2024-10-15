"use client";
import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
} from "@/components/ui/pagination";
import { format } from "date-fns";
import { Input } from "@/components/ui/input";
import debounce from "lodash.debounce";
import Link from "next/link";
import { FilePenLine } from "lucide-react";

import Heading from "@/components/Heading";
import CardLoader from "@/components/CardLoader";

const BlogList = () => {
  const [blogs, setBlogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchBlogs = useCallback(async (search = "", page = 1) => {
    setLoading(true);
    try {
      const response = await axios.get(
        `/api/blog/getblog?search=${search}&page=${page}`
      );
      setBlogs(response.data.data);
      setTotalPages(response.data.totalPages);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const debouncedFetch = debounce(() => {
      fetchBlogs(searchTerm, currentPage);
    }, 900);

    debouncedFetch();
    return () => {
      debouncedFetch.cancel();
    };
  }, [searchTerm, currentPage, fetchBlogs]);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  if (error) {
    return <div className="text-red-600 text-center">Error: {error}</div>;
  }

  return (
    <div>
      <Heading
        heading="All blogs"
        subheading="You will see the newly created item at the top."
      />
      <div>
        <Input
          type="text"
          placeholder="Search by tag..."
          className="max-w-xl"
          value={searchTerm}
          onChange={handleSearch}
        />
      </div>
      {searching ? (
        <div>Searching...</div>
      ) : loading ? (
        <CardLoader />
      ) : (
        <div className="w-full">
          {blogs.length > 0 ? (
            <div className="grid gap-4 mb-4 justify-center mt-2 items-center xs:grid-cols-2 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xxl:grid-cols-4">
              {blogs.map((blog) => (
                <div className="w-full" key={blog._id}>
                  <div className="border rounded-lg sm:max-w-sm w-full h-full">
                    <div className="relative">
                      <img
                        className="rounded-t-lg h-56 w-full object-cover"
                        src={blog.banner}
                        alt="Blog Image"
                      />
                      <div className="absolute inline-block ml-2 top-2 right-2">
                        <Link href={`/dashboard/allblogs/editblog/${blog._id}`}>
                          <FilePenLine size={18} />
                        </Link>
                      </div>
                    </div>
                    <div className="flex p-2 justify-between">
                      <div>
                        <Link
                          className="w-full hover:opacity-60"
                          href={`/dashboard/allblogs/${blog._id}`}
                        >
                          <p className="text-base line-clamp-1 font-semibold">
                            {blog.title.slice(0, 15)}
                            {blog.title.length > 15 ? "..." : ""}
                          </p>
                          <p className="text-sm line-clamp-1 font-thin">
                            {blog.maintext.slice(0, 25)}
                            {blog.maintext.length > 25 ? "..." : ""}
                          </p>
                        </Link>
                      </div>
                      <div>
                        <p className="text-xs opacity-55 line-clamp-1 sm:hidden">
                          {format(new Date(blog.createdAt), "dd, yyyy")}
                        </p>
                        <p className="text-xs opacity-55 line-clamp-1 hidden sm:block">
                          {format(new Date(blog.createdAt), "MMMM dd, yyyy")}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center flex items-center justify-center mt-10">
              No blogs found
            </div>
          )}
        </div>
      )}

      {/* Pagination */}
      <div>
        <p className="text-xs">
          Page <span className="text-primary">{currentPage}</span> out of{" "}
          <span className="text-primary">{totalPages}</span>
        </p>
      </div>
      {totalPages > 1 && (
        <Pagination className="mt-8">
          <PaginationContent className="cursor-pointer">
            {Array.from({ length: totalPages }, (_, i) => (
              <PaginationItem key={i}>
                <PaginationLink
                  isActive={i + 1 === currentPage}
                  onClick={() => setCurrentPage(i + 1)}
                >
                  {i + 1}
                </PaginationLink>
              </PaginationItem>
            ))}
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
};
export default BlogList;
