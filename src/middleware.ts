import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getDataFromToken } from "./util/getDataFromToken";
interface tokenInterface {
  role: string;
  email: string;
  name: string;
  id: string;
  iat: number;
  exp: number;
}
// Define the role-based access control
const roleAccess: { [key: string]: (string | RegExp)[] } = {
  SuperAdmin: [
    "/",
    "/admin",
    "/superadmin",
    "/dashboard",
    /^\/dashboard\/.*$/,
    /^\/property\/.*$/,
  ],
  Admin: [
    "/admin",
    "/dashboard",
    /^\/dashboard\/user$/,
    /^\/dashboard\/edituserdetails$/,
    /^\/dashboard\/property$/,
    /^\/dashboard\/property\/edit\/.*$/,
    /^\/dashboard\/createnewuser$/,
    /^\/dashboard\/add-listing\/.*$/,
    /^\/dashboard\/edituserdetails\/.*$/,
  ],
  Advert: [
    "/admin",
    "/dashboard",
    /^\/dashboard\/user$/,
    /^\/dashboard\/edituserdetails$/,
    /^\/dashboard\/property$/,
    /^\/dashboard\/property\/edit\/.*$/,
    /^\/dashboard\/createnewuser$/,
    /^\/dashboard\/add-listing\/.*$/,
    /^\/dashboard\/edituserdetails\/.*$/,
  ],
  Content: [
    // "/dashboard/property",
    /^\/dashboard\/createblog$/,
    /^\/dashboard\/remainingproperties\/description\/.*$/,
    /^\/dashboard\/remainingproperties$/,
    /^\/dashboard\/completedproperties$/,
    /^\/dashboard\/property\/description\/.*$/,
    /^\/dashboard\/allblogs$/,
    /^\/dashboard\/allblogs\/.*$/,
  ],
};
const defaultRoutes: { [key: string]: string } = {
  SuperAdmin: "/dashboard/employee",
  Admin: "/dashboard/user",
  Content: "/dashboard/remainingproperties",
  Advert: "/dashboard/user",
};

const publicRoutes = [
  "/login",
  "/login/verify-otp",
  /^\/login\/verify-otp\/.+$/,
  "/norole",
];

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const token = request.cookies.get("token")?.value || "";

  const matchesRolePattern = (role: string, path: string): boolean => {
    const patterns = roleAccess[role] || [];
    return patterns.some((pattern) =>
      typeof pattern === "string" ? path === pattern : pattern.test(path)
    );
  };

  const isPublicRoute = publicRoutes.some((pattern) =>
    typeof pattern === "string" ? path === pattern : pattern.test(path)
  );

  if (token) {
    try {
      const obj: any = await getDataFromToken(request);
      const role = obj?.role as string;

      if (path === "/login") {
        return NextResponse.redirect(
          new URL(defaultRoutes[role] || "/", request.url)
        );
      }

      if (!role || role.trim() === "") {
        // Redirect to /norole if not already there
        if (path !== "/norole") {
          return NextResponse.redirect(new URL("/norole", request.url));
        }
        // If already on /norole, allow access
        return NextResponse.next();
      }

      if (!role || !matchesRolePattern(role, path)) {
        const referer = request.headers.get("referer");
        const previousUrl = referer ? new URL(referer) : null;

        if (previousUrl && matchesRolePattern(role, previousUrl.pathname)) {
          return NextResponse.redirect(previousUrl);
        } else {
          return NextResponse.redirect(
            new URL(defaultRoutes[role] || "/", request.url)
          );
        }
      }
    } catch (error: any) {
      console.error("Error getting role from token:", error);
      if (error.response.error === "Token Expired") {
        return NextResponse.redirect(new URL("/norole", request.url));
      }
      return NextResponse.redirect(new URL("/login", request.url));
    }
  } else if (!isPublicRoute) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
