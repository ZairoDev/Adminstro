"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Menu,
  Ban,
  Mouse as House,
  Frown,
  Check,
  Speech,
  Swords,
  ScanEye,
  CircleX,
  BellDot,
  Bell,
  Notebook,
  PhoneOff,
  ThumbsUp,
  Languages,
  User2Icon,
  BadgeEuro,
  Warehouse,
  TramFront,
  CheckCheck,
  PencilLine,
  CircleHelp,
  AwardIcon as IdCardIcon,
  ShieldAlert,
  NotebookPen,
  ArrowUpLeft,
  UserRoundCog,
  PhoneIncoming,
  ClipboardPaste,
  PersonStanding,
  CircleCheckBig,
  FileSpreadsheet,
  LayoutDashboard,
  SlidersHorizontal,
  Hotel,
  Sprout,
  CornerLeftUp,
  Rocket,
  List,
  MessageSquare,
  Ticket,
  Globe,
} from "lucide-react";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";
import SidebarSection from "./sidebarSection";
import type { JSX } from "react/jsx-runtime";
import { ModeToggle } from "./themeChangeButton";
import { FaWhatsapp } from "react-icons/fa6";

// Simple active matcher (keep strict equality)
const isActive = (currentPath: string, path: string): boolean =>
  currentPath === path;

type Route = {
  path: string;
  label: string;
  Icon?: JSX.Element;
   openInNewTab?: boolean;
};

