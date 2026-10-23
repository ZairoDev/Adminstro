import mongoose from "mongoose";
import Employee from "@/models/employee";

export interface ActiveInterviewer {
  id: string;
  name: string;
  email: string;
}

export async function loadActiveInterviewer(
  employeeId: string
): Promise<{ ok: true; interviewer: ActiveInterviewer } | { ok: false; error: string }> {
  if (!mongoose.Types.ObjectId.isValid(employeeId)) {
    return { ok: false, error: "Interviewer is required" };
  }

  const employee = await Employee.findById(employeeId).select("name email isActive");
  const name = typeof employee?.name === "string" ? employee.name.trim() : "";
  const email = typeof employee?.email === "string" ? employee.email.trim() : "";
  if (!employee || employee.isActive === false || !name || !email) {
    return { ok: false, error: "Select an active interviewer with an email" };
  }

  return {
    ok: true,
    interviewer: { id: String(employee._id), name, email },
  };
}
