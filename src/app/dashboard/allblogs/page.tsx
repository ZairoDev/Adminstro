"use client";

import React, { useEffect, useState } from "react";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";

const BlogList = () => {
  const [blogs, setBlogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBlogs = async () => {
      try {
        const response = await axios.get("/api/blog/getblog");
        setBlogs(response.data.data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchBlogs();
  }, []);

  if (loading) {
    return <div className="text-center">Loading...</div>;
  }

  if (error) {
    return <div className="text-red-600 text-center">Error: {error}</div>;
  }

  return (
    <div className="border rounded-lg p-2">
      <div className="border-b">
        <h1 className="text-2xl pb-2 text-center font-semibold">
          Created Blog
        </h1>
      </div>
      <div className="flex mt-2 flex-col gap-y-2">
        {blogs.map((blog) => (
          <Card key={blog._id} className="p-3">
            <div className="flex justify-between">
              <div>
                <CardHeader className="p-0">
                  <CardTitle className="sm:text-xl line-clamp-1 text-lg p-0 font-bold">
                    {blog.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <p className="sm:text-base line-clamp-2 max-w-4xl text-sm">
                    {blog.maintext}
                  </p>
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-primary/40 line-clamp-1 sm:text-sm text-xs mt-10">
                        {format(new Date(blog.createdAt), "MMMM dd, yyyy")}
                      </p>
                    </div>
                  </div>
                  {/* Displaying tags */}
                  <div className="mt-2 flex flex-wrap gap-2">
                    {blog.tags.slice(0, 5).map((tag: any, index: any) => (
                      <span
                        key={index}
                        className="bg-gray-200 text-gray-700 px-2 py-1 rounded-full text-xs"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </CardContent>
              </div>
              <div>
                <img
                  className=" w-40 rounded-lg object-cover"
                  src="https://miro.medium.com/v2/resize:fit:720/format:webp/0*fo0H05oTTridLQMn"
                  alt="Blog Image"
                />
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default BlogList;
