import Employees from "@/models/employee";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try{
    const emp =await Employees.find({ role: "Sales" ,isActive: true}).exec();
    console.log(emp);
    return NextResponse.json({emp},{status: 200});
  }
  catch(err){
    return NextResponse.json({error: err},{status: 500});
    console.log(err);
  }
}