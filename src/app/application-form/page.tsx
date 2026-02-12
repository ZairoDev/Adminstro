'use client';
import { useState } from "react";
import type React from "react";
import {
  Briefcase,
  Upload,
  X,
  CheckCircle,
  User,
  Award,
  FileText,
  Loader2,
  AlertCircle,
  Mail,
  Phone,
  MapPin,
  Linkedin,
  Globe,
  Camera,
  GraduationCap
} from "lucide-react";
import Image from "next/image";
import { useBunnyUpload } from "@/hooks/useBunnyUpload";
import { toast } from "@/hooks/use-toast";
import axios from "axios";

const positions = ["LeadGen", "Sales", "Developer", "Marketing", "HR"];
const colleges = [
  "Select College",
  "Indian Institute of Technology Kanpur (IIT Kanpur)",
  "Harcourt Butler Technical University (HBTU)",
  "Chhatrapati Shahu Ji Maharaj University (CSJMU / Kanpur University)",
  "Rama University",
  "Pranveer Singh Institute of Technology (PSIT)",
  "Maharana Pratap Group Of Institutions",
  "Axis Colleges",
  "Allenhouse Institute of Technology",
  "Naraina Group of Institutions",
  "Krishna Institute of Technology",
  "Vision Group of Institutions",
  "Kanpur Institute of Technology (KIT)",
  "Banshi College of Engineering",
  "Dr. Gaur Hari Singhania Institute of Management and Research",
  "Dr Virendra Swarup Institute of Computer Studies (VSICS)",
  "DAV College",
  "Christ Church College",
  "Dayanand Anglo Vedic College",
  "BNSD Degree College",
  "PPN Degree College",
  "DG College",
  "Brahmanand College",
  "Jagran College of Arts Science and Commerce",
  "DAMS Kanpur",
  "Other"
];
const countryCodes = [
  { code: "+91", country: "India", flag: "🇮🇳" },
  { code: "+1", country: "USA/Canada", flag: "🇺🇸" },
  { code: "+44", country: "UK", flag: "🇬🇧" },
  { code: "+61", country: "Australia", flag: "🇦🇺" },
  { code: "+971", country: "UAE", flag: "🇦🇪" },
  { code: "+65", country: "Singapore", flag: "🇸🇬" },
  { code: "+49", country: "Germany", flag: "🇩🇪" },
  { code: "+33", country: "France", flag: "🇫🇷" },
  { code: "+81", country: "Japan", flag: "🇯🇵" },
  { code: "+86", country: "China", flag: "🇨🇳" },
];

