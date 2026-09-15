import Candidate from "@/models/candidate";
import { connectDb } from "@/util/db";
import { NextResponse } from "next/server";
import mongoose from "mongoose";
import OfficeAddress from "@/models/officeAddress";
import { seedDefaultOffices } from "@/lib/officeAddress/seedDefaultOffices";
import { sendJobApplicationReceivedEmails } from "@/lib/email";

export async function POST(req: Request) {
  try {
    await connectDb();
    await seedDefaultOffices();
    const data = await req.json();

    // Persist the real college name when applicant selects "Other"
    const collegeRaw = typeof data.college === "string" ? data.college.trim() : "";
    const otherCollege =
      typeof data.otherCollege === "string" ? data.otherCollege.trim() : "";
    const college =
      collegeRaw === "Other" && otherCollege
        ? otherCollege
        : collegeRaw || otherCollege;

    if (!college || college === "Select College" || college === "Other") {
      return NextResponse.json(
        { error: "Please provide a valid college/university name" },
        { status: 400 },
      );
    }

    const officeAddressIdRaw =
      typeof data.officeAddressId === "string"
        ? data.officeAddressId.trim()
        : "";

    if (!officeAddressIdRaw || !mongoose.Types.ObjectId.isValid(officeAddressIdRaw)) {
      return NextResponse.json(
        { error: "Please select a preferred office address" },
        { status: 400 },
      );
    }

    const officeDoc = await OfficeAddress.findOne({
      _id: officeAddressIdRaw,
      isActive: true,
    }).select("_id city");

    if (!officeDoc) {
      return NextResponse.json(
        { error: "Selected office address is invalid or inactive" },
        { status: 400 },
      );
    }

    const phone =
      typeof data.phone === "string" && data.phone.trim()
        ? data.phone.trim()
        : [data.countryCode, data.phone].filter(Boolean).join("");

    const newApplication = await Candidate.create({
      name: data.name,
      email: data.email,
      phone,
      experience: data.experience,
      address: data.address,
      city: data.city,
      country: data.country,
      gender: data.gender || null,
      college,
      officeAddressId: officeDoc._id,
      officeLocation: officeDoc.city,

      position: data.position,
      coverLetter: data.coverLetter,
      linkedin: data.linkedin,
      portfolio: data.portfolio,
      resumeUrl: data.resume, // Bunny file URL
      photoUrl: data.photo,
    });

    const applicantEmail =
      typeof data.email === "string" ? data.email.trim() : "";
    if (applicantEmail) {
      const baseUrl = (
        process.env.NEXT_PUBLIC_BASE_URL ||
        process.env.NEXTAUTH_URL ||
        ""
      ).replace(/\/$/, "");
      try {
        await sendJobApplicationReceivedEmails({
          applicantName: String(data.name || "").trim(),
          applicantEmail,
          phone,
          position: String(data.position || "").trim(),
          officeCity: officeDoc.city,
          city: String(data.city || "").trim(),
          country: String(data.country || "").trim(),
          college,
          experience: String(data.experience || "").trim(),
          linkedin:
            typeof data.linkedin === "string" ? data.linkedin.trim() : "",
          applicationId: String(newApplication._id),
          reviewUrl: baseUrl
            ? `${baseUrl}/dashboard/people/${String(newApplication._id)}`
            : undefined,
        });
      } catch (emailError) {
        console.error(
          "Job application saved but notification emails failed:",
          emailError,
        );
      }
    }

    return NextResponse.json({
      success: true,
      applicationId: newApplication._id,
    });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      { error: "Failed to save job application" },
      { status: 500 }
    );
  }
}
