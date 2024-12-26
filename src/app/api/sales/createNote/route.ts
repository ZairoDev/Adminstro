import { NextRequest, NextResponse } from "next/server";

import Query from "@/models/query";
import { connectDb } from "@/util/db";
import { getDataFromToken } from "@/util/getDataFromToken";

connectDb();

export async function POST(req: NextRequest) {
  try {
    const token = await getDataFromToken(req);
    const loggedInUser = token?.email;

    const { id, note } = await req.json();
    if (!id || !note) {
      return NextResponse.json(
        {
          success: false,
          error: "Please provide both id and note.",
        },
        { status: 400 }
      );
    }
    const query = await Query.findById(id);
    if (!query) {
      return NextResponse.json(
        {
          success: false,
          error: "Query not found.",
        },
        { status: 404 }
      );
    }

    const noteObject = {
      noteData: note,
      createdBy: loggedInUser,
      createOn: new Date().toLocaleString("en-GB", {
        timeZone: "Asia/Kolkata",
      }),
    };

    query.note.push(noteObject);
    await query.save();

    return NextResponse.json({
      success: true,
      message: "Note added successfully.",
      data: query,
    });
  } catch (error) {
    console.error("Error adding note:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal Server Error",
      },
      { status: 400 }
    );
  }
}
