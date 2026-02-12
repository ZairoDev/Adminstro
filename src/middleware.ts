import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { getDataFromToken } from "./util/getDataFromToken";

const roleAccess: { [key: string]: (string | RegExp)[] } = {
  SuperAdmin: [
    "/",
    "/admin",
    "/superadmin",
    "/whatsapp",
    "/whatsapp/retarget",
    "/application-form",
    "/spreadsheet",
    "/dashboard",
    "/holidaysera",
    /^\/holidaysera(\/.*)?$/,
    "/dashboard/website-leads",
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
    "/whatsapp", // WhatsApp chat access for Advert (retarget conversations only, filtered client-side)
    "/whatsapp/retarget",
    "/dashboard/addons",
    "/dashboard/createquery",
    "/spreadsheet",
    "/dashboard/invoice/list",
    /^\/dashboard\/invoice\/list\/.*$/,
    "/dashboard/invoice",
    /^\/dashboard\/invoice\/create\/.*$/,
    "/dashboard/rolebaseLead",
    "/dashboard/compareLeads",
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
    "/dashboard/unregistered-owner", // New Owners page access
  ],
  LeadGen: [
    "/",
    "/dashboard", // Dashboard access for LeadGen
    "/dashboard/createquery",
    /^\/dashboard\/createquery\/.*$/,
    "/dashboard/notReplying",
    "/dashboard/propertyBoost/list",
    /^\/dashboard\/propertyBoost\/list\/.*$/,
  ],
  "LeadGen-TeamLead": [
    "/",
    "/dashboard", // Dashboard access for LeadGen-TeamLead
    "/dashboard/addons",
    "/dashboard/createquery",
    /^\/dashboard\/createquery\/.*$/,
    "/dashboard/agent-data",
    "/dashboard/employee",
    /^\/dashboard\/lead-location-group\/.*$/,
    /^\/dashboard\/lead-agent-group\/.*$/,
    "/dashboard/notReplying",
    "/dashboard/compareLeads",
    "/dashboard/reviewLeads",
  ],
  Content: [
    "/",
    "/dashboard", // Dashboard access for Content
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
    "/dashboard", // Dashboard access for Sales
    "/spreadsheet",
    "/whatsapp",
    "/whatsapp/retarget",
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
    "/dashboard/website-leads",
    "/dashboard/unregistered-owner", // New Owners page access
  ],
  "Sales-TeamLead": [
    "/",
    "/dashboard", // Dashboard access for Sales-TeamLead
    "/spreadsheet",
    "/whatsapp",
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
    "/dashboard/goodtogo",
    "/dashboard/catalogue",
    "/dashboard/propertyBoost",
    "/dashboard/propertyBoost/list",
    /^\/dashboard\/propertyBoost\/list\/.*$/,
    /^\/dashboard\/recommendations\/.*$/,
    "/dashboard/newproperty/filteredProperties",
    "/dashboard/lowBudget",
    "/dashboard/website-leads",
    "/dashboard/unregistered-owner", // New Owners page access
    "/dashboard/compareLeads",
  ],
  HR: [
    "/",
    "/dashboard", // Dashboard access for HR
    "/dashboard/employee",
    "/dashboard/compareLeads",
    /^\/dashboard\/compareLeads\/.*$/,
    /^\/dashboard\/employee\/.*$/,
    /^\/dashboard\/employeedetails\/.*$/,
    "/dashboard/createnewEmployee",
    /^\/dashboard\/editemployeedetails\/.*$/,
    "/dashboard/candidatePortal",
    /^\/dashboard\/candidatePortal\/.*$/,
    "/dashboard/onboardedCandidates",
    /^\/dashboard\/onboardedCandidates\/.*$/,
  ],
  Developer: [
    "/",
    "/admin",
    "/dashboard", // Dashboard access for Developer
    "/spreadsheet",
    "/whatsapp",
    /^\/dashboard\/.*$/,
    /^\/property\/.*$/,
  ],
  Agent: [
    "/", 
    "/dashboard/sales-offer",
  ],
  Guest: [
    "/",
    "/dashboard", // Dashboard access for Guest (limited view)
    "/dashboard/guest-window",
    "/dashboard/owners",
    "/dashboard/owners/owner-list",
    "/dashboard/sales-offer",
  ],
  Intern: [
    "/",
    "/dashboard", // Dashboard access for Intern (limited view)
    "/dashboard/owners",
    "/dashboard/owners/owner-list",
    "/dashboard/sales-offer",
  ],
  "Subscription-Sales": [
    "/",
    "/dashboard", // Dashboard access for Subscription-Sales
    "/dashboard/sales-offer",
    /^\/dashboard\/sales-offer\/.*$/,
  ],
  "Sales(New)": [
    "/", 
    "/dashboard", // Dashboard access for Sales(New)
    "/dashboard/lowBudget",
  ],
  HAdmin: [
    "/",
    "/holidaysera",
    /^\/holidaysera(\/.*)?$/,
    // Allow HAdmin to create new users and manage specific newproperty pages
    "/dashboard/createnewuser",
    /^\/dashboard\/createnewuser(\/.*)?$/,
    /^\/dashboard\/newproperty\/.*$/,
  ],
};

export const defaultRoutes: { [key: string]: string } = {
  SuperAdmin: "/dashboard",
  Admin: "/dashboard/user",
  LeadGen: "/dashboard", // Updated: LeadGen now goes to dashboard
  "LeadGen-TeamLead": "/dashboard",
  Content: "/dashboard/remainingproperties",
  Advert: "/dashboard", // Updated: Advert now goes to dashboard
  Sales: "/dashboard", // Updated: Sales now goes to dashboard
  "Sales-TeamLead": "/dashboard", // Updated: Sales-TeamLead now goes to dashboard
  HR: "/dashboard",
  Developer: "/dashboard",
  Agent: "/dashboard/sales-offer",
  Guest: "/dashboard",
  Intern: "/dashboard",
  "Subscription-Sales": "/dashboard/sales-offer",
  "Sales(New)": "/dashboard/lowBudget",
  HAdmin: "/holidaysera",
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
  "/application-form",
  "/zipl.pdf",
  "/interview-reschedule",
  /^\/dashboard\/candidatePortal\/[^\/]+\/onboarding$/,
  /^\/dashboard\/candidatePortal\/[^\/]+\/training-agreement$/,
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

  // Allow public routes to pass through regardless of authentication
  if (isPublicRoute) {
    return NextResponse.next();
  }

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
      // NOTE: Per Next.js guidelines, middleware MUST NOT perform DB writes.
      // Session heartbeat / lastActivity updates should be performed in API routes or client pings.
    } catch (error: any) {
      if (error.message === "Token Expired") {
        const response = NextResponse.redirect(new URL("/login", request.url));
        response.cookies.delete("token");
        return response;
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
