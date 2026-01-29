import Employees from "@/models/employee";
import { NextResponse } from "next/server";
import { excludeTestAccountFromQuery } from "@/util/employeeConstants";

export async function GET(req: Request) {
  try{
    const query = excludeTestAccountFromQuery({ role: "Sales", isActive: true });
    const emp = await Employees.find(query).exec();
    // console.log(emp);
    return NextResponse.json({emp},{status: 200});
  }
  catch(err){
    return NextResponse.json({error: err},{status: 500});
    console.log(err);
  }
}