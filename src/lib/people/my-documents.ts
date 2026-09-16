import { getOnboardingDocumentLabel } from "@/lib/people/onboarding-documents";

export const MY_DOCUMENT_CATEGORIES = [
  "application",
  "issued",
  "onboarding",
  "experience",
  "additional",
  "profile",
] as const;

export type MyDocumentCategory = (typeof MY_DOCUMENT_CATEGORIES)[number];

export const MY_DOCUMENT_CATEGORY_LABELS: Record<MyDocumentCategory, string> = {
  application: "Application",
  issued: "Issued documents",
  onboarding: "Onboarding & KYC",
  experience: "Employment history",
  additional: "Additional uploads",
  profile: "Profile",
};

export type MyDocumentItem = {
  id: string;
  label: string;
  category: MyDocumentCategory;
  urls: string[];
  uploadedAt: string | null;
  uploadedBy: string | null;
  fileKind: "pdf" | "image" | "file";
  details: string | null;
};

type AdditionalDocument = {
  name?: string | null;
  url?: string | null;
  uploadedAt?: Date | string | null;
  uploadedBy?: string | null;
};

type CompanyDocumentRow = {
  companyName?: string | null;
  experienceLetter?: string | null;
  relievingLetter?: string | null;
  salarySlip?: string | null;
};

type CandidateDocumentSource = {
  resumeUrl?: string | null;
  photoUrl?: string | null;
  additionalDocuments?: AdditionalDocument[] | null;
  selectionDetails?: {
    signedOfferLetterPdfUrl?: string | null;
    unsignedOfferLetterPdfUrl?: string | null;
    offerLetterSentAt?: Date | string | null;
  } | null;
  trainingAgreementDetails?: {
    signedPdfUrl?: string | null;
    signedHrPoliciesPdfUrl?: string | null;
    signedLetterOfIntentPdfUrl?: string | null;
    completedAt?: Date | string | null;
    eSign?: {
      signatureImage?: string | null;
      signedAt?: Date | string | null;
    } | null;
  } | null;
  onboardingDetails?: {
    completedAt?: Date | string | null;
    signedPdfUrl?: string | null;
    documents?: Record<string, string | string[] | null | undefined> | null;
    eSign?: {
      signatureImage?: string | null;
      signedAt?: Date | string | null;
    } | null;
    companies?: CompanyDocumentRow[] | null;
  } | null;
};

type EmployeeDocumentSource = {
  profilePic?: string | null;
};

function asUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!/^https?:\/\//i.test(trimmed)) return null;
  return trimmed;
}

function asUrlList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => asUrl(item))
      .filter((item): item is string => Boolean(item));
  }
  const single = asUrl(value);
  return single ? [single] : [];
}

