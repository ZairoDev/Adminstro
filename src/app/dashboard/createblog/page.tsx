// "use client";

// import React, { useState, useRef } from "react";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import Image from "next/image";
// import { Upload } from "lucide-react";
// import Editor from "@/components/editor/editor";

// export const defaultValue = {
//   type: "doc",
//   content: [
//     {
//       type: "paragraph",
//       content: [
//         {
//           type: "text",
//           text: 'Start typing here. Type "/" for commands.',
//         },
//       ],
//     },
//   ],
// };

// const BlogPage = () => {
//   const [imagePreview, setImagePreview] = useState<string | null>(null);
//   const [content, setContent] = useState<string>("");
//   const fileInputRef = useRef<HTMLInputElement>(null);

//   console.log(content);

//   const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
//     const file = event.target.files?.[0];
//     if (file) {
//       const reader = new FileReader();
//       reader.onloadend = () => {
//         setImagePreview(reader.result as string);
//       };
//       reader.readAsDataURL(file);
//     }
//   };

//   const handleImageClick = () => {
//     fileInputRef.current?.click();
//   };

//   return (
//     <div>
//       <h1 className="text-3xl text-center border-b pb-2">Create something</h1>
//       <div className="max-w-5xl border-r mx-auto p-4">
//         <div className="space-y-6">
//           <div>
//             <Label htmlFor="blogTitle" className="block mb-2">
//               Blog Title
//             </Label>
//             <Input id="blogTitle" placeholder="Enter your blog title" />
//           </div>
//           <div>
//             <Label htmlFor="uploadBanner" className="block mb-2">
//               Blog Banner
//             </Label>
//             <div
//               className="relative border-2 border-dashed rounded-xl aspect-video hover:opacity-90 hover:cursor-pointer overflow-hidden"
//               onClick={handleImageClick}
//             >
//               {imagePreview ? (
//                 <Image
//                   src={imagePreview}
//                   alt="Blog banner preview"
//                   layout="fill"
//                   objectFit="cover"
//                   className="rounded-xl"
//                 />
//               ) : (
//                 <div className="absolute inset-0 flex flex-col items-center justify-center text-primary/60">
//                   <Upload />
//                   Click or drag to upload an image
//                 </div>
//               )}
//               <Input
//                 id="uploadBanner"
//                 type="file"
//                 accept="image/*"
//                 className="hidden"
//                 onChange={handleImageUpload}
//                 ref={fileInputRef}
//               />
//             </div>
//           </div>
//           <div>
//             <Editor initialValue={defaultValue} onChange={setContent} />
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default BlogPage;

// pages/blog/create.tsx

"use client";
import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Editor from "@/components/editor/editor";
import axios from "axios";

const defaultValue = {
  type: "doc",
  content: [
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: 'Start typing here. Type "/" for commands.',
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

  console.log(content);

  const handleAddTag = () => {
    if (tagInput && !tags.includes(tagInput)) {
      setTags([...tags, tagInput]);
      setTagInput("");
    }
  };

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
  };

  const handleSubmit = async () => {
    try {
      const response = await axios.post("/api/blog/createnewblog", {
        title,
        content: JSON.stringify(content),
        tags,
        maintext,
      });

      console.log("Blog saved:", response.data);
    } catch (error) {
      console.error("Error saving blog:", error);
    }
  };

  return (
    <div>
      <h1 className="text-3xl text-center border-b pb-2">Create a Blog</h1>
      <div className="max-w-5xl border-r mx-auto p-4">
        <div className="space-y-6">
          {/* Blog Title */}
          <div>
            <Label htmlFor="blogTitle" className="block mb-2">
              Blog Title
            </Label>
            <Input
              id="blogTitle"
              placeholder="Enter your blog title"
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
              placeholder="Enter your blog description"
              value={maintext}
              onChange={(e) => setMainText(e.target.value)}
            />
          </div>

          {/* Blog Content */}
          <div>
            <Label htmlFor="blogContent" className="block mb-2">
              Blog Content
            </Label>
            <Editor initialValue={defaultValue} onChange={setContent} />
          </div>

          {/* Blog Tags */}
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
              <button
                onClick={handleAddTag}
                className="bg-blue-500 text-white px-4 py-2 rounded"
              >
                Add
              </button>
            </div>
            <div className="flex gap-2 mt-2">
              {tags.map((tag, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 bg-gray-200 px-2 py-1 rounded"
                >
                  {tag}
                  <button onClick={() => handleRemoveTag(tag)}>x</button>
                </div>
              ))}
            </div>
          </div>

          <button
            className="mt-4 bg-blue-500 text-white px-4 py-2 rounded"
            onClick={handleSubmit}
          >
            Submit
          </button>
        </div>
      </div>
    </div>
  );
};

export default BlogPage;
