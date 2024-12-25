"use client";

import { useAuthStore } from "@/AuthStore";
import { Sidebar } from "@/components/sidebar";
import BreadCrumb from "@/components/BreadCrumb";
import { LogoutButton } from "@/components/logoutAlertBox";
import ScrollToTopButton from "@/components/dragButton/ScrollToTop";
import { Notifications } from "@/components/Notifications/Notifications";
import { CommandDialogDemo } from "@/components/camanddialog/CammandDialog";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { token } = useAuthStore();

  return (
    <div className="flex">
      <Sidebar />
      <main className=" lg:ml-60 p-2 w-full ">
        <div className=" xs:flex  hidden items-center xs:justify-between  justify-end ">
          <div className="xs:block hidden">
            <BreadCrumb />
          </div>
          <div className=" flex items-center gap-x-2">
            {(token?.role === "SuperAdmin" || token?.role === "Sales") && (
              <Notifications />
            )}
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
    </div>
  );
}
