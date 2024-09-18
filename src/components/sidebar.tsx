// "use client";
// import { useState } from "react";
// import { usePathname } from "next/navigation";
// import { GiHamburgerMenu } from "react-icons/gi";
// import Link from "next/link";
// import {
//   Sheet,
//   SheetContent,
//   SheetHeader,
//   SheetTitle,
//   SheetTrigger,
// } from "./ui/sheet";
// import { ModeToggle } from "./themeChangeButton";

// // Function to determine if a route is active
// const isActive = (currentPath: string, path: string): boolean =>
//   currentPath === path;

// export function Sidebar() {
//   const [isOpen, setIsOpen] = useState<boolean>(false);
//   const currentPath = usePathname();

//   return (
//     <>
//       {/* Sidebar for large screens */}
//       <div className="hidden lg:block w-64 bg-black text-white/80 fixed h-screen">
//         <div className="flex items-center justify-between">
//           <h2 className="text-2xl font-bold p-4">Dashboard</h2>
//           <div className="mr-1">
//             <ModeToggle />
//           </div>
//         </div>
//         <div>
//           <nav>
//             <ul>
//               <li
//                 className={`${
//                   isActive(currentPath, "/dashboard/user")
//                     ? "bg-white rounded-l-xl text-black/80"
//                     : ""
//                 }`}
//               >
//                 <Link
//                   href="/dashboard/user"
//                   className="block rounded-l-xl px-4 py-2 hover:bg-white/10"
//                 >
//                   Manage User
//                 </Link>
//               </li>
//               <li
//                 className={`${
//                   isActive(currentPath, "/dashboard/property")
//                     ? "bg-white rounded-l-xl text-black/80"
//                     : ""
//                 }`}
//               >
//                 <Link
//                   href="/dashboard/property"
//                   className="block rounded-l-xl px-4 py-2 hover:bg-white/10"
//                 >
//                   Manage Property
//                 </Link>
//               </li>
//             </ul>
//           </nav>
//         </div>
//       </div>

//       {/* Sidebar for smaller screens */}
//       <Sheet open={isOpen} onOpenChange={setIsOpen}>
//         <SheetTrigger asChild>
//           <div className="lg:hidden ">
//             <GiHamburgerMenu className="text-2xl  z-50 ml-2 mt-1 fixed top-0 left-0 cursor-pointer text-black dark:text-white" />
//           </div>
//         </SheetTrigger>

//         <SheetContent
//           side="left"
//           className="bg-black text-white/80 w-64 fixed inset-y-0 left-0 z-50"
//         >
//           <div className="flex items-center mb-2 justify-between">
//             <h2 className="text-2xl font-bold ">Dashboard</h2>
//             <div className="-mr-3">
//               <ModeToggle />
//             </div>
//           </div>
//           <div className="flex items-center  justify-between flex-col">
//             <nav>
//               <ul className="w-full">
//                 <li
//                   className={`py-2 ${
//                     isActive(currentPath, "/dashboard/user")
//                       ? "bg-white w-[230px] rounded-l-xl text-black"
//                       : ""
//                   }`}
//                 >
//                   <Link href="/dashboard/user" className="ml-2">
//                     Manage User
//                   </Link>
//                 </li>
//                 <li
//                   className={`py-2 ${
//                     isActive(currentPath, "/dashboard/property")
//                       ? "bg-white w-[230px] rounded-l-xl text-black"
//                       : ""
//                   }`}
//                 >
//                   <Link href="/dashboard/property" className="block ml-2">
//                     Manage Property
//                   </Link>
//                 </li>
//               </ul>
//             </nav>
//           </div>
//         </SheetContent>
//       </Sheet>
//     </>
//   );
// }

