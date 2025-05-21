"use client"

import { z } from "zod";
import type React from "react";
import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { Loader2, PlusCircle, UploadCloudIcon, X } from "lucide-react"

import {
  Form,
  FormItem,
  FormLabel,
  FormField,
  FormControl,
  FormMessage,
} from "@/components/ui/form"
import { ProductType, TagType } from "@/util/type";
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { zodResolver } from "@hookform/resolvers/zod";
import { useCategory } from "@/hooks/Silken-Knot/use-category";
import { useProducts } from "@/hooks/Silken-Knot/use-products";
import { productSchema } from "@/schemas/silkenknot/product.schema";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { useBunnyUpload } from "@/hooks/useBunnyUpload";
import { useToast } from "@/hooks/use-toast";


const tagOptions = ["New", "Sale", "Popular", "Limited", "Exclusive", "Trending", "Seasonal", "Premium"]

const refundPolicies = ["30-day", "14-day", "7-day", "3-day", "1-day", "No refunds"]

export default function ProductForm() {
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [tagsOpen, setTagsOpen] = useState(false)
  // const [refundPolicy, setRefundPolicy] = useState("30-day")
  const { toast } = useToast();

  const fileInputRef = useRef<HTMLInputElement>(null)

  const { categories, isLoading: isCategoriesLoading, error: categoriesError, fetchCategories } = useCategory();
  const { addProduct } = useProducts();
  const { uploadFiles, loading: isUploading } = useBunnyUpload();

  const form = useForm<z.infer<typeof productSchema>>({
    mode: "all",
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: "",
      description: "product description",
      price: 0,
      category: "",
      tags: ["foo"],
      image: [],
      refundPolicy: "no-refunds",
    }
  })


  // const handleRemoveTag = (tag: string) => {
  //   setSelectedTags(selectedTags.filter((t) => t !== tag))
  // }
  const imageUrls = form.watch("image");
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const { imageUrls, error } = await uploadFiles(Array.from(files), "silken-knot")
    console.log("imageUrls: ", imageUrls);
    if (error) {
      toast({
        variant: "destructive",
        description: "There was an error uploading your image. Please try again.",
      })
    } else {
      form.setValue("image", imageUrls);
    }
  }

  const handleSubmit = async (values: z.infer<typeof productSchema>) => {
    // Handle form submission
    console.log("Form submitted")
    console.log("form values: ", values)
    const { success } = productSchema.safeParse(values);
    const productData = {
      ...values,
      tags: values.tags || []
    }
    if (success) {
      await addProduct(productData);
    }
  }



  return (
    <div className=" flex flex-col justify-center gap-y-2 items-center p-10">

      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Add Product to Silken Knot</h1>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6 max-w-6xl">
          {/* Name */}
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-white">
                  Name <span className="text-red-500">*</span>
                </FormLabel>
                <FormControl>
                  <Input {...field} className="bg-black border-gray-700 text-white" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Description */}
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-white">Description</FormLabel>
                <FormControl>
                  <Textarea {...field} className="bg-black border-gray-700 text-white min-h-[100px]" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Price, Category & Tags */}
          <div className="flex flex-row gap-x-2">
            {/* Price */}
            <FormField
              control={form.control}
              name="price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white">
                    Price <span className="text-red-500">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input type="number" step="1" {...field} onChange={(e) => field.onChange(e.target.valueAsNumber)} className="bg-black border-gray-700 text-white" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Category */}
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white">Category</FormLabel>
                  <FormControl>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger className="bg-black border-gray-700 text-white w-60">
                        <SelectValue placeholder="Select a value" />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-900 text-white border-gray-700">
                        {isCategoriesLoading ? (
                          <Loader2 className="animate-spin" />
                        ) : (
                          categories.map((category) => (
                            <SelectItem key={category._id} value={category.name}>
                              {category.name}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Tags - Custom Integration */}
            <FormField
              control={form.control}
              name="tags"
              render={() => (
                <FormItem>
                  <FormLabel className="text-white">Tags</FormLabel>
                  <div className="flex flex-col space-y-2">
                    <div className="flex items-center gap-2">
                      <Popover open={tagsOpen} onOpenChange={setTagsOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            className="justify-between w-full bg-black border-gray-700 text-white"
                          >
                            Select a value
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-full p-0 bg-gray-900 text-white border-gray-700">
                          <Command>
                            <CommandInput placeholder="Search tags..." />
                            <CommandList>
                              <CommandEmpty>No tag found.</CommandEmpty>
                              <CommandGroup>
                                {/* {tagOptions
                                  .filter((tag) => !selectedTags.includes(tag))
                                  .map((tag) => (
                                    <CommandItem key={tag} onSelect={() => handleAddTag(tag)}>
                                      {tag}
                                    </CommandItem>
                                  ))} */}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                      <Button type="button" variant="ghost" size="icon" className="text-white">
                        <PlusCircle className="h-5 w-5" />
                      </Button>
                    </div>
                    {selectedTags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {selectedTags.map((tag) => (
                          <Badge key={tag} variant="secondary" className="bg-gray-800 text-white">
                            {tag}
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-4 w-4 p-0 ml-1 text-white hover:bg-transparent"
                            // onClick={() => handleRemoveTag(tag)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </FormItem>
              )}
            />
          </div>

          {/* Image (custom logic, not part of RHF) */}
          <div className="space-y-2">
            <Label htmlFor="image" className="text-white">Images</Label>
            <div className="border border-gray-700 rounded-md p-4">
              <div className="flex flex-wrap gap-3 items-center justify-center">

                <Input type="file" accept="image/*" multiple id="image" className="hidden" ref={fileInputRef} onChange={handleImageUpload} />
                {isUploading ?
                  <Loader2 className="animate-spin" />
                  :
                  imageUrls.length > 0 ? (
                    imageUrls.map((url) => (
                      <img src={url} alt="product" className="w-28 h-28 rounded-md" />
                    ))
                  ) : <div className=" w-28 h-28 border-2 border-dashed border-neutral-600 rounded-md flex items-center justify-center cursor-pointer"
                    onClick={() => fileInputRef.current?.click()}>
                    <UploadCloudIcon size={52} className=" text-neutral-600" />
                  </div>
                }


              </div>
            </div>
          </div>

          {/* Refund Policy */}
          <FormField
            control={form.control}
            name="refundPolicy"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-white">Refund Policy</FormLabel>
                <div className="relative">
                  <FormControl>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="bg-black border-gray-700 text-white w-full">
                        <SelectValue placeholder="Select..." />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-900 text-white border-gray-700">
                        {refundPolicies.map((policy) => (
                          <SelectItem key={policy} value={policy}>
                            {policy}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  {field.value && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-8 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400"
                      onClick={() => field.onChange("")}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" className="bg-white text-black hover:bg-gray-200 mt-6">
            Create Product
          </Button>
        </form>
      </Form>

    </div >
  )
}
