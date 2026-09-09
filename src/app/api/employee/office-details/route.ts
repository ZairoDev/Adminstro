import { NextRequest, NextResponse } from "next/server";

import Employees from "@/models/employee";
import OfficeAddress from "@/models/officeAddress";
import {connectDb} from "@/util/db";
import { getDataFromToken } from "@/util/getDataFromToken";
import { officeDetailsSchema } from "@/schemas/officeDetails.schema";

export const dynamic = "force-dynamic";

function ensureHrOrSuperAdmin(role: unknown) {
    const r = String(role || "");
    if(r !== "hr" && r !== "SuperAdmin") {
        return NextResponse.json({
            error: "Unauthorised. Only HRs and SuperAdmins can manage office details"
        },{status:403});
    }

    return null;
}

function getDuplicateKeyField(error:unknown): string | null {
    if(!error || typeof error !== "object") return null;

    const err = error as { code?: number; keyPattern?: Record<string, unknown> };
    if(err.code !== 11000) return null;
    return Object.keys(err.keyPattern ?? {})[0] ?? null;
}


export async function GET(request: NextRequest){
    try{
        const token = await getDataFromToken(request);
        const deny= ensureHrOrSuperAdmin((token as {role?: string}).role);
        if(deny) return deny;

        await connectDb();
        const employeeId = request.nextUrl.searchParams.get("employeeId") || "";
        if(!employeeId) {
            return NextResponse.json({error: "Employee Id is required"},{status:400});
        }

        const employee = await Employees.findById(employeeId).select("_id name officeDetails")
        .populate("officeDetails.officeAddressId", "name")
        .lean() as {
            officeDetails?: {
                officeAddressId?: {
                    name?: string;
                } | null;
                assignedEmail?: string | null;
                assignedNumber?: string | null;
            } | null;
        } | null;
        
        if(!employee) {
            return NextResponse.json({error: "Employee not found"}, {status:404});
        }

        return NextResponse.json({
            success:true,
            officeDetails: employee.officeDetails ?? null,
        },{status:200});


    }
    catch(error: unknown){ 
        const err = error as { status?:number; code?:string; message?:string };
        if(err?.status === 401 || err?.code) {
            return NextResponse.json({code: err?.code, message: err?.message}, {status: err?.status ?? 500});
        }

        console.error("office-details GET error:", err?.message);
        return NextResponse.json({error: "Failed to load office Details"}, {status:500});
    }

}

export async function PUT(request:NextRequest){
    try{
        const token = await getDataFromToken(request);
        const deny= ensureHrOrSuperAdmin((token as {role?: string}).role);

        if(deny) return deny;

        await connectDb();

        const body = await request.json();

        const parsed= officeDetailsSchema.safeParse(body);
        if(!parsed.success){
            return NextResponse.json({success:false, error:parsed.error.issues[0].message}, {status:400});
        }

        const {employeeId, officeAddressId, assignedEmail, assignedNumber} = parsed.data;

        if(officeAddressId){
            const office = await OfficeAddress.findById(officeAddressId).select("_id");
            if(!office){
                return NextResponse.json({error: "Selected office address is not found"}, {status:404});
            }
        }
        // this way of updating the details do not handle the unique indexing of the assigned number and the assigned email details and give an error of a generic 500
        // const updated = await Employees.findByIdAndUpdate(
        //     employeeId,
        //     {$set: {officeDetails: {officeAddressId, assignedEmail, assignedNumber}}},
        //     {new:true}
        // ).select("_id name officeDetails")
        // .populate("officeDetails.officeAddressId", "name");

        let updated;
        try {
            updated= await Employees.findByIdAndUpdate(
                employeeId,
                {$set: {officeDetails: {officeAddressId, assignedEmail, assignedNumber}}},
                {new:true}
            ).select("_id name officeDetails")
            .populate("officeDetails.officeAddressId", "name");
        } catch (updateError:unknown) {
            const duplicateField = getDuplicateKeyField(updateError);
            if(duplicateField){
                return NextResponse.json({
                    error:
                     duplicateField === "officeDetails.assignedNumber" ? "Assigned number already exists" : "Assigned email already exists"
                }, {status:409});
                // 409 is the conflict state : request is well formed but collides with the existing state
            }
            
        }

        if(!updated){
            return NextResponse.json({error:"Employee not found"}, {status:404});
        }

        return NextResponse.json({success:true, officeDetails:updated.officeDetails });
    }catch(error:unknown){
        const err = error as { status?:number; code?: string; message?:string};

        if(err?.status === 401 || err?.code){
            return NextResponse.json({code: err?.code || "Auth failed" }, {status: err?.status ?? 401});;
        }

        console.error("office-details PUT error:", err?.message);
        return NextResponse.json({error:"Failed to update the office details"}, {status:500});
    }
}