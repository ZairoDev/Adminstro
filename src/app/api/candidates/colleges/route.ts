import Candidate from "@/models/candidate";
import { connectDb } from "@/util/db";
import { NextRequest, NextResponse } from "next/server";
import { COLLEGES_LIST } from "@/config/colleges";

export async function GET(request: NextRequest) {
  await connectDb();

  try {
    // Get all unique colleges from candidates in database
    const dbColleges = await Candidate.distinct("college");
    
    // Normalize college names (trim and filter empty)
    const normalizedDbColleges = dbColleges
      .filter((college) => college && college.trim() !== "")
      .map((college) => college.trim());
    
    // Merge predefined list with database colleges, prioritizing predefined list order
    // This ensures consistency and includes any "Other" entries from database
    const allColleges = new Set<string>();
    
    // Add predefined colleges first (maintains order)
    COLLEGES_LIST.forEach(college => allColleges.add(college));
    
    // Add any additional colleges from database that aren't in predefined list
    normalizedDbColleges.forEach(college => {
      // Check if college matches any predefined college (case-insensitive)
      const matchesPredefined = COLLEGES_LIST.some(
        predefined => predefined.toLowerCase() === college.toLowerCase()
      );
      if (!matchesPredefined) {
        allColleges.add(college);
      }
    });

    return NextResponse.json({
      success: true,
      data: Array.from(allColleges).sort(),
    });
  } catch (error) {
    console.error("Error fetching colleges:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch colleges" },
      { status: 500 }
    );
  }
}

