import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import mongoose from "mongoose";
import { connectDb } from "@/util/db";
import { getDataFromToken } from "@/util/getDataFromToken";
import Employees from "@/models/employee";
import Candidate from "@/models/candidate";
import {
  collectMyDocuments,
  MY_DOCUMENT_CATEGORIES,
  type MyDocumentCategory,
} from "@/lib/people/my-documents";

export const dynamic = "force-dynamic";

const querySchema = z.object({
  category: z.enum(MY_DOCUMENT_CATEGORIES).optional(),
});

interface AuthPayload {
  id?: string;
}

interface EmployeeLink {
  candidateId?: mongoose.Types.ObjectId | string | null;
  profilePic?: string | null;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const auth = (await getDataFromToken(request)) as AuthPayload;
    if (!auth.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const parsed = querySchema.safeParse({
      category: request.nextUrl.searchParams.get("category") ?? undefined,
    });
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid query", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    await connectDb();

    const employee = (await Employees.findById(auth.id)
      .select("candidateId profilePic")
      .lean()) as EmployeeLink | null;

    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    const employeeObjectId = new mongoose.Types.ObjectId(auth.id);
    const candidateQuery = employee.candidateId
      ? { _id: employee.candidateId }
      : { employeeId: employeeObjectId };

    const candidate = await Candidate.findOne(candidateQuery)
      .select(
        "resumeUrl photoUrl additionalDocuments selectionDetails trainingAgreementDetails onboardingDetails"
      )
      .lean();

    const documents = collectMyDocuments(
      candidate as Parameters<typeof collectMyDocuments>[0],
      { profilePic: employee.profilePic ?? null }
    );

    const category = parsed.data.category as MyDocumentCategory | undefined;
    const filtered = category
      ? documents.filter((doc) => doc.category === category)
      : documents;

    return NextResponse.json({
      documents: filtered,
      total: filtered.length,
      hasCandidateProfile: Boolean(candidate),
    });
  } catch (error: unknown) {
    const authError = error as { status?: number; code?: string };
    if (authError.status === 401 || authError.code) {
      return NextResponse.json(
        { error: "Unauthorized", code: authError.code ?? "AUTH_FAILED" },
        { status: authError.status ?? 401 }
      );
    }
    console.error("Failed to load my documents:", error);
    return NextResponse.json(
      { error: "Failed to load documents" },
      { status: 500 }
    );
  }
}
