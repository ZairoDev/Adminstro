"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeftFromLine, Plus } from "lucide-react";
import Link from "next/link";
import React, { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import axios from "axios";
import { userSchema } from "@/schemas/user.schema";
import { UserSchema } from "@/schemas/user.schema";
import Loader from "@/components/loader";
import { useBunnyUpload } from "@/hooks/useBunnyUpload";

const NewUser = () => {
  const { toast } = useToast();
  const [profilePic, setProfilepic] = useState("");
  const confirmPasswordRef = useRef<HTMLInputElement>(null);

  const { uploadFiles } = useBunnyUpload();
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    const reader = new FileReader();
    reader.onload = (event) => {
      setPreviewImage(event.target?.result as string);
    };
    reader.readAsDataURL(file);

    toast({
      title: "Processing..",
      description: "Your image is being uploaded.",
    });

    try {
      const { imageUrls, error } = await uploadFiles([file]);
      if (error) {
        toast({
          variant: "destructive",
          title: "Upload failed",
          description:
            "There was an error uploading your image. Please try again.",
        });
      } else {
        setProfilepic(imageUrls[0]);
        toast({
          title: "Upload successful",
          description: "Your image has been uploaded successfully.",
        });
      }
    } catch (err) {
      toast({
        variant: "destructive",
        title: "An unexpected error occurred",
        description: "Please try again.",
      });
    }
  };

  const handleImageClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<UserSchema>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      name: "",
      email: "",
      sendDetails: false,
      nationality: "",
      gender: "Male",
      spokenLanguage: "",
      bankDetails: "",
      phone: "",
      address: "",
      role: "Traveller",
    },
  });

  const [loading, setLoading] = useState(false);

  const onSubmit = async (data: UserSchema) => {
    console.log(data, "I am submitting");
    setLoading(true);
    const userData = {
      ...data,
      profilePic,
    };
    console.log(userData.password, confirmPasswordRef.current?.value);
    if (userData.password !== confirmPasswordRef.current?.value) {
      toast({
        variant: "destructive",
        title: "Passwords do not match",
        description: "Please try again.",
      });
      setLoading(false);
      return;
    }

    console.log(userData);
    try {
      const response = await axios.post("/api/user/createnewuser", userData);
      console.log("Inside Api call", response.data);
      toast({
        title: "User created successfully",
        description: "Please check your email for verification link",
      });
      reset();
    } catch (error: any) {
      console.error("Error creating user:", error);
      toast({
        variant: "destructive",
        title: "Uh oh! Something went wrong.",
        description: error.response?.data?.error || "An error occurred.",
      });
      setLoading(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="sm:mt-10 mt-14 md:mt-10 lg:mt-0">
      <div>
        <Button variant="ghost" className="border">
          <Link
            className="flex items-center justify-between gap-x-2"
            href={"/dashboard/user"}
          >
            <ArrowLeftFromLine />
            Back
          </Link>
        </Button>
      </div>
      <div className="flex items-center justify-center">
        <div className="max-w-[35rem] w-full m-4">
          <div className="border-2 rounded-lg p-4">
            <div className="border-b">
              <h1 className="text-2xl pb-2 text-center font-semibold">
                Create new user
              </h1>
            </div>
            <div className="flex items-center justify-center">
              <div className="flex items-center justify-center mt-8">
                <div
                  className="relative w-32 h-32 rounded-full border-2 border-gray-300 flex items-center justify-center cursor-pointer"
                  onClick={handleImageClick}
                >
                  {previewImage ? (
                    <img
                      src={previewImage}
                      alt="Profile Preview"
                      className="w-full h-full object-cover rounded-full"
                    />
                  ) : (
                    <span className="text-gray-500 text-2xl">
                      <Plus />
                    </span>
                  )}
                </div>
                <Input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  multiple={false}
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>
            </div>

            <form
              onSubmit={handleSubmit(onSubmit)}
              className="mt-6 flex flex-col gap-y-4"
            >
              <div className="flex w-full gap-x-2">
                <div className="w-full">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    {...register("name")}
                    className="w-full"
                    placeholder="Enter name"
                  />
                  {errors.name && (
                    <p className="text-red-500 text-xs">
                      {errors.name.message}
                    </p>
                  )}
                </div>

                <div className="w-full">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    {...register("email")}
                    className="w-full"
                    placeholder="Enter email"
                  />
                  {errors.email && (
                    <p className="text-red-500 text-xs">
                      {errors.email.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex w-full gap-x-2">
                <div className="w-full">
                  <Label htmlFor="role">Role</Label>
                  <Select {...register("role")}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select Role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Owner">Owner</SelectItem>
                      <SelectItem value="Traveller">Traveller</SelectItem>
                      <SelectItem value="Admin">Admin</SelectItem>
                      <SelectItem value="Content">Content Creator</SelectItem>
                      <SelectItem value="Sales">Sales</SelectItem>
                      <SelectItem value="HR">Human Resource(HR)</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.role && (
                    <p className="text-red-500 text-xs">
                      {errors.role.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-x-2 justify-between">
                <div className="w-full">
                  <Label htmlFor="gender">Gender</Label>
                  <Select {...register("gender")} value="Male">
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select Gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Male">Male</SelectItem>
                      <SelectItem value="Female">Female</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.gender && (
                    <p className="text-red-500 text-xs">
                      {errors.gender.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-x-2 justify-between">
                <div className="w-full">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    {...register("password")}
                    type="password"
                    className="w-full"
                    placeholder="Enter password"
                  />
                </div>
              </div>

              <div className="flex items-center gap-x-2 justify-between">
                <div className="w-full">
                  <Label htmlFor="confirm-password">Confirm Password</Label>
                  <Input
                    type="password"
                    className="w-full"
                    placeholder="Enter Confirm password"
                    ref={confirmPasswordRef}
                  />
                </div>
              </div>

              <Button type="submit" disabled={loading} className="w-full">
                {loading ? <Loader /> : "Countinue"}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewUser;
