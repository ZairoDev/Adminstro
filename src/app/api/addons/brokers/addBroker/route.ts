import Users from "@/models/user";
import { connectDb } from "@/util/db";
import { NextRequest, NextResponse } from "next/server";
import bcryptjs from "bcryptjs";
import crypto from "crypto";

export const dynamic = "force-dynamic";

const generateRandomPassword = (length: number): string => {
  return crypto.randomBytes(length).toString("hex").slice(0, length);
};

export async function POST(req: NextRequest) {
  try {
    await connectDb();
    const brokerData = await req.json();

    // Format phone number (remove non-digits)
    const phoneNumber = brokerData.phone.replace(/\D/g, "");

    // Check if broker with same email already exists (if email provided)
    if (brokerData.email) {
      const existingBroker = await Users.findOne({
        email: brokerData.email,
        role: "Broker",
      });
      if (existingBroker) {
        return NextResponse.json(
          { error: "Broker with this email already exists" },
          { status: 400 }
        );
      }
    }

    // Check if broker with same phone already exists
    const existingBrokerByPhone = await Users.findOne({
      phone: phoneNumber,
      role: "Broker",
    });
    if (existingBrokerByPhone) {
      return NextResponse.json(
        { error: "Broker with this phone number already exists" },
        { status: 400 }
      );
    }

    // Generate random password and hash it
    const plainPassword = generateRandomPassword(8);
    const salt = await bcryptjs.genSalt(10);
    const hashedPassword = await bcryptjs.hash(plainPassword, salt);

    const broker = await Users.create({
      name: brokerData.name,
      email: brokerData.email || "",
      phone: phoneNumber,
      role: "Broker",
      password: hashedPassword,
      isVerified: brokerData.isVerified ?? true,
    });

    return NextResponse.json(
      { 
        message: "Broker created successfully", 
        data: broker,
        password: plainPassword, // Return plain password for reference
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.log("error in creating broker: ", err);
    return NextResponse.json(
      { error: err.message || "Unable to create broker" },
      { status: 401 }
    );
  }
}

