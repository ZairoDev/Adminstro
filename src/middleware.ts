import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { getDataFromToken } from "./util/getDataFromToken";

const roleAccess: { [key: string]: (string | RegExp)[] } = {
  SuperAdmin: [
    "/",
    "/admin",
    "/superadmin",
    "/application-form",
    "/spreadsheet",
    "/dashboard",
    /^\/dashboard\/recommendations\/.*$/,
    /^\/dashboard\/.*$/,
    /^\/property\/.*$/,
  ],
  Admin: [
    "/",
    "/admin",
    "/dashboard",
    "/spreadsheet",
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
    "/dashboard/addons",
    "/dashboard/createquery",
    "/spreadsheet",
    "/dashboard/invoice/list",
    /^\/dashboard\/invoice\/list\/.*$/,
    "/dashboard/invoice",
    /^\/dashboard\/invoice\/create\/.*$/,

    /^\/dashboard\/createquery\/.*$/,
    /^\/dashboard\/userdetails\/.*$/,
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
  LeadGen: [
    "/",
    "/dashboard/createquery",
    /^\/dashboard\/createquery\/.*$/,
    "/dashboard/notReplying",
    "/dashboard/propertyBoost/list",
    /^\/dashboard\/propertyBoost\/list\/.*$/,
  ],
  "LeadGen-TeamLead": [
    "/",
    "/dashboard",
    "/dashboard/addons",
    "/dashboard/createquery",
    /^\/dashboard\/createquery\/.*$/,
    "/dashboard/agent-data",
    // /^\/dashboard\/employee\/.*$/,
    "/dashboard/employee",
    /^\/dashboard\/lead-location-group\/.*$/,
    /^\/dashboard\/lead-agent-group\/.*$/,
    "/dashboard/notReplying",
    "/dashboard/compareLeads",

    "/dashboard/reviewLeads",
  ],
  Content: [
    "/",
    "/spreadsheet",
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
    "/spreadsheet",
    "/dashboard/rejectedleads",
    /^\/dashboard\/createquery\/.*$/,
    /^\/dashboard\/room\/.*$/,
    "/dashboard/visits",
    /^\/dashboard\/visits\/.*$/,
    "/dashboard/rolebaseLead",
    "/dashboard/goodtogoleads",
    "/dashboard/declinedleads",
    "/dashboard/bookings",
    /^\/dashboard\/bookings\/.*$/,
    "/dashboard/reminders",
    "/dashboard/catalogue",
    "/dashboard/propertyBoost",
    "/dashboard/propertyBoost/list",
    /^\/dashboard\/propertyBoost\/list\/.*$/,
    /^\/dashboard\/recommendations\/.*$/,
    "/dashboard/newproperty/filteredProperties",
    "/dashboard/lowBudget",
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
    "/dashboard/lowBudget",
  ],
  HR: [
    "/",
    "/dashboard",
    "/dashboard/employee",
    "/dashboard/compareLeads",
    /^\/dashboard\/compareLeads\/.*$/,
    /^\/dashboard\/employee\/.*$/,
    // /^\/dashboard\/editemployeedetails\/.*$/,
    /^\/dashboard\/employeedetails\/.*$/,
    "/dashboard/createnewEmployee",
    /^\/dashboard\/editemployeedetails\/.*$/,
    "/dashboard/candidatePortal",
    /^\/dashboard\/candidatePortal\/.*$/,
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
  "Sales(New)": ["/", "/dashboard/lowBudget"],
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
  "Sales(New)": "/dashboard/lowBudget",
  Default: "/dashboard",
  //  SuperAdmin: "/dashboard/cr%%5E$ghzdkkxjuhgy789",
  // Admin: "/dashboard/cr%%5E$ghzdkkxjuhgy789",
  // LeadGen: "/dashboard/cr%%5E$ghzdkkxjuhgy789",
  // "LeadGen-TeamLead": "/dashboard/cr%%5E$ghzdkkxjuhgy789",
  // Content: "/dashboard/cr%%5E$ghzdkkxjuhgy789",
  // Advert: "/dashboard/cr%%5E$ghzdkkxjuhgy789",
  // Sales: "/dashboard/cr%%5E$ghzdkkxjuhgy789",
  // "Sales-TeamLead": "/dashboard/cr%%5E$ghzdkkxjuhgy789",
  // HR: "/dashboard/cr%%5E$ghzdkkxjuhgy789",
  // Agent: "/dashboard/cr%%5E$ghzdkkxjuhgy789",
  // Guest: "/dashboard/cr%%5E$ghzdkkxjuhgy789",
  // Intern: "/dashboard/cr%%5E$ghzdkkxjuhgy789",
  // "Subscription-Sales": "/dashboard/cr%%5E$ghzdkkxjuhgy789",
  // Default: "/dashboard",
};
const publicRoutes = [
  "/",
  "/login",
  "/dashboard/candidatePortal",
  "/login/verify-otp",
  /^\/login\/verify-otp\/.+$/,
  "/norole",
  "/dashboard/room/*",
  "/application-form",
  "/zipl.pdf",
  /^\/dashboard\/candidatePortal\/[^\/]+\/onboarding$/,
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
  // console.log("path", path);
  // console.log("matchesRolePattern", matchesRolePattern("SuperAdmin", path));
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
    // Run middleware on everything except API routes, Next.js internals, favicon, and static files
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|pdf)).*)",
  ],
};
