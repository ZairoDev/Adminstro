"use client";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { ModeToggle } from "./themeChangeButton";
import axios from "axios";
import {
  ArrowUpLeft,
  CalendarPlus,
  Check,
  CheckCheck,
  CircleCheckBig,
  CircleX,
  CornerLeftUp,
  FileSpreadsheet,
  House,
  LoaderCircle,
  NotebookPen,
  PencilLine,
  PersonStanding,
  ScanEye,
  Speech,
  User2Icon,
  Users,
} from "lucide-react";
import Image from "next/image";
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
    {
      path: "/dashboard/createquery",
      label: "Lead",
      Icon: <PencilLine size={18} />,
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
      Icon: <User2Icon size={18} />,
    },
    {
      path: "/dashboard/user",
      label: "Manage User",
      Icon: <User2Icon size={18} />,
    },
    {
      path: "/dashboard/property",
      label: "Manage Task",
      Icon: <Check size={18} />,
    },
    {
      path: "/dashboard/newproperty",
      label: "Manage Newtask",
      Icon: <Check size={18} />,
    },
    {
      path: "/dashboard/remainingproperties",
      label: "Leftover Task",
      Icon: <ArrowUpLeft size={18} />,
    },
    {
      path: "/dashboard/completedproperties",
      label: "Completed Task",
      Icon: <Check size={18} />,
    },
    {
      path: "/dashboard/createblog",
      label: "Create Blog",
      Icon: <PencilLine size={18} />,
    },
    {
      path: "/dashboard/allblogs",
      label: "Read Blogs",
      Icon: <FileSpreadsheet size={18} />,
    },

    {
      path: "/dashboard/createquery",
      label: "Create Lead",
      Icon: <PencilLine size={18} />,
    },

    {
      path: "/dashboard/createdQuery",
      label: "Created Lead",
      Icon: <CalendarPlus size={18} />,
    },
    {
      path: "/dashboard/rolebaseLead",
      label: "Lead (Sales)",
      Icon: <PencilLine size={18} />,
    },
    {
      path: "/dashboard/rejectedleads",
      label: "Rejected Leads",
      Icon: <CircleX size={18} />,
    },
    {
      path: "/dashboard/candidatePortal",
      label: "Register Candidate",
      Icon: <Speech size={18} />,
    },
    {
      path: "/dashboard/leftoverCandidate",
      label: "Leftover Candidate",
      Icon: <PersonStanding size={18} />,
    },
    {
      path: "/dashboard/attendedCandidate",
      label: "Attended Candidate",
      Icon: <PersonStanding size={18} />,
    },
    {
      path: "/dashboard/room/joinroom",
      label: "Join Room",
      Icon: <House size={18} />,
    },
  ],
  Sales: [
    {
      path: "/dashboard/rolebaseLead",
      label: "Lead (Sales)",
      Icon: <PencilLine size={18} />,
    },
    {
      path: "/dashboard/rejectedleads",
      label: "Rejected Leads",
      Icon: <CircleX size={18} />,
    },
    {
      path: "/dashboard/room/joinroom",
      label: "Join Room",
      Icon: <House size={18} />,
    },
  ],
  HR: [
    {
      path: "/dashboard/employee",
      label: "Employees",
      Icon: <PencilLine size={18} />,
    },
  ],
};

export function Sidebar() {
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [currentUser, setCurrentUser] = useState("");
  const currentPath = usePathname();

  const getUserRole = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get("/api/user/getloggedinuser");
      if (response.data && response.data.user && response.data.user.role) {
        setUserRole(response.data.user.role);
        // setCurrentUser(response.data.user.name);
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
      return (
        <>
          <div className="flex items-center justify-center">
            <LoaderCircle className="animate-spin " size={18} />
          </div>
        </>
      );
    }

    if (!userRole) {
      return (
        <li className="flex justify-center text-xl font-medium text-[#F7951D]">
          <img
            src="https://vacationsaga.b-cdn.net/assets/logo2.webp"
            className=" w-40 md:w-4/5"
          />
        </li>
      );
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
            ? "bg-primary/40  rounded-l-sm  border-r-4 border-primary"
            : ""
        }`}
      >
        <Link
          href={route.path}
          className="flex items-center gap-x-2 hover:bg-primary/5  rounded-l-sm px-4 py-2 "
        >
          {route.Icon && route.Icon}
          {showText && <span className="">{route.label}</span>}
        </Link>
      </li>
    ));
  };

  return (
    <>
      <div className="hidden lg:block w-60 border-r fixed h-screen">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-primary p-4">
            <Link href="/">Adminstro</Link>
          </h2>
          <div className="mr-1">
            <ModeToggle />
          </div>
        </div>
        <div>
          <nav className="flex flex-col  justify-between ">
            <ul>
              <li className="flex-grow">{renderRoutes(true)}</li>
            </ul>
          </nav>
        </div>
      </div>

      <div className="fixed z-50 bottom-0 left-0 w-full bg-background border-t-2 lg:hidden">
        <nav className="mx-auto ">
          <ul className="">
            <li className="flex items-center justify-around overflow-x-scroll h-14 scrollbar-hide">
              {renderRoutes(false)}
            </li>
          </ul>
        </nav>
      </div>
    </>
  );
}
