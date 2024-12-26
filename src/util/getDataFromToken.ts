import { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { redirect } from "next/navigation";

export const getDataFromToken = async (request: NextRequest) => {
  try {
    const secret = new TextEncoder().encode(process.env.TOKEN_SECRET);
    const token = request.cookies.get("token")?.value || "";
    const { payload } = await jwtVerify(token, secret);
    return payload;
  } catch (error: any) {
    console.log("errrrrror: ", error);
    if (error instanceof Error) {
      if ((error.name = "JWTExpired")) redirect("/norole");
    }
    throw new Error("Token Expired");
  }
};
