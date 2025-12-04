// /components/candidateEmail.tsx
// This file re-exports from the new organized email library for backward compatibility

export {
  sendEmail,
  sendCandidateEmail,
  getEmailTemplate,
  getCandidateEmailTemplate,
} from "@/lib/email";

export type { EmailPayload, CandidateEmailPayload } from "@/lib/email";
