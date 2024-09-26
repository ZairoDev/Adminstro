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
import { ArrowLeft, ArrowLeftFromLine, Plus } from "lucide-react";
import Link from "next/link";
import React, { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import axios from "axios";
import Loader from "@/components/loader";
import { useBunnyUpload } from "@/hooks/useBunnyUpload";
import { employeeSchema, EmployeeSchema } from "@/schemas/employee.schema";
import { CustomDatePicker } from "@/components/CustomDatePicker";
import PhoneInput from "react-phone-number-input";
import "react-phone-number-input/style.css";
import GotoUserPage from "@/components/GotoUserPage";
import Animation from "@/components/animation";

const NewUser = () => {
  const { toast } = useToast();
  const [profilePic, setProfilepic] = useState("");
  const confirmPasswordRef = useRef<HTMLInputElement>(null);

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
  } = useForm<EmployeeSchema>({
    resolver: zodResolver(employeeSchema),
    defaultValues: {
      name: "",
      email: "",
      nationality: "Indian",
      gender: undefined,
      spokenLanguage: "Hindi",
      accountNo: "",
      ifsc: "",
      aadhar: "",
      alias: "",
      dateOfJoining: new Date(),
      address: "",
      role: undefined,
      experience: 0,
    },
  });

  const [loading, setLoading] = useState(false);

  const onSubmit = async (data: EmployeeSchema) => {
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
      const response = await axios.post(
        "/api/user/createnewEmployee",
        userData
      );
      console.log("Inside Api call", response.data);
      toast({
        title: "Employee created successfully",
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
    setPhone("");
  };

  const selectedRole = watch("role");
  const selectedGender = watch("gender");
  useEffect(() => {
    console.log(selectedRole);
  }, [watch]);

  return (
    <>
      <Animation>
        <div className="  ">
          <div className="flex items-center justify-center">
            <div className=" w-full ">
              <div className="border-2 rounded-lg p-4">
                <div className="border-b ">
                  <h1 className="text-2xl pb-2 text-center font-semibold">
                    Create new employee
                  </h1>
                </div>
                <div className="flex items-center justify-center">
                  <div className="flex items-center sm:flex-row flex-col justify-center mt-8">
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
                    <div className="w-full">
                      <Label htmlFor="role">Role</Label>
                      <Select
                        onValueChange={(value) =>
                          setValue(
                            "role",
                            value as
                              | "Admin"
                              | "Advert"
                              | "Sales"
                              | "Content"
                              | "HR"
                          )
                        } // Update the form value manually
                        value={selectedRole} // Bind the selected value to the form state
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select Role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Admin">Admin</SelectItem>
                          <SelectItem value="Advert">Advert</SelectItem>
                          <SelectItem value="Content">
                            Content Writer
                          </SelectItem>
                          <SelectItem value="Sales">Sales</SelectItem>
                          <SelectItem value="HR">Human Resource(HR)</SelectItem>
                          <SelectItem value="Developer">Developer</SelectItem>
                        </SelectContent>
                      </Select>
                      {/* {errors.role && (
                    <p className="text-red-500 text-xs">
                      {errors.role.message}
                    </p>
                  )} */}
                    </div>
                  </div>

                  <div className="flex w-full sm:flex-row flex-col gap-x-2">
                    <div className="w-full">
                      <Label htmlFor="gender">Gender</Label>
                      <Select
                        // {...register("gender")}
                        onValueChange={(value) =>
                          setValue(
                            "gender",
                            value as "Male" | "Female" | "Other"
                          )
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

                    <div className=" w-full">
                      <Label htmlFor="country">Country</Label>
                      <Input
                        {...register("country")}
                        className="w-full"
                        placeholder="Enter Country"
                      />
                      {errors.country && (
                        <p className="text-red-500 text-xs">
                          {errors.country.message}
                        </p>
                      )}
                    </div>
                    <div className=" w-full">
                      <Label htmlFor="nationality">Nationality</Label>
                      <Input
                        {...register("nationality")}
                        className="w-full"
                        placeholder="Enter Naitonality"
                      />
                      {errors.nationality && (
                        <p className="text-red-500 text-xs">
                          {errors.nationality.message}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* <div className=" flex w-full gap-x-2 justify-between"> */}

                  <div className=" flex w-full sm:flex-row flex-col gap-x-1 justify-between">
                    <div className=" w-full">
                      <Label htmlFor="spokenLanguage">Language</Label>
                      <Input
                        {...register("spokenLanguage")}
                        className="w-full"
                        placeholder="Enter Language"
                      />
                      {errors.spokenLanguage && (
                        <p className="text-red-500 text-xs">
                          {errors.spokenLanguage.message}
                        </p>
                      )}
                    </div>
                    <div className=" w-full">
                      <Label htmlFor="address">Address</Label>
                      <Input
                        {...register("address")}
                        className="w-full"
                        placeholder="Enter Address"
                      />
                      {errors.address && (
                        <p className="text-red-500 text-xs">
                          {errors.address.message}
                        </p>
                      )}
                    </div>
                    <div className=" w-full">
                      <Label htmlFor="accountNo">Account No.</Label>
                      <Input
                        {...register("accountNo")}
                        className="w-full"
                        placeholder="Enter Account number"
                      />
                      {errors.accountNo && (
                        <p className="text-red-500 text-xs">
                          {errors.accountNo.message}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className=" flex w-full sm:flex-row flex-col gap-x-2 justify-between">
                    <div className=" w-full">
                      <Label htmlFor="ifsc">IFSC Code</Label>
                      <Input
                        {...register("ifsc")}
                        className="w-full"
                        placeholder="Enter IFSC code"
                      />
                      {errors.ifsc && (
                        <p className="text-red-500 text-xs">
                          {errors.ifsc.message}
                        </p>
                      )}
                    </div>
                    <div className=" w-full">
                      <Label htmlFor="aadhar">Aadhar No.</Label>
                      <Input
                        {...register("aadhar")}
                        className="w-full"
                        placeholder="Enter you Aadhar number"
                      />
                      {errors.aadhar && (
                        <p className="text-red-500 text-xs">
                          {errors.aadhar.message}
                        </p>
                      )}
                    </div>
                    <div className=" w-full">
                      <Label htmlFor="alias">Alias</Label>
                      <Input
                        {...register("alias")}
                        className="w-full"
                        placeholder="Enter Alias name"
                      />
                      {errors.alias && (
                        <p className="text-red-500 text-xs">
                          {errors.alias.message}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex w-full sm:flex-row flex-col gap-x-2 justify-between items-center">
                    <div className=" w-full">
                      <Label htmlFor="experience">Experience</Label>
                      <Input
                        {...register("experience", { valueAsNumber: true })}
                        type={"number"}
                        className="w-full"
                        min={0}
                        placeholder="Enter the value in months"
                      />
                      {errors.experience && (
                        <p className="text-red-500 text-xs">
                          {errors.experience.message}
                        </p>
                      )}
                    </div>
                    <div className="w-full ">
                      <Label htmlFor="phone">Phone Number</Label>
                      <PhoneInput
                        {...register("phone")}
                        className="phone-input border-red-500"
                        placeholder="Enter phone number"
                        value={phone}
                        international
                        countryCallingCodeEditable={false}
                        error={"Phone number required"}
                        onChange={(value) => setPhone(value?.toString())}
                      />
                      {errors.phone && (
                        <p className="text-red-500 text-xs">
                          {errors?.phone?.message}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center sm:flex-row flex-col gap-x-2 justify-between">
                    <div className=" w-full">
                      <Label htmlFor="dateOfJoining">Date Of Joining</Label>
                      {/* <CustomDatePicker /> */}
                      <CustomDatePicker control={control} />
                      {errors.dateOfJoining && (
                        <p className="text-red-500 text-xs">
                          {errors.dateOfJoining.message}
                        </p>
                      )}
                    </div>
                    <div className="w-full">
                      <Label htmlFor="password">Password</Label>
                      <Input
                        {...register("password")}
                        type="password"
                        className="w-full"
                        placeholder="Enter password"
                      />
                      {errors.password && (
                        <p className="text-red-500 text-xs">
                          {errors.password.message}
                        </p>
                      )}
                    </div>

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
                  <div className="flex items-end justify-start">
                    <Button type="submit" className="w-full sm:w-2/6">
                      {loading ? <Loader /> : "Continue"}
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </Animation>
    </>
  );
};

export default NewUser;
