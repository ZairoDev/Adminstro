"use client";
import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Editor from "@/components/editor/editor";
import { Plus, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBunnyUpload } from "@/hooks/useBunnyUpload";
import ScreenLoader from "@/components/ScreenLoader";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import Loader from "@/components/loader";

interface PageProps {
  params: {
    id: string;
  };
}

// const defaultValue = {
//   type: "doc",
//   content: [
//     {
//       type: "paragraph",
//       content: [
//         {
//           type: "text",
//           text: "Write something that people will love. Type / to get the option.",
//         },
//       ],
//     },
//   ],
// };

const EditBlogPage = ({ params }: PageProps) => {
  const id = params.id;
  const [blog, setBlog] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState<any>();
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [maintext, setMainText] = useState("");
  const [banner, setBanner] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [wordCount, setWordCount] = useState(0);
  const { uploadFiles } = useBunnyUpload();
  const { toast } = useToast();
  const router = useRouter();

  const fetchBlog = async () => {
    if (id) {
      setLoading(true);
      try {
        const response = await axios.post("/api/blog/readblog", { id });
        const blogData = response.data.data;
        setBlog(blogData);
        setTitle(blogData.title);
        setContent(blogData.content);
        setTags(blogData.tags);
        setMainText(blogData.maintext);
        setBanner(blogData.banner);
        setImagePreview(blogData.banner);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchBlog();
  }, []);

  const handleAddTag = () => {
    if (tagInput && !tags.includes(tagInput)) {
      setTags([...tags, tagInput]);
      setTagInput("");
    }
  };

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
  };

  const handleImageUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (file) {
      try {
        const { imageUrls, error } = await uploadFiles(file, "BannerImages");
        if (error) {
          console.error("Image upload error:", error);
          return;
        }
        if (imageUrls.length > 0) {
          const imageUrl = imageUrls[0];
          setBanner(imageUrl);
          setImagePreview(imageUrl);
        }
      } catch (error) {
        console.error("Image upload failed", error);
      }
    }
  };

  const handleSubmit = async () => {
    try {
      setUploading(true);
      const response = await axios.post("/api/blog/updateblog", {
        id: [id],
        title,
        content,
        tags,
        banner,
        maintext,
      });

      toast({
        title: "Success",
        description: "Your blog updated successfully.",
      });
      router.push("/dashboard/allblogs");
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Failed",
        description: "Something went wrong. Please try again.",
      });
    } finally {
      setUploading(false);
    }
  };

  const isFormValid = () => {
    return (
      title &&
      content &&
      maintext &&
      (banner || imagePreview) &&
      tags.length > 0
    );
  };

  if (loading)
    return (
      <div className="flex items-center justify-center">
        <Loader />
      </div>
    );
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <h1 className="text-3xl text-center border-b pb-2">Edit Blog</h1>
      <div className="max-w-5xl mx-auto p-1 pt-2">
        <div className="space-y-6">
          {/* Blog Title */}
          <div>
            <Label htmlFor="blogTitle" className="block mb-2">
              Blog Title
            </Label>
            <Input
              id="blogTitle"
              placeholder="Enter the blog title..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="blogDescription" className="block mb-2">
              Description
            </Label>
            <Input
              id="blogDescription"
              placeholder="A little bit about something that you are going to explain..."
              value={maintext}
              onChange={(e) => setMainText(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="uploadBanner" className="block mb-2">
              Blog Banner
            </Label>
            <AspectRatio ratio={16 / 9}>
              <div
                className="relative border-2 border-dashed rounded-xl h-full w-full hover:opacity-90 hover:cursor-pointer overflow-hidden"
                onClick={() => fileInputRef.current?.click()}
              >
                {imagePreview ? (
                  <img
                    src={imagePreview}
                    alt="Banner preview"
                    className="rounded-xl object-fill"
                  />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-primary/60">
                    <Upload size={24} className="animate-bounce" />
                    <p>Click to upload banner</p>
                  </div>
                )}
                <Input
                  id="uploadBanner"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageUpload}
                  ref={fileInputRef}
                />
              </div>
            </AspectRatio>
          </div>

          {/* Blog Content */}
          {/* <div>
            <div className="flex justify-between">
              <Label htmlFor="blogContent" className="block mb-2">
                Blog Content
              </Label>
              <p className="text-xs">(Total Words: {wordCount})</p>
            </div>
            <Editor
              initialValue={content}
              onChange={setContent}
              setWordCount={setWordCount}
            />
          </div> */}

          <div>
            <Label htmlFor="tags" className="block mb-2">
              Tags
            </Label>
            <div className="flex gap-2">
              <Input
                id="tags"
                placeholder="Enter tag and press 'Add'"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
              />
              <Button
                onClick={handleAddTag}
                className="flex items-center gap-x-2"
              >
                Add <Plus size={16} />
              </Button>
            </div>
            <div className="flex flex-wrap text-xs gap-1 mt-2">
              {tags.map((tag, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 text-background bg-primary pl-2 rounded-lg"
                >
                  {tag}
                  <Button
                    className="text-background"
                    onClick={() => handleRemoveTag(tag)}
                  >
                    <X size={18} />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <Button
            disabled={uploading || !isFormValid()}
            onClick={handleSubmit}
            className="sm:w-auto w-full"
          >
            Update Blog
          </Button>
        </div>
      </div>
    </div>
  );
};

export default EditBlogPage;
