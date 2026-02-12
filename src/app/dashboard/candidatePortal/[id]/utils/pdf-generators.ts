import axios from "axios";
import { Candidate } from "../types";

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
    const letterOfIntentPayload = {
      candidateName: candidate.name,
      position: candidate.position,
      date: agreementDate,
      salary: candidate.selectionDetails?.salary?.toString() || undefined,
      designation: candidate.selectionDetails?.role || candidate.position,
      department: candidate.selectionDetails?.role || candidate.position,
      candidateId: candidate._id,
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
      agreementCity: candidate.city ?? "Kanpur",
      employeeName: candidate.name,
      fatherName: candidate.onboardingDetails?.personalDetails?.fatherName || "",
      employeeAddress: candidate.address || "",
      designation: candidate.position,
      effectiveFrom: new Date().toISOString(),
      postingLocation: candidate.city || "Kanpur",
      salaryINR: candidate.selectionDetails?.salary 
        ? `${candidate.selectionDetails.salary.toLocaleString("en-IN")} per month`
        : "As per employment terms",
      witness1: "____________________",
      witness2: "____________________",
      candidateId: candidate._id, // Pass candidateId so API can fetch stored onboardingStartedAt date
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

