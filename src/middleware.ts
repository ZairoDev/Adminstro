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
    /^\/dashboard\/remainingproperties\/description\/.*$/,
    /^\/dashboard\/remainingproperties$/,
    /^\/dashboard\/completedproperties$/,
    /^\/dashboard\/property\/description\/.*$/,
  ],
};
const defaultRoutes: { [key: string]: string } = {
  SuperAdmin: "/dashboard/user",
  Admin: "/dashboard/user",
  Content: "/dashboard/remainingproperties",
  Advert: "/dashboard/user",
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
//   Advert: [
//     "/admin",
//     "/dashboard",
//     /^\/dashboard\/user$/,
//     /^\/dashboard\/edituserdetails$/,
//     /^\/dashboard\/property$/,
//     /^\/dashboard\/property\/edit\/.*$/,
//     /^\/dashboard\/createnewuser$/,
//     /^\/dashboard\/add-listing\/.*$/,
//   ],
//   Content: [
//     "/dashboard/property",
//     "/dashboard/property/",
//     /^\/dashboard\/property$/,
//   ],
// };

// const defaultRoutes: { [key: string]: string } = {
//   SuperAdmin: "/dashboard/user",
//   Admin: "/dashboard/user",
//   Content: "/dashboard/property",
//   Advert: "/dashboard/user",
// };

// const publicRoutes = [
//   "/login",
//   "/login/verify-otp",
//   /^\/login\/verify-otp\/.+$/,
//   "/notRoute",
// ];

// export async function middleware(request: NextRequest) {
//   const path = request.nextUrl.pathname;
//   const token = request.cookies.get("token")?.value || "";

//   const matchesRolePattern = (role: string, path: string): boolean => {
//     const patterns = roleAccess[role] || [];
//     return patterns.some((pattern) =>
//       typeof pattern === "string" ? path === pattern : pattern.test(path)
//     );
//   };

//   const isPublicRoute = publicRoutes.some((pattern) =>
//     typeof pattern === "string" ? path === pattern : pattern.test(path)
//   );

//   // Debugging logs
//   console.log("Current Path:", path);
//   console.log("Is Public Route:", isPublicRoute);

//   if (isPublicRoute) {
//     return NextResponse.next();
//   }

//   if (token) {
//     try {
//       const obj = await getDataFromToken(request);
//       const role = obj?.role as string;

//       console.log("Extracted Role from Token:", role);

//       if (path === "/login") {
//         return NextResponse.redirect(
//           new URL(defaultRoutes[role] || "/", request.url)
//         );
//       }

//       if (!role || !matchesRolePattern(role, path)) {
//         const referer = request.headers.get("referer");
//         const previousUrl = referer ? new URL(referer) : null;

//         console.log(
//           "Role does not match, checking referer:",
//           previousUrl?.pathname
//         );

//         if (previousUrl && matchesRolePattern(role, previousUrl.pathname)) {
//           return NextResponse.redirect(previousUrl);
//         } else {
//           // Redirect to noRoutePage only if it's not a public route
//           console.log("Redirecting to /notRoute");
//           return NextResponse.redirect(new URL("/notRoute", request.url));
//         }
//       }
//     } catch (error) {
//       console.error("Error getting role from token:", error);
//       return NextResponse.redirect(new URL("/login", request.url));
//     }
//   } else if (!isPublicRoute) {
//     console.log("No token and not a public route, redirecting to login");
//     return NextResponse.redirect(new URL("/login", request.url));
//   }

//   return NextResponse.next();
// }

// export const config = {
//   matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
// };
