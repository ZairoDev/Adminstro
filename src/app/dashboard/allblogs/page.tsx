"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
} from "@/components/ui/pagination";
import { format } from "date-fns";
import { Input } from "@/components/ui/input";
import debounce from "lodash.debounce";
import Loader from "@/components/loader";
import Link from "next/link";
import { FilePenLine, User } from "lucide-react";
import { Button } from "@/components/ui/button";

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
    <div className=" p-2">
      <div className="flex w-full items-center ">
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
        <div className="text-center mt-4">Searching...</div>
      ) : (
        <div className="flex mt-4 flex-col gap-y-4">
          {blogs.length > 0 ? (
            blogs.map((blog) => (
              <Link
                className=" hover:opacity-80 py-2 rounded-lg "
                key={blog._id}
                href={`/dashboard/allblogs/${blog._id}`}
              >
                <div
                  key={blog._id}
                  className=" cursor-pointer  border-0 shadow-none"
                >
                  <div className="flex justify-between border-b pb-2">
                    <div>
                      <div className="">
                        <div className="flex text-xs items-center gap-x-2 mb-0">
                          <div>
                            <div className="h-10 w-10 rounded-full border-full border flex items-center justify-center">
                              <p className="text-lg font-bold">
                                {blog.author.charAt(0).toUpperCase()}
                              </p>
                            </div>
                          </div>
                          <div>
                            <p className="line-clamp-1">{blog.author}</p>
                          </div>
                        </div>
                        <p className="sm:text-xl ml-2 mt-1 line-clamp-1 text-lg p-0 font-semibold">
                          {blog.title}
                        </p>
                      </div>
                      <div className="ml-2 ">
                        <p className="sm:text-base  line-clamp-2 max-w-4xl text-sm">
                          {blog.maintext}
                        </p>
                        <div className="flex justify-between">
                          <div>
                            <p className=" line-clamp-1 opacity-60 sm:text-sm text-xs mt-4">
                              {format(
                                new Date(blog.createdAt),
                                "MMMM dd, yyyy"
                              )}
                            </p>
                          </div>
                        </div>

                        <div className="flex justify-between w-full items-center">
                          <div className="mt-2 flex flex-wrap gap-2 flex-grow">
                            {blog.tags
                              .slice(0, 3)
                              .map((tag: any, index: any) => (
                                <span
                                  key={index}
                                  className="text-xs border opacity-40 rounded-lg px-2 py-1"
                                >
                                  {tag}
                                </span>
                              ))}
                          </div>

                          {/* Edit button */}
                          <div className=" absolute right-3 inline-block ml-2">
                            <Link
                              href={`/dashboard/allblogs/editblog/${blog._id}`}
                            >
                              <Button
                                variant="outline"
                                className="flex  px-3 py-0 text-xs sm:text-sm items-center gap-x-2"
                              >
                                <FilePenLine size={12} />
                              </Button>
                            </Link>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="">
                      <img
                        className="w-40 rounded-lg object-cover"
                        src={blog.banner}
                        alt="Blog Image"
                      />
                    </div>
                  </div>
                </div>
              </Link>
            ))
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
  );
};

export default BlogList;
