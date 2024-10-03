// "use client";
// import React, { useEffect, useState } from "react";
// import axios from "axios";
// import { format } from "date-fns";
// import Loader from "@/components/loader";

// interface PageProps {
//   params: {
//     id: string;
//   };
// }
// const BlogPage = ({ params }: PageProps) => {
//   const id = params.id;
//   const [blog, setBlog] = useState<any>(null);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState<string | null>(null);

//   const fetchBlog = async () => {
//     if (id) {
//       setLoading(true);
//       try {
//         const response = await axios.post("/api/blog/readblog", { id });
//         setBlog(response.data.data);
//         console.log(response.data.data);
//       } catch (err: any) {
//         setError(err.message);
//       } finally {
//         setLoading(false);
//       }
//     }
//   };
//   useEffect(() => {
//     fetchBlog();
//   }, [id]);

//   if (loading) {
//     return (
//       <div className="text-center">
//         <Loader />
//       </div>
//     );
//   }

//   if (error) {
//     return <div className="text-red-600 text-center">{error}</div>;
//   }

//   if (!blog) {
//     return <div className="text-center">No blog found</div>;
//   }

//   return (
//     <div className="p-1">
//       <div className="max-w-5xl m-auto">
//         <img
//           className="
//             mt-4 mx-auto rounded-lg 
//             object-cover w-full md:h-96 h-44
//           "
//           src={blog.banner}
//           alt="Blog Image"
//         />

//         <h1 className="md:text-5xl text-center sm:text-4xl text-3xl mt-2 font-bold">
//           {blog.title}
//         </h1>
//         <div>
//           <p className="md:text-xl text-center sm:text-lg text-base mt-2  ">
//             {blog.maintext}
//           </p>

//           <div className="mt-4">
//             <div className="flex flex-col sm:flex-row items-center sm:justify-center gap-y-2 sm:gap-x-4 text-center">
//               <p className="text-gray-500">Written by: {blog.author}</p>
//               <p className="text-gray-500">
//                 On: {format(new Date(blog.createdAt), "MMMM dd, yyyy")}
//               </p>
//             </div>
//           </div>

//           <div className="mt-2 flex items-center justify-center flex-wrap gap-2">
//             {blog.tags.slice(0, 5).map((tag: string, index: number) => (
//               <span
//                 key={index}
//                 className="bg-gray-200 text-gray-700 px-2 py-1 rounded-full text-xs"
//               >
//                 {tag}
//               </span>
//             ))}
//           </div>

//           <div
//             className=" prose mt-2 max-w-none prose-sm sm:prose-sm md:prose-base lg:prose-lg xl:prose-xl dark:prose-invert  sm:mt-4 md:mt-6 lg:mt-8 sm:px-2 md:px-4 lg:px-6 xl:px-8 "
//             dangerouslySetInnerHTML={{ __html: blog.content }}
//           />
//         </div>
//       </div>
//     </div>
//   );
// };

// export default BlogPage;


"use client";
import React, { useEffect, useState } from "react";
import axios from "axios";
import { format } from "date-fns";
import Loader from "@/components/loader";
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
  const id = params.id;
  const [blog, setBlog] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false); // For delete loading state

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
      const response = await axios.delete("/api/blog/deleteblog", {
        data: { id }, // Sending the blog ID in the request body
      });

      if (response.data.success) {
        alert("Blog deleted successfully!");
        // Redirect or refresh the page after deletion
        window.location.href = "/";
      } else {
        setError("Failed to delete blog.");
      }
    } catch (error: any) {
      setError(error.message);
    } finally {
      setDeleteLoading(false);
    }
  };

  useEffect(() => {
    fetchBlog();
  }, [id]);

  if (loading) {
    return (
      <div className="text-center">
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
        <img
          className="mt-4 mx-auto rounded-lg object-cover w-full md:h-96 h-44"
          src={blog.banner}
          alt="Blog Image"
        />

        <h1 className="md:text-5xl text-center sm:text-4xl text-3xl mt-2 font-bold">
          {blog.title}
        </h1>
        <div>
          <p className="md:text-xl text-center sm:text-lg text-base mt-2">
            {blog.maintext}
          </p>

          <div className="mt-4">
            <div className="flex flex-col sm:flex-row items-center sm:justify-center gap-y-2 sm:gap-x-4 text-center">
              <p className="text-gray-500">Written by: {blog.author}</p>
              <p className="text-gray-500">
                On: {format(new Date(blog.createdAt), "MMMM dd, yyyy")}
              </p>
            </div>
          </div>

          <div className="mt-2 flex items-center justify-center flex-wrap gap-2">
            {blog.tags.slice(0, 5).map((tag: string, index: number) => (
              <span
                key={index}
                className="bg-gray-200 text-gray-700 px-2 py-1 rounded-full text-xs"
              >
                {tag}
              </span>
            ))}
          </div>

          <div
            className="prose mt-2 max-w-none prose-sm sm:prose-sm md:prose-base lg:prose-lg xl:prose-xl dark:prose-invert sm:mt-4 md:mt-6 lg:mt-8 sm:px-2 md:px-4 lg:px-6 xl:px-8"
            dangerouslySetInnerHTML={{ __html: blog.content }}
          />

          {/* Delete Blog Button with Alert */}
          <div className="flex justify-center mt-6">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700">
                  Delete Blog
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Confirm Blog Deletion</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete this blog? This action
                    cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction asChild>
                    <button
                      onClick={deleteBlog}
                      disabled={deleteLoading}
                      className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
                    >
                      {deleteLoading ? "Deleting..." : "Delete Blog"}
                    </button>
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BlogPage;
