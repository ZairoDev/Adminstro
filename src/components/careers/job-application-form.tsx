'use client';
import { useState, useEffect, useMemo } from "react";
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
  Globe,
  Camera,
  GraduationCap
} from "lucide-react";
import Image from "next/image";
import {
  GitHubMark,
  InstagramMark,
  LinkedInMark,
  PortfolioMark,
  XMark,
} from "@/components/careers/platform-marks";
import { useBunnyUpload } from "@/hooks/useBunnyUpload";
import { toast } from "@/hooks/use-toast";
import axios from "@/util/axios";
// OFFICE_LOCATIONS replaced by DB-backed /api/office-addresses

type ApplicationDepartment = {
  _id: string;
  name: string;
  positions: { _id: string; name: string }[];
};

const referralSources = [
  "A member of our HR team contacted me",
  "LinkedIn",
  "Instagram",
  "Friend or colleague",
  "College",
  "Job board",
  "Company website",
  "Other",
];

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
  { code: "+91", country: "India" },
  { code: "+1", country: "USA/Canada" },
  { code: "+44", country: "UK" },
  { code: "+61", country: "Australia" },
  { code: "+971", country: "UAE" },
  { code: "+65", country: "Singapore" },
  { code: "+49", country: "Germany" },
  { code: "+33", country: "France" },
  { code: "+81", country: "Japan" },
  { code: "+86", country: "China" },
];

export type LockedJobApplication = {
  id: string;
  title: string;
  departmentId: string;
  jobPositionId: string;
  departmentName: string;
  positionName: string;
};

