"use client";
import { useState } from "react";
import type React from "react";

import {
  Briefcase,
  Upload,
  X,
  CheckCircle,
  MapPin,
  Mail,
  Phone,
  User,
  Award,
  FileText,
  Linkedin,
} from "lucide-react";

const positions = ["LeadGen", "Sales", "Developer", "Marketing", "HR"];
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
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    countryCode: "+91",
    phone: "",
    experience: "",
    address: "",
    city: "",
    country: "",
    position: positions[0],
    resume: null as File | null,
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
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 10 * 1024 * 1024) {
        setErrors({ ...errors, resume: "File size must be less than 10MB" });
        return;
      }
      setFormData({ ...formData, resume: file });
      setErrors({ ...errors, resume: "" });
    }
  };

  const removeFile = () => {
    setFormData({ ...formData, resume: null });
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (formData.phone && !/^\d{10}$/.test(formData.phone)) {
      newErrors.phone = "Please enter a valid 10-digit phone number";
    }

    if (formData.linkedin && !formData.linkedin.includes("linkedin.com")) {
      newErrors.linkedin = "Please enter a valid LinkedIn URL";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      console.log(formData);
      setSubmitted(true);
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
          position: positions[0],
          resume: null,
          coverLetter: "",
          linkedin: "",
          portfolio: "",
        });
      }, 4000);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-12 max-w-lg text-center transform animate-pulse">
          <div className="relative inline-block mb-6">
            <div className="absolute inset-0 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full blur-xl opacity-50 animate-pulse"></div>
            <CheckCircle
              className="relative w-24 h-24 text-green-500 mx-auto"
              strokeWidth={2}
            />
          </div>
          <h2 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-4">
            Application Submitted Successfully!
          </h2>
          <p className="text-gray-600 text-lg mb-6">
            Thank you for applying to Zairo International. Our HR team will
            review your application and contact you within 3-5 business days.
          </p>
          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-4 border border-indigo-100">
            <p className="text-sm text-gray-600">
              <strong>Application ID:</strong> ZI-
              {Date.now().toString().slice(-8)}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 py-12 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Enhanced Header */}
        <div className="text-center mb-12 relative">
          <div className="absolute inset-0 flex items-center justify-center opacity-10">
            <div className="w-96 h-96 bg-gradient-to-r from-indigo-400 to-purple-400 rounded-full blur-3xl"></div>
          </div>

          <div className="relative">
            <div className="inline-block mb-6">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-3xl blur-lg opacity-50"></div>
                <div className="relative bg-gradient-to-r from-indigo-600 to-purple-600 p-4 rounded-3xl shadow-xl">
                  <Briefcase className="w-14 h-14 text-white" strokeWidth={2} />
                </div>
              </div>
            </div>

            <h1 className="text-6xl font-black mb-3 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
              Zairo International
            </h1>
            <p className="text-2xl font-semibold text-gray-700 mb-2">
              Build Your Future With Us
            </p>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Join a global team of innovators, thinkers, and leaders shaping
              the future of business
            </p>
          </div>
        </div>

        {/* Form Card with Enhanced Design */}
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-100">
          <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 p-8">
            <h2 className="text-4xl font-bold text-white text-center mb-2">
              Career Application Form
            </h2>
            <p className="text-indigo-100 text-center text-lg">
              Take the first step towards an exciting career
            </p>
          </div>

          <form onSubmit={handleSubmit} className="p-8 md:p-12 space-y-8">
            {/* Personal Information Section */}
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-gradient-to-r from-indigo-500 to-purple-500 p-3 rounded-xl">
                  <User className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-3xl font-bold text-gray-800">
                  Personal Information
                </h3>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="flex flex-col group">
                  <label className="mb-2 font-semibold text-gray-700 flex items-center gap-2">
                    <User className="w-4 h-4 text-indigo-600" />
                    Full Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    placeholder="Enter your full name"
                    className="border-2 border-gray-300 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all bg-white hover:bg-gray-50"
                  />
                </div>

                <div className="flex flex-col group">
                  <label className="mb-2 font-semibold text-gray-700 flex items-center gap-2">
                    <Mail className="w-4 h-4 text-indigo-600" />
                    Email Address *
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    placeholder="your.email@example.com"
                    className="border-2 border-gray-300 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all bg-white hover:bg-gray-50"
                  />
                </div>

                <div className="flex flex-col group md:col-span-2">
                  <label className="mb-2 font-semibold text-gray-700 flex items-center gap-2">
                    <Phone className="w-4 h-4 text-indigo-600" />
                    Phone Number *
                  </label>
                  <div className="flex gap-3">
                    <select
                      name="countryCode"
                      value={formData.countryCode}
                      onChange={handleChange}
                      className="border-2 border-gray-300 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all bg-white hover:bg-gray-50 w-40"
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
                      required
                      placeholder="9876543210"
                      pattern="[0-9]{10}"
                      className="flex-1 border-2 border-gray-300 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all bg-white hover:bg-gray-50"
                    />
                  </div>
                  {errors.phone && (
                    <p className="text-red-500 text-sm mt-1">{errors.phone}</p>
                  )}
                </div>

                <div className="flex flex-col group">
                  <label className="mb-2 font-semibold text-gray-700 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-indigo-600" />
                    City *
                  </label>
                  <input
                    type="text"
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    required
                    placeholder="Your city"
                    className="border-2 border-gray-300 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all bg-white hover:bg-gray-50"
                  />
                </div>

                <div className="flex flex-col group">
                  <label className="mb-2 font-semibold text-gray-700 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-indigo-600" />
                    Country *
                  </label>
                  <input
                    type="text"
                    name="country"
                    value={formData.country}
                    onChange={handleChange}
                    required
                    placeholder="Your country"
                    className="border-2 border-gray-300 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all bg-white hover:bg-gray-50"
                  />
                </div>
              </div>

              <div className="flex flex-col group">
                <label className="mb-2 font-semibold text-gray-700 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-indigo-600" />
                  Complete Address *
                </label>
                <textarea
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  required
                  rows={3}
                  placeholder="Street address, building number, apartment/suite number"
                  className="border-2 border-gray-300 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all resize-none bg-white hover:bg-gray-50"
                />
              </div>
            </div>

            {/* Professional Information Section */}
            <div className="space-y-6 pt-6 border-t-2 border-gray-100">
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-3 rounded-xl">
                  <Award className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-3xl font-bold text-gray-800">
                  Professional Details
                </h3>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="flex flex-col group">
                  <label className="mb-2 font-semibold text-gray-700 flex items-center gap-2">
                    <Award className="w-4 h-4 text-purple-600" />
                    Years of Experience *
                  </label>
                  <input
                    type="number"
                    name="experience"
                    value={formData.experience}
                    onChange={handleChange}
                    required
                    min={0}
                    max={50}
                    placeholder="0"
                    className="border-2 border-gray-300 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-100 transition-all bg-white hover:bg-gray-50"
                  />
                </div>

                <div className="flex flex-col group">
                  <label className="mb-2 font-semibold text-gray-700 flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-purple-600" />
                    Position Applying For *
                  </label>
                  <select
                    name="position"
                    value={formData.position}
                    onChange={handleChange}
                    className="border-2 border-gray-300 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-100 transition-all bg-white hover:bg-gray-50"
                  >
                    {positions.map((pos) => (
                      <option key={pos} value={pos}>
                        {pos}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col group">
                  <label className="mb-2 font-semibold text-gray-700 flex items-center gap-2">
                    <Linkedin className="w-4 h-4 text-purple-600" />
                    LinkedIn Profile
                  </label>
                  <input
                    type="url"
                    name="linkedin"
                    value={formData.linkedin}
                    onChange={handleChange}
                    placeholder="https://linkedin.com/in/yourprofile"
                    className="border-2 border-gray-300 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-100 transition-all bg-white hover:bg-gray-50"
                  />
                  {errors.linkedin && (
                    <p className="text-red-500 text-sm mt-1">
                      {errors.linkedin}
                    </p>
                  )}
                </div>

                <div className="flex flex-col group">
                  <label className="mb-2 font-semibold text-gray-700 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-purple-600" />
                    Portfolio URL
                  </label>
                  <input
                    type="url"
                    name="portfolio"
                    value={formData.portfolio}
                    onChange={handleChange}
                    placeholder="https://yourportfolio.com"
                    className="border-2 border-gray-300 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-100 transition-all bg-white hover:bg-gray-50"
                  />
                </div>
              </div>

              <div className="flex flex-col group">
                <label className="mb-2 font-semibold text-gray-700 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-purple-600" />
                  Cover Letter
                </label>
                <textarea
                  name="coverLetter"
                  value={formData.coverLetter}
                  onChange={handleChange}
                  rows={6}
                  placeholder="Tell us why you're the perfect fit for Zairo International. Share your passion, achievements, and what drives you..."
                  className="border-2 border-gray-300 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-100 transition-all resize-none bg-white hover:bg-gray-50"
                />
                <p className="text-sm text-gray-700 mt-1">
                  {formData.coverLetter.length}/1000 characters
                </p>
              </div>

              <div className="flex flex-col group">
                <label className="mb-2 font-semibold text-gray-700 flex items-center gap-2">
                  <Upload className="w-4 h-4 text-purple-600" />
                  Resume Upload *
                </label>
                {!formData.resume ? (
                  <label className="relative border-2 border-dashed border-gray-300 rounded-xl px-4 py-12 cursor-pointer transition-all hover:border-purple-500 hover:bg-purple-50 bg-white group">
                    <div className="flex flex-col items-center justify-center">
                      <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-4 rounded-2xl mb-4 group-hover:scale-110 transition-transform">
                        <Upload className="w-10 h-10 text-white" />
                      </div>
                      <span className="text-gray-700 font-semibold text-lg mb-1">
                        Click to upload your resume
                      </span>
                      <span className="text-sm text-gray-500">
                        PDF, DOC, DOCX (Max 10MB)
                      </span>
                    </div>
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx"
                      onChange={handleFileChange}
                      className="hidden"
                      required
                    />
                  </label>
                ) : (
                  <div className="border-2 border-green-300 bg-green-50 rounded-xl px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="bg-green-500 p-2 rounded-lg">
                        <FileText className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800 truncate max-w-md">
                          {formData.resume.name}
                        </p>
                        <p className="text-sm text-gray-600">
                          {(formData.resume.size / 1024).toFixed(2)} KB
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={removeFile}
                      className="ml-2 p-2 rounded-full hover:bg-red-100 transition-colors group"
                    >
                      <X className="w-5 h-5 text-red-500 group-hover:text-red-700" />
                    </button>
                  </div>
                )}
                {errors.resume && (
                  <p className="text-red-500 text-sm mt-1">{errors.resume}</p>
                )}
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-6">
              <button
                type="submit"
                className="w-full bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white font-bold py-5 rounded-xl transition-all transform hover:scale-105 hover:shadow-2xl text-xl relative overflow-hidden group"
              >
                <span className="relative z-10">Submit Application</span>
                <div className="absolute inset-0 bg-gradient-to-r from-pink-600 via-purple-600 to-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              </button>

              <p className="text-center text-sm text-gray-500 mt-4">
                * Required fields | By submitting, you agree to our{" "}
                <span className="text-indigo-600 font-semibold cursor-pointer hover:underline">
                  Terms & Conditions
                </span>
              </p>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="text-center mt-12 space-y-3">
          <div className="flex items-center justify-center gap-6 text-sm text-gray-600">
            <a
              href="#"
              className="hover:text-indigo-600 transition-colors font-medium"
            >
              Privacy Policy
            </a>
            <span>•</span>
            <a
              href="#"
              className="hover:text-indigo-600 transition-colors font-medium"
            >
              Contact HR
            </a>
            <span>•</span>
            <a
              href="#"
              className="hover:text-indigo-600 transition-colors font-medium"
            >
              FAQs
            </a>
          </div>
          <p className="text-gray-600 font-medium">
            © 2025 Zairo International. All rights reserved.
          </p>
          <p className="text-sm text-gray-500">
            Empowering careers, transforming lives
          </p>
        </div>
      </div>
    </div>
  );
}
