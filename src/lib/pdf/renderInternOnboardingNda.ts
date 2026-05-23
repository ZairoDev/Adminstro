/**
 * Intern Non-Disclosure Agreement Bond body (onboarding PDF).
 * Uses same section layout as full-time Service Agreement Bond.
 */

import {
  buildInternAppointmentRole,
} from "./letterOfIntentIntern";

export interface InternNdaParams {
  companyName: string;
  companyCIN: string;
  companyAddress: string;
  agreementCity: string;
  day: string | number;
  monthName: string;
  year: string | number;
  internName: string;
  fatherName: string;
  internAddress: string;
  relationshipPrefix: string;
  designation: string;
  roleName: string | null;
  position: string;
  formattedEffectiveFrom: string;
  jurisdictionCity: string;
}

export interface OnboardingPdfWriter {
  drawWrappedText: (
    text: string,
    x: number,
    fontSize?: number,
    boldFont?: boolean
  ) => number;
  drawFullWidthSectionHeading: (title: string) => void;
  ensureSpace: (minHeight: number) => void;
  bumpY: (delta: number) => void;
  leftMargin: number;
  bodySize: number;
  paragraphSpacing: number;
  lineHeight: number;
}

function drawParagraphs(
  w: OnboardingPdfWriter,
  paragraphs: string[],
  indent = 0
) {
  const x = w.leftMargin + indent;
  for (const p of paragraphs) {
    w.ensureSpace(w.lineHeight * 4);
    w.drawWrappedText(p, x, w.bodySize);
    w.bumpY(w.paragraphSpacing);
  }
}

function drawSection(
  w: OnboardingPdfWriter,
  title: string,
  items: string[],
  numbered = false
) {
  w.ensureSpace(w.lineHeight * 6);
  w.drawFullWidthSectionHeading(title);
  w.bumpY(w.lineHeight);
  const x = w.leftMargin + 5;
  items.forEach((item, index) => {
    w.ensureSpace(w.lineHeight * 3);
    const prefix = numbered ? `${index + 1}. ` : "";
    w.drawWrappedText(`${prefix}${item}`, x, w.bodySize);
    w.bumpY(w.lineHeight * 0.5);
  });
  w.bumpY(w.paragraphSpacing * 0.5);
}