export default function JobApplicationForm({
  lockedJob,
  embedded = false,
}: {
  lockedJob?: LockedJobApplication;
  embedded?: boolean;
}) {
  const [submitted, setSubmitted] = useState(false);
  const [isFormSubmitted, setIsFormSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [resume, setResume] = useState<File | null>(null);
  const [photo, setPhoto] = useState<File | null>(null);
  const [departments, setDepartments] = useState<ApplicationDepartment[]>([]);
  const [officeOptions, setOfficeOptions] = useState<
    { _id: string; name: string; city: string; formattedAddress: string }[]
  >([]);
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
    officeAddressId: "",
    departmentId: lockedJob?.departmentId || "",
    jobPositionId: lockedJob?.jobPositionId || "",
    resume: "",
    photo: "",
    coverLetter: "",
    linkedin: "",
    github: "",
    portfolio: "",
    instagram: "",
    xProfile: "",
    referralSource: "",
    referralDetail: "",
  });

  useEffect(() => {
    if (lockedJob) {
      setFormData((current) => ({
        ...current,
        departmentId: lockedJob.departmentId,
        jobPositionId: lockedJob.jobPositionId,
      }));
      return;
    }
    const fetchDepartments = async () => {
      try {
        const response = await fetch("/api/departments?active=1");
        const result = await response.json();
        if (result.success && Array.isArray(result.data)) {
          setDepartments(result.data as ApplicationDepartment[]);
        }
      } catch (error) {
        console.error("Error fetching departments:", error);
      }
    };
    fetchDepartments();
  }, [lockedJob]);

  // Fetch active office addresses for preferred office select
  useEffect(() => {
    const fetchOffices = async () => {
      try {
        const res = await fetch("/api/office-addresses?active=1");
        const result = await res.json();
        if (result.success && Array.isArray(result.data)) {
          setOfficeOptions(result.data);
        }
      } catch (error) {
        console.error("Error fetching office addresses:", error);
      }
    };
    fetchOffices();
  }, []);

  const officeCityOptions = useMemo(() => {
    const seen = new Set<string>();
    const unique: typeof officeOptions = [];
    for (const office of officeOptions) {
      const cityLabel = (office.city || office.name).trim();
      const key = cityLabel.toLowerCase();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      unique.push(office);
    }
    return unique.sort((a, b) =>
      (a.city || a.name).localeCompare(b.city || b.name),
    );
  }, [officeOptions]);

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
      officeLocation: "Preferred Office Location",
      officeAddressId: "Preferred Office Location",
      departmentId: "Department",
      jobPositionId: "Job title",
      experience: "Years of Experience",
      resume: "Resume",
      photo: "Personal Photograph",
      linkedin: "LinkedIn Profile",
      github: "GitHub",
      portfolio: "Portfolio URL",
      instagram: "Instagram",
      xProfile: "X",
      referralSource: "Where did you hear about us",
      referralDetail: "Where you heard about us",
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

    if (!formData.officeAddressId.trim()) {
      newErrors.officeAddressId = "Preferred office location is required";
      if (!firstMissingField) firstMissingField = fieldLabels.officeAddressId;
    }

    if (!formData.departmentId) {
      newErrors.departmentId = "Department is required";
      if (!firstMissingField) firstMissingField = fieldLabels.departmentId;
    }

    if (!formData.jobPositionId) {
      newErrors.jobPositionId = "Job title is required";
      if (!firstMissingField) firstMissingField = fieldLabels.jobPositionId;
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

    if (formData.github.trim() && !/github\.com\//i.test(formData.github)) {
      newErrors.github = "Enter a GitHub profile link, such as github.com/yourname";
      if (!firstMissingField) firstMissingField = fieldLabels.github;
    }

    if (formData.portfolio && !/^https?:\/\/.+/.test(formData.portfolio)) {
      newErrors.portfolio = "Please enter a valid URL";
      if (!firstMissingField) firstMissingField = fieldLabels.portfolio;
    }

    if (formData.instagram.trim() && !/instagram\.com\//i.test(formData.instagram)) {
      newErrors.instagram = "Enter an Instagram profile link, such as instagram.com/yourname";
      if (!firstMissingField) firstMissingField = fieldLabels.instagram;
    }

    if (formData.xProfile.trim() && !/(?:x|twitter)\.com\//i.test(formData.xProfile)) {
      newErrors.xProfile = "Enter an X profile link, such as x.com/yourname";
      if (!firstMissingField) firstMissingField = fieldLabels.xProfile;
    }

    if (!formData.referralSource) {
      newErrors.referralSource = "Tell us where you heard about this role";
      if (!firstMissingField) firstMissingField = fieldLabels.referralSource;
    }

    if (formData.referralSource === "Other" && !formData.referralDetail.trim()) {
      newErrors.referralDetail = "Please tell us where you heard about this role";
      if (!firstMissingField) firstMissingField = fieldLabels.referralDetail;
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
    if (Object.keys(newErrors).length > 0) {
      window.setTimeout(() => {
        document
          .getElementById("apply")
          ?.querySelector("p.text-destructive")
          ?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 50);
    }
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
      const resolvedCollege =
        formData.college === "Other"
          ? formData.otherCollege.trim()
          : formData.college;

      const payload = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: `${formData.countryCode}${formData.phone}`,
        experience: formData.experience,
        address: formData.address.trim(),
        city: formData.city.trim(),
        country: formData.country.trim(),
        gender: formData.gender,
        college: resolvedCollege,
        officeAddressId: formData.officeAddressId,
        departmentId: lockedJob?.departmentId || formData.departmentId,
        jobPositionId: lockedJob?.jobPositionId || formData.jobPositionId,
        jobOpeningId: lockedJob?.id,
        coverLetter: formData.coverLetter,
        linkedin: formData.linkedin,
        portfolio: formData.portfolio,
        socials: [
          formData.github.trim() ? `GitHub: ${formData.github.trim()}` : "",
          formData.instagram.trim() ? `Instagram: ${formData.instagram.trim()}` : "",
          formData.xProfile.trim() ? `X: ${formData.xProfile.trim()}` : "",
        ]
          .filter(Boolean)
          .join("\n"),
        referralSource:
          formData.referralSource === "Other"
            ? `Other: ${formData.referralDetail.trim()}`
            : formData.referralSource,
        resume: formData.resume,
        photo: formData.photo,
      };

      await axios.post("/api/job-application/setInterview", payload);

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
          officeAddressId: "",
          departmentId: "",
          jobPositionId: "",
          resume: "",
          photo: "",
          coverLetter: "",
          linkedin: "",
          github: "",
          portfolio: "",
          instagram: "",
          xProfile: "",
          referralSource: "",
          referralDetail: "",
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
      <div className={embedded ? "scroll-mt-6" : "min-h-dvh bg-background flex items-center justify-center p-4 sm:p-6"} id="apply">
        <div className="bg-card rounded-2xl border border-border p-8 sm:p-10 max-w-lg w-full text-center">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <CheckCircle className="h-7 w-7 text-primary" strokeWidth={2} />
          </div>
          <h2 className="text-2xl font-semibold text-foreground">
            Application received
          </h2>
          <p className="mt-3 text-base leading-relaxed text-muted-foreground">
            {lockedJob
              ? `Thanks for applying for ${lockedJob.title}. HR will review it and contact you if there is a next step.`
              : "Thanks for applying to Zairo International. HR will review it and contact you if there is a next step."}
          </p>
          <a
            href="/careers"
            className="mt-6 inline-flex h-12 items-center justify-center rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            Back to open roles
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className={embedded ? "" : "min-h-screen bg-background py-6 sm:py-12 px-4 sm:px-6"}>
      <div className={embedded ? "" : "max-w-4xl mx-auto"}>
        {/* Header */}
        {!embedded && (
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
        )}

        {/* Form Card */}
        <div id="apply" className="scroll-mt-6 rounded-2xl border border-border bg-card overflow-hidden">
          <div className="border-b border-border px-5 py-5 sm:px-8">
            <p className="text-sm font-medium text-muted-foreground">Application</p>
            <h2 className="mt-1 text-2xl font-semibold text-foreground">
              {lockedJob ? lockedJob.title : "Career application"}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {lockedJob
                ? `${lockedJob.positionName}${lockedJob.departmentName ? ` · ${lockedJob.departmentName}` : ""}. Required fields are marked. This usually takes a few minutes.`
                : "Required fields are marked. This usually takes a few minutes."}
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
              <div className="flex items-center gap-2 border-b border-border pb-2">
                <div className="rounded-lg bg-primary/10 p-1.5">
                  <User className="h-4 w-4 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-foreground">1. Personal information</h3>
              </div>
              <div className="space-y-2">
                <label className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                  <Camera className="h-3.5 w-3.5 text-muted-foreground" />
                  Photo <span className="text-destructive">*</span>
                </label>
                <p className="text-sm text-muted-foreground">
                  A clear headshot. JPEG, PNG, or WebP, up to 5MB.
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
                        Upload a photo
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
                      className="ml-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg hover:bg-destructive/10"
                      aria-label="Remove photo"
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
              <div className="grid gap-4 sm:grid-cols-2 sm:gap-5">
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
                        : "border-border"
                    } h-12 rounded-xl px-4 text-base text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-colors`}
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
                        : "border-border"
                    } h-12 rounded-xl px-4 text-base text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-colors`}
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
                      className="h-12 w-40 shrink-0 rounded-xl border border-border bg-input px-3 text-base text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      {countryCodes.map((item) => (
                        <option key={item.code} value={item.code}>
                          {item.country} {item.code}
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
                          : "border-border"
                      } h-12 rounded-xl px-4 text-base text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-colors`}
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
                        : "border-border"
                    } h-12 rounded-xl px-4 text-base text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-colors`}
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
                        : "border-border"
                    } h-12 rounded-xl px-4 text-base text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-colors`}
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
                        : "border-border"
                    } h-12 rounded-xl px-4 text-base text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-colors`}
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
                      : "border-border"
                  } h-12 rounded-xl px-4 text-base text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-colors resize-none`}
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
                <h3 className="text-lg font-semibold text-foreground">
                  2. Education
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
                      : "border-border"
                  } h-12 rounded-xl px-4 text-base text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-colors`}
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
                        : "border-border"
                    } h-12 rounded-xl px-4 text-base text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-colors`}
                  />
                  {errors.otherCollege && (
                    <p className="text-destructive text-xs flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {errors.otherCollege}
                    </p>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <label className="flex items-center gap-1.5 font-medium text-foreground text-sm">
                  <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                  Preferred Office Location <span className="text-destructive">*</span>
                </label>
                <select
                  name="officeAddressId"
                  value={formData.officeAddressId}
                  onChange={handleChange}
                  className={`w-full bg-input border ${
                    errors.officeAddressId
                      ? "border-destructive/50"
                      : "border-border"
                  } h-12 rounded-xl px-4 text-base text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-colors`}
                >
                  <option value="">Select office location</option>
                  {officeCityOptions.map((office) => (
                    <option key={office._id} value={office._id}>
                      {office.city || office.name}
                    </option>
                  ))}
                </select>
                {errors.officeAddressId && (
                  <p className="text-destructive text-xs flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {errors.officeAddressId}
                  </p>
                )}
              </div>
            </div>

            {/* Professional Information Section */}
            <div className="space-y-4 sm:space-y-5">
              <div className="flex items-center gap-2 pb-2 border-b border-border">
                <div className="bg-primary/10 rounded-lg p-1.5">
                  <Award className="w-4 h-4 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-foreground">
                  3. Experience and resume
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
                        : "border-border"
                    } h-12 rounded-xl px-4 text-base text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-colors`}
                  />
                  {errors.experience && (
                    <p className="text-destructive text-xs flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {errors.experience}
                    </p>
                  )}
                </div>

                {lockedJob ? (
                  <div className="sm:col-span-2 rounded-xl border border-border bg-accent px-4 py-3 text-sm text-foreground">
                    You are applying for <span className="font-semibold">{lockedJob.title}</span>
                    {lockedJob.departmentName ? ` in ${lockedJob.departmentName}` : ""}.
                  </div>
                ) : (
                <>
                <div className="space-y-2">
                  <label className="flex items-center gap-1.5 font-medium text-foreground text-sm">
                    Department <span className="text-destructive">*</span>
                  </label>
                  <select
                    name="departmentId"
                    value={formData.departmentId}
                    onChange={(event) => {
                      const departmentId = event.target.value;
                      setFormData((current) => ({
                        ...current,
                        departmentId,
                        jobPositionId: "",
                      }));
                      if (errors.departmentId || errors.jobPositionId) {
                        setErrors((current) => ({
                          ...current,
                          departmentId: "",
                          jobPositionId: "",
                        }));
                      }
                    }}
                    className={`w-full bg-input border ${
                      errors.departmentId ? "border-destructive/50" : "border-border"
                    } h-12 rounded-xl px-4 text-base text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-colors`}
                  >
                    <option value="">Select department</option>
                    {departments.map((department) => (
                      <option key={department._id} value={department._id}>
                        {department.name}
                      </option>
                    ))}
                  </select>
                  {errors.departmentId && (
                    <p className="text-destructive text-xs flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {errors.departmentId}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="flex items-center gap-1.5 font-medium text-foreground text-sm">
                    Job title <span className="text-destructive">*</span>
                  </label>
                  <select
                    name="jobPositionId"
                    value={formData.jobPositionId}
                    onChange={handleChange}
                    disabled={!formData.departmentId}
                    className={`w-full bg-input border ${
                      errors.jobPositionId ? "border-destructive/50" : "border-border"
                    } h-12 rounded-xl px-4 text-base text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-colors disabled:opacity-60`}
                  >
                    <option value="">
                      {formData.departmentId ? "Select job title" : "Select a department first"}
                    </option>
                    {(
                      departments.find((department) => department._id === formData.departmentId)
                        ?.positions ?? []
                    ).map((position) => (
                      <option key={position._id} value={position._id}>
                        {position.name}
                      </option>
                    ))}
                  </select>
                  {errors.jobPositionId && (
                    <p className="text-destructive text-xs flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {errors.jobPositionId}
                    </p>
                  )}
                </div>
                </>
                )}

                <div className="space-y-2">
                  <label className="flex items-center gap-1.5 font-medium text-foreground text-sm">
                    <LinkedInMark />
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
                        : "border-border"
                    } h-12 rounded-xl px-4 text-base text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-colors`}
                  />
                  {errors.linkedin && (
                    <p className="text-destructive text-xs flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {errors.linkedin}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <label htmlFor="github" className="flex items-center gap-1.5 font-medium text-foreground text-sm">
                    <GitHubMark />
                    GitHub
                  </label>
                  <input
                    id="github"
                    type="url"
                    name="github"
                    value={formData.github}
                    onChange={handleChange}
                    inputMode="url"
                    autoComplete="url"
                    placeholder="github.com/yourname"
                    aria-invalid={errors.github ? true : undefined}
                    className={`h-12 w-full rounded-xl border bg-input px-4 text-base text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                      errors.github ? "border-destructive/50" : "border-border"
                    }`}
                  />
                  {errors.github ? (
                    <p className="text-destructive text-xs flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {errors.github}
                    </p>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <label className="flex items-center gap-1.5 font-medium text-foreground text-sm">
                    <PortfolioMark />
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
                        : "border-border"
                    } h-12 rounded-xl px-4 text-base text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-colors`}
                  />
                  {errors.portfolio && (
                    <p className="text-destructive text-xs flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {errors.portfolio}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <label htmlFor="instagram" className="flex items-center gap-1.5 font-medium text-foreground text-sm">
                    <InstagramMark />
                    Instagram
                  </label>
                  <input
                    id="instagram"
                    type="url"
                    name="instagram"
                    value={formData.instagram}
                    onChange={handleChange}
                    inputMode="url"
                    autoComplete="url"
                    placeholder="instagram.com/yourname"
                    aria-invalid={errors.instagram ? true : undefined}
                    className={`h-12 w-full rounded-xl border bg-input px-4 text-base text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                      errors.instagram ? "border-destructive/50" : "border-border"
                    }`}
                  />
                  {errors.instagram ? (
                    <p className="text-destructive text-xs flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {errors.instagram}
                    </p>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <label htmlFor="x-profile" className="flex items-center gap-1.5 font-medium text-foreground text-sm">
                    <XMark />
                    X
                  </label>
                  <input
                    id="x-profile"
                    type="url"
                    name="xProfile"
                    value={formData.xProfile}
                    onChange={handleChange}
                    inputMode="url"
                    autoComplete="url"
                    placeholder="x.com/yourname"
                    aria-invalid={errors.xProfile ? true : undefined}
                    className={`h-12 w-full rounded-xl border bg-input px-4 text-base text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                      errors.xProfile ? "border-destructive/50" : "border-border"
                    }`}
                  />
                  {errors.xProfile ? (
                    <p className="text-destructive text-xs flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {errors.xProfile}
                    </p>
                  ) : null}
                </div>

                <div className="space-y-2 sm:col-span-2">
                  <label htmlFor="referral-source" className="font-medium text-foreground text-sm">
                    Where did you hear about us <span className="text-destructive">*</span>
                  </label>
                  <select
                    id="referral-source"
                    name="referralSource"
                    value={formData.referralSource}
                    onChange={handleChange}
                    aria-invalid={errors.referralSource ? true : undefined}
                    className={`h-12 w-full rounded-xl border bg-input px-4 text-base text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                      errors.referralSource ? "border-destructive/50" : "border-border"
                    }`}
                  >
                    <option value="">Select one</option>
                    {referralSources.map((source) => (
                      <option key={source} value={source}>
                        {source}
                      </option>
                    ))}
                  </select>
                  {errors.referralSource ? (
                    <p className="text-destructive text-xs flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {errors.referralSource}
                    </p>
                  ) : null}
                </div>

                {formData.referralSource === "Other" ? (
                  <div className="space-y-2 sm:col-span-2">
                    <label htmlFor="referral-detail" className="font-medium text-foreground text-sm">
                      Tell us where <span className="text-destructive">*</span>
                    </label>
                    <input
                      id="referral-detail"
                      type="text"
                      name="referralDetail"
                      value={formData.referralDetail}
                      onChange={handleChange}
                      aria-invalid={errors.referralDetail ? true : undefined}
                      placeholder="Campus drive, a WhatsApp group, a poster"
                      className={`h-12 w-full rounded-xl border bg-input px-4 text-base text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                        errors.referralDetail ? "border-destructive/50" : "border-border"
                      }`}
                    />
                    {errors.referralDetail ? (
                      <p className="text-destructive text-xs flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {errors.referralDetail}
                      </p>
                    ) : null}
                  </div>
                ) : null}
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
                  placeholder="A short note about your experience is enough."
                  className="min-h-32 w-full resize-y rounded-xl border border-border bg-input px-4 py-3 text-base text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
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
                        Upload a resume
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
                      className="ml-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg hover:bg-destructive/10"
                      aria-label="Remove resume"
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
                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-base font-semibold text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
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

        {!embedded && (
        <div className="text-center mt-8 space-y-3 px-4">
          <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-muted-foreground">
          <a href="/privacy-policy" className="hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            Privacy policy
          </a>
          </div>
          <p className="text-xs text-muted-foreground">
            © 2025 Zairo International. All rights reserved.
          </p>
        </div>
        )}
      </div>
    </div>
  );
}
