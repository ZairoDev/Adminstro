// import { NextResponse } from "next/server";
// import type { NextRequest } from "next/server";
// import { getDataFromToken } from "./util/getDataFromToken";

// // Define the role-based access control
// const roleAccess: { [key: string]: (string | RegExp)[] } = {
//   SuperAdmin: [
//     "/admin",
//     "/superadmin",
//     "/dashboard",
//     /^\/dashboard\/.*$/,
//     /^\/property\/.*$/,
//   ],
//   Admin: [
//     "/admin",
//     "/dashboard",
//     /^\/dashboard\/user$/,
//     /^\/dashboard\/edituserdetails$/,
//     /^\/dashboard\/property$/,
//     /^\/dashboard\/property\/edit\/.*$/,
//     /^\/dashboard\/createnewuser$/,
//     /^\/dashboard\/add-listing\/.*$/,
//   ],
//   Content: ["/dashboard/contentwriter", /^\/dashboard\/contentwriter\/.*$/],
// };

// const defaultRoutes: { [key: string]: string } = {
//   SuperAdmin: "/dashboard",
//   Admin: "/dashboard/user",
//   Content: "/dashboard/contentwriter",
// };

// const publicRoutes = ["/login", "/", "/verifyotp"];

// export async function middleware(request: NextRequest) {
//   const path = request.nextUrl.pathname;
//   const token = request.cookies.get("token")?.value || "";

//   const matchesRolePattern = (role: string, path: string): boolean => {
//     const patterns = roleAccess[role] || [];
//     return patterns.some((pattern) =>
//       typeof pattern === "string" ? path === pattern : pattern.test(path)
//     );
//   };

//   const isPublicRoute = publicRoutes.includes(path);

//   if (isPublicRoute) {
//     return NextResponse.next();
//   }

//   if (!token) {
//     return NextResponse.redirect(new URL("/login", request.url));
//   }

//   try {
//     const obj = await getDataFromToken(request);

//     const role = obj?.role as string;

//     if (role && !matchesRolePattern(role, path)) {
//       // Get the referer (previous URL)
//       const referer = request.headers.get("referer");
//       const previousUrl = referer ? new URL(referer) : null;

//       // Check if the previous URL is accessible for this role
//       if (previousUrl && matchesRolePattern(role, previousUrl.pathname)) {
//         return NextResponse.redirect(previousUrl);
//       } else {
//         // If no valid previous URL, redirect to the default route for this role
//         return NextResponse.redirect(
//           new URL(defaultRoutes[role] || "/", request.url)
//         );
//       }
//     }
//   } catch (error) {
//     console.error("Error getting role from token:", error);
//     // If there's an error getting the role, redirect to login
//     return NextResponse.redirect(new URL("/login", request.url));
//   }

//   return NextResponse.next();
// }

// export const config = {
//   matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
// };

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getDataFromToken } from "./util/getDataFromToken";

// Define the role-based access control
const roleAccess: { [key: string]: (string | RegExp)[] } = {
  SuperAdmin: [
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
  ],
  Content: [
    "/dashboard/property",
    "/dashboard/property/description",
    /^\/dashboard\/property\/description\/.*$/,
  ],
};

const defaultRoutes: { [key: string]: string } = {
  SuperAdmin: "/dashboard/user",
  Admin: "/dashboard/user",
  Content: "/dashboard/property",
};

const publicRoutes = [
  "/login",
  "/login/verify-otp",
  /^\/login\/verify-otp\/.+$/,
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
      const obj = await getDataFromToken(request);
      const role = obj?.role as string;

      if (path === "/login") {
        return NextResponse.redirect(
          new URL(defaultRoutes[role] || "/", request.url)
        );
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
    } catch (error) {
      console.error("Error getting role from token:", error);
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
