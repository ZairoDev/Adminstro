import { jwtVerify } from "jose";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  canAccessOwnerSheetVariant,
  getDefaultOwnerSheetPath,
} from "@/util/employeeRentalTypeAccess";


const roleAccess: { [key: string]: (string | RegExp)[] } = {
  SuperAdmin: [
    "/",
    "/admin",
    "/superadmin",
    "/whatsapp",
    "/whatsapp/retarget",
    "/application-form",
    "/spreadsheet",
    "/spreadsheet-short-term",
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
    "/dashboard/my-reminders",
    "/spreadsheet",
    "/spreadsheet-short-term",
    /^\/dashboard\/user$/,
    /^\/dashboard\/edituserdetails$/,
    /^\/dashboard\/property$/,
    /^\/dashboard\/property\/edit\/.*$/,
    /^\/dashboard\/createnewuser$/,
    /^\/dashboard\/add-listing\/.*$/,
    /^\/dashboard\/edituserdetails\/.*$/,
    "/dashboard/sales-offer",
    /^\/dashboard\/sales-offer\/.*$/,
  ],
  Advert: [
    "/",
    "/admin",
    "/dashboard",
    "/dashboard/my-reminders",
    "/whatsapp", // WhatsApp chat access for Advert (retarget conversations only, filtered client-side)
    "/whatsapp/retarget",
    "/dashboard/addons",
    "/dashboard/createquery",
    "/spreadsheet",
    "/spreadsheet-short-term",
    "/dashboard/invoice/list",
    /^\/dashboard\/invoice\/list\/.*$/,
    "/dashboard/invoice",
    /^\/dashboard\/invoice\/create\/.*$/,
    "/dashboard/rolebaseLead",
    "/dashboard/geo-search",
    /^\/dashboard\/geo-search\/.*$/,
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
    "/dashboard/my-reminders",
    "/dashboard/createquery",
    /^\/dashboard\/createquery\/.*$/,
    "/dashboard/notReplying",
    "/dashboard/propertyBoost/list",
    /^\/dashboard\/propertyBoost\/list\/.*$/,
  ],
  "LeadGen-TeamLead": [
    "/",
    "/dashboard", // Dashboard access for LeadGen-TeamLead
    "/dashboard/my-reminders",
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
    "/dashboard/propertyBoost/list",
    /^\/dashboard\/propertyBoost\/list\/.*$/,
  ],
  Content: [
    "/",
    "/dashboard", // Dashboard access for Content
    "/dashboard/my-reminders",
    "/spreadsheet",
    "/spreadsheet-short-term",
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
    "/dashboard/my-reminders",
    "/spreadsheet",
    "/spreadsheet-short-term",
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
    "/dashboard/sales-offer",
    /^\/dashboard\/sales-offer\/.*$/,
  ],
  "Sales-TeamLead": [
    "/",
    "/dashboard", // Dashboard access for Sales-TeamLead
    "/dashboard/my-reminders",
    "/spreadsheet",
    "/spreadsheet-short-term",
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
    "/dashboard/sales-offer",
    /^\/dashboard\/sales-offer\/.*$/,
  ],
  HR: [
    "/",
    "/dashboard", // Dashboard access for HR
    "/dashboard/my-reminders",
    "/dashboard/employee",
    "/dashboard/compareLeads",
    "/dashboard/addons",
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
    "/spreadsheet-short-term",
    "/whatsapp",
    /^\/dashboard\/.*$/,
    /^\/property\/.*$/,
  ],
  Agent: ["/", "/dashboard/my-reminders", "/dashboard/sales-offer", /^\/dashboard\/sales-offer\/.*$/],
  Guest: [
    "/",
    "/dashboard", // Dashboard access for Guest (limited view)
    "/dashboard/my-reminders",
    "/dashboard/guest-window",
    "/dashboard/owners",
    "/dashboard/owners/owner-list",
    "/dashboard/sales-offer",
    /^\/dashboard\/sales-offer\/.*$/,
  ],
  Intern: [
    "/",
    "/dashboard", // Dashboard access for Intern (limited view)
    "/dashboard/my-reminders",
    "/dashboard/owners",
    "/dashboard/owners/owner-list",
    "/dashboard/sales-offer",
    /^\/dashboard\/sales-offer\/.*$/,
  ],
  "Subscription-Sales": [
    "/",
    "/dashboard", // Dashboard access for Subscription-Sales
    "/dashboard/my-reminders",
    "/dashboard/sales-offer",
    /^\/dashboard\/sales-offer\/.*$/,
  ],
  "Sales(New)": [
    "/",
    "/dashboard", // Dashboard access for Sales(New)
    "/dashboard/my-reminders",
    "/dashboard/lowBudget",
  ],
  "sales-intern": [
    "/",
    "/dashboard",
    "/dashboard/my-reminders",
    "/spreadsheet",
    "/spreadsheet-short-term",
    "/whatsapp",
    "/whatsapp/calls",
  ],
  hSale: [
    "/",
    "/dashboard",
    "/dashboard/my-reminders",
    "/holidaysera",
    /^\/holidaysera(\/.*)?$/,
    "/dashboard/sales-offer",
    /^\/dashboard\/sales-offer\/.*$/,
  ],
  HAdmin: [
    "/",
    "/dashboard/my-reminders",
    "/holidaysera",
    /^\/holidaysera(\/.*)?$/,
    // Allow HAdmin to create new users and manage specific newproperty pages
    "/dashboard/createnewuser",
    /^\/dashboard\/createnewuser(\/.*)?$/,
    /^\/dashboard\/newproperty\/.*$/,
    "/dashboard/coupons",
    "/dashboard/sales-offer",
    /^\/dashboard\/sales-offer\/.*$/,
    /^\/dashboard\/sales-offer\/send-offer\/.*$/,
    // Employee + Alias management (Holidaysera-only enforced by APIs)
    "/dashboard/employee",
    /^\/dashboard\/employee\/.*$/,
    "/dashboard/createnewEmployee",
    "/dashboard/aliases",
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
  "sales-intern": "/dashboard",
  hSale: "/dashboard/sales-offer",
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
      const token = request.cookies.get("token")?.value || "";
      const decodedToken = await jwtVerify(token, new TextEncoder().encode(process.env.TOKEN_SECRET as string));
      // console.log("decodedToken", decodedToken);
      const role = String((decodedToken?.payload as any)?.role ?? "").trim();
      const uiFlags = (decodedToken?.payload as any)?.uiFlags as
        | { hideGuestManagement?: boolean; hideOwnerManagement?: boolean }
        | undefined;

      const isGuestManagementPath = (p: string) => {
        const prefixes = [
          "/dashboard/createquery",
          "/dashboard/lowBudget",
          "/dashboard/rolebaseLead",
          "/dashboard/goodtogoleads",
          "/dashboard/closedleads",
          "/dashboard/declinedleads",
          "/dashboard/rejectedleads",
          "/dashboard/reminders",
          "/dashboard/reviewLeads",
          "/dashboard/notReplying",
          "/dashboard/compareLeads",
          "/dashboard/website-leads",
        ];
        return prefixes.some((pre) => p === pre || p.startsWith(`${pre}/`));
      };

      const isOwnerManagementPath = (p: string) => {
        const prefixes = [
          "/spreadsheet",
          "/spreadsheet-short-term",
          "/dashboard/user",
          "/dashboard/newproperty",
          "/dashboard/newproperty/filteredProperties",
        ];
        return prefixes.some((pre) => p === pre || p.startsWith(`${pre}/`));
      };

      if (path === "/login") {
        return NextResponse.redirect(
          new URL(defaultRoutes[role] || "/", request.url)
        );
      }

      // Per-employee UI rules: hide + block Guest Management
      if (uiFlags?.hideGuestManagement && isGuestManagementPath(path)) {
        return NextResponse.redirect(
          new URL(defaultRoutes[role] || "/dashboard", request.url),
        );
      }

      // Per-employee UI rules: hide + block Owner Management
      if ((uiFlags as any)?.hideOwnerManagement && isOwnerManagementPath(path)) {
        return NextResponse.redirect(
          new URL(defaultRoutes[role] || "/dashboard", request.url),
        );
      }

      const rentalType = (decodedToken?.payload as any)?.rentalType;
      if (
        path === "/spreadsheet" &&
        !canAccessOwnerSheetVariant(rentalType, role, "long-term")
      ) {
        return NextResponse.redirect(
          new URL(getDefaultOwnerSheetPath(rentalType, role), request.url),
        );
      }
      if (
        path === "/spreadsheet-short-term" &&
        !canAccessOwnerSheetVariant(rentalType, role, "short-term")
      ) {
        return NextResponse.redirect(
          new URL(getDefaultOwnerSheetPath(rentalType, role), request.url),
        );
      }

      if (!role) {
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
      // Always clear both auth cookies on any JWT error (expired, invalid signature,
      // malformed, etc.) so the stale cookie never persists and causes redirect loops.
      // jose throws { code: "ERR_JWT_EXPIRED" } — NOT message === "Token Expired".
      const response = NextResponse.redirect(new URL("/login", request.url));
      response.cookies.set("token", "", { httpOnly: true, expires: new Date(0), path: "/" });
      response.cookies.set("sessionId", "", { httpOnly: true, expires: new Date(0), path: "/" });
      return response;
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
