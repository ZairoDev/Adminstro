export interface Candidate {
  _id: string;
  name: string;
  email: string;
  phone: string;
  position: string;
  experience: number;
  address: string;
  city: string;
  country: string;
  college?: string;
  coverLetter?: string;
  linkedin?: string;
  portfolio?: string;
  resumeUrl: string;
  photoUrl?: string;
  status: "pending"|"interview"|"shortlisted"|"selected"|"rejected"|"onboarding";
  createdAt: string;
  isImportant?: boolean;
  interviewAttendance?: "appeared" | "not_appeared" | null;
  interviewDetails?: {
    scheduledDate?: string;
    scheduledTime?: string;
    scheduledBy?: string;
    scheduledAt?: string;
    notes?: string;
    remarks?: {
      experienceValidation?: string;
      motherTongueInfluence?: string;
      englishSpeaking?: string;
      understandingScale?: string;
      listeningSkills?: string;
      basicProfessionalism?: string;
      stabilitySignals?: string;
      salaryExpectations?: string;
      hrNotes?: string;
      evaluatedBy?: string;
      evaluatedAt?: string;
      lastUpdatedBy?: string;
      lastUpdatedAt?: string;
    };
    rescheduleRequest?: {
      requestedDate?: string;
      requestedTime?: string;
      reason?: string;
      requestedAt?: string;
      status?: "pending" | "approved" | "rejected";
      reviewedBy?: string;
      reviewedAt?: string;
      token?: string;
    };
  };
  secondRoundInterviewDetails?: {
    scheduledDate?: string;
    scheduledTime?: string;
    scheduledBy?: string;
    scheduledAt?: string;
    notes?: string;
    rescheduleRequest?: {
      requestedDate?: string;
      requestedTime?: string;
      reason?: string;
      requestedAt?: string;
      status?: "pending" | "approved" | "rejected";
      reviewedBy?: string;
      reviewedAt?: string;
      token?: string;
    };
  };
  selectionDetails?: {
    positionType: "fulltime" | "intern";
    duration: string;
    trainingPeriod: string;
    role: string;
    salary?: number;
  };
  shortlistDetails?: {
    suitableRoles: string[];
    notes?: string;
  };
  rejectionDetails?: {
    reason: string;
  };
  onboardingDetails?: {
    onboardingLink?: string;
    personalDetails?: {
      dateOfBirth?: string;
      gender?: string;
      nationality?: string;
      fatherName?: string;
      aadhaarNumber?: string;
      panNumber?: string;
    };
    bankDetails?: {
      accountHolderName?: string;
      accountNumber?: string;
      ifscCode?: string;
      bankName?: string;
    };
    documents?: {
      aadharCard?: string;
      aadharCardFront?: string;
      aadharCardBack?: string;
      panCard?: string;
      highSchoolMarksheet?: string;
      interMarksheet?: string;
      graduationMarksheet?: string;
      experienceLetter?: string;
      relievingLetter?: string;
      salarySlips?: string[];
    };
    documentVerification?: {
      [key: string]: {
        verified: boolean;
        verifiedBy?: string | null;
        verifiedAt?: Date | string | null;
      };
    };
    eSign?: {
      signatureImage?: string;
      signedAt?: string;
    };
    termsAccepted?: boolean;
    termsAcceptedAt?: string;
    onboardingComplete?: boolean;
    completedAt?: string | Date;
    signedPdfUrl?: string;
    verifiedByHR?: {
      verified: boolean;
      verifiedBy?: string | null;
      verifiedAt?: Date | string | null;
      notes?: string | null;
    };
    resignatureRequest?: {
      agreementType: string;
      token: string;
      tokenExpiresAt: string;
      requestedBy: string;
      requestedAt: string;
      reason?: string | null;
      isActive: boolean;
      emailSentAt?: string | null;
    };
  };
  trainingAgreementDetails?: {
    signingLink?: string;
    eSign?: {
      signatureImage?: string;
      signedAt?: string;
    };
    signedPdfUrl?: string;
    signedHrPoliciesPdfUrl?: string;
    signedLetterOfIntentPdfUrl?: string;
    letterOfIntentSigningDate?: string;
    agreementAccepted?: boolean;
    agreementAcceptedAt?: string;
    agreementComplete?: boolean;
    completedAt?: string;
    resignatureRequest?: {
      agreementType: string;
      token: string;
      tokenExpiresAt: string;
      requestedBy: string;
      requestedAt: string;
      reason?: string | null;
      isActive: boolean;
      emailSentAt?: string | null;
    };
  };
}

