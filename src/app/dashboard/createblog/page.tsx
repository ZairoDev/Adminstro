"use client";

import React, { useState, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Image from "next/image";
import { Upload } from "lucide-react";
import Editor from "@/components/editor/editor";

export const defaultValue = {
  type: "doc",
  content: [
    {
      type: "paragraph",
      content: [],
    },
  ],
};

const BlogPage = () => {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [content, setContent] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div>
      <h1 className="text-3xl text-center border-b pb-2">Create something</h1>
      <div className="max-w-5xl border-r mx-auto p-4">
        <div className="space-y-6">
          <div>
            <Label htmlFor="blogTitle" className="block mb-2">
              Blog Title
            </Label>
            <Input id="blogTitle" placeholder="Enter your blog title" />
          </div>
          <div>
            <Label htmlFor="uploadBanner" className="block mb-2">
              Blog Banner
            </Label>
            <div
              className="relative border-2 border-dashed rounded-xl aspect-video hover:opacity-90 hover:cursor-pointer overflow-hidden"
              onClick={handleImageClick}
            >
              {imagePreview ? (
                <Image
                  src={imagePreview}
                  alt="Blog banner preview"
                  layout="fill"
                  objectFit="cover"
                  className="rounded-xl"
                />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-primary/60">
                  <Upload />
                  Click or drag to upload an image
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
          </div>
          <div>
            <Editor initialValue={defaultValue} onChange={setContent} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default BlogPage;
