"use client";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { ModeToggle } from "./themeChangeButton";
import { motion } from "framer-motion";
import axios from "axios";
import ScreenLoader from "./ScreenLoader";
import { LogoutButton } from "./logoutAlertBox";
import {
  CheckCheck,
  CircleCheckBig,
  CornerLeftUp,
  Menu,
  MessageCircleQuestion,
  NotebookPen,
  ScanEye,
  User2Icon,
  Users,
} from "lucide-react";
import DeepLoader from "./DeepLoader";

const isActive = (currentPath: string, path: string): boolean =>
  currentPath.startsWith(path);

type Route = {
  path: string;
  label: string;
  Icon?: JSX.Element;
};

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
    {
      path: "/dashboard/allblogs",
      label: "Read Blogs",
      Icon: <ScanEye size={18} />,
    },
    {
      path: "/dashboard/createblog",
      label: "Create Blog",
      Icon: <NotebookPen size={18} />,
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
      label: "Read Blogs",
      Icon: <ScanEye size={18} />,
    },
    {
      path: "/dashboard/createblog",
      label: "Create Blog",
      Icon: <NotebookPen size={18} />,
    },
    {
      path: "/dashboard/createquery",
      label: "Create Query",
      Icon: <MessageCircleQuestion size={18} />,
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

  const renderRoutes = (showText: boolean) => {
    if (isLoading) {
      return <DeepLoader />;
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
            ? "bg-primary text-primary-foreground rounded-lg"
            : ""
        }`}
      >
        <Link
          href={route.path}
          className="flex items-center gap-x-2 hover:bg-primary/20 rounded-lg px-4 py-2 "
        >
          {route.Icon && route.Icon}
          {showText && <span>{route.label}</span>}
        </Link>
      </li>
    ));
  };

  return (
    <>
      {/* Sidebar for large screens */}
      {/* <div className="hidden lg:block w-60 border-r fixed h-screen">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-primary p-4">Adminstro</h2>
          <div className="mr-1">
            <ModeToggle />
          </div>
        </div>
        <div>
          <nav className="flex flex-col justify-between flex-grow">
            <ul className="flex-grow">{renderRoutes(true)}</ul>
          </nav>
        </div>
      </div> */}
      <div className="hidden lg:block w-60 border-r fixed h-screen">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-primary p-4">Adminstro</h2>
          <div className="mr-1">
            <ModeToggle />
          </div>
        </div>
        <div>
          <nav className="flex flex-col  justify-between ">
            <ul className="flex-grow">{renderRoutes(true)}</ul>
            {/* Logout button for desktop sidebar */}
            <div className=" absolute bottom-4 left-4">
              <LogoutButton />
            </div>
          </nav>
        </div>
      </div>

      {/* Bottom navbar for small screens */}
      <div className="fixed z-50 bottom-0 left-0 w-full bg-background border-t-2 lg:hidden">
        <nav className="max-w-screen-xl mx-auto px-4">
          <ul className="flex items-center justify-around overflow-x-scroll h-14">
            {renderRoutes(false)}
            <LogoutButton />
          </ul>
        </nav>
        {/* Logout button for mobile navbar */}
      </div>
    </>
  );
}
