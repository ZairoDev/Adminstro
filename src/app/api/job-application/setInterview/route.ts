import Candidate from "@/models/candidate";
import { connectDb } from "@/util/db";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    await connectDb();
    const data = await req.json();
    console.log("data",data)
    const newApplication = await Candidate.create({
      name: data.name,
      email: data.email,
      phone: data.phone,
      experience: data.experience,
      address: data.address,
      city: data.city,
      country: data.country,
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
