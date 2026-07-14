import Candidate from "@/models/candidate";
import { connectDb } from "@/util/db";
import { NextResponse } from "next/server";
import { OFFICE_LOCATIONS } from "@/config/officeLocations";

export async function POST(req: Request) {
  try {
    await connectDb();
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

    const officeLocationRaw =
      typeof data.officeLocation === "string" ? data.officeLocation.trim() : "";
    const officeLocation = (OFFICE_LOCATIONS as readonly string[]).includes(
      officeLocationRaw,
    )
      ? officeLocationRaw
      : null;

    if (!officeLocation) {
      return NextResponse.json(
        { error: "Please select a preferred office location" },
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
      officeLocation,
      position: data.position,
      coverLetter: data.coverLetter,
      linkedin: data.linkedin,
      portfolio: data.portfolio,
      resumeUrl: data.resume, // Bunny file URL
      photoUrl: data.photo,
    });

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
