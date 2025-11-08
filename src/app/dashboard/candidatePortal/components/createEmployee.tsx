// Complete, reusable NewUser component that can prefill from a candidate
"use client";

import axios from "axios";
import {
  User,
  Briefcase,
  CreditCard,
  FileText,
  Camera,
  Plus,
} from "lucide-react";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import PhoneInput from "react-phone-number-input";
import "react-phone-number-input/style.css";

import { employeeSchema, type EmployeeSchema } from "@/schemas/employee.schema";
import { useToast } from "@/hooks/use-toast";
import { useBunnyUpload } from "@/hooks/useBunnyUpload";
import Heading from "@/components/Heading";
import Loader from "@/components/loader";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { CustomDatePicker } from "@/components/CustomDatePicker";
import {
  Select,
  SelectItem,
  SelectValue,
  SelectTrigger,
  SelectContent,
} from "@/components/ui/select";

// --- Types ---
export type CandidateLite = {
  _id?: string;
  name?: string;
  email?: string;
  phone?: string;
  experience?: number;
  address?: string;
  city?: string; // ignored in form (no city field in EmployeeSchema)
  fatherName?: string;
  country?: string;
  position?: string; // optionally mapped to role
  spokenLanguage?: string;
  gender?: "Male" | "Female" | "Other" | string;
  resumeUrl?: string; // used as profilePic default (optional)
};

export interface NewUserProps {
  /** Option A: Pass a candidate id; component will fetch & prefill. */
  candidateId?: string;
  /** Option B: Pass a candidate object directly. */
  candidate?: CandidateLite | null;
  /** Called after successful creation. */
  onCreated?: (payload: { employeeId?: string; employee?: any }) => void;
}