export function renderInternOnboardingNda(
  w: OnboardingPdfWriter,
  p: InternNdaParams
): void {
  const appointmentRole = buildInternAppointmentRole(p.roleName, p.position);
  const dayStr = String(p.day);
  const yearStr = String(p.year);

  drawParagraphs(w, [
    `This Non-Disclosure Agreement Bond is made and executed at ${p.agreementCity} on this ${dayStr} of ${p.monthName}, ${yearStr} (hereinafter referred to as "Bond") between ${p.companyName} (CIN: ${p.companyCIN}), a company incorporated under the Companies Act, 1956 and having its registered office at ${p.companyAddress} (hereinafter referred to as the "Company", which expression shall be deemed to include their executors, successors and permitted assigns) of the first part.`,
  ]);

  w.bumpY(w.paragraphSpacing);
  w.drawWrappedText("AND", w.leftMargin + 190, w.bodySize, true);
  w.bumpY(w.paragraphSpacing);

  drawParagraphs(w, [
    `${p.internName}, ${p.relationshipPrefix} ${p.fatherName || "_________________"}, R/o ${p.internAddress || "___________________________"}, (hereinafter called the "Intern" which expression shall be deemed to include their executors, heirs and administrators) of the second part`,
  ]);

  w.drawWrappedText("AND", w.leftMargin + 190, w.bodySize, true);
  w.bumpY(w.lineHeight);
  w.ensureSpace(w.lineHeight * 3);
  w.drawWrappedText(
    "WHEREAS the Company is engaged in various business activities including international business development, digital services, e-commerce operations, marketing, and related services.",
    w.leftMargin,
    w.bodySize
  );
  w.bumpY(w.paragraphSpacing);

  w.drawWrappedText(
    "WHEREAS the Intern has agreed to undertake an internship with the Company on a Work From Home (Remote) basis.",
    w.leftMargin,
    w.bodySize
  );
  w.bumpY(w.paragraphSpacing);

  w.drawWrappedText(
    "WHEREAS during the course of internship, the Intern may gain access to confidential and proprietary information belonging to the Company.",
    w.leftMargin,
    w.bodySize
  );
  w.bumpY(w.paragraphSpacing);
  w.ensureSpace(w.lineHeight * 4);
  w.drawWrappedText(
    "IT IS NOW HEREBY AGREED BY AND BETWEEN THE PARTIES AND WITNESS AS FOLLOWS:",
    w.leftMargin,
    w.bodySize,
    true
  );
  w.bumpY(w.paragraphSpacing * 2);

  drawSection(w, "A. APPOINTMENT", [
    `You are being appointed as ${appointmentRole} with effect from ${p.formattedEffectiveFrom} and shall be considered an 'Intern' of the Company.`,
  ]);

  drawSection(w, "B. ENGAGEMENT", [
    `The Intern is engaged as an Intern (Work From Home) with effect from ${p.formattedEffectiveFrom} for training and learning purposes only.`,
    "This Agreement does not constitute employment and shall not be treated as an employer-employee relationship.",
  ], true);

  w.ensureSpace(w.lineHeight * 6);
  w.drawFullWidthSectionHeading("C. CONFIDENTIAL INFORMATION");
  w.bumpY(w.lineHeight);
  drawParagraphs(w, [
    "Confidential Information shall include, but shall not be limited to, the following:",
  ], 5);
  const confidentialItems = [
    "Client databases, leads, contact information, customer records, vendor details, and business relationships developed or maintained by the Company.",
    "Business strategies, operational processes, workflows, internal policies, project methodologies, and organizational practices used in conducting Company operations.",
    "Sales, marketing, branding, promotional strategies, campaign data, pricing structures, revenue models, and market research information belonging to the Company.",
    "Financial or commercial information including business plans, forecasts, cost structures, investments, transactions, proposals, quotations, and any non-public financial data.",
    "Login credentials, passwords, software access, internal platforms, CRM systems, dashboards, reports, databases, analytics, documents, and internal communications provided to or accessed by the Intern.",
    "Intellectual property including designs, source materials, creative content, documents, presentations, software, website material, trade secrets, proprietary methods, innovations, and any material developed, used, or owned by the Company.",
    "Any information marked as confidential or any information which a reasonable person would understand to be confidential considering the nature or circumstances of disclosure.",
  ];
  confidentialItems.forEach((item, index) => {
    w.ensureSpace(w.lineHeight * 3);
    w.drawWrappedText(`${index + 1}. ${item}`, w.leftMargin + 5, w.bodySize);
    w.bumpY(w.lineHeight * 0.5);
  });
  w.bumpY(w.paragraphSpacing * 0.5);

  w.ensureSpace(w.lineHeight * 6);
  w.drawFullWidthSectionHeading("D. Non-Disclosure Obligations");
  w.bumpY(w.lineHeight);
  drawParagraphs(w, [
    "The Intern hereby agrees and undertakes that he/she shall:",
  ], 5);
  const ndaObligations = [
    "Not disclose, communicate, or make available any Confidential Information to any third party without prior written consent of the Company.",
    "Not copy, reproduce, modify, store, transmit, or distribute any Company information except as required for authorized internship duties.",
    "Not use Confidential Information for personal gain, external employment, freelancing activities, or for the benefit of any individual or organization other than the Company.",
  ];
  ndaObligations.forEach((item, index) => {
    w.ensureSpace(w.lineHeight * 3);
    w.drawWrappedText(`${index + 1}. ${item}`, w.leftMargin + 5, w.bodySize);
    w.bumpY(w.lineHeight * 0.5);
  });
  w.bumpY(w.paragraphSpacing * 0.5);

  w.ensureSpace(w.lineHeight * 6);
  w.drawFullWidthSectionHeading("E. Work From Home Security Responsibilities");
  w.bumpY(w.lineHeight);
  drawParagraphs(w, [
    "While performing internship duties remotely, the Intern agrees to comply with the following security obligations to ensure protection of Company information, systems, and digital assets:",
  ], 5);
  const wfhSecurityItems = [
    "Secure Device Usage: The Intern shall use only personal devices that are protected by strong passwords, PINs, or biometric authentication and ensure that such devices are not accessible to unauthorized individuals.",
    "Secure Internet Connectivity: The Intern shall work only through secure and reliable internet connections and shall avoid accessing Company systems through unsecured public Wi-Fi networks unless appropriate security protection (such as VPN or equivalent safeguards) is in place.",
    "Restricted System Access: The Intern shall not use public, shared, cyber cafe, or third-party computers for Company work and shall ensure that Company accounts remain logged out when not in use.",
    "Protection of Confidential Data: The Intern shall take reasonable precautions to prevent unauthorized viewing, copying, downloading, or sharing of Company information and shall ensure that family members, friends, or any third party do not access Company work, screens, files, or communications.",
    "Safe Storage of Company Files: All Company documents, databases, and materials shall be stored securely and shall not be transferred to personal cloud storage, external drives, or unauthorized applications without prior approval from the Company.",
    "Prevention of Misuse or Theft: The Intern shall safeguard Company data from loss, theft, cyber threats, malware, or unauthorized duplication and shall maintain updated antivirus protection where applicable.",
    "Reporting Security Incidents: The Intern must immediately notify the Company in the event of: suspected data breach, unauthorized access, device loss or theft, accidental disclosure of Company information, or any cyber security risk affecting Company systems.",
    "Compliance with Company IT Policies: The Intern agrees to follow all Company data protection, cyber security, confidentiality, and remote work policies as communicated from time to time.",
  ];
  wfhSecurityItems.forEach((item, index) => {
    w.ensureSpace(w.lineHeight * 3);
    w.drawWrappedText(`${index + 1}. ${item}`, w.leftMargin + 5, w.bodySize);
    w.bumpY(w.lineHeight * 0.5);
  });
  w.bumpY(w.paragraphSpacing * 0.5);

  w.ensureSpace(w.lineHeight * 6);
  w.drawFullWidthSectionHeading("F. Data Protection & IT Security");
  w.bumpY(w.lineHeight);
  drawParagraphs(w, [
    "The Intern agrees to comply with all Company data protection and information security requirements and undertakes that he/she shall:",
  ], 5);
  const dataProtectionItems = [
    "Use Company data, systems, and resources strictly for assigned internship duties and authorized business purposes only.",
    "Not download, copy, store, transfer, or retain confidential or proprietary data on personal devices, external drives, cloud storage platforms, or unauthorized applications without prior written approval of the Company.",
    "Not share, disclose, or permit access to Company login credentials, passwords, system access, or authentication information with any unauthorized person.",
    "Not record virtual meetings, capture screenshots, screen recordings, internal communications, or Company platforms without explicit authorization from the Company.",
    "Maintain reasonable cybersecurity practices, including safeguarding devices from malware, unauthorized access, or misuse.",
    "Immediately report any suspected data breach, unauthorized access, system compromise, accidental disclosure, or security vulnerability to the Company.",
    "Upon completion or termination of the internship, delete, return, or surrender all Company information, access credentials, and stored data as directed by the Company.",
  ];
  dataProtectionItems.forEach((item, index) => {
    w.ensureSpace(w.lineHeight * 3);
    w.drawWrappedText(`${index + 1}. ${item}`, w.leftMargin + 5, w.bodySize);
    w.bumpY(w.lineHeight * 0.5);
  });
  w.bumpY(w.paragraphSpacing * 0.5);

  w.ensureSpace(w.lineHeight * 6);
  w.drawFullWidthSectionHeading("G. Non-Misuse of Company Information");
  w.bumpY(w.lineHeight);
  drawParagraphs(w, ["The Intern agrees that he/she shall not:"], 5);
  const misuseItems = [
    "Use Company knowledge, confidential information, or internal processes to establish, assist, or participate in any competing business activity.",
    "Directly or indirectly contact, solicit, or engage Company clients, vendors, partners, or leads for personal benefit or external employment.",
    "Share Company methodologies, operational systems, contacts, trade practices, or internal business knowledge with external individuals or organizations.",
    "Represent Company work, data, or achievements as personal work without authorization.",
  ];
  misuseItems.forEach((item, index) => {
    w.ensureSpace(w.lineHeight * 3);
    w.drawWrappedText(`${index + 1}. ${item}`, w.leftMargin + 5, w.bodySize);
    w.bumpY(w.lineHeight * 0.5);
  });
  w.bumpY(w.paragraphSpacing * 0.5);

  drawSection(w, "H. Non-Disclosure Period", [
    "The Intern shall maintain confidentiality of all Confidential Information accessed during the internship.",
    "Such confidentiality obligations shall apply throughout the internship period and shall cover all information obtained during engagement with the Company.",
  ], true);

  w.ensureSpace(w.lineHeight * 6);
  w.drawFullWidthSectionHeading("I. Return of Company Property");
  w.bumpY(w.lineHeight);
  drawParagraphs(
    w,
    ["Upon completion, resignation, or termination of internship, the Intern shall:"],
    5
  );
  const returnItems = [
    "Immediately return all Company documents, files, records, materials, identification credentials, and access details.",
    "Permanently delete all Company data, communications, files, and backups stored on personal devices, storage systems, or email accounts.",
    "Cease all access to Company systems, software, platforms, and internal communication channels.",
    "Provide confirmation, if required by the Company, that all Company information has been returned or deleted.",
  ];
  returnItems.forEach((item, index) => {
    w.ensureSpace(w.lineHeight * 3);
    w.drawWrappedText(`${index + 1}. ${item}`, w.leftMargin + 5, w.bodySize);
    w.bumpY(w.lineHeight * 0.5);
  });
  w.bumpY(w.paragraphSpacing * 0.5);

  drawSection(w, "J. Breach of Agreement", [
    "Any violation of this Agreement shall constitute a material breach.",
    "The Company shall have the right to immediately terminate the internship without notice in case of breach.",
    "The Company may initiate legal proceedings or claim compensation for any loss, damage, or harm caused due to unauthorized disclosure or misuse of Confidential Information.",
    "The Intern acknowledges that breach of confidentiality may cause irreparable harm to the Company for which legal remedies may be pursued.",
  ], true);

  drawSection(w, "K. Governing Law & Jurisdiction", [
    "This Agreement shall be governed by and construed in accordance with the laws of India.",
    `Any dispute arising out of or in connection with this Agreement shall be subject to the exclusive jurisdiction of the competent courts located in ${p.jurisdictionCity}.`,
  ], true);

  w.bumpY(w.paragraphSpacing * 2);
}
