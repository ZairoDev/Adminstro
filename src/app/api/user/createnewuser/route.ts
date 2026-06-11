import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { connectDb } from "@/util/db";
import Users from "@/models/user";
import bcryptjs from "bcryptjs";
import { sendEmail } from "@/util/mailer";
import {
  emptyBankDetails,
  shortTermOwnerUserSchema,
  userSchema,
} from "@/schemas/user.schema";
import crypto from "crypto";
import { getDataFromToken } from "@/util/getDataFromToken";
import { unregisteredOwnerShortTerm } from "@/models/unregisteredOwnerShortTerm";

const generateRandomPassword = (length: number): string => {
  return crypto.randomBytes(length).toString("hex").slice(0, length);
};
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    await connectDb();

    const reqBody = await request.json();
    const shortTermOwner = Boolean(reqBody.shortTermOwner);
    const parsedBody = shortTermOwner
      ? shortTermOwnerUserSchema.parse(reqBody)
      : userSchema.parse(reqBody);

    // Detect if creator is HAdmin
    let creatorRole: string | null = null;
    try {
      const payload: any = await getDataFromToken(request).catch(() => null);
      creatorRole = payload?.role || null;
    } catch (e) {
      // ignore
    }

    const {
      name,
      email,
      role,
      sendDetails,
      phone,
      gender,
      nationality,
      spokenLanguage,
      bankDetails,
      address,
      profilePic,
    } = parsedBody;

    const phoneArray = phone.toString().split(" ");
    const phoneNumber = `${phoneArray[0]} ${phoneArray.slice(1).join("")}`;

    const query: Record<string, any> = {};
    if (email && email !== "") {
      query.email = email;
    } else if (phone) {
      query.phone = phoneNumber;
    }

    const existingUser = await Users.findOne(query);
    if (existingUser) {
      return NextResponse.json(
        { error: "User already exists" },
        { status: 400 }
      );
    }
    const plainPassword = generateRandomPassword(8);
    const salt = await bcryptjs.genSalt(10);
    const hashedPassword = await bcryptjs.hash(plainPassword, salt);

    const newUser = new Users({
      name,
      email,
      password: hashedPassword,
      role,
      phone: phoneNumber.replace(/\D/g, ""),
      gender,
      nationality: nationality || "",
      spokenLanguage,
      address: address || "",
      profilePic,
      bankDetails:
        role === "Owner"
          ? { ...emptyBankDetails }
          : typeof bankDetails === "string" && bankDetails.trim()
            ? {
                accountHolderName: bankDetails.trim(),
                iban: "",
                bankName: "",
                swiftBic: "",
              }
            : { ...emptyBankDetails },
      isProfileComplete: false,
      ownerProfileCompletedAt: null,
      ...(creatorRole === "HAdmin" ? { origin: "holidaysera" } : {}),
    });
    const savedUser = await newUser.save();

    if (role === "Owner") {
      const emailNorm = String(email ?? "").trim();
      const phoneNorm = phoneNumber.replace(/\D/g, "");
      const pendingFilter = {
        advertListingStatus: "pending" as const,
        $or: [{ ownerUserId: "" }, { ownerUserId: { $exists: false } }],
      };

      if (emailNorm) {
        await unregisteredOwnerShortTerm.updateMany(
          {
            ...pendingFilter,
            email: {
              $regex: new RegExp(
                `^${emailNorm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
                "i",
              ),
            },
          },
          {
            $set: {
              ownerUserId: savedUser._id.toString(),
              email: emailNorm,
            },
          },
        );
      }

      if (phoneNorm.length >= 8) {
        const pendingRows = await unregisteredOwnerShortTerm
          .find(pendingFilter)
          .select("_id phoneNumber ownerUserId")
          .lean();
        const match = pendingRows.find(
          (row) =>
            String((row as { phoneNumber?: string }).phoneNumber ?? "").replace(
              /\D/g,
              "",
            ) === phoneNorm,
        );
        if (match) {
          await unregisteredOwnerShortTerm.findByIdAndUpdate(match._id, {
            ownerUserId: savedUser._id.toString(),
            ...(emailNorm ? { email: emailNorm } : {}),
          });
        }
      }
    }

    if (sendDetails && email) {
      await sendEmail({
        email,
        emailType: "VERIFY",
        userId: savedUser._id.toString(),
        password: plainPassword,
      });
    }
    return NextResponse.json({
      message: "User created successfully.",
      success: true,
      password: plainPassword,
      userId: savedUser._id.toString(),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error("Error while creating user:", error);
    return NextResponse.json(
      { error: "Error while creating user" },
      { status: 500 }
    );
  }
}
