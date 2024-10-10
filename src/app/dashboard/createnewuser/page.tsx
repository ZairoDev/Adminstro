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
import { Loader, Plus } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import axios from "axios";
import { userSchema } from "@/schemas/user.schema";
import { UserSchema } from "@/schemas/user.schema";
import { useBunnyUpload } from "@/hooks/useBunnyUpload";
import PhoneInput from "react-phone-number-input";
import "react-phone-number-input/style.css";
import GotoUserPage from "@/components/GotoUserPage";
import Animation from "@/components/animation";
import Heading from "@/components/Heading";

const NewUser = () => {
  const { toast } = useToast();
  const [profilePic, setProfilepic] = useState("");

  const { uploadFiles } = useBunnyUpload();
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [phone, setPhone] = useState<string | undefined>(undefined);

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
    watch,
    setValue,
    control,
  } = useForm<UserSchema>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      name: "",
      email: "",
      sendDetails: false,
      nationality: "",
      gender: undefined,
      spokenLanguage: "",
      bankDetails: "",
      phone: "",
      address: "",
      role: undefined,
    },
  });

  const [loading, setLoading] = useState(false);
  const selectedRole = watch("role");
  const selectedGender = watch("gender");
  useEffect(() => {
    console.log(selectedRole);
  }, [watch]);

  const onSubmit = async (data: UserSchema) => {
    console.log(data, "I am submitting");
    setLoading(true);
    const userData = {
      ...data,
      profilePic,
    };

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
    <>
      <Animation>
        <Heading
          heading="Create new user"
          subheading="You can register new user from here."
        />
        <div className="h-full">
          <div className=" ">
            <div className="border-2 rounded-lg p-4">
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
                <div className="flex sm:flex-row flex-col w-full gap-x-2">
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

                <div className="flex w-full sm:flex-row flex-col gap-x-2">
                  <div className="w-full">
                    <Label htmlFor="bankDetails">Bank Details</Label>
                    <Input
                      {...register("bankDetails")}
                      className="w-full"
                      placeholder="Enter bank details"
                    />
                    {errors.bankDetails && (
                      <p className="text-red-500 text-xs">
                        {errors.bankDetails.message}
                      </p>
                    )}
                  </div>
                  <div className="w-full">
                    <Label htmlFor="role">Role</Label>
                    <Select
                      onValueChange={(value) =>
                        setValue("role", value as "Traveller" | "Owner")
                      } // Update the form value manually
                      value={selectedRole} // Bind the selected value to the form state
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select Role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Traveller">Traveller</SelectItem>
                        <SelectItem value="Owner">Owner</SelectItem>
                      </SelectContent>
                    </Select>
                    {/* {errors.role && (
                    <p className="text-red-500 text-xs">
                      {errors.role.message}
                    </p>
                  )} */}
                  </div>
                </div>
                <div>
                  <div className="w-full ">
                    <Label htmlFor="phone">Phone Number</Label>
                    <PhoneInput
                      {...register("phone")}
                      className="phone-input"
                      placeholder="Enter phone number"
                      value={phone}
                      international
                      countryCallingCodeEditable={false}
                      error={
                        // phone
                        //   ? isValidPhoneNumber(phone)
                        //     ? undefined
                        //     : "Invalid phone number"
                        "Phone number required"
                      }
                      onChange={(value) => setPhone(value?.toString())}
                    />
                    {errors.phone && (
                      <p className="text-red-500 text-xs">
                        {errors?.phone?.message}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex w-full sm:flex-row flex-col gap-x-2">
                  <div className="w-full">
                    <Label htmlFor="nationality">Nationality</Label>
                    <Input
                      {...register("nationality")}
                      className="w-full"
                      placeholder="Enter nationality"
                    />
                    {errors.nationality && (
                      <p className="text-red-500 text-xs">
                        {errors.nationality.message}
                      </p>
                    )}
                  </div>

                  <div className="w-full">
                    <Label htmlFor="spokenLanguage">Language</Label>
                    <Input
                      {...register("spokenLanguage")}
                      className="w-full"
                      placeholder="Enter language"
                    />
                    {errors.spokenLanguage && (
                      <p className="text-red-500 text-xs">
                        {errors.spokenLanguage.message}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex sm:flex-row flex-col items-center gap-x-2 justify-between">
                  <div className="w-full">
                    <Label htmlFor="address">Address</Label>
                    <Input
                      {...register("address")}
                      className="w-full"
                      placeholder="Enter address"
                    />
                    {errors.address && (
                      <p className="text-red-500 text-xs">
                        {errors.address.message}
                      </p>
                    )}
                  </div>

                  <div className="w-full">
                    <Label htmlFor="gender">Gender</Label>
                    <Select
                      // {...register("gender")}
                      onValueChange={(value) =>
                        setValue("gender", value as "Male" | "Female" | "Other")
                      } // Update the form value manually
                      value={selectedGender}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select Gender" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Male">Male</SelectItem>
                        <SelectItem value="Female">Female</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.gender && (
                      <p className="text-red-500 text-xs">
                        {errors.gender.message}
                      </p>
                    )}
                  </div>

                  {/* <div className="w-full">
                  <Label htmlFor="gender">Gender</Label>
                  <Select {...register("gender")} value="Male">
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select Gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Male">Male</SelectItem>
                      <SelectItem value="Female">Female</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.gender && (
                    <p className="text-red-500 text-xs">
                      {errors.gender.message}
                    </p>
                  )}
                </div> */}
                </div>

                <div className="flex items-center gap-x-2">
                  <Label
                    htmlFor="sendDetails"
                    className="flex items-center gap-x-2"
                  >
                    <input
                      type="checkbox"
                      {...register("sendDetails")}
                      className="h-4 w-4"
                    />
                    <span>Send registration details to email</span>
                  </Label>
                </div>

                <div className="flex  items-end justify-start">
                  <Button type="submit" className="w-full sm:w-2/6">
                    {loading ? (
                      <>
                        Creating...
                        <Loader className="animate-spin" size={18} />{" "}
                      </>
                    ) : (
                      "Continue"
                    )}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </Animation>
    </>
  );
};

export default NewUser;
