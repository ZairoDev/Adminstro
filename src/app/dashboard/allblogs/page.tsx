"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
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
import Loader from "@/components/loader";
import Link from "next/link";
import { FilePenLine } from "lucide-react";
import Img from "@/components/Img";
import Animation from "@/components/animation";
import Heading from "@/components/Heading";

const BlogList = () => {
  const [blogs, setBlogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const fetchBlogs = async (search = "", page = 1) => {
    setLoading(true);
    setSearching(true);
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
      setSearching(false);
    }
  };

  // Debounced search handler
  const debouncedFetchBlogs = useCallback(
    debounce((query) => {
      fetchBlogs(query, 1);
    }, 1000),
    []
  );

  useEffect(() => {
    debouncedFetchBlogs(searchTerm);
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [searchTerm, debouncedFetchBlogs]);

  useEffect(() => {
    fetchBlogs(searchTerm, currentPage);
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [currentPage]);

  // Auto-focus the input when the component mounts
  if (loading) {
    return (
      <div className="flex items-center justify-center">
        <Loader />
      </div>
    );
  }

  if (error) {
    return <div className="text-red-600 text-center">Error: {error}</div>;
  }

  return (
    <Animation>
      <div className=" ">
        <Heading
          heading="All blogs"
          subheading="You will see the newly created item at the top."
        />
        <div className=" ">
          <Input
            type="text"
            ref={searchInputRef}
            placeholder="Search by tag..."
            className="max-w-xl"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            autoFocus
          />
        </div>
        {searching ? (
          <div className="">Searching...</div>
        ) : (
          <div className="w-full  ">
            {blogs.length > 0 ? (
              <div className=" grid gap-4 mb-4 justify-center mt-2 items-center grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xxl:grid-cols-4 ">
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
                          <Link
                            href={`/dashboard/allblogs/editblog/${blog._id}`}
                          >
                            <FilePenLine size={18} />
                          </Link>
                        </div>
                      </div>
                      <div className="flex p-2 justify-between">
                        <div>
                          <Link
                            className="w-full hover:opacity-60"
                            key={blog._id}
                            href={`/dashboard/allblogs/${blog._id}`}
                          >
                            <p className="text-base line-clamp-1 font-semibold">
                              {blog.title.slice(0, 15)}
                              {blog.title.length > 10 ? "..." : ""}
                            </p>
                            <p className="text-sm line-clamp-1 font-thin">
                              {blog.maintext.slice(0, 25)}
                              {blog.maintext.length > 25 ? "..." : ""}
                            </p>
                          </Link>
                        </div>
                        <div>
                          <div>
                            <p className="text-xs opacity-55 line-clamp-1 sm:hidden">
                              {format(new Date(blog.createdAt), "dd, yyyy")}
                            </p>

                            <p className="text-xs opacity-55 line-clamp-1 hidden sm:block">
                              {format(
                                new Date(blog.createdAt),
                                "MMMM dd, yyyy"
                              )}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center">No blogs found</div>
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
              {/* <PaginationPrevious
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              // disabled={currentPage === 1}
            /> */}
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
              {/* <PaginationNext
              onClick={() =>
                setCurrentPage((prev) => Math.min(prev + 1, totalPages))
              }
              // disabled={currentPage === totalPages}
            /> */}
            </PaginationContent>
          </Pagination>
        )}
      </div>
    </Animation>
  );
};

export default BlogList;
