"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { X, Upload, Eye, Loader2, CheckCircle2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useBunnyUpload } from "@/hooks/useBunnyUpload"
import { useAuthStore } from "@/AuthStore"
import axios from "axios"
import { triggerConfetti } from "@/lib/confetti"

interface ImageData {
  id: string
  file: File
  url: string
}

export default function PropertyBoost() {
  const [images, setImages] = useState<ImageData[]>([])
  const [dragActive, setDragActive] = useState(false)
  const [description, setDescription] = useState("")
  const [title, setTitle] = useState("")
  const [location, setLocation] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const saveButtonRef = useRef<HTMLButtonElement>(null)
  const { uploadFiles } = useBunnyUpload()
  const token = useAuthStore((state: any) => state.token)

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

  const clearAll = () => {
    images.forEach((image) => URL.revokeObjectURL(image.url))
    setImages([])
    if (fileInputRef.current) {
    fileInputRef.current.value = "" 
  }
  }

  const handleSubmit = async () => {
    if (isSubmitting) return

    try {
      if (images.length === 0 || !description || !title) {
        return
      }

      setIsSubmitting(true)

      const { imageUrls, error } = await uploadFiles(images.map((img) => img.file))

      if (error) {
        console.error("Upload failed:", error)
        setIsSubmitting(false)
        return
      }

      const payload = {
        title: title,
        location: location,
        description,
        images: imageUrls,
        createdBy: token.name,
      }

      await axios.post("/api/propertyBoost", payload)

      setSaveSuccess(true)

      if (saveButtonRef.current) {
        triggerConfetti(saveButtonRef.current)
      }

      setTimeout(() => {
        clearAll()
        setDescription("")
        setTitle("")
        setLocation("")
        setIsSubmitting(false)
        setSaveSuccess(false)
      }, 2000)
    } catch (err) {
      console.error(err)
      setIsSubmitting(false)
    }
  }

  const isFormValid = images.length > 0 && description.trim() !== "" && title.trim() !== ""

  return (
    <div className="min-h-screen  p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="text-center space-y-3 pt-8">
          <h1 className="text-4xl font-bold">
            Property Boost
          </h1>
          <p className="text-gray-600 text-lg">Upload and showcase your properties with ease</p>
        </div>

        <div className="max-w-6xl mx-auto space-y-8">
          <Card className="border-2 border-dashed border-gray-200 transition-all duration-300 shadow-lg hover:shadow-xl">
            <CardContent className="p-8">
              <div
                className={`relative rounded-xl border-2 border-dashed p-12 text-center transition-all duration-300 ${
                  dragActive
                    ? "border-blue-500 bg-blue-50 scale-[1.02]"
                    : "border-gray-300 hover:border-blue-400 hover:bg-blue-50/50"
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <Upload className="mx-auto h-16 w-16  mb-4 transition-transform duration-300 hover:scale-110" />
                <div className="space-y-3">
                  <p className="text-xl font-semibold text-gray-800">
                    Drop your images here, or click to browse
                  </p>
                  <p className="text-sm text-gray-500">
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

              <div className="flex justify-center mt-8 gap-4">
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 shadow-md hover:shadow-lg transition-all"
                  size="lg"
                >
                  <Upload className="h-5 w-5" />
                  Choose Files
                </Button>

                {images.length > 0 && (
                  <Button
                    variant="outline"
                    onClick={clearAll}
                    className="flex items-center gap-2 shadow-md hover:shadow-lg transition-all"
                    size="lg"
                  >
                    <X className="h-5 w-5" />
                    Clear All ({images.length})
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg hover:shadow-xl transition-all duration-300">
            <CardContent className="p-6 space-y-6">
              <div className="space-y-2">
                <label htmlFor="title" className="text-sm font-semibold text-gray-700 block">
                  Property Title
                </label>
                <Input
                  id="title"
                  placeholder="e.g., 123 Main Street, Downtown Manhattan"
                  className="text-base"
                  onChange={(e) => setTitle(e.target.value)}
                  value={title}
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="title" className="text-sm font-semibold text-gray-700 block">
                  Location
                </label>
                <Input
                  id="location"
                  placeholder="for example: chania , milan , athens, thessaloniki"
                  className="text-base"
                  onChange={(e) => setLocation(e.target.value)}
                  value={location}
                />
              </div>



              <div className="space-y-2">
                <label htmlFor="property-description" className="text-sm font-semibold text-gray-700 block">
                  Property Description
                </label>
                <Textarea
                  id="property-description"
                  placeholder="Describe your property in detail... (supports bullet points, line breaks, etc.)"
                  className="min-h-[180px] text-base"
                  onChange={(e) => setDescription(e.target.value)}
                  value={description}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {images.length > 0 && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-3xl font-bold text-gray-800">
                Uploaded Images
                <span className="ml-3 text-lg font-normal text-blue-600">({images.length})</span>
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {images.map((image) => (
                <Card key={image.id} className="overflow-hidden hover:shadow-xl transition-all duration-300 group">
                  <CardHeader className="p-4 bg-gradient-to-r from-blue-50 to-slate-50">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-medium truncate text-gray-700">
                        {image.file.name}
                      </CardTitle>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => removeImage(image.id)}
                        className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>

                  <CardContent className="p-4 pt-0">
                    <div className="relative group/image">
                      <img
                        src={image.url || "/placeholder.svg"}
                        alt={image.file.name}
                        className="w-full h-56 object-cover rounded-lg border-2 border-gray-200 transition-transform duration-300 group-hover/image:scale-[1.02]"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover/image:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                        <Eye className="h-10 w-10 text-white drop-shadow-lg" />
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      {(image.file.size / 1024).toFixed(1)} KB
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {images.length === 0 && (
          <Card className="border-2 border-dashed border-gray-300 shadow-lg">
            <CardContent className="p-16 text-center">
              <div className="space-y-6">
                <div className="mx-auto w-32 h-32 bg-gradient-to-br from-gray-600 to-gray-800 rounded-full flex items-center justify-center shadow-inner">
                  <Upload className="h-16 w-16 " />
                </div>
                <div className="space-y-3">
                  <h3 className="text-2xl font-semibold text-gray-200">No images uploaded yet</h3>
                  <p className="text-gray-500 text-lg">
                    Upload your first images to get started with previews
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex justify-center pb-8">
          <Button
            ref={saveButtonRef}
            onClick={handleSubmit}
            disabled={!isFormValid || isSubmitting}
            className="px-12 py-6 text-lg font-semibold shadow-xl hover:shadow-2xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden"
            size="lg"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Saving Property...
              </>
            ) : saveSuccess ? (
              <>
                <CheckCircle2 className="mr-2 h-5 w-5" />
                Property Saved!
              </>
            ) : (
              "Save Property"
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
