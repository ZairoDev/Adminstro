"use client";

import axios from "axios";
import {
  Plus,
  User,
  Briefcase,
  CreditCard,
  FileText,
  Camera,
} from "lucide-react";
import { useForm } from "react-hook-form";
import "react-phone-number-input/style.css";
import React, { useEffect, useRef, useState } from "react";
import PhoneInput from "react-phone-number-input";

import {
  Select,
  SelectItem,
  SelectValue,
  SelectTrigger,
  SelectContent,
} from "@/components/ui/select";
import Loader from "@/components/loader";
import Heading from "@/components/Heading";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { zodResolver } from "@hookform/resolvers/zod";
import { useBunnyUpload } from "@/hooks/useBunnyUpload";
import { CustomDatePicker } from "@/components/CustomDatePicker";
import { employeeSchema, EmployeeSchema } from "@/schemas/employee.schema";


const NewUser = () => {
  const { toast } = useToast();
  const [profilePic, setProfilepic] = useState("");
  const [country, setCountry] = useState<String[]>([]);
  const [city, setCity] = useState<String[]>([]);
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

  const fetchCountry = async ({ target }: { target: String }) => {
    try {
      const response = await axios.get(`/api/addons/target/getLocations?target=${target}`);
      console.log(response.data);
      if(target === 'country'){
        setCountry(response.data.data);
      }
      else{
        setCity(response.data.data);
      }
    } catch (err) {
      toast({
        variant: "destructive",
        title: "An unexpected error occurred",
        description: "Please try again.",
      });
    }
  };
  useEffect(()=>{
    fetchCountry({target:'country'});
    fetchCountry({target:'city'});
  },[]);

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
      allotedArea: [],
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
    if (userData.password !== confirmPasswordRef.current?.value) {
      toast({
        variant: "destructive",
        description: "Passwords do not match please try again.",
      });
      setLoading(false);
      return;
    }
    try {
      const response = await axios.post(
        "/api/user/createnewEmployee",
        userData
      );
      toast({
        description: "Employee created successfully",
      });
      reset();
    } catch (error: any) {
      console.error("Error creating user:", error);
      toast({
        variant: "destructive",
        description: error.response?.data?.error || "An error occurred.",
      });
      setLoading(false);
    } finally {
      setLoading(false);
    }
    setPhone("");
  };

  const selectedArea = watch("allotedArea");
  const selectedRole = watch("role");
  const selectedGender = watch("gender");
  const selectedEmpType = watch("empType");
  const selectedCountry = watch("assignedCountry");
  const selectedCity = watch("allotedArea");

  return (
    <div className="min-h-screen  bg-white dark:bg-stone-950 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Heading
          heading="Create New Employee"
          subheading="Register a new employee to your organization with all necessary details."
        />

        <div className="mt-8">
          <div className="bg-white dark:bg-stone-950 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            {/* Profile Picture Section */}
            <div className=" px-8 py-12">
              <div className="flex flex-col items-center">
                <div className="relative group">
                  <div
                    className="relative w-32 h-32 rounded-full border-4 border-white shadow-lg bg-white flex items-center justify-center cursor-pointer transition-all duration-300 group-hover:scale-105"
                    onClick={handleImageClick}
                  >
                    {previewImage ? (
                      <img
                        src={previewImage || "/placeholder.svg"}
                        alt="Profile Preview"
                        className="w-full h-full object-cover rounded-full"
                      />
                    ) : (
                      <div className="flex flex-col items-center text-slate-400">
                        <Camera className="w-8 h-8 mb-2" />
                        <span className="text-xs font-medium">Add Photo</span>
                      </div>
                    )}
                    <div className="absolute inset-0 rounded-full bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-300 flex items-center justify-center">
                      <Plus className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    </div>
                  </div>
                </div>
                <p className="mt-4 text-white text-sm font-medium">
                  Click to upload profile picture
                </p>
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

            <form onSubmit={handleSubmit(onSubmit)} className="p-8 space-y-8">
              {/* Personal Details Section */}
              <section className="space-y-6">
                <div className="flex items-center gap-3 pb-4 border-b border-slate-200 dark:border-slate-700">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                    <User className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                    Personal Details
                  </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label
                      htmlFor="name"
                      className="text-sm font-medium text-slate-700 dark:text-slate-300"
                    >
                      Full Name *
                    </Label>
                    <Input
                      {...register("name")}
                      className="h-11"
                      placeholder="Enter full name"
                    />
                    {errors.name && (
                      <p className="text-red-500 text-xs mt-1">
                        {errors.name.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="email"
                      className="text-sm font-medium text-slate-700 dark:text-slate-300"
                    >
                      Email Address *
                    </Label>
                    <Input
                      {...register("email")}
                      className="h-11"
                      placeholder="Enter email address"
                      type="email"
                    />
                    {errors.email && (
                      <p className="text-red-500 text-xs mt-1">
                        {errors.email.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="gender"
                      className="text-sm font-medium text-slate-700 dark:text-slate-300"
                    >
                      Gender *
                    </Label>
                    <Select
                      onValueChange={(value) =>
                        setValue("gender", value as "Male" | "Female" | "Other")
                      }
                      value={selectedGender}
                    >
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="Select gender" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Male">Male</SelectItem>
                        <SelectItem value="Female">Female</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.gender && (
                      <p className="text-red-500 text-xs mt-1">
                        {errors.gender.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="country"
                      className="text-sm font-medium text-slate-700 dark:text-slate-300"
                    >
                      Country
                    </Label>
                    <Input
                      {...register("country")}
                      className="h-11"
                      placeholder="Enter country"
                    />
                    {errors.country && (
                      <p className="text-red-500 text-xs mt-1">
                        {errors.country.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="nationality"
                      className="text-sm font-medium text-slate-700 dark:text-slate-300"
                    >
                      Nationality
                    </Label>
                    <Input
                      {...register("nationality")}
                      className="h-11"
                      placeholder="Enter nationality"
                    />
                    {errors.nationality && (
                      <p className="text-red-500 text-xs mt-1">
                        {errors.nationality.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="spokenLanguage"
                      className="text-sm font-medium text-slate-700 dark:text-slate-300"
                    >
                      Primary Language
                    </Label>
                    <Input
                      {...register("spokenLanguage")}
                      className="h-11"
                      placeholder="Enter primary language"
                    />
                    {errors.spokenLanguage && (
                      <p className="text-red-500 text-xs mt-1">
                        {errors.spokenLanguage.message}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="address"
                    className="text-sm font-medium text-slate-700 dark:text-slate-300"
                  >
                    Address
                  </Label>
                  <Input
                    {...register("address")}
                    className="h-11"
                    placeholder="Enter complete address"
                  />
                  {errors.address && (
                    <p className="text-red-500 text-xs mt-1">
                      {errors.address.message}
                    </p>
                  )}
                </div>
              </section>

              {/* Job Details Section */}
              <section className="space-y-6">
                <div className="flex items-center gap-3 pb-4 border-b border-slate-200 dark:border-slate-700">
                  <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                    <Briefcase className="w-5 h-5 text-green-600 dark:text-green-400" />
                  </div>
                  <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                    Job Details
                  </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label
                      htmlFor="role"
                      className="text-sm font-medium text-slate-700 dark:text-slate-300"
                    >
                      Role *
                    </Label>
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
                      }
                      value={selectedRole}
                    >
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Admin">Admin</SelectItem>
                        <SelectItem value="Advert">Advert</SelectItem>
                        <SelectItem value="LeadGen">LeadGen</SelectItem>
                        <SelectItem value="LeadGen-TeamLead">
                          LeadGen-TeamLead
                        </SelectItem>
                        <SelectItem value="Content">Content Writer</SelectItem>
                        <SelectItem value="Sales">Sales</SelectItem>
                        <SelectItem value="Sales-TeamLead">
                          Sales-TeamLead
                        </SelectItem>
                        <SelectItem value="HR">Human Resource (HR)</SelectItem>
                        <SelectItem value="Developer">Developer</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.role && (
                      <p className="text-red-500 text-xs mt-1">
                        {errors.role.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="empType"
                      className="text-sm font-medium text-slate-700 dark:text-slate-300"
                    >
                      Employment Type *
                    </Label>
                    <Select
                      onValueChange={(value) =>
                        setValue(
                          "empType",
                          value as "Intern" | "Probation" | "Permanent"
                        )
                      }
                      value={selectedEmpType}
                    >
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="Select employment type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Intern">Intern</SelectItem>
                        <SelectItem value="Probation">Probation</SelectItem>
                        <SelectItem value="Permanent">Permanent</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.empType && (
                      <p className="text-red-500 text-xs mt-1">
                        {errors.empType.message}
                      </p>
                    )}
                  </div>
                  {selectedEmpType !== "Permanent" && (
                    <div className="space-y-2">
                      <Label
                        htmlFor="duration"
                        className="text-sm font-medium text-slate-700 dark:text-slate-300"
                      >
                        Duration (months)
                      </Label>
                      <Input
                        {...register("duration")}
                        type="number"
                        className="h-11"
                        placeholder="Enter duration"
                        min="1"
                      />
                      {errors.duration && (
                        <p className="text-red-500 text-xs mt-1">
                          {errors.duration.message}
                        </p>
                      )}
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label
                      htmlFor="experience"
                      className="text-sm font-medium text-slate-700 dark:text-slate-300"
                    >
                      Experience (months)
                    </Label>
                    <Input
                      {...register("experience", { valueAsNumber: true })}
                      type="number"
                      className="h-11"
                      min={0}
                      placeholder="Enter experience in months"
                    />
                    {errors.experience && (
                      <p className="text-red-500 text-xs mt-1">
                        {errors.experience.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="phone"
                      className="text-sm font-medium text-slate-700 dark:text-slate-300"
                    >
                      Phone Number *
                    </Label>
                    <div className="phone-input-wrapper">
                      <PhoneInput
                        {...register("phone")}
                        className="phone-input h-11"
                        placeholder="Enter phone number"
                        value={phone}
                        international
                        countryCallingCodeEditable={false}
                        onChange={(value) => setPhone(value?.toString())}
                      />
                    </div>
                    {errors.phone && (
                      <p className="text-red-500 text-xs mt-1">
                        {errors.phone.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="dateOfJoining"
                      className="text-sm font-medium text-slate-700 dark:text-slate-300"
                    >
                      Date of Joining *
                    </Label>
                    <CustomDatePicker control={control} />
                    {errors.dateOfJoining && (
                      <p className="text-red-500 text-xs mt-1">
                        {errors.dateOfJoining.message}
                      </p>
                    )}
                  </div>
                  {(selectedRole === "Sales" ||
                    selectedRole === "Sales-TeamLead") && (
                    <>
                      <div className="space-y-2">
                        <Label
                          htmlFor="assignedCountry"
                          className="text-sm font-medium text-slate-700 dark:text-slate-300"
                        >
                          Assigned Country *
                        </Label>
                        <Select
                          onValueChange={(value) =>
                            setValue("assignedCountry", value)
                          }
                          value={selectedCountry}
                        >
                          <SelectTrigger className="h-11">
                            <SelectValue placeholder="Select employment type" />
                          </SelectTrigger>
                          <SelectContent>
                            {country.map((country: String, index) => (
                              <SelectItem key={index} value={country.toString()}>
                                {country}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        {errors.assignedCountry && (
                          <p className="text-red-500 text-xs mt-1">
                            {errors.assignedCountry.message}
                          </p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label
                          htmlFor="allotedArea"
                          className="text-sm font-medium text-slate-700 dark:text-slate-300"
                        >
                          Alloted Area *
                        </Label>
                        <Select
                          onValueChange={(value) =>
                            setValue("allotedArea", [value as string])
                          }
                          value={selectedCity?.[0]}
                        >
                          <SelectTrigger className="h-11">
                            <SelectValue placeholder="Select Alloted type" />
                          </SelectTrigger>
                          <SelectContent>
                            {city.map((country: String,index) => (
                              <SelectItem key = {index} value={country.toString()}>
                                {country}
                              </SelectItem>
                            ))}
                            {/* <SelectItem value="Intern">Intern</SelectItem> */}
                          </SelectContent>
                        </Select>
                        {errors.assignedCountry && (
                          <p className="text-red-500 text-xs mt-1">
                            {errors.assignedCountry.message}
                          </p>
                        )}
                      </div>
                    </>
                  )}

                  <div>
                    <label
                      htmlFor="salary"
                      className="text-sm font-medium text-slate-700 dark:text-slate-300"
                    >
                      Salary *{" "}
                    </label>
                    <Input
                      {...register("salary", { valueAsNumber: true })}
                      className="h-11 mt-2"
                      type="number"
                      placeholder="Enter salary"
                    />
                    {errors.salary && (
                      <p className="text-red-500 text-xs mt-1">
                        {errors.salary.message}
                      </p>
                    )}
                  </div>
                </div>
              </section>

              {/* Bank Details Section */}
              <section className="space-y-6">
                <div className="flex items-center gap-3 pb-4 border-b border-slate-200 dark:border-slate-700">
                  <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                    <CreditCard className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                    Bank Details
                  </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label
                      htmlFor="accountNo"
                      className="text-sm font-medium text-slate-700 dark:text-slate-300"
                    >
                      Account Number
                    </Label>
                    <Input
                      {...register("accountNo")}
                      className="h-11"
                      placeholder="Enter account number"
                    />
                    {errors.accountNo && (
                      <p className="text-red-500 text-xs mt-1">
                        {errors.accountNo.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="ifsc"
                      className="text-sm font-medium text-slate-700 dark:text-slate-300"
                    >
                      IFSC Code
                    </Label>
                    <Input
                      {...register("ifsc")}
                      className="h-11"
                      placeholder="Enter IFSC code"
                    />
                    {errors.ifsc && (
                      <p className="text-red-500 text-xs mt-1">
                        {errors.ifsc.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="alias"
                      className="text-sm font-medium text-slate-700 dark:text-slate-300"
                    >
                      Account Alias
                    </Label>
                    <Input
                      {...register("alias")}
                      className="h-11"
                      placeholder="Enter account alias"
                    />
                    {errors.alias && (
                      <p className="text-red-500 text-xs mt-1">
                        {errors.alias.message}
                      </p>
                    )}
                  </div>
                </div>
              </section>

              {/* Documents & Security Section */}
              <section className="space-y-6">
                <div className="flex items-center gap-3 pb-4 border-b border-slate-200 dark:border-slate-700">
                  <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-lg">
                    <FileText className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                  </div>
                  <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                    Documents & Security
                  </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label
                      htmlFor="aadhar"
                      className="text-sm font-medium text-slate-700 dark:text-slate-300"
                    >
                      Aadhar Number
                    </Label>
                    <Input
                      {...register("aadhar")}
                      className="h-11"
                      placeholder="Enter Aadhar number"
                    />
                    {errors.aadhar && (
                      <p className="text-red-500 text-xs mt-1">
                        {errors.aadhar.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="password"
                      className="text-sm font-medium text-slate-700 dark:text-slate-300"
                    >
                      Password *
                    </Label>
                    <Input
                      {...register("password")}
                      type="password"
                      className="h-11"
                      placeholder="Enter password"
                    />
                    {errors.password && (
                      <p className="text-red-500 text-xs mt-1">
                        {errors.password.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="confirm-password"
                      className="text-sm font-medium text-slate-700 dark:text-slate-300"
                    >
                      Confirm Password *
                    </Label>
                    <Input
                      type="password"
                      className="h-11"
                      placeholder="Confirm password"
                      ref={confirmPasswordRef}
                    />
                  </div>
                </div>
              </section>

              {/* Submit Button */}
              <div className="flex justify-end pt-6 border-t border-slate-200 dark:border-slate-700">
                <Button
                  type="submit"
                  className="px-8 py-3 h-12 hover:bg-stone-900 bg-stone-800 text-white font-medium rounded-lg shadow-lg hover:shadow-xl transition-all duration-300"
                  disabled={loading}
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <Loader />
                      <span>Creating Employee...</span>
                    </div>
                  ) : (
                    "Create Employee"
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewUser;
