"use client";

import {
  House,
  Frown,
  Check,
  Speech,
  ScanEye,
  CircleX,
  BellDot,
  Notebook,
  PhoneOff,
  Languages,
  User2Icon,
  BadgeEuro,
  Warehouse,
  CheckCheck,
  PencilLine,
  CircleHelp,
  ShieldAlert,
  NotebookPen,
  ArrowUpLeft,
  CornerLeftUp,
  UserRoundCog,
  PhoneIncoming,
  ClipboardPaste,
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
  // currentPath.startsWith(path);
  currentPath === path;

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
  LeadGen: [
    {
      path: "/dashboard/createquery",
      label: "Lead",
      Icon: <PencilLine size={18} />,
    },
  ],
  "LeadGen-TeamLead": [
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
      path: "/dashboard/aliases",
      label: "Aliases",
      Icon: <UserRoundCog size={18} />,
    },
    {
      path: "/dashboard/sales-offer",
      label: "Sales Offer",
      Icon: <ClipboardPaste size={18} />,
    },
    {
      path: "/dashboard/sales-offer/send-offer",
      label: "Sent Offer",
      Icon: <BadgeEuro size={18} />,
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
    {
      path: "/dashboard/catalogue",
      label: "Manage Catalogue",
      Icon: <Notebook size={18} />,
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
    {
      path: "/dashboard/sales-offer",
      label: "Sales Offer",
      Icon: <ClipboardPaste size={18} />,
    },
  ],
  "Sales-TeamLead": [
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
    {
      path: "/dashboard/sales-offer",
      label: "Sales Offer",
      Icon: <ClipboardPaste size={18} />,
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
  Guest: [
    {
      path: "/dashboard/guest-window",
      label: "Guest Window",
      Icon: <CircleHelp size={18} />,
    },
    {
      path: "/dashboard/owners",
      label: "Owners",
      Icon: <PersonStanding size={18} />,
    },
  ],
  "Subscription-Sales": [
    {
      path: "/dashboard/sales-offer",
      label: "Sales Offer",
      Icon: <ClipboardPaste size={18} />,
    },
    {
      path: "/dashboard/sales-offer/send-offer",
      label: "Sent Offer",
      Icon: <BadgeEuro size={18} />,
    },
    {
      path: "/dashboard/sales-offer/not-connected",
      label: "Not Connected",
      Icon: <PhoneOff size={18} />,
    },
    {
      path: "/dashboard/sales-offer/not-interested",
      label: "Not Interested",
      Icon: <Frown size={18} />,
    },
    {
      path: "/dashboard/sales-offer/call-back",
      label: "Call Back",
      Icon: <PhoneIncoming size={18} />,
    },
    {
      path: "/dashboard/sales-offer/language-barrier",
      label: "Language Barrier",
      Icon: <Languages size={18} />,
    },
    {
      path: "/dashboard/sales-offer/blacklist",
      label: "Blacklist Lead",
      Icon: <ShieldAlert size={18} />,
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
      return <li>{(token?.role as string) ?? "Invalid Role"}</li>;
    }
    return routes.map((route) => (
      <li
        key={route.path}
        className={`${
          isActive(currentPath, route.path)
            ? "bg-primary/40  rounded-l-sm  border-r-4 border-primary"
            : ""
        } text-sm`}
      >
        <Link
          href={route.path}
          className="flex items-center gap-x-2 hover:bg-primary/50 rounded-l-sm px-4 py-1.5"
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
            <nav className="flex flex-col justify-between overflow-y-auto">
              <ul className=" overflow-y-auto">
                {/* <li className="flex-grow"> */}
                {renderRoutes(true)}
                {/* </li> */}
              </ul>
            </nav>
          </div>
        </div>
        <div className="fixed z-50 bottom-0 left-0 w-full bg-background border-t-2 lg:hidden">
          <nav className="mx-auto flex-1 overflow-y-auto">
            <ul className=" items-center justify-around overflow-x-scroll h-14 scrollbar-hide ">
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
