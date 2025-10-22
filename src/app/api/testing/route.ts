import { NextResponse } from "next/server";
import { connectDb } from "@/util/db";
import { Properties } from "@/models/property";
import Users from "@/models/user";

export async function GET() {
  try {
    await connectDb();

    // 1. Find all long-term properties
    const properties = await Properties.find({
      rentalType: "Short Term",
    }).lean();

    // 2. Group VSIDs by userId
    const vsidsByUser: Record<string, string[]> = {};
    properties.forEach((prop) => {
      const userId = prop.userId?.toString();
      if (!userId) return;
      if (!vsidsByUser[userId]) vsidsByUser[userId] = [];
      vsidsByUser[userId].push(prop.VSID);
    });

    // 3. Fetch all users
    const users = await Users.find().select("name email phone").lean();

    // 4. Filter users with phone = "0", 0, or empty string AND who have VSIDs
    const filteredUsers = users.filter((user: any) => {
      const hasNoPhone = ["0", "", 0].includes(user.phone);
      const hasVSIDs = vsidsByUser[user._id.toString()]?.length > 0;
      return hasNoPhone && hasVSIDs;
    });

    // 5. Attach VSIDs to each filtered user
    const result = filteredUsers.map((user: any) => ({
      name: user.name,
      email: user.email,
      phone: user.phone,
      vsids: vsidsByUser[user._id.toString()] || [],
    }));

    console.log("Total filtered users:", result.length);

    return NextResponse.json({ result, resultLength: result.length });
  } catch (error) {
    console.error("Error fetching long-term users:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