export default function JobApplicationForm() {
  const [submitted, setSubmitted] = useState(false);
  const [isFormSubmitted, setIsFormSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [resume, setResume] = useState<File | null>(null);
  const [photo, setPhoto] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    countryCode: "+91",
    phone: "",
    experience: "",
    address: "",
    city: "",
    country: "",
    gender: "",
    college: colleges[0],
    otherCollege: "",
    position: positions[0],
    resume: "",
    photo: "",
    coverLetter: "",
    linkedin: "",
    portfolio: "",
  });

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    if (errors[name]) {
      setErrors({ ...errors, [name]: "" });
    }
    setSubmitError("");
  };


  const { uploadFiles } = useBunnyUpload();


  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) {
      console.log("No file selected");
      return;
    }

    const file = files[0];

    // Validate image type
    if (!file.type.startsWith("image/")) {
      setErrors({ ...errors, photo: "Please upload an image file" });
      return;
    }

    // Validate image types (jpeg, png, webp)
    if (
      !(
        file.type === "image/jpeg" ||
        file.type === "image/jpg" ||
        file.type === "image/png" ||
        file.type === "image/webp"
      )
    ) {
      setErrors({
        ...errors,
        photo: "Please upload a JPEG, PNG, or WebP image",
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrors({
        ...errors,
        photo: "File size must be less than 5MB",
      });
      return;
    }

    e.target.value = ""; // reset input

    try {
      setLoading(true);
      console.log("Uploading photo to Bunny...");

      const { imageUrls, error } = await uploadFiles([file], "Photos");

      if (error || !imageUrls?.length) {
        console.error("Upload failed:", error);
        toast({
          title: "Upload failed",
          description: error || "No URL returned from Bunny.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Success — store Bunny URL in form data
      const photoUrl = imageUrls[0] || "";
      console.log("Photo uploaded successfully:", photoUrl);

      setFormData({ ...formData, photo: photoUrl }); // store URL instead of file
      setPhoto(file);
      setErrors({ ...errors, photo: "" });

      toast({
        title: "Photo uploaded successfully",
        description: "Your photo has been uploaded.",
      });
    } catch (err) {
      console.error("Photo upload error:", err);
      toast({
        title: "Upload failed",
        description: "An unexpected error occurred while uploading.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const removePhoto = () => {
    setFormData({ ...formData, photo: "" });
    setPhoto(null);
  };


  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) {
      console.log("No file selected");
      return;
    }

    const file = files[0];

    if (file.size > 10 * 1024 * 1024) {
      setErrors({ ...errors, resume: "File size must be less than 10MB" });
      return;
    }

    e.target.value = ""; // reset input

    try {
      setLoading(true);
      console.log("Uploading resume to Bunny...");

      const { imageUrls, error } = await uploadFiles([file], "Resumes");

      if (error || !imageUrls?.length) {
        console.error("Upload failed:", error);
        toast({
          title: "Upload failed",
          description: error || "No URL returned from Bunny.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Success — store Bunny URL in form data
      const resumeUrl = imageUrls[0] || "";
      console.log("Resume uploaded successfully:", resumeUrl);

      setFormData({ ...formData, resume: resumeUrl }); // store URL instead of file
      setErrors({ ...errors, resume: "" });

      toast({
        title: "Resume uploaded successfully",
        description: "Your resume has been uploaded to Bunny.",
      });
    } catch (err) {
      console.error("Resume upload error:", err);
      toast({
        title: "Upload failed",
        description: "An unexpected error occurred while uploading.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const removeFile = () => {
    setFormData({ ...formData, resume: "" });
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    const fieldLabels: Record<string, string> = {
      name: "Full Name",
      email: "Email Address",
      phone: "Phone Number",
      city: "City",
      country: "Country",
      gender: "Gender",
      address: "Complete Address",
      college: "College/University",
      otherCollege: "College Name",
      experience: "Years of Experience",
      resume: "Resume",
      photo: "Personal Photograph",
      linkedin: "LinkedIn Profile",
      portfolio: "Portfolio URL",
    };

    let firstMissingField: string | null = null;

    if (!formData.name.trim()) {
      newErrors.name = "Name is required";
      if (!firstMissingField) firstMissingField = fieldLabels.name;
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
      if (!firstMissingField) firstMissingField = fieldLabels.email;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
      if (!firstMissingField) firstMissingField = fieldLabels.email;
    }

    if (!formData.phone.trim()) {
      newErrors.phone = "Phone number is required";
      if (!firstMissingField) firstMissingField = fieldLabels.phone;
    } else if (!/^\d{10}$/.test(formData.phone)) {
      newErrors.phone = "Please enter a valid 10-digit phone number";
      if (!firstMissingField) firstMissingField = fieldLabels.phone;
    }

    if (!formData.city.trim()) {
      newErrors.city = "City is required";
      if (!firstMissingField) firstMissingField = fieldLabels.city;
    }

    if (!formData.country.trim()) {
      newErrors.country = "Country is required";
      if (!firstMissingField) firstMissingField = fieldLabels.country;
    }

    if (!formData.gender) {
      newErrors.gender = "Gender is required";
      if (!firstMissingField) firstMissingField = fieldLabels.gender;
    }

    if (!formData.address.trim()) {
      newErrors.address = "Address is required";
      if (!firstMissingField) firstMissingField = fieldLabels.address;
    }

    if (!formData.college || formData.college === "Select College") {
      newErrors.college = "College is required";
      if (!firstMissingField) firstMissingField = fieldLabels.college;
    }

    if (formData.college === "Other" && !formData.otherCollege.trim()) {
      newErrors.otherCollege = "Please specify your college";
      if (!firstMissingField) firstMissingField = fieldLabels.otherCollege;
    }

    if (!formData.experience) {
      newErrors.experience = "Experience is required";
      if (!firstMissingField) firstMissingField = fieldLabels.experience;
    }

    if (!formData.resume) {
      newErrors.resume = "Resume is required";
      if (!firstMissingField) firstMissingField = fieldLabels.resume;
    }

    if (!formData.photo) {
      newErrors.photo = "Photo is required";
      if (!firstMissingField) firstMissingField = fieldLabels.photo;
    }

    if (formData.linkedin && !formData.linkedin.includes("linkedin.com")) {
      newErrors.linkedin = "Please enter a valid LinkedIn URL";
      if (!firstMissingField) firstMissingField = fieldLabels.linkedin;
    }

    if (formData.portfolio && !/^https?:\/\/.+/.test(formData.portfolio)) {
      newErrors.portfolio = "Please enter a valid URL";
      if (!firstMissingField) firstMissingField = fieldLabels.portfolio;
    }

    // Show toast for the first missing field
    if (firstMissingField) {
      const errorCount = Object.keys(newErrors).length;
      if (errorCount === 1) {
        toast({
          title: "Validation Error",
          description: `Please fill in the ${firstMissingField} field.`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Validation Error",
          description: `Please fill in all required fields. Missing: ${firstMissingField} and ${errorCount - 1} more field${errorCount - 1 > 1 ? 's' : ''}.`,
          variant: "destructive",
        });
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError("");

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const submitData = new FormData();
      submitData.append("name", formData.name);
      submitData.append("email", formData.email);
      submitData.append("phone", `${formData.countryCode}${formData.phone}`);
      submitData.append("experience", formData.experience);
      submitData.append("address", formData.address);
      submitData.append("city", formData.city);
      submitData.append("country", formData.country);
      submitData.append("gender", formData.gender);
      submitData.append("college", formData.college === "Other" ? formData.otherCollege : formData.college);
      submitData.append("position", formData.position);
      submitData.append("coverLetter", formData.coverLetter);
      submitData.append("linkedin", formData.linkedin);
      submitData.append("portfolio", formData.portfolio);
      if (formData.resume) {
        submitData.append("resume", formData.resume);
      }

      if (formData.photo) {
        submitData.append("photo", formData.photo);
      }

      // const response = await fetch("/api/job-application/setInterview", {
      //   method: "POST",
      //   body: submitData,
      // });

      const response  = await axios.post("/api/job-application/setInterview", formData);

      // const result = await response.json();

      // if (!response.ok) {
      //   throw new Error(result.error || "Failed to submit application");
      // }

      setSubmitted(true);
      setIsFormSubmitted(true);
      setTimeout(() => {
        setSubmitted(false);
        setFormData({
          name: "",
          email: "",
          countryCode: "+91",
          phone: "",
          experience: "",
          address: "",
          city: "",
          country: "",
          gender: "",
          college: colleges[0],
          otherCollege: "",
          position: positions[0],
          resume: "",
          photo: "",
          coverLetter: "",
          linkedin: "",
          portfolio: "",
        });
        setResume(null);
        setPhoto(null);
      }, 5000);
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : "Failed to submit application"
      );
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4 sm:p-6">
        <div className="bg-card rounded-3xl shadow-[var(--shadow-large)] p-8 sm:p-12 max-w-lg w-full text-center animate-in fade-in duration-500">
          <div className="relative inline-flex mb-6">
            <div className="absolute inset-0 bg-primary/20 rounded-full blur-2xl"></div>
            <div className="relative bg-primary/10 rounded-full p-4">
              <CheckCircle className="w-16 h-16 text-primary" strokeWidth={2} />
            </div>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-3">
            Application Submitted!
          </h2>
          <p className="text-muted-foreground text-sm sm:text-base mb-6 leading-relaxed">
            Thank you for applying to Zairo International. Our HR team will
            review your application and contact you within 3-5 business days.
          </p>
          <div className="bg-accent rounded-2xl p-4 border border-border">
            <p className="text-sm text-foreground">
              <span className="font-semibold">Application ID:</span> ZI-
              {Date.now().toString().slice(-8)}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-6 sm:py-12 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10 sm:mb-14 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="flex items-center justify-center  w-[260px] h-[140px] mx-auto rounded-lg overflow-hidden shadow-[var(--shadow-medium)]">
            <Image
              src="/zairo1.png"
              alt="Zairo Logo"
              width={200}
              height={100}
              className="object-contain"
              priority
            />
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-1">
            Zairo International Pvt. Ltd.
          </h1>

          <p className="text-lg sm:text-xl font-medium mb-2 text-red-700">
            Build Your Future With Us
          </p>

          <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto px-4">
            Join a global team of innovators shaping the future of business.
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-card rounded-2xl sm:rounded-3xl shadow-[var(--shadow-large)] overflow-hidden border border-border animate-in fade-in slide-in-from-bottom-8 duration-700">
          <div className="bg-foreground p-5 sm:p-6">
            <h2 className="text-xl sm:text-2xl font-bold text-primary-foreground text-center">
              Career Application
            </h2>
            <p className="text-primary-foreground/90 text-center text-xs sm:text-sm mt-1">
              Take the first step towards an exciting career
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="p-5 sm:p-8 space-y-6 sm:space-y-8"
          >
            {submitError && (
              <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-4 flex items-start gap-3 animate-in fade-in duration-300">
                <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-destructive text-sm">
                    Submission Error
                  </h4>
                  <p className="text-destructive/90 text-sm mt-1">
                    {submitError}
                  </p>
                </div>
              </div>
            )}

            {/* Personal Information Section */}
            <div className="space-y-4 sm:space-y-5">
            <div className="space-y-2">
                <label className="flex items-center gap-1.5 font-medium text-foreground text-sm">
                  <Camera className="w-3.5 h-3.5 text-muted-foreground" />
                  Personal Photograph <span className="text-destructive">*</span>
                </label>
                <p className="text-xs text-muted-foreground mb-2">
                Please upload a clear, professional headshot with your face clearly visible.
                </p>
                {!formData.photo ? (
                  <label
                    className={`relative border-2 ${
                      errors.photo
                        ? "border-destructive/30 bg-destructive/5"
                        : "border-dashed border-border"
                    } rounded-xl px-4 py-8 sm:py-10 cursor-pointer transition-all hover:border-primary/50 hover:bg-accent bg-input block`}
                  >
                    <div className="flex flex-col items-center justify-center">
                      <div className="bg-primary/10 rounded-xl p-3 mb-3">
                        <Camera className="w-6 h-6 text-primary" />
                      </div>
                      <span className="text-foreground font-medium text-sm mb-1">
                        Click to upload your photograph
                      </span>
                      <span className="text-xs text-muted-foreground">
                        JPEG, PNG, WebP (Max 5MB)
                      </span>
                    </div>
                    <input
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/webp"
                      onChange={handlePhotoChange}
                      className="hidden"
                    />
                  </label>
                ) : (
                  <div className="border border-primary/30 bg-primary/5 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="bg-primary/10 rounded-lg p-2 flex-shrink-0">
                        <Camera className="w-5 h-5 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-foreground text-sm truncate">
                          {photo?.name || "Photo uploaded"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {photo?.size
                            ? (photo.size / 1024).toFixed(1)
                            : "N/A"}{" "}
                          KB
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={removePhoto}
                      className="ml-2 p-2 rounded-lg hover:bg-destructive/10 transition-colors flex-shrink-0"
                    >
                      <X className="w-4 h-4 text-destructive" />
                    </button>
                  </div>
                )}
                {errors.photo && (
                  <p className="text-destructive text-xs flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {errors.photo}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 pb-2 border-b border-border">
                <div className="bg-primary/10 rounded-lg p-1.5">
                  <User className="w-4 h-4 text-primary" />
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-foreground">
                  Personal Information
                </h3>
              </div>

              <div className="grid sm:grid-cols-2 gap-4 sm:gap-5">
                <div className="space-y-2">
                  <label className="flex items-center gap-1.5 font-medium text-foreground text-sm">
                    <User className="w-3.5 h-3.5 text-muted-foreground" />
                    Full Name <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="John Doe"
                    className={`w-full bg-input border ${
                      errors.name
                        ? "border-destructive/50"
                        : "border-transparent"
                    } rounded-xl px-4 py-3 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent transition-all`}
                  />
                  {errors.name && (
                    <p className="text-destructive text-xs flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {errors.name}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="flex items-center gap-1.5 font-medium text-foreground text-sm">
                    <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                    Email Address <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="john.doe@example.com"
                    className={`w-full bg-input border ${
                      errors.email
                        ? "border-destructive/50"
                        : "border-transparent"
                    } rounded-xl px-4 py-3 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent transition-all`}
                  />
                  {errors.email && (
                    <p className="text-destructive text-xs flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {errors.email}
                    </p>
                  )}
                </div>

                <div className="space-y-2 sm:col-span-2">
                  <label className="flex items-center gap-1.5 font-medium text-foreground text-sm">
                    <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                    Phone Number <span className="text-destructive">*</span>
                  </label>
                  <div className="flex gap-2">
                    <select
                      name="countryCode"
                      value={formData.countryCode}
                      onChange={handleChange}
                      className="bg-input border border-transparent rounded-xl px-3 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all w-28 sm:w-32 text-sm"
                    >
                      {countryCodes.map((item) => (
                        <option key={item.code} value={item.code}>
                          {item.flag} {item.code}
                        </option>
                      ))}
                    </select>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="9876543210"
                      className={`flex-1 bg-input border ${
                        errors.phone
                          ? "border-destructive/50"
                          : "border-transparent"
                      } rounded-xl px-4 py-3 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent transition-all`}
                    />
                  </div>
                  {errors.phone && (
                    <p className="text-destructive text-xs flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {errors.phone}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="flex items-center gap-1.5 font-medium text-foreground text-sm">
                    <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                    City <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="text"
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    placeholder="New York"
                    className={`w-full bg-input border ${
                      errors.city
                        ? "border-destructive/50"
                        : "border-transparent"
                    } rounded-xl px-4 py-3 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent transition-all`}
                  />
                  {errors.city && (
                    <p className="text-destructive text-xs flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {errors.city}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="flex items-center gap-1.5 font-medium text-foreground text-sm">
                    <Globe className="w-3.5 h-3.5 text-muted-foreground" />
                    Country <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="text"
                    name="country"
                    value={formData.country}
                    onChange={handleChange}
                    placeholder="United States"
                    className={`w-full bg-input border ${
                      errors.country
                        ? "border-destructive/50"
                        : "border-transparent"
                    } rounded-xl px-4 py-3 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent transition-all`}
                  />
                  {errors.country && (
                    <p className="text-destructive text-xs flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {errors.country}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="flex items-center gap-1.5 font-medium text-foreground text-sm">
                    <User className="w-3.5 h-3.5 text-muted-foreground" />
                    Gender <span className="text-destructive">*</span>
                  </label>
                  <select
                    name="gender"
                    value={formData.gender}
                    onChange={handleChange}
                    className={`w-full bg-input border ${
                      errors.gender
                        ? "border-destructive/50"
                        : "border-transparent"
                    } rounded-xl px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all`}
                  >
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                    <option value="Prefer not to say">Prefer not to say</option>
                  </select>
                  {errors.gender && (
                    <p className="text-destructive text-xs flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {errors.gender}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-1.5 font-medium text-foreground text-sm">
                  <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                  Complete Address <span className="text-destructive">*</span>
                </label>
                <textarea
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  rows={3}
                  placeholder="Street address, building number, apartment/suite"
                  className={`w-full bg-input border ${
                    errors.address
                      ? "border-destructive/50"
                      : "border-transparent"
                  } rounded-xl px-4 py-3 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent transition-all resize-none`}
                />
                {errors.address && (
                  <p className="text-destructive text-xs flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {errors.address}
                  </p>
                )}
              </div>
            </div>

            {/* Educational Information Section */}
            <div className="space-y-4 sm:space-y-5">
              <div className="flex items-center gap-2 pb-2 border-b border-border">
                <div className="bg-primary/10 rounded-lg p-1.5">
                  <GraduationCap className="w-4 h-4 text-primary" />
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-foreground">
                  Educational Information
                </h3>
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-1.5 font-medium text-foreground text-sm">
                  <GraduationCap className="w-3.5 h-3.5 text-muted-foreground" />
                  College/University <span className="text-destructive">*</span>
                </label>
                <select
                  name="college"
                  value={formData.college}
                  onChange={handleChange}
                  className={`w-full bg-input border ${
                    errors.college
                      ? "border-destructive/50"
                      : "border-transparent"
                  } rounded-xl px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all`}
                >
                  {colleges.map((college) => (
                    <option key={college} value={college}>
                      {college}
                    </option>
                  ))}
                </select>
                {errors.college && (
                  <p className="text-destructive text-xs flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {errors.college}
                  </p>
                )}
              </div>

              {formData.college === "Other" && (
                <div className="space-y-2">
                  <label className="flex items-center gap-1.5 font-medium text-foreground text-sm">
                    <GraduationCap className="w-3.5 h-3.5 text-muted-foreground" />
                    Specify Your College <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="text"
                    name="otherCollege"
                    value={formData.otherCollege}
                    onChange={handleChange}
                    placeholder="Enter your college/university name"
                    className={`w-full bg-input border ${
                      errors.otherCollege
                        ? "border-destructive/50"
                        : "border-transparent"
                    } rounded-xl px-4 py-3 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent transition-all`}
                  />
                  {errors.otherCollege && (
                    <p className="text-destructive text-xs flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {errors.otherCollege}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Professional Information Section */}
            <div className="space-y-4 sm:space-y-5">
              <div className="flex items-center gap-2 pb-2 border-b border-border">
                <div className="bg-primary/10 rounded-lg p-1.5">
                  <Award className="w-4 h-4 text-primary" />
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-foreground">
                  Professional Details
                </h3>
              </div>

              <div className="grid sm:grid-cols-2 gap-4 sm:gap-5">
                <div className="space-y-2">
                  <label className="flex items-center gap-1.5 font-medium text-foreground text-sm">
                    Years of Experience{" "}
                    <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="number"
                    name="experience"
                    value={formData.experience}
                    onChange={handleChange}
                    min={0}
                    max={50}
                    placeholder="5"
                    className={`w-full bg-input border ${
                      errors.experience
                        ? "border-destructive/50"
                        : "border-transparent"
                    } rounded-xl px-4 py-3 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent transition-all`}
                  />
                  {errors.experience && (
                    <p className="text-destructive text-xs flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {errors.experience}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="flex items-center gap-1.5 font-medium text-foreground text-sm">
                    Position Applying For{" "}
                    <span className="text-destructive">*</span>
                  </label>
                  <select
                    name="position"
                    value={formData.position}
                    onChange={handleChange}
                    className="w-full bg-input border border-transparent rounded-xl px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                  >
                    {positions.map((pos) => (
                      <option key={pos} value={pos}>
                        {pos}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="flex items-center gap-1.5 font-medium text-foreground text-sm">
                    <Linkedin className="w-3.5 h-3.5 text-muted-foreground" />
                    LinkedIn Profile
                  </label>
                  <input
                    type="url"
                    name="linkedin"
                    value={formData.linkedin}
                    onChange={handleChange}
                    placeholder="linkedin.com/in/yourprofile"
                    className={`w-full bg-input border ${
                      errors.linkedin
                        ? "border-destructive/50"
                        : "border-transparent"
                    } rounded-xl px-4 py-3 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent transition-all`}
                  />
                  {errors.linkedin && (
                    <p className="text-destructive text-xs flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {errors.linkedin}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="flex items-center gap-1.5 font-medium text-foreground text-sm">
                    <Globe className="w-3.5 h-3.5 text-muted-foreground" />
                    Portfolio URL
                  </label>
                  <input
                    type="url"
                    name="portfolio"
                    value={formData.portfolio}
                    onChange={handleChange}
                    placeholder="yourportfolio.com"
                    className={`w-full bg-input border ${
                      errors.portfolio
                        ? "border-destructive/50"
                        : "border-transparent"
                    } rounded-xl px-4 py-3 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent transition-all`}
                  />
                  {errors.portfolio && (
                    <p className="text-destructive text-xs flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {errors.portfolio}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-1.5 font-medium text-foreground text-sm">
                  <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                  Cover Letter
                </label>
                <textarea
                  name="coverLetter"
                  value={formData.coverLetter}
                  onChange={handleChange}
                  rows={4}
                  maxLength={1000}
                  placeholder="Tell us why you're the perfect fit for this role..."
                  className="w-full bg-input border border-transparent rounded-xl px-4 py-3 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all resize-none"
                />
                <p className="text-xs text-muted-foreground">
                  {formData.coverLetter.length}/1000 characters
                </p>
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-1.5 font-medium text-foreground text-sm">
                  <Upload className="w-3.5 h-3.5 text-muted-foreground" />
                  Resume Upload <span className="text-destructive">*</span>
                </label>
                {!formData.resume ? (
                  <label
                    className={`relative border-2 ${
                      errors.resume
                        ? "border-destructive/30 bg-destructive/5"
                        : "border-dashed border-border"
                    } rounded-xl px-4 py-8 sm:py-10 cursor-pointer transition-all hover:border-primary/50 hover:bg-accent bg-input block`}
                  >
                    <div className="flex flex-col items-center justify-center">
                      <div className="bg-primary/10 rounded-xl p-3 mb-3">
                        <Upload className="w-6 h-6 text-primary" />
                      </div>
                      <span className="text-foreground font-medium text-sm mb-1">
                        Click to upload your resume
                      </span>
                      <span className="text-xs text-muted-foreground">
                        PDF, DOC, DOCX (Max 10MB)
                      </span>
                    </div>
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                ) : (
                  <div className="border border-primary/30 bg-primary/5 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="bg-primary/10 rounded-lg p-2 flex-shrink-0">
                        <FileText className="w-5 h-5 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-foreground text-sm truncate">
                          {resume?.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {resume?.size
                            ? (resume.size / 1024).toFixed(1)
                            : "N/A"}{" "}
                          KB
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={removeFile}
                      className="ml-2 p-2 rounded-lg hover:bg-destructive/10 transition-colors flex-shrink-0"
                    >
                      <X className="w-4 h-4 text-destructive" />
                    </button>
                  </div>
                )}
                {errors.resume && (
                  <p className="text-destructive text-xs flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {errors.resume}
                  </p>
                )}
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2 space-y-4">
              <button
                type="submit"
                disabled={loading || isFormSubmitted}
                className="w-full bg-gradient-to-r from-primary to-primary/90 text-primary-foreground font-semibold py-3.5 rounded-xl transition-all transform hover:scale-[1.02] hover:shadow-[var(--shadow-medium)] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Submitting...
                  </>
                ) : isFormSubmitted ? (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    Application Submitted
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    Submit Application
                  </>
                )}
              </button>

              <p className="text-center text-xs text-muted-foreground">
                <span className="text-destructive">*</span> Required fields
              </p>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 space-y-3 px-4">
          <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-muted-foreground">
            <a href="#" className="hover:text-primary transition-colors">
              Privacy Policy
            </a>
            <span className="hidden sm:inline">•</span>
            <a href="#" className="hover:text-primary transition-colors">
              Contact HR
            </a>
            <span className="hidden sm:inline">•</span>
            <a href="#" className="hover:text-primary transition-colors">
              FAQs
            </a>
          </div>
          <p className="text-xs text-muted-foreground">
            © 2025 Zairo International. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
