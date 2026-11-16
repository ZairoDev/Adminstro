import { readFile } from "fs/promises";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import Candidate from "@/models/candidate";
import { connectDb } from "@/util/db";
import { parseLocalDateString } from "@/lib/utils";
import { resolveLetterJobIdentity } from "@/lib/departments/resolveLetterIdentity";
import { renderSalaryAnnexurePdf } from "@/lib/pdf/renderSalaryAnnexure";
import { salaryAnnexureFormNumber } from "@/modules/finance/salary-annexure";
import {
  MissingOfficeAddressError,
  missingOfficeAddressResponse,
  resolveCandidateOfficeAddress,
} from "@/lib/officeAddress/resolveCandidateOfficeAddress";
import {
  MissingRegisteredOfficeError,
  missingRegisteredOfficeResponse,
  resolveRegisteredOfficeAddress,
} from "@/lib/officeAddress/resolveRegisteredOfficeAddress";

const bodySchema = z.object({
  candidateId: z.string().trim().min(1),
  candidateSignatureBase64: z.string().trim().optional(),
  signingDate: z.string().trim().optional(),
  letterDate: z.string().trim().optional(),
});

function parseAnnualCtc(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) && value > 0 ? Math.round(value) : null;
  }
  if (typeof value !== "string") return null;
  const raw = value.trim();
  if (!raw) return null;
  const lpaMatch = raw.match(/([\d.]+)\s*lpa/i);
  if (lpaMatch) {
    const amount = Number(lpaMatch[1]) * 100000;
    return Number.isFinite(amount) && amount > 0 ? Math.round(amount) : null;
  }
  if (/lakh|thousand/i.test(raw)) return null;
  const numeric = Number(raw.replace(/[₹,\s]|rs\.?/gi, ""));
  if (!Number.isFinite(numeric) || numeric <= 0) return null;
  return numeric;
}

function formatEffectiveFrom(value: string | undefined): string {
  if (!value) return "";
  const date = /^\d{4}-\d{2}-\d{2}/.test(value)
    ? parseLocalDateString(value.slice(0, 10))
    : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const day = date.getDate();
  const suffix =
    day === 1 || day === 21 || day === 31
      ? "st"
      : day === 2 || day === 22
        ? "nd"
        : day === 3 || day === 23
          ? "rd"
          : "th";
  const month = date.toLocaleString("en-US", { month: "long" });
  return `${day}${suffix} ${month} ${date.getFullYear()}`;
}

async function readSignature(value: string | undefined): Promise<Buffer | undefined> {
  if (!value) return undefined;
  if (value.startsWith("data:")) {
    const match = value.match(/^data:image\/\w+;base64,(.+)$/);
    if (!match?.[1]) return undefined;
    return Buffer.from(match[1], "base64");
  }
  const response = await fetch(value);
  if (!response.ok) return undefined;
  return Buffer.from(await response.arrayBuffer());
}

async function readAuthorizedSignature(): Promise<Buffer | undefined> {
  try {
    return await readFile(path.join(process.cwd(), "public", "Ankita-mam.png"));
  } catch {
    return undefined;
  }
}

export async function POST(request: NextRequest) {
  try {
    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "A candidate is required to generate the salary annexure" },
        { status: 400 },
      );
    }

    await connectDb();
    const candidate = await Candidate.findById(parsed.data.candidateId).lean();
    if (!candidate) {
      return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
    }

    const annualCtc = parseAnnualCtc(candidate.selectionDetails?.salary);
    if (!annualCtc) {
      return NextResponse.json(
        { error: "Annual CTC is required to generate the salary annexure" },
        { status: 400 },
      );
    }

    const identity = await resolveLetterJobIdentity({
      position: candidate.position,
      department: candidate.department,
      selectionDetails: candidate.selectionDetails,
    });

    let corporateOfficeAddress = "";
    let corporateOfficeName = "Zairo International";
    let registeredOfficeAddress = "";
    try {
      const [registered, office] = await Promise.all([
        resolveRegisteredOfficeAddress(),
        resolveCandidateOfficeAddress({ candidateId: parsed.data.candidateId }),
      ]);
      registeredOfficeAddress = registered.companyAddress;
      corporateOfficeAddress = office.companyAddress;
      corporateOfficeName = office.name || corporateOfficeName;
    } catch (error) {
      if (error instanceof MissingOfficeAddressError) {
        return NextResponse.json(missingOfficeAddressResponse(), { status: 400 });
      }
      if (error instanceof MissingRegisteredOfficeError) {
        return NextResponse.json(missingRegisteredOfficeResponse(), { status: 400 });
      }
      throw error;
    }

    const signatureRequested = Boolean(parsed.data.candidateSignatureBase64);
    const candidateSignature = await readSignature(parsed.data.candidateSignatureBase64);
    if (signatureRequested && !candidateSignature) {
      return NextResponse.json(
        { error: "Could not read the signature for the salary annexure" },
        { status: 400 },
      );
    }

    const issuedOn = parsed.data.letterDate
      ? parseLocalDateString(parsed.data.letterDate.slice(0, 10))
      : new Date();
    const joiningDate = candidate.selectionDetails?.trainingDate
      ? String(candidate.selectionDetails.trainingDate)
      : parsed.data.letterDate;

    const pdfBytes = await renderSalaryAnnexurePdf({
      employeeName: candidate.name || "",
      designation: identity.jobTitle || candidate.position || "",
      effectiveFrom: formatEffectiveFrom(joiningDate),
      formNumber: salaryAnnexureFormNumber(parsed.data.candidateId, issuedOn),
      corporateOfficeName,
      corporateOfficeAddress,
      registeredOfficeAddress,
      annualCtcRupees: annualCtc,
      authorizedSignatoryName: "Ankita Nigam",
      authorizedSignatoryTitle: "Chief Operating Officer",
      authorizedSignature: await readAuthorizedSignature(),
      candidateSignature,
      signedOn: candidateSignature ? parsed.data.signingDate : undefined,
    });

    const safeName = (candidate.name || "Candidate").replace(/\s+/g, "_");
    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="Salary-Annexure-${safeName}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Salary annexure PDF error:", error);
    return NextResponse.json(
      {
        error: "Failed to generate the salary annexure",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
