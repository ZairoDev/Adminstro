import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { Properties } from "@/models/property";
import Users from "@/models/user";
import { connectDb } from "@/util/db"; // Adjust the path to your DB connection

/**
 * POST endpoint to get owner details and all their properties
 * @route POST /api/owner-properties
 * @body { propertyId?: string, userId?: string }
 * @returns { owner: UserSchema, properties: PropertySchema[] }
 */
export async function POST(req: NextRequest) {
  try {
    await connectDb();

    const body = await req.json();

    const { propertyId, userId } = body;
    // console.log("userId: ", userId);
    // Validate input - either propertyId or userId must be provided
    if (!propertyId && !userId) {
      return NextResponse.json(
        { 
          success: false, 
          message: "Either propertyId or userId must be provided" 
        },
        { status: 400 }
      );
    }

    let ownerUserId = userId;

    // If propertyId is provided, first get the userId from that property
    if (propertyId && !userId) {
      const property = await Properties.findById(propertyId).select("userId");
      
      if (!property) {
        return NextResponse.json(
          { 
            success: false, 
            message: "Property not found" 
          },
          { status: 404 }
        );
      }
      
      ownerUserId = property.userId;
    }

    // Convert userId string to ObjectId for aggregation
    const userObjectId = new mongoose.Types.ObjectId(ownerUserId);

    // Use aggregation to get owner details and all their properties
    const result = await Users.aggregate([
      // Match the specific user
      {
        $match: {
          _id: userObjectId
        }
      },
      // Lookup to get all properties belonging to this user
      // Note: Properties store userId as String, but Users._id is ObjectId
      // So we need to convert _id to string for the comparison
      {
        $lookup: {
          from: "properties", // Collection name in MongoDB (usually lowercase plural)
          let: { userIdStr: { $toString: "$_id" } }, // Convert ObjectId to String
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$userId", "$$userIdStr"] } // Compare string userId with converted string _id
              }
            }
          ],
          as: "properties"
        }
      },
      // Project to exclude sensitive information
      {
        $project: {
          password: 0,
          forgotPasswordToken: 0,
          forgotPasswordTokenExpiry: 0,
          verifyToken: 0,
          verifyTokenExpiry: 0,
          otpToken: 0,
          otpTokenExpiry: 0,
          "properties.lastUpdatedBy": 0, // Optional: exclude if needed
          "properties.lastUpdates": 0,   // Optional: exclude if needed
        }
      }
    ]);

    // Check if user exists
    if (!result || result.length === 0) {
      return NextResponse.json(
        { 
          success: false, 
          message: "Owner not found" 
        },
        { status: 404 }
      );
    }

    const ownerData = result[0];

    return NextResponse.json(
      {
        success: true,
        data: {
          owner: {
            _id: ownerData._id,
            name: ownerData.name,
            email: ownerData.email,
            profilePic: ownerData.profilePic,
            nationality: ownerData.nationality,
            gender: ownerData.gender,
            spokenLanguage: ownerData.spokenLanguage,
            phone: ownerData.phone,
            address: ownerData.address,
            role: ownerData.role,
            isVerified: ownerData.isVerified,
            createdAt: ownerData.createdAt,
            updatedAt: ownerData.updatedAt,
          },
          properties: ownerData.properties,
          totalProperties: ownerData.properties.length,
        }
      },
      { status: 200 }
    );

  } catch (error) {
    console.error("Error fetching owner and properties:", error);
    return NextResponse.json(
      { 
        success: false, 
        message: "Internal server error",
        error: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
