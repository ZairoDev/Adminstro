import { NextRequest } from "next/server";
import { getDataFromToken } from "./getDataFromToken";

export const useRole = async (req: NextRequest) => {
  const token = await getDataFromToken(req);
  console.log("token: ", token);
};
