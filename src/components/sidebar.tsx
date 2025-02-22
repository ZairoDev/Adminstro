"use client";

import {
  House,
  Check,
  Speech,
  ScanEye,
  CircleX,
  BellDot,
  Notebook,
  User2Icon,
  BadgeEuro,
  Warehouse,
  CheckCheck,
  PencilLine,
  NotebookPen,
  ArrowUpLeft,
  CornerLeftUp,
  PersonStanding,
  CircleCheckBig,
  FileSpreadsheet,
  SlidersHorizontal,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { useAuthStore } from "@/AuthStore";

import { ModeToggle } from "./themeChangeButton";

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
      path: "/dashboard/newproperty",
      label: "Manage Newtask",
      Icon: <Check size={18} />,
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
      path: "/dashboard/newproperty/filteredProperties",
      label: "Property Filter",
      Icon: <SlidersHorizontal size={18} />,
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
      path: "/dashboard/rolebaseLead",
      label: "Lead (Sales)",
      Icon: <PencilLine size={18} />,
    },
    {
      path: "/dashboard/reminders",
      label: "Reminders",
      Icon: <BellDot size={18} />,
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
    {
      path: "/dashboard/room/roomlist",
      label: "Room List",
      Icon: <Warehouse size={18} />,
    },
  ],
  Sales: [
    {
      path: "/dashboard/rolebaseLead",
      label: "Lead (Sales)",
      Icon: <PencilLine size={18} />,
    },
    {
      path: "/dashboard/reminders",
      label: "Reminders",
      Icon: <BellDot size={18} />,
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
    {
      path: "/dashboard/room/roomlist",
      label: "Room List",
      Icon: <Warehouse size={18} />,
    },
    {
      path: "/dashboard/newproperty/filteredProperties",
      label: "Property Filter",
      Icon: <SlidersHorizontal size={18} />,
    },
    {
      path: "/dashboard/catalogue",
      label: "Manage Catalogue",
      Icon: <Notebook size={18} />,
    },
  ],
  HR: [
    {
      path: "/dashboard/employee",
      label: "Employees",
      Icon: <PencilLine size={18} />,
    },
  ],
  Agent: [
    {
      path: "/dashboard/sales-offer",
      label: "Sales Offer",
      Icon: <BadgeEuro size={18} />,
    },
  ],
};

export function Sidebar() {
  const { token } = useAuthStore();
  const currentPath = usePathname();

  const renderRoutes = (showText: boolean) => {
    if (!token) {
      return (
        <li className="flex justify-center text-xl font-medium text-[#F7951D]">
          <img
            src="https://vacationsaga.b-cdn.net/assets/logo2.webp"
            className=" w-40 md:w-4/5"
          />
        </li>
      );
    }
    const routes = roleRoutes[token?.role as keyof typeof roleRoutes];
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
      <div>
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
            <nav className="flex flex-col justify-between">
              <ul>
                {/* <li className="flex-grow"> */}
                {renderRoutes(true)}
                {/* </li> */}
              </ul>
            </nav>
          </div>
        </div>
        <div className="fixed z-50 bottom-0 left-0 w-full bg-background border-t-2 lg:hidden">
          <nav className="mx-auto ">
            <ul className="flex items-center justify-around overflow-x-scroll h-14 scrollbar-hide">
              {/* <li className="flex items-center justify-around overflow-x-scroll h-14 scrollbar-hide"> */}
              {renderRoutes(false)}
              {/* </li> */}
            </ul>
          </nav>
        </div>
      </div>
    </>
  );
}