const NewUser: React.FC<NewUserProps> = ({ candidateId, candidate: candidateProp = null, onCreated }) => {
  const { toast } = useToast();
  const { uploadFiles } = useBunnyUpload();

  const [profilePic, setProfilepic] = useState("");
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [locationsCountry, setLocationsCountry] = useState<string[]>([]);
  const [locationsCity, setLocationsCity] = useState<string[]>([]);
  const [phone, setPhone] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [prefillLoading, setPrefillLoading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const confirmPasswordRef = useRef<HTMLInputElement>(null);

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
      salary: undefined as unknown as number, // keep schema happy if required
      country: "",
      empType: undefined,
      assignedCountry: undefined as unknown as string,
      phone: undefined as unknown as string,
    },
  });

  // --- Prefill logic ---
  const prefillFrom = useMemo<CandidateLite | null>(() => candidateProp || null, [candidateProp]);

  useEffect(() => {
    // Fetch locations
    const fetchLocations = async () => {
      try {
        const [c1, c2] = await Promise.all([
          axios.get(`/api/addons/target/getLocations?target=country`),
          axios.get(`/api/addons/target/getLocations?target=city`),
        ]);
        setLocationsCountry(c1.data?.data || []);
        setLocationsCity(c2.data?.data || []);
      } catch {
        // non-fatal
      }
    };
    fetchLocations();
  }, []);

  useEffect(() => {
    const prefill = async () => {
      let data: CandidateLite | null = prefillFrom;
      if (!data && candidateId) {
        try {
          setPrefillLoading(true);
          const res = await axios.get(`/api/candidate/${candidateId}`);
          data = res?.data?.data || null;
        } catch (e) {
          toast({ variant: "destructive", description: "Failed to load candidate details." });
        } finally {
          setPrefillLoading(false);
        }
      }
      if (!data) return;

      setValue("name", data.name || "");
      setValue("email", data.email || "");
      setValue("country", data.country || "");
      setValue("address", data.address || "");
      setValue("nationality", data.country || "Indian");
      setValue("gender", (data.gender as any) || undefined);
      setValue("experience", data.experience ?? 0);
      setValue("spokenLanguage", data.spokenLanguage || "Hindi");
      if (data.position) setValue("role", (data.position as any));

      setPhone(data.phone || "");

      if (data.resumeUrl) {
        setProfilepic(data.resumeUrl);
        setPreviewImage(data.resumeUrl);
      }
    };

    prefill();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candidateId, prefillFrom]);

  // --- Handlers ---
  const handleImageClick = () => fileInputRef.current?.click();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    const reader = new FileReader();
    reader.onload = (event) => setPreviewImage(event.target?.result as string);
    reader.readAsDataURL(file);

    toast({ title: "Processing..", description: "Your image is being uploaded." });
    try {
      const { imageUrls, error } = await uploadFiles([file]);
      if (error) {
        toast({ variant: "destructive", description: "Image upload failed." });
      } else {
        setProfilepic(imageUrls[0]);
        toast({ title: "Upload successful", description: "Image uploaded successfully." });
      }
    } catch {
      toast({ variant: "destructive", title: "Unexpected error", description: "Please try again." });
    }
  };

  const onSubmit = async (data: EmployeeSchema) => {
    setLoading(true);

    const userData = {
      ...data,
      profilePic,
      phone,
      candidateId: candidateProp?._id || candidateId || null,
    } as any;

    if (userData.password !== confirmPasswordRef.current?.value) {
      toast({ variant: "destructive", description: "Passwords do not match." });
      setLoading(false);
      return;
    }

    try {
      const res = await axios.post("/api/user/createnewEmployee", userData);
      toast({ description: "Employee created successfully" });
      onCreated?.({ employeeId: res?.data?.data?._id, employee: res?.data?.data });
      reset();
      setPhone("");
      setProfilepic("");
      setPreviewImage(null);
    } catch (error: any) {
      toast({ variant: "destructive", description: error.response?.data?.error || "Error occurred." });
    } finally {
      setLoading(false);
    }
  };

  // --- Watches ---
  const selectedRole = watch("role");
  const selectedGender = watch("gender");
  const selectedEmpType = watch("empType");
  const selectedCountry = watch("assignedCountry");
  const selectedCity = watch("allotedArea");

  return (
    <div className="min-h-screen bg-white dark:bg-stone-950 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Heading
          heading="Create New Employee"
          subheading={candidateId || candidateProp ? "Auto-filled from candidate details" : "Register a new employee"}
        />

        <div className="mt-8">
          <div className="bg-white dark:bg-stone-950 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            {/* Avatar */}
            <div className="px-8 py-12 flex flex-col items-center">
              <div className="relative group">
                <div
                  className="relative w-32 h-32 rounded-full border-4 border-white shadow-lg bg-white flex items-center justify-center cursor-pointer transition-all duration-300 group-hover:scale-105"
                  onClick={handleImageClick}
                  aria-label="Upload profile picture"
                >
                  {previewImage ? (
                    <img src={previewImage} alt="Preview" className="w-full h-full object-cover rounded-full" />
                  ) : (
                    <div className="flex flex-col items-center text-slate-400">
                      <Camera className="w-8 h-8 mb-2" />
                      <span className="text-xs font-medium">Add Photo</span>
                    </div>
                  )}
                  <div className="absolute inset-0 rounded-full bg-black/0 group-hover:bg-black/20 transition" />
                </div>
                <button
                  type="button"
                  onClick={handleImageClick}
                  className="absolute -bottom-2 -right-2 p-2 rounded-full bg-stone-800 text-white shadow"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <Input type="file" ref={fileInputRef} accept="image/*" multiple={false} onChange={handleFileChange} className="hidden" />
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="p-8 space-y-8">
              {/* PERSONAL DETAILS */}
              <section className="space-y-6">
                <div className="flex items-center gap-3 pb-4 border-b border-slate-200 dark:border-slate-700">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                    <User className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Personal Details</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>Full Name *</Label>
                    <Input {...register("name")} className="h-11" placeholder="Enter full name" />
                    {errors.name && <p className="text-red-500 text-xs">{errors.name.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label>Email *</Label>
                    <Input {...register("email")} className="h-11" type="email" placeholder="Enter email" />
                    {errors.email && <p className="text-red-500 text-xs">{errors.email.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label>Gender *</Label>
                    <Select onValueChange={(v) => setValue("gender", v as any)} value={selectedGender}>
                      <SelectTrigger className="h-11"><SelectValue placeholder="Select gender" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Male">Male</SelectItem>
                        <SelectItem value="Female">Female</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.gender && <p className="text-red-500 text-xs">{(errors as any).gender?.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label>Country</Label>
                    <Input {...register("country")} className="h-11" placeholder="Enter country" />
                    {errors.country && <p className="text-red-500 text-xs">{(errors as any).country?.message}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2 md:col-span-2">
                    <Label>Address</Label>
                    <Input {...register("address")} className="h-11" placeholder="Enter complete address" />
                    {errors.address && <p className="text-red-500 text-xs">{errors.address.message}</p>}
                  </div>
                </div>
              </section>

              {/* JOB DETAILS */}
              <section className="space-y-6">
                <div className="flex items-center gap-3 pb-4 border-b border-slate-200 dark:border-slate-700">
                  <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg"><Briefcase className="w-5 h-5 text-green-700 dark:text-green-300" /></div>
                  <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Job Details</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label>Role *</Label>
                    <Select onValueChange={(v) => setValue("role", v as any)} value={selectedRole}>
                      <SelectTrigger className="h-11"><SelectValue placeholder="Select role" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Admin">Admin</SelectItem>
                        <SelectItem value="Advert">Advert</SelectItem>
                        <SelectItem value="LeadGen">LeadGen</SelectItem>
                        <SelectItem value="LeadGen-TeamLead">LeadGen-TeamLead</SelectItem>
                        <SelectItem value="Content">Content Writer</SelectItem>
                        <SelectItem value="Sales">Sales</SelectItem>
                        <SelectItem value="Sales-TeamLead">Sales-TeamLead</SelectItem>
                        <SelectItem value="HR">Human Resource (HR)</SelectItem>
                        <SelectItem value="Developer">Developer</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.role && <p className="text-red-500 text-xs">{(errors as any).role?.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label>Employment Type *</Label>
                    <Select onValueChange={(v) => setValue("empType", v as any)} value={selectedEmpType}>
                      <SelectTrigger className="h-11"><SelectValue placeholder="Select employment type" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Intern">Intern</SelectItem>
                        <SelectItem value="Probation">Probation</SelectItem>
                        <SelectItem value="Permanent">Permanent</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.empType && <p className="text-red-500 text-xs">{(errors as any).empType?.message}</p>}
                  </div>

                  {selectedEmpType !== "Permanent" && (
                    <div className="space-y-2">
                      <Label>Duration (months)</Label>
                      <Input {...register("duration", { valueAsNumber: true })} type="number" min={1} className="h-11" placeholder="Enter duration" />
                      {errors.duration && <p className="text-red-500 text-xs">{(errors as any).duration?.message}</p>}
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>Experience (months)</Label>
                    <Input {...register("experience", { valueAsNumber: true })} type="number" min={0} className="h-11" placeholder="Enter experience in months" />
                    {errors.experience && <p className="text-red-500 text-xs">{errors.experience.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label>Phone Number *</Label>
                    <div className="phone-input-wrapper">
                      <PhoneInput value={phone} onChange={(v) => setPhone((v || "").toString())} className="phone-input h-11" placeholder="Enter phone number" international countryCallingCodeEditable={false} />
                    </div>
                    {errors.phone && <p className="text-red-500 text-xs">{(errors as any).phone?.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label>Date of Joining *</Label>
                    <CustomDatePicker control={control} />
                    {errors.dateOfJoining && <p className="text-red-500 text-xs">{(errors as any).dateOfJoining?.message}</p>}
                  </div>

                  {(selectedRole === "Sales" || selectedRole === "Sales-TeamLead") && (
                    <>
                      <div className="space-y-2">
                        <Label>Assigned Country *</Label>
                        <Select onValueChange={(v) => setValue("assignedCountry", v as any)} value={selectedCountry}>
                          <SelectTrigger className="h-11"><SelectValue placeholder="Select country" /></SelectTrigger>
                          <SelectContent>
                            {locationsCountry.map((c) => (
                              <SelectItem key={c} value={c}>{c}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {errors.assignedCountry && <p className="text-red-500 text-xs">{(errors as any).assignedCountry?.message}</p>}
                      </div>

                      <div className="space-y-2">
                        <Label>Alloted Area *</Label>
                        <Select onValueChange={(v) => setValue("allotedArea", [v])} value={selectedCity?.[0]}> 
                          <SelectTrigger className="h-11"><SelectValue placeholder="Select area" /></SelectTrigger>
                          <SelectContent>
                            {locationsCity.map((ct) => (
                              <SelectItem key={ct} value={ct.toString()}> {ct.toString()} </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {errors.allotedArea && <p className="text-red-500 text-xs">{(errors as any).allotedArea?.message}</p>}
                      </div>
                    </>
                  )}

                  <div className="space-y-2">
                    <Label>Salary *</Label>
                    <Input {...register("salary", { valueAsNumber: true })} type="number" className="h-11" placeholder="Enter salary" />
                    {errors.salary && <p className="text-red-500 text-xs">{(errors as any).salary?.message}</p>}
                  </div>
                </div>
              </section>

              {/* BANK DETAILS */}
              <section className="space-y-6">
                <div className="flex items-center gap-3 pb-4 border-b border-slate-200 dark:border-slate-700">
                  <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg"><CreditCard className="w-5 h-5 text-purple-700 dark:text-purple-300" /></div>
                  <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Bank Details</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label>Account Number</Label>
                    <Input {...register("accountNo")} className="h-11" placeholder="Enter account number" />
                    {errors.accountNo && <p className="text-red-500 text-xs">{(errors as any).accountNo?.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label>IFSC Code</Label>
                    <Input {...register("ifsc")} className="h-11" placeholder="Enter IFSC code" />
                    {errors.ifsc && <p className="text-red-500 text-xs">{(errors as any).ifsc?.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label>Account Alias</Label>
                    <Input {...register("alias")} className="h-11" placeholder="Enter account alias" />
                    {errors.alias && <p className="text-red-500 text-xs">{(errors as any).alias?.message}</p>}
                  </div>
                </div>
              </section>

              {/* SECURITY */}
              <section className="space-y-6">
                <div className="flex items-center gap-3 pb-4 border-b border-slate-200 dark:border-slate-700">
                  <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-lg"><FileText className="w-5 h-5 text-orange-700 dark:text-orange-300" /></div>
                  <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Security</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label>Password *</Label>
                    <Input {...register("password")} type="password" className="h-11" placeholder="Enter password" />
                    {errors.password && <p className="text-red-500 text-xs">{(errors as any).password?.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label>Confirm Password *</Label>
                    <Input type="password" ref={confirmPasswordRef} className="h-11" placeholder="Confirm password" />
                  </div>
                </div>
              </section>

              {/* ACTIONS */}
              <div className="flex items-center justify-between pt-6 border-t border-slate-200 dark:border-slate-700">
                {prefillLoading ? (
                  <div className="text-sm text-slate-500">Loading candidate…</div>
                ) : (
                  <div />
                )}
                <Button type="submit" className="px-8 py-3 h-12 bg-stone-800 text-white" disabled={loading}>
                  {loading ? (
                    <span className="inline-flex items-center gap-2"><Loader /> Creating…</span>
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

// --- Example usage ---
// 1) Using candidateId (prefill fetched on mount)
// <NewUser candidateId={router.query.id as string} onCreated={(e) => router.push(`/dashboard/employees/${e.employeeId}`)} />
//
// 2) Passing a candidate object directly
// <NewUser candidate={{ _id: "...", name: "Jane", email: "jane@x.com", phone: "+91 99999 99999", country: "India" }} />