"use client";
import React, { useRef, useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Editor from "@/components/editor/editor";
import axios from "axios";
import { Loader2, Plus, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBunnyUpload } from "@/hooks/useBunnyUpload";
import { useUserRole } from "@/context/UserRoleContext";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import Animation from "@/components/animation";
import Heading from "@/components/Heading";
const defaultValue = {
  type: "doc",
  content: [
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Write something that people will love. Type / to get the option.",
        },
      ],
    },
  ],
};
const BlogPage = () => {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState<any>(defaultValue);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [maintext, setMainText] = useState("");
  const [banner, setBanner] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [wordCount, setWordCount] = useState(0);
  const { userRole, currentUser, isLoading, userEmail } = useUserRole();
  const { toast } = useToast();
  const router = useRouter();
  console.log(
    userRole,
    currentUser,
    userEmail,
    isLoading,
    "Things will print here"
  );

  const handleAddTag = () => {
    if (tagInput && !tags.includes(tagInput)) {
      setTags([...tags, tagInput]);
      setTagInput("");
    }
  };

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
  };
  const { uploadFiles, loading } = useBunnyUpload();
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
      const response = await axios.post("/api/blog/createnewblog", {
        title,
        content,
        tags,
        banner,
        maintext,
        wordCount,
        author: userEmail,
      });
      toast({
        title: "Success",
        description: "Your blog created successfully.",
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
  console.log(content, "Content");
  const isFormValid = () => {
    return title && content && maintext && banner && tags.length > 0;
  };
  return (
    <div>
      <Animation>
        <Heading
          heading="Create blog"
          subheading="You can write a blog here will render in vacationSaga"
        />
        <div className="max-w-5xl  mx-auto p-1 pt-2">
          <div className="space-y-6">
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
                      className="rounded-xl object-fill "
                    />
                  ) : (
                    <div className="absolute inset-0  flex flex-col items-center justify-center text-primary/60">
                      <Upload size={24} className="" />
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
              {loading && (
                <div className="">
                  <p className="flex items-center justify-center gap-x-2">
                    Uploading...
                    <Loader2 size={18} className="animate-spin" />
                  </p>
                </div>
              )}
            </div>
            {/* Blog Content */}
            <div>
              <div className=" flex justify-between">
                <Label htmlFor="blogContent" className="block mb-2">
                  Blog Content
                </Label>
                <p className=" text-xs">(Total Words: {wordCount})</p>
              </div>
              <Editor
                initialValue={defaultValue}
                onChange={setContent}
                setWordCount={setWordCount}
              />
            </div>
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
              disabled={isLoading || uploading || !isFormValid()}
              onClick={handleSubmit}
              className="sm:w-auto w-full"
            >
              Publish Blog
            </Button>
          </div>
        </div>
      </Animation>
    </div>
  );
};

export default BlogPage;