const roleRoutes: Record<string, Route[]> = {
  Advert: [
    {
      path: "/dashboard",
      label: "Dashboard",
      Icon: <LayoutDashboard size={18} />,
    },
    {
      path: "/dashboard/addons",
      label: "Add Ons",
      Icon: <Swords size={18} />,
    },
    {
      path: "/dashboard/compareLeads",
      label: "Lead Report",
      Icon: <PencilLine size={18} />,
    },
    {
      path: "/dashboard/user",
      label: "Manage User",
      Icon: <User2Icon size={18} />,
    },
    {
      path: "/dashboard/rolebaseLead",
      label: "Fresh Leads",
      Icon: <Sprout size={18} />,
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
    {
      path: "/spreadsheet",
      label: "Owners List",
      Icon: <PencilLine size={18} />,
      openInNewTab: true,
    },
    {
      path: "/dashboard/invoice",
      label: "Manage Invoice",
      Icon: <Notebook size={18} />,
    },
    {
      path: "/dashboard/invoice/list",
      label: "List Invoice",
      Icon: <PencilLine size={18} />,
    },
  ],
  LeadGen: [
    {
      path: "/dashboard",
      label: "Dashboard",
      Icon: <LayoutDashboard size={18} />,
    },
    {
      path: "/dashboard/createquery",
      label: "Lead",
      Icon: <PencilLine size={18} />,
    },
    {
      path: "/dashboard/notReplying",
      label: "Not Replying Leads",
      Icon: <PencilLine size={18} />,
    },
    {
      path: "/dashboard/propertyBoost/list",
      label: "Property List",
      Icon: <List size={18} />,
    },
  ],
  "LeadGen-TeamLead": [
    {
      path: "/dashboard/addons",
      label: "Add Ons",
      Icon: <Swords size={18} />,
    },
    {
      path: "/dashboard",
      label: "Dashboard",
      Icon: <LayoutDashboard size={18} />,
    },
    {
      path: "/dashboard/createquery",
      label: "Lead",
      Icon: <PencilLine size={18} />,
    },
    {
      path: "/dashboard/employee",
      label: "Employees",
      Icon: <PencilLine size={18} />,
    },
    {
      path: "/dashboard/reviewLeads",
      label: "Review Leads",
      Icon: <PencilLine size={18} />,
    },
    {
      path: "/dashboard/notReplying",
      label: "Not Replying Leads",
      Icon: <PencilLine size={18} />,
    },
    {
      path: "/dashboard/compareLeads",
      label: "Compare Leads",
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
      path: "/dashboard/target",
      label: "Add Area",
      Icon: <PencilLine size={18} />,
    },

    {
      path: "/dashboard",
      label: "Dashboard",
      Icon: <LayoutDashboard size={18} />,
    },
    {
      path: "/dashboard/notifications",
      label: "Notifications",
      Icon: <Bell size={18} />,
    },
    {
      path: "/spreadsheet",
      label: "Owners List",
      Icon: <FileSpreadsheet size={18} />,
      openInNewTab: true,
    },
    {
      path: "/dashboard/areadetails",
      label: "Area Details",
      Icon: <TramFront size={18} />,
    },
    {
      path: "/dashboard/areapriceinfo",
      label: "Area Price Info",
      Icon: <BadgeEuro size={18} />,
    },
    {
      path: "/dashboard/addons",
      label: "Add Ons",
      Icon: <Swords size={18} />,
    },
    {
      path: "/dashboard/employee",
      label: "Manage Employee",
      Icon: <User2Icon size={18} />,
    },
    {
      path: "/dashboard/lowBudget",
      label: "Low Budget Leads",
      Icon: <User2Icon size={18} />,
    },
    {
      path: "/dashboard/employee/employeeList",
      label: "All Employees",
      Icon: <IdCardIcon size={18} />,
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
      path: "/dashboard/completedproperties",
      label: "Completed Task",
      Icon: <Check size={18} />,
    },
    {
      path: "/dashboard/remainingproperties",
      label: "Leftover Task",
      Icon: <ArrowUpLeft size={18} />,
    },
    {
      path: "/dashboard/newproperty/filteredProperties",
      label: "Property Filter",
      Icon: <SlidersHorizontal size={18} />,
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
      label: "Fresh Leads",
      Icon: <Sprout size={18} />,
    },
    {
      path: "/dashboard/goodtogoleads",
      label: "Good To Go",
      Icon: <ThumbsUp size={18} />,
    },
    {
      path: "/dashboard/declinedleads",
      label: "Declined Leads",
      Icon: <Ban size={18} />,
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
      path: "/dashboard/visits",
      label: "Visits",
      Icon: <TramFront size={18} />,
    },
    {
      path: "/dashboard/bookings",
      label: "Bookings",
      Icon: <Hotel size={18} />,
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
      path: "/dashboard/candidatePortal",
      label: "Register Candidate",
      Icon: <Speech size={18} />,
    },
    // {
    //   path: "/dashboard/leftoverCandidate",
    //   label: "Leftover Candidate",
    //   Icon: <PersonStanding size={18} />,
    // },
    // {
    //   path: "/dashboard/attendedCandidate",
    //   label: "Attended Candidate",
    //   Icon: <PersonStanding size={18} />,
    // },
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
    // ✅ Added missing Guest routes
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
    {
      path: "/dashboard/invoice",
      label: "Create Invoice",
      Icon: <PencilLine size={18} />,
    },
    {
      path: "/dashboard/invoice/list",
      label: "List Invoice",
      Icon: <PencilLine size={18} />,
    },
    {
      path: "/dashboard/coupons",
      label: "Manage Coupons",
      Icon: <Ticket size={18} />,
    },
    {
      path: "/dashboard/reviewLeads",
      label: "Review Leads",
      Icon: <PencilLine size={18} />,
    },
    {
      path: "/dashboard/notReplying",
      label: "Not Replying Leads",
      Icon: <PencilLine size={18} />,
    },
    {
      path: "/dashboard/compareLeads",
      label: "Lead Report",
      Icon: <PencilLine size={18} />,
    },
    {
      path: "/dashboard/propertyBoost",
      label: "Property Boost",
      Icon: <Rocket size={18} />,
    },

    {
      path: "/dashboard/propertyBoost/list",
      label: "Property List",
      Icon: <List size={18} />,
    },
    {
      path: "/whatsapp",
      openInNewTab: true,
      label: "WhatsApp",
      Icon: <MessageSquare size={18} />,
    },
    {
      path: "/dashboard/website-leads",
      label: "Website Leads",
      Icon: <Globe size={18} />,
    },
    {
      path: "/dashboard/onboardedCandidates",
      label: "Onboarded Candidates",
      Icon: <CheckCheck size={18} />,
    },
  ],
  Sales: [
    {
      path: "/dashboard",
      label: "Dashboard",
      Icon: <LayoutDashboard size={18} />,
    },
    {
      path: "/spreadsheet",
      label: "Owners List",
      Icon: <FileSpreadsheet size={18} />,
      openInNewTab: true,
    },
    {
      path: "/dashboard/createquery",
      label: "Lead",
      Icon: <PencilLine size={18} />,
    },
    {
      path: "/dashboard/lowBudget",
      label: "Low Budget Leads",
      Icon: <User2Icon size={18} />,
    },
    {
      path: "/dashboard/rolebaseLead",
      label: "Fresh Leads",
      Icon: <Sprout size={18} />,
    },
    {
      path: "/dashboard/goodtogoleads",
      label: "Good To Go",
      Icon: <ThumbsUp size={18} />,
    },
    {
      path: "/dashboard/declinedleads",
      label: "Declined Leads",
      Icon: <Ban size={18} />,
    },
    {
      path: "/dashboard/rejectedleads",
      label: "Rejected Leads",
      Icon: <CircleX size={18} />,
    },

    {
      path: "/dashboard/reminders",
      label: "Reminders",
      Icon: <BellDot size={18} />,
    },
    {
      path: "/dashboard/visits",
      label: "Visits",
      Icon: <TramFront size={18} />,
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
    {
      path: "/dashboard/invoice",
      label: "Create Invoice",
      Icon: <PencilLine size={18} />,
    },
    {
      path: "/dashboard/propertyBoost",
      label: "Property Boost",
      Icon: <Rocket size={18} />,
    },
    {
      path: "/dashboard/propertyBoost/list",
      label: "Property List",
      Icon: <List size={18} />,
    },
    {
      path: "/dashboard/bookings",
      label: "Bookings",
      Icon: <Hotel size={18} />,
    },
    {
      path: "/whatsapp",
      label: "WhatsApp",
      Icon: <MessageSquare size={18} />,
    },
    {
      path: "/dashboard/website-leads",
      label: "Website Leads",
      Icon: <Globe size={18} />,
    },
  ],
  "Sales-TeamLead": [
    {
      path: "/dashboard/createquery",
      label: "Lead",
      Icon: <PencilLine size={18} />,
    },
    {
      path: "/dashboard/rolebaseLead",
      label: "Fresh Leads",
      Icon: <Sprout size={18} />,
    },
    {
      path: "/dashboard/lowBudget",
      label: "Low Budget Leads",
      Icon: <User2Icon size={18} />,
    },
    {
      path: "/dashboard/goodtogoleads",
      label: "Good To Go",
      Icon: <ThumbsUp size={18} />,
    },
    {
      path: "/dashboard/declinedleads",
      label: "Declined Leads",
      Icon: <Ban size={18} />,
    },
    {
      path: "/dashboard/rejectedleads",
      label: "Rejected Leads",
      Icon: <CircleX size={18} />,
    },
    {
      path: "/dashboard/reminders",
      label: "Reminders",
      Icon: <BellDot size={18} />,
    },
    {
      path: "/dashboard/visits",
      label: "Visits",
      Icon: <TramFront size={18} />,
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
    {
      path: "/dashboard/propertyBoost",
      label: "Property Boost",
      Icon: <Rocket size={18} />,
    },
    {
      path: "/dashboard/propertyBoost/list",
      label: "Property List",
      Icon: <List size={18} />,
    },
    {
      path: "/whatsapp",
      label: "WhatsApp",
      Icon: <MessageSquare size={18} />,
    },
  ],
  HR: [
    {
      path: "/dashboard",
      label: "Dashboard",
      Icon: <LayoutDashboard size={18} />,
    },
    {
      path: "/dashboard/employee",
      label: "Employees",
      Icon: <IdCardIcon size={18} />,
    },
    {
      path: "/dashboard/employee/employeeList",
      label: "All Employees",
      Icon: <IdCardIcon size={18} />,
    },
    {
      path: "/dashboard/candidatePortal",
      label: "Register Candidate",
      Icon: <Speech size={18} />,
    },
    // {
    //   path: "/dashboard/leftoverCandidate",
    //   label: "Leftover Candidate",
    //   Icon: <PersonStanding size={18} />,
    // },
    // {
    //   path: "/dashboard/attendedCandidate",
    //   label: "Attended Candidate",
    //   Icon: <PersonStanding size={18} />,
    // },
    {
      path: "/dashboard/compareLeads",
      label: "Compare Leads",
      Icon: <PencilLine size={18} />,
    },
    {
      path: "/dashboard/onboardedCandidates",
      label: "Onboarded Candidates",
      Icon: <CheckCheck size={18} />,
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

const dashboardManagementRoutes = [
  {
    path: "/dashboard",
    label: "Dashboard",
    Icon: <LayoutDashboard size={18} />,
  },
  {
    path: "/whatsapp",
    label: "WhatsApp",
    Icon: <FaWhatsapp size={18} />,
  }

];
const leadManagementRoutes = [
  {
    path: "/dashboard/createquery",
    label: "Create Lead",
    Icon: <PencilLine size={18} />,
  },
  {
    path: "/dashboard/lowBudget",
    label: "Low Budget Leads",
    Icon: <User2Icon size={18} />,
  },
  {
    path: "/dashboard/rolebaseLead",
    label: "Fresh Leads",
    Icon: <Sprout size={18} />,
  },
  {
    path: "/dashboard/goodtogoleads",
    label: "Good To Go",
    Icon: <ThumbsUp size={18} />,
  },
  {
    path: "/dashboard/declinedleads",
    label: "Declined Leads",
    Icon: <Ban size={18} />,
  },
  {
    path: "/dashboard/rejectedleads",
    label: "Rejected Leads",
    Icon: <CircleX size={18} />,
  },
  {
    path: "/dashboard/reminders",
    label: "Reminders",
    Icon: <BellDot size={18} />,
  },
  {
    path: "/dashboard/reviewLeads",
    label: "Review Leads",
    Icon: <PencilLine size={18} />,
  },
  {
    path: "/dashboard/notReplying",
    label: "Not Replying Leads",
    Icon: <PencilLine size={18} />,
  },
  {
    path: "/dashboard/compareLeads",
    label: "Compare Leads",
    Icon: <PencilLine size={18} />,
  },
  {
    path: "/dashboard/website-leads",
    label: "Website Leads",
    Icon: <Globe size={18} />,
  },
];
const visitsManagementRoutes = [
  {
    path: "/dashboard/visits",
    label: "Visits",
    Icon: <TramFront size={18} />,
  },
];
const bookingsManagementRoutes = [
  {
    path: "/dashboard/bookings",
    label: "Bookings",
    Icon: <Hotel size={18} />,
  },
];
const ownerManagementRoutes = [
  {
    path: "/spreadsheet",
    label: "Owners List",
    Icon: <PencilLine size={18} />,
    openInNewTab: true,
  },
  {
    path: "/dashboard/user",
    label: "Manage User",
    Icon: <User2Icon size={18} />,
  },
  {
    path: "/dashboard/newproperty",
    label: "Manage Newtask",
    Icon: <Check size={18} />,
  },
  {
    path: "/dashboard/newproperty/filteredProperties",
    label: "Property Finder",
    Icon: <SlidersHorizontal size={18} />,
  },
];
// const propertyManagementRoutes = [
//   {
//     path: "/dashboard/property",
//     label: "Manage Task",
//     Icon: <Check size={18} />,
//   },
  
  
  
// ];
const contentRoutes = [
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
    path: "/dashboard/remainingproperties",
    label: "Leftover Task",
    Icon: <ArrowUpLeft size={18} />,
  },
  {
    path: "/dashboard/completedproperties",
    label: "Completed Task",
    Icon: <Check size={18} />,
  },
];
const candidateRoutes = [
  {
    path: "/dashboard/employee",
    label: "Manage Employee",
    Icon: <User2Icon size={18} />,
  },
  {
    path: "/dashboard/employee/employeeList",
    label: "All Employees",
    Icon: <IdCardIcon size={18} />,
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
    path: "/dashboard/onboardedCandidates",
    label: "Onboarded Candidates",
    Icon: <CheckCheck size={18} />,
  },

  {
    path: "/dashboard/aliases",
    label: "Aliases",
    Icon: <UserRoundCog size={18} />,
  },
];
const roomRoutes = [
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
];
const subscriptionsRoutes = [
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
];
const InvoiceRoutes = [
  {
    path: "/dashboard/invoice",
    label: "Manage Invoice",
    Icon: <Notebook size={18} />,
  },
  {
    path: "/dashboard/invoice/list",
    label: "List Invoice",
    Icon: <PencilLine size={18} />,
  },
];

const propertyBoostRoutes = [
  {
    path: "/dashboard/propertyBoost",
    label: "Property Boost",
    Icon: <Rocket size={18} />,
  },
  {
    path: "/dashboard/propertyBoost/list",
    label: "Property List",
    Icon: <List size={18} />,
  },
]

const otherSettingsRoutes = [
  {
    path: "/dashboard/addons",
    label: "Add Ons",
    Icon: <Swords size={18} />,
  },
  {
    path: "/dashboard/notifications",
    label: "Notifications",
    Icon: <Bell size={18} />,
  },
  {
    path: "/dashboard/coupons",
    label: "Manage Coupons",
    Icon: <Ticket size={18} />,
  },
  {
    path: "/dashboard/target",
    label: "Add Area",
    Icon: <PencilLine size={18} />,
  },
  {
    path: "/dashboard/areadetails",
    label: "Area Details",
    Icon: <TramFront size={18} />,
  },
  {
    path: "/dashboard/areapriceinfo",
    label: "Area Price Info",
    Icon: <BadgeEuro size={18} />,
  },
];

export function Sidebar({ collapsed, setCollapsed }: { collapsed?: boolean ,setCollapsed:Function}) {
  const pathname = usePathname() ?? "";
  const [mobileOpen, setMobileOpen] = useState(false);
  // const [collapsed, setCollapsed] = useState(false);

  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const mod: any = await import("@/AuthStore").catch(() => null);
        const store = mod?.useAuthStore;
        const tokenRole =
          typeof store?.getState === "function"
            ? store.getState()?.token?.role
            : undefined;
        if (mounted) setRole(tokenRole ?? null);
      } catch {
        if (mounted) setRole(null);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const renderRoutes = (
    showText: boolean,
    defaultOpen = false,
    onNavigate?: () => void
  ) => {
    if (!role) {
      return (
        <li className="flex justify-center text-xl font-medium text-[#F7951D]">
          <img
            src="https://vacationsaga.b-cdn.net/assets/logo2.webp"
            className="w-40 md:w-4/5"
            alt="Logo"
          />
        </li>
      );
    }

    const routesForRole = roleRoutes[role as keyof typeof roleRoutes];
    if (!routesForRole) {
      return <li className="px-4 py-2 text-sm">{role ?? "Invalid Role"}</li>;
    }

    const inGroup = (group: Route[]) =>
      routesForRole.filter((r) => group.some((g) => g.path === r.path));

    const dashboardRoutes = inGroup(dashboardManagementRoutes);
    const leadRoute = inGroup(leadManagementRoutes);
    const visitsManagementRoute = inGroup(visitsManagementRoutes);
    const bookingsManagementRoute = inGroup(bookingsManagementRoutes);
    const ownerManagementRoute = inGroup(ownerManagementRoutes);
    // const propertyManagementRoute = inGroup(propertyManagementRoutes);
    const contentRoute = inGroup(contentRoutes);
    const candidateRoute = inGroup(candidateRoutes);
    const roomRoute = inGroup(roomRoutes);
    const subscriptionsRoute = inGroup(subscriptionsRoutes);
    const invoiceRoute = inGroup(InvoiceRoutes);
    const propertyBoostRoute = inGroup(propertyBoostRoutes);
    const otherSettingsRoute = inGroup(otherSettingsRoutes);

    return (
      <>
        <SidebarSection
          title="Dashboard"
          routes={dashboardRoutes}
          showText={showText}
          currentPath={pathname}
          defaultOpen={defaultOpen}
          onNavigate={onNavigate}
        />
        <SidebarSection
          title="Owner Management"
          routes={ownerManagementRoute}
          showText={showText}
          currentPath={pathname}
          defaultOpen={defaultOpen}
          onNavigate={onNavigate}
        />
        <SidebarSection
          title="Guest Management"
          routes={leadRoute}
          showText={showText}
          currentPath={pathname}
          defaultOpen={defaultOpen}
          onNavigate={onNavigate}
        />
        <SidebarSection
          title="Visit Management"
          routes={visitsManagementRoute}
          showText={showText}
          currentPath={pathname}
          defaultOpen={defaultOpen}
          onNavigate={onNavigate}
        />
        <SidebarSection
          title="Booking Management"
          routes={bookingsManagementRoute}
          showText={showText}
          currentPath={pathname}
          defaultOpen={defaultOpen}
          onNavigate={onNavigate}
        />
        {/* <SidebarSection
          title="Property Management"
          routes={propertyManagementRoute}
          showText={showText}
          currentPath={pathname}
          defaultOpen={defaultOpen}
          onNavigate={onNavigate}
        /> */}
        <SidebarSection
          title="Content Management"
          routes={contentRoute}
          showText={showText}
          currentPath={pathname}
          defaultOpen={defaultOpen}
          onNavigate={onNavigate}
        />
        <SidebarSection
          title="Candidate Management"
          routes={candidateRoute}
          showText={showText}
          currentPath={pathname}
          defaultOpen={defaultOpen}
          onNavigate={onNavigate}
        />
        <SidebarSection
          title="Room Management"
          routes={roomRoute}
          showText={showText}
          currentPath={pathname}
          defaultOpen={defaultOpen}
          onNavigate={onNavigate}
        />
        <SidebarSection
          title="Subscriptions"
          routes={subscriptionsRoute}
          showText={showText}
          currentPath={pathname}
          defaultOpen={defaultOpen}
          onNavigate={onNavigate}
        />
        <SidebarSection
          title="Invoice Management"
          routes={invoiceRoute}
          showText={showText}
          currentPath={pathname}
          defaultOpen={defaultOpen}
          onNavigate={onNavigate}
        />
        <SidebarSection
          title="Property Boost"
          routes={propertyBoostRoute}
          showText={showText}
          currentPath={pathname}
          defaultOpen={defaultOpen}
          onNavigate={onNavigate}
        />
        <SidebarSection
          title="Other Settings"
          routes={otherSettingsRoute}
          showText={showText}
          currentPath={pathname}
          defaultOpen={defaultOpen}
          onNavigate={onNavigate}
        />
      </>
    );
  };

  return (
    <>
      {/* Mobile: Hamburger button to open a left drawer (retractable) */}
      <div className="lg:hidden fixed top-2 left-2 z-50">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <button
              aria-label="Open menu"
              className="inline-flex items-center justify-center rounded-md border bg-background px-3 py-2 shadow-sm hover:bg-accent focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <Menu size={18} />
              <span className="sr-only">Open sidebar</span>
            </button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-72">
            <SheetHeader className="sr-only">
              <SheetTitle>Navigation</SheetTitle>
            </SheetHeader>
            <div className="h-full">
              <div className="flex items-center justify-between border-b">
                <h2 className="text-xl font-semibold text-primary p-4">
                  <Link href="/" onClick={() => setMobileOpen(false)}>
                    Adminstro
                  </Link>
                </h2>
                <div className="mr-2">
                  <ModeToggle />
                </div>
              </div>
              <nav className="flex flex-col overflow-y-auto">
                <ul>{renderRoutes(true, true, () => setMobileOpen(false))}</ul>
              </nav>
              <div className="p-2">
                <SheetClose asChild>
                  <button className="w-full rounded-md border px-3 py-2 hover:bg-accent">
                    Close
                  </button>
                </SheetClose>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop: Fixed sidebar with collapse toggle */}
      <aside
        className={`hidden lg:block ${
          collapsed ? "w-16" : "w-60"
        } border-r fixed h-full overflow-y-auto bg-background transition-[width] duration-200`}
      >
        <div
          className={`flex items-center justify-between ${
            collapsed ? "px-2" : ""
          }`}
        >
          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              className="m-2 inline-flex items-center justify-center rounded-md border bg-background px-2 py-2 hover:bg-accent"
              onClick={() => setCollapsed((v: boolean) => !v)}
            >
              <Menu size={16} />
            </button>
            {!collapsed && (
              <h2 className="text-2xl font-bold text-primary p-2">
                <Link href="/">Adminstro</Link>
              </h2>
            )}
          </div>
          <div className="mr-1">
            <ModeToggle />
          </div>
        </div>
        <nav className="flex flex-col justify-between overflow-y-auto">
          <ul>{renderRoutes(!collapsed, false)}</ul>
        </nav>
      </aside>
    </>
  );
}
