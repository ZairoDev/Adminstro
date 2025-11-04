"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { ImageUp, Loader2 } from "lucide-react";
import { useBunnyUpload } from "@/hooks/useBunnyUpload";
import { useToast } from "@/hooks/use-toast";
import axios from "axios";
import type { unregisteredOwners } from "@/util/type";

interface UploadCellProps {
  item: unregisteredOwners;
  onUploadComplete?: (id: string, newUrls: string[]) => void;
}


export  function UploadCell({ item, onUploadComplete }: UploadCellProps) {
    const { uploadFiles, loading } = useBunnyUpload();
    const [isUploading, setIsUploading] = React.useState(false);
    const [hasImages, setHasImages] = React.useState(
      !!(item.imageUrls && item.imageUrls.length > 0)
    );
    const fileInputRef = React.useRef<HTMLInputElement | null>(null);
    const { toast } = useToast();

    React.useEffect(() => {
      setHasImages(!!(item.imageUrls && item.imageUrls.length > 0));
    }, [item.imageUrls]);

    const handleFileChange = async (
      event: React.ChangeEvent<HTMLInputElement>
    ) => {
      const files = event.target.files;
      if (!files || files.length === 0) {
        console.log("No files selected");
        return;
      }

      console.log("Files selected:", files.length);
      const currentInput = event.target;
      const fileList = Array.from(files);
      currentInput.value = "";

      setIsUploading(true);

      try {
        console.log("Starting upload...");
        const { imageUrls, error } = await uploadFiles(fileList, "Uploads");
        console.log("Upload result:", { imageUrls, error });

        if (error || !imageUrls?.length) {
          console.error("Upload failed:", error);
          toast({
            title: "Upload failed",
            description: error || "No URLs returned.",
            variant: "destructive",
          });
          setIsUploading(false);
          return;
        }

        const existingUrls = item.imageUrls || [];
        const allImageUrls = [...existingUrls, ...imageUrls];
        console.log("Saving to server:", allImageUrls);

        const response = await axios.put(
          `/api/unregisteredOwners/updateData/${item._id}`,
          {
            field: "imageUrls",
            value: allImageUrls,
          }
        );
        console.log("Server response:", response.status);

        if (onUploadComplete) {
          onUploadComplete(item._id, allImageUrls);
          console.log("Parent state updated");
        }

        setHasImages(true);

        toast({
          title: "Uploaded successfully",
          description: `${imageUrls.length} image(s) uploaded.`,
        });
      } catch (err) {
        console.error("Upload error:", err);
        toast({
          title: "Failed to update server",
          description: "An error occurred while saving image URLs.",
          variant: "destructive",
        });
      } finally {
        setIsUploading(false);
        console.log("Upload process complete");
      }
    };

    return (
      <div
        className=" w-32"
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          multiple
          accept="image/png,image/jpeg,image/webp"
          onChange={handleFileChange}
          key={item._id}
        />
        <Button
          variant="ghost"
          size="icon"
          className=" h-6 w-full"
          disabled={loading || isUploading}
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            console.log("Button clicked!");
            if (loading || isUploading) {
              console.log("Blocked: loading or uploading");
              return;
            }
            if (fileInputRef.current) {
              console.log("Triggering file input click");
              fileInputRef.current.click();
            }
          }}
          onMouseDown={(e) => {
            e.stopPropagation();
          }}
        >
          {isUploading ? (
            <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
          ) : (
            <div
  className={`flex gap-2  cursor-pointer`}
>
  <ImageUp
    className={`h-4 w-4 transition-colors ${
      hasImages
        ? "text-green-600 dark:text-green-400"
        : "text-muted-foreground"
    }`}
  /> 
  <span className="text-sm font-medium">Upload</span>
</div>

            
          )}
        </Button>
      </div>
    );
  }