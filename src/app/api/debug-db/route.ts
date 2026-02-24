import mongoose from "mongoose";
import Employees from "@/models/employee";

export async function GET() {
  try {
    return Response.json({
      mongooseType: typeof mongoose,
      mongooseKeys: Object.keys(mongoose),
      hasConnect: typeof mongoose.connect,
      employeeType: typeof Employees,
      employeeKeys: Object.keys(Employees || {}),
      hasFindById: typeof Employees?.findById,
    });
  } catch (e: any) {
    return Response.json({ error: e.message });
  }
}
