import axios from "@/util/axios";
import { Candidate } from "../types";
import {
  getCandidateOfficeCity,
  getCandidateOfficePostingLocation,
} from "./officeAddressFromCandidate";

type PdfApiErrorBody = {
  error?: string;
  details?: string;
};

function decodePdfApiErrorBody(data: ArrayBuffer): string | null {
  try {
    const parsed = JSON.parse(new TextDecoder().decode(data)) as PdfApiErrorBody;
    return parsed.error || parsed.details || null;
  } catch {
    return null;
  }
}

export function getPdfGenerationErrorMessage(
  error: unknown,
  fallback: string,
): string {
  if (typeof error === "object" && error !== null && "response" in error) {
    const data = (error as { response?: { data?: unknown } }).response?.data;
    if (data instanceof ArrayBuffer) {
      return decodePdfApiErrorBody(data) ?? fallback;
    }
    if (data && typeof data === "object" && !Array.isArray(data)) {
      const body = data as PdfApiErrorBody;
      if (typeof body.error === "string" && body.error) return body.error;
      if (typeof body.details === "string" && body.details) return body.details;
    }
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

function ensurePdfArrayBuffer(bytes: ArrayBuffer, fallback: string): ArrayBuffer {
  const header = new TextDecoder("utf-8").decode(bytes.slice(0, 5));
  if (header.startsWith("%PDF")) return bytes;
  throw new Error(decodePdfApiErrorBody(bytes) ?? fallback);
}

export const generateUnsignedTrainingAgreement = async (candidate: Candidate) => {
  if (!candidate || !candidate.name || !candidate.position) return null;
  
  try {
    const agreementDate = new Date().toISOString();
    const agreementPayload = {
      candidateName: candidate.name,
      position: candidate.position,
      date: agreementDate,
      candidateId: candidate._id,
    };

    const pdfResponse = await axios.post(
      "/api/candidates/trainingAgreement",
      agreementPayload,
      {
        responseType: "arraybuffer",
        headers: { "Content-Type": "application/json" },
      }
    );

    const pdfBlob = new Blob([pdfResponse.data], {
      type: "application/pdf",
    });
    return URL.createObjectURL(pdfBlob);
  } catch (error: any) {
    console.error("Error generating unsigned training agreement PDF:", error);
    throw error;
  }
};

export const generateUnsignedHrPolicies = async (candidate: Candidate) => {
  if (!candidate || !candidate.name || !candidate.position) return null;
  
  try {
    const agreementDate = new Date().toISOString();
    const hrPoliciesPayload = {
      candidateName: candidate.name,
      position: candidate.position,
      date: agreementDate,
    };

    const pdfResponse = await axios.post(
      "/api/candidates/hrPolicies",
      hrPoliciesPayload,
      {
        responseType: "arraybuffer",
        headers: { "Content-Type": "application/json" },
      }
    );

    const pdfBlob = new Blob([pdfResponse.data], {
      type: "application/pdf",
    });
    return URL.createObjectURL(pdfBlob);
  } catch (error: any) {
    console.error("Error generating unsigned HR Policies PDF:", error);
    throw error;
  }
};

export const generateUnsignedLetterOfIntent = async (candidate: Candidate) => {
  if (!candidate || !candidate.name || !candidate.position) return null;
  
  try {
    const agreementDate = new Date().toISOString();
    // Don't pass designation/department - let API fetch from role document
    // The API will look up the role document and get both role name and department
    const letterOfIntentPayload = {
      candidateName: candidate.name,
      position: candidate.position,
      date: agreementDate,
      salary: candidate.selectionDetails?.salary?.toString() || undefined,
      candidateId: candidate._id,
      employmentType: candidate.employmentType ?? candidate.selectionDetails?.positionType,
    };

    const pdfResponse = await axios.post(
      "/api/candidates/letterOfIntent",
      letterOfIntentPayload,
      {
        responseType: "arraybuffer",
        headers: { "Content-Type": "application/json" },
      }
    );

    const pdfBlob = new Blob([pdfResponse.data], {
      type: "application/pdf",
    });
    return URL.createObjectURL(pdfBlob);
  } catch (error: any) {
    console.error("Error generating unsigned Letter of Intent PDF:", error);
    throw error;
  }
};

export const generateUnsignedOnboardingAgreement = async (candidate: Candidate) => {
  if (!candidate || !candidate.name || !candidate.position) {
    console.log("Cannot generate unsigned onboarding PDF: missing candidate data");
    return null;
  }
  
  try {
    const agreementPayload = {
      agreementDate: new Date().toISOString(),
      agreementCity: getCandidateOfficeCity(candidate),
      employeeName: candidate.name,
      fatherName: candidate.onboardingDetails?.personalDetails?.fatherName || "",
      employeeAddress: candidate.address || "",
      designation: candidate.position,
      effectiveFrom: new Date().toISOString(),
      postingLocation: getCandidateOfficePostingLocation(candidate),
      salaryINR: candidate.selectionDetails?.salary 
        ? `${candidate.selectionDetails.salary} per month`
        : "As per employment terms",
      witness1: "____________________",
      witness2: "____________________",
      candidateId: candidate._id, // Pass candidateId so API can fetch stored onboardingStartedAt date
      employmentType:
        candidate.employmentType ?? candidate.selectionDetails?.positionType,
    };

    const pdfResponse = await axios.post(
      "/api/candidates/onboardingDocument",
      agreementPayload,
      {
        responseType: "arraybuffer",
        headers: { "Content-Type": "application/json" },
      }
    );

    const pdfBlob = new Blob([pdfResponse.data], {
      type: "application/pdf",
    });
    return URL.createObjectURL(pdfBlob);
  } catch (error: any) {
    console.error("Error generating unsigned onboarding agreement PDF:", error);
    throw error;
  }
};

export const generateUnsignedOfferLetter = async (
  candidate: Candidate,
): Promise<string> => {
  if (!candidate?.name) {
    throw new Error("Candidate name is required to generate the offer letter");
  }

  const candidateFullName = candidate.name;
  const candidateFirstName =
    candidateFullName.split(" ")[0] || candidateFullName;
  const salaryValue = candidate.selectionDetails?.salary;
  const annualCTC = salaryValue ? String(salaryValue) : "As per company policy";

  const offerLetterPayload = {
    letterDate: new Date().toISOString().slice(0, 10),
    employeeName: candidateFirstName,
    employeeFullName: candidateFullName,
    designation: candidate.selectionDetails?.role || candidate.position || "",
    dateOfJoining: candidate.selectionDetails?.trainingDate
      ? String(candidate.selectionDetails.trainingDate)
      : new Date().toISOString().slice(0, 10),
    postingLocation: getCandidateOfficePostingLocation(candidate),
    annualCTC,
    workingHoursStart: "11:30 AM",
    workingHoursEnd: "8:30 PM",
    salaryPaymentCycle: "15th to 18th",
    probationPeriod: "six (6) months",
    candidateId: candidate._id,
  };

  try {
    const pdfResponse = await axios.post(
      "/api/candidates/offerLetter",
      offerLetterPayload,
      {
        responseType: "arraybuffer",
        headers: { "Content-Type": "application/json" },
      },
    );

    const pdfBytes = ensurePdfArrayBuffer(
      pdfResponse.data as ArrayBuffer,
      "Failed to generate offer letter PDF",
    );
    const pdfBlob = new Blob([pdfBytes], { type: "application/pdf" });
    return URL.createObjectURL(pdfBlob);
  } catch (error: unknown) {
    console.error("Error generating unsigned offer letter PDF:", error);
    throw new Error(
      getPdfGenerationErrorMessage(error, "Failed to generate offer letter PDF"),
    );
  }
};

