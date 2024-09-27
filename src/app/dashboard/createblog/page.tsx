import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import EditorJS from '@editorjs/editorjs';
import React from "react";

const BlogPage = () => {
  return (
    <>
      <div className="">
        <h1>
          <div>
            <Label htmlFor="title">Title</Label>
            <Input />
          </div>
        </h1>
      </div>
    </>
  );
};

export default BlogPage;
