// Get sender / HR employee for email signature
import { connectDb } from "@/util/db";
import Employees from "@/models/employee";
import { EmailSignatureConfig } from "./signature";
import { EmployeeInterface } from "@/util/type";

export interface HREmployee {
  name: string;
  email?: string;
  phone?: string;
}

/** Shared signature contact details (not the personal inbox of the sender). */
export const HR_SIGNATURE_EMAIL = "hr@zairointl.com";
export const HR_SIGNATURE_PHONE = "+919519803665";

function titleFromEmployee(employee: {
  jobTitle?: string | null;
  role?: string | string[] | null;
}): string {
  const jobTitle = employee.jobTitle?.trim();
  if (jobTitle) return jobTitle;

  const roles = Array.isArray(employee.role)
    ? employee.role
    : employee.role
      ? [employee.role]
      : [];

  if (roles.some((role) => String(role).toLowerCase() === "superadmin")) {
    return "Super Admin";
  }
  if (roles.some((role) => String(role) === "HR")) {
    return "HR Manager";
  }
  return "HR Manager";
}

function signatureFromEmployee(
  employee: Pick<EmployeeInterface, "name" | "jobTitle" | "role">
): EmailSignatureConfig {
  return {
    name: employee.name,
    title: titleFromEmployee(employee),
    email: HR_SIGNATURE_EMAIL,
    phone: HR_SIGNATURE_PHONE,
  };
}

const FALLBACK_SIGNATURE: EmailSignatureConfig = {
  name: "Zairo International",
  title: "HR Manager",
  email: HR_SIGNATURE_EMAIL,
  phone: HR_SIGNATURE_PHONE,
};

/**
 * Build signature for outbound HR mail.
 * Prefer the logged-in sender (HR / SuperAdmin) when `senderId` is provided.
 * Falls back to any active HR, then company defaults.
 */
export async function getActiveHREmployee(
  senderId?: string | null
): Promise<EmailSignatureConfig> {
  try {
    await connectDb();

    if (senderId === "test-superadmin") {
      return {
        name: "Super Admin",
        title: "Super Admin",
        email: HR_SIGNATURE_EMAIL,
        phone: HR_SIGNATURE_PHONE,
      };
    }

    if (senderId) {
      const sender = (await Employees.findById(senderId)
        .select("name jobTitle role")
        .lean()) as EmployeeInterface | null;

      if (sender?.name) {
        return signatureFromEmployee(sender);
      }
    }

    const hrEmployee = (await Employees.findOne({
      role: "HR",
      isActive: true,
    })
      .select("name jobTitle role")
      .lean()) as EmployeeInterface | null;

    if (hrEmployee?.name) {
      return signatureFromEmployee(hrEmployee);
    }

    return FALLBACK_SIGNATURE;
  } catch (error) {
    console.error("Error fetching HR employee:", error);
    return FALLBACK_SIGNATURE;
  }
}
