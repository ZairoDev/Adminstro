import { connectDb } from "@/util/db";
import { NextRequest, NextResponse } from "next/server";
import ical from "ical";

connectDb();

export async function POST(request: NextRequest) {
  const { url } = await request.json();
  console.log("url: ", url);
  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    console.log("response data: ", response);
    const data = await response.text();
		console.log('******\n data: ', data, "******");
		
		const parsedData = ical.parseICS(data);
		console.log('parsedData: ', parsedData);

    return NextResponse.json({
      message: "ical data fetched successfully",
      data: parsedData,
    });
  } catch (error) {
    console.error(error);
    // res.status(500).json({ error: "Failed to fetch ICS data" });
    NextResponse.json({ error: "Something went wrong", status: 400 });
  }
}
