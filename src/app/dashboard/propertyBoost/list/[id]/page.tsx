"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Download, Pencil, X, Plus, Save, Upload } from "lucide-react";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { useAuthStore } from "@/AuthStore";
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useBunnyUpload } from "@/hooks/useBunnyUpload";
import { toast } from "@/hooks/use-toast";
import axios from "axios";

interface Property {
  _id: string;
  title: string;
  url?: string;
  description: string;
  images: string[];
}

export default function PropertyDetails() {
  const params = useParams();
  const id = Array.isArray(params?.id) ? params.id[0] : params?.id ?? "";
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [url, setUrl] = useState("");
  
  // Edit mode states
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editImages, setEditImages] = useState<string[]>([]);
  const [newImages, setNewImages] = useState<File[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { uploadFiles, loading: uploading } = useBunnyUpload();
  const { token } = useAuthStore();

  useEffect(() => {
    async function fetchProperty() {
      try {
        const res = await fetch(`/api/propertyBoost/${id}`);
        if (!res.ok) throw new Error("Failed to fetch property");
        const data = await res.json();
        setProperty(data);
        setUrl(data.url ?? "");
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    if (id) fetchProperty();
  }, [id]);

  // 🔥 Download all images as a ZIP
  const handleDownloadAll = async () => {
    if (!property?.images?.length) return;
    setDownloading(true);
    try {
      const zip = new JSZip();
      const imgFolder = zip.folder("property-images");

      for (let i = 0; i < property.images.length; i++) {
        const url = property.images[i];
        const response = await fetch(url);
        const blob = await response.blob();
        imgFolder?.file(`image-${i + 1}.jpg`, blob);
      }

      const content = await zip.generateAsync({ type: "blob" });
      saveAs(content, `${property.title.replace(/\s+/g, "_")}_images.zip`);
    } catch (error) {
      console.error("Error downloading images:", error);
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
      </div>
    );
  }

  if (!property) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <p className="text-lg text-muted-foreground">Property not found.</p>
      </div>
    );
  }

  const handleSaveUrl = async () => {
    if (!url) return;
    try {
      await axios.post("/api/saveboosterUrl", {
        id: property?._id,
        url,
      });
      setProperty((prev) => (prev ? { ...prev, url } : prev));
    } catch (err) {
      console.error("Error saving URL:", err);
    }
  };

  // Start editing mode
  const handleStartEdit = () => {
    if (property) {
      setEditTitle(property.title);
      setEditDescription(property.description);
      setEditImages([...property.images]);
      setNewImages([]);
      setIsEditing(true);
    }
  };

  // Cancel editing
  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditTitle("");
    setEditDescription("");
    setEditImages([]);
    setNewImages([]);
  };

  // Remove an existing image
  const handleRemoveImage = (index: number) => {
    setEditImages((prev) => prev.filter((_, i) => i !== index));
  };

  // Remove a new (not yet uploaded) image
  const handleRemoveNewImage = (index: number) => {
    setNewImages((prev) => prev.filter((_, i) => i !== index));
  };

  // Handle new file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files).filter((file) =>
        file.type.startsWith("image/")
      );
      setNewImages((prev) => [...prev, ...files]);
    }
  };

  // Save all changes
  const handleSaveChanges = async () => {
    if (!property) return;
    setIsSaving(true);

    try {
      let finalImages = [...editImages];

      // Upload new images if any
      if (newImages.length > 0) {
        const { imageUrls, error } = await uploadFiles(newImages, "PropertyBoost");
        if (error) {
          toast({
            title: "Error",
            description: "Failed to upload images",
            variant: "destructive",
          });
          setIsSaving(false);
          return;
        }
        finalImages = [...finalImages, ...imageUrls];
      }

      // Update property via API
      const response = await axios.put(`/api/propertyBoost/${property._id}`, {
        title: editTitle,
        description: editDescription,
        images: finalImages,
      });

      setProperty(response.data);
      setIsEditing(false);
      setNewImages([]);
      toast({
        title: "Success",
        description: "Property updated successfully",
      });
    } catch (err) {
      console.error("Error saving changes:", err);
      toast({
        title: "Error",
        description: "Failed to save changes",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen">
      <div className="flex flex-col justify-end p-8 rounded-b-2xl">
        {isEditing ? (
          <Input
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            className="text-3xl md:text-4xl font-bold bg-background/80 backdrop-blur mb-4 h-auto py-2"
            placeholder="Property Title"
          />
        ) : (
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            {property.title}
          </h1>
        )}
        <div className="flex items-center gap-3">
          <Button
            onClick={handleDownloadAll}
            disabled={downloading}
            className="w-fit flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            {downloading ? "Downloading..." : "Download All Photos"}
          </Button>
          {(token?.role === "SuperAdmin" || token?.role === "LeadGen") && !isEditing && (
            <Button
              onClick={handleStartEdit}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Pencil className="w-4 h-4" />
              Edit
            </Button>
          )}
          {isEditing && (
            <>
              <Button
                onClick={handleSaveChanges}
                disabled={isSaving || uploading}
                className="flex items-center gap-2"
              >
                {isSaving || uploading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>
              <Button
                onClick={handleCancelEdit}
                variant="destructive"
                className="flex items-center gap-2"
              >
                <X className="w-4 h-4" />
                Cancel
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6 space-y-10">
        {/* Image Gallery */}
        {isEditing ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Edit Photos</h2>
              <Button
                onClick={() => fileInputRef.current?.click()}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Photos
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
            
            {/* Existing Images */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {editImages.map((img, index) => (
                <Card
                  key={`existing-${index}`}
                  className="overflow-hidden rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 relative group"
                >
                  <CardContent className="p-0 relative">
                    <img
                      src={img}
                      alt={`Property ${index + 1}`}
                      className="w-full h-64 object-cover"
                    />
                    <Button
                      onClick={() => handleRemoveImage(index)}
                      variant="destructive"
                      size="sm"
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
              
              {/* New Images Preview */}
              {newImages.map((file, index) => (
                <Card
                  key={`new-${index}`}
                  className="overflow-hidden rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 relative group border-2 border-dashed border-primary"
                >
                  <CardContent className="p-0 relative">
                    <img
                      src={URL.createObjectURL(file)}
                      alt={`New ${index + 1}`}
                      className="w-full h-64 object-cover"
                    />
                    <div className="absolute top-2 left-2 bg-primary text-primary-foreground text-xs px-2 py-1 rounded">
                      New
                    </div>
                    <Button
                      onClick={() => handleRemoveNewImage(index)}
                      variant="destructive"
                      size="sm"
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </CardContent>
                </Card>
              ))}

              {/* Add Photo Card */}
              <Card
                onClick={() => fileInputRef.current?.click()}
                className="overflow-hidden rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer border-2 border-dashed border-muted-foreground/30 hover:border-primary"
              >
                <CardContent className="p-0 h-64 flex flex-col items-center justify-center text-muted-foreground hover:text-primary transition-colors">
                  <Upload className="w-12 h-12 mb-2" />
                  <span className="text-sm font-medium">Add Photos</span>
                </CardContent>
              </Card>
            </div>
          </div>
        ) : (
          property.images.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {property.images.map((img, index) => (
                <Card
                  key={index}
                  className="overflow-hidden rounded-2xl shadow-md hover:shadow-xl transition-all duration-300"
                >
                  <CardContent className="p-0">
                    <img
                      src={img}
                      alt={`Property ${index + 1}`}
                      className="w-full h-64 object-cover hover:scale-105 transition-transform duration-300"
                    />
                  </CardContent>
                </Card>
              ))}
            </div>
          )
        )}

       {(token?.role === "SuperAdmin" || token?.role === "LeadGen") && (
          <div className="space-y-2">
            <Label htmlFor="facebookPostUrl">Post URL</Label>
            {property.url ? (
              <a
                href={property.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                {property.url}
              </a>
            ) : (
              <div className="flex gap-2">
                <Input
                  id="facebookPostUrl"
                  placeholder="https://facebook.com/..."
                  className="min-h-[50px] whitespace-pre-wrap"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                />
                <Button onClick={handleSaveUrl}>Save</Button>
              </div>
            )}
          </div>
        )}

        {/* Description Section */}
        <div className="bg-card rounded-2xl shadow-lg border p-8 space-y-4">
          <h2 className="text-2xl font-bold text-foreground">Property Description</h2>
          {isEditing ? (
            <Textarea
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              className="min-h-[200px] text-lg leading-relaxed"
              placeholder="Enter property description..."
            />
          ) : (
            <p className="text-lg text-muted-foreground whitespace-pre-wrap leading-relaxed">
              {property.description}
            </p>
          )}
        </div>        
      </div>
    </div>
  );
}
