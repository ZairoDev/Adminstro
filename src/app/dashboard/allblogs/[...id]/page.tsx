
"use client";
import React, { useEffect, useState } from "react";
import axios from "axios";
import { format } from "date-fns";

interface PageProps {
  params: {
    id: string;
  };
}

const BlogPage = ({ params }: PageProps) => {
  const id = params.id; // Get the blog ID from params
  const [blog, setBlog] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBlog = async () => {
    if (id) {
      setLoading(true);
      try {
        const response = await axios.post("/api/blog/readblog", { id }); // Send ID in body
        setBlog(response.data.data);
        console.log(response.data.data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchBlog();
  }, [id]);

  if (loading) {
    return <div className="text-center">Loading...</div>;
  }

  if (error) {
    return <div className="text-red-600 text-center">Error: {error}</div>;
  }

  if (!blog) {
    return <div className="text-center">No blog found</div>;
  }

  return (
    <div className="p-4">
      <div className="max-w-4xl m-auto">
        <h1 className="md:text-5xl sm:text-4xl text-3xl font-bold">
          {blog.title}
        </h1>
        <div>
          <p className="md:text-xl sm:text-lg text-base mt-2  ">
            {blog.maintext}
          </p>
          <p className="text-gray-500 mt-4">
            {format(new Date(blog.createdAt), "MMMM dd, yyyy")}
          </p>

          <div className="mt-2 flex flex-wrap gap-2">
            {blog.tags.slice(0, 5).map((tag: string, index: number) => (
              <span
                key={index}
                className="bg-gray-200 text-gray-700 px-2 py-1 rounded-full text-xs"
              >
                {tag}
              </span>
            ))}
          </div>
          <img
            className="mt-4 w-full rounded-lg object-cover"
            src={blog.banner}
            alt="Blog Image"
          />

          <div
            className="prose prose-lg dark:prose-invert blue:prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: blog.content }}
          />
        </div>
      </div>
    </div>
  );
};

export default BlogPage;
