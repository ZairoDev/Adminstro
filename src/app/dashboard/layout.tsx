"use client";

import { useAuthStore } from "@/AuthStore";
import { Sidebar } from "@/components/sidebar";
import BreadCrumb from "@/components/BreadCrumb";
import { LogoutButton } from "@/components/logoutAlertBox";
import ScrollToTopButton from "@/components/dragButton/ScrollToTop";
import { Notifications } from "@/components/Notifications/Notifications";
import { WhatsAppNotifications } from "@/components/whatsapp/WhatsAppNotifications";
import { SystemNotificationToast } from "@/components/Notifications/SystemNotificationToast";
import { SystemNotificationCenter } from "@/components/Notifications/SystemNotificationCenter";
import { CommandDialogDemo } from "@/components/camanddialog/CammandDialog";
import { LeadSearch } from "@/components/UniversalLeadSearch/LeadSearch";
import { useState } from "react";
import InfoCard from "@/components/infoCard/InfoCard";
import { usePathname } from "next/navigation";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { token } = useAuthStore();
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const isOnboarding = pathname?.includes("/onboarding");
  const isTrainingAgreement = pathname?.includes("/training-agreement");
  const isOfferLetter = pathname?.includes("/offer-letter");
  
  if (isOnboarding) {
    return <main className="min-h-screen bg-background">{children}</main>;
  }
  if(isTrainingAgreement) {
    return <main className="min-h-screen bg-background">{children}</main>;
  }
  if(isOfferLetter) {
    return <main className="min-h-screen bg-background">{children}</main>;
  }
  return (
    <div className="flex">
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />
      <main
        className={`p-2 w-full transition-all duration-300 ${
          collapsed ? "ml-16" : "lg:ml-64"
        }`}
      >
        <div className=" xs:flex  hidden items-center xs:justify-between  justify-end ">
          <div className="xs:block hidden">
            <BreadCrumb />
          </div>
          <div className=" flex items-center gap-x-2">
            <InfoCard />
            {<LeadSearch />}
            {(token?.role === "SuperAdmin" ||
              token?.role === "Sales" ||
              token?.role === "Sales-TeamLead") && (
              <>
                <Notifications />
                <WhatsAppNotifications />
              </>
            )}
            {/* System Notification Center - Visible to all authenticated users */}
            {token && <SystemNotificationCenter />}
            <nav className="flex  justify-between items-center  gap-x-2">
              <div className=" flex  items-center gap-x-2 ">
                <CommandDialogDemo />
              </div>
              <div className=" ">
                <LogoutButton />
              </div>
            </nav>
          </div>
        </div>
  
        <div className="xs:hidden block">
          <nav className="absolute top-2 right-2">
            <div className="flex items-center gap-x-2 justify-center">
              <div className=" ">
                <LogoutButton />
              </div>
            </div>
          </nav>
        </div>
        <div>
          <div>
            <div className="pb-16 lg:pb-0">{children}</div>
          </div>
        </div>
      </main>
      <ScrollToTopButton />
      {/* Global System Notification Toast - Visible on all pages (includes WhatsApp messages) */}
      {token && <SystemNotificationToast />}
    </div>
  );
}
