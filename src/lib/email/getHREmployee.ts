// Get Active HR Employee for Email Signature
import { connectDb } from "@/util/db";
import Employees from "@/models/employee";
import { EmailSignatureConfig } from "./signature";
import { EmployeeInterface } from "@/util/type";

export interface HREmployee {
  name: string;
  email?: string;
  phone?: string;
}

export async function getActiveHREmployee(): Promise<EmailSignatureConfig> {
  try {
    await connectDb();
    const hrEmployee = await Employees.findOne({
      role: "HR",
      isActive: true,
    })
      .select("name email phone")
      .lean() as EmployeeInterface | null;

    if (hrEmployee) {
      return {
        name: hrEmployee.name,
        title: "HR Manager",
        email: "hr@zairointernational.com",
        phone:  "+919519803665",
      };
    }

    // Fallback if no active HR found
    return {
      name: "Zaid Hashmat",
      title: "HR Manager",
      email: "hr@zairointernational.com",
      phone: "+919519803665",
    };
  } catch (error) {
    console.error("Error fetching HR employee:", error);
    // Return fallback on error
    return {
      name: "Zaid Hashmat",
      title: "HR Manager",
      email: "hr@zairointernational.com",
      phone: "+919519803665",
    };
  }
}