function toIso(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function inferFileKind(urls: string[]): "pdf" | "image" | "file" {
  const first = urls[0]?.toLowerCase() ?? "";
  if (first.includes(".pdf")) return "pdf";
  if (/\.(png|jpe?g|gif|webp|bmp|svg)(\?|$)/i.test(first)) return "image";
  return "file";
}

function pushDocument(
  documents: MyDocumentItem[],
  item: Omit<MyDocumentItem, "fileKind"> & { fileKind?: MyDocumentItem["fileKind"] }
): void {
  if (item.urls.length === 0) return;
  documents.push({
    ...item,
    fileKind: item.fileKind ?? inferFileKind(item.urls),
  });
}

export function collectMyDocuments(
  candidate: CandidateDocumentSource | null,
  employee: EmployeeDocumentSource | null
): MyDocumentItem[] {
  const documents: MyDocumentItem[] = [];

  if (candidate) {
    pushDocument(documents, {
      id: "application-resume",
      label: "Resume",
      category: "application",
      urls: asUrlList(candidate.resumeUrl),
      uploadedAt: null,
      uploadedBy: null,
      details: "Uploaded with the job application",
    });

    pushDocument(documents, {
      id: "application-photo",
      label: "Application photo",
      category: "application",
      urls: asUrlList(candidate.photoUrl),
      uploadedAt: null,
      uploadedBy: null,
      details: "Photo submitted with the job application",
      fileKind: "image",
    });

    const selection = candidate.selectionDetails;
    pushDocument(documents, {
      id: "issued-signed-offer-letter",
      label: "Signed offer letter",
      category: "issued",
      urls: asUrlList(selection?.signedOfferLetterPdfUrl),
      uploadedAt: toIso(selection?.offerLetterSentAt),
      uploadedBy: null,
      details: "Offer letter signed during hiring",
      fileKind: "pdf",
    });
    pushDocument(documents, {
      id: "issued-unsigned-offer-letter",
      label: "Offer letter (unsigned copy)",
      category: "issued",
      urls: asUrlList(selection?.unsignedOfferLetterPdfUrl),
      uploadedAt: toIso(selection?.offerLetterSentAt),
      uploadedBy: null,
      details: "Unsigned preview of the offer letter",
      fileKind: "pdf",
    });

    const training = candidate.trainingAgreementDetails;
    pushDocument(documents, {
      id: "issued-training-agreement",
      label: "Signed training agreement",
      category: "issued",
      urls: asUrlList(training?.signedPdfUrl),
      uploadedAt: toIso(training?.completedAt),
      uploadedBy: null,
      details: "Training agreement issued during hiring",
      fileKind: "pdf",
    });
    pushDocument(documents, {
      id: "issued-hr-policies",
      label: "Signed HR policies",
      category: "issued",
      urls: asUrlList(training?.signedHrPoliciesPdfUrl),
      uploadedAt: toIso(training?.completedAt),
      uploadedBy: null,
      details: "HR policies acknowledgement",
      fileKind: "pdf",
    });
    pushDocument(documents, {
      id: "issued-letter-of-intent",
      label: "Signed letter of intent",
      category: "issued",
      urls: asUrlList(training?.signedLetterOfIntentPdfUrl),
      uploadedAt: toIso(training?.completedAt),
      uploadedBy: null,
      details: "Letter of intent issued during hiring",
      fileKind: "pdf",
    });
    pushDocument(documents, {
      id: "issued-training-signature",
      label: "Training agreement signature",
      category: "issued",
      urls: asUrlList(training?.eSign?.signatureImage),
      uploadedAt: toIso(training?.eSign?.signedAt),
      uploadedBy: null,
      details: "E-signature captured on the training agreement",
      fileKind: "image",
    });

    const onboarding = candidate.onboardingDetails;
    pushDocument(documents, {
      id: "issued-service-agreement",
      label: "Signed service agreement",
      category: "issued",
      urls: asUrlList(onboarding?.signedPdfUrl),
      uploadedAt: toIso(onboarding?.completedAt),
      uploadedBy: null,
      details: "Onboarding service agreement / bond",
      fileKind: "pdf",
    });
    pushDocument(documents, {
      id: "onboarding-signature",
      label: "Onboarding signature",
      category: "onboarding",
      urls: asUrlList(onboarding?.eSign?.signatureImage),
      uploadedAt: toIso(onboarding?.eSign?.signedAt),
      uploadedBy: null,
      details: "E-signature captured during onboarding",
      fileKind: "image",
    });

    const kycDocs = onboarding?.documents ?? {};
    for (const [key, value] of Object.entries(kycDocs)) {
      pushDocument(documents, {
        id: `onboarding-${key}`,
        label: getOnboardingDocumentLabel(key),
        category: "onboarding",
        urls: asUrlList(value),
        uploadedAt: toIso(onboarding?.completedAt),
        uploadedBy: null,
        details: "Uploaded during onboarding",
      });
    }

    const companies = onboarding?.companies ?? [];
    companies.forEach((company, index) => {
      const companyLabel = company.companyName?.trim() || `Previous employer ${index + 1}`;
      pushDocument(documents, {
        id: `experience-${index}-letter`,
        label: `Experience letter — ${companyLabel}`,
        category: "experience",
        urls: asUrlList(company.experienceLetter),
        uploadedAt: null,
        uploadedBy: null,
        details: companyLabel,
      });
      pushDocument(documents, {
        id: `experience-${index}-relieving`,
        label: `Relieving letter — ${companyLabel}`,
        category: "experience",
        urls: asUrlList(company.relievingLetter),
        uploadedAt: null,
        uploadedBy: null,
        details: companyLabel,
      });
      pushDocument(documents, {
        id: `experience-${index}-salary`,
        label: `Salary slip — ${companyLabel}`,
        category: "experience",
        urls: asUrlList(company.salarySlip),
        uploadedAt: null,
        uploadedBy: null,
        details: companyLabel,
      });
    });

    const extras = candidate.additionalDocuments ?? [];
    extras.forEach((doc, index) => {
      const name = doc.name?.trim() || `Additional document ${index + 1}`;
      pushDocument(documents, {
        id: `additional-${index}`,
        label: name,
        category: "additional",
        urls: asUrlList(doc.url),
        uploadedAt: toIso(doc.uploadedAt),
        uploadedBy: doc.uploadedBy?.trim() || null,
        details: doc.uploadedBy ? `Uploaded by ${doc.uploadedBy}` : "Uploaded to your profile",
      });
    });
  }

  pushDocument(documents, {
    id: "profile-picture",
    label: "Profile picture",
    category: "profile",
    urls: asUrlList(employee?.profilePic),
    uploadedAt: null,
    uploadedBy: null,
    details: "Current employee profile photo",
    fileKind: "image",
  });

  return documents;
}

export function suggestedDownloadName(item: MyDocumentItem, url: string, index: number): string {
  const safeLabel = item.label.replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "");
  const fromUrl = url.split("?")[0]?.split("/").pop() ?? "";
  const extensionMatch = fromUrl.match(/\.[a-zA-Z0-9]+$/);
  const extension =
    extensionMatch?.[0] ??
    (item.fileKind === "pdf" ? ".pdf" : item.fileKind === "image" ? ".jpg" : "");
  const suffix = item.urls.length > 1 ? `-${index + 1}` : "";
  return `${safeLabel || "document"}${suffix}${extension}`;
}
