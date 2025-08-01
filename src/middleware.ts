import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { getDataFromToken } from "./util/getDataFromToken";

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
    "/",
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
    "/",
    "/admin",
    "/dashboard",
    "/dashboard/createquery",
    /^\/dashboard\/createquery\/.*$/,
    /^\/dashboard\/user$/,
    /^\/dashboard\/edituserdetails$/,
    /^\/dashboard\/property$/,
    /^\/dashboard\/property\/edit\/.*$/,
    /^\/dashboard\/createnewuser$/,
    /^\/dashboard\/add-listing\/.*$/,
    /^\/dashboard\/edituserdetails\/.*$/,
    /^\/dashboard\/newproperty/,
    /^\/dashboard\/newproperty\/.*$/,
    /^\/dashboard\/newproperty\/editPortionAvailability\/.*$/,
  ],
  LeadGen: ["/", "/dashboard/createquery", /^\/dashboard\/createquery\/.*$/],
  "LeadGen-TeamLead": [
    "/",
    "/dashboard",
    "/dashboard/createquery",
    /^\/dashboard\/createquery\/.*$/,
    "/dashboard/agent-data",
    // /^\/dashboard\/employee\/.*$/,
    "/dashboard/employee",
    /^\/dashboard\/lead-location-group\/.*$/,
    /^\/dashboard\/lead-agent-group\/.*$/,
  ],
  Content: [
    "/",
    /^\/dashboard\/createblog$/,
    /^\/dashboard\/remainingproperties\/description\/.*$/,
    /^\/dashboard\/remainingproperties$/,
    /^\/dashboard\/completedproperties$/,
    /^\/dashboard\/property\/description\/.*$/,
    /^\/dashboard\/allblogs$/,
    /^\/dashboard\/allblogs\/.*$/,
  ],
  Sales: [
    "/",
    "/dashboard",
    "/dashboard/rejectedleads",
    /^\/dashboard\/createquery\/.*$/,
    /^\/dashboard\/room\/.*$/,
    "/dashboard/visits",
    "/dashboard/rolebaseLead",
    "/dashboard/goodtogoleads",
    "/dashboard/declinedleads",
    "/dashboard/reminders",
    "/dashboard/catalogue",
    "/dashboard/newproperty/filteredProperties",
  ],
  "Sales-TeamLead": [
    "/",
    "/dashboard/rejectedleads",
    /^\/dashboard\/createquery\/.*$/,
    /^\/dashboard\/room\/.*$/,
    "/dashboard/visits",
    "/dashboard/rolebaseLead",
    "/dashboard/goodtogoleads",
    "/dashboard/declinedleads",
    "/dashboard/reminders",
    "/dashboard/goodtogo",
    "/dashboard/catalogue",
    "/dashboard/newproperty/filteredProperties",
  ],
  HR: [
    "/",
    "/dashboard/employee",
    /^\/dashboard\/employee\/.*$/,
    // /^\/dashboard\/editemployeedetails\/.*$/,
    /^\/dashboard\/employeedetails\/.*$/,
    "/dashboard/createnewEmployee",
    /^\/dashboard\/editemployeedetails\/.*$/,
  ],
  Agent: ["/", "/dashboard/sales-offer"],
  Guest: [
    "/dashboard/guest-window",
    "/dashboard/owners",
    "/dashboard/owners/owner-list",
    "/dashboard/sales-offer",
  ],
  Intern: [
    "/dashboard/owners",
    "/dashboard/owners/owner-list",
    "/dashboard/sales-offer",
  ],
  "Subscription-Sales": [
    "/",
    "/dashboard/sales-offer",
    /^\/dashboard\/sales-offer\/.*$/,
  ],
};
export const defaultRoutes: { [key: string]: string } = {
  SuperAdmin: "/dashboard",
  Admin: "/dashboard/user",
  LeadGen: "/dashboard/createquery",
  "LeadGen-TeamLead": "/dashboard",
  Content: "/dashboard/remainingproperties",
  Advert: "/dashboard/user",
  Sales: "/dashboard/rolebaseLead",
  "Sales-TeamLead": "/dashboard/rolebaseLead",
  HR: "/dashboard/employee",
  Agent: "/dashboard/sales-offer",
  Guest: "/dashboard/guest-window",
  Intern: "/dashboard/owners",
  "Subscription-Sales": "/dashboard/sales-offer",
  Default: "/dashboard",
};
const publicRoutes = [
  "/",
  "/login",
  "/dashboard/candidatePortal",
  "/login/verify-otp",
  /^\/login\/verify-otp\/.+$/,
  "/norole",
  "/dashboard/room/*",
];
export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const token = request.cookies.get("token")?.value || "";
  // console.log("token", token);

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
        if (path !== "/norole") {
          return NextResponse.redirect(new URL("/norole", request.url));
        }
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
      // console.error("Error getting role from token:", error, error.message);
      if (error.message === "Token Expired") {
        const response = NextResponse.redirect(new URL("/login", request.url));
        response.cookies.delete("token");
        return response;
        // return NextResponse.redirect(new URL("/norole", request.url));
      }
      return NextResponse.redirect(new URL("/login", request.url));
    }
  } else if (!isPublicRoute) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|dashboard/room/).*)",
  ],
};
