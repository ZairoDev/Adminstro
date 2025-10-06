"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { X, Upload, Eye, Download } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {useBunnyUpload} from "@/hooks/useBunnyUpload"; 
import { useAuthStore } from "@/AuthStore"
import axios from "axios"
interface ImageData {
  id: string
  file: File
  url: string
}

export default function PropertyBoost() {
  const [images, setImages] = useState<ImageData[]>([])
  const [dragActive, setDragActive] = useState(false)
  const [description,setDescription]=useState("") 
  const [title,setTitle]=useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { uploadFiles } = useBunnyUpload();
 const token = useAuthStore((state: any) => state.token);

  const handleFiles = (files: FileList) => {
    const newImages: ImageData[] = []

    Array.from(files).forEach((file) => {
      if (file.type.startsWith("image/")) {
        const id = Math.random().toString(36).substr(2, 9)
        const url = URL.createObjectURL(file)
        newImages.push({
          id,
          file,
          url,
        })
      }
    })

    setImages((prev) => [...prev, ...newImages])
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files)
    }
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(e.target.files)
    }
  }

  const removeImage = (id: string) => {
    setImages((prev) => {
      const imageToRemove = prev.find((img) => img.id === id)
      if (imageToRemove) {
        URL.revokeObjectURL(imageToRemove.url)
      }
      return prev.filter((img) => img.id !== id)
    })
  }

  // const downloadImage = (image: ImageData) => {
  //   const link = document.createElement("a")
  //   link.href = image.url
  //   link.download = image.file.name
  //   document.body.appendChild(link)
  //   link.click()
  //   document.body.removeChild(link)
  // }

  const clearAll = () => {
    images.forEach((image) => URL.revokeObjectURL(image.url))
    setImages([])
  }



const handleSubmit = async () => {
  try {
    if (images.length === 0 || !description || !title) {
      alert("Please add a description/title and upload at least one image");
      return;
    }

    // Upload images
    const { imageUrls, error } = await uploadFiles(images.map((img) => img.file));

    if (error) {
      alert("Upload failed: " + error);
      return;
    }

    const payload = {
      title: title,
      description,
      images: imageUrls,
      createdBy: token.name,
    };

    const res = await axios.post("/api/propertyBoost", payload);
    alert("Property saved successfully!");
    clearAll();
    setDescription("");
  } catch (err) {
    console.error(err);
    alert("Something went wrong");
  }
};



  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto space-y-8 ">
       

      
<div className="max-w-6xl mx-auto space-y-8">
  <Card className="border-2 border-dashed border-border hover:border-primary/50 transition-colors">
    <CardContent className="p-8">
      <div
        className={`relative rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
          dragActive
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-primary/50"
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <div className="space-y-2">
          <p className="text-lg font-medium text-foreground">
            Drop your images here, or click to browse
          </p>
          <p className="text-sm text-muted-foreground">
            Supports JPG, PNG, GIF, WebP. Multiple files allowed.
          </p>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          onChange={handleFileInput}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
      </div>

      <div className="flex justify-center mt-6 gap-4">
        <Button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-2"
        >
          <Upload className="h-4 w-4" />
          Choose Files
        </Button>

        {images.length > 0 && (
          <Button
            variant="outline"
            onClick={clearAll}
            className="flex items-center gap-2 bg-transparent"
          >
            <X className="h-4 w-4" />
            Clear All ({images.length})
          </Button>
        )}
      </div>
    </CardContent>
  </Card>

  <div className="space-y-2">
    <label
      htmlFor="property-description"
      className="text-sm font-medium text-foreground"
    >
      Title
    </label>
    <Input
      id="title"
      placeholder="Add property title"
      className="min-h-[50px] whitespace-pre-wrap"
      onChange={(e) => setTitle(e.target.value)}
      value={title}
    />
  </div>
  
  <div className="space-y-2">
    <label
      htmlFor="property-description"
      className="text-sm font-medium text-foreground"
    >
      Property Description
    </label>
    <Textarea
      id="property-description"
      placeholder="Add property description (supports bullet points, line breaks, etc.)"
      className="min-h-[150px] whitespace-pre-wrap"
      onChange={(e) => setDescription(e.target.value)}
      value={description}
    />
  </div>
</div>


        {/* Images Grid */}
        {images.length > 0 && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-semibold text-foreground">Uploaded Images ({images.length})</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {images.map((image) => (
                <Card key={image.id} className="overflow-hidden">
                  <CardHeader className="p-4">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-medium truncate">{image.file.name}</CardTitle>
                      <div className="flex items-center gap-2">
                        {/* <Button
                          size="sm"
                          variant="outline"
                          onClick={() => downloadImage(image)}
                          className="h-8 w-8 p-0"
                        >
                          <Download className="h-3 w-3" />
                        </Button> */}
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => removeImage(image.id)}
                          className="h-8 w-8 p-0"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="p-4 pt-0">
                    {/* Image Preview */}
                    <div className="relative group">
                      <img
                        src={image.url || "/placeholder.svg"}
                        alt={image.file.name}
                        className="w-full h-48 object-cover rounded-md border"
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-md flex items-center justify-center">
                        <Eye className="h-8 w-8 text-white" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {images.length === 0 && (
          <Card className="border-dashed">
            <CardContent className="p-12 text-center">
              <div className="space-y-4">
                <div className="mx-auto w-24 h-24 bg-muted rounded-full flex items-center justify-center">
                  <Upload className="h-12 w-12 text-muted-foreground" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-medium text-foreground">No images uploaded yet</h3>
                  <p className="text-muted-foreground">Upload your first images to get started with previews</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Button onClick={handleSubmit} className="mt-6">
  Save Property
</Button>

      </div>
    </div>
  )
}