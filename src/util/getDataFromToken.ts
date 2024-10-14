import { NextRequest } from "next/server";
import jwt from "jsonwebtoken";
import { jwtVerify } from "jose";

export const getDataFromToken = async (request: NextRequest) => {
  try {
    const secret = new TextEncoder().encode(process.env.TOKEN_SECRET);
    const token = request.cookies.get("token")?.value || "";
    const { payload } = await jwtVerify(token, secret);
    console.log(payload);
    return payload;
  } catch (error: any) {
    throw new Error(error.message);
  }
};
