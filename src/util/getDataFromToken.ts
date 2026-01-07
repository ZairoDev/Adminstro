import { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { redirect } from "next/navigation";

export class SessionExpiredError extends Error {
  code = "SESSION_EXPIRED";
  constructor(message: string = "Session expired at 11:00 PM IST. Please log in again.") {
    super(message);
    this.name = "SessionExpiredError";
  }
}

export const getDataFromToken = async (request: NextRequest) => {
  try {
    const secret = new TextEncoder().encode(process.env.TOKEN_SECRET);
    const token = request.cookies.get("token")?.value || "";
    
    if (!token) {
      throw new SessionExpiredError("No token found");
    }
    
    const { payload } = await jwtVerify(token, secret);
    return payload;
  } catch (error: any) {
    console.log("Token verification error: ", error);
    
    // Check if token is expired
    if (error.code === "ERR_JWT_EXPIRED" || error.name === "JWTExpired") {
      throw new SessionExpiredError("Session expired at 11:00 PM IST. Please log in again.");
    }
    
    // For other JWT errors, also treat as expired/invalid
    throw new SessionExpiredError("Invalid or expired session. Please log in again.");
  }
};