"use client";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { GiHamburgerMenu } from "react-icons/gi";
import Link from "next/link";
import { Sheet, SheetContent, SheetTrigger } from "./ui/sheet";
import { ModeToggle } from "./themeChangeButton";
import axios from "axios";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import ScreenLoader from "./ScreenLoader";
import { LogoutButton } from "./logoutAlertBox";
import { PanelTopOpen } from "lucide-react";

// Function to determine if a route is active
const isActive = (currentPath: string, path: string): boolean =>
  currentPath === path;

const roleRoutes = {
  Admin: [
    { path: "/dashboard/user", label: "Manage User" },
    { path: "/dashboard/property", label: "Manage Property" },
  ],
  Content: [{ path: "/dashboard/contentwriter", label: "Manage Content" }],
  SuperAdmin: [
    { path: "/dashboard/user", label: "Manage User" },
    { path: "/dashboard/property", label: "Manage Property" },
    { path: "/dashboard/content", label: "Manage Content" },
    { path: "/dashboard/admin", label: "Admin Panel" },
  ],
};

export function Sidebar() {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [currentUser, setCurrentUser] = useState("");
  const currentPath = usePathname();

  const getUserRole = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get("/api/user/getloggedinuser");
      console.log("API response:", response.data.user.role);
      if (response.data && response.data.user && response.data.user.role) {
        setUserRole(response.data.user.role);
        setCurrentUser(response.data.user.name);
      } else {
        console.error("No role found in the response.");
      }
    } catch (error: any) {
      console.error("Error fetching user role:", error);
    } finally {
      setIsLoading(false);
    }
  };
  useEffect(() => {
    getUserRole();
  }, []);
  const renderRoutes = () => {
    if (isLoading) {
      return <ScreenLoader />;
    }

    if (!userRole) {
      return <li>No role assigned</li>;
    }

    const routes = roleRoutes[userRole as keyof typeof roleRoutes];
    if (!routes) {
      return <li>Invalid role</li>;
    }

    return routes.map((route) => (
      <li
        key={route.path}
        className={`${
          isActive(currentPath, route.path)
            ? "bg-white rounded-l-lg text-black/80"
            : ""
        }`}
      >
        <Link
          href={route.path}
          className="block rounded-l-lg px-4 py-2 hover:bg-white/10"
        >
          {route.label}
        </Link>
      </li>
    ));
  };

  return (
    <>
      {/* Sidebar for large screens */}
      <div className="hidden lg:block w-64 bg-black text-white/80 fixed h-screen">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold p-4">Dashboard</h2>
          <div className="mr-1">
            <ModeToggle />
          </div>
        </div>
        <div>
          <nav className="flex flex-col justify-between flex-grow">
            <ul className="flex-grow">{renderRoutes()}</ul>
            <ul className="absolute bottom-0 ">
              <Popover>
                <PopoverTrigger className="cursor-pointer flex border-t items-center gap-x-2 justify-center  w-64 p-2    ">
                  {currentUser} <PanelTopOpen />
                </PopoverTrigger>
                <PopoverContent className="w-64">
                  <div className="">
                    <p className="text-xs mb-2">
                      Tap to logout from here to choose some diffrent route to
                      acess
                    </p>
                    <LogoutButton />
                  </div>
                </PopoverContent>
              </Popover>
            </ul>
          </nav>
        </div>
      </div>

      {/* Sidebar for smaller screens */}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <div className="lg:hidden ">
            <GiHamburgerMenu className="text-2xl  z-50 ml-2 mt-1 fixed top-0 left-0 cursor-pointer text-black dark:text-white" />
          </div>
        </SheetTrigger>

        <SheetContent side="left" className="w-64">
          <div className="flex items-center mb-2 justify-between">
            <h2 className="text-2xl font-bold ">Dashboard</h2>
            <div className="-mr-3">
              <ModeToggle />
            </div>
          </div>
          <nav className="w-full">
            <ul className="w-full p-0">{renderRoutes()}</ul>
          </nav>
        </SheetContent>
      </Sheet>
    </>
  );
}
