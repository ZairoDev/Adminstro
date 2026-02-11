import { NextRequest } from "next/server";
import { jwtVerify } from "jose";

export const getDataFromToken = async (request: NextRequest) => {
  try {
    const secret = new TextEncoder().encode(process.env.TOKEN_SECRET || "");
    const token = request.cookies.get("token")?.value || "";

    if (!token) {
      throw new Error("Token Expired");
    }

    const { payload } = await jwtVerify(token, secret);
    return payload;
  } catch (error: any) {
    console.log("Token verification error: ", error?.message);
    throw new Error("Token Expired");
  }
};
