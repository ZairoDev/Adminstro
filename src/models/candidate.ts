import { Schema, model, models } from "mongoose";

const CandidateSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    experience: { type: Number, required: true },
    address: { type: String, required: true },
    city: { type: String, required: true },

    country: { type: String, required: true },
    college: { type: String, required: true },
    position: { type: String, required: true },
    coverLetter: { type: String },
    linkedin: { type: String },
    portfolio: { type: String },
    resumeUrl: { type: String, required: true },
    photoUrl: { type: String, required: true },
    status: {
      type: String,
      enum: ["pending", "interview", "shortlisted", "selected", "rejected", "onboarding"],
      default: "pending",
    },
    interviewDetails: {
      scheduledDate: { type: Date, default: null },
      scheduledTime: { type: String, default: null },
      scheduledBy: { type: String, default: null },
      scheduledAt: { type: Date, default: null },
      notes: { type: String, default: null },
      remarks: {
        experienceValidation: { type: String, default: null },
        motherTongueInfluence: { type: String, default: null },
        englishSpeaking: { type: String, default: null },
        understandingScale: { type: String, default: null },
        listeningSkills: { type: String, default: null },
        basicProfessionalism: { type: String, default: null },
        stabilitySignals: { type: String, default: null },
        salaryExpectations: { type: String, default: null },
        hrNotes: { type: String, default: null },
        evaluatedBy: { type: String, default: null },
        evaluatedAt: { type: Date, default: null },
        lastUpdatedBy: { type: String, default: null },
        lastUpdatedAt: { type: Date, default: null },
      },
      rescheduleRequest: {
        requestedDate: { type: String, default: null },
        requestedTime: { type: String, default: null },
        reason: { type: String, default: null },
        requestedAt: { type: Date, default: null },
        status: { type: String, enum: ["pending", "approved", "rejected"], default: null },
        reviewedBy: { type: String, default: null },
        reviewedAt: { type: Date, default: null },
        token: { type: String, default: null },
      },
    },
    secondRoundInterviewDetails: {
      scheduledDate: { type: Date, default: null },
      scheduledTime: { type: String, default: null },
      scheduledBy: { type: String, default: null },
      scheduledAt: { type: Date, default: null },
      notes: { type: String, default: null },
      rescheduleRequest: {
        requestedDate: { type: String, default: null },
        requestedTime: { type: String, default: null },
        reason: { type: String, default: null },
        requestedAt: { type: Date, default: null },
        status: { type: String, enum: ["pending", "approved", "rejected"], default: null },
        reviewedBy: { type: String, default: null },
        reviewedAt: { type: Date, default: null },
        token: { type: String, default: null },
      },
    },
    selectionDetails: {
      positionType: {
        type: String,
        enum: ["fulltime", "intern"],
        default: null,
      },
      duration: { type: String, default: null },
      trainingPeriod: { type: String, default: null },
      role: { type: String, default: null },
      salary: { type: String, default: null },
    },
    shortlistDetails: {
      suitableRoles: [{ type: String }],
      notes: { type: String, default: null },
    },
    rejectionDetails: {
      reason: { type: String, default: null },
    },
    notes: [
      {
        content: { type: String, required: true },
        createdAt: { type: Date, default: Date.now },
        updatedAt: { type: Date, default: Date.now },
      },
    ],
    trainingAgreementDetails: {
      signingLink: { type: String, default: null },
      eSign: {
        signatureImage: { type: String, default: null },
        signedAt: { type: Date, default: null },
      },
      signedPdfUrl: { type: String, default: null },
      signedHrPoliciesPdfUrl: { type: String, default: null },
      signedLetterOfIntentPdfUrl: { type: String, default: null },
      letterOfIntentSigningDate: { type: Date, default: null },
      agreementAccepted: { type: Boolean, default: false },
      agreementAcceptedAt: { type: Date, default: null },
      agreementComplete: { type: Boolean, default: false },
      completedAt: { type: Date, default: null },
    },
    onboardingDetails: {
      onboardingLink: { type: String, default: null },
      personalDetails: {
        dateOfBirth: { type: String, default: null },
        gender: { type: String, default: null },
        nationality: { type: String, default: null },
        fatherName: { type: String, default: null },
        aadhaarNumber: { type: String, default: null },
        panNumber: { type: String, default: null },
      },
      bankDetails: {
        accountHolderName: { type: String, default: null },
        accountNumber: { type: String, default: null },
        ifscCode: { type: String, default: null },
        bankName: { type: String, default: null },
      },
      // Document re-upload request tracking
      reuploadRequest: {
        isActive: { type: Boolean, default: false },
        requestedDocuments: [{ type: String }], // Array of document keys that need re-upload
        requestedAt: { type: Date, default: null },
        requestedBy: { type: String, default: null },
        reason: { type: String, default: null },
        token: { type: String, default: null }, // Secure token for re-upload link
        tokenExpiresAt: { type: Date, default: null },
        emailSentAt: { type: Date, default: null },
        completedAt: { type: Date, default: null },
      },
      // Audit history for document re-uploads
      reuploadHistory: [
        {
          documentType: { type: String },
          previousUrl: { type: String },
          newUrl: { type: String },
          reuploadedAt: { type: Date },
          requestedBy: { type: String },
        },
      ],
      documents: {
        // New fields: front and back of Aadhar card
        aadharCard: { type: String, default: null },
        aadharCardFront: { type: String, default: null },
        aadharCardBack: { type: String, default: null },
        panCard: { type: String, default: null },
        highSchoolMarksheet: { type: String, default: null },
        interMarksheet: { type: String, default: null },
        graduationMarksheet: { type: String, default: null },
        experienceLetter: { type: String, default: null },
        relievingLetter: { type: String, default: null },
        salarySlips: [{ type: String }],
      },
      documentVerification: {
        aadharCard: {
          verified: { type: Boolean, default: false },
          verifiedBy: { type: String, default: null },
          verifiedAt: { type: Date, default: null },
        },
        aadharCardFront: {
          verified: { type: Boolean, default: false },
          verifiedBy: { type: String, default: null },
          verifiedAt: { type: Date, default: null },
        },
        aadharCardBack: {
          verified: { type: Boolean, default: false },
          verifiedBy: { type: String, default: null },
          verifiedAt: { type: Date, default: null },
        },
        panCard: {
          verified: { type: Boolean, default: false },
          verifiedBy: { type: String, default: null },
          verifiedAt: { type: Date, default: null },
        },
        highSchoolMarksheet: {
          verified: { type: Boolean, default: false },
          verifiedBy: { type: String, default: null },
          verifiedAt: { type: Date, default: null },
        },
        interMarksheet: {
          verified: { type: Boolean, default: false },
          verifiedBy: { type: String, default: null },
          verifiedAt: { type: Date, default: null },
        },
        graduationMarksheet: {
          verified: { type: Boolean, default: false },
          verifiedBy: { type: String, default: null },
          verifiedAt: { type: Date, default: null },
        },
        experienceLetter: {
          verified: { type: Boolean, default: false },
          verifiedBy: { type: String, default: null },
          verifiedAt: { type: Date, default: null },
        },
        relievingLetter: {
          verified: { type: Boolean, default: false },
          verifiedBy: { type: String, default: null },
          verifiedAt: { type: Date, default: null },
        },
        salarySlips: {
          verified: { type: Boolean, default: false },
          verifiedBy: { type: String, default: null },
          verifiedAt: { type: Date, default: null },
        },
      },
      eSign: {
        signatureImage: { type: String, default: null },
        signedAt: { type: Date, default: null },
      },
      // Experience details - stored as submitted during onboarding
      yearsOfExperience: { type: String, default: null },
      companies: [
        {
          companyName: { type: String, default: null },
          yearsInCompany: { type: String, default: null },
          experienceLetter: { type: String, default: null },
          relievingLetter: { type: String, default: null },
          salarySlip: { type: String, default: null },
          hrPhone: { type: String, default: null },
          hrEmail: { type: String, default: null },
        },
      ],
      // Signed PDF URL - authoritative source after signing
      // Once set, this should always be used instead of unsigned PDF
      signedPdfUrl: { type: String, default: null },
      termsAccepted: { type: Boolean, default: false },
      termsAcceptedAt: { type: Date, default: null },
      onboardingComplete: { type: Boolean, default: false },
      completedAt: { type: Date, default: null },
      verifiedByHR: {
        verified: { type: Boolean, default: false },
        verifiedBy: { type: String, default: null },
        verifiedAt: { type: Date, default: null },
        notes: { type: String, default: null },
      },
    },
  },
  { timestamps: true }
);

const Candidate = models.Candidate || model("Candidate", CandidateSchema);
export default Candidate;
