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
import {
  ArrowRight,
  BadgePlus,
  CheckCheck,
  CircleCheckBig,
  CornerLeftUp,
  NotebookPen,
  PencilRuler,
  TableOfContents,
  User2Icon,
  Users,
} from "lucide-react";

import FadeInAnimation from "./fadeinAnimation";

// Function to determine if a route is active
// Function to determine if a route is active
const isActive = (currentPath: string, path: string): boolean =>
  currentPath.startsWith(path);

// Define the Route ty
type Route = {
  path: string;
  label: string;
  Icon?: JSX.Element;
};
// Define roleRoutes with the Route type
const roleRoutes: Record<string, Route[]> = {
  Advert: [
    {
      path: "/dashboard/user",
      label: "Manage User",
      Icon: <User2Icon size={18} />,
    },
    {
      path: "/dashboard/property",
      label: "Manage Task",
      Icon: <CircleCheckBig size={18} />,
    },
  ],
  Admin: [
    {
      path: "/dashboard/user",
      label: "Manage User",
      Icon: <User2Icon size={18} />,
    },
    {
      path: "/dashboard/property",
      label: "Manage Task",
      Icon: <CircleCheckBig size={18} />,
    },
  ],
  Content: [
    {
      path: "/dashboard/remainingproperties",
      label: "Remaining Task",
      Icon: <CornerLeftUp size={18} />,
    },
    {
      path: "/dashboard/completedproperties",
      label: "Completed Task",
      Icon: <CheckCheck size={18} />,
    },
  ],
  SuperAdmin: [
    {
      path: "/dashboard/employee",
      label: "Manage Employee",
      Icon: <Users size={18} />,
    },
    {
      path: "/dashboard/user",
      label: "Manage User",
      Icon: <User2Icon size={18} />,
    },
    {
      path: "/dashboard/property",
      label: "Manage Task",
      Icon: <CircleCheckBig size={18} />,
    },

    {
      path: "/dashboard/remainingproperties",
      label: "Leftover Task",
      Icon: <CornerLeftUp size={18} />,
    },
    {
      path: "/dashboard/completedproperties",
      label: "Completed Task",
      Icon: <CheckCheck size={18} />,
    },
    {
      path: "/dashboard/allblogs",
      label: "Blogs",
      Icon: <NotebookPen size={18} />,
    },
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
            ? "bg-primary text-primary-foreground rounded-l-lg"
            : ""
        }`}
      >
        <Link
          href={route.path}
          className="flex items-center gap-x-2 rounded-l-lg px-4 py-2 hover:bg-primary/20"
        >
          {route.Icon && route.Icon}
          <span>{route.label}</span>
        </Link>
      </li>
    ));
  };

  return (
    <>
      {/* Sidebar for large screens */}
      <div className="hidden lg:block w-64 border-r fixed h-screen">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-primary p-4">Adminstro</h2>
          <div className="mr-1">
            <ModeToggle />
          </div>
        </div>
        <div>
          <nav className="flex flex-col justify-between flex-grow">
            <ul className="flex-grow">{renderRoutes()}</ul>
          </nav>
        </div>
      </div>

      {/* Sidebar for smaller screens */}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <div className="lg:hidden">
            <GiHamburgerMenu className="text-2xl border-r z-50 ml-2 mt-1 fixed top-0 left-0 cursor-pointer" />
          </div>
        </SheetTrigger>

        <SheetContent side="left" className="w-[17rem]">
          <div className="flex items-center mb-2 justify-between">
            <h2 className="text-2xl font-bold text-primary">Adminstro</h2>
            <div className="-mr-3">
              <ModeToggle />
            </div>
          </div>
          <nav className="w-[15.5rem]">
            <ul>{renderRoutes()}</ul>
          </nav>
        </SheetContent>
      </Sheet>
    </>
  );
}
