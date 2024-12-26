"use client";

import axios from "axios";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import { BookOpen, CalendarFold, CircleUser, Trash2 } from "lucide-react";

import Loader from "@/components/loader";
import { useAuthStore } from "@/AuthStore";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface PageProps {
  params: {
    id: string;
  };
}
const BlogPage = ({ params }: PageProps) => {
  const { toast } = useToast();
  const router = useRouter();
  const { token } = useAuthStore();

  const id = params.id;
  const [blog, setBlog] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [confirmationText, setConfirmationText] = useState("");
  const requiredConfirmationText = "I have to delete";

  const fetchBlog = async () => {
    if (id) {
      setLoading(true);
      try {
        const response = await axios.post("/api/blog/readblog", { id });
        setBlog(response.data.data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
  };

  const deleteBlog = async () => {
    setDeleteLoading(true);
    try {
      const response = await axios.post("/api/blog/deleteblog", {
        id,
      });
      if (response.data.success) {
        toast({
          title: "Success",
          description: `${response.data.message}`,
        });
        router.push("/dashboard/allblogs");
      } else {
        setError("Failed to delete blog.");
      }
    } catch (error: any) {
      console.log(error);
      toast({
        variant: "destructive",
        title: "False",
        description: `${error.response.data.error}`,
      });
    } finally {
      setDeleteLoading(false);
    }
  };

  useEffect(() => {
    fetchBlog();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center">
        <Loader />
      </div>
    );
  }

  if (error) {
    return <div className="text-red-600 text-center">{error}</div>;
  }

  if (!blog) {
    return <div className="text-center">No blog found</div>;
  }

  return (
    <div className="p-1">
      <div className="max-w-5xl m-auto">
        <div className="relative mt-4 mx-auto w-full">
          <img
            className="rounded-lg object-cover w-full md:h-96 h-44"
            src={blog.banner}
            alt="Blog Image"
          />

          <h1 className="absolute inset-0 flex items-center justify-center text-center  md:text-5xl sm:text-4xl text-3xl font-semibold">
            {blog.title}
          </h1>
        </div>

        <div>
          <p className="md:text-xl text-center sm:text-lg text-sm mt-2">
            {blog.maintext}
          </p>
          <div className="mt-4">
            <div className="flex flex-col sm:flex-row items-center sm:justify-center gap-y-2 sm:gap-x-4 text-center">
              <p className="opacity-40 sm:text-sm text-xs flex items-center gap-x-2">
                <CircleUser size={12} />
                Written by: {blog.author}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-x-4 justify-center">
            <p className="opacity-40 sm:text-sm text-xs flex items-center gap-x-1 mt-1">
              <BookOpen size={12} />
              {Math.ceil(blog.totalWords / 200)} min read
            </p>

            <p className="opacity-40 sm:text-sm text-xs flex gap-x-1 items-center ">
              <CalendarFold size={12} /> On:{" "}
              {format(new Date(blog.createdAt), "MMMM dd, yyyy")}
            </p>
          </div>

          <div className="mt-2 flex opacity-40 items-center justify-center flex-wrap gap-2">
            {blog.tags.slice(0, 5).map((tag: string, index: number) => (
              <span key={index} className="text-xs border rounded-lg px-2 py-1">
                {tag}
              </span>
            ))}
          </div>

          <div
            className="prose mt-2 text-justify max-w-none prose-sm sm:prose-sm md:prose-base lg:prose-lg xl:prose-xl dark:prose-invert sm:mt-4 md:mt-6 lg:mt-8 sm:px-2 md:px-4 lg:px-6 xl:px-8"
            dangerouslySetInnerHTML={{ __html: blog.content }}
          />

          {(token?.role === "Content" || token?.role === "SuperAdmin") && (
            <div className="flex  mt-4">
              <AlertDialog>
                <AlertDialogTrigger asChild className="">
                  <Button
                    variant="destructive"
                    className="inline-block  fixed right-4 top-10 z-50"
                  >
                    <Trash2 size={14} />
                  </Button>
                </AlertDialogTrigger>

                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Confirm Blog Deletion</AlertDialogTitle>
                    <AlertDialogDescription>
                      Please type{" "}
                      <strong>&quot; I have to delete &quot; </strong> to
                      confirm deletion. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <div className="">
                    <Input
                      type="text"
                      value={confirmationText}
                      onChange={(e) => setConfirmationText(e.target.value)}
                      placeholder="Type 'I have to delete' here"
                    />
                  </div>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction asChild>
                      <Button
                        onClick={deleteBlog}
                        disabled={
                          confirmationText !== requiredConfirmationText ||
                          deleteLoading
                        }
                        className={`bg-red-600 text-white px-4 py-2 rounded-lg ${
                          confirmationText === requiredConfirmationText
                            ? "hover:bg-red-700"
                            : "opacity-50 cursor-not-allowed"
                        }`}
                      >
                        {deleteLoading ? "Deleting..." : "Delete Blog"}
                      </Button>
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BlogPage;
